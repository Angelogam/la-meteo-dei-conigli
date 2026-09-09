"use client";

import type { HourData } from "@/types/meteo";
import { fetchFull, fetchCurrent as fetchCurrentFromClient } from "@/lib/openMeteoClient";

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
  "wind_speed_80m",
  "wind_direction_80m",
  "wind_speed_120m",
  "wind_direction_120m",
  "wind_speed_180m",
  "wind_direction_180m",
  "wind_speed_925hPa",
  "wind_direction_925hPa",
  "wind_speed_850hPa",
  "wind_direction_850hPa",
  "wind_speed_700hPa",
  "wind_direction_700hPa",
  "wind_speed_600hPa",
  "wind_direction_600hPa",
  "wind_speed_500hPa",
  "wind_direction_500hPa",
  "temperature_80m",
  "temperature_120m",
  "freezing_level_height",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
  "sunrise",
  "sunset",
  "daylight_duration",
  "sunshine_duration",
  "apparent_temperature_max",
  "apparent_temperature_min",
].join(",");

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
  "uv_index",
  "visibility",
].join(",");

function safeNum(v: unknown, fallback: number = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function safeNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export interface MeteoCurrent {
  time: Date;
  temperature: number | null;
  humidity: number;
  dewPoint: number | null;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  cape: number;
  apparentTemp: number | null;
  isDay?: number;
  rain?: number;
  snowfall?: number;
  pressure?: number | null;
  surfacePressure?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
  visibility?: number;
  uvIndex?: number;
}

export interface MeteoHourly {
  time: Date;
  temperature: number | null;
  humidity: number;
  dewPoint: number | null;
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
  feelsLike: number | null;
  pressure: number | null;
  surfacePressure: number | null;
  rain: number;
  snowfall: number;
  vapourPressureDeficit: number;
  isDay: boolean;
  freezingLevel: number | null;
  sunshineDuration: number;
  mixingRatio: number;
  virtualTemp: number;
  windProfile?: { height: number; speed: number; dir: number }[];
  temp80m: number | null;
  temp120m: number | null;
  windSpeed80m: number | null;
  windDir80m: number | null;
  windSpeed120m: number | null;
  windDir120m: number | null;
  windSpeed180m: number | null;
  windDir180m: number | null;
  apparentTemp: number | null;
  precipitationProba: number;
  evapotranspiration: number;
  et0: number;
  soilTemp: number;
  soilMoisture: number;
  diffuseRadiation: number;
  directNormalIrradiance: number;
  terrestrialRadiation: number;
  radiation: number;
  cin: number;
  // Pressure level winds
  windSpeed925: number | null;
  windDir925: number | null;
  windSpeed850: number | null;
  windDir850: number | null;
  windSpeed700: number | null;
  windDir700: number | null;
  windSpeed600: number | null;
  windDir600: number | null;
  windSpeed500: number | null;
  windDir500: number | null;
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
  weatherDescription?: string;
}

export async function fetchPrevisioniGiornaliere(lat: number, lon: number): Promise<{
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
  current: MeteoCurrent | null;
}> {
  try {
    const json = await fetchFull(lat, lon, HOURLY_PARAMS, DAILY_PARAMS, CURRENT_PARAMS);

    // Current
    const c = json.current;
    const current: MeteoCurrent | null = c ? {
      time: new Date(c.time),
      temperature: safeNumOrNull(c.temperature_2m),
      humidity: safeNum(c.relative_humidity_2m, 50),
      dewPoint: safeNumOrNull(c.dew_point_2m),
      precipitation: safeNum(c.precipitation, 0),
      weatherCode: safeNum(c.weather_code, 0),
      cloudCover: safeNum(c.cloud_cover, 0),
      windSpeed: safeNum(c.wind_speed_10m, 0),
      windDir: safeNum(c.wind_direction_10m, 0),
      windGusts: safeNum(c.wind_gusts_10m, c.wind_speed_10m ?? 0),
      cape: safeNum(c.cape, 0),
      apparentTemp: safeNumOrNull(c.apparent_temperature),
      uvIndex: safeNum(c.uv_index, 0),
      visibility: safeNum(c.visibility, 10000),
    } : null;

    // Hourly
    const hourly: MeteoHourly[] = [];
    const len = json.hourly?.time?.length || 0;
    for (let i = 0; i < len; i++) {
      const t = safeNumOrNull(json.hourly.temperature_2m?.[i]);
      const h = safeNum(json.hourly.relative_humidity_2m?.[i], 50);
      const dew = safeNumOrNull(json.hourly.dew_point_2m?.[i]);
      const feelsLike = safeNumOrNull(json.hourly.apparent_temperature?.[i]);
      const pressure = safeNumOrNull(json.hourly.pressure_msl?.[i]);
      const surfacePressure = safeNumOrNull(json.hourly.surface_pressure?.[i]);
      const freezingLevel = safeNumOrNull(json.hourly.freezing_level_height?.[i]);
      const temp80m = safeNumOrNull(json.hourly.temperature_80m?.[i]);
      const temp120m = safeNumOrNull(json.hourly.temperature_120m?.[i]);
      const windSpeed80m = safeNumOrNull(json.hourly.wind_speed_80m?.[i]);
      const windDir80m = safeNumOrNull(json.hourly.wind_direction_80m?.[i]);
      const windSpeed120m = safeNumOrNull(json.hourly.wind_speed_120m?.[i]);
      const windDir120m = safeNumOrNull(json.hourly.wind_direction_120m?.[i]);
      const windSpeed180m = safeNumOrNull(json.hourly.wind_speed_180m?.[i]);
      const windDir180m = safeNumOrNull(json.hourly.wind_direction_180m?.[i]);

      hourly.push({
        time: new Date(json.hourly.time[i]),
        temperature: t,
        humidity: h,
        dewPoint: dew,
        precipitation: safeNum(json.hourly.precipitation?.[i], 0),
        precipitationProbability: safeNum(json.hourly.precipitation_probability?.[i], 0),
        weatherCode: safeNum(json.hourly.weather_code?.[i], 0),
        cloudCover: safeNum(json.hourly.cloud_cover?.[i], 0),
        cloudCoverLow: safeNum(json.hourly.cloud_cover_low?.[i], 0),
        cloudCoverMid: safeNum(json.hourly.cloud_cover_mid?.[i], 0),
        cloudCoverHigh: safeNum(json.hourly.cloud_cover_high?.[i], 0),
        windSpeed: safeNum(json.hourly.wind_speed_10m?.[i], 0),
        windDir: safeNum(json.hourly.wind_direction_10m?.[i], 0),
        windGusts: safeNum(json.hourly.wind_gusts_10m?.[i], 0),
        cape: safeNum(json.hourly.cape?.[i], 0),
        liftedIndex: safeNum(json.hourly.lifted_index?.[i], 0),
        shortwaveRadiation: safeNum(json.hourly.shortwave_radiation?.[i], 0),
        directRadiation: safeNum(json.hourly.direct_radiation?.[i], 0),
        uvIndex: safeNum(json.hourly.uv_index?.[i], 0),
        visibility: safeNum(json.hourly.visibility?.[i], 10000),
        feelsLike: feelsLike,
        pressure: pressure,
        surfacePressure: surfacePressure,
        rain: safeNum(json.hourly.rain?.[i], 0),
        snowfall: safeNum(json.hourly.snowfall?.[i], 0),
        vapourPressureDeficit: 0,
        isDay: true,
        freezingLevel: freezingLevel,
        sunshineDuration: safeNum(json.hourly.sunshine_duration?.[i], 0),
        mixingRatio: 0,
        virtualTemp: 0,
        temp80m,
        temp120m,
        windSpeed80m,
        windDir80m,
        windSpeed120m,
        windDir120m,
        windSpeed180m,
        windDir180m,
        apparentTemp: feelsLike,
        precipitationProba: safeNum(json.hourly.precipitation_probability?.[i], 0),
        evapotranspiration: 0,
        et0: 0,
        soilTemp: 0,
        soilMoisture: 0,
        diffuseRadiation: 0,
        directNormalIrradiance: 0,
        terrestrialRadiation: 0,
        radiation: safeNum(json.hourly.shortwave_radiation?.[i], 0),
        cin: safeNum(json.hourly.convective_inhibition?.[i], 0),
        windSpeed925: safeNumOrNull(json.hourly.wind_speed_925hPa?.[i]),
        windDir925: safeNumOrNull(json.hourly.wind_direction_925hPa?.[i]),
        windSpeed850: safeNumOrNull(json.hourly.wind_speed_850hPa?.[i]),
        windDir850: safeNumOrNull(json.hourly.wind_direction_850hPa?.[i]),
        windSpeed700: safeNumOrNull(json.hourly.wind_speed_700hPa?.[i]),
        windDir700: safeNumOrNull(json.hourly.wind_direction_700hPa?.[i]),
        windSpeed600: safeNumOrNull(json.hourly.wind_speed_600hPa?.[i]),
        windDir600: safeNumOrNull(json.hourly.wind_direction_600hPa?.[i]),
        windSpeed500: safeNumOrNull(json.hourly.wind_speed_500hPa?.[i]),
        windDir500: safeNumOrNull(json.hourly.wind_direction_500hPa?.[i]),
      });
    }

    // Daily
    const daily: MeteoDaily[] = [];
    const dailyLen = json.daily?.time?.length || 0;
    for (let i = 0; i < dailyLen; i++) {
      daily.push({
        date: new Date(json.daily.time[i]),
        weatherCode: safeNum(json.daily.weather_code?.[i], 0),
        tempMax: safeNumOrNull(json.daily.temperature_2m_max?.[i]),
        tempMin: safeNumOrNull(json.daily.temperature_2m_min?.[i]),
        precipitationSum: safeNum(json.daily.precipitation_sum?.[i], 0),
        precipitationProbabilityMax: safeNum(json.daily.precipitation_probability_max?.[i], 0),
        windSpeedMax: safeNum(json.daily.wind_speed_10m_max?.[i], 0),
        windGustsMax: safeNum(json.daily.wind_gusts_10m_max?.[i], 0),
        windDirDominant: safeNum(json.daily.wind_direction_10m_dominant?.[i], 0),
        uvIndexMax: safeNum(json.daily.uv_index_max?.[i], 0),
        sunrise: json.daily.sunrise?.[i] ?? "",
        sunset: json.daily.sunset?.[i] ?? "",
        temperatureMax: safeNum(json.daily.temperature_2m_max?.[i], 0),
        temperatureMin: safeNum(json.daily.temperature_2m_min?.[i], 0),
        temperatureMean: safeNum(json.daily.temperature_2m_mean?.[i], 0),
        apparentTempMax: safeNum(json.daily.apparent_temperature_max?.[i], 0),
        apparentTempMin: safeNum(json.daily.apparent_temperature_min?.[i], 0),
        daylightDuration: safeNum(json.daily.daylight_duration?.[i], 0),
        sunshineDuration: safeNum(json.daily.sunshine_duration?.[i], 0),
        rainSum: safeNum(json.daily.rain_sum?.[i], 0),
        snowfallSum: safeNum(json.daily.snowfall_sum?.[i], 0),
        precipitationHours: safeNum(json.daily.precipitation_hours?.[i], 0),
        shortwaveRadiationSum: safeNum(json.daily.shortwave_radiation_sum?.[i], 0),
      });
    }

    return { hourly, daily, current };
  } catch {
    return { hourly: [], daily: [], current: null };
  }
}

export const weatherService = {
  fetchPrevisioniGiornaliere,
  async fetchCurrent(lat: number, lon: number): Promise<MeteoCurrent | null> {
    try {
      const json = await fetchCurrentFromClient(lat, lon, CURRENT_PARAMS);
      const c = json.current;
      if (!c) return null;
      return {
        time: new Date(c.time),
        temperature: safeNumOrNull(c.temperature_2m),
        humidity: safeNum(c.relative_humidity_2m, 50),
        dewPoint: safeNumOrNull(c.dew_point_2m),
        precipitation: safeNum(c.precipitation, 0),
        weatherCode: safeNum(c.weather_code, 0),
        cloudCover: safeNum(c.cloud_cover, 0),
        windSpeed: safeNum(c.wind_speed_10m, 0),
        windDir: safeNum(c.wind_direction_10m, 0),
        windGusts: safeNum(c.wind_gusts_10m, c.wind_speed_10m ?? 0),
        cape: safeNum(c.cape, 0),
          apparentTemp: safeNumOrNull(c.apparent_temperature),
          uvIndex: safeNum(c.uv_index, 0),
          visibility: safeNum(c.visibility, 10000),
        };
      } catch {
        return null;
      }
    },
    async fetchWithFallback(lat: number, lon: number) {
    try {
      const data = await fetchPrevisioniGiornaliere(lat, lon);
      return { data, ok: true };
    } catch {
      return { data: null, ok: false };
    }
  },
};
