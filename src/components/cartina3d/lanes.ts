/**
 * CORSIE DI BREZZA — la struttura logica del flusso di pendio (richiesta
 * pilota dopo il respingo di v13/v14: «è un pasticcio di freccette che si
 * inculano altre ... devi dare un senso logico»).
 *
 * FISICA (termodinamica/aerologia dei pendii — Prandtl 1942 «Der Abwind
 * aerodynamisch belasteter Flügel» per lo strato di versante, Stull «An
 * Introduction to Boundary Layer Meteorology» cap. 14, Whiteman «Mountain
 * Meteorology» per le brezze di versante e di valle):
 *   - di giorno il versante al sole scalda l'aria a contatto: la spinta di
 *     galleggiamento projetta questa aria VERSO L'ALTO lungo la LINEA DI
 *     MASSIMA PENDENZA (brezza anabatica). Il flusso è stratificato e
 *     aderente al pendio: corsie parallele che «pettinano» il versante,
 *     dal fondo valle fino alla cresta, dove l'aria CONVERGE e si stacca
 *     in verticale (è lì che nascono le termiche);
 *   - di notte l'aria raffreddata, densa, DRENA a valle lungo le stesse
 *     linee (brezza catabatica): stesse corsie, verso opposto.
 *
 * GEOMETRIA ANTI-INCROCIO (il punto chiave di v15):
 *   1. le corsie sono INTEGRALI del campo gradiente del DEM fine (160 m):
 *      gli integrali di un campo vettoriale liscio NON si incrociano mai
 *      (unicità delle soluzioni dell'ODE — due streamline possono solo
 *      convergere asintoticamente, mai tagliarsi);
 *   2. una MASCHERA DI OCCUPAZIONE (celle LANE_SEP) vieta a due corsie di
 *      passare nella stessa cella: separazione minima garantita PER
 *      COSTRUZIONE, non per fortuna;
 *   3. le particelle viaggiano INCOLLATE alla propria corsia (interpolazione
 *      d'arco sulla polilinea) e TUTTE alla stessa velocità: perle di una
 *      collana che non possono né scontrarsi né sorpassarsi.
 *
 * Questo modulo è MATEMATICA PURA (nessun Cesium): testabile in Node con
 * scripts/verify-lane-flow.ts.
 */

import {
  blendFlow,
  heightAt,
  heightAt2,
  sunPosition,
  type LivePoint,
  type WindField,
} from "./winds";

/* ---------- taratura (costanti pubbliche: il renderer e i test le leggono) ---------- */

export const LANE_SEP = 470; // m — cella della maschera = distanza minima tra corsie
export const BEAD_SPACING = 350; // m — distanza tra le «perle» sulla corsia
export const BEAD_SPACING_MIN = 260; // m — mai più fitti di così (anti-mucchio)
export const LANE_MIN_LEN = 560; // m — le corsie più corte si buttano
export const SLOPE_MIN = 0.06; // pendenza minima (m/m) per una corsia di brezza
export const SLOPE_END = 0.05; // sotto questa pendenza: cresta (fine salita) o fondo valle
export const DS = 60; // m — passo d'integrazione (arco UNIFORME → lookup O(1))
export const CRUISE_LIFT = 18; // m di volo delle corsie/scie SOPRA il terreno DEM
export const MAX_STEPS = 90; // ≈ 5,4 km: la corsia è un VERSANTE, non un'autostrada da 9 km
export const H_GAIN_MAX = 900; // m di dislivello massimo: superato → la corsia ha fatto il suo lavoro
export const PRE_STEPS = 70; // discesa a valle per far NASCERE la corsia dal basso
export const RIDGE_DRIFT = 0.16; // deriva di combing lungo il costone (peso sul gradiente)
export const BREEZE_BLUE = "#57b2f8"; // UN SOLO COLORE per TUTTA la brezza
export const WAVE_MS = 310; // m/s — l'ONDA UNICA: tutte le perfe della stessa corsa
export const EXIT_ZONE = 640; // m — zona di stacco in cresta (fine ciclo della perla)
export const LIFT_H = 150; // m di risalita verticale nello stacco (l'aria nutre le termiche)
export const TRAIL_NODES = 16; // nodi di scia per perla
export const TRAIL_SEG = 30; // m tra i nodi → scia ≈ 480 m, curva morbida sulla corsia

