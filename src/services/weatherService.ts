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
  "temperature_80m", "temperature_120m", "temperature_180m",
  "boundary_layer_height",
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
      const temp180m = safeNumOrNull(json.hourly.temperature_180m?.[i]);
      const boundaryLayerHeight = safeNumOrNull(json.hourly.boundary_layer_height?.[i]);
      const rawIsDay = json.hourly.is_day?.[i];
      // is_day: usa dato API quando disponibile, altrimenti null
      const isDay = rawIsDay != null ? !!rawIsDay : null;
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
        precipitation: safeNumOrNull(json.hourly.precipitation?.[i]),
        rain: safeNumOrNull(json.hourly.rain?.[i]),
        snowfall: safeNumOrNull(json.hourly.snowfall?.[i]),
        weatherCode: safeNumOrNull(json.hourly.weather_code?.[i]),
        cloudCover: safeNumOrNull(json.hourly.cloud_cover?.[i]),
        cloudCoverLow: safeNumOrNull(json.hourly.cloud_cover_low?.[i]),
        cloudCoverMid: safeNumOrNull(json.hourly.cloud_cover_mid?.[i]),
        cloudCoverHigh: safeNumOrNull(json.hourly.cloud_cover_high?.[i]),
        windSpeed: safeNumOrNull(json.hourly.wind_speed_10m?.[i]),
        windDir: safeNumOrNull(json.hourly.wind_direction_10m?.[i]),
        windGusts: safeNumOrNull(json.hourly.wind_gusts_10m?.[i]),
        uvIndex: safeNumOrNull(json.hourly.uv_index?.[i]),
        cape: safeNumOrNull(json.hourly.cape?.[i]),
        cin: safeNumOrNull(json.hourly.convective_inhibition?.[i]),
        liftedIndex: safeNumOrNull(json.hourly.lifted_index?.[i]),
        temp80m,
        temp120m,
        shortwaveRadiation: safeNumOrNull(json.hourly.shortwave_radiation?.[i]),
        directRadiation: safeNumOrNull(json.hourly.direct_radiation?.[i]),
        visibility: safeNumOrNull(json.hourly.visibility?.[i]),
        feelsLike: feelsLike,
        apparentTemp: feelsLike,
        precipitationProbability: safeNumOrNull(json.hourly.precipitation_probability?.[i]),
        isDay: isDay,
        freezingLevel: freezingLevel,
        sunshineDuration: safeNumOrNull(json.hourly.sunshine_duration?.[i]),
        windSpeed925: safeNumOrNull(json.hourly.wind_speed_925hPa?.[i]),
        windDir925: safeNumOrNull(json.hourly.wind_direction_925hPa?.[i]),
        windSpeed850: safeNumOrNull(json.hourly.wind_speed_850hPa?.[i]),
        windDir850: safeNumOrNull(json.hourly.wind_direction_850hPa?.[i]),
        windSpeed700: safeNumOrNull(json.hourly.wind_speed_700hPa?.[i]),
        windDir700: safeNumOrNull(json.hourly.wind_direction_700hPa?.[i]),
        windSpeed180m,
        windDir180m,
        temperature180m: temp180m,
        boundaryLayerHeight: boundaryLayerHeight,
        windSpeed80m,
        windDir80m,
        windSpeed120m,
        windDir120m,
        windSpeed600: safeNumOrNull(json.hourly.wind_speed_600hPa?.[i]),
        windDir600: safeNumOrNull(json.hourly.wind_direction_600hPa?.[i]),
        windSpeed500: safeNumOrNull(json.hourly.wind_speed_500hPa?.[i]),
        windDir500: safeNumOrNull(json.hourly.wind_direction_500hPa?.[i]),
        vapourPressureDeficit: null,
        mixingRatio: null,
        virtualTemp: null,
        precipitationProba: safeNumOrNull(json.hourly.precipitation_probability?.[i]),
        evapotranspiration: null,
        et0: null,
        soilTemp: null,
        soilMoisture: null,
        diffuseRadiation: null,
        directNormalIrradiance: null,
        terrestrialRadiation: null,
        radiation: safeNumOrNull(json.hourly.shortwave_radiation?.[i]),
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
      precipitation: safeNumOrNull(c?.precipitation),
      weatherCode: safeNumOrNull(c?.weather_code),
      cloudCover: safeNumOrNull(c?.cloud_cover),
      cloudCoverLow: safeNumOrNull(c?.cloud_cover_low),
      cloudCoverMid: safeNumOrNull(c?.cloud_cover_mid),
      cloudCoverHigh: safeNumOrNull(c?.cloud_cover_high),
      windSpeed: safeNumOrNull(c?.wind_speed_10m),
      windDir: safeNumOrNull(c?.wind_direction_10m),
      windGusts: safeNumOrNull(c?.wind_gusts_10m),
      cape: safeNumOrNull(c?.cape),
      cin: safeNumOrNull(c?.convective_inhibition),
      liftedIndex: safeNumOrNull(c?.lifted_index),
      isDay: c.is_day != null ? !!c.is_day : null,
      pressure: safeNumOrNull(c?.pressure_msl),
      surfacePressure: safeNumOrNull(c?.surface_pressure),
      uvIndex: safeNumOrNull(c?.uv_index),
      visibility: safeNumOrNull(c?.visibility),
    };

    const daily: MeteoDaily[] = [];
    for (let i = 0; i < (json.daily?.time?.length || 0); i++) {
      daily.push({
        date: new Date(json.daily.time[i]),
        weatherCode: safeNumOrNull(json.daily.weather_code?.[i]),
          tempMax: safeNumOrNull(json.daily.temperature_2m_max?.[i]),
          tempMin: safeNumOrNull(json.daily.temperature_2m_min?.[i]),
          precipitationSum: safeNumOrNull(json.daily.precipitation_sum?.[i]),
          precipitationProbabilityMax: safeNumOrNull(json.daily.precipitation_probability_max?.[i]),
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
          daylightDuration: safeNumOrNull(json.daily.daylight_duration?.[i]),
          sunshineDuration: safeNumOrNull(json.daily.sunshine_duration?.[i]),
          rainSum: safeNumOrNull(json.daily.rain_sum?.[i]),
          snowfallSum: safeNumOrNull(json.daily.snowfall_sum?.[i]),
          precipitationHours: safeNumOrNull(json.daily.precipitation_hours?.[i]),
          shortwaveRadiationSum: safeNumOrNull(json.daily.shortwave_radiation_sum?.[i]),
      });
    }

    return { hourly, current, daily, model: "Open-Meteo · modello automatico" };
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
