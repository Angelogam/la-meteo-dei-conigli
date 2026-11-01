/**
 * TERMICHE CONFERMATE DAI VOLI REALI — dati XCTherm (thermal.kk7.ch).
 *
 * L'utente ha chiesto «prendi dal sito di XContest i voli dei piloti»: le mappe
 * TERMICHE di XCTherm (progetto gemello di XContest) sono costruite ESATTAMENTE
 * con le salite reali dei piloti — migliaia di tracce IGC (parapendio e deltaplano,
 * campionati da XContest e altri contest) aggregate in tiles PNG:
 *
 *   https://thermal.kk7.ch/tiles/thermals_{stagione}_{fascia}/{z}/{x}/{y}.png
 *
 * Il tile è in SCALE DI GRIGI: il pixel più CHIARO = zona dove i piloti salgono
 * più spesso ("the hotter the area appears, the likelier it becomes to find
 * updraft" — doc ufficiale). Le tile sono in orientamento TMS (y invertito).
 * Pubbliche, senza chiave, con attribuzione obbligatoria CC BY-NC-SA.
 *
 * Uso nella vista 3D: scarico i 9 tile z10 attorno al decollo (≈20×20 km),
 * decodifico i pixel più caldi e li riduco a ~400 «bolle confermate» (griglia
 * 250 m, resta il massimo di calore per cella). In thermals.ts questi punti
 * ANCORANO i coni termici: dove i piloti salgono davvero il cono compare
 * sempre, indipendente dalla stima meteo; la stima (vento/brezze/sole) resta
 * per il resto del campo e per la FORZA in m/s.
 *
 * Cache in memoria 12 h: i dati sono stagionali, cambiano con lentezza.
 */

export interface PilotThermal {
  lat: number;
  lon: number;
  h: number; // quota DEM del punto (risolta dal campo vento)
  heat: number; // 0..1, intensità dalla scala di grigi
}

export const XCTHERM_CREDIT = "bolle confermate dai voli reali · thermal.kk7.ch (CC BY-NC-SA)";

const TILE_URL = "https://thermal.kk7.ch/tiles";
const ATTR_HOST = "la-meteo-dei-conigli.vercel.app";
const Z = 10; // 27 m/px sull'Appennino: abbastanza fine per gli stacchi
const GRID_M = 250; // celle di riduzione: una bolla per cella
const MAX_POINTS = 400;
const MIN_HEAT = 0.22; // sotto questa intensità il rumore domina

/** Layer stagionale: jan/apr/jul/oct «all» secondo la data corrente. */
export function thermalLayerFor(date = new Date()): string {
  const m = date.getMonth();
  const season = m <= 1 || m === 11 ? "jan" : m <= 4 ? "apr" : m <= 7 ? "jul" : "oct";
  return `thermals_${season}_all`;
}

const cache = new Map<string, { at: number; pts: PilotThermal[] }>();
const TTL_MS = 12 * 3600 * 1000;

/** x/y tile XYZ (slippy) per lat/lon a zoom z. */
function tileXYZ(lat: number, lon: number, z: number): { x: number; y: number } {
  const latR = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180;
  const n = 1 << z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const yXYZ = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n);
  return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, yXYZ)) };
}

/** Metri per grado alla latitudine data. */
function metersPerDeg(lat: number): { mLat: number; mLon: number } {
  return { mLat: 111320, mLon: 111320 * Math.cos((lat * Math.PI) / 180) };
}

/**
 * Scarica e decodifica i tile XCTherm attorno al punto, riducendoli a bolle.
 * Torna [] se la rete o il formato non collaborano: il resto della vista non
 * dipende da questo servizio (le stime da vento/brezze restano operative).
 */
