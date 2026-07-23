"use client";

import { transformHourlyData, transformCurrentData, transformDailyData } from "@/utils/transformMeteo";

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
  capes: number;
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

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL = 300_000; // 5 minuti
const RETRY_MAX = 2;
const RETRY_DELAY = 1500; // 1.5s tra retry
const MIN_REQUEST_INTERVAL = 1200; // 1.2s tra richieste (rispetta rate limit)

const HOURLY_PARAMS = [
  "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
  "precipitation", "precipitation_probability", "weather_code",
  "pressure_msl", "surface_pressure", "cloud_cover", "cloud_cover_low",
  "cloud_cover_mid", "cloud_cover_high", "wind_speed_10m", "wind_direction_10m",
  "wind_gusts_10m", "uv_index", "shortwave_radiation", "direct_radiation",
  "sunshine_duration", "temperature_80m", "temperature_120m",
  "wind_speed_80m", "wind_direction_80m", "wind_speed_120m", "wind_direction_120m",
  "wind_speed_180m", "wind_direction_180m", "wind_speed_300m", "wind_direction_300m",
  "wind_speed_600m", "wind_direction_600m", "wind_speed_1000m", "wind_direction_1000m",
  "wind_speed_1500m", "wind_direction_1500m", "wind_speed_2000m", "wind_direction_2000m",
  "wind_speed_2500m", "wind_direction_2500m", "wind_speed_3000m", "wind_direction_3000m",
  "cape", "convective_inhibition", "lifted_index",
].join(",");

const DAILY_PARAMS = [
  "weather_code", "temperature_2m_max", "temperature_2m_min",
  "apparent_temperature_max", "apparent_temperature_min",
  "sunrise", "sunset", "daylight_duration", "sunshine_duration",
  "uv_index_max", "uv_index_clear_sky_max",
  "precipitation_sum", "rain_sum", "showers_sum", "snowfall_sum",
  "precipitation_hours", "precipitation_probability_max",
  "wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant",
  "shortwave_radiation_sum", "et0_fao_evapotranspiration",
].join(",");

// ---------- CACHE ----------
interface CacheEntry<T> {
  data: T;
  ts: number;
  promise: Promise<T>;
}

const cache = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function cacheSet<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now(), promise: Promise.resolve(data) });
}

function cacheGetPromise<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return Promise.resolve(entry.data);
  }
  // Se c'è già una promise in corso (stessa richiesta in volo), riutilizzala
  if (entry && entry.promise) {
    return entry.promise;
  }
  const promise = factory();
  cache.set(key, { data: null as any, ts: 0, promise });
  promise.then(data => {
    cache.set(key, { data, ts: Date.now(), promise });
  });
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
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return res;
      // 429 o 5xx → retry
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
          continue;
        }
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

// ---------- BUILD WIND PROFILE ----------
function buildWindProfile(rawHourly: Record<string, (number | string)[]>, idx: number): { height: number; speed: number; dir: number }[] {
  const profile: { height: number; speed: number; dir: number }[] = [];
  const levels = [
    { height: 80, speedKey: "wind_speed_80m", dirKey: "wind_direction_80m" },
    { height: 120, speedKey: "wind_speed_120m", dirKey: "wind_direction_120m" },
    { height: 180, speedKey: "wind_speed_180m", dirKey: "wind_direction_180m" },
    { height: 300, speedKey: "wind_speed_300m", dirKey: "wind_direction_300m" },
    { height: 600, speedKey: "wind_speed_600m", dirKey: "wind_direction_600m" },
    { height: 1000, speedKey: "wind_speed_1000m", dirKey: "wind_direction_1000m" },
    { height: 1500, speedKey: "wind_speed_1500m", dirKey: "wind_direction_1500m" },
    { height: 2000, speedKey: "wind_speed_2000m", dirKey: "wind_direction_2000m" },
    { height: 2500, speedKey: "wind_speed_2500m", dirKey: "wind_direction_2500m" },
    { height: 3000, speedKey: "wind_speed_3000m", dirKey: "wind_direction_3000m" },
  ];
  for (const level of levels) {
    const speedArr = rawHourly[level.speedKey];
    const dirArr = rawHourly[level.dirKey];
    if (speedArr && dirArr && typeof speedArr[idx] === "number" && typeof dirArr[idx] === "number") {
      const speed = speedArr[idx] as number;
      const dir = dirArr[idx] as number;
      if (speed >= 0) {
        profile.push({ height: level.height, speed: Math.round(speed * 10) / 10, dir });
      }
    }
  }
  return profile;
}

// ---------- API CALL ----------
async function rawFetch(lat: number, lon: number): Promise<{
  hourly: MeteoHourly[];
  current: MeteoCurrent;
  daily: MeteoDaily[];
  model: string;
}> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: HOURLY_PARAMS,
    daily: DAILY_PARAMS,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    timezone: "Europe/Rome",
    forecast_days: "3",
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
      capes: (hourlyRaw.cape?.[i] as number) ?? 0,
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

// ========================
// ESPORTAZIONE PUBBLICA
// ========================
export const weatherService = {
  /**
   * Recupera i dati meteo con cache e retry.
   * La stessa coppia (lat, lon) non viene richiesta più di una volta ogni CACHE_TTL.
   */
  fetchWeather(lat: number, lon: number): Promise<{
    hourly: MeteoHourly[];
    current: MeteoCurrent;
    daily: MeteoDaily[];
    model: string;
  }> {
    const key = `weather:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    const cached = cacheGet<{
      hourly: MeteoHourly[];
      current: MeteoCurrent;
      daily: MeteoDaily[];
      model: string;
    }>(key);
    if (cached) return Promise.resolve(cached);

    return cacheGetPromise(key, () => rawFetch(lat, lon));
  },

  /**
   * Versione soft di fetchWeather: non lancia mai eccezione (tranne che per errori di programmazione).
   */
  async fetchWithFallback(lat: number, lon: number): Promise<{
    data: { hourly: MeteoHourly[]; current: MeteoCurrent; daily: MeteoDaily[]; model: string } | null;
    ok: boolean;
  }> {
    try {
      const data = await this.fetchWeather(lat, lon);
      return { data, ok: true };
    } catch (err) {
      console.warn(`[weatherService] fetchWithFallback fallito per ${lat},${lon}:`, err);
      return { data: null, ok: false };
    }
  },

  /**
   * Solo current (leggero, per la sidebar dei decolli). Con cache.
   */
  fetchCurrent: async (lat: number, lon: number): Promise<{ data: HourData | null; ok: boolean }> => {
    const key = `current:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    const cached = cacheGet<{ data: HourData | null; ok: boolean }>(key);
    if (cached) return cached;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&forecast_days=1`;

    try {
      await rateLimit();
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { data: null, ok: false };
      const json = await res.json();
      const c = json.current;
      if (!c) return { data: null, ok: false };

      const data: HourData = {
        time: new Date(c.time),
        temperature: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        apparentTemp: c.apparent_temperature,
        precipitation: c.precipitation,
        rain: c.rain,
        showers: c.showers,
        snowfall: c.snowfall,
        weatherCode: c.weather_code,
        pressure: c.pressure_msl,
        surfacePressure: c.surface_pressure,
        cloudCover: c.cloud_cover,
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
      };
      const result = { data, ok: true };
      cacheSet(key, result);
      return result;
    } catch {
      return { data: null, ok: false };
    }
  },

  /**
   * Svuota la cache (utile per forzare refresh).
   */
  clearCache(): void {
    cache.clear();
  },
};