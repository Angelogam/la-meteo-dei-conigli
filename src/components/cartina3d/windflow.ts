/**
 * FLUSSO VENTO DINAMICO — particelle stile Windy, versione «acqua sul plastico 3D»
 * (richiesta pilota: niente più frecce lente e falliche: FLUSSO).
 *
 * DUE MOTORI sulla stessa infrastruttura sprite:
 *
 *  1. buildWindFlow — BREZZE DI PENDIO a terra:
 *   - centinaia di particelle d'aria che CORRONO sul terreno con scia a cometa;
 *   - fisica del campo in winds.ts::blendFlow (fonte unica): anabatica
 *     SENSIBILE AL SOLE (sale solo dove il versante è scaldo: sud al sole =
 *     piena, nord in ombra = quasi nulla), catabatica notturna su tutti i
 *     versanti, meteo che SCIVOLA ATTORNO alle pareti ripide (deflessione
 *     lungo le isoipse) e COMBING lungo il costone: le particelle pettinano
 *     il pendio per TUTTI i km e risalgono fino in cresta, come l'acqua
 *     versata sul plastico 3D che contorna le montagne;
 *   - dietro le creste i ROTORI rossi catturano l'aria in vortici;
 *   - ONDA UNICA: corsa visiva UNIFORME (banda stretta 390-520 m/s) — l'onda
 *     attraversa e pettina i rilievi come l'acqua; l'intensità del vento la
 *     dice il colore, la fisica dell'accelerazione resta ma tarata sottile.
 *
 *  2. buildAltitudeFlow — VENTI METEO in quota (clic su una quota):
 *   - scie LINEARI e lunghe alla stessa altezza, tutte parallele al vento
 *     dominante del livello, con FRECCIA VERA in testa e colore = velocità;
 *   - niente terrain-following: il vento in quota è lineare (richiesta pilota).
 *
 * Render: UNA BillboardCollection per motore (un draw call). Il terreno
 * occlude da solo gli sprite dietro i rilievi. Tick in scene.preRender con
 * oggetti scratch riusati: zero allocazioni per frame.
 */

import {
  blendFlow,
  breezeColor,
  dayOfYear,
  heightAt,
  speedColor,
  sunPosition,
  type FlowClass,
  type LivePoint,
  type WindField,
} from "./winds";
import { dartSprite, rotorSprite, streakSprite } from "./sprites";

type CesiumNs = typeof import("cesium");
type ViewerNs = import("cesium").Viewer;
type Billboard = import("cesium").Billboard;

const RAD = Math.PI / 180;

export interface WindFlowHandle {
  destroy(): void;
  count?: number;
}

/* ---------- taratura del flusso suolo ---------- */
const NODES = 18; // nodi di scia per particella (più nodi = curve più morbide)
const SEG_LEN = 66; // m tra un nodo e il successivo (campiona le curve del rilievo)
const LIFT = 20; // m di volo delle scie SOPRA il terreno renderizzato
const LIFT_HEAD = 30; // m della testina-freccia
const LIFE_LOCK = 7.2; // s — vita UGUALE per tutte: la formazione da pettine non si disgrega
const EDDY_MIN = 120; // raggio rotore minimo (m)
const EDDY_MAXR = 600; // raggio rotore massimo (m)
const EDDY_MAX = 14; // numero massimo di rotori

/* Velocità VISIVA (m/s) — «ONDA UNICA» (richiesta pilota): prima la banda era
   130-1150 m/s (corsa 9× disparata: «alcune si muovono troppo veloci e altre
   no»). Ora TUTTE le particelle scorrono in una banda stretta 285-380 m/s —
   un'unica onda coerente che segue i rilievi alpini — e RALLENTATA del ~30%
   rispetto alla v12 (390-520): il pilota legge il moto «un po' più piano»,
   come un video al rallentatore professionale. La differenza di vento vero
   (km/h) si legge nel COLORE della scia e nella freccia, non nella corsa. */
const visSpeedOf = (sp: number): number => Math.min(380, Math.max(285, 262 + 4.8 * sp));

interface Particle {
  la: number; // latitudine VIVA (testina)
  lo: number; // longitudine VIVA (testina)
  age: number; // età (s)
  life: number; // vita utile prima della rinascita (s)
  distAcc: number; // metri percorsi dall'ultimo nodo di scia
  colKey: string; // colore corrente (chiave sprite)
  azTo: number; // azimut corrente di moto (rad, da Nord, orario)
  tLa: Float64Array; // anello latitudini dei nodi di scia
  tLo: Float64Array; // anello longitudini dei nodi di scia
  tH: Float64Array; // anello quote dei nodi di scia
  tIdx: number; // indice del nodo PIÙ RECENTE nell'anello
  segs: Billboard[]; // segmenti di scia (NODES)
  head: Billboard; // testina-freccia
  slot: number; // slot fisso nel reticolo «pettine» (respawn deterministico)
}

