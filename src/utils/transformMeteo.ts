"use client";

import type { HourData, DailyData, MeteoCurrent, MeteoLight } from "@/types/meteo";

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
    
    result.push({
      time: new Date(timeStr),
      temperature: temperature,
      feelsLike: 0,
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
    });
  }

  return result;
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
    windSpeed: Number(raw.wind_speed_10m) ?? 0,
    windDir: Number(raw.wind_direction_10m) ?? 0,
    windGusts: Number(raw.wind_gusts_10m) ?? 0,
  };
}

export function transformDailyData(raw: RawMeteoResponse["daily"]): DailyData[] {
  const len = raw.time.length;
  const result: DailyData[] = [];

  for (let i = 0; i < len; i++) {
    result.push({
      date: new Date(raw.time[i] as string),
      tempMax: Number(raw.temperature_2m_max?.[i]) ?? 0,
      tempMin: Number(raw.temperature_2m_min?.[i]) ?? 0,
      apparentTempMax: Number(raw.apparent_temperature_max?.[i]) ?? 0,
      apparentTempMin: Number(raw.apparent_temperature_min?.[i]) ?? 0,
      sunrise: raw.sunrise?.[i] as string ?? "",
      sunset: raw.sunset?.[i] as string ?? "",
      daylightDuration: Number(raw.daylight_duration?.[i]) ?? 0,
      sunshineDuration: Number(raw.sunshine_duration?.[i]) ?? 0,
      precipitationSum: Number(raw.precipitation_sum?.[i]) ?? 0,
      rainSum: Number(raw.rain_sum?.[i]) ?? 0,
      snowfallSum: Number(raw.snowfall_sum?.[i]) ?? 0,
      precipitationHours: Number(raw.precipitation_hours?.[i]) ?? 0,
      precipitationProbabilityMax: Number(raw.precipitation_probability_max?.[i]) ?? 0,
      windSpeedMax: Number(raw.wind_speed_10m_max?.[i]) ?? 0,
      windGustsMax: Number(raw.wind_gusts_10m_max?.[i]) ?? 0,
      windDirDominant: Number(raw.wind_direction_10m_dominant?.[i]) ?? 0,
      shortwaveRadiationSum: Number(raw.shortwave_radiation_sum?.[i]) ?? 0,
      uvIndexMax: Number(raw.uv_index_max?.[i]) ?? 0,
      windSpeed: Number(raw.wind_speed_10m[i]) ?? 0,
      cloudCover: Number(raw.cloudCover?.[i] ?? 0),
      weatherDescription: raw.weatherDescription?.[i] as string ?? "",
    });
  }

  return result;
}