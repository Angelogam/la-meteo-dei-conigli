/**
 * CAMPO VENTO LIVE per la vista 3D.
 *
 * L'obiettivo non è più «4 frecce sul decollo» ma un CAMPO CONTINUO che dia la
 * sensazione di pieno: una griglia fitta di frecce che scendono per tutta la
 * valle, ognuna con direzione, intensità e COLORE AEROLOGICO:
 *
 *  - verde  (lift)  → il vento meteo spinta CONTRO il versante: portanza dinamica
 *  - rosso  (lee)   → lato sottovento oltre la cresta: affondamento/turbolenza
 *  - giallo (ana)   → brezza anabatica diurna: risale i pendii riscaldati
 *  - ciano  (kata)  → brezza catabatica notturna: scende lungo i pendii
 *  - ambra  (flow)  → flusso di valle neutro
 *
 * Ingredienti:
 *  1. DEM: griglia 16×12 (passo ~730 m) attorno al decollo, letta dai tile
 *     Terrarium già usati dal terreno (stessa cache, zero costi). Dal gradiente
 *     ricavo pendenza e versante (dove è «su»).
 *  2. VENTO LIVE: Open-Meteo in BULK su griglia 3×3 della zona (una sola
 *     richiesta HTTP, vento 10 m orario) → interpolato sulla griglia DEM.
 *     Aggiornamento automatico ogni 15 minuti.
 *  3. FUSIONE: vento meteo + componente termica lungo la massima pendenza
 *     (anabatica di giorno, catabatica di notte) → vettore finale per cella.
 *
 * La classificazione distingue quindi le ZONE DI SOTTOVENTO (il vento che
 * scavalca la cresta e affonda dietro) dalle zone di PORTANZA (vento contro
 * pendio), cosa impossibile guardando solo il vento medio del sounding.
 */

import { sampleTerrainHeights } from "./terrain";

export type FlowClass = "lift" | "lee" | "ana" | "kata" | "flow";

export const FLOW_COLORS: Record<FlowClass, string> = {
  lift: "#3ddc84",
  lee: "#ff5470",
  ana: "#ffd23f",
  kata: "#4cc3ff",
  flow: "#ffb347",
};

export interface WindField {
  lat0: number;
  lon0: number;
  rows: number;
  cols: number;
  step: number; // m tra le celle
  mLat: number; // metri per grado di latitudine
  mLon: number; // metri per grado di longitudine alla latitudine centrale
  H: number[][]; // quote DEM (m)
  gE: number[][]; // gradiente dh/dEst (m/m)
  gN: number[][]; // gradiente dh/dNord (m/m)
  S: number[][]; // pendenza |grad| (m/m)
}

/** Una freccia del campo vento, pronta per il render. */
export interface FlowCell {
  lat: number;
  lon: number;
  h: number; // quota DEM della cella
  dE: number; // direzione di flusso (unitaria, dove VA l'aria)
  dN: number;
  sp: number; // intensità km/h
  cls: FlowClass;
  len: number; // lunghezza freccia (m)
  w: number; // spessore (px)
  speedVis: number; // velocità di deriva visiva (m/s)
  span: number; // corsa di deriva prima del ricircolo (m)
}

export interface LivePoint {
  ws: number; // km/h
  wd: number; // gradi, direzione DA cui viene
}

const ROWS = 14;
const COLS = 18;
const STEP = 640; // m