interface RotorMover {
  la: number;
  lo: number;
  lift: number;
  w0: number; // fase angolare iniziale
  om: number; // velocità di rotazione (rad/s)
  scale: number;
  bb: Billboard;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth01 = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const hash01 = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

const finite = (p: import("cesium").Cartesian3): boolean =>
  Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

/* popolazione adattiva (hardware debole = meno particelle) */
const particleBudget = (k: number): number => {
  let np = k >= 8 ? 380 : k >= 4 ? 300 : 180;
  if (typeof window !== "undefined") {
    const shortSide = Math.min(window.screen?.width ?? 1280, window.screen?.height ?? 800);
    if (shortSide < 640) np = Math.round(np * 0.75);
  }
  return np;
};

/* ---------- strumenti sprite condivisi ---------- */
const baseColCache = new Map<string, import("cesium").Color>();
const baseCol = (Cesium: CesiumNs, key: string): import("cesium").Color => {
  let c = baseColCache.get(key);
  if (!c) {
    c = Cesium.Color.fromCssColorString(key);
    baseColCache.set(key, c);
  }
  return c;
};
const imgUrlCache = new WeakMap<HTMLCanvasElement, string>();
const imgUrl = (c: HTMLCanvasElement): string => {
  let u = imgUrlCache.get(c);
  if (!u) {
    u = c.toDataURL();
    imgUrlCache.set(c, u);
  }
  return u;
};

const setInst = (patch: Record<string, unknown>): void => {
  const w = (window as unknown as Record<string, unknown>).__c3dWindFlow as Record<string, unknown> | undefined;
  if (w) Object.assign(w, patch);
};

/* crearlo sempre: i test lo leggono anche quando il flusso non parte */
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__c3dWindFlow ??= {
    darts: 0,
    chevrons: 0,
    eddies: 0,
    rotors: 0,
    total: 0,
    level: 0,
  };
}

/* creazione di una particella completa (testina + anello di scia) */
const makeParticle = (Cesium: CesiumNs, bc: import("cesium").BillboardCollection, nodes: number, color: string, headScale: number, fade: import("cesium").NearFarScalar, ddc: import("cesium").DistanceDisplayCondition): Particle => {
  const p: Particle = {
    la: 0,
    lo: 0,
    age: 0,
    life: 6,
    distAcc: 0,
    colKey: color,
    azTo: 0,
    tLa: new Float64Array(nodes),
    tLo: new Float64Array(nodes),
    tH: new Float64Array(nodes),
    tIdx: 0,
    segs: [],
    slot: 0,
    head: bc.add({
      position: Cesium.Cartesian3.ZERO,
      image: imgUrl(dartSprite(color)),
      scale: headScale,
      scaleByDistance: new Cesium.NearFarScalar(1400, 1, 26000, 0.5),
      translucencyByDistance: fade,
      distanceDisplayCondition: ddc,
    }),
  };
  for (let s = 0; s < nodes; s++) {
    p.segs.push(
      bc.add({
        position: Cesium.Cartesian3.ZERO,
        image: imgUrl(streakSprite(color)),
        /* TAPER A COMETA sottile per nodo (1.0 in testa → 0.25 in coda):
           impostato UNA volta qui, mai riscritto nel tick (0 write/frame). */
        scale: 1.0 - (0.75 * s) / (nodes - 1),
        scaleByDistance: new Cesium.NearFarScalar(900, 0.8, 26000, 0.28),
        translucencyByDistance: fade,
        distanceDisplayCondition: ddc,
        show: false,
      }),
    );
  }
  return p;
};

/* disegno di un frame di una particella (testina + scia) */
const drawParticle = (
  Cesium: CesiumNs,
  heading: number,
  p: Particle,
  nodes: number,
  hHead: number,
  headLift: number,
  headScale: number,
  showHead: boolean,
  alpha: number,
  mLat: number,
  mLon: number,
  scPos: import("cesium").Cartesian3,
  scCol: import("cesium").Color,
  segLift: number,
): void => {
  if (showHead && alpha > 0.02) {
    const ph = Cesium.Cartesian3.fromDegrees(p.lo, p.la, hHead + headLift, undefined, scPos);
    if (finite(ph)) {
      p.head.show = true;
      p.head.position = scPos;
      p.head.rotation = heading - p.azTo;
      p.head.scale = headScale;
    } else p.head.show = false;
  } else p.head.show = false;

  let nLa = p.la;
  let nLo = p.lo;
  let nH = hHead + segLift;
  for (let i = 0; i < nodes; i++) {
    const idx = (p.tIdx - i + nodes) % nodes;
    const oLa = p.tLa[idx];
    const oLo = p.tLo[idx];
    const oH = p.tH[idx];
    const dLa = (oLa - nLa) * mLat;
    const dLo = (oLo - nLo) * mLon;
    const len = Math.hypot(dLa, dLo);
    const bb = p.segs[i];
    if (len < 10 || len > 1e6 || !Number.isFinite(len)) {
      bb.show = false;
    } else {
      const az = Math.atan2(dLo, dLa);
      bb.show = true;
      bb.rotation = heading - az + Math.PI / 2;
      const mid = Cesium.Cartesian3.fromDegrees((nLo + oLo) / 2, (nLa + oLa) / 2, (nH + oH) / 2, undefined, scPos);
      if (finite(mid)) bb.position = scPos;
      Cesium.Color.clone(baseCol(Cesium, p.colKey), scCol);
      scCol.alpha = alpha * (0.9 * Math.pow(1 - i / nodes, 1.25) + 0.05);
      if (scCol.alpha < 0.02) bb.show = false;
      else bb.color = scCol;
    }
    nLa = oLa;
    nLo = oLo;
    nH = oH;
  }
};

