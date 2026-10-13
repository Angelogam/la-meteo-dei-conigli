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
  "convective_inhibition",
  "lifted_index",
  "shortwave_radiation",
  "direct_radiation",
  "diffuse_radiation",
  "direct_normal_irradiance",
  "terrestrial_radiation",
  "uv_index",
  "visibility",
  "wind_speed_80m",
  "wind_direction_80m",
  "wind_speed_120m",
  "wind_direction_120m",
  "wind_speed_180m",
  "wind_direction_180m",
  "temperature_180m",
  "boundary_layer_height",
  "convective_cloud_top",
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
  "surface_pressure",
  "pressure_msl",
  "vapour_pressure_deficit",
  "evapotranspiration",
  "et0_fao_evapotranspiration",
  "soil_temperature_0_to_10cm",
  "soil_moisture_0_to_10cm",
  "sunshine_duration",
  "is_day",
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
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cape",
  "convective_inhibition",
  "apparent_temperature",
  "uv_index",
  "visibility",
  "is_day",
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
  humidity: number | null;
  dewPoint: number | null;
  precipitation: number | null;
  weatherCode: number | null;
  cloudCover: number | null;
  cloudCoverLow: number | null;
  cloudCoverMid: number | null;
  cloudCoverHigh: number | null;
  windSpeed: number | null;
  windDir: number | null;
  windGusts: number | null;
  cape: number | null;
  apparentTemp: number | null;
  isDay: boolean | null;
  rain?: number;
  snowfall?: number;
  pressure?: number | null;
  surfacePressure?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
  visibility?: number | null;
  uvIndex?: number | null;
}

export interface MeteoHourly {
  time: Date;
  temperature: number | null;
  humidity: number | null;
  dewPoint: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  cloudCover: number | null;
  cloudCoverLow: number | null;
  cloudCoverMid: number | null;
  cloudCoverHigh: number | null;
  windSpeed: number | null;
  windDir: number | null;
  windGusts: number | null;
  cape: number | null;
  liftedIndex: number | null;
  shortwaveRadiation: number | null;
  directRadiation: number | null;
  uvIndex: number | null;
  visibility: number | null;
  feelsLike: number | null;
  pressure: number | null;
  surfacePressure: number | null;
  rain: number | null;
  snowfall: number | null;
  vapourPressureDeficit: number | null;
  isDay: boolean | null;
  freezingLevel: number | null;
  sunshineDuration: number | null;
  mixingRatio: number | null;
  virtualTemp: number | null;
  windProfile?: { height: number; speed: number; dir: number }[];
  temp80m: number | null;
  temp120m: number | null;
  temperature180m: number | null;
  windSpeed80m: number | null;
  windDir80m: number | null;
  windSpeed120m: number | null;
  windDir120m: number | null;
  windSpeed180m: number | null;
  windDir180m: number | null;
  apparentTemp: number | null;
  precipitationProba: number | null;
  evapotranspiration: number | null;
  et0: number | null;
  soilTemp: number | null;
  soilMoisture: number | null;
  diffuseRadiation: number | null;
  directNormalIrradiance: number | null;
  terrestrialRadiation: number | null;
  radiation: number | null;
  cin: number | null;
  boundaryLayerHeight: number | null;
  convectiveCloudTop?: number | null;
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
  weatherCode: number | null;
  tempMax: number | null;
  tempMin: number | null;
  precipitationSum: number | null;
  precipitationProbabilityMax: number | null;
  windSpeedMax: number | null;
  windGustsMax: number | null;
  windDirDominant: number | null;
  uvIndexMax: number | null;
  sunrise: string;
  sunset: string;
  temperatureMax: number | null;
  temperatureMin: number | null;
  temperatureMean: number | null;
  apparentTempMax: number | null;
  apparentTempMin: number | null;
  daylightDuration: number | null;
  sunshineDuration: number | null;
  rainSum: number | null;
  snowfallSum: number | null;
  precipitationHours: number | null;
  shortwaveRadiationSum: number | null;
  weatherDescription?: string;
  freezingLevel?: number | null; // quota 0°C in metri s.l.m.
  trend?: "↑" | "↓" | "→" | null; // tendenza 24h
}