export async function fetchPilotThermals(lat0: number, lon0: number, radiusM = 9500): Promise<PilotThermal[]> {
  const key = `${lat0.toFixed(2)},${lon0.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.pts;

  const layer = thermalLayerFor();
  const { x: cx, y: cyXYZ } = tileXYZ(lat0, lon0, Z);
  const n = 1 << Z;
  /* i tile in TMS: y invertita (yTMS = 2^z − 1 − yXYZ) */
  const yBase = n - 1 - cyXYZ; // riga TMS del tile che contiene il punto
  const mPerTile = (40075017 * Math.cos((lat0 * Math.PI) / 180)) / (1 << Z) / 256;
  const half = Math.ceil(radiusM / mPerTile / 256) + 1;

  /* dy è espresso in righe XYZ: dy=−1 è il tile a NORD. In TMS la y scende
     al contrario, quindi la riga TMS è yBase − dy. */
  const jobs: Promise<Float32Array | null>[] = [];
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const tx = cx + dx;
      const tyTms = yBase - dy;
      if (tyTms < 0 || tyTms >= n) {
        jobs.push(Promise.resolve(null));
        continue;
      }
      jobs.push(loadTileGray(`${TILE_URL}/${layer}/${Z}/${tx}/${tyTms}.png`));
    }
  }
  const results = await Promise.all(jobs);

  const { mLat, mLon } = metersPerDeg(lat0);
  const cell = GRID_M / mLat;
  const cellX = GRID_M / mLon;
  const buckets = new Map<string, PilotThermal>();

  let idx = 0;
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++, idx++) {
      const gray = results[idx];
      if (!gray) continue;
      /* il tile scaricato (riga TMS yBase − dy) copre la riga XYZ cyXYZ + dy */
      const yXYZrow = cyXYZ + dy;
      const latN = xyzToLat(yXYZrow, n);
      const latS = xyzToLat(yXYZrow + 1, n);
      const lonW = ((cx + dx) / n) * 360 - 180;
      const lonE = ((cx + dx + 1) / n) * 360 - 180;
      for (let py = 0; py < 256; py += 2) {
        const lat = latN + (latS - latN) * (py / 256);
        if (Math.abs((lat - lat0) * mLat) > radiusM) continue;
        for (let px = 0; px < 256; px += 2) {
          const heat = gray[py * 256 + px];
          if (heat < MIN_HEAT) continue;
          const lon = lonW + (lonE - lonW) * (px / 256);
          if (Math.abs((lon - lon0) * mLon) > radiusM) continue;
          /* per-pixel 2 px ≈ 2*perTileM: spalmare il calore del pixel sui
             vicini di griglia (il pixel copre ~54 m a z10, la cella 250 m) */
          const bk = `${Math.floor(lat / cell)}:${Math.floor(lon / cellX)}`;
          const prev = buckets.get(bk);
          if (!prev || heat > prev.heat) {
            buckets.set(bk, { lat, lon, h: 0, heat });
          }
        }
      }
    }
  }

  const pts = [...buckets.values()].sort((a, b) => b.heat - a.heat).slice(0, MAX_POINTS);
  if (pts.length) cache.set(key, { at: Date.now(), pts });
  return pts;
}

/** Latitudine (gradi) del bordo superiore della riga yXYZ a zoom z. */
function xyzToLat(yXYZ: number, n: number): number {
  const yy = Math.min(n, Math.max(0, yXYZ));
  const t = Math.PI * (1 - (2 * yy) / n);
  return (Math.atan(Math.sinh(t)) * 180) / Math.PI;
}

/** Scarica un tile PNG e torna la mappa di calore normalizzata (0..1, 65536 px). */
async function loadTileGray(url: string): Promise<Float32Array | null> {
  try {
    const res = await fetch(`${url}?src=${ATTR_HOST}`, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
    if (typeof OffscreenCanvas !== "undefined") {
      const oc = new OffscreenCanvas(256, 256);
      ctx = oc.getContext("2d", { willReadFrequently: true });
    } else {
      const cv = document.createElement("canvas");
      cv.width = 256;
      cv.height = 256;
      ctx = cv.getContext("2d", { willReadFrequently: true });
    }
    if (!ctx) return null;
    ctx.drawImage(bmp as CanvasImageSource, 0, 0, 256, 256);
    const px = (ctx as CanvasRenderingContext2D).getImageData(0, 0, 256, 256).data;
    const out = new Float32Array(256 * 256);
    for (let i = 0; i < out.length; i++) {
      const a = px[i * 4 + 3];
      if (a > 10) {
        /* scala di grigi (canale grigio = intensità; alpha 0 = fuori mappa) */
        const g = px[i * 4] / 255;
        out[i] = g * (a / 255);
      }
    }
    bmp.close?.();
    return out;
  } catch {
    return null;
  }
}
