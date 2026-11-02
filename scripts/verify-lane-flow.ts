/* Verifica numerica del MOTORE A CORSIE (lanes.ts) — la risposta al
   respingo del pilota: «è un pasticcio di freccette che si inculano altre
   ... devi dare un senso logico».
   Qui si DIMOSTRA che:
   1. le corsie esistono sui pendii (non su pianura);
   2. SALGONO dal fondo valle alla cresta (anabatica: h finale >> h iniziale);
   3. la tangente della corsia segue il pendio (dot con il gradiente > 0);
   4. DUE CORSIE NON SI INCROCIANO MAI (raster: ogni cella 40 m ha ≤ 1 corsia)
      e non si avvicinano meno di SAFE_M (210 m) — per costruzione;
   5. le perle sono distribuite a passo UNIFORME per corsia (onda unica);
   6. il campione d'arco laneAt è continuo (niente salti);
   7. TUTTO È BLU: BREEZE_BLUE unico colore della famiglia brezza;
   8. sito pianeggiante → fallback corsie dritte (mai scena vuota).
   Eseguita in Node: lanes.ts non dipende da Cesium.
   Uso: npx tsx scripts/verify-lane-flow.ts */
import {
  buildLaneField,
  laneAt,
  BREEZE_BLUE,
  LANE_MIN_LEN,
  type Lane,
  type WindField,
} from "../src/components/cartina3d/lanes";

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  console.log((cond ? "  ✓ " : "  ✗ ") + msg);
  if (!cond) fails++;
};

/* ---------- DEM sintetico: due monti sovrapposti + noise gentile ----------
   dominio 12,16 km N-S × 17,28 km E-W (rows2=77, cols2=109, step2=160 m),
   come il campo reale costruito da winds.buildWindField. */
const LAT0 = 44.2;
const LON0 = 7.1;
const MLAT = 111320;
const MLON = MLAT * Math.cos((LAT0 * Math.PI) / 180);
const ROWS = 20;
const COLS = 28;
const STEP = 640;
const ROWS2 = (ROWS - 1) * 4 + 1; // 77
const COLS2 = (COLS - 1) * 4 + 1; // 109
const STEP2 = STEP / 4; // 160

const hill = (xN: number, xE: number, cx: number, cy: number, amp: number, sig: number) =>
  amp * Math.exp(-(((xN - cx) ** 2 + (xE - cy) ** 2) / (2 * sig * sig)));

const H2at = (xN: number, xE: number): number =>
  220 +
  hill(xN, xE, 1800, -2600, 950, 2700) + // monte principale
  hill(xN, xE, -2200, 3200, 640, 1900) + // monte secondario
  26 * Math.sin(xE / 950) * Math.cos(xN / 1150); // ondulazione gentile

const makeField = (hAt: (xN: number, xE: number) => number): WindField => {
  const H2: number[][] = [];
  for (let i = 0; i < ROWS2; i++) {
    const xN = ((ROWS2 - 1) / 2 - i) * STEP2;
    const row: number[] = [];
    for (let j = 0; j < COLS2; j++) row.push(hAt(xN, (j - (COLS2 - 1) / 2) * STEP2));
    H2.push(row);
  }
  const H: number[][] = [];
  for (let i = 0; i < ROWS; i++) {
    const row: number[] = [];
    for (let j = 0; j < COLS; j++) row.push(H2[i * 4][j * 4]);
    H.push(row);
  }
  const zeros = (): number[][] =>
    Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
  return {
    lat0: LAT0,
    lon0: LON0,
    rows: ROWS,
    cols: COLS,
    step: STEP,
    mLat: MLAT,
    mLon: MLON,
    H,
    gE: zeros(),
    gN: zeros(),
    S: zeros(),
    H2,
    rows2: ROWS2,
    cols2: COLS2,
    step2: STEP2,
  };
};

const field = makeField(H2at);
const flat = makeField(() => 500);

const opts = {
  hour: 14,
  doy: 180,
  live: null,
  fallback: { ws: 5, wd: 270, rad: 700 as number | null, cloud: 10 as number | null },
  budget: 300,
};

const t0 = Date.now();
const lf = buildLaneField(field, opts);
const buildMs = Date.now() - t0;
const lanes = lf.lanes;
console.log(`costruzione corsie: ${lanes.length} corsie in ${buildMs} ms (flat=${lf.flat}, day=${lf.day}, perle=${lf.beads.length})`);

