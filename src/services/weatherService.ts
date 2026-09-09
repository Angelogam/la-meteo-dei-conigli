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
  "uv_index", "visibility",
].join(",");

function safeNum(v: unknown, fallback: number = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
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
      const t = json.hourly.temperature_2m[i] ?? 0;
      const h = json.hourly.relative_humidity_2m[i] ?? 50;
      const dew = json.hourly.dew_point_2m?.[i] ?? (t - (100 - h) / 5);

      hourly.push({
        time: new Date(json.hourly.time[i]),
        temperature: t,
        humidity: h,
        dewPoint: dew,
        pressure: json.hourly.pressure_msl?.[i] ?? null,
        surfacePressure: json.hourly.surface_pressure?.[i] ?? null,
        precipitation: json.hourly.precipitation[i] ?? 0,
        rain: json.hourly.rain?.[i] ?? 0,
        snowfall: json.hourly.snowfall?.[i] ?? 0,
        weatherCode: json.hourly.weather_code[i] ?? 0,
        cloudCover: json.hourly.cloud_cover[i] ?? 0,
        cloudCoverLow: json.hourly.cloud_cover_low?.[i] ?? 0,
        cloudCoverMid: json.hourly.cloud_cover_mid?.[i] ?? 0,
        cloudCoverHigh: json.hourly.cloud_cover_high?.[i] ?? 0,
        windSpeed: json.hourly.wind_speed_10m[i] ?? 0,
        windDir: json.hourly.wind_direction_10m[i] ?? 0,
        windGusts: json.hourly.wind_gusts_10m?.[i] ?? 0,
        uvIndex: json.hourly.uv_index?.[i] ?? 0,
        cape: json.hourly.cape?.[i] ?? 0,
        cin: json.hourly.convective_inhibition?.[i] ?? 0,
        liftedIndex: json.hourly.lifted_index?.[i] ?? 0,
        temp80m: json.hourly.temperature_80m?.[i] ?? null,
        temp120m: json.hourly.temperature_120m?.[i] ?? null,
        shortwaveRadiation: json.hourly.shortwave_radiation?.[i] ?? 0,
        directRadiation: json.hourly.direct_radiation?.[i] ?? 0,
        visibility: json.hourly.visibility?.[i] ?? 10000,
        feelsLike: json.hourly.apparent_temperature?.[i] ?? t,
        apparentTemp: json.hourly.apparent_temperature?.[i] ?? t,
        precipitationProbability: json.hourly.precipitation_probability?.[i] ?? 0,
        vapourPressureDeficit: 0,
        isDay: true,
        freezingLevel: null,
        sunshineDuration: 0,
        mixingRatio: 0,
        virtualTemp: 0,
        windProfile: undefined,
        precipitationProba: 0,
        evapotranspiration: 0,
        et0: 0,
        soilTemp: 0,
        soilMoisture: 0,
        diffuseRadiation: 0,
        directNormalIrradiance: 0,
        terrestrialRadiation: 0,
        radiation: json.hourly.shortwave_radiation?.[i] ?? 0,
        windSpeed925: json.hourly.wind_speed_925hPa?.[i] ?? null,
        windDir925: json.hourly.wind_direction_925hPa?.[i] ?? null,
        windSpeed80m: json.hourly.wind_speed_80m?.[i] ?? null,
        windDir80m: json.hourly.wind_direction_80m?.[i] ?? null,
        windSpeed120m: json.hourly.wind_speed_120m?.[i] ?? null,
        windDir120m: json.hourly.wind_direction_120m?.[i] ?? null,
        windSpeed850: json.hourly.wind_speed_850hPa?.[i] ?? null,
        windDir850: json.hourly.wind_direction_850hPa?.[i] ?? null,
        windSpeed700: json.hourly.wind_speed_700hPa?.[i] ?? null,
        windDir700: json.hourly.wind_direction_700hPa?.[i] ?? null,
        windSpeed180m: json.hourly.wind_speed_180m?.[i] ?? null,
        windDir180m: json.hourly.wind_direction_180m?.[i] ?? null,
        windSpeed600: json.hourly.wind_speed_600hPa?.[i] ?? null,
        windDir600: json.hourly.wind_direction_600hPa?.[i] ?? null,
        windSpeed500: json.hourly.wind_speed_500hPa?.[i] ?? null,
        windDir500: json.hourly.wind_direction_500hPa?.[i] ?? null,
      });
    }

    const c = json.current;
    const curTemp = c?.temperature_2m ?? 0;
    const curHum = c?.relative_humidity_2m ?? 50;

    const current: MeteoCurrent = {
      time: new Date(c?.time || Date.now()),
      temperature: curTemp,
      humidity: curHum,
      dewPoint: c?.dew_point_2m ?? (curTemp - (100 - curHum) / 5),
      apparentTemp: c?.apparent_temperature ?? curTemp,
      precipitation: c?.precipitation ?? 0,
      weatherCode: c?.weather_code ?? 0,
      cloudCover: c?.cloud_cover ?? 0,
      windSpeed: c?.wind_speed_10m ?? 0,
      windDir: c?.wind_direction_10m ?? 0,
      windGusts: c?.wind_gusts_10m ?? c?.wind_speed_10m ?? 0,
      cape: c?.cape ?? 0,
      uvIndex: c?.uv_index ?? 0,
      visibility: c?.visibility ?? 10000,
    };

    const daily: MeteoDaily[] = [];
    for (let i = 0; i < (json.daily?.time?.length || 0); i++) {
      daily.push({
        date: new Date(json.daily.time[i]),
        weatherCode: json.daily.weather_code[i] ?? 0,
        tempMax: json.daily.temperature_2m_max[i] ?? 0,
        tempMin: json.daily.temperature_2m_min[i] ?? 0,
        precipitationSum: json.daily.precipitation_sum[i] ?? 0,
        precipitationProbabilityMax: json.daily.precipitation_probability_max[i] ?? 0,
        windSpeedMax: json.daily.wind_speed_10m_max[i] ?? 0,
        windGustsMax: json.daily.wind_gusts_10m_max[i] ?? 0,
        windDirDominant: json.daily.wind_direction_10m_dominant[i] ?? 0,
        uvIndexMax: json.daily.uv_index_max[i] ?? 0,
        sunrise: json.daily.sunrise[i] ?? "",
        sunset: json.daily.sunset[i] ?? "",
        temperatureMax: json.daily.temperature_2m_max[i] ?? 0,
        temperatureMin: json.daily.temperature_2m_min[i] ?? 0,
        temperatureMean: json.daily.temperature_2m_mean[i] ?? 0,
        apparentTempMax: json.daily.apparent_temperature_max[i] ?? 0,
        apparentTempMin: json.daily.apparent_temperature_min[i] ?? 0,
        daylightDuration: json.daily.daylight_duration[i] ?? 0,
        sunshineDuration: json.daily.sunshine_duration[i] ?? 0,
        rainSum: json.daily.rain_sum[i] ?? 0,
        snowfallSum: json.daily.snowfall_sum[i] ?? 0,
        precipitationHours: json.daily.precipitation_hours[i] ?? 0,
        shortwaveRadiationSum: json.daily.shortwave_radiation_sum[i] ?? 0,
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
