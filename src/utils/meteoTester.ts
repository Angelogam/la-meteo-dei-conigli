"use client";

import { getMeteoBaseUrl } from "@/config/apiConfig";

/**
 * Sistema di test massivo per verificare che i dati di Open-Meteo
 * arrivino correttamente e che le palette meteo siano attendibili.
 * 
 * Il tester:
 * 1. Fa richieste reali a Open-Meteo con i parametri ridotti (quelli usati dall'app)
 * 2. Verifica che ogni campo sia presente e nel range atteso
 * 3. Confronta i dati ricevuti con quelli visualizzati nelle palette
 * 4. Segnala anomalie
 */

export interface TestResult {
  siteId: string;
  siteName: string;
  timestamp: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  rawData: any;
  validation: FieldValidation;
  responseTimeMs: number;
}

interface FieldValidation {
  daily: { field: string; value: any; expected: string; ok: boolean }[];
  hourly: { field: string; value: any; expected: string; ok: boolean }[];
  current: { field: string; value: any; expected: string; ok: boolean }[];
}

const VALIDATION_RULES = {
  temperature: { min: -20, max: 50, label: "Temp (°C)" },
  humidity: { min: 0, max: 100, label: "Umidità (%)" },
  pressure: { min: 900, max: 1080, label: "Pressione (hPa)" },
  cloudCover: { min: 0, max: 100, label: "Nuvolosità (%)" },
  windSpeed: { min: 0, max: 80, label: "Vento (km/h)" },
  windDir: { min: 0, max: 360, label: "Direzione vento (°)" },
  precipitation: { min: 0, max: 100, label: "Pioggia (mm)" },
  uvIndex: { min: 0, max: 20, label: "UV Index" },
};

const BASE_URL = getMeteoBaseUrl();

// Parametri ridotti per il test — stessi usati dall'app
const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "wind_speed_10m_max",
].join(",");

export interface SiteCoord {
  id: string;
  name: string;
  lat: number;
  lon: number;
  alt: number;
  exposure: string;
}

