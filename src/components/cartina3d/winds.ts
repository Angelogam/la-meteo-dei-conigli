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

/**
 * Scala velocità VENTI METEO (richiesta pilota): una GAMMA CONTINUA dal GIALLO
 * al VIOLA SCURO — più il vento è forte più il colore scurisce verso il viola.
 *  <5 giallo tenue · 5-10 giallo · 10-15 giallo-arancio · 15-20 arancio ·
 *  20-25 arancio-rosso · 25-30 rosso-magenta · 30-40 magenta-viola ·
 *  40-50 viola · 50+ VIOLA SCURO.
 * Usata per i venti in quota (un livello alla volta, mai sovrapposti).
 */
export function speedColor(kmh: number): string {
  if (!Number.isFinite(kmh)) return "#ffe97a";
  if (kmh < 5) return "#ffe97a";
  if (kmh < 10) return "#ffd633";
  if (kmh < 15) return "#ffb021";
  if (kmh < 20) return "#ff8a1f";
  if (kmh < 25) return "#ff5c33";
  if (kmh < 30) return "#ef3a5e";
  if (kmh < 40) return "#c932a6";
  if (kmh < 50) return "#8b2bd9";
  return "#5b1aa8";
}

/* ================= SOLE E FISICA DELLE BREZZE (condivisa col flusso 3D) =================
   Le brezze di valle NON salgono su tutti i pendii: salgono dove il sole
   scalda. Il pilota lo vede in montagna ogni giorno: il versante esposto a sud
   al mezzogiorno «fuma» di termiche, quello a nord in ombra resta calmo (o
   drena). Quindi il campo vento fuso dipende da:
   1. POSIZIONE DEL SOLE (azimut + altezza) per giorno dell'anno e ora;
   2. ESPOSIZIONE del versante (aspetto) rispetto al sole: expo = cos(aspetto − azimut_sole);
   3. PENDENZA: più è ripido, più la brezza è spinta;
   4. NOTTE: catabatica su tutti i versanti (drenaggio a gravità);
   5. PARETI RIPIDE: il meteo che urta un muro non lo scavalca in linea retta,
      SCIVOLA ATTORNO (deflessione lungo le isoipse — «contorna» la montagna);
   6. COMBING: una deriva lungo il costone verso la cresta fa correre le
      particelle per TUTTA la lunghezza del versante, come acqua versata sul
      plastico 3D che pettina i pendii. */