/* ---------- 1. CORSIE SUI PENDII ---------- */
console.log("1. CORSIE SUI PENDII:");
ok(lanes.length >= 5, `corsie costruite: ${lanes.length} (≥ 5)`);

/* ---------- 2. SALITA: dal fondo valle alla cresta ---------- */
let climbOk = 0;
for (const l of lanes) {
  const h0 = l.h[0];
  const h1 = l.h[l.n - 1];
  if (h1 > h0 + 25) climbOk++; // anche i pendii dolci guadagnano quota
}
console.log("2. SALITA lungo la corsia (anabatica):");
ok(climbOk === lanes.length && lanes.length > 0, `corsie che salgono ≥25 m: ${climbOk}/${lanes.length}`);
ok(lanes.every((l) => l.len >= LANE_MIN_LEN), `tutte le corsie ≥ ${LANE_MIN_LEN} m (min attuale: ${Math.round(Math.min(...lanes.map((l) => l.len)))} m)`);

/* ---------- 3. DIREZIONE = LUNGO IL PENDIO (gradiente fine) ---------- */
/* gradiente numerico dallo STESSO DEM (independent check) */
const gradAt = (la: number, lo: number): { gN: number; gE: number } => {
  const d = 120;
  const xN = (la - LAT0) * MLAT;
  const xE = (lo - LON0) * MLON;
  const hN1 = H2at(xN + d, xE);
  const hN0 = H2at(xN - d, xE);
  const hE1 = H2at(xN, xE + d);
  const hE0 = H2at(xN, xE - d);
  return { gN: (hN1 - hN0) / (2 * d), gE: (hE1 - hE0) / (2 * d) };
};
let upNodes = 0;
let totNodes = 0;
for (const l of lanes) {
  for (let i = 1; i < l.n; i++) {
    const dLa = l.la[i] - l.la[i - 1];
    const dLo = l.lo[i] - l.lo[i - 1];
    const g = gradAt(l.la[i], l.lo[i]);
    const dot = dLa * MLAT * g.gN + dLo * MLON * g.gE;
    totNodes++;
    if (dot > 0) upNodes++;
  }
}
const upRatio = upNodes / Math.max(1, totNodes);
console.log("3. DIREZIONE lungo la massima pendenza:");
ok(upRatio > 0.9, `nodi in salita: ${(upRatio * 100).toFixed(1)}% (> 90%)`);

/* ---------- 4. NIENTE INCROCI + SEPARAZIONE MINIMA ---------- */
const RASTER = 40; // m
const cellOf = (la: number, lo: number): number => {
  const xN = (la - LAT0) * MLAT + 12160;
  const xE = (lo - LON0) * MLON + 17280;
  const mi = Math.floor(xN / RASTER);
  const mj = Math.floor(xE / RASTER);
  return mi * 100000 + mj;
};
const raster = new Map<number, number>();
let conflicts = 0;
lanes.forEach((l, li) => {
  for (let i = 0; i < l.n; i++) {
    const c = cellOf(l.la[i], l.lo[i]);
    const owner = raster.get(c);
    if (owner === undefined) raster.set(c, li);
    else if (owner !== li) conflicts++;
  }
});
/* distanza minima reale tra corsie diverse: ogni nodo contro i nodi delle
   ALTRE corsie nei 9 bucket vicini (ricontrollo indipendente dal motore) */
const BK = 210;
const buckets = new Map<number, { li: number; la: number; lo: number }[]>();
const bkey = (la: number, lo: number): number => {
  const mi = Math.floor(((la - LAT0) * MLAT + 12160) / BK);
  const mj = Math.floor(((lo - LON0) * MLON + 17280) / BK);
  return mi * 100000 + mj;
};
lanes.forEach((l, li) => {
  for (let i = 0; i < l.n; i++) {
    const k = bkey(l.la[i], l.lo[i]);
    let arr = buckets.get(k);
    if (!arr) {
      arr = [];
      buckets.set(k, arr);
    }
    arr.push({ li, la: l.la[i], lo: l.lo[i] });
  }
});
let minDist = Infinity;
for (const [k, arr] of buckets) {
  const mi = Math.floor(k / 100000);
  const mj = k - mi * 100000;
  for (let di = -1; di <= 1; di++)
    for (let dj = -1; dj <= 1; dj++) {
      const near = buckets.get((mi + di) * 100000 + (mj + dj));
      if (!near) continue;
      for (const a of arr) {
        for (const b of near) {
          if (a.li === b.li) continue;
          const d = Math.hypot((a.la - b.la) * MLAT, (a.lo - b.lo) * MLON);
          if (d < minDist) minDist = d;
        }
      }
    }
}
console.log("4. ANTI-INCROCIO:");
ok(conflicts === 0, `celle da 40 m condivise da 2 corsie: ${conflicts} (deve essere 0)`);
ok(minDist >= 190, `distanza minima tra corsie diverse: ${minDist.toFixed(0)} m (≥ 190 m — niente frecce che si toccano)`);

