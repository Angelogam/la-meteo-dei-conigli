"use client";

import type { HourData } from "@/types/meteo";

export interface MeteoHourly {
  time: Date;
  temperature: number;
  feelsLike: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  uvIndex: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  temp80m?: number;
  temp120m?: number;
  shortwaveRadiation: number;
  windProfile?: { height: number; speed: number; dir: number }[];
  pressure: number;
  surfacePressure: number;
  precipitationProbability: number;
  // Pressure level winds - REAL DATA from Open-Meteo
  windSpeed925?: number;
  windDir925?: number;
  windSpeed850?: number;
  windDir850?: number;
  windSpeed700?: number;
  windDir700?: number;
  windSpeed500?: number;
  windDir500?: number;
  windSpeed600?: number;
  windDir600?: number;
  windSpeed300?: number;
  windDir300?: number;
  windSpeed250?: number;
  windDir250?: number;
  windSpeed200?: number;
  windDir200?: number;
  windSpeed1000?: number;
  windDir1000?: number;
  windSpeed1500?: number;
  windDir1500?: number;
  windSpeed2000?: number;
  windDir2000?: number;
  windSpeed2500?: number;
  windDir2500?: number;
  windSpeed3000?: number;
  windDir3000?: number;
}

export interface MeteoCurrent {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
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
  cape: number;
}

export interface MeteoLight {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  weatherCode: number;
  cloudCover: number;
  precipitation: number;
  cape: number;
}

export interface MeteoDaily {
  date: Date;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  apparentTempMin: number;
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  sunshineDuration: number;
  uvIndexMax: number;
  uvIndexClearSkyMax: number;
  precipitationSum: number;
  rainSum: number;
  snowfallSum: number;
  precipitationHours: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
}

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "precipitation_probability",
  "weather_code",
  "pressure_msl",
  "surface_pressure",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "shortwave_radiation",
  "direct_radiation",
  "sunshine_duration",
  "temperature_80m",
  "temperature_120m",
  "wind_speed_80m",
  "wind_direction_80m",
  "wind_speed_120m",
  "wind_direction_120m",
  "wind_speed_180m",
  "wind_direction_180m",
  "cape",
  "convective_inhibition",
  "lifted_index",
  // Pressure level winds - REAL altitude data from Open-Meteo
  "wind_speed_925hPa",
  "wind_direction_925hPa",
  "wind_speed_850hPa",
  "wind_direction_850hPa",
  "wind_speed_700hPa",
  "wind_direction_700hPa",
  "wind_speed_500hPa",
  "wind_direction_500hPa",
  "wind_speed_600hPa",
  "wind_direction_600hPa",
  "wind_speed_300hPa",
  "wind_direction_300hPa",
  "wind_speed_250hPa",
  "wind_direction_250hPa",
  "wind_speed_200hPa",
  "wind_direction_200hPa",
  "wind_speed_1000hPa",
  "wind_direction_1000hPa",
  "wind_speed_1500hPa",
  "wind_direction_1500hPa",
  "wind_speed_2000hPa",
  "wind_direction_2000hPa",
  "wind_speed_2500hPa",
  "wind_direction_2500hPa",
  "wind_speed_3000hPa",
  "wind_direction_3000hPa",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "daylight_duration",
  "sunshine_duration",
  "precipitation_sum",
  "rain_sum",
  "snowfall_sum",
  "precipitation_hours",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "shortwave_radiation_sum",
  "uv_index_max",
].join(",");

const CURRENT_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cape",
].join(",");

