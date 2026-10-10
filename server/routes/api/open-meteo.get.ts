import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 5_000_000;

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

function queryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value) && value.every(item => typeof item === "string")) {
    return value.join(",").trim() || undefined;
  }
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
  if (!/^\\d+$/.test(value)) {
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

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const url = new URL(OPEN_METEO_URL);

  for (const key of ALLOWED) {
    const value = queryValue(query[key]);
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      // Do not expose upstream response bodies or internal provider details.
      throw createError({
        statusCode: response.status === 429 ? 429 : 502,
        statusMessage: response.status === 429 ? "Limite richieste meteo raggiunto" : "Il servizio meteo ha rifiutato la richiesta",
      });
    }

    const body = await readLimitedBody(response);
    try { JSON.parse(body); } catch {
      throw createError({ statusCode: 502, statusMessage: "Risposta non valida dal servizio meteo" });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, s-maxage=120, stale-while-revalidate=300",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; name?: string };
    if (err?.statusCode) throw error;
    if (err?.name === "AbortError") {
      throw createError({ statusCode: 504, statusMessage: "Timeout del servizio meteo" });
    }
    throw createError({ statusCode: 502, statusMessage: "Servizio meteo temporaneamente non raggiungibile" });
  } finally {
    clearTimeout(timer);
  }
});