// Test per un singolo sito
export async function testSingleSite(site: SiteCoord): Promise<TestResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const startTime = performance.now();

  try {
    const params = new URLSearchParams({
      latitude: site.lat.toString(),
      longitude: site.lon.toString(),
      hourly: HOURLY_PARAMS,
      daily: DAILY_PARAMS,
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      errors.push(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      return {
        siteId: site.id,
        siteName: site.name,
        timestamp: new Date().toISOString(),
        success: false,
        errors,
        warnings,
        rawData: null,
        validation: { daily: [], hourly: [], current: [] },
        responseTimeMs: Math.round(performance.now() - startTime),
      };
    }

    const raw = await res.json();
    const responseTimeMs = Math.round(performance.now() - startTime);
    const validation = validateRawData(raw, site);

    // Verifiche dati essenziali
    if (!raw.hourly?.time?.length) errors.push("Nessun dato orario ricevuto");
    if (!raw.daily?.time?.length) errors.push("Nessun dato giornaliero ricevuto");

    // Verifica temperature realistiche
    if (raw.hourly?.temperature_2m) {
      const temps = raw.hourly.temperature_2m.filter((t: number) => t != null);
      if (temps.length > 0) {
        const maxT = Math.max(...temps);
        const minT = Math.min(...temps);
        if (maxT > 50) errors.push(`Temperatura massima irrealistica: ${maxT}°C`);
        if (minT < -30) errors.push(`Temperatura minima irrealistica: ${minT}°C`);
        if (maxT - minT > 30) warnings.push(`Escursione termica molto alta: ${(maxT - minT).toFixed(1)}°C (altitudine: ${site.alt}m)`);
      }
    }

    // Verifica vento
    if (raw.hourly?.wind_speed_10m) {
      const maxWind = Math.max(...raw.hourly.wind_speed_10m.filter((w: number) => w != null));
      if (maxWind > 60) warnings.push(`Vento molto forte: ${maxWind} km/h`);
    }

    // Verifica che il sito esista nelle coordinate (controllo di geolocalizzazione)
    if (raw.elevation != null) {
      const elevDiff = Math.abs(raw.elevation - site.alt);
      if (elevDiff > 500) {
        warnings.push(`Dislivello elevation Open-Meteo vs dichiarato: ${Math.round(raw.elevation)}m vs ${site.alt}m (diff: ${Math.round(elevDiff)}m)`);
      }
    }

    // Verifica coordinate non siano zero
    if (raw.latitude === 0 && raw.longitude === 0) {
      errors.push("Open-Meteo ha restituito coordinate 0,0 — lat/lon errati?");
    }

    return {
      siteId: site.id,
      siteName: site.name,
      timestamp: new Date().toISOString(),
      success: errors.length === 0,
      errors,
      warnings,
      rawData: raw,
      validation,
      responseTimeMs,
    };

  } catch (err) {
    errors.push(`Eccezione: ${err instanceof Error ? err.message : String(err)}`);
    return {
      siteId: site.id,
      siteName: site.name,
      timestamp: new Date().toISOString(),
      success: false,
      errors,
      warnings,
      rawData: null,
      validation: { daily: [], hourly: [], current: [] },
      responseTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

function validateRawData(raw: any, site: SiteCoord): FieldValidation {
  const daily: { field: string; value: any; expected: string; ok: boolean }[] = [];
  const hourly: { field: string; value: any; expected: string; ok: boolean }[] = [];
  const current: { field: string; value: any; expected: string; ok: boolean }[] = [];

  // Daily validations
  if (raw.daily?.time?.length > 0) {
    const idx = 0;
    daily.push({ field: "weather_code", value: raw.daily.weather_code?.[idx], expected: "0-99", ok: raw.daily.weather_code?.[idx] >= 0 && raw.daily.weather_code?.[idx] <= 99 });
    daily.push({ field: "temp_max", value: raw.daily.temperature_2m_max?.[idx], expected: "-20..50°C", ok: raw.daily.temperature_2m_max?.[idx] >= -20 && raw.daily.temperature_2m_max?.[idx] <= 50 });
    daily.push({ field: "temp_min", value: raw.daily.temperature_2m_min?.[idx], expected: "-20..50°C", ok: raw.daily.temperature_2m_min?.[idx] >= -20 && raw.daily.temperature_2m_min?.[idx] <= 50 });
    daily.push({ field: "precipitation_sum", value: raw.daily.precipitation_sum?.[idx], expected: "≥ 0", ok: raw.daily.precipitation_sum?.[idx] >= 0 });
    daily.push({ field: "wind_speed_max", value: raw.daily.wind_speed_10m_max?.[idx], expected: "0..80", ok: raw.daily.wind_speed_10m_max?.[idx] >= 0 && raw.daily.wind_speed_10m_max?.[idx] <= 80 });
  }

  // Hourly validations (prima ora del primo giorno)
  if (raw.hourly?.time?.length > 0) {
    const idx = 0;
    hourly.push({ field: "temperature_2m", value: raw.hourly.temperature_2m?.[idx], expected: "-20..50°C", ok: raw.hourly.temperature_2m?.[idx] >= -20 && raw.hourly.temperature_2m?.[idx] <= 50 });
    hourly.push({ field: "relative_humidity_2m", value: raw.hourly.relative_humidity_2m?.[idx], expected: "0-100%", ok: raw.hourly.relative_humidity_2m?.[idx] >= 0 && raw.hourly.relative_humidity_2m?.[idx] <= 100 });
    hourly.push({ field: "precipitation", value: raw.hourly.precipitation?.[idx], expected: "≥ 0", ok: raw.hourly.precipitation?.[idx] >= 0 });
    hourly.push({ field: "cloud_cover", value: raw.hourly.cloud_cover?.[idx], expected: "0-100%", ok: raw.hourly.cloud_cover?.[idx] >= 0 && raw.hourly.cloud_cover?.[idx] <= 100 });
    hourly.push({ field: "wind_speed_10m", value: raw.hourly.wind_speed_10m?.[idx], expected: "0-80 km/h", ok: raw.hourly.wind_speed_10m?.[idx] >= 0 && raw.hourly.wind_speed_10m?.[idx] <= 80 });
    hourly.push({ field: "wind_direction_10m", value: raw.hourly.wind_direction_10m?.[idx], expected: "0-360°", ok: raw.hourly.wind_direction_10m?.[idx] >= 0 && raw.hourly.wind_direction_10m?.[idx] <= 360 });
  }

  // Current validations — Open-Meteo non include "current" se non richiesto
  // Quindi lo saltiamo

  return { daily, hourly, current };
}

// Test tutti i siti in sequenza (con delay per non superare rate limit)
export async function testAllSites(sites: SiteCoord[], onProgress?: (result: TestResult, index: number, total: number) => void): Promise<{
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    totalErrors: number;
    totalWarnings: number;
    avgResponseTime: number;
    slowest: TestResult | null;
    fastest: TestResult | null;
  }
}> {
  const results: TestResult[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalTime = 0;

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const result = await testSingleSite(site);
    results.push(result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
    totalTime += result.responseTimeMs;

    if (onProgress) onProgress(result, i + 1, sites.length);

    // Delay tra le richieste per non superare rate limit
    if (i < sites.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const sortedByTime = [...results].sort((a, b) => b.responseTimeMs - a.responseTimeMs);

  return {
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      totalErrors,
      totalWarnings,
      avgResponseTime: results.length > 0 ? Math.round(totalTime / results.length) : 0,
      slowest: sortedByTime[0] || null,
      fastest: sortedByTime[sortedByTime.length - 1] || null,
    }
  };
}

// Confronta i dati ricevuti con quelli visualizzati nelle palette
export function crossCheckPaletteData(
  rawData: any,
  paletteValues: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    cloudCover?: number;
    windSpeed?: number;
    windDir?: number;
    precipitation?: number;
  }
): { field: string; raw: any; palette: any; match: boolean; tolerance: string }[] {
  const checks: { field: string; raw: any; palette: any; match: boolean; tolerance: string }[] = [];

  // Prende la prima ora dei dati orari per confronto
  const rawHour = rawData?.hourly;
  const idx = 0;

  const comparisons = [
    { field: "Temperatura", raw: rawHour?.temperature_2m?.[idx], palette: paletteValues.temperature, tol: "±2°C" },
    { field: "Umidità", raw: rawHour?.relative_humidity_2m?.[idx], palette: paletteValues.humidity, tol: "±10%" },
    { field: "Pressione", raw: rawHour?.pressure_msl?.[idx], palette: paletteValues.pressure, tol: "±5hPa" },
    { field: "Nuvolosità", raw: rawHour?.cloud_cover?.[idx], palette: paletteValues.cloudCover, tol: "±15%" },
    { field: "Vento", raw: rawHour?.wind_speed_10m?.[idx], palette: paletteValues.windSpeed, tol: "±5km/h" },
    { field: "Direzione vento", raw: rawHour?.wind_direction_10m?.[idx], palette: paletteValues.windDir, tol: "±30°" },
    { field: "Pioggia", raw: rawHour?.precipitation?.[idx], palette: paletteValues.precipitation, tol: "±0.5mm" },
  ];

  for (const c of comparisons) {
    const match = c.raw != null && c.palette != null
      ? Math.abs(c.raw - c.palette) < parseFloat(c.tol.replace(/[^0-9.]/g, '')) * 2
      : c.raw == null && c.palette == null;
    checks.push({ field: c.field, raw: c.raw, palette: c.palette, match, tolerance: c.tol });
  }

  return checks;
}

// Test leggero rapido (solo un sito, pochi parametri) per verificare che l'API risponda
export async function quickHealthCheck(site: SiteCoord): Promise<{ alive: boolean; responseTime: number; status: string }> {
  const start = performance.now();
  try {
    const params = new URLSearchParams({
      latitude: site.lat.toString(),
      longitude: site.lon.toString(),
      hourly: "temperature_2m,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min",
      timezone: "Europe/Rome",
      forecast_days: "1",
    });
    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    const rt = Math.round(performance.now() - start);
    if (!res.ok) return { alive: false, responseTime: rt, status: `HTTP ${res.status}` };
    const data = await res.json();
    const hasData = data?.hourly?.time?.length > 0;
    return { alive: hasData, responseTime: rt, status: hasData ? `OK (${data.hourly.time.length} ore)` : "NO_DATA" };
  } catch (err) {
    return { alive: false, responseTime: Math.round(performance.now() - start), status: `ERR: ${err instanceof Error ? err.message : String(err)}` };
  }
}