"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Parametri base — SOLO i fondamentali, niente parametri in quota
const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "precipitation_probability",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "shortwave_radiation",
  "cape",
  "convective_inhibition",
  "lifted_index",
].join(",");

// Richiesta separata per il profilo vento in quota
const WIND_PROFILE_PARAMS = [
  "temperature_80m",
  "temperature_120m",
  "wind_speed_80m", "wind_direction_80m",
  "wind_speed_120m", "wind_direction_120m",
  "wind_speed_300m", "wind_direction_300m",
  "wind_speed_600m", "wind_direction_600m",
  "wind_speed_1000m", "wind_direction_1000m",
  "wind_speed_1500m", "wind_direction_1500m",
  "wind_speed_2000m", "wind_direction_2000m",
  "wind_speed_2500m", "wind_direction_2500m",
  "wind_speed_3000m", "wind_direction_3000m",
].join(",");

const CURRENT_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "daylight_duration",
  "sunshine_duration",
  "uv_index_max",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
].join(",");

const CACHE_TTL = 3 * 60 * 1000; // 3 minuti
const requestCache = new Map<string, { data: any; ts: number }>();
const pendingRequests = new Map<string, Promise<any>>();

function cacheKey(lat: number, lon: number, type: string) {
  return `${lat.toFixed(4)},${lon.toFixed(4)}:${type}`;
}

function getCached(key: string) {
  const entry = requestCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate limiter globale: massimo 1 richiesta ogni 1.5 secondi
let lastRequestTime = 0;
async function rateLimit() {
  const now = Date.now();
  const wait = Math.max(0, 1500 - (now - lastRequestTime));
  if (wait > 0) await delay(wait);
  lastRequestTime = Date.now();
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    await rateLimit();
    if (attempt > 0) await delay(attempt * 2000);
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 429 && attempt < retries) {
        console.warn(`429 alla richiesta, tento di nuovo tra ${(attempt + 1) * 2}s...`);
        continue;
      }
      throw new Error(`Errore Open-Meteo: ${res.status}`);
    } catch (err) {
      if (attempt === retries) throw err;
    }
  }
  throw new Error(`Errore Open-Meteo dopo ${retries} tentativi`);
}

function safeGet(arr: any[], index: number): any {
  return (arr && arr.length > index) ? (arr[index] ?? 0) : 0;
}

function safeGetStr(arr: any[], index: number): string {
  return (arr && arr.length > index) ? String(arr[index] ?? "") : "";
}

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  uvIndex: number;
  shortwaveRadiation: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  // Profilo vento (opzionale — arriva da richiesta separata o stima locale)
  windProfile?: { height: number; speed: number; dir: number }[];
}

export interface MeteoDaily {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  apparentTempMin: number;
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  sunshineDuration: number;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
}

export interface MeteoCurrent {
  time: Date;
  temperature: number;
  humidity: number;
  apparentTemp: number;
  isDay: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  surfacePressure: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
}

export interface MeteoResponse {
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
  current: MeteoCurrent;
  lat: number;
  lon: number;
  elevation: number;
  timezone: string;
  model: string;
}

function computeWindProfile(surfaceSpeed: number, surfaceDir: number): { height: number; speed: number; dir: number }[] {
  const levels = [
    { height: 80 },
    { height: 120 },
    { height: 300 },
    { height: 600 },
    { height: 1000 },
    { height: 1500 },
    { height: 2000 },
    { height: 2500 },
    { height: 3000 },
  ];
  return levels.map(l => {
    const factor = 1 + (l.height / 500) * 0.4;
    const speed = Math.round(Math.min(surfaceSpeed * factor, 60) * 10) / 10;
    const rot = Math.round((l.height / 500) * 10);
    const dir = (surfaceDir + rot) % 360;
    return { height: l.height, speed, dir };
  });
}

