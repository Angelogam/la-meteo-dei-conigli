"use client";

import type { HourData, DailyData } from "@/types/meteo";

interface RawMeteoResponse {
  hourly: Record<string, (number | string)[]>;
  daily: Record<string, (number | string)[]>;
  current: Record<string, number | string>;
}

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

/**
 * Trasforma risposta raw Open-Meteo in formato HourData.
 * Campi non disponibili diventano null, mai valori inventati.
 */
export function transformHourlyData(raw: RawMeteoResponse["hourly"]): HourData[] {
  const len = raw.time.length;
  const result: HourData[] = [];

  for (let i = 0; i < len; i++) {
    const timeStr = raw.time[i] as string;
    const time = new Date(timeStr);
    const hour = time.getHours();

    // MODEL_FORECAST — dal modello numerico
    const temperature = safeNumOrNull(raw.temperature_2m?.[i]);
    const humidity = safeNumOrNull(raw.relative_humidity_2m?.[i]);
    const dewPoint = safeNumOrNull(raw.dew_point_2m?.[i]);
    const pressure = safeNumOrNull(raw.pressure_msl?.[i]);
    const surfacePressure = safeNumOrNull(raw.surface_pressure?.[i]);
    const precipitation = safeNumOrNull(raw.precipitation?.[i]);
    const rain = safeNumOrNull(raw.rain?.[i]);
    const snowfall = safeNumOrNull(raw.snowfall?.[i]);
    const weatherCode = safeNumOrNull(raw.weather_code?.[i]);
    const cloudCover = safeNumOrNull(raw.cloud_cover?.[i]);
    const cloudCoverLow = safeNumOrNull(raw.cloud_cover_low?.[i]);
    const cloudCoverMid = safeNumOrNull(raw.cloud_cover_mid?.[i]);
    const cloudCoverHigh = safeNumOrNull(raw.cloud_cover_high?.[i]);
    const windSpeed = safeNumOrNull(raw.wind_speed_10m?.[i]);
    const windDir = safeNumOrNull(raw.wind_direction_10m?.[i]);
    const windGusts = safeNumOrNull(raw.wind_gusts_10m?.[i]);
    const uvIndex = safeNumOrNull(raw.uv_index?.[i]);
    const visibility = safeNumOrNull(raw.visibility?.[i]);
    const directRadiation = safeNumOrNull(raw.direct_radiation?.[i]);
    const diffuseRadiation = safeNumOrNull((raw as any).diffuse_radiation?.[i]);
    const shortwaveRadiation = safeNumOrNull(raw.shortwave_radiation?.[i]);
    const cape = safeNumOrNull(raw.cape?.[i]);
    const cin = safeNumOrNull(raw.convective_inhibition?.[i]);
    const liftedIndex = safeNumOrNull(raw.lifted_index?.[i]);
    const freezingLevel = safeNumOrNull(raw.freezing_level_height?.[i]);
    const sunshineDuration = safeNumOrNull(raw.sunshine_duration?.[i]);
    const isDay = raw.is_day?.[i] != null ? !!raw.is_day[i] : hour >= 6 && hour <= 20;

    result.push({
      time,
      temperature,
      humidity,
      dewPoint,
      pressure,
      surfacePressure,
      precipitation,
      rain,
      snowfall,
      weatherCode,
      cloudCover,
      cloudCoverLow,
      cloudCoverMid,
      cloudCoverHigh,
      windSpeed,
      windDir,
      windGusts,
      uvIndex,
      visibility,
      directRadiation,
      diffuseRadiation,
      feelsLike: safeNumOrNull(raw.apparent_temperature?.[i]),
      radiation: shortwaveRadiation,
      vapourPressureDeficit: null,
      isDay,
      freezingLevel,
      sunshineDuration,
      cape,
      cin,
      liftedIndex,
      mixingRatio: null,
      virtualTemp: null,
      windProfile: undefined,
      temp80m: safeNumOrNull(raw.temperature_80m?.[i]),
      temp120m: safeNumOrNull(raw.temperature_120m?.[i]),
      temperature180m: safeNumOrNull(raw.temperature_180m?.[i]),
      boundaryLayerHeight: safeNumOrNull(raw.boundary_layer_height?.[i]),
      apparentTemp: safeNumOrNull(raw.apparent_temperature?.[i]),
      precipitationProba: safeNumOrNull(raw.precipitation_probability?.[i]),
      evapotranspiration: null,
      et0: null,
      soilTemp: null,
      soilMoisture: null,
      directNormalIrradiance: null,
      terrestrialRadiation: null,
    });
  }

  return result;
}

/**
 * Trasforma risposta current Open-Meteo in formato MeteoCurrent.
 */
export interface MeteoCurrent {
  time: Date;
  temperature: number | null;
  humidity: number | null;
  apparentTemp: number | null;
  isDay: boolean | null;
  precipitation: number | null;
  rain: number | null;
  snowfall: number | null;
  weatherCode: number | null;
  cloudCover: number | null;
  pressure: number | null;
  surfacePressure: number | null;
  windSpeed: number | null;
  windDir: number | null;
  windGusts: number | null;
}

export function transformCurrentData(raw: RawMeteoResponse["current"]): MeteoCurrent {
  const hour = new Date(raw.time).getHours();
  return {
    time: new Date(raw.time),
    temperature: safeNumOrNull(raw.temperature_2m),
    humidity: safeNumOrNull(raw.relative_humidity_2m),
    apparentTemp: safeNumOrNull(raw.apparent_temperature),
    isDay: raw.is_day != null ? !!raw.is_day : hour >= 6 && hour <= 20,
    precipitation: safeNumOrNull(raw.precipitation),
    rain: safeNumOrNull(raw.rain),
    snowfall: safeNumOrNull(raw.snowfall),
    weatherCode: safeNumOrNull(raw.weather_code),
    cloudCover: safeNumOrNull(raw.cloud_cover),
    pressure: safeNumOrNull(raw.pressure_msl),
    surfacePressure: safeNumOrNull(raw.surface_pressure),
    windSpeed: safeNumOrNull(raw.wind_speed_10m),
    windDir: safeNumOrNull(raw.wind_direction_10m),
    windGusts: safeNumOrNull(raw.wind_gusts_10m),
  };
}
