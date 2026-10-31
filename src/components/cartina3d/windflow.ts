/**
 * FLUSSO VENTO SUOLO — PARTICELLE IN MOVIMENTO STILE WINDY (richiesta pilota).
 *
 * Niente più frecce statiche sulla griglia: CENTINAIA DI PARTICELLE d'aria che
 * CORRONO davvero sul terreno, ognuna con una SCIA che sfuma alle spalle —
 * le «linee di flusso» vive che si vedono su Windy.com. Ogni particella:
 *  - segue il campo vento FUSO: vento meteo + brezza di pendio (anabatica di
 *    giorno che sale i versanti, catabatica di notte che scende);
 *  - forma la «CASCATA»: accelera quando il flusso risale la pendenza e si
 *    addensa sui versanti esposti (le rinascite sono biasimate sui pendii
 *    ripidi, così i rilievi restano sempre pieni di movimento);
 *  - dietro le creste, dove il meteo scavalca e l'aria affonda, viene
 *    CATTURATA dai ROTORI: orbita in un vortice prima di fuggire — accanto
 *    restano i simboli rossi ad arco che girano su se stessi;
 *  - muore oltre il bordo del campo o a fine vita e RINASCE altrove: il
 *    flusso non si ferma mai.
 *
 * Render: UNA BillboardCollection (un solo draw call, ≈3.000 sprite):
 *  - 1 testina-freccia per particella (dartSprite, orientata al Nord reale);
 *  - 9 segmenti di scia a capsula luminosa (streakSprite) che sfumano di età;
 *  - i rotori rossi ad arco nei vortici di sottovento.
 * Gli sprite sono primitive 3D: il terreno li OCCLUDE da solo (dietro un
 * monte spariscono), come prima. Tick in scene.preRender con oggetti scratch:
 * nessuna allocazione per frame, il garbage collector resta tranquillo.
 */

import { breezeColor, heightAt, type LivePoint, type WindField } from "./winds";
import { dartSprite, rotorSprite, streakSprite } from "./sprites";

type CesiumNs = typeof import("cesium");
type ViewerNs = import("cesium").Viewer;
type Billboard = import("cesium").Billboard;

const RAD = Math.PI / 180;

export interface WindFlowHandle {
  destroy(): void;
}

/* ---------- taratura del flusso ---------- */
const NODES = 14; // nodi di scia per particella (= segmenti disegnati)
                  // (suggerimento agente @ai: scie più lunghe, più Windy)
const SEG_LEN = 88; // m tra un nodo e il successivo della scia
const VIS_MULT = 4.0; // velocità visiva × vento reale: veloce come chiesto dal
                      // pilota ma con percezione calma/forte (tuning @gemini-cli
                      // nella issue #35: era ×6.5, troppo uniforme)
