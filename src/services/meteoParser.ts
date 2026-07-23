"use client";

import type { HourData, DailyData } from "@/types/meteo";

export interface ParsedMeteoData {
  hourly: HourData[];
  daily: DailyData[];
  current: CurrentParsed;
}

export interface CurrentParsed {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  weatherCode: number;
  cloudCover: number;
  precipitation: number;
  pressure: number;
  uvIndex: number;
  dewPoint: number;
}

function getWeatherDescription(code: number): string {
  if (code === 0 || code === 1) return "Sereno";
  if (code === 2) return "Poco nuvoloso";
  if (code === 3) return "Nuvoloso";
  if (code >= 45 && code <= 48) return "Nebbia";
  if (code >= 51 && code <= 57) return "Pioggerella";
  if (code >= 61 && code <= 67) return "Pioggia";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Rovesci";
  if (code >= 95) return "Temporali";
  return "N/D";
}

/** Unico parser per i dati raw di Open-Meteo (e 7Timer convertito) */
export function parseRawResponse(raw: Record<string, any> | null | undefined): ParsedMeteoData | null {
  if (!raw?.hourly?.time?.length) return null;

  const hourly: HourData[] = [];
  const { hourly: h } = raw;
  const len = h.time.length;

  for (let i = 0; i < len; i++) {
    const time = new Date(h.time[i]);
    const temp = (h.temperature_2m?.[i] as number) ?? 0;
    const humidity = (h.relative_humidity_2m?.[i] as number) ?? 50;
    const dewPoint = (h.dew_point_2m?.[i] as number) ?? (temp - 8);
    const pressure = (h.pressure_msl?.[i] as number) ?? 1013;

    hourly.push({
      time,
      temperature: temp,
      feelsLike: (h.apparent_temperature?.[i] as number) ?? temp,
      humidity,
      dewPoint,
      pressure,
      surfacePressure: pressure,
      precipitation: (h.precipitation?.[i] as number) ?? 0,
      rain: 0,
      snowfall: 0,
      weatherCode: (h.weather_code?.[i] as number) ?? 0,
      cloudCover: (h.cloud_cover?.[i] as number) ?? 30,
      cloudCoverLow: 0,
      cloudCoverMid: 0,
      cloudCoverHigh: 0,
      windSpeed: (h.wind_speed_10m?.[i] as number) ?? 0,
      windDir: (h.wind_direction_10m?.[i] as number) ?? 0,
      windGusts: (h.wind_gusts_10m?.[i] as number) ?? 0,
      uvIndex: (h.uv_index?.[i] as number) ?? 0,
      radiation: (h.shortwave_radiation?.[i] as number) ?? 0,
      directRadiation: 0,
      visibility: 10000,
      vapourPressureDeficit: 0,
      isDay: time.getHours() >= 6 && time.getHours() <= 20,
      freezingLevel: 3000,
      sunshineDuration: 0,
      cape: (h.cape?.[i] as number) ?? 0,
      cin: (h.convective_inhibition?.[i] as number) ?? 0,
      liftedIndex: (h.lifted_index?.[i] as number) ?? 0,
      mixingRatio: 0,
      virtualTemp: 298,
    });
  }

  const dailyRaw = raw.daily;
  const daily: DailyData[] = [];
  if (dailyRaw?.time?.length) {
    for (let i = 0; i < dailyRaw.time.length; i++) {
      const date = new Date(dailyRaw.time[i]);
      const wc = (dailyRaw.weather_code?.[i] as number) ?? 0;
      daily.push({
        date,
        weatherCode: wc,
        temperatureMax: (dailyRaw.temperature_2m_max?.[i] as number) ?? 0,
        temperatureMin: (dailyRaw.temperature_2m_min?.[i] as number) ?? 0,
        temperatureMean: (((dailyRaw.temperature_2m_max?.[i] as number) ?? 0) + ((dailyRaw.temperature_2m_min?.[i] as number) ?? 0)) / 2,
        apparentTempMax: (dailyRaw.temperature_2m_max?.[i] as number) ?? 0,
        apparentTempMin: (dailyRaw.temperature_2m_min?.[i] as number) ?? 0,
        sunrise: "",
        sunset: "",
        daylightDuration: 0,
        sunshineDuration: 0,
        precipitationSum: (dailyRaw.precipitation_sum?.[i] as number) ?? 0,
        rainSum: 0,
        snowfallSum: 0,
        precipitationHours: 0,
        precipitationProbabilityMax: (dailyRaw.precipitation_probability_max?.[i] as number) ?? 0,
        windSpeedMax: (dailyRaw.wind_speed_10m_max?.[i] as number) ?? 0,
        windGustsMax: (dailyRaw.wind_gusts_10m_max?.[i] as number) ?? 0,
        windDirDominant: (dailyRaw.wind_direction_10m_dominant?.[i] as number) ?? 0,
        shortwaveRadiationSum: 0,
        uvIndexMax: (dailyRaw.uv_index_max?.[i] as number) ?? 0,
        windSpeed: Math.round(((dailyRaw.wind_speed_10m_max?.[i] as number) ?? 0) * 0.6),
        cloudCover: 0,
        weatherDescription: getWeatherDescription(wc),
      });
    }
  }

  const first = hourly[0];
  const current: CurrentParsed = {
    temperature: first?.temperature ?? 0,
    humidity: first?.humidity ?? 50,
    windSpeed: first?.windSpeed ?? 0,
    windDir: first?.windDir ?? 0,
    windGusts: first?.windGusts ?? 0,
    weatherCode: first?.weatherCode ?? 0,
    cloudCover: first?.cloudCover ?? 0,
    precipitation: first?.precipitation ?? 0,
    pressure: first?.pressure ?? 1013,
    uvIndex: first?.uvIndex ?? 0,
    dewPoint: first?.dewPoint ?? 5,
  };

  return { hourly, daily, current };
}