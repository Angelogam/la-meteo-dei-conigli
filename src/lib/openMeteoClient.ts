/**
 * Client API Open-Meteo centralizzato
 *
 * Tutti i fetch verso Open-Meteo passano attraverso questo modulo
 * per garantire coerenza, gestione errori e uso del proxy locale.
 */
import { getMeteoBaseUrl, OPEN_METEO_DIRECT } from "@/config/apiConfig";

const TIMEOUT_MS = 8000;
// Non forzare un modello: Open-Meteo seleziona il modello predefinito per coordinate e disponibilità.
const DEFAULT_MODELS = "";

const RESPONSE_CACHE_TTL_MS = 2 * 60 * 1000;
const RESPONSE_CACHE_MAX_ENTRIES = 80;
const responseCache = new Map<string, { expiresAt: number; value: any }>();
const pendingRequests = new Map<string, Promise<any>>();

/** Riusa brevemente risposte identiche e accorpa richieste simultanee. */
async function requestJson(url: string): Promise<any> {
  const now = Date.now();
  const cached = responseCache.get(url);
  if (cached && cached.expiresAt > now) return cached.value;
  if (cached) responseCache.delete(url);
  const pending = pendingRequests.get(url);
  if (pending) return pending;

  const request = (async () => {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const value = await res.json();
    responseCache.set(url, { value, expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS });
    if (responseCache.size > RESPONSE_CACHE_MAX_ENTRIES) {
      const oldestKey = responseCache.keys().next().value;
      if (oldestKey) responseCache.delete(oldestKey);
    }
    return value;
  })();

  pendingRequests.set(url, request);
  try { return await request; }
  finally { pendingRequests.delete(url); }
}

async function fetchWithTimeout(url: string, timeoutMs: number = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function safeNum(v: unknown, fallback: number = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function safeNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/**
 * Costruisce URL per le chiamate Open-Meteo senza start/end_date quando forecast_days è usato.
 */
function buildUrl(params: {
  latitude: number;
  longitude: number;
  timezone?: string;
  hourly?: string;
  daily?: string;
  current?: string;
  forecast_days?: number;
  forecast_hours?: number;
  start_date?: string;
  end_date?: string;
  models?: string;
}): string {
  const baseUrl = getMeteoBaseUrl();
  const search = new URLSearchParams({
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    timezone: params.timezone || "Europe/Rome",
  });
  if (params.hourly) search.set("hourly", params.hourly);
  if (params.daily) search.set("daily", params.daily);
  if (params.current) search.set("current", params.current);
  // start_date/end_date e forecast_days sono mutualmente esclusivi su Open-Meteo
  const hasDates = params.start_date && params.start_date.trim() !== "" && params.end_date && params.end_date.trim() !== "";
  if (hasDates) {
    search.set("start_date", params.start_date);
    search.set("end_date", params.end_date);
  } else if (params.forecast_days) {
    search.set("forecast_days", params.forecast_days.toString());
  }
  if (params.forecast_hours) search.set("forecast_hours", params.forecast_hours.toString());
  // Imposta il modello solo se il chiamante ne specifica uno.
  if (params.models) search.set("models", params.models);
  return `${baseUrl}?${search.toString()}`;
}

/**
 * Costruisce URL diretto (senza proxy) per fallback.
 */
function buildDirectUrl(params: {
  latitude: number;
  longitude: number;
  timezone?: string;
  hourly?: string;
  daily?: string;
  current?: string;
  forecast_days?: number;
  forecast_hours?: number;
  start_date?: string;
  end_date?: string;
  models?: string;
}): string {
  const search = new URLSearchParams({
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    timezone: params.timezone || "Europe/Rome",
  });
  if (params.hourly) search.set("hourly", params.hourly);
  if (params.daily) search.set("daily", params.daily);
  if (params.current) search.set("current", params.current);
  if (params.start_date && params.end_date) {
    search.set("start_date", params.start_date);
    search.set("end_date", params.end_date);
  } else if (params.forecast_days) {
    search.set("forecast_days", params.forecast_days.toString());
  }
  if (params.forecast_hours) search.set("forecast_hours", params.forecast_hours.toString());
  if (params.models) search.set("models", params.models);
  return `${OPEN_METEO_DIRECT}?${search.toString()}`;
}

/**
 * Fetch dati orari con fallback automatico proxy → diretto.
 */
export async function fetchHourly(
  lat: number,
  lon: number,
  params: string,
  start_date?: string,
  end_date?: string
): Promise<any> {
  const url = buildUrl({ latitude: lat, longitude: lon, hourly: params, start_date, end_date, models: DEFAULT_MODELS });
  try {
    return await requestJson(url);
  } catch (err) {
    // Fallback: riprova direttamente su Open-Meteo se il proxy ha fallito
    if (url.includes("localhost:3000") || url.includes("/api/open-meteo")) {
      const directUrl = buildDirectUrl({ latitude: lat, longitude: lon, hourly: params, start_date, end_date, models: DEFAULT_MODELS });
      const res = await fetchWithTimeout(directUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
    throw err;
  }
}

/**
 * Fetch dati giornalieri
 */
export async function fetchDaily(
  lat: number,
  lon: number,
  params: string,
  days: number = 3
): Promise<any> {
  const url = buildUrl({ latitude: lat, longitude: lon, daily: params, forecast_days: days, models: DEFAULT_MODELS });
  try {
    return await requestJson(url);
  } catch (err) {
    if (url.includes("localhost:3000") || url.includes("/api/open-meteo")) {
      const directUrl = buildDirectUrl({ latitude: lat, longitude: lon, daily: params, forecast_days: days, models: DEFAULT_MODELS });
      const res = await fetchWithTimeout(directUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
    throw err;
  }
}

/**
 * Fetch dati correnti
 */
export async function fetchCurrent(lat: number, lon: number, params: string): Promise<any> {
  const url = buildUrl({ latitude: lat, longitude: lon, current: params, forecast_days: 1, models: DEFAULT_MODELS });
  try {
    return await requestJson(url);
  } catch (err) {
    if (url.includes("localhost:3000") || url.includes("/api/open-meteo")) {
      const directUrl = buildDirectUrl({ latitude: lat, longitude: lon, current: params, forecast_days: 1, models: DEFAULT_MODELS });
      const res = await fetchWithTimeout(directUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
    throw err;
  }
}

/**
 * Fetch completo (current + hourly + daily)
 */
export async function fetchFull(
  lat: number,
  lon: number,
  hourlyParams: string,
  dailyParams: string,
  currentParams: string
): Promise<{ hourly: any; daily: any; current: any }> {
  const url = buildUrl({
    latitude: lat,
    longitude: lon,
    hourly: hourlyParams,
    daily: dailyParams,
    current: currentParams,
    forecast_days: 3,
    models: DEFAULT_MODELS,
  });
  try {
    return await requestJson(url);
  } catch (err) {
    if (url.includes("localhost:3000") || url.includes("/api/open-meteo")) {
      const directUrl = buildDirectUrl({
        latitude: lat,
        longitude: lon,
        hourly: hourlyParams,
        daily: dailyParams,
        current: currentParams,
        forecast_days: 3,
        models: DEFAULT_MODELS,
      });
      const res = await fetchWithTimeout(directUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
    throw err;
  }
}

export { safeNum, safeNumOrNull, buildUrl, buildDirectUrl };