/* ---------- tipi ---------- */

/** Una corsia: polilinea a passo d'arco UNIFORME DS dal fondo valle (nodo 0)
    alla cresta (nodo n-1). h comprende già il volo sopra il terreno. */
export interface Lane {
  n: number;
  la: Float64Array;
  lo: Float64Array;
  h: Float64Array; // quota di volo (terreno + LIFT) — nel renderer si aggiunge solo lo stacco
  az: Float64Array; // azimut del moto (rad da Nord, orario) — dove VA l'aria
  aK: Float32Array; // alpha per nodo (versante al sole, intensità) 0..1
  len: number; // metri (n-1)*DS
}

/** Una particella: incollata alla corsia `lane`, parte dall'arco s0. */
export interface Bead {
  lane: number; // indice nella lista lanes
  s0: number; // posizione d'arco iniziale (m)
}

export interface LaneField {
  lanes: Lane[];
  beads: Bead[];
  flat: boolean; // true = sito pianeggiante: corsie dritte del vento sinottico
  day: boolean; // true = anabatica (si sale le corsie), false = drenaggio notturno
}

export interface LaneOpts {
  hour: number;
  doy: number;
  live: LivePoint[] | null;
  fallback: { ws: number; wd: number; rad?: number | null; cloud?: number | null };
  /** budget particelle (hardware) — le perle si distanziano per rispettarlo */
  budget: number;
}

/* ---------- utilità ---------- */

const RAD = Math.PI / 180;
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const smooth01 = (x: number): number => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/* ================================================================
   GRADIENTE FINO — dal DEM H2 (160 m) con differenze centrate + un
   passaggio di smoothing 3×3 (il raster z14 è rumoroso: senza lisciare
   le corsie vibrerebbero a ogni cella).
   ================================================================ */

interface FineGrad {
  rows: number;
  cols: number;
  step: number;
  gE: Float32Array; // dh/dEst (m/m)
  gN: Float32Array; // dh/dNord (m/m)
  S: Float32Array; // |grad| (m/m)
}

const buildFineGrad = (f: WindField): FineGrad => {
  const { rows2: rows, cols2: cols, step2: step, H2 } = f;
  const gE = new Float32Array(rows * cols);
  const gN = new Float32Array(rows * cols);
  const S = new Float32Array(rows * cols);
  for (let i = 0; i < rows; i++) {
    const ip = Math.min(rows - 1, i + 1);
    const im = Math.max(0, i - 1);
    for (let j = 0; j < cols; j++) {
      const jp = Math.min(cols - 1, j + 1);
      const jm = Math.max(0, j - 1);
      const dx = (jp - jm) * step;
      const dy = (ip - im) * step; // i cresce verso sud → H2[im] è a nord
      const a = (H2[i][jp] - H2[i][jm]) / dx;
      const b = (H2[im][j] - H2[ip][j]) / dy;
      gE[i * cols + j] = a;
      gN[i * cols + j] = b;
      S[i * cols + j] = Math.hypot(a, b);
    }
  }
  /* smoothing 3×3 (box) su gradienti e pendenza: zero vibrazioni */
  const sm = (src: Float32Array): Float32Array => {
    const out = new Float32Array(rows * cols);
    for (let i = 0; i < rows; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(rows - 1, i + 1);
      for (let j = 0; j < cols; j++) {
        const j0 = Math.max(0, j - 1);
        const j1 = Math.min(cols - 1, j + 1);
        let acc = 0;
        let w = 0;
        for (let ii = i0; ii <= i1; ii++)
          for (let jj = j0; jj <= j1; jj++) {
            acc += src[ii * cols + jj];
            w += 1;
          }
        out[i * cols + j] = acc / w;
      }
    }
    return out;
  };
  return { rows, cols, step, gE: sm(gE), gN: sm(gN), S: sm(S) };
};

