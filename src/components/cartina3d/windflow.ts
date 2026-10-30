/**
 * FLUSSO VENTO 3D — la resa richiesta dal pilota: «i venti come una schiera a
 * pettine, tantissime frecce piccole in un flusso dinamico che corrono sui
 * rilievi». Due SISTEMI DISTINTI, perché brezze e vento meteo sono due cose
 * diverse (la direzione della previsione non è la direzione della brezza):
 *
 *  1) BREZZE DI PENDIO/VALLE — tantissime frecce PICCOLE a dardo che corrono
 *     sui rilievi come una CASCATA: di giorno salgono i pendii (anabatica),
 *     di notte scendono (catabatica). La velocità visiva cresce quando il
 *     flusso è allineato alla pendenza (effetto «cascata che risale») e dietro
 *     le creste, dove il vento meteo scavalca e l'aria affonda, compaiono i
 *     RICCIOLI DI SOTTOVENTO: piccoli vortici che ruotano su se stessi.
 *
 *  2) VENTI METEO — frecce LARGHE e CORTE (chevron) disposte a PETTINE: file
 *     ordinate perpendicolari al flusso, sfalsate come i denti di un pettine,
 *     su DUE STRATI di quota, che avanzano con TRENI DI ONDE (la luminosità
 *     percorre le file come un'onda).
 *
 * L'ONDA GLOBALE: tutte le frecce pulsano insieme con fase legata alla
 * distanza dal centro del campo → creste d'onda che attraversano la valle
 * («i venti come se fossero onde, tutti insieme»).
 *
 * Render: una BillboardCollection (sprite pre-disegnati sul canvas, economici)
 * aggiornata in scene.preRender: posizione, rotazione (allineata al Nord REALE
 * via heading della camera) e scala a ogni frame, senza il costo del framework
 * Entity né callback per singola entità.
 */

