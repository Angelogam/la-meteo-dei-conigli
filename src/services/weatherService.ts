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
  capes: number;
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
  et0?: number;
  vapourPressureDeficit?: number;
  soilTemp?: number;
  soilMoisture?: number;
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

export interface MeteoLight {
  time: Date;
  temperature: number;
  windSpeed: number;
  windDir: number;
  weatherCode: number;
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

export interface MeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: Record<string, string>;
  current: Record<string, number | string>;
  hourly_units: Record<string, string>;
  hourly: Record<string, (number | string)[]>;
  daily_units: Record<string, string>;
  daily: Record<string, (number | string)[]>;
}

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

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
  "wind_speed_300m",
  "wind_direction_300m",
  "wind_speed_600m",
  "wind_direction_600m",
  "wind_speed_1000m",
  "wind_direction_1000m",
  "wind_speed_1500m",
  "wind_direction_1500m",
  "wind_speed_2000m",
  "wind_direction_2000m",
  "wind_speed_2500m",
  "wind_direction_2500m",
  "wind_speed_3000m",
  "wind_direction_3000m",
  "cape",
  "convective_inhibition",
  "lifted_index",
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

const HOURLY_LIGHT_PARAMS = [
  "temperature_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "weather_code",
].join(",");

function buildWindProfile(rawHourly: Record<string, (number | string)[]>, idx: number): { height: number; speed: number; dir: number }[] {
  const profile: { height: number; speed: number; dir: number }[] = [];
  const levels = [
    { height: 80, speedKey: "wind_speed_80m", dirKey: "wind_direction_80m" },
    { height: 120, speedKey: "wind_speed_120m", dirKey: "wind_direction_120m" },
    { height: 180, speedKey: "wind_speed_180m", dirKey: "wind_direction_180m" },
    { height: 300, speedKey: "wind_speed_300m", dirKey: "wind_direction_300m" },
    { height: 600, speedKey: "wind_speed_600m", dirKey: "wind_direction_600m" },
    { height: 1000, speedKey: "wind_speed_1000m", dirKey: "wind_direction_1000m" },
    { height: 1500, speedKey: "wind_speed_1500m", dirKey: "wind_direction_1500m" },
    { height: 2000, speedKey: "wind_speed_2000m", dirKey: "wind_direction_2000m" },
    { height: 2500, speedKey: "wind_speed_2500m", dirKey: "wind_direction_2500m" },
    { height: 3000, speedKey: "wind_speed_3000m", dirKey: "wind_direction_3000m" },
  ];
  for (const level of levels) {
    const speedArr = rawHourly[level.speedKey];
    const dirArr = rawHourly[level.dirKey];
    if (speedArr && dirArr && typeof speedArr[idx] === "number" && typeof dirArr[idx] === "number") {
      const speed = speedArr[idx] as number;
      const dir = dirArr[idx] as number;
      if (speed >= 0) {
        profile.push({ height: level.height, speed: Math.round(speed * 10) / 10, dir });
      }
    }
  }
  return profile;
}

