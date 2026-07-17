"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Parametri superficie (standard)
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
  "temperature_80m",
  "temperature_120m",
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

// URL per i livelli di pressione (vento reale in quota!)
const PRESSURE_LEVEL_BASE = "https://api.open-meteo.com/v1/forecast";

// Cache
const CACHE_TTL = 3 * 60 * 1000;
const requestCache = new Map<string, { data: any; ts: number }>();

function cacheKey(lat: number, lon: number) {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function getCached(key: string) {
  const entry = requestCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
      if (res.status === 429 && attempt < retries) continue;
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
  temp80m: number;
  temp120m: number;
  windProfile: { height: number; speed: number; dir: number }[];
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

function parseMeteoResponse(raw: any, lat: number, lon: number): MeteoResponse {
  const hourly: MeteoHourly[] = (raw.hourly?.time || []).map((t: string, i: number) => {
    // Prende i dati del vento in quota dai livelli di pressione (parametri pressure_level)
    // Oppure usa i dati standard wind_speed_10m se i livelli non sono disponibili
    const wp: { height: number; speed: number; dir: number }[] = [];

    // Livelli di pressione standard Open-Meteo (in hPa, convertiti in metri approssimativi)
    // 1000hPa ~ 110m, 950hPa ~ 540m, 900hPa ~ 990m, 850hPa ~ 1450m
    // 800hPa ~ 1950m, 700hPa ~ 3000m, 600hPa ~ 4200m
    // Mappiamo i livelli effettivamente richiesti
    const livelli = [
      { pressure: 1000, height: 110, key: "wind_speed_1000hPa" },
      { pressure: 975, height: 350, key: "wind_speed_975hPa" },
      { pressure: 950, height: 540, key: "wind_speed_950hPa" },
      { pressure: 925, height: 760, key: "wind_speed_925hPa" },
      { pressure: 900, height: 990, key: "wind_speed_900hPa" },
      { pressure: 850, height: 1450, key: "wind_speed_850hPa" },
      { pressure: 800, height: 1950, key: "wind_speed_800hPa" },
      { pressure: 700, height: 3000, key: "wind_speed_700hPa" },
    ];

    for (const l of livelli) {
      const speed = safeGet(raw.hourly?.[`wind_speed_${l.pressure}hPa`], i);
      const dir = safeGet(raw.hourly?.[`wind_direction_${l.pressure}hPa`], i);
      if (speed > 0 && dir >= 0) {
        wp.push({ height: l.height, speed: Math.round(speed * 10) / 10, dir });
      }
    }

    // Fallback: se non arrivano dati pressure-level, stima con legge logaritmica
    if (wp.length === 0) {
      const surfaceSpeed = safeGet(raw.hourly?.wind_speed_10m, i);
      const surfaceDir = safeGet(raw.hourly?.wind_direction_10m, i);
      if (surfaceSpeed > 0) {
        // Legge logaritmica del vento: v(h) = v(10m) * ln(h/z0) / ln(10/z0)
        // z0 = rugosità ~ 0.03 per terreno aperto
        const z0 = 0.03;
        const v10 = surfaceSpeed;
        const quoteLog = [100, 300, 500, 800, 1000, 1500, 2000, 2500, 3000];
        for (const h of quoteLog) {
          const fattore = Math.log(Math.max(h, 1) / z0) / Math.log(10 / z0);
          const speed = Math.round(Math.min(v10 * fattore, v10 * 2.5) * 10) / 10;
          if (speed > 0) {
            wp.push({ height: h, speed, dir: surfaceDir });
          }
        }
      }
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
      temp80m: safeGet(raw.hourly.temperature_80m, i),
      temp120m: safeGet(raw.hourly.temperature_120m, i),
      windProfile: wp,
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

  return { hourly, daily, current, lat, lon, elevation: raw.elevation, timezone: raw.timezone, model: "auto" };
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<MeteoResponse> {
    const key = cacheKey(lat, lon);
    const cached = getCached(key);
    if (cached) return cached;

    // Richiesta PRINCIPALE + richiesta LIVELLI DI PRESSIONE parallela
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: HOURLY_PARAMS,
      current: CURRENT_PARAMS,
      daily: DAILY_PARAMS,
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    // Richiesta separata per i livelli di pressione (vento in quota reale)
    const pressureLevels = "1000,975,950,925,900,850,800,700";
    const pressureParams = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: "wind_speed_1000hPa,wind_direction_1000hPa,wind_speed_975hPa,wind_direction_975hPa,wind_speed_950hPa,wind_direction_950hPa,wind_speed_925hPa,wind_direction_925hPa,wind_speed_900hPa,wind_direction_900hPa,wind_speed_850hPa,wind_direction_850hPa,wind_speed_800hPa,wind_direction_800hPa,wind_speed_700hPa,wind_direction_700hPa",
      timezone: "Europe/Rome",
      forecast_days: "3",
      pressure_level: pressureLevels,
    });

    // Fetch parallelo
    // Fetch principale + livelli di pressione
    const [res1, res2] = await Promise.allSettled([
      fetchWithRetry(`${BASE_URL}?${params.toString()}`),
      fetchWithRetry(`${PRESSURE_LEVEL_BASE}?${pressureParams.toString()}`),
    ]);

    const raw = res1.status === "fulfilled" ? await res1.value.json() : { hourly: {}, daily: {}, current: {} };

    // Unisci i dati dei livelli di pressione se disponibili
    if (res2.status === "fulfilled") {
      const raw2 = await res2.value.json();
      if (raw2?.hourly) {
        for (const key of Object.keys(raw2.hourly)) {
          if (key.startsWith("wind_speed_") || key.startsWith("wind_direction_")) {
            raw.hourly[key] = raw2.hourly[key];
          }
        }
      }
    }

    const data = parseMeteoResponse(raw, lat, lon);
    requestCache.set(key, { data, ts: Date.now() });
    return data;
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
