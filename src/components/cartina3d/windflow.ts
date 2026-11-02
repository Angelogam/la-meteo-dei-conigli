/**
 * FLUSSO VENTO DINAMICO — la BREZZA DI PENDIO come flusso continuo che sale
 * e pettina i versanti (richiesta pilota dopo il test su produzione:
 * «frecce che si incrociano e di 2 colori» → «un flusso continuo di frecce
 * che salgono e pettinano i pendii, tutte blu»).
 *
 * FISICA (aerologia/termodinamica dei pendii, Prandtl 1942 / Stull BLM):
 * nello strato d'aria a contatto col versante la spinta di galleggiamento
 * DOMINA sul vento libero: di giorno il pendio al sole scalda l'aria che
 * RISALE lungo la massima pendenza (anabatica), in cresta CONVERGE e si
 * STACCA risalendo in verticale (lì nutre le termiche); di notte l'aria
 * fredda e densa DRENA a valle lungo le stesse linee (catabatica).
 * Quindi la direzione delle frecce è SEMPRE lungo il pendio (gradiente +
 * una deriva di combing lungo il costone): le streamline di un campo
 * gradiente NON si incrociano mai — niente più frecce impazzite.
 * Il VENTO METEO non devia più le frecce al suolo: vive nel suo strato in
 * quota (buildAltitudeFlow) — due strati, due storie, come nel video.
 *
 * DUE MOTORI sulla stessa infrastruttura sprite:
 *
 *  1. buildWindFlow — BREZZE DI PENDIO a terra (TUTTE BLU, un solo colore):
 *   - le particelle NASCONO sul basso versante, SALGONO pettinando il
 *     rilievo e IN CRESTA si staccano e sfumano in verticale;
 *   - solo i pendii hanno frecce (pendenza >= SLOPE_MIN): niente più
 *     «casini» sparsi su pianure e fondovalle;
 *   - intensità km/h da winds.ts::blendFlow (sole, radiazione, nubi,
 *     venturi) — la corsa visiva resta un'ONDA UNICA (banda stretta).
 *
 *  2. buildAltitudeFlow — VENTI METEO in quota (clic su una quota o manto
 *     automatico sopra le creste): scie LINEARI e lunghe alla stessa
 *     altezza, tutte parallele al vento dominante del livello.
 *
 * Render: UNA BillboardCollection per motore (un draw call). Il terreno
 * occlude da solo gli sprite dietro i rilievi. Tick in scene.preRender con
 * oggetti scratch riusati: zero allocazioni per frame.
 */

import {
  blendFlow,
  dayOfYear,
  heightAt,
  heightAt2,
  speedColor,
  sunPosition,
  type FlowClass,
  type LivePoint,
  type WindField,
} from "./winds";
import { dartSprite, streakSprite } from "./sprites";

type CesiumNs = typeof import("cesium");
type ViewerNs = import("cesium").Viewer;
type Billboard = import("cesium").Billboard;

const RAD = Math.PI / 180;

export interface WindFlowHandle {
  destroy(): void;
  count?: number;
}