export const weatherService = {
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
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    try {
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const json: any = await res.json();

      const hourly: MeteoHourly[] = [];
      const len = json.hourly.time.length;
      for (let i = 0; i < len; i++) {
        hourly.push({
          time: new Date(json.hourly.time[i]),
          temperature: json.hourly.temperature_2m[i] ?? 0,
          humidity: json.hourly.relative_humidity_2m[i] ?? 50,
          dewPoint: json.hourly.dew_point_2m?.[i] ?? 10,
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
          capes: json.hourly.cape?.[i] ?? 0,
          cape: json.hourly.cape?.[i] ?? 0,
          cin: json.hourly.cin?.[i] ?? 0,
          liftedIndex: json.hourly.lifted_index?.[i] ?? 0,
          temp80m: json.hourly.temperature_80m?.[i],
          temp120m: json.hourly.temperature_120m?.[i],
          shortwaveRadiation: json.hourly.shortwave_radiation?.[i] ?? 0,
          windProfile: buildWindProfile(json.hourly, i),
          feelsLike: json.hourly.apparent_temperature?.[i] ?? 0,
          apparentTemp: json.hourly.apparent_temperature?.[i] ?? 0,
          precipitationProbability: json.hourly.precipitation_probability?.[i] ?? 0,
          et0: json.hourly.et0_fao_evapotranspiration?.[i] ?? 0,
          vapourPressureDeficit: 0,
          soilTemp: 0,
          soilMoisture: 0,
        });
      }

      const current: MeteoCurrent = {
        time: new Date(json.current.time),
        temperature: json.current.temperature_2m ?? 0,
        humidity: json.current.relative_humidity_2m ?? 50,
        apparentTemp: json.current.apparent_temperature ?? 0,
        isDay: json.current.is_day ?? 1,
        precipitation: json.current.precipitation ?? 0,
        rain: json.current.rain ?? 0,
        snowfall: json.current.snowfall ?? 0,
        weatherCode: json.current.weather_code ?? 0,
        cloudCover: json.current.cloud_cover ?? 0,
        pressure: json.current.pressure_msl ?? 1013,
        surfacePressure: json.current.surface_pressure ?? 1013,
        windSpeed: json.current.wind_speed_10m ?? 0,
        windDir: json.current.wind_direction_10m ?? 0,
        windGusts: json.current.wind_gusts_10m ?? 0,
      };

      const daily: MeteoDaily[] = [];
      const dailyLen = json.daily.time.length;
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

      return { hourly, current, daily, model: "auto" };
    } catch (err) {
      throw new Error(`Failed to fetch weather data: ${err instanceof Error ? err.message : err}`);
    }
  },

  async fetchWithFallback(lat: number, lon: number): Promise<{
    data: { hourly: MeteoHourly[]; current: MeteoCurrent; daily: MeteoDaily[]; model: string } | null;
    ok: boolean;
  }> {
    try {
      const data = await this.fetchWeather(lat, lon);
      return { data, ok: true };
    } catch (err) {
      console.warn(`[weatherService] fetchWithFallback fallito per ${lat},${lon}:`, err);
      return { data: null, ok: false };
    }
  },

  async fetchLight(lat: number, lon: number): Promise<{
    data: MeteoLight | null;
    ok: boolean;
  }> {
    const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=${HOURLY_LIGHT_PARAMS}&timezone=Europe/Rome&forecast_days=1`;

    try {
      const res = await fetch(url);
      if (!res.ok) return { data: null, ok: false };
      const json = await res.json();
      const h = json.hourly;
      if (!h || !h.time || h.time.length === 0) return { data: null, ok: false };
      
      const now = new Date();
      const nowHour = now.getHours();
      let idx = h.time.findIndex((t: string) => {
        const d = new Date(t);
        return d.getHours() === nowHour;
      });
      if (idx === -1) idx = 0;

      const data: MeteoLight = {
        time: new Date(h.time[idx]),
        temperature: h.temperature_2m[idx] ?? 0,
        windSpeed: h.wind_speed_10m[idx] ?? 0,
        windDir: h.wind_direction_10m[idx] ?? 0,
        weatherCode: h.weather_code[idx] ?? 0,
      };
      return { data, ok: true };
    } catch {
      return { data: null, ok: false };
    }
  },

  async fetchCurrent(lat: number, lon: number): Promise<{ data: HourData | null; ok: boolean }> {
    const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&forecast_days=1`;

    try {
      const res = await fetch(url);
      if (!res.ok) return { data: null, ok: false };
      const json = await res.json();
      const c = json.current;
      if (!c) return { data: null, ok: false };

      const data: HourData = {
        time: new Date(c.time),
        temperature: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        apparentTemp: c.apparent_temperature,
        precipitation: c.precipitation,
        rain: c.rain,
        snowfall: c.snowfall,
        weatherCode: c.weather_code,
        cloudCover: c.cloud_cover,
        pressure: Number(c.pressure_msl) ?? 1013,
        surfacePressure: Number(c.surface_pressure) ?? 1013,
        windSpeed: Number(Number(c.wind_speed_10m) ?? 0),
        windDir: Number(Number(c.wind_direction_10m) ?? 0),
        windGusts: Number(Number(c.wind_gusts_10m) ?? 0),
        dewPoint: 0,
        precipitationProba: 0,
        cloudCoverLow: 0,
        cloudCoverMid: 0,
        cloudCoverHigh: 0,
        feelsLike: c.apparent_temperature ?? 0,
        radiation: 0,
        directRadiation: 0,
        uvIndex: 0,
        visibility: 10000,
        vapourPressureDeficit: 0,
        isDay: (c.is_day ?? 1) === 1,
        freezingLevel: 3000,
        sunshineDuration: 0,
        cape: 0,
        cin: 0,
        liftedIndex: 0,
        mixingRatio: 0,
        virtualTemp: 0,
      };
      return { data, ok: true };
    } catch {
      return { data: null, ok: false };
    }
  }
};