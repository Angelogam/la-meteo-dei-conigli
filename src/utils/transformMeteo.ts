"use client";

import type { MeteoResponse, HourData, CurrentData, DailyData } from "@/types/meteo";

export function transformHourlyData(raw: MeteoResponse["hourly"]): HourData[] {
  const len = raw.time.length;
  const result: HourData[] = [];

  for (let i = 0; i < len; i++) {
    result.push({
      time: new Date(raw.time[i]),
      temperature: raw.temperature_2m[i] as number,
      humidity: raw.relative_humidity_2m[i] as number,
      dewPoint: (raw.dew_point_2m?.[i] as number) ?? 10,
      apparentTemp: raw.apparent_temperature[i] as number,
      precipitationProba: raw.precipitation_probability[i] as number,
      precipitation: raw.precipitation[i] as number,
      rain: raw.rain[i] as number,
      showers: raw.showers[i] as number,
      snowfall: raw.snowfall[i] as number,
      weatherCode: raw.weather_code[i] as number,
      pressure: raw.pressure_msl[i] as number,
      surfacePressure: raw.surface_pressure[i] as number,
      cloudCover: raw.cloud_cover[i] as number,
      cloudCoverLow: raw.cloud_cover_low[i] as number,
      cloudCoverMid: raw.cloud_cover_mid[i] as number,
      cloudCoverHigh: raw.cloud_cover_high[i] as number,
      evapotranspiration: raw.evapotranspiration[i] as number,
      et0: raw.et0_fao_evapotranspiration[i] as number,
      vapourPressureDeficit: raw.vapour_pressure_deficit[i] as number,
      windSpeed: raw.wind_speed_10m[i] as number,
      windDir: raw.wind_direction_10m[i] as number,
      windGusts: raw.wind_gusts_10m[i] as number,
      soilTemp: (raw.soil_temperature_0cm?.[i] as number) ?? 15,
      soilMoisture: (raw.soil_moisture_0_to_1cm?.[i] as number) ?? 0.3,
      uvIndex: (raw.uv_index?.[i] as number) ?? 0,
      temp80m: (raw.temperature_80m?.[i] as number) ?? null,
      temp120m: (raw.temperature_120m?.[i] as number) ?? null,
      shortwaveRadiation: raw.shortwave_radiation[i] as number,
      directRadiation: raw.direct_radiation[i] as number,
      diffuseRadiation: raw.diffuse_radiation[i] as number,
      directNormalIrradiance: raw.direct_normal_irradiance[i] as number,
      terrestrialRadiation: raw.terrestrial_radiation[i] as number,
      sunshineDuration: raw.sunshine_duration[i] as number,
    });
  }

  return result;
}

export function transformCurrentData(raw: MeteoResponse["current"]): CurrentData {
  return {
    time: new Date(raw.time),
    temperature: raw.temperature_2m as number,
    humidity: raw.relative_humidity_2m as number,
    apparentTemp: raw.apparent_temperature as number,
    isDay: raw.is_day as number,
    precipitation: raw.precipitation as number,
    rain: raw.rain as number,
    showers: raw.showers as number,
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

export function transformDailyData(raw: MeteoResponse["daily"]): DailyData[] {
  const len = raw.time.length;
  const result: DailyData[] = [];

  for (let i = 0; i < len; i++) {
    result.push({
      time: new Date(raw.time[i]),
      tempMax: raw.temperature_2m_max[i] as number,
      tempMin: raw.temperature_2m_min[i] as number,
      apparentTempMax: raw.apparent_temperature_max[i] as number,
      apparentTempMin: raw.apparent_temperature_min[i] as number,
      sunrise: raw.sunrise[i] as string,
      sunset: raw.sunset[i] as string,
      daylightDuration: raw.daylight_duration[i] as number,
      sunshineDuration: raw.sunshine_duration[i] as number,
      uvIndexMax: raw.uv_index_max[i] as number,
      uvIndexClearSkyMax: raw.uv_index_clear_sky_max[i] as number,
      precipitationSum: raw.precipitation_sum[i] as number,
      rainSum: raw.rain_sum[i] as number,
      showersSum: raw.showers_sum[i] as number,
      snowfallSum: raw.snowfall_sum[i] as number,
      precipitationHours: raw.precipitation_hours[i] as number,
      precipitationProbaMax: raw.precipitation_probability_max[i] as number,
      weatherCode: raw.weather_code[i] as number,
      windSpeedMax: raw.wind_speed_10m_max[i] as number,
      windGustsMax: raw.wind_gusts_10m_max[i] as number,
      windDirDominant: raw.wind_direction_10m_dominant[i] as number,
      shortwaveRadiationSum: raw.shortwave_radiation_sum[i] as number,
      et0Sum: raw.et0_fao_evapotranspiration[i] as number,
    });
  }

  return result;
}