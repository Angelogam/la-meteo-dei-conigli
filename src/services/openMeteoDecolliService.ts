"use client";

// Interfaccia per i dati meteo live di un decollo
export interface DecolloLiveData {
  temperature: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  weatherCode: number;
  cloudCover: number;
  precipitation: number;
  humidity: number;
  pressure: number;
  freezingLevel: number;   // zero termico
  dewPoint: number;
  uvIndex: number;
  visibility: number;
  feelsLike: number;
  isDay: boolean;
}

const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "pressure_msl",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "visibility",
  "is_day",
  "freezing_level_height",
  "shortwave_radiation",
].join(",");

function parseDecolloHourly(raw: any): DecolloLiveData {
  const len = raw.hourly.time.length;
  const now = new Date();
  
  // Trova l'ora corrente nei dati
  let bestIdx = len - 1;
  let bestDiff = Infinity;
  
  for (let i = 0; i < len; i++) {
    const t = new Date(raw.hourly.time[i]);
    const diff = Math.abs(t.getTime() - now.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  
  const idx = bestIdx;
  
  const temperature = raw.hourly.temperature_2m[idx] ?? 15;
  const dewPoint = raw.hourly.dew_point_2m?.[idx] ?? temperature - 8;
  const windSpeed = raw.hourly.wind_speed_10m[idx] ?? 0;
  const windDir = raw.hourly.wind_direction_10m[idx] ?? 0;
  const windGusts = raw.hourly.wind_gusts_10m?.[idx] ?? windSpeed;
  const weatherCode = raw.hourly.weather_code[idx] ?? 0;
  const cloudCover = raw.hourly.cloud_cover[idx] ?? 0;
  const precipitation = raw.hourly.precipitation[idx] ?? 0;
  const humidity = raw.hourly.relative_humidity_2m[idx] ?? 50;
  const pressure = raw.hourly.pressure_msl[idx] ?? 1013;
  const freezingLevel = raw.hourly.freezing_level_height?.[idx] ?? 3000;
  const uvIndex = raw.hourly.uv_index?.[idx] ?? 0;
  const visibility = raw.hourly.visibility?.[idx] ?? 20000;
  const feelsLike = raw.hourly.apparent_temperature?.[idx] ?? temperature;
  const isDay = raw.hourly.is_day?.[idx] === 1;

  return {
    temperature,
    windSpeed,
    windDir,
    windGusts,
    weatherCode,
    cloudCover,
    precipitation,
    humidity,
    pressure,
    freezingLevel,
    dewPoint,
    uvIndex,
    visibility,
    feelsLike,
    isDay,
  };
}

// Cache in memoria per evitare troppe richieste
const cache = new Map<string, { data: DecolloLiveData; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minuti

export async function fetchDecolloLiveData(lat: number, lon: number): Promise<DecolloLiveData> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: HOURLY_PARAMS,
    timezone: "Europe/Rome",
    forecast_days: "1",
    models: "gfs_seamless",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo error: HTTP ${res.status}`);
  }
  
  const raw = await res.json();
  if (!raw.hourly || !raw.hourly.time || raw.hourly.time.length === 0) {
    throw new Error("Nessun dato orario ricevuto da Open-Meteo");
  }
  
  const data = parseDecolloHourly(raw);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

/**
 * Carica i dati live per TUTTI i decolli in parallelo.
 * I decolli che falliscono vengono saltati silenziosamente.
 */
export async function fetchAllDecolliLiveData(
  sites: { id: string; name: string; lat: number; lon: number }[]
): Promise<Record<string, DecolloLiveData>> {
  const results: Record<string, DecolloLiveData> = {};
  
  const promises = sites.map(async (site) => {
    try {
      const data = await fetchDecolloLiveData(site.lat, site.lon);
      results[site.id] = data;
    } catch (err) {
      console.warn(`[Decolli] Dati non disponibili per ${site.name}:`, err);
    }
  });
  
  await Promise.all(promises);
  return results;
}