import { heightAt, speedColor, FLOW_COLORS, type FlowClass, type LivePoint, type WindField } from "./winds";
import { chevronSprite, curlSprite, dartSprite } from "./sprites";

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
  rowK: number; // fase di riga (onde sui pettini)
  weaveA: number; // ampiezza del serpeggio (m)
  eddy: boolean; // moto orbitale (ricciolo di sottovento)
  R: number; // raggio orbitale
  w0: number; // fase angolare iniziale
  om: number; // velocità angolare
  kind: "dart" | "chev" | "eddy"; // famiglia (scelta sprite + rotazione)
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

  /* ============ 1) BREZZE: griglia fitta di dardi sui pendii + riccioli ============ */
  const eddyCenters: { lat: number; lon: number }[] = [];
  const STEP = 235; // m tra i dardi candidati
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

      /* ---- RICCIOLI DI SOTTOVENTO: il meteo scavalca la cresta e dietro
         l'aria affonda → vortice (meteo moderato-forte + pendenza). ---- */
      if (w.ws >= 11 && s > 0.12 && up < -0.28) {
        const far = eddyCenters.every(
          (c) => Math.abs(c.lat - lat) * mLat > 380 || Math.abs(c.lon - lon) * mLon > 380,
        );
        if (far && eddyCenters.length < 42) {
          eddyCenters.push({ lat, lon });
          const nB = 4 + ((i + j) % 2); // 4-5 frecce per vortice
          for (let b = 0; b < nB; b++) {
            movers.push({
              lat,
              lon,
              dE: dirE,
              dN: dirN,
              azTo: 0, // la tangente si calcola a ogni frame
              speedVis: 0,
              span: 0,
              phase: 0,
              lift: 26 + 12 * hash01(i * 31 + j * 7 + b),
              scale: 0.62 + 0.12 * hash01(i + j * 13 + b * 3),
              waveK: 0,
              rowK: 0,
              weaveA: 0,
              eddy: true,
              R: 60 + 100 * hash01(i * 17 + j * 5 + b * 11),
              w0: (b / nB) * Math.PI * 2,
              om: 1.5 + 0.6 * hash01(i * 3 + j * 29),
              kind: "eddy",
              tint: "#ff5470",
            });
          }
        }
        continue; // al posto del dardo dritto, qui ruota il vortice
      }

      /* dardo SOLO dove domina la brezza di pendio: le zone di vento meteo
         restano al pettine dei chevron (i due sistemi restano leggibili) */
      if (breezeMag <= Math.max(2.0, 0.55 * w.ws)) continue;

      /* classe aerologica per il colore (come la legenda) */
      let cls: FlowClass = "flow";
      const windDom = w.ws >= 12;
      if (windDom && up > 0.3) cls = "lift";
      else if (windDom && up < -0.32 && w.ws >= 18) cls = "lee";
      else if (!windDom && s >= 0.1) cls = anabatic ? "ana" : "kata";

      /* CASCATA: la corsa accelera quando il flusso è allineato alla pendenza */
      const cascade = clamp(1 + 0.55 * flowUp, 0.7, 1.6);
      const speedVis = clamp(sp * 2.6 * cascade, 10, 68);
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
        scale: 0.66 + 0.16 * clamp(sp / 26, 0, 1),
        waveK: distC * 0.0045,
        rowK: 0,
        weaveA: 26 + 18 * hash01(i + j * 17),
        eddy: false,
        R: 0,
        w0: 0,
        om: 0,
        kind: "dart",
        tint: cls,
      });
    }
  }

  /* cap di sicurezza sui dardi (hardware debole): diradamento uniforme */
  const MAXD = 1150;
  const keep = dartCandidates.length > MAXD ? Math.ceil(dartCandidates.length / MAXD) : 1;
  for (let k = 0; k < dartCandidates.length; k += keep) movers.push(dartCandidates[k]);

  /* ============ 2) VENTI METEO: pettine di chevron larghi a due strati ============ */
  const wC = lw(0.5, 0.5); // vento medio del campo per orientare il pettine
  const azC = ((wC.wd + 180) % 360) * RAD; // dove VA il vento medio
  const cE = Math.sin(azC);
  const cN = Math.cos(azC);
  const pE = -cN; // perpendicolare: le righe del pettine
  const pN = cE;
  const ACROSS = 380; // distanza tra le righe (denti del pettine)
  const ALONG = 700; // distanza lungo il flusso
  const layers = [
    { lift: 55, k: 1.0, veer: 0, sc: 0.8 },
    { lift: 175, k: 1.13, veer: 7 * RAD, sc: 0.68 },
  ];
  let rowIdx = 0;
  for (const L of layers) {
    for (let y = -extE; y <= extE; y += ACROSS, rowIdx++) {
      for (let x = -extN; x <= extN; x += ALONG) {
        const xj = x + (rowIdx % 2 ? ALONG / 2 : 0); // righe sfalsate come un pettine vero
        if (Math.abs(xj) > extN) continue;
        const lat = field.lat0 + (pN * y + cN * xj) / mLat;
        const lon = field.lon0 + (pE * y + cE * xj) / mLon;
        const fi = (field.rows - 1) / 2 - ((lat - field.lat0) * mLat) / field.step;
        const fj = ((lon - field.lon0) * mLon) / field.step + (field.cols - 1) / 2;
        if (fi < -0.5 || fi > field.rows - 0.5 || fj < -0.5 || fj > field.cols - 0.5) continue;

        const w = lw(clamp(fj / (field.cols - 1), 0, 1), clamp(fi / (field.rows - 1), 0, 1));
        const ws = w.ws * L.k;
        if (ws < 1.5) continue;
        const az = ((w.wd + 180) % 360) * RAD + L.veer; // dove VA il vento a questo strato
        const dE = Math.sin(az);
        const dN = Math.cos(az);
        const distC = Math.hypot(y, xj);
        movers.push({
          lat,
          lon,
          dE,
          dN,
          azTo: az,
          speedVis: clamp(ws * 1.5, 6, 40),
          span: 1300,
          phase: hash01(rowIdx * 31 + Math.round(x)) * 1290,
          lift: L.lift,
          scale: L.sc * (0.9 + 0.2 * clamp(ws / 30, 0, 1)),
          waveK: distC * 0.0038,
          rowK: rowIdx * 0.62,
          weaveA: 0,
          eddy: false,
          R: 0,
          w0: 0,
          om: 0,
          kind: "chev",
          tint: speedColor(ws),
        });
      }
    }
  }

  /* ================= RENDER: BillboardCollection aggiornata a preRender ================= */
  const bc = new Cesium.BillboardCollection();
  viewer.scene.primitives.add(bc);

  const finite = (p: import("cesium").Cartesian3): boolean =>
    Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

  const imgOf = (m: Mover): HTMLCanvasElement =>
    m.kind === "eddy"
      ? curlSprite(m.tint)
      : m.kind === "dart"
        ? dartSprite(FLOW_COLORS[m.tint as FlowClass] ?? m.tint)
        : chevronSprite(m.tint);

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
    chevrons: movers.filter((m) => m.kind === "chev").length,
    eddies: eddyCenters.length,
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
        /* RICCIOLO: orbita attorno al centro, ruotata lungo la tangente */
        const ang = t * m.om + m.w0;
        offE = Math.cos(ang) * m.R;
        offN = Math.sin(ang) * m.R;
        const vE = -Math.sin(ang);
        const vN = Math.cos(ang);
        rot = heading - Math.atan2(vE, vN);
        lift = m.lift + 6 * Math.sin(t * 1.2 + m.w0 * 3);
      } else {
        /* CORSA lungo il flusso + serpeggio laterale (onde) */
        const prog = ((t * m.speedVis + m.phase) % m.span) - m.span / 2;
        const sw = m.weaveA > 0 ? m.weaveA * Math.sin(t * 0.95 + m.phase * 0.11) : 0;
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
      /* ONDA GLOBALE: creste di luminosità/scala che percorrono la valle;
         sui pettini si somma l'onda di riga (le file si accendono in sequenza) */
      const wave = 0.5 + 0.5 * Math.sin(t * 1.5 - m.waveK + m.rowK);
      b.scale = m.scale * (0.84 + 0.3 * wave);
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