/* ---------- taratura del flusso suolo ---------- */
const NODES = 12; // nodi di scia (scia corta e sinuosa: «flusso», non «cavaletti»)
const SEG_LEN = 40; // m tra un nodo e il successivo → scia ≈ 480 m
const LIFT = 18; // m di volo delle scie SOPRA il terreno renderizzato
const LIFT_HEAD = 26; // m della testina-freccia
const LIFE_LOCK = 7.2; // s — vita UGUALE per tutte: la formazione da pettine non si disgrega
const SWAY_M = 18; // m — ampiezza dell'onda sinusoidale laterale (flusso sinuoso)
const COMB_W = 0.22; // peso della deriva di combing lungo il costone
const SLOPE_MIN = 0.055; // pendenza minima (m/m) perché una cella abbia la brezza
const SLOPE_END = 0.045; // sotto questa pendenza: cresta (lift-off) o fondo valle (morte)
const LIFT_T = 1.15; // s di stacco verticale in cresta (l'aria converge e sfuma)
const LIFT_H = 150; // m di risalita verticale in cresta
const BREEZE_BLUE = "#57b2f8"; // UN SOLO COLORE («le frecce brezza blu e basta»)

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
  seed: number; // indice della particella (jitter/fase deterministici)
  hG: number; // quota terreno corrente (raiseAt: lettura griglia, ogni frame)
  liftT: number; // timer dello stacco in cresta / morte a fondo valle (s)
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
    hG: 0,
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
      /* alpha della testina (nascite/morti sfumate e degrado morbido): una
         sola write a frame — le scie già scrivono 18 colori a frame */
      Cesium.Color.clone(Cesium.Color.WHITE, scCol);
      scCol.alpha = alpha;
      p.head.color = scCol;
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

  /* ---------- FIX OCCLUSIONE TERRAIN + FIX «si inchioda tutto» ----------
     Prima: la quota base era il MASSIMO tra il campo (celle 640 m) e il
     terreno Cesium RENDERIZZATO via globe.getHeight — ma in Cesium 1.146
     ogni getHeight fa un raycast sul TerrainPicker che, finché il worker
     non ha completato il BVH, è BRUTE FORCE su TUTTI i triangoli delle mesh
     renderizzate (profilo su produzione: >80% del main thread in
     getExaggeratedPosition/decodePosition/rayTriangleParametric, worker al
     99,9% idle, task da MINUTI — «la pagina si inchioda»). Ora la quota è
     letta dalla griglia DEM FINA H2 (160 m, stessi tile z14 già scaricati):
     nessun pick, nessun raycast, soltanto numeri — e a zoom ravvicinato la
     resa è quella del DEM vero (il rendering del terreno è ora limitato a
     z12/z13, quindi la griglia 160 m è comunque più fine del mesh). */
  const raiseAt = (a: number, b: number): number =>
    Math.max(heightAt2(field, a, b), heightAt(field, a, b));

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
  ): { dE: number; dN: number; sp: number; up: number; cls: FlowClass; s: number; expo: number } => {
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
    /* DIREZIONE = SEMPRE LUNGO IL PENDIO (aerologia delle brezze di versante,
       Prandtl/Stull): nello strato a contatto col rilievo la spinta di
       galleggiamento domina — di giorno l'aria RISALE la massima pendenza,
       di notte l'aria fredda DRENA a valle lungo le stesse linee; una deriva
       di combing segue il costone. Le streamline di un campo gradiente NON
       si incrociano. Il vento meteo NON devia le frecce al suolo: resta nel
       suo strato in quota (buildAltitudeFlow) — fine delle frecce impazzite. */
    const phys = blendFlow({ fE, fN, ws: w.ws, uE, uN, s, rE, rN, sunAz: sun.az, sunAlt: sun.alt, conv, rad: fbRad, cloudPct: fbCloud });
    /* stessa taratura giorno/notte di blendFlow: sale al sole, drena di notte */
    const dayK = Math.pow(clamp((sun.alt + 2) / 34, 0, 1), 1.35);
    const nightK = 1 - clamp((sun.alt + 6) / 8, 0, 1);
    const sign = dayK >= nightK ? 1 : -1;
    let dE = (uE + rE * COMB_W) * sign;
    let dN = (uN + rN * COMB_W) * sign;
    const dl = Math.hypot(dE, dN);
    if (dl > 1e-6) {
      dE /= dl;
      dN /= dl;
    } else {
      dE = phys.dE; // pianura assoluta: il moto non è definito, riusa il meteo
      dN = phys.dN;
    }
    /* esposizione al sole del versante (per attenuare l'alpha nelle ombre) */
    const aspectAz = Math.atan2(-uE, -uN); // direzione a VALLE del versante
    const expo = gl > 1e-6 ? Math.max(0, Math.cos(aspectAz - sun.az * RAD)) : 0;
    const up = dE * uE + dN * uN;
    return { dE, dN, sp: phys.sp, up, cls: phys.cls, s, expo };
  };

  /* ---------- PETTINE SUI PENDII (richiesta pilota: «un flusso continuo di
     frecce che salgono e pettinano i pendii»): NIENTE spawn casuale e NIENTE
     frecce su pianure e fondovalle. Reticolo DETERMINISTICO filtrato sulla
     PENDENZA (solo versanti), ogni particella possiede un proprio slot
     (jitter deterministico), vita UGUALE (LIFE_LOCK) e la stessa banda di
     corsa (onda unica) → un fiume d'aria continuo che sale i versanti. */
  const LATTICE_SP = 480; // m tra gli slot del reticolo
  const latticeAll: { la: number; lo: number }[] = [];
  const latticeSlope: { la: number; lo: number }[] = [];
  {
    const nI = Math.max(2, Math.round((2 * extN) / LATTICE_SP));
    const nJ = Math.max(2, Math.round((2 * extE) / LATTICE_SP));
    for (let i = 0; i <= nI; i++) {
      for (let j = 0; j <= nJ; j++) {
        const la = field.lat0 + (extN - (i * 2 * extN) / nI) / mLat;
        const lo = field.lon0 + (j * ((2 * extE) / nJ) - extE) / mLon;
        const pt = { la, lo };
        latticeAll.push(pt);
        const fi = (field.rows - 1) / 2 - ((la - field.lat0) * mLat) / field.step;
        const fj = ((lo - field.lon0) * mLon) / field.step + (field.cols - 1) / 2;
        const s = Math.max(0, gridBil(field.S, fi, fj));
        /* SOLO I PENDII: la brezza di versante esiste dove c'è pendenza */
        if (s >= SLOPE_MIN) latticeSlope.push(pt);
      }
    }
  }
  /* fallback: sito pianeggiante → tutto il reticolo (mai zero slot) */
  const latticeFull = latticeSlope.length > 0 ? latticeSlope : latticeAll;

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

  const respawn = (p: Particle, first: boolean): void => {
    /* slot FISSO della particella: il flusso rinasce sempre negli stessi
       punti → la formazione è periodica, ordinata e leggibile come un video */
    const c = slots[p.slot % slots.length];
    /* jitter DETERMINISTICO per PARTICELLA (mai Math.random()): a ogni
       rinascita la particella torna ESATTAMENTE nello stesso punto; due
       particelle sullo stesso slot restano però sfalsate (fasi diverse =
       file continue lungo la stessa linea di flusso). */
    let la = limLa(c.la + (hash01(p.seed * 7.13 + 1.7) * 2 - 1) * 42 / mLat);
    let lo = limLo(c.lo + (hash01(p.seed * 3.71 + 5.2) * 2 - 1) * 42 / mLon);
    let f = flowAt(la, lo);
    /* se il jitter è caduto su una cella senza pendenza (tasca piatta),
       riprova con altri offset: uno slot deve avere la BREZZA, non il moto
       fermo (evita il riciclo invisibile di particelle mai nate) */
    for (let a = 1; a <= 4 && f.s < SLOPE_END; a++) {
      la = limLa(c.la + (hash01((p.seed + a * 1013) * 7.13 + 1.7) * 2 - 1) * 42 / mLat);
      lo = limLo(c.lo + (hash01((p.seed + a * 1013) * 3.71 + 5.2) * 2 - 1) * 42 / mLon);
      f = flowAt(la, lo);
    }
    p.la = la;
    p.lo = lo;
    p.age = 0;
    /* vita UGUALE per tutte (LIFE_LOCK): la fase sfalsata della prima
       comparsa si CONSERVA a ogni ciclo (periodo identico) → flusso che
       ondeggia in blocco per sempre, senza file che si disgregano */
    p.life = LIFE_LOCK;
    p.distAcc = 0;
    p.hG = 0;
    p.liftT = 0;
    p.azTo = Math.atan2(f.dE, f.dN);
    if (first) p.age = (p.seed / NP) * p.life * 0.94; // fasi sfalsate: file continue
    pretrace(p, NODES, SEG_LEN, LIFT, la, lo, raiseAt, (a, b) => flowAt(a, b));
  };

  try {
    for (let k = 0; k < NP; k++) {
      const p = makeParticle(Cesium, bc, NODES, BREEZE_BLUE, 0.46, fadeByDist, ddc);
      p.slot = k % slots.length;
      p.seed = k;
      respawn(p, true);
      particles.push(p);
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

  setInst({ darts: NP, chevrons: 0, eddies: 0, rotors: 0, total: bc.length, sun: { az: Math.round(sun.az), alt: Math.round(sun.alt) } });

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

    /* degrado MORBIDO (fix «vanno a scatti»): prima le particelle oltre il
       cap venivano GELATE (`continue`) e poi SPARITE quando il livello
       scendeva — sui telefoni lenti il 30-55% delle frecce congelava di
       colpo. Ora la fascia oltre il cap SFUMA progressivamente fino a zero:
       quando il livello cambia la frontiera scorre dentro la fascia di
       dissolvenza → transizione morbida, mai pop. */
    const soft = Math.max(8, Math.round(particles.length * 0.12));
    const capEdge = cap + soft;

    for (let k = 0; k < particles.length; k++) {
      const p = particles[k];
      if (k >= capEdge) {
        /* fuori budget: nascosta (niente fisica, niente write) */
        if (p.head.show || p.segs[0].show) {
          p.head.show = false;
          for (let s = 0; s < nodes; s++) p.segs[s].show = false;
        }
        continue;
      }
      /* fascia di dissolvenza del degrado: 1 al cap → 0 al bordo esterno */
      const capA = k < cap ? 1 : 1 - (k - cap) / soft;
      p.age += dt;
      if (p.age > p.life) respawn(p, false);
      /* dissolvenza alla nascita e alla morte (fix teletrasporti visibili:
       la scia ora APPARE e SCOMPARIE sfumando, mai di colpo) */
      const lifeK = Math.min(1, p.age / 0.7) * Math.min(1, Math.max(0, (p.life - p.age) / 0.7));

      /* --- fisica: BREZZA DI VERSANTE PURA (direzione lungo il pendio) --- */
      const f = flowAt(p.la, p.lo);
      /* ARIA FERMA: il cutoff spegne solo l'aria davvero ferma — il campo
         fisico ha già un minimo di 2.2 km/h di striscio. */
      const calmK = f.sp <= 1.0 ? 0 : f.sp < 2.1 ? smooth01((f.sp - 1.0) / 1.1) : 1;
      const dirE = f.dE;
      const dirN = f.dN;
      p.azTo = Math.atan2(dirE, dirN);

      /* CRESTA / FONDO VALLE (aerologia dei pendii): salendo, quando il
         versante finisce l'aria CONVERGE in cresta, si STACCA e risale in
         verticale sfumando (è lì che nascono le termiche — i coni di fumo);
         drenando di notte, l'aria fredda muore al fondo valle. Niente più
         respawn-teletrasporto a metà flusso: la particella COMPLETA il suo
         ciclo fisico da base a cresta. */
      const climbing = f.up > 0;
      const ended = f.s < SLOPE_END;
      if (ended) p.liftT += dt;
      else p.liftT = 0;
      if (p.liftT > LIFT_T) {
        respawn(p, false);
        continue;
      }
      const liftK = ended ? smooth01(p.liftT / LIFT_T) : 0; // 0→1 durante lo stacco
      const liftH = climbing ? LIFT_H * liftK : 0;

      /* CASCATA: la brezza accelera leggermente risalendo il pendio (fisica:
         spinta di galleggiamento lungo la salita) — tarata SOTTILE perché il
         moto resti un'onda unica */
      const cascade = clamp(1 + 0.12 * f.up, 0.94, 1.12);
      /* durante lo stacco in cresta il moto orizzontale cede: l'aria sale */
      const visMs = visSpeedOf(f.sp) * cascade * (1 - 0.85 * liftK);
      const mStep = visMs * dt;

      p.la = limLa(p.la + (dirN * mStep) / mLat);
      p.lo = limLo(p.lo + (dirE * mStep) / mLon);

      /* ONDA SINUOSA COORDINATA (richiesta pilota: «devono correre in modo
         sinuoso come un flusso e tutte coordinate»): oscillazione laterale
         alla direzione locale del flusso, STESSA frequenza per tutte
         (0.85 rad/s) e fase deterministica per slot (angolo aureo) →
         l'intero campo ondeggia come un nastro d'acqua che serpeggia,
         coordinato, senza toccare la fisica del vento. */
      const sway = SWAY_M * Math.sin(0.85 * t + p.slot * 2.399963);
      p.la = limLa(p.la + (-dirN * sway) / mLat);
      p.lo = limLo(p.lo + (dirE * sway) / mLon);

      p.distAcc += mStep;
      const xN = (p.la - field.lat0) * mLat;
      const xE = (p.lo - field.lon0) * mLon;
      if (Math.abs(xN) > extN || Math.abs(xE) > extE) {
        respawn(p, false);
        continue;
      }

      /* quota terreno VIVA a ogni frame: raiseAt è ormai SOLO lettura delle
         griglie DEM in memoria (post-fix 7407064: zero raycast, zero pick) —
         costa aritmetica pura, così le scie seguono il rilievo SENZA scatti
         verticali anche a zoom da decollo (la cache a 10 frame faceva
         «saltare» la scia sui crinali). */
      p.hG = raiseAt(p.la, p.lo);
      const hHead = p.hG; // terreno VERO: mai sepolto a zoom ravvicinato
      if (p.distAcc >= SEG_LEN) {
        p.distAcc = 0;
        pushNode(p, NODES, p.la, p.lo, hHead + LIFT + liftH);
      }

      /* testina-freccia: cresce un filo con la raffica */
      const headBoost = clamp(f.sp / 25, 1, 2.1);
      const headScale = (0.46 + 0.02 * Math.sin(t * 2.1 + p.life * 7.3)) * headBoost;
      /* alpha: il versante al sole (expo) spinge l'anabatica e lo legge
         l'occhio; lo stacco in cresta / la morte a fondo valle SFUMANO;
         UN SOLO COLORE (BREEZE_BLUE) — niente più frecce bicolore */
      const sunK = climbing ? 0.55 + 0.45 * f.expo : 1;
      drawParticle(Cesium, heading, p, nodes, hHead, LIFT_HEAD + liftH, headScale, calmK > 0.02 && lifeK > 0.03 && capA > 0.03, clamp((0.6 + 0.4 * clamp(f.sp / 28, 0, 1)) * calmK * lifeK * capA * (1 - liftK) * sunK, 0, 1), mLat, mLon, scPos, scCol, LIFT);
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

    /* degrado morbido come sul motore suolo: fascia di dissolvenza oltre il cap */
    const soft = Math.max(6, Math.round(particles.length * 0.12));
    const capEdge = cap + soft;

    for (let k = 0; k < particles.length; k++) {
      const p = particles[k];
      if (k >= capEdge) {
        if (p.head.show || p.segs[0].show) {
          p.head.show = false;
          for (let s = 0; s < nodes; s++) p.segs[s].show = false;
        }
        continue;
      }
      const capA = k < cap ? 1 : 1 - (k - cap) / soft;
      p.age += dt;
      /* dissolvenza nascita/morte anche in quota */
      const lifeK = Math.min(1, p.age / 0.7) * Math.min(1, Math.max(0, (p.life - p.age) / 0.7));
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
      drawParticle(Cesium, heading, p, nodes, lvl, 0, 0.5, capA > 0.03 && lifeK > 0.03, 0.8 * lifeK * capA, mLat, mLon, scPos, scCol, 0);
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