/* colore per famiglia di flusso (etichette/legende coerenti col suolo) */

/* pre-traccia la scia ALLA NASCITA risalendo il campo a ritroso: ogni
   particella nasce con la linea di flusso completa (stile Windy) */
const pretrace = (
  p: Particle,
  nodes: number,
  segLen: number,
  lift: number,
  la0: number,
  lo0: number,
  hAt: (la: number, lo: number) => number,
  dirAt: (la: number, lo: number) => { dE: number; dN: number },
): void => {
  let sLa = la0;
  let sLo = lo0;
  for (let n = 0; n < nodes; n++) {
    const slot = (nodes - n) % nodes;
    p.tLa[slot] = sLa;
    p.tLo[slot] = sLo;
    p.tH[slot] = hAt(sLa, sLo) + lift;
    const fs = dirAt(sLa, sLo);
    sLa -= (fs.dN * segLen) / 111320;
    sLo -= (fs.dE * segLen) / 111320;
  }
};

/* avanza la scia dell'anello */
const pushNode = (p: Particle, nodes: number, la: number, lo: number, h: number): void => {
  p.tIdx = (p.tIdx + 1) % nodes;
  p.tLa[p.tIdx] = la;
  p.tLo[p.tIdx] = lo;
  p.tH[p.tIdx] = h;
};

/* degrado adattivo: EMA del frame time con isteresi (già al pilota) */
const makeDegrade = (nodes: number, np: number) => {
  let dtEma = 16.7;
  let lowSince = 0;
  let goodSince = 0;
  let level = 0;
  return {
    get level(): number {
      return level;
    },
    get nodes(): number {
      return level === 0 ? nodes : level === 1 ? Math.max(8, Math.round(nodes * 0.55)) : Math.max(6, Math.round(nodes * 0.4));
    },
    get cap(): number {
      return level === 0 ? np : level === 1 ? Math.round(np * 0.7) : Math.round(np * 0.45);
    },
    step(now: number, dtMs: number): void {
      dtEma = 0.9 * dtEma + 0.1 * dtMs;
      if (dtEma > 33.3) {
        if (lowSince === 0) lowSince = now;
      } else lowSince = 0;
      if (dtEma < 18) {
        if (goodSince === 0) goodSince = now;
      } else goodSince = 0;
      if (level < 2 && lowSince !== 0 && now - lowSince > 2000 && (level === 0 ? dtEma > 33.3 : dtEma > 45)) {
        level += 1;
        setInst({ level });
      } else if (level > 0 && goodSince !== 0 && now - goodSince > 5000) {
        level -= 1;
        setInst({ level });
      }
    },
  };
};

/* ================================================================
   MOTORE 1 — BREZZE DI PENDIO (superficie, terrain-following)
   ================================================================ */