export const weatherService = {
  /**
   * Chiamata rapida ai dati correnti Open-Meteo per la lista dei decolli
   */
  async fetchLight(lat: number, lon: number): Promise<{ data: MeteoLight | null; ok: boolean }> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: CURRENT_PARAMS,
        timezone: "Europe/Rome",
        forecast_days: "1",
      });

      const res = await fetch(`${OPEN_METEO_BASE}?${params.toString()}`);
      if (!res.ok) return { data: null, ok: false };
      const json = await res.json();
      const c = json.current;
      if (!c) return { data: null, ok: false };

      const temp = c.temperature_2m ?? 0;
      const hum = c.relative_humidity_2m ?? 50;
      const dew = c.dew_point_2m ?? (temp - (100 - hum) / 5);

      return {
        data: {
          time: new Date(c.time),
          temperature: temp,
          humidity: hum,
          dewPoint: dew,
          windSpeed: c.wind_speed_10m ?? 0,
          windDir: c.wind_direction_10m ?? 0,
          windGusts: c.wind_gusts_10m ?? c.wind_speed_10m ?? 0,
          weatherCode: c.weather_code ?? 0,
          cloudCover: c.cloud_cover ?? 0,
          precipitation: c.precipitation ?? 0,
          cape: c.cape ?? 0,
        },
        ok: true,
      };
    } catch {
      return { data: null, ok: false };
    }
  },

  /**
   * Alias for fetchLight - used by some components
   */
  async fetchCurrent(lat: number, lon: number): Promise<{ data: MeteoLight | null; ok: boolean }> {
    return this.fetchLight(lat, lon);
  },

  /**
   * Previsione completa a 3 giorni da Open-Meteo per il decollo selezionato
   * Include venti REALI ai livelli di pressione (925, 850, 700, 500, 300 hPa)
   */
  async fetchWeather(lat: number, lon: number): Promise<{
    hourly: MeteoHourly[];
    current: MeteoCurrent;
    daily: MeteoDaily[];
    model: string;
  }> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: HOURLY_PARAMS,
      daily: DAILY_PARAMS,
      current: CURRENT_PARAMS,
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    const res = await fetch(`${OPEN_METEO_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json: any = await res.json();

    const hourly: MeteoHourly[] = [];
    const len = json.hourly.time.length;
    for (let i = 0; i < len; i++) {
      const t = json.hourly.temperature_2m[i] ?? 0;
      const h = json.hourly.relative_humidity_2m[i] ?? 50;
      const dew = json.hourly.dew_point_2m?.[i] ?? (t - (100 - h) / 5);

      hourly.push({
        time: new Date(json.hourly.time[i]),
        temperature: t,
        humidity: h,
        dewPoint: dew,
        pressure: json.hourly.pressure_msl[i] ?? 1013,
        surfacePressure: json.hourly.surface_pressure?.[i] ?? 1013,
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
        temp80m: json.hourly.temperature_80m?.[i],
        temp120m: json.hourly.temperature_120m?.[i],
        shortwaveRadiation: json.hourly.shortwave_radiation?.[i] ?? 0,
        feelsLike: json.hourly.apparent_temperature?.[i] ?? t,
        apparentTemp: json.hourly.apparent_temperature?.[i] ?? t,
        precipitationProbability: json.hourly.precipitation_probability?.[i] ?? 0,
        // Pressure level winds - REAL DATA from Open-Meteo
        windSpeed925: json.hourly.wind_speed_925hPa?.[i],
        windDir925: json.hourly.wind_direction_925hPa?.[i],
        windSpeed850: json.hourly.wind_speed_850hPa?.[i],
        windDir850: json.hourly.wind_direction_850hPa?.[i],
        windSpeed700: json.hourly.wind_speed_700hPa?.[i],
        windDir700: json.hourly.wind_direction_700hPa?.[i],
        windSpeed500: json.hourly.wind_speed_500hPa?.[i],
        windDir500: json.hourly.wind_direction_500hPa?.[i],
        windSpeed600: json.hourly.wind_speed_600hPa?.[i],
        windDir600: json.hourly.wind_direction_600hPa?.[i],
        windSpeed300: json.hourly.wind_speed_300hPa?.[i],
        windDir300: json.hourly.wind_direction_300hPa?.[i],
        windSpeed250: json.hourly.wind_speed_250hPa?.[i],
        windDir250: json.hourly.wind_direction_250hPa?.[i],
        windSpeed200: json.hourly.wind_speed_200hPa?.[i],
        windDir200: json.hourly.wind_direction_200hPa?.[i],
        windSpeed1000: json.hourly.wind_speed_1000hPa?.[i],
        windDir1000: json.hourly.wind_direction_1000hPa?.[i],
        windSpeed1500: json.hourly.wind_speed_1500hPa?.[i],
        windDir1500: json.hourly.wind_direction_1500hPa?.[i],
        windSpeed2000: json.hourly.wind_speed_2000hPa?.[i],
        windDir2000: json.hourly.wind_direction_2000hPa?.[i],
        windSpeed2500: json.hourly.wind_speed_2500hPa?.[i],
        windDir2500: json.hourly.wind_direction_2500hPa?.[i],
        windSpeed3000: json.hourly.wind_speed_3000hPa?.[i],
        windDir3000: json.hourly.wind_direction_3000hPa?.[i],
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
      isDay: c?.is_day ?? 1,
      precipitation: c?.precipitation ?? 0,
      rain: c?.rain ?? 0,
      snowfall: c?.snowfall ?? 0,
      weatherCode: c?.weather_code ?? 0,
      cloudCover: c?.cloud_cover ?? 0,
      pressure: c?.pressure_msl ?? 1013,
      surfacePressure: c?.surface_pressure ?? 1013,
      windSpeed: c?.wind_speed_10m ?? 0,
      windDir: c?.wind_direction_10m ?? 0,
      windGusts: c?.wind_gusts_10m ?? c?.wind_speed_10m ?? 0,
      cape: c?.cape ?? 0,
    };

    const daily: MeteoDaily[] = [];
    const dailyLen = json.daily?.time?.length || 0;
    for (let i = 0; i < dailyLen; i++) {
      daily.push({
        date: new Date(json.daily.time[i]),
        tempMax: json.daily.temperature_2m_max[i] ?? 0,
        tempMin: json.daily.temperature_2m_min[i] ?? 0,
        apparentTempMax: json.daily.apparent_temperature_max[i] ?? 0,
        apparentTempMin: json.daily.apparent_temperature_min[i] ?? 0,
        sunrise: json.daily.sunrise[i] ?? "",
        sunset: json.daily.sunset[i] ?? "",
        daylightDuration: json.daily.daylight_duration[i] ?? 0,
        sunshineDuration: json.daily.sunshine_duration[i] ?? 0,
        uvIndexMax: json.daily.uv_index_max[i] ?? 0,
        uvIndexClearSkyMax: json.daily.uv_index_clear_sky_max[i] ?? 0,
        precipitationSum: json.daily.precipitation_sum[i] ?? 0,
        rainSum: json.daily.rain_sum[i] ?? 0,
        snowfallSum: json.daily.snowfall_sum[i] ?? 0,
        precipitationHours: json.daily.precipitation_hours[i] ?? 0,
        precipitationProbabilityMax: json.daily.precipitation_probability_max[i] ?? 0,
        windSpeedMax: json.daily.wind_speed_10m_max[i] ?? 0,
        windGustsMax: json.daily.wind_gusts_10m_max[i] ?? 0,
        windDirDominant: json.daily.wind_direction_10m_dominant[i] ?? 0,
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
  }
};