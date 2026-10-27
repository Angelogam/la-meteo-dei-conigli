/**
 * CAMPO TERMICO TERRAIN-AWARE — il sistema di Meteo-Parapente riprodotto e migliorato.
 *
 * Come funziona (fisica reale, tutta nel browser):
 *  1. DEM REALE  — scarichiamo i tile "Terrarium" (AWS elevation-tiles-prod, CORS aperto,
 *     dati EU-DEM/SRTM ~100-300 m/px) e decodificiamo l'elevazione per pixel.
 *  2. GEOMETRIA  — sulla griglia dello schermo calcoliamo per ogni cella quota,
 *     pendenza e aspetto del pendio (differenze finite sul DEM).
 *  3. SOLE       — posizione solare NOAA per l'ora della previsione (utils/solar.ts).
 *  4. RISCALDAMENTO — cos(incidenza) del sole sul pendio × funzione di pendenza
 *     (i versanti 14-40° sono i generatori migliori) × radiazione diretta del modello
 *     (Open-Meteo, già attenuata da nubi/foschia).
 *  5. STATO DI CONVEZIONE — il rateo massimo misurato sui decolli del club
 *     (formula aerologica dell'app) scala l'intensità di tutto il campo.
 *  6. DRIFT      — il campo viene advettato sottovento con il vento medio del giorno.
 *
 * Il risultato è la mappa a colori "dove sono le termiche più forti": azzurro/verde
 * le bolle deboli, giallo/arancio le buone, rosso/viola i generatori forti —
 * la scala riconoscibile di Meteo-Parapente.
 */

import { solarPosition } from "@/utils/solar";

/* ============================ SCALA COLORI ============================ */

/** Scala ascendenze (m/s) — dal blu debole al viola dei generatori forti. */
const THERMAL_STOPS: { v: number; c: [number, number, number]; a: number }[] = [
  { v: 0.30, c: [37, 99, 235], a: 0.22 }, // blu
  { v: 0.70, c: [14, 165, 233], a: 0.30 }, // azzurro
  { v: 1.40, c: [16, 185, 129], a: 0.36 }, // verde
  { v: 2.20, c: [234, 179, 8], a: 0.44 }, // giallo
  { v: 3.00, c: [249, 115, 22], a: 0.52 }, // arancio
  { v: 4.00, c: [239, 68, 68], a: 0.58 }, // rosso
  { v: 5.50, c: [168, 85, 247], a: 0.66 }, // viola
];

export const THERMAL_MIN_MS = 0.22; // sotto questa soglia il campo è trasparente

export function thermalColor(v: number): { r: number; g: number; b: number; a: number } {
  if (v <= THERMAL_MIN_MS) return { r: 0, g: 0, b: 0, a: 0 };
  if (v >= THERMAL_STOPS[THERMAL_STOPS.length - 1].v) {
    const s = THERMAL_STOPS[THERMAL_STOPS.length - 1];
    return { r: s.c[0], g: s.c[1], b: s.c[2], a: s.a };
  }
  for (let i = 0; i < THERMAL_STOPS.length - 1; i++) {
    const a = THERMAL_STOPS[i];
    const b = THERMAL_STOPS[i + 1];
    if (v >= a.v && v <= b.v) {
      const t = (v - a.v) / (b.v - a.v);
      return {
        r: Math.round(a.c[0] + (b.c[0] - a.c[0]) * t),
        g: Math.round(a.c[1] + (b.c[1] - a.c[1]) * t),
        b: Math.round(a.c[2] + (b.c[2] - a.c[2]) * t),
        a: a.a + (b.a - a.a) * t,
      };
    }
  }
  const s = THERMAL_STOPS[0];
  return { r: s.c[0], g: s.c[1], b: s.c[2], a: s.a };
}

/** Colore pieno per barre/chip dell'interfaccia (stessa scala, più leggibile). */
export function thermalCss(v: number): string {
  if (v <= THERMAL_MIN_MS) return "rgba(100, 116, 139, 0.55)";
  const { r, g, b } = thermalColor(v);
  return `rgb(${r},${g},${b})`;
}

/** Gradiente verticale per le barre orarie del pannello. */
export function thermalBarGradient(v: number): string {
  if (v <= THERMAL_MIN_MS) return "linear-gradient(180deg, rgba(148,163,184,0.5), rgba(100,116,139,0.65))";
  const c = thermalColor(v);
  const top = `rgba(${Math.min(255, c.r + 60)},${Math.min(255, c.g + 60)},${Math.min(255, c.b + 40)},0.95)`;
  const bot = `rgba(${c.r},${c.g},${c.b},0.85)`;
  return `linear-gradient(180deg, ${top}, ${bot})`;
}

/* ============================== DEM TERRARIUM ============================== */