/** Costruisce la griglia DEM (18×14) attorno al decollo con gradienti. */
export async function buildWindField(lat0: number, lon0: number): Promise<WindField> {
  const mLat = 111320;
  const mLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const lats: number[] = [];
  const lons: number[] = [];
  for (let i = 0; i < ROWS; i++) lats.push(lat0 + (((ROWS - 1) / 2 - i) * STEP) / mLat);
  for (let j = 0; j < COLS; j++) lons.push(lon0 + ((j - (COLS - 1) / 2) * STEP) / mLon);

  const flat = await sampleTerrainHeights(lats.flatMap((la) => lons.map((lo) => ({ lat: la, lon: lo }))));
  const H: number[][] = [];
  for (let i = 0; i < ROWS; i++) {
    H.push([]);
    for (let j = 0; j < COLS; j++) {
      const h = flat[i * COLS + j];
      H[i].push(Number.isFinite(h) ? h : 0); // il DEM non deve mai dare NaN
    }
  }

  const gE: number[][] = [];
  const gN: number[][] = [];
  const S: number[][] = [];
  for (let i = 0; i < ROWS; i++) {
    gE.push([]);
    gN.push([]);
    S.push([]);
    for (let j = 0; j < COLS; j++) {
      const jp = Math.min(COLS - 1, j + 1);
      const jm = Math.max(0, j - 1);
      const ip = Math.min(ROWS - 1, i + 1);
      const im = Math.max(0, i - 1);
      const dx = (jp - jm) * STEP;
      const dy = (ip - im) * STEP; // i cresce verso sud → H[im] è a nord
      const a = (H[i][jp] - H[i][jm]) / dx;
      const b = (H[im][j] - H[ip][j]) / dy;
      const s = Math.hypot(a, b);
      gE[i].push(Number.isFinite(a) ? a : 0);
      gN[i].push(Number.isFinite(b) ? b : 0);
      S[i].push(Number.isFinite(s) ? s : 0);
    }
  }

  return { lat0, lon0, rows: ROWS, cols: COLS, step: STEP, mLat, mLon, H, gE, gN, S };
}

/** Altezza DEM interpolata (bilineare) — matematica pura, richiamabile a ogni frame. */
export function heightAt(f: WindField, lat: number, lon: number): number {
  const fi = (f.rows - 1) / 2 - ((lat - f.lat0) * f.mLat) / f.step;
  const fj = ((lon - f.lon0) * f.mLon) / f.step + (f.cols - 1) / 2;
  const ci = Math.min(f.rows - 2, Math.max(0, Math.floor(fi - 0.5)));
  const cj = Math.min(f.cols - 2, Math.max(0, Math.floor(fj - 0.5)));
  const ti = Math.min(1, Math.max(0, fi - 0.5 - ci));
  const tj = Math.min(1, Math.max(0, fj - 0.5 - cj));
  return (
    f.H[ci][cj] * (1 - ti) * (1 - tj) +
    f.H[ci][cj + 1] * (1 - ti) * tj +
    f.H[ci + 1][cj] * ti * (1 - tj) +
    f.H[ci + 1][cj + 1] * ti * tj
  );
}

/**
 * Vento live Open-Meteo in BULK su griglia 3×3 della zona (una sola richiesta).
 * Restituisce i 9 punti per l'ora selezionata (interpolazione bilineare client).
 */
export async function fetchLiveWind(
  f: WindField,
  hour: number,
): Promise<LivePoint[]> {
  const frac = [0, 0.5, 1];
  const pts: { lat: number; lon: number }[] = [];
  for (const v of frac) {
    for (const u of frac) {
      pts.push({
        lat: f.lat0 + (((f.rows - 1) / 2 - v * (f.rows - 1)) * f.step) / f.mLat,
        lon: f.lon0 + ((u * (f.cols - 1) - (f.cols - 1) / 2) * f.step) / f.mLon,
      });
    }
  }
  const latQ = pts.map((p) => p.lat.toFixed(4)).join(",");
  const lonQ = pts.map((p) => p.lon.toFixed(4)).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latQ}&longitude=${lonQ}` +
    `&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh` +
    `&timezone=Europe%2FBerlin&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const j = await res.json();
  const arr: unknown[] = Array.isArray(j) ? j : [j];

  const out: LivePoint[] = arr.map((o) => {
    const hh = (o as { hourly?: { time?: string[]; wind_speed_10m?: unknown[]; wind_direction_10m?: unknown[] } })?.hourly;
    if (!hh) return { ws: 0, wd: 0 };
    const times = hh.time ?? [];
    /* allineo all'ora richiesta sull'orario locale del modello */
    let idx = times.findIndex((t) => t.length >= 13 && Number(t.slice(11, 13)) === hour);
    if (idx < 0) idx = Math.min(Math.max(times.length - 1, 0), Math.min(Math.max(hour, 0), 23));
    const ws = Number(hh.wind_speed_10m?.[idx]);
    const wd = Number(hh.wind_direction_10m?.[idx]);
    return {
      ws: Number.isFinite(ws) ? ws : 0,
      wd: Number.isFinite(wd) ? wd : 0,
    };
  });

  /* garanzia: sempre 9 punti (l'interpolatore conta su una griglia 3×3 piena) */
  while (out.length < 9) out.push(out[out.length - 1] ?? { ws: 0, wd: 0 });
  return out.slice(0, 9);
}

