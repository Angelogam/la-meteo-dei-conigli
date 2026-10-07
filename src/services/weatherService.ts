"use client";

import { fetchFull } from "@/lib/openMeteoClient";
import type { MeteoHourly, MeteoCurrent, MeteoDaily } from "./openMeteoService";

export type { MeteoHourly, MeteoCurrent, MeteoDaily };

const HOURLY_PARAMS = [
  "temperature_2m", "relative_humidity_2m", "dew_point_2m",
  "apparent_temperature", "precipitation", "precipitation_probability",
  "weather_code", "pressure_msl", "surface_pressure",
  "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
  "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
  "uv_index", "shortwave_radiation", "direct_radiation", "sunshine_duration",
  "temperature_80m", "temperature_120m",
  "wind_speed_80m", "wind_direction_80m",
  "wind_speed_120m", "wind_direction_120m",
  "wind_speed_180m", "wind_direction_180m",
  "cape", "convective_inhibition", "lifted_index",
  "freezing_level_height",
  "wind_speed_925hPa", "wind_direction_925hPa",
  "wind_speed_850hPa", "wind_direction_850hPa",
  "wind_speed_700hPa", "wind_direction_700hPa",
  "wind_speed_600hPa", "wind_direction_600hPa",
  "wind_speed_500hPa", "wind_direction_500hPa",
].join(",");

const DAILY_PARAMS = [
  "weather_code", "temperature_2m_max", "temperature_2m_min",
  "temperature_2m_mean", "apparent_temperature_max", "apparent_temperature_min",
  "sunrise", "sunset", "daylight_duration", "sunshine_duration",
  "precipitation_sum", "rain_sum", "snowfall_sum",
  "precipitation_hours", "precipitation_probability_max",
  "wind_speed_10m_max", "wind_gusts_10m_max",
  "wind_direction_10m_dominant", "shortwave_radiation_sum", "uv_index_max",
].join(",");

