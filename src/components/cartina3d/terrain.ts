/**
 * TERRAIN PROVIDER — terreno 3D globale senza chiavi API.
 *
 * Usa i "Terrain Tiles" (formato Terrarium) di Mapzen pubblicati su AWS Open Data:
 *   https://registry.opendata.aws/terrain-tiles/
 * Tile PNG 256×256 XYZ slippy (Web Mercator), quota codificata nei canali RGB:
 *   h = R*256 + G + B/256 − 32768  (metri, EGM96)
 * Il bucket risponde con `Access-Control-Allow-Origin: *` → fetch diretto dal browser,
 * nessun proxy, nessuna API key, nessun costo.
 *
 * ⚠️ NOTE IMPLEMENTATIVE (bug risolti con test Playwright):
 * 1. nel build attuale di CesiumJS il costruttore di `Cesium.TerrainProvider` lancia
 *    DeveloperError.throwInstantiationError() — NON si può estendere con `extends`.
 *    Il provider è quindi una classe PLAIN che implementa l'interfaccia (duck typing).
 * 2. `sampleTerrainMostDetailed` (usato per brezze/percorso) esige `availability`:
 *    senza lancia DeveloperError e le frecce non compaiono mai → forniamo una
 *    TileAvailability con copertura completa fino a z14 (il dataset è globale).
 * 3. l'helper statico `TerrainProvider.getLevelMaximumGeometricError` non è esportato
 *    da tutti i build → ricalcolato con la formula ufficiale Cesium.
 *
 * La factory riceve il namespace Cesium GIÀ CARICATO (import dinamico in Cartina3D):
 * così la libreria (~5 MB gz) resta un chunk lazy e non appesantisce la pagina.
 */

import type * as CesiumNs from "cesium";

const TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
/** Zoom massimo utile del dataset (z15). Fermarsi a 14: ~9.5 m/pixel, più che sufficiente. */
const MAX_LEVEL = 14;
const TILE_SIZE = 256;

const tileCache = new Map<string, Float32Array>();
const pending = new Map<string, Promise<Float32Array>>();

/** Scarica e decodifica un tile Terrarium in un array di altezze Float32 (256×256). */
function loadTile(level: number, x: number, y: number): Promise<Float32Array> {
  const key = `${level}/${x}/${y}`;
  const hit = tileCache.get(key);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(key);
  if (inflight) return inflight;

  const job = (async () => {
    const res = await fetch(`${TILE_URL}/${level}/${x}/${y}.png`);
    if (!res.ok) throw new Error(`terrarium ${res.status} su ${key}`);
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
    if (typeof OffscreenCanvas !== "undefined") {
      const oc = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
      ctx = oc.getContext("2d", { willReadFrequently: true });
    } else {
      const cv = document.createElement("canvas");
      cv.width = TILE_SIZE;
      cv.height = TILE_SIZE;
      ctx = cv.getContext("2d", { willReadFrequently: true });
    }
    if (!ctx) throw new Error("canvas 2D non disponibile");
    ctx.drawImage(bmp as CanvasImageSource, 0, 0, TILE_SIZE, TILE_SIZE);
    const px = (ctx as CanvasRenderingContext2D).getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
    const heights = new Float32Array(TILE_SIZE * TILE_SIZE);
    for (let i = 0; i < heights.length; i++) {
      const r = px[i * 4];
      const g = px[i * 4 + 1];
      const b = px[i * 4 + 2];
      heights[i] = r * 256 + g + b / 256 - 32768;
    }
    bmp.close?.();
    tileCache.set(key, heights);
    return heights;
  })()
    .finally(() => pending.delete(key));

  pending.set(key, job);
  return job;
}

export function createTerrariumTerrainProvider(Cesium: CesiumNs): CesiumNs.TerrainProvider {
  class TerrariumProvider {
    readonly tilingScheme = new Cesium.WebMercatorTilingScheme();
    readonly credit = new Cesium.Credit("Terreno: Mapzen Terrain Tiles · AWS Open Data (DEM ~30 m)");
    readonly hasWaterMask = false;
    readonly hasVertexNormals = false;
    readonly errorEvent: CesiumNs.Event<CesiumNs.TerrainProvider.ErrorEvent> = new Cesium.Event();

    /** Disponibilità tile: obbligatoria per sampleTerrainMostDetailed (brezze, percorso). */
    readonly availability: CesiumNs.TileAvailability;

    /* Errore geometrico per heightmap, formula ufficiale Cesium:
       R_terra · 2π · quality / (tileWidth · numeroTileAlLivelloZero), poi /2^level. */
    private readonly _levelZeroError =
      (Cesium.Ellipsoid.WGS84.maximumRadius * 2 * Math.PI * 0.25) /
      (TILE_SIZE * this.tilingScheme.getNumberOfXTilesAtLevel(0));

    constructor() {
      const av = new Cesium.TileAvailability(this.tilingScheme, MAX_LEVEL);
      for (let level = 0; level <= MAX_LEVEL; level++) {
        av.addAvailableTileRange(
          level,
          0,
          0,
          this.tilingScheme.getNumberOfXTilesAtLevel(level) - 1,
          this.tilingScheme.getNumberOfYTilesAtLevel(level) - 1,
        );
      }
      this.availability = av;
    }

    requestTileGeometry(
      x: number,
      y: number,
      level: number,
      _request?: CesiumNs.Request,
    ): Promise<CesiumNs.TerrainData> | undefined {
      if (level > MAX_LEVEL) return undefined;
      const key = `${level}/${x}/${y}`;
      const cached = TILE_DATA.get(key);
      if (cached) return Promise.resolve(cached);

      return loadTile(level, x, y)
        .then((heights) => {
          const data = new Cesium.HeightmapTerrainData({
            buffer: heights,
            width: TILE_SIZE,
            height: TILE_SIZE,
          });
          TILE_DATA.set(key, data);
          return data as CesiumNs.TerrainData;
        })
        .catch((e: unknown) => {
          /* tile non scaricabile: segnala a Cesium, che lo ritenta con backoff */
          this.errorEvent.raiseEvent(
            new Cesium.TileProviderError(
              undefined as unknown as CesiumNs.TerrainProvider,
              String(e),
              x,
              y,
              level,
              0,
              undefined,
            ),
          );
          throw e;
        });
    }

    getLevelMaximumGeometricError(level: number): number {
      return this._levelZeroError / (1 << level);
    }

    getTileDataAvailable(x: number, y: number, level: number): boolean | undefined {
      return level <= MAX_LEVEL;
    }

    loadTileDataAvailability(_x: number, _y: number, _level: number): undefined | Promise<void> {
      return undefined;
    }
  }

  const TILE_DATA = new Map<string, CesiumNs.HeightmapTerrainData>();
  return new TerrariumProvider() as unknown as CesiumNs.TerrainProvider;
}
