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

export interface MeteoLight {
  time: Date;
  temperature: number;
  windSpeed: number;
  windDir: number;
  weatherCode: number;
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

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const FALLBACK_URLS = [
  "https://api.open-meteo.com/v1/forecast",
  "https://api.meteomatics.com/v1/forecast", // placeholder per future
];

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

const HOURLY_LIGHT_PARAMS = [
  "temperature_2m", "weather_code", "wind_speed_10m", "wind_direction_10m",
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

const CACHE_TTL = {
  full: 10 * 60 * 1000,      // 10 minuti per dati completi
  light: 5 * 60 * 1000,      // 5 minuti per dati leggeri
  current: 2 * 60 * 1000,    // 2 minuti per current
  daily: 30 * 60 * 1000,     // 30 minuti per daily
};

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

// In-memory cache per request deduplication
const pendingRequests = new Map<string, PendingRequest<any>>();

// IndexedDB cache per persistenza
const DB_NAME = "MeteoCache";
const DB_VERSION = 1;
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB not available"));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("weather")) {
          db.createObjectStore("weather");
        }
      };
    });
  }
  return dbPromise;
}

async function getFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("weather", "readonly");
      const store = transaction.objectStore("weather");
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        if (entry && entry.expiresAt > Date.now()) {
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    // Fallback a localStorage
    try {
      const stored = localStorage.getItem(`meteo_cache_${key}`);
      if (stored) {
        const entry = JSON.parse(stored) as CacheEntry<T>;
        if (entry.expiresAt > Date.now()) return entry.data;
      }
    } catch {}
    return null;
  }
}

async function setInIndexedDB<T>(key: string, data: T, ttl: number): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  };
  try {
    const db = await getDB();
    const transaction = db.transaction("weather", "readwrite");
    const store = transaction.objectStore("weather");
    store.put(entry, key);
  } catch {
    // Fallback a localStorage
    try {
      localStorage.setItem(`meteo_cache_${key}`, JSON.stringify(entry));
    } catch {}
  }
}