/* campione bilineare dal gradiente fine (fi/fj in indici di griglia) */
const bil = (g: FineGrad, arr: Float32Array, fi: number, fj: number): number => {
  const ci = clamp(Math.floor(fi - 0.5), 0, g.rows - 2);
  const cj = clamp(Math.floor(fj - 0.5), 0, g.cols - 2);
  const ti = clamp(fi - 0.5 - ci, 0, 1);
  const tj = clamp(fj - 0.5 - cj, 0, 1);
  const r = ci * g.cols + cj;
  return (
    arr[r] * (1 - ti) * (1 - tj) +
    arr[r + 1] * (1 - ti) * tj +
    arr[r + g.cols] * ti * (1 - tj) +
    arr[r + g.cols + 1] * ti * tj
  );
};

/* ================================================================
   COSTRUTTORE DELLE CORSIE
   ================================================================ */

export function buildLaneField(f: WindField, opts: LaneOpts): LaneField {
  const sun = sunPosition(opts.doy, opts.hour, f.lat0);
  const dayK = Math.pow(clamp((sun.alt + 2) / 34, 0, 1), 1.35);
  const nightK = 1 - clamp((sun.alt + 6) / 8, 0, 1);
  const isDay = dayK >= nightK;

  const mLat = f.mLat;
  const mLon = f.mLon;
  const extN = ((f.rows - 1) * f.step) / 2;
  const extE = ((f.cols - 1) * f.step) / 2;
  const inBounds = (la: number, lo: number): boolean => {
    const xN = (la - f.lat0) * mLat;
    const xE = (lo - f.lon0) * mLon;
    return Math.abs(xN) <= extN && Math.abs(xE) <= extE;
  };
  const raiseAt = (la: number, lo: number): number =>
    Math.max(heightAt2(f, la, lo), heightAt(f, la, lo));

  const G = buildFineGrad(f);
  /* fi/fj da lat/lon per la griglia fine */
  const fineIJ = (la: number, lo: number): { fi: number; fj: number } => ({
    fi: (G.rows - 1) / 2 - ((la - f.lat0) * mLat) / G.step,
    fj: ((lo - f.lon0) * mLon) / G.step + (G.cols - 1) / 2,
  });

  /* vento live interpolato (stessa 3×3 di windflow) — serve alla velocità km/h */
  const lw = (u: number, v: number): { ws: number; wd: number } => {
    const live = opts.live;
    if (!live || live.length !== 9) return { ws: opts.fallback.ws, wd: opts.fallback.wd };
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
      w00[k] * (1 - uc + u0) * (1 - vc + v0) +
      w10[k] * (uc - u0) * (1 - vc + v0) +
      w01[k] * (1 - uc + u0) * (vc - v0) +
      w11[k] * (uc - u0) * (vc - v0);
    return { ws: mix("ws"), wd: mix("wd") };
  };

  /* --- direzione di flusso lungo il pendio: gradiente + combing --- */
  const dirAt = (
    la: number,
    lo: number,
    uphill: boolean,
  ): { dE: number; dN: number; s: number; uE: number; uN: number } | null => {
    const { fi, fj } = fineIJ(la, lo);
    const gE = bil(G, G.gE, fi, fj);
    const gN = bil(G, G.gN, fi, fj);
    const s = Math.max(0, bil(G, G.S, fi, fj));
    const gl = Math.hypot(gE, gN);
    if (gl < 1e-5 || s < SLOPE_END) return null;
    const uE = gE / gl; // VERSO SU il pendio
    const uN = gN / gl;
    /* combing: tangente al contorno col segno della salita (campiono il DEM
       a ±240 m lungo la tangente) — segue gli sproni invece di fermarsi su
       ogni dossino locale; PESO PICCOLO: resta un campo quasi-gradiente */
    const tE = uN;
    const tN = -uE;
    const dLa = (240 * tN) / mLat;
    const dLo = (240 * tE) / mLon;
    const kSign = raiseAt(la + dLa, lo + dLo) >= raiseAt(la - dLa, lo - dLo) ? 1 : -1;
    let dE = uE + RIDGE_DRIFT * kSign * tE;
    let dN = uN + RIDGE_DRIFT * kSign * tN;
    const dl = Math.hypot(dE, dN) || 1;
    dE /= dl;
    dN /= dl;
    if (!uphill) {
      dE = -dE;
      dN = -dN;
    }
    return { dE, dN, s, uE, uN };
  };

  /* --- maschera di occupazione: 1 cella = 1 sola corsia (ANTI-INCROCIO) --- */
  const cell = LANE_SEP;
  const nMi = Math.ceil((2 * extN) / cell) + 2;
  const nMj = Math.ceil((2 * extE) / cell) + 2;
  const mask = new Int16Array(nMi * nMj).fill(-1);
  const maskIdx = (la: number, lo: number): number => {
    const xN = (la - f.lat0) * mLat + extN; // 0..2extN
    const xE = (lo - f.lon0) * mLon + extE;
    const mi = Math.floor(xN / cell) + 1;
    const mj = Math.floor(xE / cell) + 1;
    if (mi < 0 || mi >= nMi || mj < 0 || mj >= nMj) return -1;
    return mi * nMj + mj;
  };

  /* --- integrazione RK2 a passo d'arco uniforme --- */
  const integrate = (la0: number, lo0: number, uphill: boolean): { la: number; lo: number } | null => {
    let la = la0;
    let lo = lo0;
    for (let k = 0; k < MAX_STEPS; k++) {
      const d1 = dirAt(la, lo, uphill);
      if (!d1) return k > 2 ? { la, lo } : null;
      const mLa = la + (d1.dN * (DS / 2)) / mLat;
      const mLo = lo + (d1.dE * (DS / 2)) / mLon;
      const d2 = dirAt(mLa, mLo, uphill);
      if (!d2) return k > 2 ? { la, lo } : null;
      la += (d2.dN * DS) / mLat;
      lo += (d2.dE * DS) / mLon;
      if (!inBounds(la, lo)) return null;
    }
    return { la, lo };
  };

  /* --- velocità km/h + alpha per nodo (STESSA fisica delle etichette) --- */
  const nodeAttr = (
    la: number,
    lo: number,
    uE: number,
    uN: number,
    s: number,
  ): { sp: number; aK: number } => {
    const xN = (la - f.lat0) * mLat;
    const xE = (lo - f.lon0) * mLon;
    const w = lw((xE + extE) / (2 * extE), (extN - xN) / (2 * extN));
    const fE = -Math.sin(w.wd * RAD);
    const fN = -Math.cos(w.wd * RAD);
    /* combing come in dirAt (serve a blendFlow per la deriva di cresta) */
    const tE = uN;
    const tN = -uE;
    const dLa = (240 * tN) / mLat;
    const dLo = (240 * tE) / mLon;
    const kSign = raiseAt(la + dLa, lo + dLo) >= raiseAt(la - dLa, lo - dLo) ? 1 : -1;
    const conv0 = raiseAt(la, lo);
    const d2La = (2 * f.step) / mLat;
    const d2Lo = (2 * f.step) / mLon;
    const conv =
      conv0 -
      (heightAt(f, la + d2La, lo) +
        heightAt(f, la - d2La, lo) +
        heightAt(f, la, lo + d2Lo) +
        heightAt(f, la, lo - d2Lo)) /
        4;
    const phys = blendFlow({
      fE,
      fN,
      ws: w.ws,
      uE,
      uN,
      s,
      rE: kSign * tE,
      rN: kSign * tN,
      sunAz: sun.az,
      sunAlt: sun.alt,
      conv,
      rad: opts.fallback.rad ?? null,
      cloudPct: opts.fallback.cloud ?? null,
    });
    /* alpha: versante al sole più leggibile; notte uniforme; l'intensità conta */
    const aspectAz = Math.atan2(-uE, -uN);
    const expo = Math.max(0, Math.cos(aspectAz - sun.az * RAD));
    const sunA = isDay ? 0.5 + 0.5 * expo : 0.88;
    const spA = clamp(phys.sp / 16, 0.62, 1);
    return { sp: phys.sp, aK: clamp(sunA * spA, 0.2, 1) };
  };

  /* ---------- SEMINA: reticolo filtrato sulla pendenza, ordinato per ---------- *
   * pendenza decrescente (i versanti più netti si prendono le corsie migliori)  */
  const seeds: { la: number; lo: number; s: number }[] = [];
  for (let mi = 0; mi < nMi - 2; mi++) {
    for (let mj = 0; mj < nMj - 2; mj++) {
      const xN = (mi + 0.5) * cell;
      const xE = (mj + 0.5) * cell;
      const la = f.lat0 + (xN - extN) / mLat;
      const lo = f.lon0 + (xE - extE) / mLon;
      const { fi, fj } = fineIJ(la, lo);
      const s = Math.max(0, bil(G, G.S, fi, fj));
      if (s >= SLOPE_MIN) seeds.push({ la, lo, s });
    }
  }
  seeds.sort((a, b) => b.s - a.s);

  /* ANTI-INCROCIO A DOPPIO SIGILLO:
     1. maschera «primo arrivato»: segna le celle toccate (scelta rapida);
     2. distanza di sicurezza ASSOLUTA: ogni nuovo nodo viene confrontato con
        TUTTI i nodi delle altre corsie nelle 9 celle intorno — se uno è più
        vicino di SAFE_M la corsia si FERMA. Il vincolo vale a coppie (chi
        arriva dopo è controllato contro chi era prima): due corsie non si
        avvicinano mai meno di SAFE_M, su NESSUNA coppia di nodi. */
  const SAFE_M = 210; // m — metà della separazione minima tra corsie
  const cellNodes = new Map<number, { li: number; la: number; lo: number }[]>();
  const tooClose = (la: number, lo: number, laneId: number): boolean => {
    const xN = (la - f.lat0) * mLat + extN;
    const xE = (lo - f.lon0) * mLon + extE;
    const mi = Math.floor(xN / cell) + 1;
    const mj = Math.floor(xE / cell) + 1;
    for (let di = -1; di <= 1; di++) {
      const i2 = mi + di;
      if (i2 < 0 || i2 >= nMi) continue;
      for (let dj = -1; dj <= 1; dj++) {
        const j2 = mj + dj;
        if (j2 < 0 || j2 >= nMj) continue;
        const idx = i2 * nMj + j2;
        if (mask[idx] < 0) continue; // cella mai toccata: niente da controllare
        const nodes = cellNodes.get(idx);
        if (!nodes) continue;
        for (const q of nodes) {
          if (q.li !== laneId && Math.hypot((q.la - la) * mLat, (q.lo - lo) * mLon) < SAFE_M) return true;
        }
      }
    }
    return false;
  };
  const claim = (la: number, lo: number, laneId: number): void => {
    const idx = maskIdx(la, lo);
    if (idx < 0) return;
    if (mask[idx] < 0) mask[idx] = laneId; // primo arrivato: la cella NON si ruba
    let arr = cellNodes.get(idx);
    if (!arr) {
      arr = [];
      cellNodes.set(idx, arr);
    }
    arr.push({ li: laneId, la, lo });
  };

  const lanes: Lane[] = [];
  for (const sd of seeds) {
    const laneId = lanes.length;
    /* 1) PRE-PASS: scendo a valle per far nascere la corsia DAL BASSO
       (richiesta pilota: «i venti partono dal basso e salgono i pendii»).
       La discesa NON reclama celle: solo la salita incide la maschera. */
    const bot = integrate(sd.la, sd.lo, false);
    if (!bot) continue;
    /* 2) SALITA dal fondo valle: se la base è nel corridoio di un'altra
       corsia provo dal SEME (nascita a metà pendio, comunque sottovento al
       flusso esistente); se anche il seme è conteso, il seme si butta. */
    let baseLa = bot.la;
    let baseLo = bot.lo;
    if (tooClose(baseLa, baseLo, laneId)) {
      if (tooClose(sd.la, sd.lo, laneId)) continue;
      baseLa = sd.la;
      baseLo = sd.lo;
    }
    const ptsLa: number[] = [];
    const ptsLo: number[] = [];
    const ptsH: number[] = [];
    const ptsAz: number[] = [];
    const ptsAK: number[] = [];
    let la = baseLa;
    let lo = baseLo;
    const baseH = raiseAt(baseLa, baseLo); // quota di partenza (per il tetto di dislivello)
    for (let k = 0; k < MAX_STEPS; k++) {
      const d1 = dirAt(la, lo, true);
      if (!d1) break; // cresta raggiunta (pendenza esaurita)
      if (tooClose(la, lo, laneId)) break; // corridoio di un'altra corsia: finisco QUI
      const { fi, fj } = fineIJ(la, lo);
      const attr = nodeAttr(la, lo, d1.uE, d1.uN, d1.s);
      ptsLa.push(la);
      ptsLo.push(lo);
      ptsH.push(raiseAt(la, lo) + CRUISE_LIFT); // la corsia VOLA: mai sepolta nel mesh
      ptsAz.push(Math.atan2(d1.dE, d1.dN));
      ptsAK.push(attr.aK);
      claim(la, lo, laneId);
      const mLa = la + (d1.dN * (DS / 2)) / mLat;
      const mLo = lo + (d1.dE * (DS / 2)) / mLon;
      const d2 = dirAt(mLa, mLo, true);
      if (!d2) break;
      /* STACCO ALLA CRESTA: la brezza sale il versante, non corre lungo il
         crinale — oltre H_GAIN_MAX di dislivello la corsia finisce (è lì che
         l'aria si stacca e nutre le termiche) */
      la += (d2.dN * DS) / mLat;
      lo += (d2.dE * DS) / mLon;
      if (!inBounds(la, lo)) break;
      if (raiseAt(la, lo) - baseH > H_GAIN_MAX) break;
    }
    const n = ptsLa.length;
    if ((n - 1) * DS < LANE_MIN_LEN) continue; // troppo corta: scarti (evita «punti» senza senso)
    lanes.push({
      n,
      la: Float64Array.from(ptsLa),
      lo: Float64Array.from(ptsLo),
      h: Float64Array.from(ptsH),
      az: Float64Array.from(ptsAz),
      aK: Float32Array.from(ptsAK),
      len: (n - 1) * DS,
    });
  }

  if (lanes.length === 0) return flatFallback(f, opts, sun, isDay);

  /* ---------- DISTRIBUZIONE DELLE PERLE: evenly spaced sulla RETE intera ----------
     Tutte le corsie condividono lo stesso passo efficace (onda unica, mai
     sorpassi): spacingEff = Ltot / (budget - nCorsie) con minimo assoluto. */
  const Ltot = lanes.reduce((a, l) => a + l.len, 0);
  const nL = lanes.length;
  let spacingEff = BEAD_SPACING;
  if (nL >= opts.budget) {
    spacingEff = Math.max(BEAD_SPACING_MIN, Ltot / nL); // ≥1 perla per corsia
  } else {
    spacingEff = Math.max(BEAD_SPACING_MIN, Ltot / (opts.budget - nL));
  }
  const beads: Bead[] = [];
  for (let li = 0; li < nL; li++) {
    const lane = lanes[li];
    /* mai una collana più rada di ~1300 m (le corsie corte restano vive) */
    const nB = Math.max(1, Math.round(lane.len / spacingEff), Math.ceil(lane.len / 1300));
    for (let b = 0; b < nB; b++) beads.push({ lane: li, s0: ((b + 0.5) * lane.len) / nB });
  }

  return { lanes, beads, flat: false, day: isDay };
}

