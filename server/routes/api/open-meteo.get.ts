import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
/* Timeout e retry per tentativo (pattern consigliato da @ai, issue #35):
   6 s a tentativo, 2 retry SOLO su errori di rete/5xx/429, backoff 300→800 ms
   con jitter ±25%. I 4xx deterministici non vengono ritentati. */
const UPSTREAM_TIMEOUT_MS = 6_000;
const RETRY_DELAYS_MS = [300, 800];
const MAX_RESPONSE_BYTES = 5_000_000;
/* Cache «stale-on-error»: ultimo payload valido per query; se Open-Meteo cade
   dopo i retry si risponde con quest'ultimo (≤24 h) invece di un errore. */
const STALE_CACHE_MAX = 200;
const STALE_MAX_AGE_MS = 86_400_000;

const staleCache = new Map<string, { body: string; storedAt: number }>();

function rememberStale(key: string, body: string): void {
  if (staleCache.has(key)) staleCache.delete(key);
  staleCache.set(key, { body, storedAt: Date.now() });
  if (staleCache.size > STALE_CACHE_MAX) {
    const oldest = staleCache.keys().next().value;
    if (oldest !== undefined) staleCache.delete(oldest);
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchUpstreamOnce(urlString: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(urlString, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch con retry: ritorna il body VALIDATO, altrimenti lancia l'ultimo errore. */
async function fetchUpstreamValidated(urlString: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const base = RETRY_DELAYS_MS[attempt - 1] ?? 500;
      await sleep(base + Math.round(Math.random() * base * 0.25));
    }

    let response: Response;
    try {
      response = await fetchUpstreamOnce(urlString);
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === "AbortError") {
        lastError = createError({ statusCode: 504, statusMessage: "Timeout del servizio meteo" });
      } else {
        lastError = createError({ statusCode: 502, statusMessage: "Servizio meteo temporaneamente non raggiungibile" });
      }
      continue; // errore di rete/timeout: ritentabile
    }

    if (!response.ok) {
      const status = response.status;
      if (status >= 500 || status === 429) {
        lastError = createError({
          statusCode: status === 429 ? 429 : 502,
          statusMessage: status === 429 ? "Limite richieste meteo raggiunto" : "Il servizio meteo ha rifiutato la richiesta",
        });
        continue; // 5xx/429: ritentabile
      }
      // 4xx (non 429): la richiesta è deterministica, ritentare è inutile.
      throw createError({ statusCode: 502, statusMessage: "Il servizio meteo ha rifiutato la richiesta" });
    }

    const body = await readLimitedBody(response);
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      throw createError({ statusCode: 502, statusMessage: "Risposta non valida dal servizio meteo" });
    }
    if (
      parsedBody === null ||
      typeof parsedBody !== "object" ||
      Array.isArray(parsedBody) ||
      (parsedBody as { error?: unknown }).error === true
    ) {
      throw createError({ statusCode: 502, statusMessage: "Il servizio meteo ha restituito dati non validi" });
    }
    return body;
  }
  throw lastError ?? createError({ statusCode: 502, statusMessage: "Servizio meteo non raggiungibile" });
}