/* ---------- 5. PERLE UNIFORMI (onda unica, mai sorpassi) ---------- */
let spacingOk = true;
let spacingMin = Infinity;
let spacingMax = 0;
const byLane = new Map<number, number[]>();
for (const b of lf.beads) {
  let arr = byLane.get(b.lane);
  if (!arr) {
    arr = [];
    byLane.set(b.lane, arr);
  }
  arr.push(b.s0);
}
for (const [, arr] of byLane) {
  arr.sort((a, b) => a - b);
}
for (const [li, arr] of byLane) {
  arr.sort((a, b) => a - b);
  const lane = lanes[li];
  const nB = arr.length;
  for (let i = 0; i < nB; i++) {
    const next = i === nB - 1 ? lane.len + arr[0] : arr[i + 1]; // l'anello si chiude
    const d = next - arr[i];
    spacingMin = Math.min(spacingMin, d);
    spacingMax = Math.max(spacingMax, d);
  }
  /* tutte le perle della stessa corsia ESATTAMENTE equidistanti */
  const step = lane.len / nB;
  for (let i = 0; i < nB; i++) {
    const expect = ((i + 0.5) * lane.len) / nB;
    if (Math.abs(arr[i] - expect) > 1e-6) spacingOk = false;
  }
}
console.log("5. PERLE UNIFORMI:");
ok(spacingOk, `posizioni esatte: perla i su corsia di n perle = (i+0.5)·len/n`);
ok(spacingMin >= 240 && spacingMax <= 1650, `passo perle: ${spacingMin.toFixed(0)}–${spacingMax.toFixed(0)} m (collane mai ammucchiate, corsie corte respirano)`);

/* ---------- 6. CONTINUITÀ del campione d'arco ---------- */
let maxJump = 0;
const smpA = { la: 0, lo: 0, h: 0, az: 0, aK: 0 };
const smpB = { la: 0, lo: 0, h: 0, az: 0, aK: 0 };
for (const l of lanes.slice(0, 12)) {
  for (let a = 0; a <= l.len - 30; a += 137) {
    laneAt(l, a, smpA);
    laneAt(l, a + 30, smpB);
    const d = Math.hypot((smpB.la - smpA.la) * MLAT, (smpB.lo - smpA.lo) * MLON);
    maxJump = Math.max(maxJump, Math.abs(d - 30));
  }
}
console.log("6. CONTINUITÀ (niente teletrasporti):");
ok(maxJump < 6, `errore massimo sul passo d'arco di 30 m: ${maxJump.toFixed(2)} m`);

/* ---------- 7. UN SOLO COLORE: BLU ---------- */
const isBlue = /^#[0-9a-f]{6}$/i.test(BREEZE_BLUE) && parseInt(BREEZE_BLUE.slice(5, 7), 16) > parseInt(BREEZE_BLUE.slice(1, 3), 16);
console.log("7. COLORE UNICO:");
ok(isBlue, `BREEZE_BLUE = ${BREEZE_BLUE} (canale blu dominante: «blu e basta»)`);

/* ---------- 8. FALLBACK PIANURA ---------- */
const lfFlat = buildLaneField(flat, opts);
console.log("8. FALLBACK PIANURA:");
ok(lfFlat.flat && lfFlat.lanes.length > 0 && lfFlat.beads.length > 0, `sito piatto → ${lfFlat.lanes.length} corsie dritte, ${lfFlat.beads.length} perle (mai scena vuota)`);

console.log(fails === 0 ? "\nTUTTI I TEST CORSIE PASSATI ✓" : `\n${fails} TEST FALLITI ✗`);
process.exit(fails === 0 ? 0 : 1);