const LIFT = 16; // m di volo delle scie sopra il DEM
const LIFT_HEAD = 30; // m della testina
const EDDY_R = 260; // raggio di cattura del rotore (m)
const EDDY_MAX = 14; // numero massimo di rotori
const SLOPE_BIAS = 0.55; // quota di rinascite sui versanti ripidi

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
  tH: Float64Array; // anello quote DEM dei nodi di scia
  tIdx: number; // indice del nodo PIÙ RECENTE nell'anello
  segs: Billboard[]; // segmenti di scia (NODES)
  head: Billboard; // testina-freccia
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

  /* ---------- vento live interpolato sulla griglia 3×3 (bilineare) ----------
     u ∈ [0,1] da Ovest a Est, v ∈ [0,1] da Nord a Sud. */
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

  /* ---------- CAMPO DI FLUSSO in un punto (richiamato a ogni frame) ----------
     Ritorna la direzione UNITARIA dove va l'aria (dE, dN), l'intensità in
     km/h e `up` (quanto il flusso risale la pendenza: +1 = contro pendio). */
  const flowAt = (
    la: number,
    lo: number,
  ): { dE: number; dN: number; sp: number; up: number } => {
    const xN = (la - field.lat0) * mLat; // + = verso Nord
    const xE = (lo - field.lon0) * mLon;
    const fi = (field.rows - 1) / 2 - xN / field.step;
    const fj = xE / field.step + (field.cols - 1) / 2;
    const gE = gridBil(field.gE, fi, fj);
    const gN = gridBil(field.gN, fi, fj);
    const s = Math.max(0, gridBil(field.S, fi, fj));
    const gl = Math.hypot(gE, gN);
    const uE = gl > 1e-6 ? gE / gl : 0; // unitario SU per il pendio
    const uN = gl > 1e-6 ? gN / gl : 0;

    const w = lw((xE + extE) / (2 * extE), (extN - xN) / (2 * extN));
    const fE = -Math.sin(w.wd * RAD); // dove VA il vento meteo
    const fN = -Math.cos(w.wd * RAD);

    /* brezza di versante lungo la massima pendenza */
    const slopeK = Math.min(1, s / 0.45);
    const thermK = anabatic ? 4 + 10 * slopeK : -(3 + 8 * slopeK);
    const thermScale = s > 0.06 ? 1 : 0.15;
    let tE = fE * w.ws + uE * thermK * thermScale;
    let tN = fN * w.ws + uN * thermK * thermScale;
    let sp = Math.hypot(tE, tN);
    if (sp < 2.2) {
      const wsMin = Math.max(w.ws, 2.2);
      tE = fE * wsMin;
      tN = fN * wsMin;
      sp = wsMin;
    }
    const dE = tE / sp;
    const dN = tN / sp;
    return { dE, dN, sp, up: dE * uE + dN * uN };
  };

  /* ---------- ROTORI DI SOTTOVENTO: centri dei vortici dietro le creste ---------- */
  const eddies: { la: number; lo: number }[] = [];
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
      if (far) eddies.push({ la, lo });
    }
  }

  /* ---------- punti di rinascita sui VERSANTI RIPIDI (cascata fitta) ---------- */
  const spawnSteep: { la: number; lo: number }[] = [];
  for (let i = 1; i < field.rows - 1; i += 2) {
    for (let j = 1; j < field.cols - 1; j += 2) {
      if (field.S[i][j] > 0.075) {
        spawnSteep.push({
          la: field.lat0 + (((field.rows - 1) / 2 - i) * field.step) / mLat,
          lo: field.lon0 + ((j - (field.cols - 1) / 2) * field.step) / mLon,
        });
      }
    }
  }

  /* ---------- popolazione adattiva (hardware debole = meno particelle) ---------- */
  const cpu = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  let NP = cpu >= 8 ? 320 : cpu >= 4 ? 240 : 150;
  if (typeof window !== "undefined") {
    const shortSide = Math.min(window.screen?.width ?? 1280, window.screen?.height ?? 800);
    if (shortSide < 640) NP = Math.round(NP * 0.7);
  }

  const finite = (p: import("cesium").Cartesian3): boolean =>
    Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

  /* ---------- collezione unica di sprite (un draw call) ---------- */
  const bc = new Cesium.BillboardCollection();
  viewer.scene.primitives.add(bc);

  const fadeOf = (key: string, i: number): number =>
    0.9 * Math.pow(1 - i / NODES, 1.25) + 0.05;

  const scaleByDist = new Cesium.NearFarScalar(900, 1, 26000, 0.4);
  const fadeByDist = new Cesium.NearFarScalar(22000, 1, 30000, 0.0);
  const ddc = new Cesium.DistanceDisplayCondition(0, 30000);

  const particles: Particle[] = [];
  const rotors: RotorMover[] = [];

  const respawn = (p: Particle, first: boolean): void => {
    let la: number;
    let lo: number;
    if (spawnSteep.length > 0 && Math.random() < SLOPE_BIAS) {
      const c = spawnSteep[(Math.random() * spawnSteep.length) | 0];
      la = clamp(c.la + (((Math.random() * 2 - 1) * 150) / mLat), field.lat0 - extN / mLat + 1e-6, field.lat0 + extN / mLat - 1e-6);
      lo = clamp(c.lo + (((Math.random() * 2 - 1) * 150) / mLon), field.lon0 - extE / mLon + 1e-6, field.lon0 + extE / mLon - 1e-6);
    } else {
      la = field.lat0 + ((Math.random() * 2 - 1) * 0.98 * extN) / mLat;
      lo = field.lon0 + ((Math.random() * 2 - 1) * 0.98 * extE) / mLon;
    }
    p.la = la;
    p.lo = lo;
    p.age = 0;
    p.life = 4.5 + 6 * Math.random();
    p.distAcc = 0;
    p.tIdx = 0;
    const f = flowAt(la, lo);
    p.azTo = Math.atan2(f.dE, f.dN);
    p.colKey = breezeColor(f.sp);
    if (first) p.age = Math.random() * p.life; // popolazione subito distribuita

    /* SCIA GIÀ SVILUPPATA alla nascita (stile Windy): risalgo il flusso a
       ritroso di NODES passi da SEG_LEN metri, così ogni particella nasce con
       la linea di flusso completa invece che crescere dal punto.
       Ordine dell'anello: tIdx (0) = nodo più recente, indietro di n → slot
       (0 − n + NODES) % NODES, la stessa regola che usa il render. */
    let sLa = la;
    let sLo = lo;
    for (let n = 0; n < NODES; n++) {
      const slot = (NODES - n) % NODES; // (0 − n) mod NODES
      p.tLa[slot] = sLa;
      p.tLo[slot] = sLo;
      p.tH[slot] = heightAt(field, sLa, sLo) + LIFT;
      const fs = flowAt(sLa, sLo);
      sLa = clamp(sLa - (fs.dN * SEG_LEN) / mLat, field.lat0 - extN / mLat + 1e-6, field.lat0 + extN / mLat - 1e-6);
      sLo = clamp(sLo - (fs.dE * SEG_LEN) / mLon, field.lon0 - extE / mLon + 1e-6, field.lon0 + extE / mLon - 1e-6);
    }
  };

  try {
    for (let k = 0; k < NP; k++) {
      const tLa = new Float64Array(NODES);
      const tLo = new Float64Array(NODES);
      const tH = new Float64Array(NODES);
      const p: Particle = {
        la: 0,
        lo: 0,
        age: 0,
        life: 6,
        distAcc: 0,
        colKey: "#5cb9fb",
        azTo: 0,
        tLa,
        tLo,
        tH,
        tIdx: 0,
        segs: [],
        head: bc.add({
          position: Cesium.Cartesian3.ZERO,
          image: dartSprite("#5cb9fb"),
          scale: 0.28,
          scaleByDistance: new Cesium.NearFarScalar(1400, 1, 26000, 0.5),
          translucencyByDistance: fadeByDist,
          distanceDisplayCondition: ddc,
        }),
      };
      for (let s = 0; s < NODES; s++) {
        p.segs.push(
          bc.add({
            position: Cesium.Cartesian3.ZERO,
            image: streakSprite("#5cb9fb"),
            scale: 1,
            scaleByDistance: scaleByDist,
            translucencyByDistance: fadeByDist,
            distanceDisplayCondition: ddc,
            show: false,
          }),
        );
      }
      respawn(p, true);
      particles.push(p);
    }

    /* ROTORI: i simboli rossi ad arco che girano su se stessi */
    for (let e = 0; e < eddies.length; e++) {
      for (let b = 0; b < 2; b++) {
        const hb = hash01(e * 31 + b * 7);
        const bb = bc.add({
          position: Cesium.Cartesian3.fromDegrees(eddies[e].lo, eddies[e].la, 34 + 38 * b + 12 * hb),
          image: rotorSprite("#ff4d5e"),
          scale: b === 0 ? 0.78 + 0.15 * hb : 0.55 + 0.12 * hb,
          scaleByDistance: new Cesium.NearFarScalar(1600, 1, 26000, 0.5),
          translucencyByDistance: fadeByDist,
          distanceDisplayCondition: ddc,
        });
        rotors.push({
          la: eddies[e].la,
          lo: eddies[e].lo,
          lift: 34 + 38 * b + 12 * hb,
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

  /* colori base in cache (uno Cesium.Color per chiave) */
  const baseColCache = new Map<string, import("cesium").Color>();
  const baseCol = (key: string): import("cesium").Color => {
    let c = baseColCache.get(key);
    if (!c) {
      c = Cesium.Color.fromCssColorString(key);
      baseColCache.set(key, c);
    }
    return c;
  };

  /* dataURL in cache per i cambi di colore a caldo (Billboard.image accetta
     solo stringhe nel tipo): una conversione per sprite, mai più. */
  const imgUrlCache = new WeakMap<HTMLCanvasElement, string>();
  const imgUrl = (c: HTMLCanvasElement): string => {
    let u = imgUrlCache.get(c);
    if (!u) {
      u = c.toDataURL();
      imgUrlCache.set(c, u);
    }
    return u;
  };

  /* strumentazione per i test di verifica */
  (window as unknown as Record<string, unknown>).__c3dWindFlow = {
    darts: NP,
    chevrons: 0, // i venti meteo non stanno sul suolo: solo su clic della quota
    eddies: eddies.length,
    rotors: rotors.length,
    total: bc.length,
  };

  /* ---------- scratch objects: zero allocazioni per frame ---------- */
  const scPos = new Cesium.Cartesian3();
  const scCol = new Cesium.Color();

  let last = performance.now();
  const tick = (): void => {
    if (viewer.isDestroyed()) return;
    const now = performance.now();
    const dt = clamp((now - last) / 1000, 0.001, 0.1);
    last = now;
    const t = now / 1000;
    let heading = 0;
    try {
      heading = viewer.camera.heading;
    } catch {
      return;
    }

    for (let k = 0; k < particles.length; k++) {
      const p = particles[k];
      p.age += dt;
      if (p.age > p.life) respawn(p, false);

      /* --- fisica: campo fuso + eventuale cattura del rotore --- */
      const f = flowAt(p.la, p.lo);
      let vE = (f.dE * f.sp) / 3.6; // m/s reali
      let vN = (f.dN * f.sp) / 3.6;
      let inEd = -1;
      for (let e = 0; e < eddies.length; e++) {
        const c = eddies[e];
        const dx = (p.lo - c.lo) * mLon;
        const dy = (p.la - c.la) * mLat;
        const d = Math.hypot(dx, dy);
        if (d < EDDY_R) {
          inEd = e;
          const w = 1 - d / EDDY_R; // peso: pieno al centro, niente al bordo
          const inv = d > 1e-3 ? 1 / d : 0;
          const tx = -dy * inv; // tangente antioraria (vista dall'alto)
          const ty = dx * inv;
          const vt = Math.min(16, 3.5 + 0.085 * d); // m/s tangenziali
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

      /* CASCATA: accelera quando il flusso risale il pendio */
      const cascade = inEd >= 0 ? 1 : clamp(1 + 0.55 * f.up, 0.72, 1.6);
      const visSpeed = clamp((f.sp / 3.6) * VIS_MULT * cascade, 14, 90); // m/s visivi
      const mStep = visSpeed * dt;

      /* --- avanza e registra la scia --- */
      p.la += (dirN * mStep) / mLat;
      p.lo += (dirE * mStep) / mLon;
      p.distAcc += mStep;
      const xN = (p.la - field.lat0) * mLat;
      const xE = (p.lo - field.lon0) * mLon;
      if (Math.abs(xN) > extN || Math.abs(xE) > extE) {
        respawn(p, false);
        continue;
      }

      const hHead = heightAt(field, p.la, p.lo);
      if (p.distAcc >= SEG_LEN) {
        p.distAcc = 0;
        p.tIdx = (p.tIdx + 1) % NODES;
        p.tLa[p.tIdx] = p.la;
        p.tLo[p.tIdx] = p.lo;
        p.tH[p.tIdx] = hHead + LIFT;
      }

      /* --- colore: la famiglia blu si abbassa con la velocità --- */
      const nk = breezeColor(f.sp);
      if (nk !== p.colKey) {
        p.colKey = nk;
        const simg = imgUrl(streakSprite(nk));
        for (let s = 0; s < NODES; s++) p.segs[s].image = simg;
        p.head.image = imgUrl(dartSprite(nk));
      }

      /* --- testina --- */
      const ph = Cesium.Cartesian3.fromDegrees(p.lo, p.la, hHead + LIFT_HEAD, undefined, scPos);
      if (finite(ph)) {
        p.head.show = true;
        p.head.position = scPos;
        p.head.rotation = heading - p.azTo;
        p.head.scale = 0.26 + 0.05 * Math.sin(t * 2.1 + p.life * 7.3);
      } else {
        p.head.show = false;
      }

      /* --- scia: NODES segmenti che sfumano di età ---
         L'ALFA cresce anche con la velocità (suggerimento @ai): le scie
         delle raffiche brillano, quelle debole restano sottili. */
      const speedK = clamp(f.sp / 28, 0, 1);
      let nLa = p.la; // estremo «nuovo» del segmento (parte dalla testina)
      let nLo = p.lo;
      let nH = hHead + LIFT;
      for (let i = 0; i < NODES; i++) {
        const idx = (p.tIdx - i + NODES) % NODES;
        const oLa = p.tLa[idx];
        const oLo = p.tLo[idx];
        const oH = p.tH[idx];
        const dLa = (oLa - nLa) * mLat;
        const dLo = (oLo - nLo) * mLon;
        const len = Math.hypot(dLa, dLo);
        const bb = p.segs[i];
        if (len < 12 || len > SEG_LEN * 2.2 || !Number.isFinite(len)) {
          bb.show = false;
        } else {
          bb.show = true;
          const az = Math.atan2(dLo, dLa);
          bb.rotation = heading - az + Math.PI / 2;
          const mid = Cesium.Cartesian3.fromDegrees(
            (nLo + oLo) / 2,
            (nLa + oLa) / 2,
            (nH + oH) / 2,
            undefined,
            scPos,
          );
          if (finite(mid)) bb.position = scPos;
          Cesium.Color.clone(baseCol(p.colKey), scCol);
          scCol.alpha = clamp(fadeOf(p.colKey, i) * (0.7 + 0.4 * speedK), 0, 1);
          bb.color = scCol;
        }
        nLa = oLa;
        nLo = oLo;
        nH = oH;
      }
    }

    /* --- rotori: girano su se stessi e respirano --- */
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
          viewer.scene.primitives.remove(bc); // rimuove e distrugge la collection
        }
      } catch {
        /* il viewer era già distrutto */
      }
    },
  };
}
