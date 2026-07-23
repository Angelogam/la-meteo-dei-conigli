"use client";

// =====================================================
// weatherService — UNICO punto di accesso alle API meteo
// =====================================================
// - Cache a due livelli: full (5min) / light (2min)
// - Batch per richieste current (sidebar)
// - Dedup automatico delle richieste in corso
// - Stale-while-revalidate (10 min fallback)
// - Rate limiter a 1s
// - Semaforo: max 6 richieste full contemporanee
// - Metodi dedicati: fetchWeather, fetchCurrent, fetchManyCurrent, fetchWindProfile
// =====================================================

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
const FULL_CACHE_TTL = 300_000;
const LIGHT_CACHE_TTL = 120_000;
const STALE_TTL = 600_000;
const RETRY_MAX = 2;
const RETRY_DELAY = 1500;
const MIN_REQUEST_INTERVAL = 1000;
const MAX_CONCURRENT = 6;

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

const LIGHT_CURRENT = [
  "temperature_2m", "relative_humidity_2m", "apparent_temperature",
  "precipitation", "rain", "showers", "snowfall",
  "weather_code", "cloud_cover", "pressure_msl", "wind_speed_10m",
  "wind_direction_10m", "wind_gusts_10m",
].join(",");

const WIND_HOURLY = [
  "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
  "wind_speed_80m", "wind_direction_80m",
  "wind_speed_120m", "wind_direction_120m",
  "wind_speed_180m", "wind_direction_180m",
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

function cacheGetStale<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < STALE_TTL) return entry.data;
  return null;
}

function cacheSet<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

function cacheDedup<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry?.promise) return entry.promise;
  const promise = factory().then(data => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  }).catch(err => {
    cache.delete(key);
    const stale = cacheGetStale<T>(key);
    if (stale) return stale;
    throw err;
  });
  cache.set(key, { data: null as any, ts: 0, promise });
  return promise;
}

function cacheKey(lat: number, lon: number, prefix: string): string {
  return `${prefix}:${lat.toFixed(4)}:${lon.toFixed(4)}`;
}

// ---------- RATE LIMITER ----------
let lastRequest = 0;
let concurrentCount = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
}

const fullQueue: Array<() => void> = [];

async function acquireFullSlot(): Promise<void> {
  if (concurrentCount < MAX_CONCURRENT) {
    concurrentCount++;
    return;
  }
  await new Promise<void>(resolve => {
    fullQueue.push(() => { concurrentCount++; resolve(); });
  });
}

function releaseFullSlot(): void {
  concurrentCount--;
  const next = fullQueue.shift();
  if (next) next();
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

// ---------- BUILD WIND PROFILE ----------
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

// ========================
// FULL FETCH (2 giorni)
// ========================
async function rawFetchFull(lat: number, lon: number) {
  await acquireFullSlot();
  try {
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
      forecast_days: "2",
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
  } finally {
    releaseFullSlot();
  }
}

// ========================
// LIGHT CURRENT (solo current, per sidebar)
// ========================
async function rawFetchCurrent(lat: number, lon: number): Promise<HourData | null> {
  try {
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
      dewPoint: 0, precipitationProba: 0, cloudCoverLow: 0, cloudCoverMid: 0, cloudCoverHigh: 0,
      evapotranspiration: 0, et0: 0, vapourPressureDeficit: 0,
      soilTemp: 0, soilMoisture: 0, uvIndex: 0,
      shortwaveRadiation: 0, directRadiation: 0, diffuseRadiation: 0,
      directNormalIrradiance: 0, terrestrialRadiation: 0, sunshineDuration: 0,
      windProfile: undefined, temp80m: undefined, temp120m: undefined,
    } as HourData;
  } catch {
    return null;
  }
}

// ========================
// BATCH CURRENT
// ========================
let batchQueue: Array<{
  id: string;
  lat: number;
  lon: number;
  resolve: (d: HourData | null) => void;
}> = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let batchInFlight = false;

function batchCurrent(id: string, lat: number, lon: number): Promise<HourData | null> {
  return new Promise(resolve => {
    batchQueue.push({ id, lat, lon, resolve });
    if (!batchTimer && !batchInFlight) {
      batchTimer = setTimeout(() => { batchTimer = null; flushBatch(); }, 50);
    }
  });
}

async function flushBatch(): Promise<void> {
  if (batchInFlight) return;
  batchInFlight = true;
  const queue = [...batchQueue];
  batchQueue = [];

  try {
    const results: (HourData | null)[] = [];
    for (let i = 0; i < queue.length; i += MAX_CONCURRENT) {
      const chunk = queue.slice(i, i + MAX_CONCURRENT);
      const chunkResults = await Promise.allSettled(
        chunk.map(item => rawFetchCurrent(item.lat, item.lon))
      );
      for (const result of chunkResults) {
        results.push(result.status === "fulfilled" ? result.value : null);
      }
    }
    results.forEach((data, i) => queue[i].resolve(data));
  } finally {
    batchInFlight = false;
    if (batchQueue.length > 0) flushBatch();
  }
}

// ========================
// WIND PROFILE (solo venti)
// ========================
export interface WindProfileResult {
  ventoOrario: {
    ora: number;
    quote: Record<number, { speed: number; dir: number }>;
    gust: number;
  }[];
}