/**
 * Fonde DEM + vento live + termine termico e classifica ogni cella.
 * È matematica pura: rieseguita a ogni cambio di ora/dati senza toccare il DEM.
 */
export function computeFlows(f: WindField, live: LivePoint[] | null, hour: number): FlowCell[] {
  const anabatic = hour >= 9 && hour <= 18;
  const RAD = Math.PI / 180;
  const cells: FlowCell[] = [];

  /* vento live interpolato (bilineare sulla griglia 3×3) */
  const lw = (u: number, v: number): LivePoint => {
    if (!live || live.length !== 9) return { ws: 0, wd: 0 };
    const uc = Math.min(1.999, Math.max(0, u * 2));
    const vc = Math.min(1.999, Math.max(0, v * 2));
    const u0 = Math.floor(uc);
    const v0 = Math.floor(vc);
    const tu = uc - u0;
    const tv = vc - v0;
    const P = (a: number, b: number) => live[Math.min(2, v0 + b) * 3 + Math.min(2, u0 + a)];
    const w00 = P(0, 0);
    const w10 = P(1, 0);
    const w01 = P(0, 1);
    const w11 = P(1, 1);
    const mix = (k: "ws" | "wd") =>
      w00[k] * (1 - tu) * (1 - tv) + w10[k] * tu * (1 - tv) + w01[k] * (1 - tu) * tv + w11[k] * tu * tv;
    return { ws: mix("ws"), wd: mix("wd") };
  };

  for (let i = 0; i < f.rows; i++) {
    for (let j = 0; j < f.cols; j++) {
      const lat = f.lat0 + (((f.rows - 1) / 2 - i) * f.step) / f.mLat;
      const lon = f.lon0 + ((j - (f.cols - 1) / 2) * f.step) / f.mLon;
      const w = lw(j / (f.cols - 1), i / (f.rows - 1));

      const gE = f.gE[i][j];
      const gN = f.gN[i][j];
      const s = f.S[i][j];
      const gl = Math.hypot(gE, gN);
      const uE = gl > 1e-6 ? gE / gl : 0; // unitario SU per il pendio
      const uN = gl > 1e-6 ? gN / gl : 0;
      const fE = -Math.sin(w.wd * RAD); // dove VA il vento meteo
      const fN = -Math.cos(w.wd * RAD);
      const up = fE * uE + fN * uN; // +1 spinta contro il versante, −1 scende

      /* componente termica lungo la massima pendenza */
      const slopeK = Math.min(1, s / 0.45);
      const thermK = anabatic ? 4 + 10 * slopeK : -(3 + 8 * slopeK);
      const thermScale = s > 0.06 ? 1 : 0.15;
      let tE = fE * w.ws + uE * thermK * thermScale;
      let tN = fN * w.ws + uN * thermK * thermScale;
      let sp = Math.hypot(tE, tN);

      /* classificazione aerologica della cella */
      let cls: FlowClass = "flow";
      const windDom = w.ws >= 12; // il vento meteo domina la termica locale
      if (sp < 2.5) {
        /* quasi calmo: mantengo comunque una freccia minima leggibile */
        const wsMin = Math.max(w.ws, 2.5);
        tE = fE * wsMin;
        tN = fN * wsMin;
        sp = wsMin;
      } else if (windDom && up > 0.3) {
        cls = "lift"; // vento contro pendio → portanza dinamica
      } else if (windDom && up < -0.32 && w.ws >= 18) {
        cls = "lee"; // scende il versante con vento forte → sottovento
      } else if (!windDom && s >= 0.1) {
        cls = anabatic ? "ana" : "kata"; // domina la brezza di versante
      }

      const dirE = sp > 1e-4 ? tE / sp : fE;
      const dirN = sp > 1e-4 ? tN / sp : fN;

      cells.push({
        lat,
        lon,
        h: f.H[i][j],
        dE: Number.isFinite(dirE) ? dirE : 1,
        dN: Number.isFinite(dirN) ? dirN : 0,
        sp: Number.isFinite(sp) ? sp : 0,
        cls,
        len: Math.min(1100, Math.max(300, 140 + sp * 18)),
        w: Math.min(14, Math.max(8, Math.round(6 + sp / 4))),
        speedVis: Math.min(26, Math.max(3.2, sp * 0.5)),
        span: f.step * 2.2,
      });
    }
  }
  return cells;
}
