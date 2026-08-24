"use client";

import type { HourData, DailyData } from "@/types/meteo";

interface RawMeteoResponse {
  hourly: Record<string, (number | string)[]>;
  daily: Record<string, (number | string)[]>;
  current: Record<string, number | string>;
}

export function transformHourlyData(raw: RawMeteoResponse["hourly"]): HourData[] {
  const len = raw.time.length;
  const result: HourData[] = [];

  for (let i = 0; i < len; i++) {
    const timeStr = raw.time[i] as string;
    const time = new Date(timeStr);
    
    const temperature = Number(raw.temperature_2m?.[i]) ?? 15;
    const humidity = Number(raw.relative_humidity_2m?.[i] ?? 50);
    const dewPoint = Number(raw.dew_point_2m?.[i] ?? 10);
    const pressure = Number(raw.pressure_msl?.[i] ?? 1013);
    const surfacePressure = Number(raw.surface_pressure?.[i] ?? 1013);
    const precipitation = Number(raw.precipitation?.[i] ?? 0);
    const rain = Number(raw.rain?.[i] ?? 0);
    const snowfall = Number(raw.snowfall?.[i] ?? 0);
    const weatherCode = Number(raw.weather_code?.[i] ?? 0);
    const cloudCover = Number(raw.cloud_cover?.[i] ?? 0);
    const cloudCoverLow = Number(raw.cloud_cover_low?.[i] ?? 0);
    const cloudCoverMid = Number(raw.cloud_cover_mid?.[i] ?? 0);
    const cloudCoverHigh = Number(raw.cloud_cover_high?.[i] ?? 0);
    const windSpeed = Number(raw.wind_speed_10m?.[i] ?? 0);
    const windDir = Number(raw.wind_direction_10m?.[i] ?? 0);
    const windGusts = Number(raw.wind_gusts_10m?.[i] ?? 0);
    const uvIndex = Number(raw.uv_index?.[i] ?? 0);
    const visibility = Number(raw.visibility?.[i] ?? 10000);
    const directRadiation = Number(raw.direct_radiation?.[i] ?? 0);
    const diffuseRadiation = Number(raw.diffuse_radiation?.[i] ?? 0);
    const shortwaveRadiation = Number(raw.shortwave_radiation?.[i] ?? 0);

    result.push({
      time: new Date(timeStr),
      temperature: temperature,
      humidity: humidity,
      dewPoint: dewPoint,
      pressure: pressure,
      surfacePressure: surfacePressure,
      precipitation: precipitation,
      rain: rain,
      snowfall: snowfall,
      weatherCode: weatherCode,
      cloudCover: cloudCover,
      cloudCoverLow: cloudCoverLow,
      cloudCoverMid: cloudCoverMid,
      cloudCoverHigh: cloudCoverHigh,
      windSpeed: windSpeed,
      windDir: windDir,
      windGusts: windGusts,
      uvIndex: uvIndex,
      visibility: visibility,
      directRadiation: directRadiation,
      diffuseRadiation: diffuseRadiation,
      shortwaveRadiation: shortwaveRadiation,
      feelsLike: temperature,
      radiation: shortwaveRadiation,
      vapourPressureDeficit: 0,
      isDay: 1,
      freezingLevel: 3000,
      sunshineDuration: 0,
      cape: 0,
      cin: 0,
      liftedIndex: 0,
      mixingRatio: 0,
      virtualTemp: 0,
      windProfile: undefined,
      temp80m: undefined,
      temp120m: undefined,
      apparentTemp: temperature,
      precipitationProba: 0,
      evapotranspiration: 0,
      et0: 0,
      soilTemp: 0,
      soilMoisture: 0,
      directNormalIrradiance: 0,
      terrestrialRadiation: 0,
    });
  }

  return result;
}

export interface MeteoCurrent {
  time: Date;
  temperature: number;
  humidity: number;
  apparentTemp: number;
  isDay: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  surfacePressure: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
}

export function transformCurrentData(raw: RawMeteoResponse["current"]): MeteoCurrent {
  return {
    time: new Date(raw.time),
    temperature: Number(raw.temperature_2m) ?? 0,
    humidity: Number(raw.relative_humidity_2m) ?? 50,
    apparentTemp: Number(raw.apparent_temperature) ?? 0,
    isDay: Number(raw.is_day) ?? 1,
    precipitation: Number(raw.precipitation) ?? 0,
    rain: Number(raw.rain) ?? 0,
    snowfall: Number(raw.snowfall) ?? 0,
    weatherCode: Number(raw.weather_code) ?? 0,
    cloudCover: Number(raw.cloud_cover) ?? 0,
    pressure: Number(raw.pressure_msl) ?? 1013,
    surfacePressure: Number(raw.surface_pressure) ?? 1013,
    windSpeed: Number(Number(raw.wind_speed_10m) ?? 0),
    windDir: Number(Number(raw.wind_direction_10m) ?? 0),
    windGusts: Number(Number(raw.wind_gusts_10m) ?? 0),
  };
}