function buildCacheKey(lat: number, lon: number, type: string, params: string): string {
  return `${type}_${lat.toFixed(4)}_${lon.toFixed(4)}_${btoa(params).slice(0, 20)}`;
}

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

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate, br",
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) return response;
      
      if (response.status >= 500 || response.status === 429) {
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        // Errori 4xx non retry
        return response;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    
    if (attempt < retries) {
      const delay = BASE_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

async function tryFallbackApis(lat: number, lon: number, params: URLSearchParams): Promise<MeteoResponse | null> {
  // Prova Open-Meteo principale
  try {
    const url = `${BASE_URL}?${params.toString()}`;
    const response = await fetchWithRetry(url);
    if (response.ok) return await response.json();
  } catch {}
  
  // Fallback: 7Timer! (solo parametri base)
  try {
    const url = `https://www.7timer.info/bin/astro.php?lon=${lon}&lat=${lat}&ac=0&unit=metric&output=json&tzshift=0`;
    const response = await fetchWithRetry(url, {}, 1);
    if (response.ok) {
      const data = await response.json();
      // Converte formato 7Timer in formato Open-Meteo compatibile
      return convert7TimerToOpenMeteo(data, lat, lon);
    }
  } catch {}
  
  return null;
}

function convert7TimerToOpenMeteo(data: any, lat: number, lon: number): MeteoResponse {
  // Conversione semplificata - in produzione servirebbe mapping completo
  return {
    latitude: lat,
    longitude: lon,
    generationtime_ms: 0,
    utc_offset_seconds: 3600,
    timezone: "Europe/Rome",
    timezone_abbreviation: "CET",
    elevation: 0,
    current_units: {},
    current: {},
    hourly_units: {},
    hourly: { time: [], temperature_2m: [], weather_code: [], wind_speed_10m: [], wind_direction_10m: [] },
    daily_units: {},
    daily: { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [] },
  };
}

function validateResponse(raw: MeteoResponse): boolean {
  return !!(
    raw.hourly?.time?.length &&
    raw.daily?.time?.length &&
    raw.current &&
    typeof raw.current.temperature_2m === "number"
  );
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<{
    hourly: MeteoHourly[];
    current: MeteoCurrent;
    daily: MeteoDaily[];
    model: string;
    fromCache: boolean;
  }> {
    const cacheKey = buildCacheKey(lat, lon, "full", HOURLY_PARAMS + DAILY_PARAMS);
    
    // 1. Controlla cache IndexedDB
    const cached = await getFromIndexedDB<{
      hourly: MeteoHourly[];
      current: MeteoCurrent;
      daily: MeteoDaily[];
      model: string;
    }>(cacheKey);
    
    if (cached) {
      return { ...cached, fromCache: true };
    }
    
    // 2. Deduplicazione: se c'è già una richiesta in corso, aspetta quella
    const pendingKey = `pending_${cacheKey}`;
    if (pendingRequests.has(pendingKey)) {
      const pending = pendingRequests.get(pendingKey)!;
      if (Date.now() - pending.timestamp < 30000) { // max 30s
        try {
          const result = await pending.promise;
          return { ...result, fromCache: false };
        } catch {}
      }
    }
    
    // 3. Nuova richiesta
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: HOURLY_PARAMS,
      daily: DAILY_PARAMS,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      timezone: "Europe/Rome",
      forecast_days: "3",
    });
    
    const requestPromise = (async () => {
      const raw = await tryFallbackApis(lat, lon, params);
      
      if (!raw || !validateResponse(raw)) {
        throw new Error("All weather APIs failed or returned invalid data");
      }
      
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
      
      const result = { hourly, current, daily, model: "auto" };
      
      // Salva in cache
      await setInIndexedDB(cacheKey, result, CACHE_TTL.full);
      
      return result;
    })();
    
    pendingRequests.set(pendingKey, { promise: requestPromise, timestamp: Date.now() });
    
    try {
      const result = await requestPromise;
      pendingRequests.delete(pendingKey);
      return { ...result, fromCache: false };
    } catch (err) {
      pendingRequests.delete(pendingKey);
      throw err;
    }
  },

  async fetchWithFallback(lat: number, lon: number): Promise<{
    data: { hourly: MeteoHourly[]; current: MeteoCurrent; daily: MeteoDaily[]; model: string } | null;
    ok: boolean;
    fromCache: boolean;
  }> {
    try {
      const result = await this.fetchWeather(lat, lon);
      return { data: result, ok: true, fromCache: result.fromCache };
    } catch (err) {
      console.warn(`[weatherService] fetchWithFallback fallito per ${lat},${lon}:`, err);
      return { data: null, ok: false, fromCache: false };
    }
  },

  async fetchLight(lat: number, lon: number): Promise<{
    data: MeteoLight | null;
    ok: boolean;
    fromCache: boolean;
  }> {
    const cacheKey = buildCacheKey(lat, lon, "light", HOURLY_LIGHT_PARAMS);
    
    const cached = await getFromIndexedDB<MeteoLight>(cacheKey);
    if (cached) return { data: cached, ok: true, fromCache: true };
    
    const pendingKey = `pending_${cacheKey}`;
    if (pendingRequests.has(pendingKey)) {
      const pending = pendingRequests.get(pendingKey)!;
      if (Date.now() - pending.timestamp < 15000) {
        try {
          const result = await pending.promise;
          return { ...result, fromCache: false };
        } catch {}
      }
    }
    
    const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=${HOURLY_LIGHT_PARAMS}&timezone=Europe/Rome&forecast_days=1`;
    
    const requestPromise = (async () => {
      const response = await fetchWithRetry(url);
      if (!response.ok) return { data: null, ok: false };
      
      const json = await response.json();
      const h = json.hourly;
      if (!h || !h.time || h.time.length === 0) return { data: null, ok: false };
      
      const now = new Date();
      const nowHour = now.getHours();
      let idx = h.time.findIndex((t: string) => {
        const d = new Date(t);
        return d.getHours() === nowHour;
      });
      if (idx === -1) idx = 0;
      
      const data: MeteoLight = {
        time: new Date(h.time[idx]),
        temperature: h.temperature_2m[idx] as number,
        windSpeed: h.wind_speed_10m[idx] as number,
        windDir: h.wind_direction_10m[idx] as number,
        weatherCode: h.weather_code[idx] as number,
      };
      
      await setInIndexedDB(cacheKey, data, CACHE_TTL.light);
      return { data, ok: true };
    })();
    
    pendingRequests.set(pendingKey, { promise: requestPromise, timestamp: Date.now() });
    
    try {
      const result = await requestPromise;
      pendingRequests.delete(pendingKey);
      return { ...result, fromCache: false };
    } catch (err) {
      pendingRequests.delete(pendingKey);
      return { data: null, ok: false, fromCache: false };
    }
  },

  fetchCurrent: async (lat: number, lon: number): Promise<{ data: HourData | null; ok: boolean; fromCache: boolean }> => {
    const cacheKey = buildCacheKey(lat, lon, "current", "current");
    
    const cached = await getFromIndexedDB<HourData>(cacheKey);
    if (cached) return { data: cached, ok: true, fromCache: true };
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&forecast_days=1`;
    
    try {
      const response = await fetchWithRetry(url);
      if (!response.ok) return { data: null, ok: false, fromCache: false };
      
      const json = await response.json();
      const c = json.current;
      if (!c) return { data: null, ok: false, fromCache: false };
      
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
      
      await setInIndexedDB(cacheKey, data, CACHE_TTL.current);
      return { data, ok: true, fromCache: false };
    } catch {
      return { data: null, ok: false, fromCache: false };
    }
  },

  // Nuovo: preload per decolli vicini
  async preloadNearby(lat: number, lon: number, radiusKm: number = 50): Promise<void> {
    // In una vera implementazione, qui si farebbe una query a un database di decolli
    // Per ora è un placeholder per future estensioni
  },

  // Nuovo: clear cache
  async clearCache(): Promise<void> {
    try {
      const db = await getDB();
      const transaction = db.transaction("weather", "readwrite");
      const store = transaction.objectStore("weather");
      store.clear();
    } catch {
      // Clear localStorage fallback
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("meteo_cache_")) localStorage.removeItem(key);
      });
    }
    pendingRequests.clear();
  },

  // Nuovo: get cache stats
  async getCacheStats(): Promise<{ entries: number; size: number; oldest: number; newest: number }> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const transaction = db.transaction("weather", "readonly");
        const store = transaction.objectStore("weather");
        const request = store.getAll();
        request.onsuccess = () => {
          const entries = request.result as CacheEntry<any>[];
          const now = Date.now();
          const valid = entries.filter(e => e.expiresAt > now);
          resolve({
            entries: valid.length,
            size: JSON.stringify(valid).length,
            oldest: valid.length ? Math.min(...valid.map(e => e.timestamp)) : 0,
            newest: valid.length ? Math.max(...valid.map(e => e.timestamp)) : 0,
          });
        };
        request.onerror = () => resolve({ entries: 0, size: 0, oldest: 0, newest: 0 });
      });
    } catch {
      return { entries: 0, size: 0, oldest: 0, newest: 0 };
    }
  },
};