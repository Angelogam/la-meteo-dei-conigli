/**
 * FLUSSO VENTO DINAMICO — v17 «PLOTONE A PETTINE».
 *
 * Il pilota ha respinto v13/v14/v15/v16 e il video del 2 nov chiude la
 * questione: «le brezze le devi vedere come un plotone di soldati in riga
 * che si muove in modo sincronizzato dal basso verso l'alto, parallelamente;
 * frecce a pettine che salgono il pendio in modo uguale, in continuo, un po'
 * distanziate ma vicine». E il «i venti vanno indietro» era il modo notte:
 * le perle scendevano (catabatica) con frecce e teste-scia puntate in su.
 *
 * La svolta v17 (lanes.ts, matematica pura): le BREZZE DI PENDIO corrono su
 * CORSIE pre-calcolate (streamline integrate sul gradiente del DEM fine 160 m,
 * maschera anti-incrocio) e un OROLOGIO DI MARCIA GLOBALE m avanza: il fronte
 * k sta sull'arco m − k·ROW_SPACING su OGNI corsia → righe di frecce
 * affiancate perpendicolari alla salita, sincronizzate, ogni ~300 m lungo il
 * pendio, che SALONO SEMPRE (anabatica: valle → cresta, niente inversione
 * notturna). Fisica: Prandtl 1942 / Stull BLM / Whiteman.
 *
 *  1. buildWindFlow — BREZZE DI PENDIO a terra (TUTTE BLU, un solo colore).
 *  2. buildAltitudeFlow — VENTI METEO in quota (clic su una quota): scie
 *     lineari e lunghe alla stessa altezza, parallele al vento del livello.
 *
 * Render: UNA BillboardCollection per motore (un draw call). Il terreno
 * occlude da solo gli sprite dietro i rilievi. Tick in scene.preRender con
 * oggetti scratch riusati: zero allocazioni per frame.
 */

import { heightAt, speedColor, dayOfYear, sunPosition, type LivePoint, type WindField } from "./winds";
import { dartSprite, streakSprite } from "./sprites";
import {
  buildLaneField,
  laneAt,
  BREEZE_BLUE,
  WAVE_MS,
  ROW_SPACING,
  ROW_TRAIL_NODES,
  ROW_TRAIL_SEG,
  FADE_IN_M,
  FADE_OUT_M,
  rowSlotCount,
  effectiveRowSpacing,
  smooth01,
  type Lane,
  type LaneSample,
} from "./lanes";

type CesiumNs = typeof import("cesium");
type ViewerNs = import("cesium").Viewer;
type Billboard = import("cesium").Billboard;

const RAD = Math.PI / 180;

export interface WindFlowHandle {
  destroy(): void;
  count?: number;
}

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

const finite = (p: import("cesium").Cartesian3): boolean =>
  Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

/* popolazione adattiva (hardware debole = meno fronti)
   v17: il budget NON taglia più le perle una a una: allarga il passo dei
   FRONTI (effectiveRowSpacing) — il pettine resta allineato a qualunque budget */
const particleBudget = (k: number): number => {
  let np = k >= 8 ? 640 : k >= 4 ? 460 : 280;
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
    lanes: 0,
    flat: false,
    total: 0,
    level: 0,
  };
}

