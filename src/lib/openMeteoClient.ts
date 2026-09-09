/**
 * Client API Open-Meteo centralizzato
 * 
 * Tutti i fetch verso Open-Meteo passano attraverso questo modulo
 * per garantire coerenza, gestione errori e uso del proxy locale.
 */
import { getMeteoBaseUrl } from "@/config/apiConfig";

const TIMEOUT_MS = 8000;

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

interface BaseHourlyParams {
  latitude: number;
  longitude: number;
  timezone?: string;
  start_date?: string;
  end_date?: string;
  forecast_days?: number;
  forecast_hours?: number;
}

/**
 * Costruisce URL base per le chiamate Open-Meteo
 */
function buildUrl(params: BaseHourlyParams & { hourly?: string; daily?: string; current?: string }): string {
  const baseUrl = getMeteoBaseUrl();
  const search = new URLSearchParams({
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    timezone: params.timezone || "Europe/Rome",
  });
  if (params.hourly) search.set("hourly", params.hourly);
  if (params.daily) search.set("daily", params.daily);
  if (params.current) search.set("current", params.current);
  if (params.start_date) search.set("start_date", params.start_date);
  if (params.end_date) search.set("end_date", params.end_date);
  if (params.forecast_days) search.set("forecast_days", params.forecast_days.toString());
  if (params.forecast_hours) search.set("forecast_hours", params.forecast_hours.toString());
  return `${baseUrl}?${search.toString()}`;
}

/**
 * Fetch dati orari per un giorno specifico
 */
export async function fetchHourly(
  lat: number,
  lon: number,
  params: string,
  start_date?: string,
  end_date?: string
): Promise<any> {
  const url = buildUrl({
    latitude: lat,
    longitude: lon,
    hourly: params,
    start_date,
    end_date,
    forecast_days: 3,
  });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
  const url = buildUrl({ latitude: lat, longitude: lon, daily: params, forecast_days: days });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Fetch dati correnti
 */
export async function fetchCurrent(lat: number, lon: number, params: string): Promise<any> {
  const url = buildUrl({ latitude: lat, longitude: lon, current: params, forecast_days: 1 });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
  });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Versione semplificata: singola chiamata con parametri custom
 */
export async function fetchOpenMeteo(url: string): Promise<any> {
  const fullUrl = url.startsWith("http") ? url : buildUrl({
    latitude: 0,
    longitude: 0,
    ...(url.includes("latitude=") ? {
      latitude: parseFloat(url.match(/latitude=([^&]+)/)?.[1] || "0"),
      longitude: parseFloat(url.match(/longitude=([^&]+)/)?.[1] || "0"),
    } : {}),
  });
  const res = await fetchWithTimeout(fullUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export { safeNum, safeNumOrNull, buildUrl };