async function readLimitedBody(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw createError({ statusCode: 502, statusMessage: "Risposta troppo grande dal servizio meteo" });
  }

  if (!response.body) {
    throw createError({ statusCode: 502, statusMessage: "Risposta vuota dal servizio meteo" });
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw createError({ statusCode: 502, statusMessage: "Risposta troppo grande dal servizio meteo" });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
const ALLOWED = [
  "latitude", "longitude", "timezone", "hourly", "daily", "current",
  "forecast_days", "forecast_hours", "start_date", "end_date", "models",
  "temperature_unit", "wind_speed_unit", "precipitation_unit",
] as const;

function queryValue(value: unknown, name: string): string | undefined {
  if (Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Parametro ${name} ripetuto: specificarlo una sola volta`,
      data: { parameter: name },
    });
  }
  if (typeof value === "string") return value.trim() || undefined;
  return undefined;
}

function requiredCoordinate(value: string | undefined, name: string, min: number, max: number) {
  if (!value || value.length > 24) {
    throw createError({ statusCode: 400, statusMessage: `Coordinata ${name} obbligatoria`, data: { parameter: name } });
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw createError({ statusCode: 400, statusMessage: `Coordinata ${name} non valida`, data: { parameter: name, min, max } });
  }
  return number;
}

function validateIntegerParameter(url: URL, name: "forecast_days" | "forecast_hours", min: number, max: number) {
  const value = url.searchParams.get(name);
  if (value === null) return;
  if (!/^\d+$/.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `Parametro ${name} non valido`, data: { parameter: name, min, max } });
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw createError({ statusCode: 400, statusMessage: `Parametro ${name} fuori intervallo`, data: { parameter: name, min, max } });
  }
}

function validateEnumParameter(url: URL, name: "temperature_unit" | "wind_speed_unit" | "precipitation_unit", allowed: readonly string[]) {
  const value = url.searchParams.get(name);
  if (value !== null && !allowed.includes(value)) {
    throw createError({ statusCode: 400, statusMessage: `Parametro ${name} non valido`, data: { parameter: name, allowed } });
  }
}

function validateDateRange(url: URL) {
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");

  for (const [name, value] of [["start_date", startDate], ["end_date", endDate]] as const) {
    if (value === null) continue;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw createError({ statusCode: 400, statusMessage: `Parametro ${name} non valido: usare YYYY-MM-DD`, data: { parameter: name } });
    }
  }

  if (startDate !== null && endDate !== null && startDate > endDate) {
    throw createError({ statusCode: 400, statusMessage: "start_date deve essere precedente o uguale a end_date", data: { parameter: "start_date", endDate } });
  }
}

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const unsupportedParameters = Object.keys(query).filter(
    (key) => !ALLOWED.includes(key as (typeof ALLOWED)[number]),
  );
  if (unsupportedParameters.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "La richiesta contiene parametri non supportati",
      data: { parameters: unsupportedParameters },
    });
  }

  const url = new URL(OPEN_METEO_URL);

  for (const key of ALLOWED) {
    const value = queryValue(query[key], key);
    if (value) {
      if (value.length > 4_000) {
        throw createError({ statusCode: 400, statusMessage: `Parametro ${key} troppo lungo`, data: { parameter: key } });
      }
      url.searchParams.set(key, value);
    }
  }

  requiredCoordinate(url.searchParams.get("latitude") ?? undefined, "latitude", -90, 90);
  requiredCoordinate(url.searchParams.get("longitude") ?? undefined, "longitude", -180, 180);
  validateIntegerParameter(url, "forecast_days", 1, 16);
  validateIntegerParameter(url, "forecast_hours", 1, 384);
  validateEnumParameter(url, "temperature_unit", ["celsius", "fahrenheit"]);
  validateEnumParameter(url, "wind_speed_unit", ["kmh", "ms", "mph", "kn"]);
  validateEnumParameter(url, "precipitation_unit", ["mm", "inch"]);

  validateDateRange(url);

  const cacheKey = url.search;

  let body: string;
  try {
    body = await fetchUpstreamValidated(url.toString());
  } catch (error: unknown) {
    /* STALE-FALLBACK: upstream giù dopo i retry → l'ultimo dato valido (<24 h)
       con header X-Cache: STALE-FALLBACK e flag isStale nel JSON per la UI. */
    const cached = staleCache.get(cacheKey);
    if (cached && Date.now() - cached.storedAt <= STALE_MAX_AGE_MS) {
      let staleBody = cached.body;
      try {
        const parsed = JSON.parse(cached.body) as Record<string, unknown>;
        parsed.isStale = true;
        staleBody = JSON.stringify(parsed);
      } catch {
        /* payload intatto */
      }
      return new Response(staleBody, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-cache": "STALE-FALLBACK",
          "x-cache-age": String(Math.round((Date.now() - cached.storedAt) / 1000)),
          "x-content-type-options": "nosniff",
        },
      });
    }
    throw error;
  }

  rememberStale(cacheKey, body);

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, s-maxage=120, stale-while-revalidate=300, stale-if-error=86400",
      "x-content-type-options": "nosniff",
    },
  });
});