const TILE = 256;
const TILE_CACHE_MAX = 120;
const REGION_TILE_CAP = 90;
const LOAD_CONCURRENCY = 10;

const tileCache = new Map<string, Int16Array | null>();
let region: { z: number; x0: number; y0: number; w: number; h: number; data: Int16Array } | null = null;
let regionKey = "";

const lonToTx = (lon: number, z: number) => ((lon + 180) / 360) * (1 << z);
const latToTy = (lat: number, z: number) => {
  const s = Math.sin(Math.max(-85.05, Math.min(85.05, lat)) * (Math.PI / 180));
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * (1 << z);
};

async function loadTile(z: number, x: number, y: number): Promise<Int16Array | null> {
  const key = `${z}/${x}/${y}`;
  if (tileCache.has(key)) return tileCache.get(key)!;
  let arr: Int16Array | null = null;
  try {
    const n = 1 << z;
    const wx = ((x % n) + n) % n;
    if (y < 0 || y >= n) throw new Error("fuori mondo");
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("tile non disponibile"));
      im.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${wx}/${y}.png`;
    });
    const cv = document.createElement("canvas");
    cv.width = TILE;
    cv.height = TILE;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    if (!cx) throw new Error("canvas");
    cx.drawImage(img, 0, 0, TILE, TILE);
    const d = cx.getImageData(0, 0, TILE, TILE).data;
    arr = new Int16Array(TILE * TILE);
    for (let i = 0, p = 0; i < arr.length; i++, p += 4) {
      arr[i] = (d[p] * 256 + d[p + 1] + d[p + 2] / 256) - 32768;
    }
  } catch {
    arr = null;
  }
  if (tileCache.size > TILE_CACHE_MAX) tileCache.clear();
  tileCache.set(key, arr);
  return arr;
}

async function loadTileRetry(z: number, x: number, y: number): Promise<Int16Array | null> {
  const first = await loadTile(z, x, y);
  if (first !== null) return first;
  await new Promise((r) => setTimeout(r, 450));
  return loadTile(z, x, y);
}

/** carica con concorrenza limitata (niente raffiche da 50 richieste) */
async function loadBatched(jobs: { x: number; y: number }[], z: number): Promise<(Int16Array | null)[]> {
  const results: (Int16Array | null)[] = new Array(jobs.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await loadTileRetry(z, jobs[i].x, jobs[i].y);
    }
  };
  await Promise.all(Array.from({ length: Math.min(LOAD_CONCURRENCY, jobs.length) }, worker));
  return results;
}

/* statistiche dell'ultimo ensureDem (diagnostica/verifica) */
export const demStats: { ok: number; failed: number; total: number; cap: number; reason: string } = {
  ok: 0,
  failed: 0,
  total: 0,
  cap: REGION_TILE_CAP,
  reason: "mai eseguito",
};

/**
 * Assicura una mosaico DEM che copra i bounds indicati (+ margine 1 tile).
 * Ritorna true se il terreno è utilizzabile (≥70% dei tile caricati).
 */
export async function ensureDem(
  north: number,
  south: number,
  east: number,
  west: number,
  viewZoom: number,
): Promise<boolean> {
  const z = Math.max(8, Math.min(11, Math.floor(viewZoom)));
  const n = 1 << z;
  const x0 = Math.floor(lonToTx(west, z)) - 1;
  const x1 = Math.ceil(lonToTx(east, z)) + 1;
  const y0 = Math.max(0, Math.floor(latToTy(north, z)) - 1);
  const y1 = Math.min(n - 1, Math.ceil(latToTy(south, z)) + 1);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const key = `${z}:${x0}:${y0}:${w}x${h}`;
  if (region && regionKey === key) return true;
  if (w * h > REGION_TILE_CAP) {
    demStats.total = w * h;
    demStats.reason = `troppi tile (${w}×${h}) per lo zoom ${z}`;
    return false;
  }

  const jobs: { x: number; y: number }[] = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) jobs.push({ x: tx, y: ty });
  const results = await loadBatched(jobs, z);
  const okCount = results.filter((r) => r !== null).length;
  demStats.total = results.length;
  demStats.ok = okCount;
  demStats.failed = results.length - okCount;
  demStats.reason = okCount < results.length * 0.7 ? `solo ${okCount}/${results.length} tile` : "ok";
  if (okCount < results.length * 0.7 || okCount === 0) return false;

  const W = w * TILE;
  const H = h * TILE;
  const data = new Int16Array(W * H).fill(-32000);
  let k = 0;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++, k++) {
      const t = results[k];
      if (!t) continue;
      const ox = (tx - x0) * TILE;
      const oy = (ty - y0) * TILE;
      for (let py = 0; py < TILE; py++) {
        const row = (oy + py) * W + ox;
        data.set(t.subarray(py * TILE, py * TILE + TILE), row);
      }
    }
  }
  region = { z, x0, y0, w, h, data };
  regionKey = key;
  return true;
}

export function demAvailable(): boolean {
  return region !== null;
}

/** Elevazione bilineare (m) o null se fuori/nodata. */
export function sampleElevation(lat: number, lon: number): number | null {
  if (!region) return null;
  const { z, x0, y0, w, h, data } = region;
  const W = w * TILE;
  const H = h * TILE;
  const px = (lonToTx(lon, z) - x0) * TILE;
  const py = (latToTy(lat, z) - y0) * TILE;
  if (px < 0 || py < 0 || px > W - 1.001 || py > H - 1.001) return null;
  const xi = Math.floor(px);
  const yi = Math.floor(py);
  const xj = Math.min(W - 1, xi + 1);
  const yj = Math.min(H - 1, yi + 1);
  const v = (xx: number, yy: number) => {
    const e = data[yy * W + xx];
    return e <= -32000 ? null : e;
  };
  const e00 = v(xi, yi);
  const e10 = v(xj, yi);
  const e01 = v(xi, yj);
  const e11 = v(xj, yj);
  if (e00 == null && e10 == null && e01 == null && e11 == null) return null;
  const tx = px - xi;
  const ty = py - yi;
  const a = e00 ?? e10 ?? e01 ?? e11!;
  const b = e10 ?? e00 ?? e11 ?? e01!;
  const c = e01 ?? e11 ?? e00 ?? e10!;
  const d = e11 ?? e01 ?? e10 ?? e00!;
  return a + (b - a) * tx + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
}

/* ============================ GEOMETRIA CAMPO ============================ */

export interface FieldCell {
  /** coordinate px nel canvas del calore (origine già traslata) */
  x: number;
  y: number;
  elev: number;
  /** pendenza in gradi */
  slope: number;
  cosSlope: number;
  sinSlope: number;
  /** azimut del versante (la direzione cui la superficie guarda), gradi dal N */
  aspect: number;
}

export interface FieldGeom {
  cols: number;
  rows: number;
  spacing: number;
  cells: FieldCell[];
  mpp: number;
}

/**
 * Costruisce la griglia (con pendenza/aspetto da DEM) sopra il canvas corrente.
 * La griglia sfora di 3 celle per lato per lasciare spazio al drift del vento.
 */
export function buildFieldGeometry(opts: {
  width: number;
  height: number;
  metersPerPixel: number;
  spacing?: number;
  unproject: (x: number, y: number) => { lat: number; lon: number };
}): FieldGeom | null {
  if (!region) return null;
  const spacing = opts.spacing ?? 12;
  const cols = Math.ceil(opts.width / spacing) + 7;
  const rows = Math.ceil(opts.height / spacing) + 7;
  const cells: FieldCell[] = [];
  const mPerCell = spacing * opts.metersPerPixel;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - 3) * spacing;
      const y = (r - 3) * spacing;
      const { lat, lon } = opts.unproject(x, y);
      const elev = sampleElevation(lat, lon);
      if (elev == null) {
        cells.push({ x, y, elev: NaN, slope: 0, cosSlope: 1, sinSlope: 0, aspect: 0 });
        continue;
      }
      const dLat = mPerCell / 110_540;
      const dLon = mPerCell / (111_320 * Math.max(0.3, Math.cos(lat * (Math.PI / 180))));
      const eE = sampleElevation(lat, lon + dLon);
      const eN = sampleElevation(lat + dLat, lon);
      // gradiente (Est e Nord positivi); se il vicino è nodata usiamo 0 (pendio piatto su quell'asse)
      const gx = eE == null ? 0 : (eE - elev) / mPerCell;
      const gy = eN == null ? 0 : (eN - elev) / mPerCell;
      const slope = Math.atan(Math.hypot(gx, gy)) * (180 / Math.PI);
      const aspect = Math.atan2(gx, gy) * (180 / Math.PI); // verso cui il pendio GUARDA (montanha su)
      cells.push({
        x,
        y,
        elev,
        slope,
        cosSlope: Math.cos(slope * (Math.PI / 180)),
        sinSlope: Math.sin(slope * (Math.PI / 180)),
        aspect: ((aspect % 360) + 360) % 360,
      });
    }
  }
  return { cols, rows, spacing, cells, mpp: opts.metersPerPixel };
}

/* ============================ FISICA TERMICA ============================ */

export interface ThermalHour {
  dayISO: string;
  hour: number;
  /** radiazione diretta media regionale (W/m²) */
  rad: number;
  /** rateo massimo sui decolli (m/s) — lo stato di convezione misurato dall'app */
  rateoMax: number;
  /** vento medio superficie (km/h, gradi DA) per il drift */
  windKmh: number;
  windDir: number;
  lat: number;
  lon: number;
}

/** Fattore pendenza: i versanti 14-40° sono i generatori migliori. */
function steepFactor(slopeDeg: number): number {
  if (slopeDeg < 3) return 0.22;
  if (slopeDeg < 14) return 0.22 + (slopeDeg - 3) / 11 * 0.78;
  if (slopeDeg <= 40) return 1;
  if (slopeDeg <= 60) return 1 - ((slopeDeg - 40) / 20) * 0.22;
  return 0.74;
}

export interface FieldResult {
  values: Float32Array;
  max: number;
}

/**
 * Calcola il campo di ascendenze (m/s) per l'ora indicata.
 * Fisica: cos(incidenza sole-pendio) × pendenza × radiazione × stato di convezione
 * × maggiorazione di quota (i crinali raggiungono prima la convezione).
 */
export function computeField(geom: FieldGeom, h: ThermalHour): FieldResult {
  const sun = solarPosition(h.dayISO, h.hour, h.lat, h.lon);
  const values = new Float32Array(geom.cells.length);
  if (sun.elev < 2 || h.rad < 25) return { values, max: 0 };

  // stato di convezione: la verità è il rateo sui decolli; fallback = radiazione
  let state: number;
  if (h.rateoMax > 0.05) state = Math.min(1.18, h.rateoMax / 3.1);
  else state = Math.min(1.02, Math.max(0, (h.rad - 90) / 640));
  if (state <= 0.02) return { values, max: 0 };

  const sinElev = Math.sin(sun.elev * (Math.PI / 180));
  const cosElev = Math.cos(sun.elev * (Math.PI / 180));
  const sunAz = sun.az * (Math.PI / 180);

  let max = 0;
  for (let i = 0; i < geom.cells.length; i++) {
    const c = geom.cells[i];
    if (!Number.isFinite(c.elev)) continue;
    const cosInc = Math.max(0, sinElev * c.cosSlope + cosElev * c.sinSlope * Math.cos(sunAz - c.aspect * (Math.PI / 180)));
    if (cosInc <= 0.02) continue;
    const cellHeat = cosInc * steepFactor(c.slope);
    if (cellHeat <= 0.03) continue;
    const elevBoost = 0.82 + 0.38 * Math.max(0, Math.min(1, (c.elev - 500) / 1800));
    const lift = state * (0.1 + 0.9 * cellHeat) * elevBoost * 4.7;
    if (lift > 0.15) {
      values[i] = lift;
      if (lift > max) max = lift;
    }
  }
  return { values, max };
}

/* ============================ RENDERING ============================ */

/**
 * Disegna il campo sul canvas (coordinate locali già posizionate),
 * con advettamento sottovento (dx,dy in px) e sfumatura da modello.
 */
export function paintField(
  ctx: CanvasRenderingContext2D,
  geom: FieldGeom,
  values: Float32Array,
  driftX: number,
  driftY: number,
): void {
  const off = document.createElement("canvas");
  off.width = geom.cols;
  off.height = geom.rows;
  const octx = off.getContext("2d");
  if (!octx) return;
  const img = octx.createImageData(geom.cols, geom.rows);
  const d = img.data;
  for (let i = 0; i < geom.cells.length; i++) {
    const v = values[i];
    const p = i * 4;
    if (v <= THERMAL_MIN_MS) continue;
    const c = thermalColor(v);
    d[p] = c.r;
    d[p + 1] = c.g;
    d[p + 2] = c.b;
    d[p + 3] = Math.round(c.a * 255);
  }
  octx.putImageData(img, 0, 0);

  const x0 = geom.cells[0].x - geom.spacing / 2;
  const y0 = geom.cells[0].y - geom.spacing / 2;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const blur = Math.max(2, geom.spacing * 0.35);
  try {
    ctx.filter = `blur(${blur.toFixed(1)}px)`;
  } catch {
    /* vecchi browser: senza blur */
  }
  ctx.drawImage(
    off,
    x0 + driftX,
    y0 + driftY,
    geom.cols * geom.spacing,
    geom.rows * geom.spacing,
  );
  ctx.restore();
}

/** Spostamento in px dell'advettimento sottovento (dir = gradi DA). */
export function driftPx(windKmh: number, windDir: number, zoom: number): { dx: number; dy: number } {
  if (!Number.isFinite(windKmh) || !Number.isFinite(windDir) || windKmh < 2) return { dx: 0, dy: 0 };
  const to = ((windDir + 180) % 360) * (Math.PI / 180);
  const px = Math.min(85, windKmh * 2.0 * Math.pow(1.45, Math.max(0, Math.min(3, zoom - 9))));
  return { dx: Math.sin(to) * px, dy: -Math.cos(to) * px };
}