async function rawFetchWindProfile(lat: number, lon: number, day: string): Promise<WindProfileResult | null> {
  try {
    await rateLimit();
    const res = await fetchWithRetry(
      `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=${WIND_HOURLY}&timezone=Europe/Rome&start_date=${day}&end_date=${day}`
    );
    if (!res.ok) return null;
    const raw = await res.json();
    const hours: string[] = raw.hourly.time;
    const speeds10: number[] = raw.hourly.wind_speed_10m;
    const dirs10: number[] = raw.hourly.wind_direction_10m;
    const gusts: number[] = raw.hourly.wind_gusts_10m;
    const speeds80: number[] = raw.hourly.wind_speed_80m;
    const dirs80: number[] = raw.hourly.wind_direction_80m;
    const speeds120: number[] = raw.hourly.wind_speed_120m;
    const dirs120: number[] = raw.hourly.wind_direction_120m;
    const speeds180: number[] = raw.hourly.wind_speed_180m;
    const dirs180: number[] = raw.hourly.wind_direction_180m;

    const livelli: { quota: number; speeds: number[]; dirs: number[] }[] = [
      { quota: 10, speeds: speeds10, dirs: dirs10 },
      { quota: 80, speeds: speeds80, dirs: dirs80 },
      { quota: 120, speeds: speeds120, dirs: dirs120 },
      { quota: 180, speeds: speeds180, dirs: dirs180 },
    ];

    const ventoOrario: WindProfileResult["ventoOrario"] = [];
    for (let i = 0; i < hours.length; i++) {
      const ora = Number(hours[i].split("T")[1].split(":")[0]);
      if (ora >= 9 && ora <= 19) {
        const quote: Record<number, { speed: number; dir: number }> = {};
        for (const l of livelli) {
          if (l.speeds[i] != null && l.dirs[i] != null) {
            quote[l.quota] = { speed: Math.round(l.speeds[i]), dir: Math.round(l.dirs[i]) };
          }
        }
        if (Object.keys(quote).length > 0) {
          ventoOrario.push({ ora, quote, gust: Math.round(gusts[i]) });
        }
      }
    }
    return { ventoOrario };
  } catch {
    return null;
  }
}

// ========================
// ESPORTAZIONE PUBBLICA
// ========================
export const weatherService = {
  /**
   * Dati completi (hourly + daily + current) per un decollo
   * Cache: 5 minuti
   * Fallback: fino a 10 min (se API non risponde)
   */
  fetchWeather(lat: number, lon: number) {
    const key = cacheKey(lat, lon, "full");
    const cached = cacheGet<Awaited<ReturnType<typeof rawFetchFull>>>(key, FULL_CACHE_TTL);
    if (cached) return Promise.resolve(cached);
    return cacheDedup(key, () => rawFetchFull(lat, lon));
  },

  /**
   * Versione sicura (restituisce {data, ok}, mai eccezioni)
   */
  async fetchWithFallback(lat: number, lon: number): Promise<{
    data: { hourly: MeteoHourly[]; current: MeteoCurrent; daily: MeteoDaily[]; model: string } | null;
    ok: boolean;
  }> {
    try {
      const data = await this.fetchWeather(lat, lon);
      return { data, ok: true };
    } catch {
      return { data: null, ok: false };
    }
  },

  /**
   * Solo current (ultra-leggero, per sidebar)
   * Cache: 2 minuti
   * Batch: raggruppa più richieste in finestra 50ms
   */
  async fetchCurrent(lat: number, lon: number): Promise<{ data: HourData | null; ok: boolean }> {
    const key = cacheKey(lat, lon, "light");
    const cached = cacheGet<{ data: HourData | null; ok: boolean }>(key, LIGHT_CACHE_TTL);
    if (cached) return cached;
    const data = await batchCurrent(key, lat, lon);
    const result = { data, ok: data != null };
    if (data) cacheSet(key, result);
    return result;
  },

  /**
   * Carica current per MULTIPLI siti in un unico batch
   * Usato da DecolliCard per la sidebar
   */
  async fetchManyCurrent(coords: { lat: number; lon: number }[]): Promise<Record<string, { data: HourData | null; ok: boolean }>> {
    const results: Record<string, { data: HourData | null; ok: boolean }> = {};
    const promises = coords.map(async (c) => {
      const key = cacheKey(c.lat, c.lon, "light");
      const cached = cacheGet<{ data: HourData | null; ok: boolean }>(key, LIGHT_CACHE_TTL);
      if (cached) { results[key] = cached; return; }
      const data = await batchCurrent(key, c.lat, c.lon);
      const result = { data, ok: data != null };
      if (data) cacheSet(key, result);
      results[key] = result;
    });
    await Promise.all(promises);
    return results;
  },

  /**
   * Profilo vento verticale per un giorno specifico
   * Sostituisce getVento.ts e getVentiInterpolati.ts
   * Cache: 5 minuti
   */
  async fetchWindProfile(lat: number, lon: number, day: string): Promise<WindProfileResult | null> {
    const key = `wind:${lat.toFixed(4)}:${lon.toFixed(4)}:${day}`;
    const cached = cacheGet<WindProfileResult>(key, FULL_CACHE_TTL);
    if (cached) return cached;
    const data = await cacheDedup(key, () => rawFetchWindProfile(lat, lon, day));
    return data;
  },

  /** Svuota tutta la cache */
  clearCache(): void {
    cache.clear();
  },

  /** Statistiche cache (debug) */
  getCacheStats(): { size: number; keys: string[] } {
    return { size: cache.size, keys: Array.from(cache.keys()) };
  },
};