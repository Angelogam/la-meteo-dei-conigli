"use client";

import type { HourData, DailyData } from "@/types/meteo";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

// Parametri orari completi per parapendio
const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "precipitation",
  "precipitation_probability",
  "weather_code",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cape",
  "lifted_index",
  "shortwave_radiation",
  "direct_radiation",
  "uv_index",
  "visibility",
].join(",");

// Parametri giornalieri
const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
  "sunrise",
  "sunset",
].join(",");

// Parametri correnti
const CURRENT_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cape",
  "apparent_temperature",
].join(",");

export interface MeteoCurrent {
  time: Date;
  temperature: number | null;
  humidity: number;
  dewPoint: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  cape: number;
  apparentTemp: number;
}

export interface MeteoHourly {
  time: Date;
  temperature: number | null;
  humidity: number;
  dewPoint: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  cape: number;
  liftedIndex: number;
  shortwaveRadiation: number;
  directRadiation: number;
  uvIndex: number;
  visibility: number;
}

export interface MeteoDaily {
  date: Date;
  weatherCode: number;
  tempMax: number | null;
  tempMin: number | null;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

/** Parsing sicuro temperatura: evita NaN, restituisce null se non valido */
function safeParseTemp(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? null : parsed;
}

async function fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchMeteoCorrente(lat: number, lon: number): Promise<MeteoCurrent | null> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: CURRENT_PARAMS,
    timezone: "Europe/Rome",
    forecast_days: "1",
  });

  try {
    const res = await fetchWithTimeout(`${OPEN_METEO_BASE}?${params.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    const c = json.current;
    if (!c) return null;

    const temp = safeParseTemp(c.temperature_2m);
    const hum = c.relative_humidity_2m ?? 50;
    const dew = safeParseTemp(c.dew_point_2m) ?? (temp !== null ? temp - (100 - hum) / 5 : null);

    return {
      time: new Date(c.time),
      temperature: temp,
      humidity: hum,
      dewPoint: dew ?? 0,
      precipitation: c.precipitation ?? 0,
      weatherCode: c.weather_code ?? 0,
      cloudCover: c.cloud_cover ?? 0,
      windSpeed: c.wind_speed_10m ?? 0,
      windDir: c.wind_direction_10m ?? 0,
      windGusts: c.wind_gusts_10m ?? c.wind_speed_10m ?? 0,
      cape: c.cape ?? 0,
      apparentTemp: safeParseTemp(c.apparent_temperature) ?? temp ?? 0,
    };
  } catch {
    return null;
  }
}

export async function fetchPrevisioniGiornaliere(lat: number, lon: number, altitude: number = 1000): Promise<{
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
  current: MeteoCurrent | null;
}> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: HOURLY_PARAMS,
    daily: DAILY_PARAMS,
    current: CURRENT_PARAMS,
    timezone: "Europe/Rome",
    forecast_days: "3",
  });

  try {
    const res = await fetchWithTimeout(`${OPEN_METEO_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // Current
    const current: MeteoCurrent | null = json.current ? {
      time: new Date(json.current.time),
      temperature: safeParseTemp(json.current.temperature_2m),
      humidity: json.current.relative_humidity_2m ?? 50,
      dewPoint: safeParseTemp(json.current.dew_point_2m) ?? 0,
      precipitation: json.current.precipitation ?? 0,
      weatherCode: json.current.weather_code ?? 0,
      cloudCover: json.current.cloud_cover ?? 0,
      windSpeed: json.current.wind_speed_10m ?? 0,
      windDir: json.current.wind_direction_10m ?? 0,
      windGusts: json.current.wind_gusts_10m ?? 0,
      cape: json.current.cape ?? 0,
      apparentTemp: safeParseTemp(json.current.apparent_temperature) ?? 0,
    } : null;

    // Hourly
    const hourly: MeteoHourly[] = [];
    const len = json.hourly?.time?.length || 0;
    for (let i = 0; i < len; i++) {
      const t = safeParseTemp(json.hourly.temperature_2m[i]);
      const h = json.hourly.relative_humidity_2m[i] ?? 50;
      const dew = safeParseTemp(json.hourly.dew_point_2m?.[i]) ?? (t !== null ? t - (100 - h) / 5 : null);
      
      hourly.push({
        time: new Date(json.hourly.time[i]),
        temperature: t,
        humidity: h,
        dewPoint: dew ?? 0,
        precipitation: json.hourly.precipitation[i] ?? 0,
        precipitationProbability: json.hourly.precipitation_probability[i] ?? 0,
        weatherCode: json.hourly.weather_code[i] ?? 0,
        cloudCover: json.hourly.cloud_cover[i] ?? 0,
        cloudCoverLow: json.hourly.cloud_cover_low?.[i] ?? 0,
        cloudCoverMid: json.hourly.cloud_cover_mid?.[i] ?? 0,
        cloudCoverHigh: json.hourly.cloud_cover_high?.[i] ?? 0,
        windSpeed: json.hourly.wind_speed_10m[i] ?? 0,
        windDir: json.hourly.wind_direction_10m[i] ?? 0,
        windGusts: json.hourly.wind_gusts_10m?.[i] ?? 0,
        cape: json.hourly.cape?.[i] ?? 0,
        liftedIndex: json.hourly.lifted_index?.[i] ?? 0,
        shortwaveRadiation: json.hourly.shortwave_radiation?.[i] ?? 0,
        directRadiation: json.hourly.direct_radiation?.[i] ?? 0,
        uvIndex: json.hourly.uv_index?.[i] ?? 0,
        visibility: json.hourly.visibility?.[i] ?? 10000,
      });
    }

    // Daily
    const daily: MeteoDaily[] = [];
    const dailyLen = json.daily?.time?.length || 0;
    for (let i = 0; i < dailyLen; i++) {
      daily.push({
        date: new Date(json.daily.time[i]),
        weatherCode: json.daily.weather_code[i] ?? 0,
        tempMax: safeParseTemp(json.daily.temperature_2m_max[i]),
        tempMin: safeParseTemp(json.daily.temperature_2m_min[i]),
        precipitationSum: json.daily.precipitation_sum[i] ?? 0,
        precipitationProbabilityMax: json.daily.precipitation_probability_max[i] ?? 0,
        windSpeedMax: json.daily.wind_speed_10m_max[i] ?? 0,
        windGustsMax: json.daily.wind_gusts_10m_max[i] ?? 0,
        windDirDominant: json.daily.wind_direction_10m_dominant[i] ?? 0,
        uvIndexMax: json.daily.uv_index_max[i] ?? 0,
        sunrise: json.daily.sunrise[i] ?? "",
        sunset: json.daily.sunset[i] ?? "",
      });
    }

    return { hourly, daily, current };
  } catch {
    return { hourly: [], daily: [], current: null };
  }
}

// Export compatibile per import esistenti: weatherService.fetchMeteoCorrente, weatherService.fetchPrevisioniGiornaliere
export const weatherService = {
  fetchMeteoCorrente,
  fetchPrevisioniGiornaliere,
};