/* ---------- FALLBACK PIANURA: corsie dritte del vento sinottico ----------
   Su un sito senza pendii la brezza di versante non esiste: il flusso al
   suolo è il vento del meteo. Corsie parallele dirte, altezza dal DEM. */
function flatFallback(
  f: WindField,
  opts: LaneOpts,
  sun: { az: number; alt: number },
  isDay: boolean,
): LaneField {
  const mLat = f.mLat;
  const mLon = f.mLon;
  const extN = ((f.rows - 1) * f.step) / 2;
  const extE = ((f.cols - 1) * f.step) / 2;
  const w = opts.live && opts.live.length === 9 ? opts.live[4] : { ws: opts.fallback.ws, wd: opts.fallback.wd };
  const dirTo = (((w.wd + 180) % 360) + 360) % 360;
  const dE = Math.sin(dirTo * RAD);
  const dN = Math.cos(dirTo * RAD);
  const az = (dirTo * RAD);
  const raiseAt = (la: number, lo: number): number =>
    Math.max(heightAt2(f, la, lo), heightAt(f, la, lo));

  const lanes: Lane[] = [];
  const R = Math.hypot(extN, extE);
  const nLanes = 13;
  for (let k = 0; k < nLanes; k++) {
    const off = (k - (nLanes - 1) / 2) * LANE_SEP;
    const pE = -dN * off; // perpendicolare al moto
    const pN = dE * off;
    const cLa = f.lat0 + pN / mLat;
    const cLo = f.lon0 + pE / mLon;
    const n = Math.floor((2 * R) / DS) + 1;
    const la = new Float64Array(n);
    const lo = new Float64Array(n);
    const h = new Float64Array(n);
    const azs = new Float64Array(n);
    const aK = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = -R + i * DS;
      la[i] = cLa + (dN * t) / mLat;
      lo[i] = cLo + (dE * t) / mLon;
      h[i] = raiseAt(la[i], lo[i]) + CRUISE_LIFT;
      azs[i] = az;
      aK[i] = isDay ? 0.8 : 0.7;
    }
    lanes.push({ n, la, lo, h, az: azs, aK, len: (n - 1) * DS });
  }
  const spacingEff = Math.max(BEAD_SPACING_MIN, LANE_SEP * 0.74);
  const beads: Bead[] = [];
  for (let li = 0; li < lanes.length; li++) {
    const lane = lanes[li];
    const nB = Math.max(1, Math.round(lane.len / spacingEff));
    for (let b = 0; b < nB; b++) beads.push({ lane: li, s0: ((b + 0.5) * lane.len) / nB });
  }
  return { lanes, beads, flat: true, day: isDay };
}

