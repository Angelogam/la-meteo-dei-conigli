import { defineHandler, getQuery, createError, setHeader } from "nitro/h3";

/**
 * Proxy server-side delle tile mappa (basemap OpenStreetMap e radar RainViewer):
 * il fetch avviene dal server con user-agent dedicato e il browser riceve PNG
 * della stessa origine, pulite e senza richieste cross-origin. Cache lunga per
 * la basemap (le tile OSM a zoom di volo cambiano lentamente), breve per il
 * radar (frame nuovi ogni 10 minuti). Un primo tentativo può fallire per il
 * dual-stack IPv6/IPv4 del runtime: si riprova una volta prima di dare errore.
 */

// Basemap: Carto dark_all (primaria, CDN affidabile stile dark da dashboard) con
// fallback Esri Dark Gray Canvas — entrambe senza chiavi. Esri a volte risponde
// con l'immagine "Zoom Level Not Supported" per tile valide (HTTP 200): il client
// la scarta via sanitizzazione e riprova con l'altro provider.
const CARTO_URL = "https://basemaps.cartocdn.com/dark_all";
const ESRI_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile";
const RADAR_CACHE_URL = "https://tilecache.rainviewer.com/v2/radar";
const TIMEOUT_MS = 8_000;
const UA = "LaMeteoDeiConigli/1.0 (carta dei temporali per piloti di volo libero)";

export default defineHandler(async (event) => {
  const q = getQuery(event);
  const frame = String(q.frame ?? "");
  const z = String(q.z ?? "");
  const x = String(q.x ?? "");
  const y = String(q.y ?? "");

  const zn = Number(z), xn = Number(x), yn = Number(y);
  if (!Number.isInteger(zn) || zn < 0 || zn > 13 || !Number.isInteger(xn) || xn < 0 || xn >= 2 ** zn || !Number.isInteger(yn) || yn < 0 || yn >= 2 ** zn) {
    throw createError({ statusCode: 400, statusMessage: "coordinate tile non valide" });
  }

  let url: string;
  let cache: string;
  if (frame) {
    if (!/^\d{10}$/.test(frame)) throw createError({ statusCode: 400, statusMessage: "frame radar non valido" });
    url = `${RADAR_CACHE_URL}/${frame}/256/${zn}/${xn}/${yn}/2/1_1.png`;
    cache = "public, max-age=300";
  } else if (String(q.prov ?? "carto") === "esri") {
    // Esri usa l'ordine z/y/x e serve JPEG
    url = `${ESRI_URL}/${zn}/${yn}/${xn}`;
    cache = "public, max-age=3600";
  } else {
    url = `${CARTO_URL}/${zn}/${xn}/${yn}.png`;
    cache = "public, max-age=86400";
  }

  let res: Response | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2 && !res; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA } });
      if (!r.ok) {
        throw createError({ statusCode: r.status === 404 ? 404 : 502, statusMessage: "tile non disponibile" });
      }
      res = r;
    } catch (e) {
      lastErr = e;
      res = null;
    } finally {
      clearTimeout(timer);
    }
  }
  if (!res) {
    throw lastErr ?? createError({ statusCode: 502, statusMessage: "tile non disponibile" });
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > 2_000_000) {
    throw createError({ statusCode: 502, statusMessage: "tile anomala" });
  }
  const ctype = res.headers.get("content-type")?.includes("jpeg") ? "image/jpeg" : "image/png";
  setHeader(event, "Content-Type", ctype);
  setHeader(event, "Cache-Control", cache);
  return new Response(buf, { status: 200, headers: { "Content-Type": ctype, "Cache-Control": cache } });
});
