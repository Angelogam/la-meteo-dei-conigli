import { createError } from "nitro/h3";

/**
 * Client upstream Open-Meteo condiviso dagli endpoint aerologici.
 * - timeout configurabile
 * - accetta solo risposte JSON strutturate come oggetto
 * - cache in memoria breve (utile per rate-limit del provider;
 *   su deployment serverless la cache è per-istanza)
 */

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 200;

const cache = new Map<string, { expires: number; payload: Record<string, unknown> }>();

export function cacheKey(url: string): string {
  return url;
}

export async function fetchOpenMeteo(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(OPEN_METEO_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const requestUrl = url.toString();
  const key = cacheKey(requestUrl);

  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.payload;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (response.status === 429) {
      throw createError({ statusCode: 429, statusMessage: "Limite di richieste del provider meteo raggiunto" });
    }
    if (!response.ok) {
      throw createError({ statusCode: 502, statusMessage: "Errore upstream Open-Meteo", data: { upstreamStatus: response.status } });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw createError({ statusCode: 502, statusMessage: "Risposta upstream non JSON" });
    }

    const payload: unknown = await response.json();
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      throw createError({ statusCode: 502, statusMessage: "Risposta upstream non valida" });
    }

    const record = payload as Record<string, unknown>;
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload: record });
    if (cache.size > CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }

    return record;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createError({ statusCode: 504, statusMessage: "Timeout del provider meteo" });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