/* degrado adattivo: EMA del frame time con isteresi (floorN = min nodi scia) */
const makeDegrade = (nodes: number, np: number, floorN = 4) => {
  let dtEma = 16.7;
  let lowSince = 0;
  let goodSince = 0;
  let level = 0;
  return {
    get level(): number {
      return level;
    },
    get nodes(): number {
      return level === 0 ? nodes : level === 1 ? Math.max(floorN, Math.round(nodes * 0.7)) : Math.max(Math.max(1, floorN - 2), Math.round(nodes * 0.5));
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
   MOTORE 1 — BREZZE DI PENDIO su CORSIE (superficie, TUTTO BLU)
   ================================================================ */

interface RowDart {
  head: Billboard;
  segs: Billboard[];
}

export function buildWindFlow(
  Cesium: CesiumNs,
  viewer: ViewerNs,
  field: WindField,
  live: LivePoint[] | null,
  hour: number,
  fallback: { ws: number; wd: number; rad?: number | null; cloud?: number | null } = { ws: 7, wd: 270 },
  doy?: number,
): WindFlowHandle {
  const budget = particleBudget(typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4);
  const sun = sunPosition(doy ?? dayOfYear(null), hour, field.lat0);

  /* ---------- CORSIE (matematica pura, un colpo solo: ~10-40 ms) ---------- */
  const lf = buildLaneField(field, {
    hour,
    doy: doy ?? dayOfYear(null),
    live,
    fallback,
    budget,
  });
  const lanes = lf.lanes;
  /* v17: il flusso SALE SEMPRE (anabatica) — niente inversione notturna.
     Il «vanno indietro» del video pilota era il drenaggio catabatico:
     perle che scendevano con frecce e teste-scia puntate in salita. */

  /* ---------- PITTURA DELLE CORSIE (billboard: l'unico primitivo che in
     questa scena si vede SEMPRE a ogni zoom — le polilinee qui stanno sotto
     il mesh renderizzato alle viste radenti) ----------
     Un trattino fisso ogni 360 m lungo ogni corsia, piccolo e discreto
     (alpha 0.32): la corsia esiste come linea intera anche dove in questo
     istante non passa una cometa. Position/colore/scala FISSI (zero write a
     frame); la rotazione segue il heading solo quando la camera ruota. */
  const paintBbs: Billboard[] = [];
  const paintAz: number[] = [];
  let paintHeading = Number.NaN;
  const repaint = (heading: number): void => {
    for (let i = 0; i < paintBbs.length; i++) paintBbs[i].rotation = heading - paintAz[i] + Math.PI / 2;
    paintHeading = heading;
  };

  /* ---------- collezione unica di sprite (un draw call) ---------- */
  const bc = new Cesium.BillboardCollection();
  viewer.scene.primitives.add(bc);

  const fadeByDist = new Cesium.NearFarScalar(34000, 1, 44000, 0.0); // sfuma solo davvero lontano
  const ddc = new Cesium.DistanceDisplayCondition(0, 44000);
  /* FIX «ingrandendo spariscono del tutto»: sotto ~1,6 km di distanza gli
     sprite IGNORANO il depth-test — a max zoom il mesh fine (più dettagliato
     del DEM a 160 m su cui poggiano le corsie) li seppelliva e sparivano.
     Oltre 1,6 km l'occlusione del terreno resta (v17.1: raggio ridotto da
     2800 — oltre il versante dietro trapelava attraverso la cresta). */
  const NEAR_NO_DEPTH = 1600;

  const blue = baseCol(Cesium, BREEZE_BLUE); // UN SOLO COLORE per tutta la brezza

  /* ---------- SLOT-FRECCE dei FRONTI (v17 «plotone a pettine») ----------
     Per ogni corsia creo rowSlotCount(len, SP) frecce (testa + scia corta).
     Il fronte k usa lo slot k mod K: due fronti con la stessa slot non
     coesistono mai sulla stessa corsia (K·SP > len). Il passo SP è UNICO
     per tutte le corsie (effectiveRowSpacing): i fronti restano ALLINEATI
     a pettine su tutto il rilievo a qualunque budget hardware. */
  const Ltot = lanes.reduce((a, l) => a + l.len, 0);
  const SP = effectiveRowSpacing(Ltot, lanes.length, budget);
  const laneOff: number[] = [];
  const laneK: number[] = [];
  const views: RowDart[] = [];
  try {
    for (const lane of lanes) {
      const K = rowSlotCount(lane.len, SP);
      laneOff.push(views.length);
      laneK.push(K);
      for (let s = 0; s < K; s++) {
        const head = bc.add({
          position: Cesium.Cartesian3.ZERO,
          image: imgUrl(dartSprite(BREEZE_BLUE)),
          /* testa CORPOSA ma con tetto alla vista ravvicinata (v17.1):
             0.6 di base, cresce leggermente avvicinandosi e si BLOCCA a 1.05
             sotto i 900 m — il plotone non diventa mai un muro di frecce */
          scale: 0.6,
          scaleByDistance: new Cesium.NearFarScalar(900, 1.05, 30000, 0.55),
          translucencyByDistance: fadeByDist,
          distanceDisplayCondition: ddc,
          disableDepthTestDistance: NEAR_NO_DEPTH,
          show: false,
        });
        const segs: Billboard[] = [];
        for (let j = 0; j < ROW_TRAIL_NODES; j++) {
          segs.push(
            bc.add({
              position: Cesium.Cartesian3.ZERO,
              image: imgUrl(streakSprite(BREEZE_BLUE)),
              /* scia CORTA e corposa (taper 1.05 → 0.5 su 5 nodi): si
                 legge il senso di marcia senza diventare un «verme» */
              scale: 1.05 - (0.55 * j) / (ROW_TRAIL_NODES - 1),
              scaleByDistance: new Cesium.NearFarScalar(900, 1.25, 30000, 0.5),
              translucencyByDistance: fadeByDist,
              distanceDisplayCondition: ddc,
              disableDepthTestDistance: NEAR_NO_DEPTH,
              show: false,
            }),
          );
        }
        views.push({ head, segs });
      }
    }

    /* trattini di pittura delle corsie: ogni 8 nodi (480 m) — le perle sono
       più fitte (v16), il tratteggio resta un ACCENTO discreto della corsia */
    const paintCol = Cesium.Color.fromCssColorString(BREEZE_BLUE).withAlpha(0.45);
    for (const lane of lanes) {
      for (let i = 0; i < lane.n; i += 8) {
        paintBbs.push(
          bc.add({
            position: Cesium.Cartesian3.fromDegrees(lane.lo[i], lane.la[i], lane.h[i]),
            image: imgUrl(streakSprite(BREEZE_BLUE)),
            scale: 1.0,
            scaleByDistance: new Cesium.NearFarScalar(500, 1.15, 30000, 0.4),
            translucencyByDistance: fadeByDist,
            distanceDisplayCondition: ddc,
            disableDepthTestDistance: NEAR_NO_DEPTH,
            color: paintCol,
          }),
        );
        paintAz.push(lane.az[i]);
      }
    }
    try {
      repaint(viewer.camera.heading);
    } catch {
      /* heading non pronto: lo farà il primo tick */
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

  setInst({
    darts: views.length,
    chevrons: 0,
    eddies: 0,
    rotors: 0,
    lanes: lanes.length,
    flat: lf.flat,
    total: bc.length,
    sp: Math.round(SP),
    sun: { az: Math.round(sun.az), alt: Math.round(sun.alt) },
  });

  /* ---------- scratch objects: zero allocazioni per frame ---------- */
  const scPos = new Cesium.Cartesian3();
  const scCol = new Cesium.Color();
  const sHead: LaneSample = { la: 0, lo: 0, h: 0, az: 0, aK: 0 };
  const sTrail: LaneSample = { la: 0, lo: 0, h: 0, az: 0, aK: 0 };
  const degrade = makeDegrade(ROW_TRAIL_NODES, views.length, 2);

  /* ---------- OROLOGIO DI MARCIA GLOBALE (v17 «plotone») ----------
     m avanza SEMPRE (mai wrappato): il fronte k sta sull'arco m − k·SP su
     OGNI corsia → righe di frecce affiancate, perpendicolari alla salita,
     che salgono in modo sincronizzato. M0 pre-avanza l'orologio così il
     pettine è PIENO già al primo frame (niente flusso che «si accende»). */
  const M0 = Math.ceil((lf.maxLen + 1) / SP) * SP;
  let tA = 0; // orologio del flusso: pausa = flusso fermo, mai salti al ritorno

  let last = performance.now();
  let hiddenFrames = 0;
  const tick = (): void => {
    if (viewer.isDestroyed()) return;
    const now = performance.now();
    const dtMs = clamp(now - last, 0.001, 120);
    const dt = dtMs / 1000;
    last = now;
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
    /* la pittura segue il heading SOLO quando cambia (0 write nei frame di moto puro) */
    if (Number.isNaN(paintHeading) || Math.abs(heading - paintHeading) > 0.0005) repaint(heading);

    degrade.step(now, dtMs);
    const nodes = degrade.nodes;
    if (hiddenFrames > 0) {
      hiddenFrames -= 1;
      return;
    }
    tA += dt;
    const m = M0 + WAVE_MS * tA;

    /* degrado = FRONTE SÌ FRONTE NO (k mod skip): le rime che restano
       restano ALLINEATE — il pettine si dirada, non si sfasa mai */
    const skip = degrade.level + 1;

    const hideV = (v: RowDart): void => {
      if (v.head.show || v.segs[0].show) {
        v.head.show = false;
        for (let s = 0; s < v.segs.length; s++) v.segs[s].show = false;
      }
    };

    for (let li = 0; li < lanes.length; li++) {
      const lane: Lane = lanes[li];
      const len = lane.len;
      const K = laneK[li];
      const off = laneOff[li];
      /* fronti visibili su questa corsia: 0 ≤ m − k·SP ≤ len — nascono al
         fondo valle (fade-in) e sfumano alla cresta (fade-out): flusso
         CONTINUO, un fronte entra ogni SP/WAVE_MS ≈ 2,3 s */
      const k0 = Math.max(0, Math.ceil((m - len) / SP - 1e-9));
      const k1 = Math.floor(m / SP + 1e-9);
      for (let k = k0; k <= k1; k++) {
        const v = views[off + (k % K)];
        if (skip > 1 && k % skip !== 0) {
          hideV(v);
          continue;
        }
        const a = m - k * SP; // arco del fronte k su questa corsia (0..len)
        const fadeIn = smooth01(a / FADE_IN_M);
        const fadeOut = smooth01((len - a) / FADE_OUT_M);
        const alpha0 = 0.95 * fadeIn * fadeOut;
        if (alpha0 < 0.02) {
          hideV(v);
          continue;
        }

        /* --- TESTINA: sulla corsia, punta in SALITA (senso di marcia) --- */
        laneAt(lane, a, sHead);
        const ph = Cesium.Cartesian3.fromDegrees(sHead.lo, sHead.la, sHead.h + 6, undefined, scPos);
        let shown = false;
        if (finite(ph)) {
          v.head.show = true;
          v.head.position = scPos;
          v.head.rotation = heading - sHead.az;
          Cesium.Color.clone(Cesium.Color.WHITE, scCol);
          scCol.alpha = clamp(alpha0 * (0.72 + 0.28 * sHead.aK), 0, 1);
          v.head.color = scCol;
          shown = true;
        } else v.head.show = false;

        /* --- SCIA CORTA a valle della testa (dietro il moto): esattamente
           SULLA CORSIA — stessa curva, non può staccarsi né incrociare la
           corsia vicina --- */
        for (let j = 0; j < nodes; j++) {
          const bb = v.segs[j];
          const arcT = a - (j + 1) * ROW_TRAIL_SEG;
          if (!shown || arcT < 0 || arcT > len) {
            if (bb.show) bb.show = false;
            continue;
          }
          laneAt(lane, arcT, sTrail);
          const pm = Cesium.Cartesian3.fromDegrees(sTrail.lo, sTrail.la, sTrail.h, undefined, scPos);
          if (!finite(pm)) {
            bb.show = false;
            continue;
          }
          bb.show = true;
          bb.position = pm;
          bb.rotation = heading - sTrail.az + Math.PI / 2;
          Cesium.Color.clone(blue, scCol);
          scCol.alpha = clamp(alpha0 * sTrail.aK * (0.8 * Math.pow(1 - j / nodes, 0.8) + 0.2), 0, 1);
          if (scCol.alpha < 0.02) bb.show = false;
          else bb.color = scCol;
        }
      }
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
  segs: Billboard[]; // segmenti di scia
  head: Billboard; // testina-freccia
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

/* avanza la scia dell'anello */
const pushNode = (p: Particle, nodes: number, la: number, lo: number, h: number): void => {
  p.tIdx = (p.tIdx + 1) % nodes;
  p.tLa[p.tIdx] = la;
  p.tLo[p.tIdx] = lo;
  p.tH[p.tIdx] = h;
};

export function buildAltitudeFlow(Cesium: CesiumNs, viewer: ViewerNs, opts: AltitudeFlowOpts): WindFlowHandle {
  const extent = opts.extent ?? 8400;
  const lvl = opts.lvl;
  const dirTo = (((opts.wd + 180) % 360) + 360) % 360; // dove SPINGE
  const dE = Math.sin(dirTo * RAD);
  const dN = Math.cos(dirTo * RAD);
  const azTo = dirTo * RAD;
  const color = opts.colorCss ?? speedColor(opts.ws);
  /* anche i venti meteo in quota scorrono come ONDA UNICA: banda stretta
     340-460 m/s. Direzione e intensità si leggono da orientamento e colore. */
  const visMs = Math.min(460, Math.max(340, 315 + 4.5 * opts.ws));
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

    /* degrado morbido: fascia di dissolvenza oltre il cap */
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