/* ---------- campione d'arco su una corsia (O(1), arco uniforme DS) ---------- */
export interface LaneSample {
  la: number;
  lo: number;
  h: number;
  az: number;
  aK: number;
}

/** Posizione sull'arco a `arc` metri dal fondo valle (clampata ai capi). */
export function laneAt(lane: Lane, arc: number, out: LaneSample): LaneSample {
  const a = clamp(arc, 0, lane.len);
  const x = a / DS;
  const i0 = Math.min(lane.n - 2, Math.floor(x));
  const t = clamp(x - i0, 0, 1);
  const i1 = i0 + 1;
  out.la = lane.la[i0] + (lane.la[i1] - lane.la[i0]) * t;
  out.lo = lane.lo[i0] + (lane.lo[i1] - lane.lo[i0]) * t;
  out.h = lane.h[i0] + (lane.h[i1] - lane.h[i0]) * t;
  /* azimut: interpolo su sin/cos (mai scatti al passaggio ±π) */
  const a0 = lane.az[i0];
  const a1 = lane.az[i1];
  let da = a1 - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const az = a0 + da * t;
  out.az = Math.atan2(Math.sin(az), Math.cos(az));
  out.aK = lane.aK[i0] + (lane.aK[i1] - lane.aK[i0]) * t;
  return out;
}
