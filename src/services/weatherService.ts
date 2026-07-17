"use client";

import type { HourData, CurrentData, DailyData } from "@/types/meteo";

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  uvIndex: number;
  shortwaveRadiation: number;
  pressure: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  temp80m: number;
  temp120m: number;
  windProfile?: { height: number; speed: number; dir: number }[];
}

export interface MeteoCurrent {
  time: Date;
  temperature: number;
  humidity: number;
  apparentTemp: number;
  isDay: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  surfacePressure: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
}

export interface MeteoDaily {
  date: Date;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  apparentTempMin: number;
  weatherCode: number;
  precipitationSum: number;
  precipitationProbMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

interface FetchResult {
  data: {
    hourly: MeteoHourly[];
    current: MeteoCurrent;
    daily: MeteoDaily[];
    model: string;
  } | null;
  ok: boolean;
  cached: boolean;
}

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
  "apparent_temperature_max",
  "apparent_temperature_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
  "shortwave_radiation_sum",
  "sunrise",
  "sunset",
].join(",");

const CACHE_DURATION = 3 * 60 * 1000;

function buildWindProfile(
  speeds: {
    s80?: number; d80?: number;
    s120?: number; d120?: number;
    s180?: number; d180?: number;
    s300?: number; d300?: number;
    s600?: number; d600?: number;
    s1000?: number; d1000?: number;
    s1500?: number; d1500?: number;
    s2000?: number; d2000?: number;
    s2500?: number; d2500?: number;
    s3000?: number; d3000?: number;
  }
): { height: number; speed: number; dir: number }[] {
  const profile: { height: number; speed: number; dir: number }[] = [];
  const levels: { h: number; s: keyof typeof speeds; d: keyof typeof speeds }[] = [
    { h: 80, s: "s80", d: "d80" },
    { h: 120, s: "s120", d: "d120" },
    { h: 180, s: "s180", d: "d180" },
    { h: 300, s: "s300", d: "d300" },
    { h: 600, s: "s600", d: "d600" },
    { h: 1000, s: "s1000", d: "d1000" },
    { h: 1500, s: "s1500", d: "d1500" },
    { h: 2000, s: "s2000", d: "d2000" },
    { h: 2500, s: "s2500", d: "d2500" },
    { h: 3000, s: "s3000", d: "d3000" },
  ];
  for (const level of levels) {
    const sp = speeds[level.s];
    const dr = speeds[level.d];
    if (sp != null && dr != null && sp > 0) {
      profile.push({ height: level.h, speed: sp, dir: dr });
    }
  }
  return profile;
}

function transformHour(hourData: Record<string, any>, index: number): MeteoHourly {
  const safe = (field: string, defaultVal: number = 0): number => {
    const val = hourData[field]?.[index];
    return val != null ? val : defaultVal;
  };

  return {
    time: new Date(hourData.time[index]),
    temperature: safe("temperature_2m"),
    humidity: safe("relative_humidity_2m"),
    dewPoint: safe("dew_point_2m"),
    apparentTemp: safe("apparent_temperature"),
    precipitation: safe("precipitation"),
    precipitationProbability: safe("precipitation_probability"),
    weatherCode: safe("weather_code"),
    cloudCover: safe("cloud_cover"),
    cloudCoverLow: safe("cloud_cover_low"),
    cloudCoverMid: safe("cloud_cover_mid"),
    cloudCoverHigh: safe("cloud_cover_high"),
    windSpeed: safe("wind_speed_10m"),
    windDir: safe("wind_direction_10m"),
    windGusts: safe("wind_gusts_10m"),
    uvIndex: safe("uv_index"),
    shortwaveRadiation: safe("shortwave_radiation"),
    pressure: safe("pressure_msl"),
    cape: safe("cape"),
    cin: safe("convective_inhibition"),
    liftedIndex: safe("lifted_index", 99),
    temp80m: safe("temperature_80m", 0),
    temp120m: safe("temperature_120m", 0),
    windProfile: buildWindProfile({
      s80: safe("wind_speed_80m"), d80: safe("wind_direction_80m"),
      s120: safe("wind_speed_120m"), d120: safe("wind_direction_120m"),
      s180: safe("wind_speed_180m"), d180: safe("wind_direction_180m"),
      s300: safe("wind_speed_300m"), d300: safe("wind_direction_300m"),
      s600: safe("wind_speed_600m"), d600: safe("wind_direction_600m"),
      s1000: safe("wind_speed_1000m"), d1000: safe("wind_direction_1000m"),
      s1500: safe("wind_speed_1500m"), d1500: safe("wind_direction_1500m"),
      s2000: safe("wind_speed_2000m"), d2000: safe("wind_direction_2000m"),
      s2500: safe("wind_speed_2500m"), d2500: safe("wind_direction_2500m"),
      s3000: safe("wind_speed_3000m"), d3000: safe("wind_direction_3000m"),
    }),
  };
}

