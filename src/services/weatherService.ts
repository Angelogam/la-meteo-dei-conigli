"use client";

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  uvIndex: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  temp80m?: number;
  temp120m?: number;
  shortwaveRadiation: number;
  windProfile?: { height: number; speed: number; dir: number }[];
}

export interface MeteoCurrent {
  time: Date;
  temperature: number;
  humidity: number;
  apparentTemp: number;
  isDay: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  surfacePressure: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
}

export interface MeteoDaily {
  date: Date;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  apparentTempMin: number;
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  sunshineDuration: number;
  uvIndexMax: number;
  uvIndexClearSkyMax: number;
  precipitationSum: number;
  rainSum: number;
  showersSum: number;
  snowfallSum: number;
  precipitationHours: number;
  precipitationProbaMax: number;
  weatherCode: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
  et0Sum: number;
}

export interface MeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: Record<string, string>;
  current: Record<string, number | string>;
  hourly_units: Record<string, string>;
  hourly: Record<string, (number | string)[]>;
  daily_units: Record<string, string>;
  daily: Record<string, (number | string)[]>;
}

export interface HourData {
  time: Date;
  temperature: number;
  humidity: number;
  apparentTemp: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  pressure: number;
  surfacePressure: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  dewPoint: number;
  precipitationProba: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  evapotranspiration: number;
  et0: number;
  vapourPressureDeficit: number;
  soilTemp: number;
  soilMoisture: number;
  uvIndex: number;
  shortwaveRadiation: number;
  directRadiation: number;
  diffuseRadiation: number;
  directNormalIrradiance: number;
  terrestrialRadiation: number;
  sunshineDuration: number;
  windProfile?: { height: number; speed: number; dir: number }[];
  temp80m?: number;
  temp120m?: number;
}

// ---------- CONFIG ----------
const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const FULL_CACHE_TTL = 300_000;       // 5 min full data
const LIGHT_CACHE_TTL = 120_000;      // 2 min light data (sidebar)
const RETRY_MAX = 2;
const RETRY_DELAY = 1500;
const MIN_REQUEST_INTERVAL = 1200;    // rispetta rate limit Open-Meteo

// Parametri FULL (dettaglio decollo selezionato)
const FULL_HOURLY = [
  "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
  "precipitation", "precipitation_probability", "weather_code",
  "pressure_msl", "surface_pressure", "cloud_cover", "cloud_cover_low",
  "cloud_cover_mid", "cloud_cover_high", "wind_speed_10m", "wind_direction_10m",
  "wind_gusts_10m", "uv_index", "shortwave_radiation", "direct_radiation",
  "sunshine_duration", "temperature_80m", "temperature_120m",
  "wind_speed_80m", "wind_direction_80m", "wind_speed_120m", "wind_direction_120m",
  "wind_speed_180m", "wind_direction_180m",
  "cape", "convective_inhibition", "lifted_index",
].join(",");

const FULL_DAILY = [
  "weather_code", "temperature_2m_max", "temperature_2m_min",
  "apparent_temperature_max", "apparent_temperature_min",
  "sunrise", "sunset", "daylight_duration", "sunshine_duration",
  "uv_index_max", "uv_index_clear_sky_max",
  "precipitation_sum", "rain_sum", "showers_sum", "snowfall_sum",
  "precipitation_hours", "precipitation_probability_max",
  "wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant",
  "shortwave_radiation_sum", "et0_fao_evapotranspiration",
].join(",");

// Parametri LIGHT (sidebar – solo per capire se un decollo è volabile)
const LIGHT_CURRENT = [
  "temperature_2m", "relative_humidity_2m", "apparent_temperature",
  "precipitation", "rain", "showers", "snowfall",
  "weather_code", "cloud_cover", "pressure_msl", "wind_speed_10m",
  "wind_direction_10m", "wind_gusts_10m",
].join(",");

// ---------- CACHE ----------
interface CacheEntry<T> {
  data: T;
  ts: number;
  promise?: Promise<T>;
}

const cache = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttl) return entry.data;
  return null;
}

function cacheSet<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

function cacheDedup<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.promise) return entry.promise;
  const promise = factory().then(data => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
  cache.set(key, { data: null as any, ts: 0, promise });
  return promise;
}

// ---------- RATE LIMITER ----------
let lastRequest = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
}

// ---------- RETRY ----------
async function fetchWithRetry(url: string, retries = RETRY_MAX): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Fetch failed after retries");
}

