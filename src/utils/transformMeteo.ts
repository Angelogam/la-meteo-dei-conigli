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
    result.push({
      time: new Date(raw.time[i]),
      temperature: raw.temperature_2m[i] as number,
      humidity: raw.relative_humidity_2m[i] as number,
      dewPoint: (raw.dew_point_2m?.[i] as number) ?? 10,
      pressure: raw.pressure_msl[i] as number,
      surfacePressure: (raw.surface_pressure?.[i] as number) ?? 1013,
      precipitation: raw.precipitation[i] as number,
      rain: (raw.rain?.[i] as number) ?? 0,
      snowfall: (raw.snowfall?.[i] as number) ?? 0,
      weatherCode: raw.weather_code[i] as number,
      cloudCover: raw.cloud_cover[i] as number,
      cloudCoverLow: (raw.cloud_cover_low?.[i] as number) ?? 0,
      cloudCoverMid: (raw.cloud_cover_mid?.[i] as number) ?? 0,
      cloudCoverHigh: (raw.cloud_cover_high?.[i] as number) ?? 0,
      windSpeed: raw.wind_speed_10m[i] as number,
      windDir: raw.wind_direction_10m[i] as number,
      windGusts: (raw.wind_gusts_10m?.[i] as number) ?? 0,
      uvIndex: (raw.uv_index?.[i] as number) ?? 0,
      // Campi aggiuntivi richiesti da HourData
      feelsLike: (raw.apparent_temperature?.[i] as number) ?? (raw.temperature_2m[i] as number),
      radiation: (raw.shortwave_radiation?.[i] as number) ?? 0,
      directRadiation: (raw.direct_radiation?.[i] as number) ?? 0,
      visibility: (raw.visibility?.[i] as number) ?? 10000,
      vapourPressureDeficit: (raw.vapour_pressure_deficit?.[i] as number) ?? 0,
      isDay: (raw.is_day?.[i] as number) === 1,
      freezingLevel: (raw.freezing_level_height?.[i] as number) ?? 3000,
      sunshineDuration: (raw.sunshine_duration?.[i] as number) ?? 0,
      cape: 0,
      cin: 0,
      liftedIndex: 0,
      mixingRatio: 0,
      virtualTemp: 0,
    });
  }

  return result;
}

export function transformCurrentData(raw: RawMeteoResponse["current"]) {
  // Return type matches what consuming code expects — we don't export a CurrentData type
  return {
    time: new Date(raw.time),
    temperature: raw.temperature_2m as number,
    humidity: raw.relative_humidity_2m as number,
    isDay: raw.is_day as number,
    precipitation: raw.precipitation as number,
    rain: raw.rain as number,
    snowfall: raw.snowfall as number,
    weatherCode: raw.weather_code as number,
    cloudCover: raw.cloud_cover as number,
    pressure: raw.pressure_msl as number,
    surfacePressure: raw.surface_pressure as number,
    windSpeed: raw.wind_speed_10m as number,
    windDir: raw.wind_direction_10m as number,
    windGusts: raw.wind_gusts_10m as number,
  };
}

export function transformDailyData(raw: RawMeteoResponse["daily"]): DailyData[] {
  const len = raw.time.length;
  const result: DailyData[] = [];

  for (let i = 0; i < len; i++) {
    result.push({
      date: new Date(raw.time[i]),
      weatherCode: raw.weather_code[i] as number,
      temperatureMax: raw.temperature_2m_max[i] as number,
      temperatureMin: raw.temperature_2m_min[i] as number,
      temperatureMean: (raw.temperature_2m_mean?.[i] as number) ?? ((raw.temperature_2m_max[i] as number + (raw.temperature_2m_min[i] as number)) / 2),
      apparentTempMax: raw.apparent_temperature_max?.[i] as number ?? (raw.temperature_2m_max[i] as number),
      apparentTempMin: raw.apparent_temperature_min?.[i] as number ?? (raw.temperature_2m_min[i] as number),
      sunrise: raw.sunrise[i] as string,
      sunset: raw.sunset[i] as string,
      daylightDuration: raw.daylight_duration[i] as number,
      sunshineDuration: raw.sunshine_duration[i] as number,
      precipitationSum: raw.precipitation_sum[i] as number,
      rainSum: raw.rain_sum?.[i] as number ?? 0,
      snowfallSum: raw.snowfall_sum?.[i] as number ?? 0,
      precipitationHours: raw.precipitation_hours[i] as number,
      precipitationProbabilityMax: raw.precipitation_probability_max[i] as number,
      windSpeedMax: raw.wind_speed_10m_max[i] as number,
      windGustsMax: raw.wind_gusts_10m_max[i] as number,
      windDirDominant: raw.wind_direction_10m_dominant[i] as number,
      shortwaveRadiationSum: raw.shortwave_radiation_sum[i] as number,
      uvIndexMax: raw.uv_index_max[i] as number,
      windSpeed: Math.round((raw.wind_speed_10m_max[i] as number) * 0.6),
      cloudCover: 0,
      weatherDescription: "",
    });
  }

  return result;
}