export function buildWindFlow(
  Cesium: CesiumNs,
  viewer: ViewerNs,
  field: WindField,
  live: LivePoint[] | null,
  hour: number,
  fallback: { ws: number; wd: number; rad?: number | null; cloud?: number | null } = { ws: 7, wd: 270 },
  doy?: number,
): WindFlowHandle {
  const sun = sunPosition(doy ?? dayOfYear(null), hour, field.lat0);
  /* «alle ore di richiesta, in base alle vere condizioni di open-meteo»:
     radiazione e nubi dell'ORA selezionata spingono la brezza (blendFlow) */
  const fbRad = fallback.rad ?? null;
  const fbCloud = fallback.cloud ?? null;
  const mLat = field.mLat;
  const mLon = field.mLon;
  const extN = ((field.rows - 1) * field.step) / 2;
  const extE = ((field.cols - 1) * field.step) / 2;
  const limLa = (v: number) => clamp(v, field.lat0 - extN / mLat + 1e-6, field.lat0 + extN / mLat - 1e-6);
  const limLo = (v: number) => clamp(v, field.lon0 - extE / mLon + 1e-6, field.lon0 + extE / mLon - 1e-6);

  /* ---------- FIX OCCLUSIONE TERRAIN (richiesta pilota: «quando si ingran-
     disce la mappa le frecce spariscono»): i nodi di scia erano appoggiati al
     DEM del CAMPO (celle 640 m): tra un campione e l'altro il terreno Cesium
     renderizzato (much più fine) sale oltre il lift di 14 m e seppellisce
     scie e frecce. Ora la quota base è il MASSIMO tra campo e terreno VERO
     (globe.getHeight dei tile caricati: a zoom ravvicinato è il LOD pieno). */
  const globeHAt = (la: number, lo: number): number | null => {
    try {
      const h = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(lo, la));
      return typeof h === "number" && Number.isFinite(h) ? h : null;
    } catch {
      return null;
    }
  };
  const raiseAt = (a: number, b: number): number => {
    const f = heightAt(field, a, b);
    const g = globeHAt(a, b);
    return g != null && g > f ? g : f;
  };

  /* vento live interpolato sulla griglia 3×3 (bilineare) */
  const lw = (u: number, v: number): { ws: number; wd: number } => {
    if (!live || live.length !== 9) return { ws: fallback.ws, wd: fallback.wd };
    const uc = clamp(u * 2, 0, 1.999);
    const vc = clamp(v * 2, 0, 1.999);
    const u0 = Math.floor(uc);
    const v0 = Math.floor(vc);
    const P = (a: number, b: number) => live[Math.min(2, v0 + b) * 3 + Math.min(2, u0 + a)];
    const w00 = P(0, 0);
    const w10 = P(1, 0);
    const w01 = P(0, 1);
    const w11 = P(1, 1);
    const mix = (k: "ws" | "wd") =>
      w00[k] * (1 - uc + u0) * (1 - vc + v0) + w10[k] * (uc - u0) * (1 - vc + v0) + w01[k] * (1 - uc + u0) * (vc - v0) + w11[k] * (uc - u0) * (vc - v0);
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

  /* ---------- CAMPO DI FLUSSO in un punto (richiamato a ogni frame) ---------- */
  const flowAt = (
    la: number,
    lo: number,
  ): { dE: number; dN: number; sp: number; up: number; cls: FlowClass } => {
    const xN = (la - field.lat0) * mLat;
    const xE = (lo - field.lon0) * mLon;
    const fi = (field.rows - 1) / 2 - xN / field.step;
    const fj = xE / field.step + (field.cols - 1) / 2;
    const gE = gridBil(field.gE, fi, fj);
    const gN = gridBil(field.gN, fi, fj);
    const s = Math.max(0, gridBil(field.S, fi, fj));
    const gl = Math.hypot(gE, gN);
    const uE = gl > 1e-6 ? gE / gl : 0;
    const uN = gl > 1e-6 ? gN / gl : 0;

    /* COMBING: perpendicolare al gradiente col segno dove il DEM sale
       (campiono il DEM a ±260 m lungo il contorno) */
    let rE = 0;
    let rN = 0;
    if (gl > 1e-6 && s > 0.06) {
      const tE0 = uN;
      const tN0 = -uE;
      const dLa = (260 * tN0) / mLat;
      const dLo = (260 * tE0) / mLon;
      const kSign = heightAt(field, la + dLa, lo + dLo) >= heightAt(field, la - dLa, lo - dLo) ? 1 : -1;
      rE = kSign * tE0;
      rN = kSign * tN0;
    }

    const w = lw((xE + extE) / (2 * extE), (extN - xN) / (2 * extN));
    const fE = -Math.sin(w.wd * RAD);
    const fN = -Math.cos(w.wd * RAD);
    /* VENTURI (fisica del rilievo): l'aria accelera sui dossi e sui colli e
       rallenta nelle conche — convessità locale = quota meno media delle 4
       quote a ±2 celle. La stessa fisica finisce nelle etichette km/h. */
    const d2La = (2 * field.step) / mLat;
    const d2Lo = (2 * field.step) / mLon;
    const hC = heightAt(field, la, lo);
    const conv =
      hC -
      (heightAt(field, la + d2La, lo) +
        heightAt(field, la - d2La, lo) +
        heightAt(field, la, lo + d2Lo) +
        heightAt(field, la, lo - d2Lo)) /
        4;
    return blendFlow({ fE, fN, ws: w.ws, uE, uN, s, rE, rN, sunAz: sun.az, sunAlt: sun.alt, conv, rad: fbRad, cloudPct: fbCloud });
  };

  /* ---------- ROTORI DI SOTTOVENTO: centri dei vortici dietro le creste ---------- */
  const eddies: { la: number; lo: number; r: number }[] = [];
  const SCAN = 235;
  const nI = Math.floor((2 * extN) / SCAN);
  const nJ = Math.floor((2 * extE) / SCAN);
  for (let i = 0; i <= nI && eddies.length < EDDY_MAX; i++) {
    for (let j = 0; j <= nJ && eddies.length < EDDY_MAX; j++) {
      const la = field.lat0 + (extN - i * SCAN) / mLat;
      const lo = field.lon0 + (j * SCAN - extE) / mLon;
      const w = lw(j / Math.max(1, nJ), i / Math.max(1, nI));
      const fi = (field.rows - 1) / 2 - ((la - field.lat0) * mLat) / field.step;
      const fj = ((lo - field.lon0) * mLon) / field.step + (field.cols - 1) / 2;
      const gE = gridBil(field.gE, fi, fj);
      const gN = gridBil(field.gN, fi, fj);
      const s = Math.max(0, gridBil(field.S, fi, fj));
      const gl = Math.hypot(gE, gN);
      const uE = gl > 1e-6 ? gE / gl : 0;
      const uN = gl > 1e-6 ? gN / gl : 0;
      const fE = -Math.sin(w.wd * RAD);
      const fN = -Math.cos(w.wd * RAD);
      const up = fE * uE + fN * uN;
      /* il meteo scavalca la cresta e dietro l'aria affonda e ROTA */
      const lee = (w.ws >= 8.5 && s > 0.1 && up < -0.22) || (s > 0.22 && up < -0.3);
      if (!lee) continue;
      const far = eddies.every((c) => Math.hypot((c.la - la) * mLat, (c.lo - lo) * mLon) > 560);
      if (far) {
        const dLa6 = 600 / mLat;
        const dLo6 = 600 / mLon;
        const hC = heightAt(field, la, lo);
        const hN = heightAt(field, la + dLa6, lo);
        const hS = heightAt(field, la - dLa6, lo);
        const hE = heightAt(field, la, lo + dLo6);
        const hW = heightAt(field, la, lo - dLo6);
        const relief = Math.max(hC, hN, hS, hE, hW) - Math.min(hC, hN, hS, hE, hW);
        const sinSlope = relief / Math.hypot(relief, 1200);
        const r = clamp(3.5 * relief * sinSlope, EDDY_MIN, EDDY_MAXR);
        eddies.push({ la, lo, r });
      }
    }
  }

  /* ---------- PETTINE (richiesta pilota: «le frecce devono essere tutte
     allineate come un pettine e risalire i pendii»): NIENTE spawn casuale.
     Reticolo DETERMINISTICO equispaziato su tutto il rilievo: ogni particella
     possiede un proprio slot (jitter ±30 m), vita UGUALE (LIFE_LOCK) e la
     stessa banda di corsa (onda unica) → la formazione resta un pettine
     ordinato che avanza in blocco, come l'acqua pettinata sulle rocce. */
  const LATTICE_SP = 620; // m tra gli slot del pettine
  const latticeFull: { la: number; lo: number }[] = [];
  {
    const nI = Math.max(2, Math.round((2 * extN) / LATTICE_SP));
    const nJ = Math.max(2, Math.round((2 * extE) / LATTICE_SP));
    for (let i = 0; i <= nI; i++) {
      for (let j = 0; j <= nJ; j++) {
        latticeFull.push({
          la: field.lat0 + (extN - (i * 2 * extN) / nI) / mLat,
          lo: field.lon0 + (j * ((2 * extE) / nJ) - extE) / mLon,
        });
      }
    }
  }

  const NP = particleBudget(typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4);

  /* se gli slot superano le particelle, dirado con passo costante: resta
     comunque una GRIGLIA regolare (sotto-reticolo), mai una selezione random */
  let slots = latticeFull;
  if (latticeFull.length > NP) {
    const stride = latticeFull.length / NP;
    slots = [];
    for (let k = 0; k < NP; k++) slots.push(latticeFull[Math.min(latticeFull.length - 1, Math.floor(k * stride))]);
  }

  /* ---------- collezione unica di sprite (un draw call) ---------- */
  const bc = new Cesium.BillboardCollection();
  viewer.scene.primitives.add(bc);

  const fadeByDist = new Cesium.NearFarScalar(34000, 1, 44000, 0.0); // v13: sfuma solo davvero lontano
  const ddc = new Cesium.DistanceDisplayCondition(0, 44000);

  const particles: Particle[] = [];
  const rotors: RotorMover[] = [];

  const respawn = (p: Particle, first: boolean): void => {
    /* slot FISSO della particella: il pettine rinasce sempre negli stessi
       punti → la formazione è periodica, ordinata e leggibile come un video */
    const c = slots[p.slot % slots.length];
    const la = limLa(c.la + ((Math.random() * 2 - 1) * 30) / mLat);
    const lo = limLo(c.lo + ((Math.random() * 2 - 1) * 30) / mLon);
    p.la = la;
    p.lo = lo;
    p.age = 0;
    /* vita con micro-variazione DETERMINISTICA per slot (±8%, @gemini-cli:
       rompe l'effetto «nastro trasportatore»/aliasing stroboscopico del pettine
       a vita identica, senza Math.random() → zero sfarfallio tra i frame) */
    p.life = LIFE_LOCK * (0.92 + 0.16 * hash01(p.slot * 12.9898));
    p.distAcc = 0;
    const f = flowAt(la, lo);
    p.azTo = Math.atan2(f.dE, f.dN);
    p.colKey = breezeColor(f.sp, f.cls);
    if (first) p.age = (p.slot / slots.length) * p.life * 0.92; // fasi sfalsate: file continue
    pretrace(p, NODES, SEG_LEN, LIFT, la, lo, raiseAt, (a, b) => flowAt(a, b));
  };

  try {
    for (let k = 0; k < NP; k++) {
      const p = makeParticle(Cesium, bc, NODES, "#5cb9fb", 0.46, fadeByDist, ddc);
      p.slot = k % slots.length;
      respawn(p, true);
      particles.push(p);
    }

    /* ROTORI: i simboli rossi ad arco che girano su se stessi (anchor sul
       terreno VERO — anche i rotori devono restare visibili zoomando) */
    for (let e = 0; e < eddies.length; e++) {
      const groundE = raiseAt(eddies[e].la, eddies[e].lo);
      for (let b = 0; b < 2; b++) {
        const hb = hash01(e * 31 + b * 7);
        const bb = bc.add({
          position: Cesium.Cartesian3.fromDegrees(eddies[e].lo, eddies[e].la, groundE + 26 + 38 * b + 12 * hb),
          image: imgUrl(rotorSprite("#ff4d5e")),
          scale: b === 0 ? 0.78 + 0.15 * hb : 0.55 + 0.12 * hb,
          scaleByDistance: new Cesium.NearFarScalar(1600, 1, 26000, 0.5),
          translucencyByDistance: fadeByDist,
          distanceDisplayCondition: ddc,
        });
        rotors.push({
          la: eddies[e].la,
          lo: eddies[e].lo,
          lift: groundE + 26 + 38 * b + 12 * hb, // QUOTA ASSOLUTA sul terreno vero
          w0: hb * Math.PI * 2,
          om: 1.6 + 0.9 * hash01(e * 3 + b * 5),
          scale: b === 0 ? 0.78 + 0.15 * hb : 0.55 + 0.12 * hb,
          bb,
        });
      }
    }
  } catch (e) {
    /* niente sprite orfani: se la creazione fallisce tolgo la collection */
    try {
      viewer.scene.primitives.remove(bc);
    } catch {
      /* già rimossa */
    }
    throw e;
  }

  setInst({ darts: NP, chevrons: 0, eddies: eddies.length, rotors: rotors.length, total: bc.length, sun: { az: Math.round(sun.az), alt: Math.round(sun.alt) } });

  /* ---------- scratch objects: zero allocazioni per frame ---------- */
  const scPos = new Cesium.Cartesian3();
  const scCol = new Cesium.Color();
  const degrade = makeDegrade(NODES, NP);

  let last = performance.now();
  let hiddenFrames = 0;
  const tick = (): void => {
    if (viewer.isDestroyed()) return;
    const now = performance.now();
    const dtMs = clamp(now - last, 0.001, 120);
    const dt = dtMs / 1000;
    last = now;
    const t = now / 1000;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      hiddenFrames = 6; // al ritorno dal tab nascosto: 6 frame senza fisica
      return;
    }
    let heading = 0;
    try {
      heading = viewer.camera.heading;
    } catch {
      return;
    }

    degrade.step(now, dtMs);
    const nodes = degrade.nodes;
    const cap = degrade.cap;
    if (hiddenFrames > 0) {
      hiddenFrames -= 1;
      return;
    }

    for (let k = 0; k < particles.length; k++) {
      const p = particles[k];
      if (k >= cap) continue;
      p.age += dt;
      if (p.age > p.life) respawn(p, false);

      /* --- fisica: campo fuso + eventuale cattura del rotore --- */
      const f = flowAt(p.la, p.lo);
      /* ARIA FERMA: il cutoff v10 (4.3-10.8 km/h) SPEGNEVA le brezze reali —
         la catabatica notturna sta a 2-6 km/h e il pilota zoomando vedeva il
         vuoto («le frecce spariscono»). Ora la soglia copre solo l'aria davvero
         ferma: il campo fisico ha già un minimo di 2.2 km/h di striscio. */
      const calmK = f.sp <= 1.0 ? 0 : f.sp < 2.1 ? smooth01((f.sp - 1.0) / 1.1) : 1;
      let vE = (f.dE * f.sp) / 3.6;
      let vN = (f.dN * f.sp) / 3.6;
      let inEd = -1;
      for (let e = 0; e < eddies.length; e++) {
        const c = eddies[e];
        const dx = (p.lo - c.lo) * mLon;
        const dy = (p.la - c.la) * mLat;
        const d = Math.hypot(dx, dy);
        if (d < c.r) {
          inEd = e;
          const w = 1 - d / c.r;
          const inv = d > 1e-3 ? 1 / d : 0;
          const tx = -dy * inv;
          const ty = dx * inv;
          const vt = Math.min(16, 3.5 + 0.085 * d);
          vE = vE * (1 - w) + tx * vt * w;
          vN = vN * (1 - w) + ty * vt * w;
          break;
        }
      }
      const vm = Math.hypot(vE, vN);
      if (!Number.isFinite(vm) || vm < 0.05) {
        respawn(p, false);
        continue;
      }
      const dirE = vE / vm;
      const dirN = vN / vm;
      p.azTo = Math.atan2(dirE, dirN);

      /* CASCATA: la brezza accelera leggermente risalendo il pendio (fisica:
         spinta di galleggiamento lungo la salita) — tarata SOTTILE perché il
         moto resti un'onda unica; l'accelerazione vera si vede dal colore */
      const cascade = inEd >= 0 ? 1 : clamp(1 + 0.12 * f.up, 0.94, 1.12);
      const visMs = visSpeedOf(f.sp) * cascade;
      const mStep = visMs * dt;

      p.la = limLa(p.la + (dirN * mStep) / mLat);
      p.lo = limLo(p.lo + (dirE * mStep) / mLon);
      p.distAcc += mStep;
      const xN = (p.la - field.lat0) * mLat;
      const xE = (p.lo - field.lon0) * mLon;
      if (Math.abs(xN) > extN || Math.abs(xE) > extE) {
        respawn(p, false);
        continue;
      }

      const hHead = raiseAt(p.la, p.lo); // terreno VERO: mai sepolto a zoom ravvicinato
      if (p.distAcc >= SEG_LEN) {
        p.distAcc = 0;
        pushNode(p, NODES, p.la, p.lo, hHead + LIFT);
      }

      /* colore: ambra calda sull'anabatica (sale al sole), blu sul drenaggio
         notturno e sul flusso neutro — due famiglie, come nel video */
      const nk = breezeColor(f.sp, f.cls);
      if (nk !== p.colKey) {
        p.colKey = nk;
        const simg = imgUrl(streakSprite(nk));
        for (let s = 0; s < NODES; s++) p.segs[s].image = simg;
        p.head.image = imgUrl(dartSprite(nk));
      }

      /* testina-freccia: cresce un filo con la raffica */
      const headBoost = clamp(f.sp / 25, 1, 2.1);
      const headScale = (0.46 + 0.02 * Math.sin(t * 2.1 + p.life * 7.3)) * headBoost;
      drawParticle(Cesium, heading, p, nodes, hHead, LIFT_HEAD, headScale, calmK > 0.02, clamp((0.6 + 0.4 * clamp(f.sp / 28, 0, 1)) * calmK, 0, 1), mLat, mLon, scPos, scCol, LIFT);
    }

    /* rotori: girano su se stessi e respirano */
    for (let r = 0; r < rotors.length; r++) {
      const m = rotors[r];
      const wob = 5 * Math.sin(t * 1.1 + m.w0);
      const p = Cesium.Cartesian3.fromDegrees(m.lo, m.la, m.lift + wob, undefined, scPos);
      if (finite(p)) m.bb.position = scPos;
      m.bb.rotation = heading - (m.w0 + t * m.om);
      m.bb.scale = m.scale * (0.94 + 0.1 * Math.sin(t * 1.5 + m.w0));
    }
  };
  viewer.scene.preRender.addEventListener(tick);

  return {
    destroy(): void {
      try {
        if (!viewer.isDestroyed()) {
          viewer.scene.preRender.removeEventListener(tick);
          viewer.scene.primitives.remove(bc);
        }
      } catch {
        /* il viewer era già distrutto */
      }
    },
  };
}

