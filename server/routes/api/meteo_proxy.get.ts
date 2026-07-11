// Proxy per l'API Open-Meteo con caching lato server
// Serve per bypassare il rate limiting basato su IP

// Cache in memoria
const cache = new Map<string, { data: string; expires: number }>();

const CACHE_TTL = 60_000; // 1 minuto
const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  
  // Ricostruisce i params originali
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(query)) {
    if (typeof val === "string") {
      params.set(key, val);
    }
  }

  const cacheKey = params.toString();
  const cached = cache.get(cacheKey);

  // Se abbiamo un dato in cache valido, restituiscilo
  if (cached && Date.now() < cached.expires) {
    console.log(`[meteo_proxy] Cache HIT for ${cacheKey.slice(0, 80)}...`);
    setResponseHeader(event, "Content-Type", "application/json");
    setResponseHeader(event, "X-Cache", "HIT");
    return cached.data;
  }

  // Altrimenti chiama Open-Meteo
  const url = `${BASE_URL}?${cacheKey}`;
  console.log(`[meteo_proxy] Fetching: ${url.slice(0, 150)}...`);

  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "DyadWeather/1.0",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[meteo_proxy] Open-Meteo returned ${res.status}: ${text}`);
      
      // Se abbiamo ancora un cache scaduto, restituiscilo come fallback
      if (cached) {
        console.log(`[meteo_proxy] Serving stale cache as fallback`);
        setResponseHeader(event, "Content-Type", "application/json");
        setResponseHeader(event, "X-Cache", "STALE");
        return cached.data;
      }

      throw createError({
        statusCode: res.status,
        statusMessage: `Open-Meteo error: ${res.statusText}`,
      });
    }

    const data = await res.text();

    // Salva in cache
    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });

    // Pulisci cache ogni tanto (evita memory leak)
    if (cache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of cache.entries()) {
        if (now > entry.expires) cache.delete(key);
      }
    }

    setResponseHeader(event, "Content-Type", "application/json");
    setResponseHeader(event, "X-Cache", "MISS");
    return data;
  } catch (err: any) {
    console.error(`[meteo_proxy] Fetch error:`, err.message);
    // Fallback a cache scaduto se disponibile
    if (cached) {
      console.log(`[meteo_proxy] Serving stale cache as fallback after error`);
      setResponseHeader(event, "Content-Type", "application/json");
      setResponseHeader(event, "X-Cache", "STALE");
      return cached.data;
    }
    throw createError({
      statusCode: 502,
      statusMessage: `Proxy error: ${err.message}`,
    });
  }
});