function parseMeteoResponse(raw: any, lat: number, lon: number, model: string): MeteoResponse {
  const hourly: MeteoHourly[] = (raw.hourly?.time || []).map((t: string, i: number) => {
    // Cerca di estrarre profilo vento se presente
    const ws80m = raw.hourly.wind_speed_80m?.[i];
    const hasWindProfile = ws80m != null && ws80m > 0;
    let windProfile: { height: number; speed: number; dir: number }[] | undefined;
    if (hasWindProfile) {
      windProfile = [
        { height: 80, speed: safeGet(raw.hourly.wind_speed_80m, i), dir: safeGet(raw.hourly.wind_direction_80m, i) },
        { height: 120, speed: safeGet(raw.hourly.wind_speed_120m, i), dir: safeGet(raw.hourly.wind_direction_120m, i) },
        { height: 300, speed: safeGet(raw.hourly.wind_speed_300m, i), dir: safeGet(raw.hourly.wind_direction_300m, i) },
        { height: 600, speed: safeGet(raw.hourly.wind_speed_600m, i), dir: safeGet(raw.hourly.wind_direction_600m, i) },
        { height: 1000, speed: safeGet(raw.hourly.wind_speed_1000m, i), dir: safeGet(raw.hourly.wind_direction_1000m, i) },
        { height: 1500, speed: safeGet(raw.hourly.wind_speed_1500m, i), dir: safeGet(raw.hourly.wind_direction_1500m, i) },
        { height: 2000, speed: safeGet(raw.hourly.wind_speed_2000m, i), dir: safeGet(raw.hourly.wind_direction_2000m, i) },
        { height: 2500, speed: safeGet(raw.hourly.wind_speed_2500m, i), dir: safeGet(raw.hourly.wind_direction_2500m, i) },
        { height: 3000, speed: safeGet(raw.hourly.wind_speed_3000m, i), dir: safeGet(raw.hourly.wind_direction_3000m, i) },
      ];
    }
    return {
      time: new Date(t),
      temperature: safeGet(raw.hourly.temperature_2m, i),
      humidity: safeGet(raw.hourly.relative_humidity_2m, i),
      dewPoint: safeGet(raw.hourly.dew_point_2m, i),
      apparentTemp: safeGet(raw.hourly.apparent_temperature, i),
      precipitation: safeGet(raw.hourly.precipitation, i),
      precipitationProbability: safeGet(raw.hourly.precipitation_probability, i),
      weatherCode: safeGet(raw.hourly.weather_code, i),
      cloudCover: safeGet(raw.hourly.cloud_cover, i),
      windSpeed: safeGet(raw.hourly.wind_speed_10m, i),
      windDir: safeGet(raw.hourly.wind_direction_10m, i),
      windGusts: safeGet(raw.hourly.wind_gusts_10m, i),
      uvIndex: safeGet(raw.hourly.uv_index, i),
      shortwaveRadiation: safeGet(raw.hourly.shortwave_radiation, i),
      cape: safeGet(raw.hourly.cape, i),
      cin: safeGet(raw.hourly.convective_inhibition, i),
      liftedIndex: safeGet(raw.hourly.lifted_index, i),
      windProfile: windProfile || computeWindProfile(
        safeGet(raw.hourly.wind_speed_10m, i),
        safeGet(raw.hourly.wind_direction_10m, i)
      ),
    };
  });

  const daily: MeteoDaily[] = (raw.daily?.time || []).map((t: string, i: number) => ({
    date: new Date(t),
    weatherCode: safeGet(raw.daily.weather_code, i),
    tempMax: safeGet(raw.daily.temperature_2m_max, i),
    tempMin: safeGet(raw.daily.temperature_2m_min, i),
    apparentTempMax: safeGet(raw.daily.apparent_temperature_max, i),
    apparentTempMin: safeGet(raw.daily.apparent_temperature_min, i),
    sunrise: safeGetStr(raw.daily.sunrise, i),
    sunset: safeGetStr(raw.daily.sunset, i),
    daylightDuration: safeGet(raw.daily.daylight_duration, i),
    sunshineDuration: safeGet(raw.daily.sunshine_duration, i),
    uvIndexMax: safeGet(raw.daily.uv_index_max, i),
    precipitationSum: safeGet(raw.daily.precipitation_sum, i),
    precipitationProbabilityMax: safeGet(raw.daily.precipitation_probability_max, i),
    windSpeedMax: safeGet(raw.daily.wind_speed_10m_max, i),
    windGustsMax: safeGet(raw.daily.wind_gusts_10m_max, i),
    windDirDominant: safeGet(raw.daily.wind_direction_10m_dominant, i),
  }));

  const current: MeteoCurrent = {
    time: raw.current?.time ? new Date(raw.current.time) : new Date(),
    temperature: raw.current?.temperature_2m ?? 0,
    humidity: raw.current?.relative_humidity_2m ?? 0,
    apparentTemp: raw.current?.apparent_temperature ?? 0,
    isDay: raw.current?.is_day ?? 1,
    precipitation: raw.current?.precipitation ?? 0,
    weatherCode: raw.current?.weather_code ?? 0,
    cloudCover: raw.current?.cloud_cover ?? 0,
    pressure: raw.current?.pressure_msl ?? 1013,
    surfacePressure: raw.current?.surface_pressure ?? 1013,
    windSpeed: raw.current?.wind_speed_10m ?? 0,
    windDir: raw.current?.wind_direction_10m ?? 0,
    windGusts: raw.current?.wind_gusts_10m ?? 0,
  };

  return { hourly, daily, current, lat, lon, elevation: raw.elevation, timezone: raw.timezone, model };
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<MeteoResponse> {
    const key = cacheKey(lat, lon, "base");
    const cached = getCached(key);
    if (cached) return cached;

    // Se c'è già una richiesta in corso, riutilizzala
    if (pendingRequests.has(key)) return pendingRequests.get(key)!;

    const promise = (async () => {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        hourly: HOURLY_PARAMS,
        current: CURRENT_PARAMS,
        daily: DAILY_PARAMS,
        timezone: "Europe/Rome",
        forecast_days: "3",
      });

      const res = await fetchWithRetry(`${BASE_URL}?${params.toString()}`);
      const raw = await res.json();
      const data = parseMeteoResponse(raw, lat, lon, "auto");
      requestCache.set(key, { data, ts: Date.now() });

      // Richiedi anche il profilo vento in modo separato (non bloccante)
      weatherService.fetchWindProfile(lat, lon).catch(() => {});

      return data;
    })();

    pendingRequests.set(key, promise);
    promise.finally(() => pendingRequests.delete(key));

    return promise;
  },

  async fetchWindProfile(lat: number, lon: number): Promise<{ height: number; speed: number; dir: number }[][] | null> {
    const key = cacheKey(lat, lon, "wind_profile");
    const cached = getCached(key);
    if (cached) return cached;

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: WIND_PROFILE_PARAMS,
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    try {
      await rateLimit(); // delay extra
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      if (!res.ok) return null;
      const raw = await res.json();
      if (!raw.hourly?.time) return null;

      const profiles: { height: number; speed: number; dir: number }[][] = [];
      const levels = [
        "80", "120", "300", "600", "1000", "1500", "2000", "2500", "3000"
      ];

      for (let i = 0; i < raw.hourly.time.length; i++) {
        const profile = levels.map(h => ({
          height: parseInt(h),
          speed: raw.hourly[`wind_speed_${h}m`]?.[i] ?? 0,
          dir: raw.hourly[`wind_direction_${h}m`]?.[i] ?? 0,
        }));
        profiles.push(profile);
      }

      requestCache.set(key, { data: profiles, ts: Date.now() });
      return profiles;
    } catch {
      return null;
    }
  },

  async fetchWithFallback(lat: number, lon: number): Promise<{ data: MeteoResponse | null; ok: boolean }> {
    try {
      const data = await this.fetchWeather(lat, lon);
      return { data, ok: true };
    } catch (err) {
      console.error(`Errore fetch per ${lat},${lon}:`, err);
      return { data: null, ok: false };
    }
  },
};