/* ================================================================
   MOTORE 2 — VENTI METEO IN QUOTA (lineari, richiesta pilota)
   Scie lunghe e dritte tutte alla stessa altezza, parallele al vento
   dominante del livello, con freccia vera in testa e colore = velocità.
   ================================================================ */
export interface AltitudeFlowOpts {
  lon0: number;
  lat0: number;
  lvl: number; // quota m
  ws: number; // km/h
  wd: number; // gradi «da»
  extent?: number; // semilato dell'area coperta (m)
  field?: WindField | null; // per nascondere le scie dietro i rilievi
  /** colore fisso della famiglia (default: scala velocità giallo→viola).
      Lo strato automatico sopra le creste usa il CIANO del video. */
  colorCss?: string;
  /** frazione del budget particelle (0.2..1): il layer automatico è contesto
      visivo e resta leggero; l'analisi per quota usa la densità piena */
  density?: number;
}

export function buildAltitudeFlow(Cesium: CesiumNs, viewer: ViewerNs, opts: AltitudeFlowOpts): WindFlowHandle {
  const extent = opts.extent ?? 8400;
  const lvl = opts.lvl;
  const dirTo = (((opts.wd + 180) % 360) + 360) % 360; // dove SPINGE
  const dE = Math.sin(dirTo * RAD);
  const dN = Math.cos(dirTo * RAD);
  const azTo = dirTo * RAD;
  const color = opts.colorCss ?? speedColor(opts.ws);
  /* anche i venti meteo in quota scorrono come ONDA UNICA: banda stretta
     340-460 m/s (v12: 470-640, rallentata ~30% su richiesta del pilota).
     Direzione e intensità si leggono da orientamento, colore e etichette km/h. */
  const visMs = Math.min(460, Math.max(340, 315 + 4.5 * opts.ws)); // rallentata ~30% come le brezze
  const mLat = 111320;
  const mLon = 111320 * Math.cos((opts.lat0 * Math.PI) / 180);

  const NODES_A = 12;
  const SEG_A = 120; // scie lunghe = aspetto lineare
  const NP = Math.round(
    particleBudget(typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4) *
      (opts.density ?? 0.55),
  );

  const bc = new Cesium.BillboardCollection();
  viewer.scene.primitives.add(bc);
  const fadeByDist = new Cesium.NearFarScalar(26000, 1, 34000, 0.0);
  const ddc = new Cesium.DistanceDisplayCondition(0, 34000);

  const particles: Particle[] = [];
  const respawn = (p: Particle, first: boolean): void => {
    const x = (Math.random() * 2 - 1) * extent * 0.98;
    const y = (Math.random() * 2 - 1) * extent * 0.98;
    p.la = opts.lat0 + y / mLat;
    p.lo = opts.lon0 + x / mLon;
    p.age = 0;
    p.life = 5 + 7 * Math.random();
    p.distAcc = 0;
    p.azTo = azTo;
    p.colKey = color;
    if (first) p.age = Math.random() * p.life;
    /* scia iniziale dritta DIETRO la testa (contro il moto) */
    let sLa = p.la;
    let sLo = p.lo;
    for (let n = 0; n < NODES_A; n++) {
      const slot = (NODES_A - n) % NODES_A;
      p.tLa[slot] = sLa;
      p.tLo[slot] = sLo;
      p.tH[slot] = lvl;
      sLa -= (dN * SEG_A) / mLat;
      sLo -= (dE * SEG_A) / mLon;
    }
  };

  for (let k = 0; k < NP; k++) {
    const p = makeParticle(Cesium, bc, NODES_A, color, 0.5, fadeByDist, ddc);
    respawn(p, true);
    particles.push(p);
  }

  setInst({ chevrons: NP });

  const scPos = new Cesium.Cartesian3();
  const scCol = new Cesium.Color();
  const degrade = makeDegrade(NODES_A, NP);
  let last = performance.now();
  let hiddenFrames = 0;
  const tick = (): void => {
    if (viewer.isDestroyed()) return;
    const now = performance.now();
    const dtMs = clamp(now - last, 0.001, 120);
    const dt = dtMs / 1000;
    last = now;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      hiddenFrames = 6;
      return;
    }
    let heading = 0;
    try {
      heading = viewer.camera.heading;
    } catch {
      return;
    }
    degrade.step(now, dtMs);
    const nodes = degrade.nodes;
    const cap = degrade.cap;
    if (hiddenFrames > 0) {
      hiddenFrames -= 1;
      return;
    }

    for (let k = 0; k < particles.length; k++) {
      const p = particles[k];
      if (k >= cap) continue;
      p.age += dt;
      const mStep = visMs * dt;
      p.la += (dN * mStep) / mLat;
      p.lo += (dE * mStep) / mLon;
      p.distAcc += mStep;
      const xM = (p.lo - opts.lon0) * mLon;
      const yM = (p.la - opts.lat0) * mLat;
      const out = Math.abs(xM) > extent || Math.abs(yM) > extent;
      if (out || p.age > p.life) {
        respawn(p, false);
        continue;
      }
      if (p.distAcc >= SEG_A) {
        p.distAcc = 0;
        pushNode(p, NODES_A, p.la, p.lo, lvl);
      }
      /* nascosta dietro i rilievi che superano la quota */
      let hidden = false;
      if (opts.field) {
        const hT = heightAt(opts.field, p.la, p.lo);
        if (hT > lvl - 70) hidden = true;
      }
      if (hidden) {
        p.head.show = false;
        for (let s = 0; s < nodes; s++) p.segs[s].show = false;
        continue;
      }
      drawParticle(Cesium, heading, p, nodes, lvl, 0, 0.5, true, 0.8, mLat, mLon, scPos, scCol, 0);
    }
  };
  viewer.scene.preRender.addEventListener(tick);

  return {
    count: NP,
    destroy(): void {
      try {
        if (!viewer.isDestroyed()) {
          viewer.scene.preRender.removeEventListener(tick);
          viewer.scene.primitives.remove(bc);
        }
      } catch {
        /* il viewer era già distrutto */
      }
    },
  };
}
