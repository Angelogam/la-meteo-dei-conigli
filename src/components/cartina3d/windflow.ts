/**
 * FLUSSO VENTO SUOLO — solo BREZZE DI PENDIO/VALLE (richiesta pilota).
 *
 * «Un flusso continuo che riempie, come l'acqua che scivola sulle rocce al
 * contrario»: tantissime frecce ONDULATE 3D, LARGHE e BLU a coda lunga che
 * CORRONO sui rilievi come una cascata — di giorno salgono i pendii
 * (anabatica), di notte scendono (catabatica) — su TUTTO il territorio in
 * vista, anche fuori dalle zone di decollo (la griglia DEM è larga ≈17×12 km).
 * La velocità visiva cresce quando il flusso è allineato alla pendenza e
 * dietro le creste, dove il vento meteo scavalca e l'aria affonda, compaiono
 * i ROTORI DI SOTTOVENTO: frecce curve rosse ad arco che GIRANO SU SE STESSI.
 *
 * I VENTI METEO non stanno più qui: entrano SOLO su richiesta, cliccando una
 * quota nella barra (un livello alla volta, mai sovrapposti — vedi
 * Cartina3D.tsx). Così la scena mostra UN flusso per volta.
 *
 * Render: una BillboardCollection (sprite pre-disegnati sul canvas, economici)
 * aggiornata in scene.preRender: posizione, rotazione (allineata al Nord REALE
 * via heading della camera) e scala a ogni frame, senza il costo del framework
 * Entity né callback per singola entità.
 */

import { breezeColor, heightAt, type LivePoint, type WindField } from "./winds";
import { dartSprite, rotorSprite } from "./sprites";

type CesiumNs = typeof import("cesium");
type ViewerNs = import("cesium").Viewer;

const RAD = Math.PI / 180;

export interface WindFlowHandle {
  destroy(): void;
}