// ---------- WIND PROFILE ----------
function buildWindProfile(rawHourly: Record<string, (number | string)[]>, idx: number): { height: number; speed: number; dir: number }[] {
  const profile: { height: number; speed: number; dir: number }[] = [];
  const levels = [
    { height: 80, speedKey: "wind_speed_80m", dirKey: "wind_direction_80m" },
    { height: 120, speedKey: "wind_speed_120m", dirKey: "wind_direction_120m" },
    { height: 180, speedKey: "wind_speed_180m", dirKey: "wind_direction_180m" },
  ];
  for (const level of levels) {
    const speedArr = rawHourly[level.speedKey];
    const dirArr = rawHourly[level.dirKey];
    if (speedArr && dirArr && typeof speedArr[idx] === "number" && typeof dirArr[idx] === "number") {
      const speed = speedArr[idx] as number;
      const dir = dirArr[idx] as number;
      if (speed >= 0) profile.push({ height: level.height, speed: Math.round(speed * 10) / 10, dir });
    }
  }
  return profile;
}

// ---------- FULL FETCH (2 giorni invece di 3) ----------
async function rawFetchFull(lat: number, lon: number) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: FULL_HOURLY,
    daily: FULL_DAILY,
    current: [
      "temperature_2m", "relative_humidity_2m", "apparent_temperature",
      "is_day", "precipitation", "rain", "showers", "snowfall",
      "weather_code", "cloud_cover", "pressure_msl", "surface_pressure",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
    ].join(","),
    timezone: "Europe/Rome",
    forecast_days: "2", // invece di 3
  });

  await rateLimit();
  const res = await fetchWithRetry(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Open-Meteo HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const raw: MeteoResponse = await res.json();
  const hourlyRaw = raw.hourly;
  const dailyRaw = raw.daily;
  const currentRaw = raw.current;

  const hourly: MeteoHourly[] = [];
  const len = hourlyRaw.time.length;
  for (let i = 0; i < len; i++) {
    hourly.push({
      time: new Date(hourlyRaw.time[i]),
      temperature: hourlyRaw.temperature_2m[i] as number,
      humidity: hourlyRaw.relative_humidity_2m[i] as number,
      dewPoint: (hourlyRaw.dew_point_2m?.[i] as number) ?? 10,
      apparentTemp: hourlyRaw.apparent_temperature[i] as number,
      precipitationProbability: (hourlyRaw.precipitation_probability?.[i] as number) ?? 0,
      precipitation: hourlyRaw.precipitation[i] as number,
      weatherCode: hourlyRaw.weather_code[i] as number,
      cloudCover: hourlyRaw.cloud_cover[i] as number,
      windSpeed: hourlyRaw.wind_speed_10m[i] as number,
      windDir: hourlyRaw.wind_direction_10m[i] as number,
      windGusts: (hourlyRaw.wind_gusts_10m?.[i] as number) ?? 0,
      uvIndex: (hourlyRaw.uv_index?.[i] as number) ?? 0,
      cape: (hourlyRaw.cape?.[i] as number) ?? 0,
      cin: (hourlyRaw.convective_inhibition?.[i] as number) ?? 0,
      liftedIndex: (hourlyRaw.lifted_index?.[i] as number) ?? 0,
      temp80m: (hourlyRaw.temperature_80m?.[i] as number) ?? undefined,
      temp120m: (hourlyRaw.temperature_120m?.[i] as number) ?? undefined,
      shortwaveRadiation: (hourlyRaw.shortwave_radiation?.[i] as number) ?? 0,
      windProfile: buildWindProfile(hourlyRaw, i),
    });
  }

  const current: MeteoCurrent = {
    time: new Date(currentRaw.time),
    temperature: currentRaw.temperature_2m as number,
    humidity: currentRaw.relative_humidity_2m as number,
    apparentTemp: currentRaw.apparent_temperature as number,
    isDay: currentRaw.is_day as number,
    precipitation: currentRaw.precipitation as number,
    rain: currentRaw.rain as number,
    showers: currentRaw.showers as number,
    snowfall: currentRaw.snowfall as number,
    weatherCode: currentRaw.weather_code as number,
    cloudCover: currentRaw.cloud_cover as number,
    pressure: currentRaw.pressure_msl as number,
    surfacePressure: currentRaw.surface_pressure as number,
    windSpeed: currentRaw.wind_speed_10m as number,
    windDir: currentRaw.wind_direction_10m as number,
    windGusts: currentRaw.wind_gusts_10m as number,
  };

  const daily: MeteoDaily[] = [];
  const dailyLen = dailyRaw.time.length;
  for (let i = 0; i < dailyLen; i++) {
    daily.push({
      date: new Date(dailyRaw.time[i]),
      tempMax: dailyRaw.temperature_2m_max[i] as number,
      tempMin: dailyRaw.temperature_2m_min[i] as number,
      apparentTempMax: dailyRaw.apparent_temperature_max[i] as number,
      apparentTempMin: dailyRaw.apparent_temperature_min[i] as number,
      sunrise: dailyRaw.sunrise[i] as string,
      sunset: dailyRaw.sunset[i] as string,
      daylightDuration: dailyRaw.daylight_duration[i] as number,
      sunshineDuration: dailyRaw.sunshine_duration[i] as number,
      uvIndexMax: dailyRaw.uv_index_max[i] as number,
      uvIndexClearSkyMax: dailyRaw.uv_index_clear_sky_max[i] as number,
      precipitationSum: dailyRaw.precipitation_sum[i] as number,
      rainSum: dailyRaw.rain_sum[i] as number,
      showersSum: dailyRaw.showers_sum[i] as number,
      snowfallSum: dailyRaw.snowfall_sum[i] as number,
      precipitationHours: dailyRaw.precipitation_hours[i] as number,
      precipitationProbaMax: dailyRaw.precipitation_probability_max[i] as number,
      weatherCode: dailyRaw.weather_code[i] as number,
      windSpeedMax: dailyRaw.wind_speed_10m_max[i] as number,
      windGustsMax: dailyRaw.wind_gusts_10m_max[i] as number,
      windDirDominant: dailyRaw.wind_direction_10m_dominant[i] as number,
      shortwaveRadiationSum: dailyRaw.shortwave_radiation_sum[i] as number,
      et0Sum: dailyRaw.et0_fao_evapotranspiration[i] as number,
    });
  }

  return { hourly, current, daily, model: "auto" };
}