const CURRENT_PARAMS = [
  "temperature_2m", "relative_humidity_2m", "dew_point_2m",
  "apparent_temperature", "is_day", "precipitation", "rain",
  "snowfall", "weather_code", "cloud_cover",
  "pressure_msl", "surface_pressure",
  "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "cape",
  "convective_inhibition",
  "lifted_index",
  "uv_index", "visibility",
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

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<{
    hourly: MeteoHourly[];
    current: MeteoCurrent;
    daily: MeteoDaily[];
    model: string;
  }> {
    const json: any = await fetchFull(lat, lon, HOURLY_PARAMS, DAILY_PARAMS, CURRENT_PARAMS);

    const hourly: MeteoHourly[] = [];
    for (let i = 0; i < json.hourly.time.length; i++) {
      const t = safeNumOrNull(json.hourly.temperature_2m?.[i]);
      const h = safeNumOrNull(json.hourly.relative_humidity_2m?.[i]);
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
        pressure: pressure,
        surfacePressure: surfacePressure,
        precipitation: safeNum(json.hourly.precipitation?.[i], 0),
        rain: safeNum(json.hourly.rain?.[i], 0),
        snowfall: safeNum(json.hourly.snowfall?.[i], 0),
        weatherCode: safeNum(json.hourly.weather_code?.[i], 0),
        cloudCover: safeNum(json.hourly.cloud_cover?.[i], 0),
        cloudCoverLow: safeNum(json.hourly.cloud_cover_low?.[i], 0),
        cloudCoverMid: safeNum(json.hourly.cloud_cover_mid?.[i], 0),
        cloudCoverHigh: safeNum(json.hourly.cloud_cover_high?.[i], 0),
        windSpeed: safeNumOrNull(json.hourly.wind_speed_10m?.[i]),
        windDir: safeNumOrNull(json.hourly.wind_direction_10m?.[i]),
        windGusts: safeNumOrNull(json.hourly.wind_gusts_10m?.[i]),
        uvIndex: safeNumOrNull(json.hourly.uv_index?.[i]),
        cape: safeNumOrNull(json.hourly.cape?.[i]),
        cin: safeNumOrNull(json.hourly.convective_inhibition?.[i]),
        liftedIndex: safeNumOrNull(json.hourly.lifted_index?.[i]),
        temp80m,
        temp120m,
        shortwaveRadiation: safeNum(json.hourly.shortwave_radiation?.[i], 0),
        directRadiation: safeNum(json.hourly.direct_radiation?.[i], 0),
        visibility: safeNumOrNull(json.hourly.visibility?.[i]),
        feelsLike: feelsLike,
        apparentTemp: feelsLike,
        precipitationProbability: safeNum(json.hourly.precipitation_probability?.[i], 0),
        isDay: true,
        freezingLevel: freezingLevel,
        sunshineDuration: safeNum(json.hourly.sunshine_duration?.[i], 0),
        windSpeed925: safeNumOrNull(json.hourly.wind_speed_925hPa?.[i]),
        windDir925: safeNumOrNull(json.hourly.wind_direction_925hPa?.[i]),
        windSpeed850: safeNumOrNull(json.hourly.wind_speed_850hPa?.[i]),
        windDir850: safeNumOrNull(json.hourly.wind_direction_850hPa?.[i]),
        windSpeed700: safeNumOrNull(json.hourly.wind_speed_700hPa?.[i]),
        windDir700: safeNumOrNull(json.hourly.wind_direction_700hPa?.[i]),
        windSpeed180m,
        windDir180m,
        windSpeed80m,
        windDir80m,
        windSpeed120m,
        windDir120m,
        windSpeed600: safeNumOrNull(json.hourly.wind_speed_600hPa?.[i]),
        windDir600: safeNumOrNull(json.hourly.wind_direction_600hPa?.[i]),
        windSpeed500: safeNumOrNull(json.hourly.wind_speed_500hPa?.[i]),
        windDir500: safeNumOrNull(json.hourly.wind_direction_500hPa?.[i]),
        vapourPressureDeficit: 0,
        mixingRatio: 0,
        virtualTemp: 0,
        precipitationProba: safeNum(json.hourly.precipitation_probability?.[i], 0),
        evapotranspiration: 0,
        et0: 0,
        soilTemp: 0,
        soilMoisture: 0,
        diffuseRadiation: 0,
        directNormalIrradiance: 0,
        terrestrialRadiation: 0,
        radiation: safeNum(json.hourly.shortwave_radiation?.[i], 0),
      });
    }

    const c = json.current;
    const curTemp = safeNumOrNull(c?.temperature_2m);
    const curHum = safeNumOrNull(c?.relative_humidity_2m);
    const curDew = safeNumOrNull(c?.dew_point_2m);

    const current: MeteoCurrent = {
      time: new Date(c?.time || Date.now()),
      temperature: curTemp,
      humidity: curHum,
      dewPoint: curDew,
      apparentTemp: safeNumOrNull(c?.apparent_temperature),
      precipitation: safeNum(c?.precipitation, 0),
      weatherCode: safeNum(c?.weather_code, 0),
      cloudCover: safeNum(c?.cloud_cover, 0),
      cloudCoverLow: safeNum(c?.cloud_cover_low, 0),
      cloudCoverMid: safeNum(c?.cloud_cover_mid, 0),
      cloudCoverHigh: safeNum(c?.cloud_cover_high, 0),
      windSpeed: safeNumOrNull(c?.wind_speed_10m),
      windDir: safeNumOrNull(c?.wind_direction_10m),
      windGusts: safeNumOrNull(c?.wind_gusts_10m),
      cape: safeNumOrNull(c?.cape),
      cin: safeNumOrNull(c?.convective_inhibition),
      liftedIndex: safeNumOrNull(c?.lifted_index),
      pressure: safeNumOrNull(c?.pressure_msl),
      surfacePressure: safeNumOrNull(c?.surface_pressure),
      uvIndex: safeNumOrNull(c?.uv_index),
      visibility: safeNumOrNull(c?.visibility),
    };

    const daily: MeteoDaily[] = [];
    for (let i = 0; i < (json.daily?.time?.length || 0); i++) {
      daily.push({
        date: new Date(json.daily.time[i]),
        weatherCode: safeNum(json.daily.weather_code?.[i], 0),
        tempMax: safeNumOrNull(json.daily.temperature_2m_max?.[i]),
        tempMin: safeNumOrNull(json.daily.temperature_2m_min?.[i]),
        precipitationSum: safeNum(json.daily.precipitation_sum?.[i], 0),
        precipitationProbabilityMax: safeNum(json.daily.precipitation_probability_max?.[i], 0),
        windSpeedMax: safeNumOrNull(json.daily.wind_speed_10m_max?.[i]),
        windGustsMax: safeNumOrNull(json.daily.wind_gusts_10m_max?.[i]),
        windDirDominant: safeNumOrNull(json.daily.wind_direction_10m_dominant?.[i]),
        uvIndexMax: safeNumOrNull(json.daily.uv_index_max?.[i]),
        sunrise: json.daily.sunrise?.[i] ?? "",
        sunset: json.daily.sunset?.[i] ?? "",
        temperatureMax: safeNumOrNull(json.daily.temperature_2m_max?.[i]),
        temperatureMin: safeNumOrNull(json.daily.temperature_2m_min?.[i]),
        temperatureMean: safeNumOrNull(json.daily.temperature_2m_mean?.[i]),
        apparentTempMax: safeNumOrNull(json.daily.apparent_temperature_max?.[i]),
        apparentTempMin: safeNumOrNull(json.daily.apparent_temperature_min?.[i]),
        daylightDuration: safeNum(json.daily.daylight_duration?.[i], 0),
        sunshineDuration: safeNum(json.daily.sunshine_duration?.[i], 0),
        rainSum: safeNum(json.daily.rain_sum?.[i], 0),
        snowfallSum: safeNum(json.daily.snowfall_sum?.[i], 0),
        precipitationHours: safeNum(json.daily.precipitation_hours?.[i], 0),
        shortwaveRadiationSum: safeNum(json.daily.shortwave_radiation_sum?.[i], 0),
      });
    }

    return { hourly, current, daily, model: "Open-Meteo DWD/AROME/ICON" };
  },

  async fetchWithFallback(lat: number, lon: number) {
    try {
      const data = await this.fetchWeather(lat, lon);
      return { data, ok: true };
    } catch {
      return { data: null, ok: false };
    }
  },
};