interface Mover {
  lat: number;
  lon: number;
  dE: number; // direzione di flusso (unitaria)
  dN: number;
  azTo: number; // azimut di percorso (radianti, da Nord, orario)
  speedVis: number; // velocità visiva (m/s)
  span: number; // corsa prima del ricircolo (m)
  phase: number; // sfasamento sulla corsa
  lift: number; // altezza sul terreno (m)
  scale: number; // scala base dello sprite
  waveK: number; // fase locale dell'onda globale (dalla distanza)
  weaveA: number; // ampiezza del serpeggio (m)
  eddy: boolean; // rotore di sottovento (non corre: gira su se stesso)
  R: number; // offset fisso dal centro del rotore (m)
  w0: number; // fase angolare iniziale
  om: number; // velocità di rotazione su se stesso (rad/s)
  kind: "dart" | "rotor"; // famiglia (scelta sprite + rotazione)
  tint: string; // colore (chiave sprite)
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const hash01 = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

export function buildWindFlow(
  Cesium: CesiumNs,
  viewer: ViewerNs,
  field: WindField,
  live: LivePoint[] | null,
  hour: number,
  fallback: { ws: number; wd: number } = { ws: 7, wd: 270 },
): WindFlowHandle {
  const anabatic = hour >= 9 && hour <= 18;
  const mLat = field.mLat;
  const mLon = field.mLon;
  const extN = ((field.rows - 1) * field.step) / 2; // semiestensione N-S (m)
  const extE = ((field.cols - 1) * field.step) / 2; // semiestensione E-O (m)

  /* ---------- vento live interpolato sulla griglia 3×3 (bilineare) ---------- */
  const lw = (u: number, v: number): { ws: number; wd: number } => {
    if (!live || live.length !== 9) return { ws: fallback.ws, wd: fallback.wd };
    const uc = clamp(u * 2, 0, 1.999);
    const vc = clamp(v * 2, 0, 1.999);
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

  /* gradiente/pendenza interpolati (bilineare sulle griglie del campo) */
  const gridBil = (arr: number[][], fi: number, fj: number): number => {
    const ci = clamp(Math.floor(fi - 0.5), 0, field.rows - 2);
    const cj = clamp(Math.floor(fj - 0.5), 0, field.cols - 2);
    const ti = clamp(fi - 0.5 - ci, 0, 1);
    const tj = clamp(fj - 0.5 - cj, 0, 1);
    return (
      arr[ci][cj] * (1 - ti) * (1 - tj) +
      arr[ci][cj + 1] * (1 - ti) * tj +
      arr[ci + 1][cj] * ti * (1 - tj) +
      arr[ci + 1][cj + 1] * ti * tj
    );
  };

  const movers: Mover[] = [];

  /* ======== BREZZE: griglia fitta di frecce BLU ONDULATE su TUTTI i pendii ======== */
  const eddyCenters: { lat: number; lon: number }[] = [];
  const STEP = 235; // m tra le frecce candidate
  const nI = Math.floor((2 * extN) / STEP);
  const nJ = Math.floor((2 * extE) / STEP);

  const dartCandidates: Mover[] = [];
  for (let i = 0; i <= nI; i++) {
    for (let j = 0; j <= nJ; j++) {
      const lat = field.lat0 + (extN - i * STEP) / mLat;
      const lon = field.lon0 + (j * STEP - extE) / mLon;
      const w = lw(j / Math.max(1, nJ), i / Math.max(1, nI));

      const fi = (field.rows - 1) / 2 - ((lat - field.lat0) * mLat) / field.step;
      const fj = ((lon - field.lon0) * mLon) / field.step + (field.cols - 1) / 2;
      const gE = gridBil(field.gE, fi, fj);
      const gN = gridBil(field.gN, fi, fj);
      const s = Math.max(0, gridBil(field.S, fi, fj));
      const gl = Math.hypot(gE, gN);
      const uE = gl > 1e-6 ? gE / gl : 0;
      const uN = gl > 1e-6 ? gN / gl : 0;

      const fE = -Math.sin(w.wd * RAD);
      const fN = -Math.cos(w.wd * RAD);
      const up = fE * uE + fN * uN; // +1 = il meteo spinta CONTRO il pendio

      /* componente di brezza lungo la massima pendenza (anabatica/catabatica) */
      const slopeK = Math.min(1, s / 0.45);
      const thermK = anabatic ? 4 + 10 * slopeK : -(3 + 8 * slopeK);
      const thermScale = s > 0.06 ? 1 : 0.15;
      const bE = uE * thermK * thermScale;
      const bN = uN * thermK * thermScale;
      const breezeMag = Math.hypot(bE, bN);

      /* flusso FUSO (vento meteo + brezza): ciò che l'aria segue davvero */
      let tE = fE * w.ws + bE;
      let tN = fN * w.ws + bN;
      let sp = Math.hypot(tE, tN);
      if (sp < 2.2) {
        const wsMin = Math.max(w.ws, 2.2);
        tE = fE * wsMin;
        tN = fN * wsMin;
        sp = wsMin;
      }
      const dirE = tE / sp;
      const dirN = tN / sp;
      const flowUp = dirE * uE + dirN * uN; // il flusso risale il pendio?

      /* ---- ROTORI DI SOTTOVENTO: il meteo scavalca la cresta e dietro
         l'aria affonda e ROTA (freccia curva rossa che gira su se stessa).
         Con vento moderato basta poco meteo in contro-pendio; sui pendii
         ripidi nascono rotori anche con brezza leggera. ---- */
      const leeKite = (w.ws >= 8.5 && s > 0.1 && up < -0.22) || (s > 0.22 && up < -0.3);
      if (leeKite) {
        const far = eddyCenters.every(
          (c) => Math.hypot((c.lat - lat) * mLat, (c.lon - lon) * mLon) > 520,
        );
        if (far && eddyCenters.length < 30) {
          eddyCenters.push({ lat, lon });
          for (let b = 0; b < 2; b++) {
            const hb = hash01(i * 31 + j * 7 + b * 5);
            movers.push({
              lat,
              lon,
              dE: dirE,
              dN: dirN,
              azTo: 0,
              speedVis: 0,
              span: 0,
              phase: 0,
              lift: 32 + 34 * b + 14 * hb,
              scale: b === 0 ? 0.86 + 0.18 * hb : 0.6 + 0.14 * hb,
              waveK: 0,
              weaveA: 0,
              eddy: true,
              R: b === 0 ? 0 : 110 + 60 * hb, // offset fisso ben separato tra i due rotori
              w0: hb * Math.PI * 2, // fase di rotazione iniziale
              om: 1.9 + 0.9 * hash01(i * 3 + j * 29 + b), // rad/s → gira su se stesso
              kind: "rotor",
              tint: "#ff4d5e", // ROSSO: aria che affonda e turba dietro la cresta
            });
          }
        }
        continue; // al posto della freccia dritta, qui ruota il rotore
      }

      /* FLUSSO CONTINUO: la freccia c'è OVUNQUE (anche in pianura e fuori dalle
         zone decollo), con forza minima visibile — l'acqua riempie ogni roccia */
      void breezeMag;

      /* CASCATA: la corsa accelera quando il flusso è allineato alla pendenza.
         RICHIESTA PILOTA: frecce LARGHE e che si muovono MOLTO più forte. */
      const cascade = clamp(1 + 0.55 * flowUp, 0.7, 1.6);
      const speedVis = clamp(sp * 4.4 * cascade, 22, 118);
      const distC = Math.hypot(i * STEP - extN, j * STEP - extE);

      dartCandidates.push({
        lat,
        lon,
        dE: dirE,
        dN: dirN,
        azTo: Math.atan2(dirE, dirN),
        speedVis,
        span: 620 + 360 * hash01(i * 7 + j),
        phase: hash01(i * 13 + j * 5) * 990,
        lift: 26 + 8 * hash01(i * 11 + j * 3),
        scale: 0.56 + 0.16 * clamp(sp / 26, 0, 1),
        waveK: distC * 0.0045,
        weaveA: 28 + 18 * hash01(i + j * 17),
        eddy: false,
        R: 0,
        w0: 0,
        om: 0,
        kind: "dart",
        tint: breezeColor(sp), // BLU, sempre la stessa famiglia
      });
    }
  }

  /* cap di sicurezza sulle frecce (hardware debole): diradamento uniforme */
  const MAXD = 1400;
  const keep = dartCandidates.length > MAXD ? Math.ceil(dartCandidates.length / MAXD) : 1;
  for (let k = 0; k < dartCandidates.length; k += keep) movers.push(dartCandidates[k]);

  /* ================= RENDER: BillboardCollection aggiornata a preRender ================= */
  const bc = new Cesium.BillboardCollection();
  viewer.scene.primitives.add(bc);

  const finite = (p: import("cesium").Cartesian3): boolean =>
    Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

  const imgOf = (m: Mover): HTMLCanvasElement => (m.kind === "rotor" ? rotorSprite(m.tint) : dartSprite(m.tint));

  let bbs: import("cesium").Billboard[] = [];
  try {
    bbs = movers.map((m) => {
      const start = Cesium.Cartesian3.fromDegrees(m.lon, m.lat, m.lift + 30);
      return bc.add({
        position: finite(start) ? start : Cesium.Cartesian3.ZERO,
        image: imgOf(m),
        scale: m.scale,
        scaleByDistance: new Cesium.NearFarScalar(1300, 1, 30000, 0.52),
        translucencyByDistance: new Cesium.NearFarScalar(19000, 1, 27000, 0.0),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 27000),
      });
    });
  } catch (e) {
    /* niente frecce orfane: se la creazione fallisce tolgo la collection */
    viewer.scene.primitives.remove(bc);
    throw e;
  }

  /* handle per i test di verifica */
  (window as unknown as Record<string, unknown>).__c3dWindFlow = {
    darts: movers.filter((m) => m.kind === "dart").length,
    chevrons: 0, // i venti meteo non stanno più sul suolo: solo su clic della quota
    eddies: eddyCenters.length,
    rotors: movers.filter((m) => m.kind === "rotor").length,
    total: movers.length,
  };
  const tick = (): void => {
    if (viewer.isDestroyed()) return;
    const t = performance.now() / 1000;
    let heading = 0;
    try {
      heading = viewer.camera.heading;
    } catch {
      return;
    }
    for (let i = 0; i < movers.length; i++) {
      const m = movers[i];
      const b = bbs[i];
      let offE: number;
      let offN: number;
      let rot: number;
      let lift: number;
      if (m.eddy) {
        /* ROTORE: posizione fissa (piccolo offset tra i due), la freccia curva
           GIRA SU SE STESSA — rotazione animata del billboard */
        offE = Math.cos(m.w0 * 2.3) * m.R;
        offN = Math.sin(m.w0 * 2.3) * m.R;
        rot = heading - (m.w0 + t * m.om);
        lift = m.lift + 5 * Math.sin(t * 1.1 + m.w0);
      } else {
        /* CORSA lungo il flusso + serpeggio laterale (onde) */
        const prog = ((t * m.speedVis + m.phase) % m.span) - m.span / 2;
        const sw = m.weaveA > 0 ? m.weaveA * Math.sin(t * 1.45 + m.phase * 0.11) : 0;
        offE = m.dE * prog - m.dN * sw;
        offN = m.dN * prog + m.dE * sw;
        rot = heading - m.azTo;
        lift = m.lift + 7 * Math.sin(t * 1.25 + m.phase * 0.07);
      }
      const la = m.lat + offN / mLat;
      const lo = m.lon + offE / mLon;
      const h = heightAt(field, la, lo) + lift;
      const p = Cesium.Cartesian3.fromDegrees(lo, la, h);
      if (finite(p)) b.position = p;
      /* ONDA GLOBALE: creste di luminosità/scala che percorrono la valle
         (sui rotori il respiro è più morbido: girano già su se stessi) */
      const wave = 0.5 + 0.5 * Math.sin(t * 1.5 - m.waveK);
      b.scale = m.scale * (m.eddy ? 0.94 + 0.1 * wave : 0.84 + 0.3 * wave);
    }
  };
  viewer.scene.preRender.addEventListener(tick);

  return {
    destroy(): void {
      try {
        if (!viewer.isDestroyed()) {
          viewer.scene.preRender.removeEventListener(tick);
          viewer.scene.primitives.remove(bc); // rimuove e distrugge la collection
        }
      } catch {
        /* il viewer era già distrutto */
      }
    },
  };
}