function transformCurrent(raw: Record<string, any>): MeteoCurrent {
  return {
    time: new Date(raw.time),
    temperature: raw.temperature_2m ?? 20,
    humidity: raw.relative_humidity_2m ?? 50,
    apparentTemp: raw.apparent_temperature ?? 20,
    isDay: raw.is_day ?? 1,
    precipitation: raw.precipitation ?? 0,
    rain: raw.rain ?? 0,
    showers: raw.showers ?? 0,
    snowfall: raw.snowfall ?? 0,
    weatherCode: raw.weather_code ?? 0,
    cloudCover: raw.cloud_cover ?? 0,
    pressure: raw.pressure_msl ?? 1013,
    surfacePressure: raw.surface_pressure ?? 1013,
    windSpeed: raw.wind_speed_10m ?? 0,
    windDir: raw.wind_direction_10m ?? 0,
    windGusts: raw.wind_gusts_10m ?? 0,
  };
}

function transformDaily(rawDaily: Record<string, any>, index: number): MeteoDaily {
  const safe = (field: string): number => rawDaily[field]?.[index] ?? 0;
  return {
    date: new Date(rawDaily.time[index]),
    tempMax: safe("temperature_2m_max"),
    tempMin: safe("temperature_2m_min"),
    apparentTempMax: safe("apparent_temperature_max"),
    apparentTempMin: safe("apparent_temperature_min"),
    weatherCode: safe("weather_code"),
    precipitationSum: safe("precipitation_sum"),
    precipitationProbMax: safe("precipitation_probability_max"),
    windSpeedMax: safe("wind_speed_10m_max"),
    windGustsMax: safe("wind_gusts_10m_max"),
    windDirDominant: safe("wind_direction_10m_dominant"),
    uvIndexMax: safe("uv_index_max"),
    sunrise: rawDaily.sunrise?.[index] ?? "",
    sunset: rawDaily.sunset?.[index] ?? "",
  };
}