// ---------- LIGHTWEIGHT CURRENT (solo current, nessun hourly/daily) ----------
async function rawFetchCurrent(lat: number, lon: number) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: LIGHT_CURRENT,
    timezone: "auto",
  });

  await rateLimit();
  const res = await fetchWithRetry(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) return null;

  const json = await res.json();
  const c = json.current;
  if (!c) return null;

  return {
    time: new Date(c.time),
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    apparentTemp: c.apparent_temperature,
    precipitation: c.precipitation,
    rain: c.rain,
    showers: c.showers,
    snowfall: c.snowfall,
    weatherCode: c.weather_code,
    cloudCover: c.cloud_cover,
    pressure: c.pressure_msl,
    surfacePressure: 0,
    windSpeed: c.wind_speed_10m,
    windDir: c.wind_direction_10m,
    windGusts: c.wind_gusts_10m,
    dewPoint: 0,
    precipitationProba: 0,
    cloudCoverLow: 0,
    cloudCoverMid: 0,
    cloudCoverHigh: 0,
    evapotranspiration: 0,
    et0: 0,
    vapourPressureDeficit: 0,
    soilTemp: 0,
    soilMoisture: 0,
    uvIndex: 0,
    shortwaveRadiation: 0,
    directRadiation: 0,
    diffuseRadiation: 0,
    directNormalIrradiance: 0,
    terrestrialRadiation: 0,
    sunshineDuration: 0,
    windProfile: undefined,
    temp80m: undefined,
    temp120m: undefined,
  } as HourData;
}

// ---------- BATCH CURRENT ----------
let batchQueue: Array<{
  id: string;
  lat: number;
  lon: number;
  resolve: (d: HourData | null) => void;
}> = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function batchCurrent(id: string, lat: number, lon: number): Promise<HourData | null> {
  return new Promise(resolve => {
    batchQueue.push({ id, lat, lon, resolve });

    if (!batchTimer) {
      batchTimer = setTimeout(async () => {
        const queue = [...batchQueue];
        batchQueue = [];
        batchTimer = null;

        // Esegue tutte le richieste in parallelo (con rate limit gestito internamente)
        const results = await Promise.allSettled(
          queue.map(item => rawFetchCurrent(item.lat, item.lon))
        );

        results.forEach((result, i) => {
          queue[i].resolve(result.status === "fulfilled" ? result.value : null);
        });
      }, 50); // batch window di 50ms
    }
  });
}

// ========================
// ESPORTAZIONE PUBBLICA
// ========================
export const weatherService = {
  /**
   * Dati completi per un decollo (cache 5 minuti, 2 giorni di previsione)
   */
  fetchWeather(lat: number, lon: number) {
    const key = `full:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    const cached = cacheGet<ReturnType<typeof rawFetchFull> extends Promise<infer T> ? T : never>(key, FULL_CACHE_TTL);
    if (cached) return Promise.resolve(cached);
    return cacheDedup(key, () => rawFetchFull(lat, lon));
  },

  /**
   * Versione sicura (non lancia eccezioni)
   */
  async fetchWithFallback(lat: number, lon: number) {
    try {
      const data = await this.fetchWeather(lat, lon);
      return { data, ok: true };
    } catch (err) {
      console.warn(`[weatherService] fallito per ${lat},${lon}:`, err);
      return { data: null, ok: false };
    }
  },

  /**
   * Solo current (molto più leggero, cache 2 minuti, batched)
   */
  async fetchCurrent(lat: number, lon: number) {
    const key = `light:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    const cached = cacheGet<{ data: HourData | null; ok: boolean }>(key, LIGHT_CACHE_TTL);
    if (cached) return cached;

    const data = await batchCurrent(key, lat, lon);
    const result = { data, ok: data != null };
    if (data) cacheSet(key, result);
    return result;
  },

  /** Svuota cache */
  clearCache() {
    cache.clear();
  },
};