export async function fetchPrevisioniGiornaliere(lat: number, lon: number): Promise<{
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
  current: MeteoCurrent | null;
  rawJson?: any;
}> {
  try {
    const json = await fetchFull(lat, lon, HOURLY_PARAMS, DAILY_PARAMS, CURRENT_PARAMS);

    // Current
    const c = json.current;
    const current: MeteoCurrent | null = c ? {
          time: new Date(c.time),
          temperature: safeNumOrNull(c.temperature_2m),
          humidity: safeNumOrNull(c.relative_humidity_2m),
          dewPoint: safeNumOrNull(c.dew_point_2m),
          precipitation: safeNumOrNull(c.precipitation),
          weatherCode: safeNumOrNull(c.weather_code),
          cloudCover: safeNumOrNull(c.cloud_cover),
          cloudCoverLow: safeNumOrNull(c.cloud_cover_low),
          cloudCoverMid: safeNumOrNull(c.cloud_cover_mid),
          cloudCoverHigh: safeNumOrNull(c.cloud_cover_high),
          windSpeed: safeNumOrNull(c.wind_speed_10m),
          windDir: safeNumOrNull(c.wind_direction_10m),
          windGusts: safeNumOrNull(c.wind_gusts_10m),
          cape: safeNumOrNull(c.cape),
          cin: safeNumOrNull(c.convective_inhibition),
          apparentTemp: safeNumOrNull(c.apparent_temperature),
          uvIndex: safeNumOrNull(c.uv_index),
          visibility: safeNumOrNull(c.visibility),
          isDay: c.is_day != null ? !!c.is_day : null,
    } : null;

    // Hourly
    const hourly: MeteoHourly[] = [];
    const len = json.hourly?.time?.length || 0;
    for (let i = 0; i < len; i++) {
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
      const windSpeed80m = safeNumOrNull(json.hourly.wind_speed_80m?.[i]);
      const windDir80m = safeNumOrNull(json.hourly.wind_direction_80m?.[i]);
      const windSpeed120m = safeNumOrNull(json.hourly.wind_speed_120m?.[i]);
      const windDir120m = safeNumOrNull(json.hourly.wind_direction_120m?.[i]);
      const windSpeed180m = safeNumOrNull(json.hourly.wind_speed_180m?.[i]);
      const windDir180m = safeNumOrNull(json.hourly.wind_direction_180m?.[i]);
      // is_day dal JSON orario, altrimenti stima dall'ora locale
      const rawIsDay = json.hourly.is_day?.[i];
      const isDay = rawIsDay != null ? !!rawIsDay : (() => {
        const hr = new Date(json.hourly.time[i]).getHours();
        return hr >= 6 && hr <= 20;
      })();

      hourly.push({
        time: new Date(json.hourly.time[i]),
        temperature: t,
        humidity: safeNumOrNull(json.hourly.relative_humidity_2m?.[i]),
        dewPoint: dew,
        precipitation: safeNumOrNull(json.hourly.precipitation?.[i]),
        precipitationProbability: safeNumOrNull(json.hourly.precipitation_probability?.[i]),
        weatherCode: safeNumOrNull(json.hourly.weather_code?.[i]),
        cloudCover: safeNumOrNull(json.hourly.cloud_cover?.[i]),
        cloudCoverLow: safeNumOrNull(json.hourly.cloud_cover_low?.[i]),
        cloudCoverMid: safeNumOrNull(json.hourly.cloud_cover_mid?.[i]),
        cloudCoverHigh: safeNumOrNull(json.hourly.cloud_cover_high?.[i]),
        windSpeed: safeNumOrNull(json.hourly.wind_speed_10m?.[i]),
        windDir: safeNumOrNull(json.hourly.wind_direction_10m?.[i]),
        windGusts: safeNumOrNull(json.hourly.wind_gusts_10m?.[i]),
        cape: safeNumOrNull(json.hourly.cape?.[i]),
        liftedIndex: safeNumOrNull(json.hourly.lifted_index?.[i]),
        shortwaveRadiation: safeNumOrNull(json.hourly.shortwave_radiation?.[i]),
        directRadiation: safeNumOrNull(json.hourly.direct_radiation?.[i]),
        uvIndex: safeNumOrNull(json.hourly.uv_index?.[i]),
        visibility: safeNumOrNull(json.hourly.visibility?.[i]),
        feelsLike: feelsLike,
        pressure: pressure,
        surfacePressure: surfacePressure,
        rain: safeNumOrNull(json.hourly.rain?.[i]),
        snowfall: safeNumOrNull(json.hourly.snowfall?.[i]),
        vapourPressureDeficit: safeNumOrNull(json.hourly.vapour_pressure_deficit?.[i]),
        isDay,
        freezingLevel: freezingLevel,
        sunshineDuration: safeNumOrNull(json.hourly.sunshine_duration?.[i]),
        mixingRatio: null,
        virtualTemp: null,
        temp80m,
        temp120m,
        temperature180m: temp180m,
        windSpeed80m,
        windDir80m,
        windSpeed120m,
        windDir120m,
        windSpeed180m,
        windDir180m,
        apparentTemp: feelsLike,
        precipitationProba: safeNumOrNull(json.hourly.precipitation_probability?.[i]),
        evapotranspiration: safeNumOrNull(json.hourly.evapotranspiration?.[i]),
        et0: safeNumOrNull(json.hourly.et0_fao_evapotranspiration?.[i]),
        soilTemp: safeNumOrNull(json.hourly.soil_temperature_0_to_10cm?.[i]),
        soilMoisture: safeNumOrNull(json.hourly.soil_moisture_0_to_10cm?.[i]),
        diffuseRadiation: safeNumOrNull(json.hourly.diffuse_radiation?.[i]),
        directNormalIrradiance: safeNumOrNull(json.hourly.direct_normal_irradiance?.[i]),
        terrestrialRadiation: safeNumOrNull(json.hourly.terrestrial_radiation?.[i]),
        radiation: safeNumOrNull(json.hourly.shortwave_radiation?.[i]),
        cin: safeNumOrNull(json.hourly.convective_inhibition?.[i]),
        boundaryLayerHeight: boundaryLayerHeight,
        convectiveCloudTop: safeNumOrNull(json.hourly.convective_cloud_top?.[i]),
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
        weatherCode: safeNumOrNull(json.daily.weather_code?.[i]),
        tempMax: safeNumOrNull(json.daily.temperature_2m_max?.[i]),
        tempMin: safeNumOrNull(json.daily.temperature_2m_min?.[i]),
        precipitationSum: safeNumOrNull(json.daily.precipitation_sum?.[i]),
        precipitationProbabilityMax: safeNumOrNull(json.daily.precipitation_probability_max?.[i]),
        windSpeedMax: safeNumOrNull(json.daily.wind_speed_10m_max?.[i]),
        windGustsMax: safeNumOrNull(json.daily.wind_gusts_10m_max?.[i]),
        windDirDominant: safeNumOrNull(json.daily.wind_direction_10m_dominant?.[i]),
        uvIndexMax: safeNumOrNull(json.daily.uv_index_max?.[i]),
        sunrise: json.daily.sunrise?.[i] ?? "N/D",
        sunset: json.daily.sunset?.[i] ?? "N/D",
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
        freezingLevel: safeNumOrNull(json.daily.freezing_level_height_max?.[i]) ?? null,
      });
    }

    return { hourly, daily, current, rawJson: json };
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
        humidity: safeNumOrNull(c.relative_humidity_2m),
        dewPoint: safeNumOrNull(c.dew_point_2m),
        precipitation: safeNumOrNull(c.precipitation),
        weatherCode: safeNumOrNull(c.weather_code),
        cloudCover: safeNumOrNull(c.cloud_cover),
        cloudCoverLow: safeNumOrNull(c.cloud_cover_low),
        cloudCoverMid: safeNumOrNull(c.cloud_cover_mid),
        cloudCoverHigh: safeNumOrNull(c.cloud_cover_high),
        windSpeed: safeNumOrNull(c.wind_speed_10m),
        windDir: safeNumOrNull(c.wind_direction_10m),
        windGusts: safeNumOrNull(c.wind_gusts_10m),
        cape: safeNumOrNull(c.cape),
                apparentTemp: safeNumOrNull(c.apparent_temperature),
                uvIndex: safeNumOrNull(c.uv_index),
                visibility: safeNumOrNull(c.visibility),
                isDay: c.is_day != null ? !!c.is_day : null,
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