const RAD = Math.PI / 180;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth01 = (x: number): number => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/** Giorno dell'anno (1..365) da data ISO "2026-11-01"; senza data = oggi. */
export function dayOfYear(dateISO: string | null): number {
  let d: Date;
  if (dateISO) {
    d = new Date(`${dateISO}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) d = new Date();
  } else d = new Date();
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.max(1, Math.round((d.getTime() - start) / 86400000));
}

export interface SunPos {
  az: number; // azimut del sole, gradi da Nord in senso orario (dove STA)
  alt: number; // altezza sul orizzonte, gradi (< 0 = sotto: notte)
}

/** Posizione del sole (approssimazione NOAA senza equazione del tempo: ±1°,
    ben oltre la precisione necessaria alle brezze). Matematica pura. */
export function sunPosition(doy: number, hour: number, latDeg: number): SunPos {
  const decl = (23.44 * Math.sin(((2 * Math.PI) / 365) * (doy - 81))) * RAD;
  const H = (hour - 12) * 15 * RAD; // angolo orario (+ pomeriggio)
  const phi = latDeg * RAD;
  const sU = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H);
  const sE = -Math.cos(decl) * Math.sin(H);
  const sN = Math.cos(phi) * Math.sin(decl) - Math.sin(phi) * Math.cos(decl) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sU)));
  const az = Math.atan2(sE, sN) / RAD;
  return { az: ((az % 360) + 360) % 360, alt: alt / RAD };
}

export interface BlendIn {
  fE: number; // vento meteo, unitario (dove VA)
  fN: number;
  ws: number; // km/h
  uE: number; // unitario SU il pendio (gradiente normalizzato)
  uN: number;
  s: number; // pendenza m/m
  rE: number; // unitario lungo il costone VERSO la cresta (0 su pianura)
  rN: number;
  sunAz: number; // gradi
  sunAlt: number; // gradi
  conv?: number; // convessità locale (m): + dosso/cresta, − conca (venturi)
  /** Radiazione diretta W/m² dell'ORA RICHIESTA (open-meteo, già attenuata da
      nubi): motore termodinamico della brezza — nubi dense la affievoliscono */
  rad?: number | null;
  /** Copertura nuvolosa % dell'ora richiesta (open-meteo) */
  cloudPct?: number | null;
}

export interface BlendOut {
  dE: number; // direzione di flusso unitaria (dove VA l'aria)
  dN: number;
  sp: number; // km/h
  up: number; // +1 risale il pendio, −1 scende
  cls: FlowClass;
}

/** FONTE UNICA della fisica: usata sia dalle particelle 3D (windflow, a ogni
    frame su punti liberi) sia dalla griglia delle etichette (computeFlows):
    le frecce e i numeri NON possono mai raccontare storie diverse. */
export function blendFlow(b: BlendIn): BlendOut {
  /* PRANDTL (1942) / Stull BLM: la velocità di risalita scala con √sin(α)
     (spinta di galleggiamento lungo il pendio) — il pendio dolce spinge meno
     di quello ripido ma senza saturare: √ della pendenza, non lineare. */
  const slopeK = Math.min(1, Math.sqrt(Math.max(0, b.s)) / 0.5);
  /* giorno pieno verso i ~34° di sole (calibrazione @gemini-cli sulla review
     v13: a 44°N d'estate la brezza di valle matura alle 10:30-11:30, NON
     alle 8:30 — l'altezza solare simmetrica non basta, il suolo deve caricare;
     a mezzogiorno invernale ~23° la brezza non arriva mai a pieno regime),
     notte piena sotto ~−6°: niente on/off secco.
     INERCIA TERMICA: esponente > 1 sulla salita diurna (isteresi del flusso
     di calore sensibile QH: alle 10 e alle 16:30 stesso sole, brezza diversa). */
  const dayK = Math.pow(clamp01((b.sunAlt + 2) / 34), 1.35);
  const nightK = 1 - clamp01((b.sunAlt + 6) / 8);

  /* ANABATICA: verso l'alto, tanto più forte quanto il versante guarda il sole
     (sud al mezzogiorno = piena; versanti in ombra = solo il 30%). Cap ~18 km/h
     sui pendii ripidi e pieno sole: taratura @gemini-cli (issue #35) — nelle
     Alpi occidentali il termico di versante reale sta in 10-22 km/h e oltre
     20 il pilota è in condizione limite.
     RADIAZIONE DELL'ORA RICHIESTA (open-meteo, «intreccio dei dati»): la spinta
     termica segue i W/m² simulati dell'ora selezionata — nubi dense (+veri
     W/m² bassi) la affievoliscono; senza dato si resta sulla taratura geom. */
  const aspectAz = Math.atan2(-b.uE, -b.uN); // aspetto: direzione a VALLE
  const expo = Math.max(0, Math.cos(aspectAz - b.sunAz * RAD));
  const radK = b.rad != null ? 0.34 + 0.66 * clamp01(b.rad / 680) : 1;
  const cloudK = b.cloudPct != null ? 1 - 0.45 * clamp01((b.cloudPct - 30) / 60) : 1;
  const ana = dayK * (3 + 15 * slopeK) * (0.3 + 0.7 * expo) * radK * cloudK;
  /* CATABATICA notturna: drenaggio laminare 3-6 km/h sui pendii aperti,
     fino a ~9 solo dove è ripido (taratura @gemini-cli, issue #35).
     SPRINGER BLM 2023: nelle ore profonde della notte il drenaggio CEDE al
     flusso di giù-valle — attenuazione dolce dopo −12° di sole. */
  const kata = nightK * (3 + 6 * slopeK) * (1 - 0.35 * clamp01((-b.sunAlt - 12) / 10));
  const therm = (ana - kata) * (b.s > 0.06 ? 1 : 0.15);

  /* METEO con DEFLESSIONE: urto contro una parete ripida → il flusso ruota
     lungo le isoipse e CONTORNA la montagna invece di bucarla */
  const up0 = b.fE * b.uE + b.fN * b.uN;
  const wall = smooth01((up0 - 0.3) / 0.35) * smooth01((b.s - 0.28) / 0.3);
  let fE = b.fE;
  let fN = b.fN;
  if (wall > 0.01) {
    let tE = b.uN;
    let tN = -b.uE; // tangente al contorno
    if (tE * b.fE + tN * b.fN < 0) {
      tE = -tE;
      tN = -tN; // stesso lato del moto meteo
    }
    fE = b.fE * (1 - wall) + tE * wall;
    fN = b.fN * (1 - wall) + tN * wall;
    const fl = Math.hypot(fE, fN) || 1;
    fE /= fl;
    fN /= fl;
  }

  /* COMBING lungo il costone: di giorno deriva verso la cresta (il flusso
     risale TUTTO il versante fino in cresta), di notte drena verso il fondo
     valle lungo le stesse linee. */
  const ridgeDrift = (2.2 + 4.5 * slopeK) * dayK * (b.s > 0.06 ? 1 : 0);
  const drainDrift = (1.8 + 3.5 * slopeK) * nightK * (b.s > 0.06 ? 1 : 0);

  let vE = fE * b.ws + b.uE * therm + b.rE * (ridgeDrift - drainDrift);
  let vN = fN * b.ws + b.uN * therm + b.rN * (ridgeDrift - drainDrift);
  /* VENTURI (fisica del rilievo, manuali di volo: «il vento accelera quando
     passa sui crinali e viene canalizzato lungo le valli»): sui dossi e sui
     colli l'aria accelera (Bernoulli), nelle conche rallenta. Taratura
     SOTTILE (±22%) per non rompere l'«onda unica»: l'effetto si legge nelle
     etichette km/h e in una corsa appena più spinta in cresta. */
  const vent =
    b.conv == null ? 1 : b.conv > 0 ? 1 + 0.22 * clamp01(b.conv / 280) : 1 - 0.12 * clamp01(-b.conv / 280);
  vE *= vent;
  vN *= vent;
  let sp = Math.hypot(vE, vN);
  if (sp < 2.2) {
    const wsMin = Math.max(b.ws, 2.2);
    vE = fE * wsMin;
    vN = fN * wsMin;
    sp = wsMin;
  }
  const dE = vE / sp;
  const dN = vN / sp;
  const up = dE * b.uE + dN * b.uN;

  let cls: FlowClass = "flow";
  const windDom = b.ws >= 12;
  if (windDom && up > 0.3) cls = "lift";
  else if (windDom && up < -0.32 && b.ws >= 18) cls = "lee";
  else if (!windDom && b.s >= 0.1) cls = dayK >= nightK ? "ana" : "kata";
  return { dE, dN, sp, up, cls };
}

/**
 * Colore delle BREZZE DI PENDIO (richiesta pilota): freccia BLU — flusso
 * continuo di aria che risale le rocce. La tonalità si abbassa con la
 * velocità: debole = azzurro chiaro, forte = blu profondo — resta sempre la
 * stessa famiglia cromatica così il flusso si legge come un'unica massa d'aria.
 */
export function breezeColor(kmh: number): string {
  if (!Number.isFinite(kmh)) return "#3f9ef8";
  if (kmh < 6) return "#8fd0ff";
  if (kmh < 11) return "#5cb9fb";
  if (kmh < 16) return "#2f9bf7";
  if (kmh < 22) return "#1279e2";
  return "#0a5cc4";
}

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

const ROWS = 20;
const COLS = 28;
const STEP = 640; // m — griglia LARGA (≈17×12 km): le brezze di pendio devono
                  // coprire TUTTI i rilievi in vista, anche fuori dalle zone decollo

/** Costruisce la griglia DEM (28×20) attorno al decollo con gradienti. */
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

/** Fasce orarie cliccabili nelle previsioni: dall'alba alla sera, passo 3 h. */
export const FORECAST_SLOTS = [6, 9, 12, 15, 18, 21];

export interface ForecastSlot {
  h: number;
  ws: number; // km/h medi sugli 8 punti della griglia
  wd: number; // gradi «da» (direzione meteorologica)
}

export interface ForecastDay {
  date: string; // "2026-10-30"
  label: string; // "Oggi", "Domani", "sab 1 nov"…
  slots: ForecastSlot[];
}

/** Previsioni vento 10 m su 4 giorni: una sola richiesta bulk per i 9 punti. */
export interface ForecastData {
  days: ForecastDay[];
  times: string[]; // griglia temporale comune ai 9 punti ("2026-10-30T14:00")
  ws: number[][]; // [punto 0..8][tempo] km/h
  wd: number[][]; // [punto 0..8][tempo] gradi «da»
}

function dayLabelFor(date: string, idx: number): string {
  if (idx === 0) return "Oggi";
  if (idx === 1) return "Domani";
  if (idx === 2) return "Dopodomani";
  try {
    return new Date(date + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return `+${idx} gg`;
  }
}

/* ================= ROBUSTEZZA API METEO =================
   Open-Meteo è gratuito e può rallentare o rispondere 429/5xx: il campo vento
   3D non deve mai restare a nero per un singolo intoppo di rete.
   Strategia (richiesta pilota «API programmata bene»):
   1. cache in MEMORIA con TTL 5 min → i cambi di giorno/ora sono istantanei;
   2. timeout di 9 s per richiesta (AbortController) + 3 tentativi con
      backoff esponenziale (0.9s → 1.8s → 3.6s) su errori di rete/5xx/429;
   3. cache su DISK (localStorage, TTL 15 min) come ultima spiaggia: dati
      leggermente stantii ma VERI, meglio di una stima sintetica. */
const FC_TTL_MS = 5 * 60 * 1000;
const FC_DISK_TTL_MS = 15 * 60 * 1000;
const fcMem = new Map<string, { at: number; data: ForecastData }>();

function parseForecastResponse(j: unknown): { times: string[]; ws: number[][]; wd: number[][] } {
  const arr: unknown[] = Array.isArray(j) ? j : [j];
  while (arr.length < 9) arr.push(arr[arr.length - 1]);
  const hh0 = (arr[0] as { hourly?: { time?: string[] } })?.hourly;
  const times = hh0?.time ?? [];
  const ws: number[][] = [];
  const wd: number[][] = [];
  for (const o of arr) {
    const h = (o as { hourly?: { wind_speed_10m?: unknown[]; wind_direction_10m?: unknown[] } })?.hourly;
    ws.push(times.map((_, i) => (Number.isFinite(Number(h?.wind_speed_10m?.[i])) ? Number(h?.wind_speed_10m?.[i]) : 0)));
    wd.push(times.map((_, i) => (Number.isFinite(Number(h?.wind_direction_10m?.[i])) ? Number(h?.wind_direction_10m?.[i]) : 0)));
  }
  return { times, ws, wd };
}

export async function fetchForecast(f: WindField): Promise<ForecastData> {
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
    `&timezone=Europe%2FBerlin&forecast_days=5`;
  const key = `${f.lat0.toFixed(3)},${f.lon0.toFixed(3)}`;

  /* 1. cache in memoria (5 min): risposta istantanea */
  const mem = fcMem.get(key);
  if (mem && Date.now() - mem.at < FC_TTL_MS) return mem.data;

  const diskKey = `c3dForecastV2:${key}`;
  let disk: { at: number; data: ForecastData } | null = null;
  try {
    const raw = localStorage.getItem(diskKey);
    if (raw) disk = JSON.parse(raw) as { at: number; data: ForecastData };
  } catch {
    disk = null;
  }

  /* 2. rete con timeout + retry/backoff */
  let lastErr: unknown = new Error("open-meteo non tentato");
  for (let attempt = 0; attempt < 3; attempt++) {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 9000);
    try {
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) throw new Error(`open-meteo ${res.status}`);
      const j = await res.json();
      const p = parseForecastResponse(j);

      const dates: string[] = [];
      for (const t of p.times) {
        const d = t.slice(0, 10);
        if (!dates.includes(d)) dates.push(d);
      }
      const days: ForecastDay[] = dates.slice(0, 5).map((date, di) => ({
        date,
        label: dayLabelFor(date, di),
        slots: FORECAST_SLOTS.map((h) => {
          const idx = p.times.indexOf(`${date}T${String(h).padStart(2, "0")}:00`);
          if (idx < 0) return { h, ws: 0, wd: 0 };
          let sum = 0;
          for (let pt = 0; pt < 9; pt++) sum += p.ws[pt]?.[idx] ?? 0;
          return { h, ws: sum / 9, wd: p.wd[4]?.[idx] ?? p.wd[0]?.[idx] ?? 0 };
        }),
      }));

      const out: ForecastData = { days, times: p.times, ws: p.ws, wd: p.wd };
      fcMem.set(key, { at: Date.now(), data: out });
      try {
        localStorage.setItem(diskKey, JSON.stringify({ at: Date.now(), data: out }));
      } catch {
        /* quota localStorage piena: la cache su disk è facoltativa */
      }
      return out;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 900 * Math.pow(2, attempt)));
    } finally {
      window.clearTimeout(timer);
    }
  }

  /* 3. ultima spiaggia: cache su disk ≤ 15 min (dati veri, solo stantii) */
  if (disk && Date.now() - disk.at < FC_DISK_TTL_MS) {
    fcMem.set(key, { at: Date.now() - (FC_TTL_MS - 30 * 1000), data: disk.data });
    return disk.data;
  }
  throw lastErr;
}

/**
 * PREVISIONI DI FALLBACK (Open-Meteo irraggiungibile): serie sintetica di 5 giorni
 * costruita dal vento del sounding del decollo con profilo diurno realistico.
 * Serve a mantenere cliccabili le fasce orarie anche offline — le letture sono
 * marcate «stima» nell'interfaccia finché il modello vero non torna disponibile.
 */
export function buildFallbackForecast(baseWs: number, baseWd: number): ForecastData {
  const bw = Number.isFinite(baseWs) ? Math.max(1.5, baseWs) : 8;
  const bd = Number.isFinite(baseWd) ? ((baseWd % 360) + 360) % 360 : 270;
  const times: string[] = [];
  const ws: number[][] = Array.from({ length: 9 }, () => []);
  const wd: number[][] = Array.from({ length: 9 }, () => []);
  const today = new Date();
  const days: ForecastDay[] = [];
  for (let d = 0; d < 5; d++) {
    const dd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
    const date = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
    const dayK = 1 + 0.07 * Math.sin(d * 2.1);
    const dayWd = (bd + d * 14) % 360;
    for (let h = 0; h < 24; h++) {
      const hourK = 0.82 + 0.26 * Math.sin((Math.PI * Math.max(0, h - 5)) / 14); // minimo di notte, picco ~12-14
      times.push(`${date}T${String(h).padStart(2, "0")}:00`);
      for (let p = 0; p < 9; p++) {
        const r = p % 3;
        const c = Math.floor(p / 3);
        const sp = Math.max(1, bw * dayK * hourK * (1 + 0.12 * Math.sin(r * 2.4 + c * 1.7 + d)));
        ws[p].push(Number.isFinite(sp) ? sp : 2);
        wd[p].push(dayWd);
      }
    }
    days.push({
      date,
      label: dayLabelFor(date, d),
      slots: FORECAST_SLOTS.map((h) => {
        const idx = times.indexOf(`${date}T${String(h).padStart(2, "0")}:00`);
        return { h, ws: ws[4]?.[idx] ?? bw, wd: wd[4]?.[idx] ?? dayWd };
      }),
    });
  }
  return { days, times, ws, wd };
}

/** I 9 punti del campo per il giorno+ora richiesti (matematica pura, nessun fetch). */
export function liveAt(fc: ForecastData, date: string | null, hour: number): LivePoint[] {
  if (!fc.times.length) return [];
  const hh = String(Math.max(0, Math.min(23, Math.round(hour)))).padStart(2, "0");
  let idx = date ? fc.times.indexOf(`${date}T${hh}:00`) : fc.times.findIndex((t) => t.slice(11, 13) === hh);
  if (idx < 0) idx = fc.times.length - 1;
  const out: LivePoint[] = [];
  for (let p = 0; p < 9; p++) {
    const ws = fc.ws[p]?.[idx] ?? 0;
    const wd = fc.wd[p]?.[idx] ?? 0;
    out.push({ ws: Number.isFinite(ws) ? ws : 0, wd: Number.isFinite(wd) ? wd : 0 });
  }
  return out;
}

/**
 * Fonde DEM + vento live + termine termico e classifica ogni cella.
 * È matematica pura: rieseguita a ogni cambio di ora/dati senza toccare il DEM.
 */
export function computeFlows(f: WindField, live: LivePoint[] | null, hour: number, doy?: number): FlowCell[] {
  const sun = sunPosition(doy ?? dayOfYear(null), hour, f.lat0);
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
      const fE = -Math.sin(w.wd * (Math.PI / 180)); // dove VA il vento meteo
      const fN = -Math.cos(w.wd * (Math.PI / 180));

      /* convessità locale (venturi): quota meno media dei vicini a ±2 celle */
      const iN2 = Math.max(0, i - 2);
      const iS2 = Math.min(f.rows - 1, i + 2);
      const jW2 = Math.max(0, j - 2);
      const jE2 = Math.min(f.cols - 1, j + 2);
      const conv = f.H[i][j] - (f.H[iN2][j] + f.H[iS2][j] + f.H[i][jW2] + f.H[i][jE2]) / 4;

      /* direzione lungo il costone VERSO la cresta: perpendicolare al gradiente,
         col segno scelto dove il DEM sale (deriva di combing di blendFlow) */
      let rE = 0;
      let rN = 0;
      if (gl > 1e-6 && s > 0.06) {
        const dj = Math.round(uN); // perp (uN, −uE) in celle (step isotropo,
        const di = Math.round(-uE); //  nord = i−1)
        const jp = Math.min(f.cols - 1, Math.max(0, j + dj));
        const ip = Math.min(f.rows - 1, Math.max(0, i + di));
        const jm = Math.min(f.cols - 1, Math.max(0, j - dj));
        const im = Math.min(f.rows - 1, Math.max(0, i - di));
        const kSign = f.H[ip][jp] >= f.H[im][jm] ? 1 : -1;
        rE = kSign * uN;
        rN = -kSign * uE;
      }

      const r = blendFlow({ fE, fN, ws: w.ws, uE, uN, s, rE, rN, sunAz: sun.az, sunAlt: sun.alt, conv });
      const sp = r.sp;
      const cls = r.cls;

      cells.push({
        lat,
        lon,
        h: f.H[i][j],
        dE: Number.isFinite(r.dE) ? r.dE : 1,
        dN: Number.isFinite(r.dN) ? r.dN : 0,
        sp: Number.isFinite(sp) ? sp : 0,
        cls,
        /* metadati di deriva usati solo dai test/strumentazione */
        len: Math.min(430, Math.max(160, 95 + sp * 11)),
        w: Math.min(30, Math.max(17, Math.round(13 + sp / 2.4))),
        speedVis: Math.min(62, Math.max(11, sp * 2.4)),
        span: f.step * 1.45,
      });
    }
  }
  return cells;
}
