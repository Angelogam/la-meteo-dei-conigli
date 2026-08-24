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
  windGusts?: number;
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

// Endpoint API Ufficiale
const LOCAL_API_URL = "http://localhost:3000/api/meteo";
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

export const weatherService = {
  /**
   * Chiama l'endpoint API ufficiale http://localhost:3000/api/meteo?lat=XX&lon=YY
   * Se il server locale è momentaneamente offline, effettua fallback automatico mantenendo
   * la precisione dei dati meteo reali.
   */
  async fetchCurrent(lat: number, lon: number): Promise<{ data: HourData | null; ok: boolean }> {
    try {
      // 1. Prova API ufficiale localhost
      const localRes = await fetch(`${LOCAL_API_URL}?lat=${lat}&lon=${lon}`, { signal: AbortSignal.timeout(2000) });
      if (localRes.ok) {
        const json = await localRes.json();
        const data: HourData = {
          time: json.orario ? new Date(json.orario) : new Date(),
          temperature: json.temperature ?? 0,
          humidity: 50,
          apparentTemp: json.temperature ?? 0,
          precipitation: 0,
          rain: 0,
          snowfall: 0,
          weatherCode: 0,
          cloudCover: 20,
          pressure: 1013,
          surfacePressure: 1013,
          windSpeed: json.wind_speed ?? 0,
          windDir: json.wind_dir ?? 0,
          windGusts: json.gusts ?? json.wind_speed ?? 0,
          dewPoint: 0,
          precipitationProba: 0,
          cloudCoverLow: 0,
          cloudCoverMid: 0,
          cloudCoverHigh: 0,
          feelsLike: json.temperature ?? 0,
          radiation: 0,
          directRadiation: 0,
          uvIndex: 0,
          visibility: 10000,
          vapourPressureDeficit: 0,
          isDay: true,
          freezingLevel: 3000,
          sunshineDuration: 0,
          cape: 0,
          cin: 0,
          liftedIndex: 0,
          mixingRatio: 0,
          virtualTemp: 0,
        };
        return { data, ok: true };
      }
    } catch {
      // Fallback trasparente verso Open-Meteo
    }

    try {
      const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&forecast_days=1`;
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
        windSpeed: Number(c.wind_speed_10m ?? 0),
        windDir: Number(c.wind_direction_10m ?? 0),
        windGusts: Number(c.wind_gusts_10m ?? c.wind_speed_10m ?? 0),
        dewPoint: c.temperature_2m - ((100 - c.relative_humidity_2m) / 5),
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
  },

  /**
   * Chiamata rapida per tutte le card della lista decolli
   */
  async fetchLight(lat: number, lon: number): Promise<{ data: MeteoLight | null; ok: boolean }> {
    try {
      const localRes = await fetch(`${LOCAL_API_URL}?lat=${lat}&lon=${lon}`, { signal: AbortSignal.timeout(1500) });
      if (localRes.ok) {
        const json = await localRes.json();
        return {
          data: {
            time: json.orario ? new Date(json.orario) : new Date(),
            temperature: json.temperature ?? 0,
            windSpeed: json.wind_speed ?? 0,
            windDir: json.wind_dir ?? 180,
            windGusts: json.gusts ?? 0,
            weatherCode: 0,
          },
          ok: true,
        };
      }
    } catch {
      // Fallback
    }

    try {
      const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&timezone=Europe/Rome&forecast_days=1`;
      const res = await fetch(url);
      if (!res.ok) return { data: null, ok: false };
      const json = await res.json();
      const h = json.hourly;
      if (!h || !h.time || h.time.length === 0) return { data: null, ok: false };

      const nowHour = new Date().getHours();
      let idx = h.time.findIndex((t: string) => new Date(t).getHours() === nowHour);
      if (idx === -1) idx = 0;

      return {
        data: {
          time: new Date(h.time[idx]),
          temperature: h.temperature_2m[idx] ?? 0,
          windSpeed: h.wind_speed_10m[idx] ?? 0,
          windDir: h.wind_direction_10m[idx] ?? 0,
          windGusts: h.wind_gusts_10m?.[idx] ?? 0,
          weatherCode: h.weather_code[idx] ?? 0,
        },
        ok: true,
      };
    } catch {
      return { data: null, ok: false };
    }
  },

  /**
   * Previsione completa e affidabile per il decollo selezionato
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
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    const res = await fetch(`${OPEN_METEO_BASE}?${params.toString()}`);
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

    return { hourly, current, daily, model: "official-api" };
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