function deduplicateHourly(hours: MeteoHourly[]): MeteoHourly[] {
  const seen = new Set<number>();
  return hours.filter(h => {
    const key = h.time.getTime();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateDaily(days: MeteoDaily[]): MeteoDaily[] {
  const seen = new Set<number>();
  return days.filter(d => {
    const key = d.date.getTime();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const cache = new Map<string, { data: FetchResult["data"]; timestamp: number }>();

class WeatherService {
  /**
   * Fetch completo con tutti i parametri (hourly, daily, current)
   */
  async fetchWeather(lat: number, lon: number): Promise<{
    hourly: MeteoHourly[];
    current: MeteoCurrent;
    daily: MeteoDaily[];
    model: string;
  }> {
    const result = await this.fetchWithFallback(lat, lon);
    if (!result.ok || !result.data) {
      throw new Error(result.cached ? "Cache expired" : "Nessun dato ricevuto da Open-Meteo");
    }
    return result.data;
  }

  /**
   * Fetch con fallback: prova con forecast_days=3, poi forecast_days=2
   */
  async fetchWithFallback(lat: number, lon: number): Promise<FetchResult> {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { data: cached.data, ok: true, cached: true };
    }

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: HOURLY_PARAMS,
      daily: DAILY_PARAMS,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status}`);
          continue;
        }

        const raw = await res.json();

        if (!raw.hourly?.time?.length) {
          lastError = new Error("Nessun dato orario ricevuto");
          continue;
        }

        const numHours = raw.hourly.time.length;
        const hourly: MeteoHourly[] = [];
        for (let i = 0; i < numHours; i++) {
          hourly.push(transformHour(raw.hourly, i));
        }

        const current = raw.current ? transformCurrent(raw.current) : this.generateDefaultCurrent(hourly);

        const numDays = raw.daily?.time?.length ?? 0;
        const daily: MeteoDaily[] = [];
        for (let i = 0; i < numDays; i++) {
          daily.push(transformDaily(raw.daily, i));
        }

        const result: FetchResult["data"] = {
          hourly: deduplicateHourly(hourly),
          current,
          daily: deduplicateDaily(daily),
          model: "open-meteo",
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return { data: result, ok: true, cached: false };

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        }
      }
    }

    // Fallback: prova con forecast_days=2
    try {
      const params2 = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        hourly: "temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m",
        timezone: "Europe/Rome",
        forecast_days: "2",
      });

      const res2 = await fetch(`https://api.open-meteo.com/v1/forecast?${params2}`);
      if (res2.ok) {
        const raw2 = await res2.json();
        if (raw2.hourly?.time?.length) {
          const hourly: MeteoHourly[] = [];
          for (let i = 0; i < raw2.hourly.time.length; i++) {
            hourly.push({
              time: new Date(raw2.hourly.time[i]),
              temperature: raw2.hourly.temperature_2m?.[i] ?? 20,
              humidity: raw2.hourly.relative_humidity_2m?.[i] ?? 50,
              dewPoint: raw2.hourly.dew_point_2m?.[i] ?? 10,
              apparentTemp: raw2.hourly.apparent_temperature?.[i] ?? 20,
              precipitation: raw2.hourly.precipitation?.[i] ?? 0,
              precipitationProbability: 0,
              weatherCode: raw2.hourly.weather_code?.[i] ?? 0,
              cloudCover: raw2.hourly.cloud_cover?.[i] ?? 0,
              cloudCoverLow: 0, cloudCoverMid: 0, cloudCoverHigh: 0,
              windSpeed: raw2.hourly.wind_speed_10m?.[i] ?? 0,
              windDir: raw2.hourly.wind_direction_10m?.[i] ?? 0,
              windGusts: raw2.hourly.wind_gusts_10m?.[i] ?? 0,
              uvIndex: 0,
              shortwaveRadiation: 0,
              pressure: 1013,
              cape: 0, cin: 0, liftedIndex: 99,
              temp80m: 0, temp120m: 0,
            });
          }

          return {
            data: {
              hourly: deduplicateHourly(hourly),
              current: {
                time: new Date(), temperature: hourly[0]?.temperature ?? 20,
                humidity: hourly[0]?.humidity ?? 50, apparentTemp: hourly[0]?.apparentTemp ?? 20,
                isDay: 1, precipitation: hourly[0]?.precipitation ?? 0, rain: 0, showers: 0, snowfall: 0,
                weatherCode: hourly[0]?.weatherCode ?? 0, cloudCover: hourly[0]?.cloudCover ?? 0,
                pressure: 1013, surfacePressure: 1013, windSpeed: hourly[0]?.windSpeed ?? 0,
                windDir: hourly[0]?.windDir ?? 0, windGusts: hourly[0]?.windGusts ?? 0,
              },
              daily: [],
              model: "fallback",
            },
            ok: true,
            cached: false,
          };
        }
      }
    } catch {
      // ignorato
    }

    // Usa la cache come ultima risorsa
    if (cached) {
      return { data: cached.data, ok: true, cached: true };
    }

    return {
      data: null,
      ok: false,
      cached: false,
    };
  }

  /**
   * Fetch solo dati correnti (più leggero e veloce)
   */
  async fetchCurrent(lat: number, lon: number): Promise<{ data: MeteoCurrent | null; ok: boolean; error?: string }> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        timezone: "Europe/Rome",
        forecast_days: "1",
      });

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!res.ok) return { data: null, ok: false, error: `HTTP ${res.status}` };

      const raw = await res.json();
      if (!raw.current) return { data: null, ok: false, error: "Nessun dato current" };

      return { data: transformCurrent(raw.current), ok: true };
    } catch (err) {
      return { data: null, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Fetch solo dati giornalieri
   */
  async fetchDaily(lat: number, lon: number): Promise<{ data: MeteoDaily[] | null; ok: boolean }> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        daily: DAILY_PARAMS,
        timezone: "Europe/Rome",
        forecast_days: "3",
      });

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!res.ok) return { data: null, ok: false };

      const raw = await res.json();
      if (!raw.daily?.time?.length) return { data: null, ok: false };

      const numDays = raw.daily.time.length;
      const daily: MeteoDaily[] = [];
      for (let i = 0; i < numDays; i++) {
        daily.push(transformDaily(raw.daily, i));
      }

      return { data: deduplicateDaily(daily), ok: true };
    } catch {
      return { data: null, ok: false };
    }
  }

  private generateDefaultCurrent(hourly: MeteoHourly[]): MeteoCurrent {
    const now = new Date();
    const currentHour = hourly.find(h =>
      h.time.getFullYear() === now.getFullYear() &&
      h.time.getMonth() === now.getMonth() &&
      h.time.getDate() === now.getDate() &&
      h.time.getHours() === now.getHours()
    ) || hourly[0];

    return {
      time: new Date(),
      temperature: currentHour?.temperature ?? 20,
      humidity: currentHour?.humidity ?? 50,
      apparentTemp: currentHour?.apparentTemp ?? 20,
      isDay: now.getHours() >= 6 && now.getHours() <= 20 ? 1 : 0,
      precipitation: currentHour?.precipitation ?? 0,
      rain: 0,
      showers: 0,
      snowfall: 0,
      weatherCode: currentHour?.weatherCode ?? 0,
      cloudCover: currentHour?.cloudCover ?? 0,
      pressure: 1013,
      surfacePressure: 1013,
      windSpeed: currentHour?.windSpeed ?? 0,
      windDir: currentHour?.windDir ?? 0,
      windGusts: currentHour?.windGusts ?? 0,
    };
  }
}

export const weatherService = new WeatherService();