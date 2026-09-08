"use client";

import type { HourData, DailyData } from "@/types/meteo";
import { getMeteoBaseUrl } from "@/config/apiConfig";

// URL base: usa il proxy Node.js se disponibile
const getBaseUrl = () => getMeteoBaseUrl();

const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "precipitation_probability",
  "weather_code",
  "pressure_msl",
  "surface_pressure",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cape",
  "convective_inhibition",
  "lifted_index",
  "shortwave_radiation",
  "direct_radiation",
  "sunshine_duration",
  "temperature_80m",
  "temperature_120m",
  "wind_speed_80m",
  "wind_direction_80m",
  "wind_speed_120m",
  "wind_direction_120m",
  "wind_speed_180m",
  "wind_direction_180m",
  "freezing_level_height",
  "uv_index",
  // Pressure level winds - REAL altitude data
  "wind_speed_925hPa",
  "wind_direction_925hPa",
  "wind_speed_850hPa",
  "wind_direction_850hPa",
  "wind_speed_700hPa",
  "wind_direction_700hPa",
  "wind_speed_500hPa",
  "wind_direction_500hPa",
  "wind_speed_600hPa",
  "wind_direction_600hPa",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "daylight_duration",
  "sunshine_duration",
  "precipitation_sum",
  "rain_sum",
  "snowfall_sum",
  "precipitation_hours",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "shortwave_radiation_sum",
  "uv_index_max",
].join(",");

const CURRENT_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "rain",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cape",
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
  liftedIndex?: number;
  cin?: number;
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
  // Add missing fields for HourData compatibility
  feelsLike: number;
  pressure: number;
  surfacePressure: number;
  rain: number;
  snowfall: number;
  vapourPressureDeficit: number;
  isDay: boolean;
  freezingLevel: number;
  sunshineDuration: number;
  mixingRatio: number;
  virtualTemp: number;
  windProfile?: { height: number; speed: number; dir: number }[];
  temp80m?: number;
  temp120m?: number;
  apparentTemp?: number;
  precipitationProba?: number;
  evapotranspiration?: number;
  et0?: number;
  soilTemp?: number;
  soilMoisture?: number;
  diffuseRadiation?: number;
  directNormalIrradiance?: number;
  terrestrialRadiation?: number;
  // Missing fields for HourData
  radiation: number;
  cin: number;
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
  // Add missing fields for DailyData compatibility
  temperatureMax: number;
  temperatureMin: number;
  temperatureMean: number;
  apparentTempMax: number;
  apparentTempMin: number;
  daylightDuration: number;
  sunshineDuration: number;
  rainSum: number;
  snowfallSum: number;
  precipitationHours: number;
  shortwaveRadiationSum: number;
  freezingLevel?: number;
  weatherDescription?: string;
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
    const res = await fetchWithTimeout(`${getBaseUrl()}?${params.toString()}`);
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
    const res = await fetchWithTimeout(`${getBaseUrl()}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // Current
    const c = json.current;
    const curTemp = safeParseTemp(c?.temperature_2m);
    const curHum = c?.relative_humidity_2m ?? 50;
    const current: MeteoCurrent | null = c ? {
      time: new Date(c.time),
      temperature: curTemp,
      humidity: curHum,
      dewPoint: safeParseTemp(c.dew_point_2m) ?? (curTemp !== null ? curTemp - (100 - curHum) / 5 : 0),
      precipitation: c.precipitation ?? 0,
      weatherCode: c.weather_code ?? 0,
      cloudCover: c.cloud_cover ?? 0,
      windSpeed: c.wind_speed_10m ?? 0,
      windDir: c.wind_direction_10m ?? 0,
      windGusts: c.wind_gusts_10m ?? c.wind_speed_10m ?? 0,
      cape: c.cape ?? 0,
      apparentTemp: safeParseTemp(c.apparent_temperature) ?? curTemp ?? 0,
    } : null;

    // Hourly
    const hourly: MeteoHourly[] = [];
    const len = json.hourly?.time?.length || 0;
    for (let i = 0; i < len; i++) {
      const t = safeParseTemp(json.hourly.temperature_2m[i]);
      const h = json.hourly.relative_humidity_2m[i] ?? 50;
      const dew = safeParseTemp(json.hourly.dew_point_2m?.[i]) ?? (t !== null ? t - (100 - h) / 5 : null);
      const isDayHour = json.hourly.is_day !== undefined ? !!json.hourly.is_day[i] : true;
      
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
        feelsLike: safeParseTemp(json.hourly.apparent_temperature?.[i]) ?? t ?? 0,
        pressure: json.hourly.pressure_msl?.[i] ?? 1013,
        surfacePressure: json.hourly.surface_pressure?.[i] ?? 1013,
        rain: json.hourly.rain?.[i] ?? 0,
        snowfall: json.hourly.snowfall?.[i] ?? 0,
        vapourPressureDeficit: 0,
        isDay: isDayHour,
        freezingLevel: json.hourly.freezing_level_height?.[i] ?? 3000,
        sunshineDuration: json.hourly.sunshine_duration?.[i] ?? 0,
        mixingRatio: 0,
        virtualTemp: 0,
        windProfile: undefined,
        temp80m: json.hourly.temperature_80m?.[i],
        temp120m: json.hourly.temperature_120m?.[i],
        apparentTemp: safeParseTemp(json.hourly.apparent_temperature?.[i]) ?? t ?? 0,
        precipitationProba: json.hourly.precipitation_probability?.[i],
        evapotranspiration: 0,
        et0: 0,
        soilTemp: 0,
        soilMoisture: 0,
        diffuseRadiation: 0,
        directNormalIrradiance: 0,
        terrestrialRadiation: 0,
        radiation: json.hourly.shortwave_radiation?.[i] ?? 0,
        cin: json.hourly.convective_inhibition?.[i] ?? 0,
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
        // Add missing fields for DailyData compatibility
        temperatureMax: safeParseTemp(json.daily.temperature_2m_max[i]) ?? 0,
        temperatureMin: safeParseTemp(json.daily.temperature_2m_min[i]) ?? 0,
        temperatureMean: safeParseTemp(json.daily.temperature_2m_mean?.[i]) ?? 0,
        apparentTempMax: safeParseTemp(json.daily.apparent_temperature_max?.[i]) ?? 0,
        apparentTempMin: safeParseTemp(json.daily.apparent_temperature_min?.[i]) ?? 0,
        daylightDuration: json.daily.daylight_duration?.[i] ?? 0,
        sunshineDuration: json.daily.sunshine_duration?.[i] ?? 0,
        rainSum: json.daily.rain_sum?.[i] ?? 0,
        snowfallSum: json.daily.snowfall_sum?.[i] ?? 0,
        precipitationHours: json.daily.precipitation_hours?.[i] ?? 0,
        shortwaveRadiationSum: json.daily.shortwave_radiation_sum?.[i] ?? 0,
        freezingLevel: undefined,
        weatherDescription: undefined,
      });
    }

    return { hourly, daily, current };
  } catch {
    return { hourly: [], daily: [], current: null };
  }
}

// Export compatibile per import esistenti
export const weatherService = {
  fetchMeteoCorrente,
  fetchPrevisioniGiornaliere,
  // Alias for backward compatibility
  fetchCurrent: fetchMeteoCorrente,
};