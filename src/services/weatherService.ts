"use client";

import type { HourData, DailyData } from "@/types/meteo";

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  pressure: number;
  apparentTemp: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  uvIndex: number;
  shortwaveRadiation: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  temp80m: number | null;
  temp120m: number | null;
  windSpeed80m: number | null;
  windDir80m: number | null;
  windSpeed120m: number | null;
  windDir120m: number | null;
  windSpeed180m: number | null;
  windDir180m: number | null;
}

export interface MeteoDaily {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  tempMean: number;
  apparentTempMax: number;
  apparentTempMin: number;
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  sunshineDuration: number;
  precipitationSum: number;
  rainSum: number;
  snowfallSum: number;
  precipitationHours: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
  uvIndexMax: number;
  windSpeed: number;
  cloudCover: number;
  weatherDescription: string;
}

export interface MeteoCurrent {
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
}

export interface WindProfileResult {
  ventoOrario: {
    ora: number;
    gust: number;
    quote: Record<number, { speed: number; dir: number }>;
  }[];
}

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const TIMER_URL = "https://www.7timer.info/bin/astro.php";

const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "shortwave_radiation",
  "cape",
  "convective_inhibition",
  "lifted_index",
  "temperature_80m",
  "temperature_120m",
  "wind_speed_80m",
  "wind_direction_80m",
  "wind_speed_120m",
  "wind_direction_120m",
  "wind_speed_180m",
  "wind_direction_180m",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
].join(",");

const FORECAST_DAYS = 3;

interface FetchResult {
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
  current: MeteoCurrent;
  source: "open-meteo" | "7timer";
  responseTimeMs: number;
}

function parseHourly(raw: any): MeteoHourly[] {
  if (!raw?.hourly?.time) return [];
  const { hourly } = raw;
  const len = hourly.time.length;
  const result: MeteoHourly[] = [];

  for (let i = 0; i < len; i++) {
    result.push({
      time: new Date(hourly.time[i]),
      temperature: hourly.temperature_2m?.[i] ?? 0,
      humidity: hourly.relative_humidity_2m?.[i] ?? 50,
      dewPoint: hourly.dew_point_2m?.[i] ?? 5,
      pressure: hourly.pressure_msl?.[i] ?? 1013,
      apparentTemp: hourly.apparent_temperature?.[i] ?? 0,
      precipitation: hourly.precipitation?.[i] ?? 0,
      weatherCode: hourly.weather_code?.[i] ?? 0,
      cloudCover: hourly.cloud_cover?.[i] ?? 0,
      windSpeed: hourly.wind_speed_10m?.[i] ?? 0,
      windDir: hourly.wind_direction_10m?.[i] ?? 0,
      windGusts: hourly.wind_gusts_10m?.[i] ?? 0,
      uvIndex: hourly.uv_index?.[i] ?? 0,
      shortwaveRadiation: hourly.shortwave_radiation?.[i] ?? 0,
      cape: hourly.cape?.[i] ?? 0,
      cin: hourly.convective_inhibition?.[i] ?? 0,
      liftedIndex: hourly.lifted_index?.[i] ?? 0,
      temp80m: hourly.temperature_80m?.[i] ?? null,
      temp120m: hourly.temperature_120m?.[i] ?? null,
      windSpeed80m: hourly.wind_speed_80m?.[i] ?? null,
      windDir80m: hourly.wind_direction_80m?.[i] ?? null,
      windSpeed120m: hourly.wind_speed_120m?.[i] ?? null,
      windDir120m: hourly.wind_direction_120m?.[i] ?? null,
      windSpeed180m: hourly.wind_speed_180m?.[i] ?? null,
      windDir180m: hourly.wind_direction_180m?.[i] ?? null,
    });
  }
  return result;
}

function parseDaily(raw: any): MeteoDaily[] {
  if (!raw?.daily?.time) return [];
  const { daily } = raw;
  const len = daily.time.length;
  const result: MeteoDaily[] = [];

  for (let i = 0; i < len; i++) {
    result.push({
      date: new Date(daily.time[i]),
      weatherCode: daily.weather_code?.[i] ?? 0,
      tempMax: daily.temperature_2m_max?.[i] ?? 0,
      tempMin: daily.temperature_2m_min?.[i] ?? 0,
      tempMean: daily.temperature_2m_mean?.[i] ?? ((daily.temperature_2m_max?.[i] ?? 0) + (daily.temperature_2m_min?.[i] ?? 0)) / 2,
      apparentTempMax: daily.apparent_temperature_max?.[i] ?? daily.temperature_2m_max?.[i] ?? 0,
      apparentTempMin: daily.apparent_temperature_min?.[i] ?? daily.temperature_2m_min?.[i] ?? 0,
      sunrise: daily.sunrise?.[i] ?? "",
      sunset: daily.sunset?.[i] ?? "",
      daylightDuration: daily.daylight_duration?.[i] ?? 0,
      sunshineDuration: daily.sunshine_duration?.[i] ?? 0,
      precipitationSum: daily.precipitation_sum?.[i] ?? 0,
      rainSum: daily.rain_sum?.[i] ?? 0,
      snowfallSum: daily.snowfall_sum?.[i] ?? 0,
      precipitationHours: daily.precipitation_hours?.[i] ?? 0,
      precipitationProbabilityMax: daily.precipitation_probability_max?.[i] ?? 0,
      windSpeedMax: daily.wind_speed_10m_max?.[i] ?? 0,
      windGustsMax: daily.wind_gusts_10m_max?.[i] ?? 0,
      windDirDominant: daily.wind_direction_10m_dominant?.[i] ?? 0,
      shortwaveRadiationSum: daily.shortwave_radiation_sum?.[i] ?? 0,
      uvIndexMax: daily.uv_index_max?.[i] ?? 0,
      windSpeed: daily.wind_speed_10m_max?.[i] ?? 0,
      cloudCover: daily.cloud_cover?.[i] ?? 0,
      weatherDescription: "",
    });
  }

  // If we don't have Open-Meteo data, try to parse 7Timer data
  if (result.length === 0 && raw?.dataseries) {
    const now = new Date();
    const seenDates = new Set<string>();

    for (let i = 0; i < raw.dataseries.length && i < 24 * FORECAST_DAYS; i++) {
      const d = raw.dataseries[i];
      const time = new Date(now);
      time.setHours(now.getHours() + (d.timepoint || i));
      time.setMinutes(0, 0, 0);

      const temp = d.temp2m ?? 15;
      const weatherCode = d.cloudcover != null
        ? d.cloudcover > 80 ? 3
          : d.cloudcover > 50 ? 2
            : d.cloudcover > 20 ? 1
              : 0
        : 0;
      const rh = d.rh2m ?? 50;
      const wind10m = d.wind10m?.speed ?? 10;
      const windDir = d.wind10m?.direction ?? 180;

      const dew = temp - ((100 - rh) / 5);

      const precipAmount = d.prec_amount ?? 0;
      let precipitationSum = 0;
      let rainSum = 0;
      let snowfallSum = 0;
      if (d.prec_type === "rain") {
        rainSum = precipAmount;
        precipitationSum = precipAmount;
      } else if (d.prec_type === "snow") {
        snowfallSum = precipAmount;
        precipitationSum = precipAmount;
      } else {
        // none or other
        precipitationSum = 0;
      }

      result.push({
        date: time,
        weatherCode,
        tempMax: temp + 3,
        tempMin: temp - 4,
        tempMean: (temp + 3 + temp - 4) / 2, // approximate
        apparentTempMax: temp,
        apparentTempMin: temp,
        sunrise: "",
        sunset: "",
        daylightDuration: 0,
        sunshineDuration: 0,
        precipitationSum,
        rainSum,
        snowfallSum,
        precipitationHours: d.prec_type === "none" ? 0 : 1, // approximate
        precipitationProbabilityMax: d.prec_type === "rain" ? 60 : 10,
        windSpeedMax: wind10m + 5,
        windGustsMax: wind10m + 10,
        windDirDominant: windDir,
        shortwaveRadiationSum: 500,
        uvIndexMax: 5,
        windSpeed: wind10m,
        cloudCover: d.cloudcover ?? 30,
        weatherDescription: "",
      });

      const dateKey = `${time.getDate()}/${time.getMonth() + 1}`;
      if (!seenDates.has(dateKey)) {
        seenDates.add(dateKey);
      }
    }
  }

  return result;
}

function parseCurrent(raw: any, hourly: MeteoHourly[]): MeteoCurrent {
  const first = hourly[0];
  return {
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
  };
}

const forecastCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function forecastCacheGet<T>(key: string): T | null {
  const entry = forecastCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    forecastCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function forecastCacheSet(key: string, data: any, ttl: number): void {
  forecastCache.set(key, { data, timestamp: Date.now(), ttl });
}

async function fetchWithRetry(url: string, retries = 3, backoffMs = 1000): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          const wait = backoffMs * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        return null;
      }
      return null;
    } catch (err) {
      if (attempt < retries) {
        const wait = backoffMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<FetchResult | null> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: HOURLY_PARAMS,
    daily: DAILY_PARAMS,
    timezone: "Europe/Rome",
    forecast_days: String(FORECAST_DAYS),
  });

  const url = `${BASE_URL}?${params.toString()}`;
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const raw = await res.json();
    const responseTimeMs = Math.round(performance.now() - start);

    if (!raw?.hourly?.time?.length) return null;

    const hourly = parseHourly(raw);
    const daily = parseDaily(raw);
    const current = parseCurrent(raw, hourly);

    return { hourly, daily, current, source: "open-meteo", responseTimeMs };
  } catch (err) {
    console.error("Open-Meteo fetch error:", err);
    return null;
  }
}

async function fetchTimerGFS(lat: number, lon: number): Promise<FetchResult | null> {
  const cacheKey = `7timer:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = forecastCacheGet<FetchResult>(cacheKey);
  if (cached) return cached;

  const start = performance.now();

  try {
    const url = `${TIMER_URL}?lon=${lon}&lat=${lat}&ac=0&unit=metric&output=json&tzshift=0`;
    const res = await fetchWithRetry(url);
    if (!res) return null;

    const raw = await res.json();
    const responseTimeMs = Math.round(performance.now() - start);
    if (!raw?.dataseries?.length) return null;

    const now = new Date();
    const hourly: MeteoHourly[] = [];
    const daily: MeteoDaily[] = [];

    const seenDates = new Set<string>();

    for (let i = 0; i < raw.dataseries.length && i < 24 * FORECAST_DAYS; i++) {
      const d = raw.dataseries[i];
      const time = new Date(now);
      time.setHours(now.getHours() + (d.timepoint || i));
      time.setMinutes(0, 0, 0);

      const temp = d.temp2m ?? 15;
      const weatherCode = d.cloudcover != null
        ? d.cloudcover > 80 ? 3
          : d.cloudcover > 50 ? 2
            : d.cloudcover > 20 ? 1
              : 0
        : 0;
      const rh = d.rh2m ?? 50;
      const wind10m = d.wind10m?.speed ?? 10;
      const windDir = d.wind10m?.direction ?? 180;

      const dew = temp - ((100 - rh) / 5);

      const precipAmount = d.prec_amount ?? 0;
      let precipitationSum = 0;
      let rainSum = 0;
      let snowfallSum = 0;
      if (d.prec_type === "rain") {
        rainSum = precipAmount;
        precipitationSum = precipAmount;
      } else if (d.prec_type === "snow") {
        snowfallSum = precipAmount;
        precipitationSum = precipAmount;
      } else {
        // none or other
        precipitationSum = 0;
      }

      hourly.push({
        time,
        temperature: temp,
        humidity: rh,
        dewPoint: Math.max(dew, -10),
        pressure: d.msl_pressure ?? 1013,
        apparentTemp: temp,
        precipitation: d.prec_type === "rain" ? (d.prec_amount ?? 0.5) : 0,
        rain: d.prec_type === "rain" ? (d.prec_amount ?? 0) : 0,
        snowfall: d.prec_type === "snow" ? (d.prec_amount ?? 0) : 0,
        weatherCode,
        cloudCover: d.cloudcover ?? 30,
        windSpeed: wind10m,
        windDir,
        windGusts: Math.round(wind10m * 1.4),
        uvIndex: 5,
        shortwaveRadiation: 500,
        cape: 0,
        cin: 0,
        liftedIndex: 0,
        temp80m: null,
        temp120m: null,
        windSpeed80m: null,
        windDir80m: null,
        windSpeed120m: null,
        windDir120m: null,
        windSpeed180m: null,
        windDir180m: null,
      });

      const dateKey = `${time.getDate()}/${time.getMonth() + 1}`;
      if (!seenDates.has(dateKey)) {
        seenDates.add(dateKey);
        daily.push({
          date: time,
          weatherCode,
          tempMax: temp + 3,
          tempMin: temp - 4,
          tempMean: (temp + 3 + temp - 4) / 2, // approximate
          apparentTempMax: temp,
          apparentTempMin: temp,
          sunrise: "",
          sunset: "",
          daylightDuration: 0,
          sunshineDuration: 0,
          precipitationSum,
          rainSum,
          snowfallSum,
          precipitationHours: d.prec_type === "none" ? 0 : 1, // approximate
          precipitationProbabilityMax: d.prec_type === "rain" ? 60 : 10,
          windSpeedMax: wind10m + 5,
          windGustsMax: wind10m + 10,
          windDirDominant: windDir,
          shortwaveRadiationSum: 500,
          uvIndexMax: 5,
          windSpeed: wind10m,
          cloudCover: d.cloudcover ?? 30,
          weatherDescription: "",
        });
      }
    }

    if (hourly.length === 0) return null;

    const current = parseCurrent(null, hourly);

    const result = { hourly, daily, current, source: "7timer" as const, responseTimeMs };
    forecastCacheSet(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch (err) {
    console.error("7Timer fetch error:", err);
    return null;
  }
}

const rateLimiter = {
  lastCall: 0,
  minInterval: 1200,
  callsInWindow: 0,
  windowStart: Date.now(),
  maxPerWindow: 10,
  windowMs: 10000,

  async wait(): Promise<void> {
    const now = Date.now();

    if (now - this.windowStart > this.windowMs) {
      this.callsInWindow = 0;
      this.windowStart = now;
    }

    if (this.callsInWindow >= this.maxPerWindow) {
      const waitTime = this.windowMs - (now - this.windowStart);
      if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));
      this.callsInWindow = 0;
      this.windowStart = Date.now();
    }

    const elapsed = now - this.lastCall;
    if (elapsed < this.minInterval) {
      await new Promise(r => setTimeout(r, this.minInterval - elapsed));
    }

    this.lastCall = Date.now();
    this.callsInWindow++;
  }
};

export const weatherService = {
  async fetchWeather(lat: number, lon: number) {
    let result = await fetchOpenMeteo(lat, lon);
    if (result && result.hourly.length > 0) {
      return { data: result, ok: true };
    }

    result = await fetchTimerGFS(lat, lon);
    if (result && result.hourly.length > 0) {
      return { data: result, ok: true };
    }

    return { data: null, ok: false };
  },

  async fetchWithFallback(lat: number, lon: number) {
    const result = await this.fetchWeather(lat, lon);
    if (result.ok && result.data) {
      return { data: result.data, ok: true };
    }
    return { data: null, ok: false };
  },

  async fetchCurrent(lat: number, lon: number) {
    const result = await fetchOpenMeteo(lat, lon);
    if (result && result.hourly.length > 0) {
      return { data: result.current, source: result.source };
    }
    return { data: null };
  },

  async fetchManyCurrent(coords: { lat: number; lon: number }[]): Promise<Record<string, { ok: boolean; data: MeteoCurrent | null; source?: string }>> {
    const results: Record<string, { ok: boolean; data: MeteoCurrent | null; source?: string }> = {};
    const clusters = clusterCoords(coords);

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const key = `light:${cluster.lat.toFixed(4)}:${cluster.lon.toFixed(4)}`;
      try {
        const result = await this.fetchWeather(cluster.lat, cluster.lon);
        const current = result.data?.hourly.length > 0 ? result.data.current : null;
        results[key] = {
          ok: current != null,
          data: current,
          source: result.source,
        };

        for (const site of cluster.sites) {
          const siteKey = `light:${site.lat.toFixed(4)}:${site.lon.toFixed(4)}`;
          if (!results[siteKey]) {
            results[siteKey] = {
              ok: current != null,
              data: current,
              source: result.source,
            };
          }
        }
      } catch (err) {
        results[key] = { ok: false, data: null };
      }

      if (i < clusters.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    return results;
  },

  async fetchWindProfile(lat: number, lon: number, _date?: string) {
    const result = await this.fetchWeather(lat, lon);
    if (result.data && result.data.hourly.length > 0) {
      return buildWindProfileFromHourly(result.data.hourly);
    }
    return { ventoOrario: [] };
  },

  clearCache() {
    forecastCache.clear();
  },
};

function clusterCoords(coords: { lat: number; lon: number }[], threshold = 0.1): { lat: number; lon: number; sites: { lat: number; lon: number }[] }[] {
  const clusters: { lat: number; lon: number; sites: { lat: number; lon: number }[] } = [];
  const used = new Set<number>();

  for (let i = 0; i < coords.length; i++) {
    if (used.has(i)) continue;
    const cluster: { lat: number; lon: number; sites: { lat: number; lon: number }[] } = {
      lat: coords[i].lat,
      lon: coords[i].lon,
      sites: [{ lat: coords[i].lat, lon: coords[i].lon }],
    };
    used.add(i);

    for (let j = i + 1; j < coords.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.abs(coords[j].lat - coords[i].lat) + Math.abs(coords[j].lon - coords[i].lon);
      if (dist < threshold * 2) {
        cluster.sites.push({ lat: coords[j].lat, lon: coords[j].lon });
        used.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

function buildWindProfileFromHourly(hourly: MeteoHourly[]): { ventoOrario: { ora: number; gust: number; quote: Record<number, { speed: number; dir: number }> }[] } {
  const oreUtili = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const quoteBase = [500, 800, 1000, 1200, 1500, 1800, 2000, 2500, 3000];

  const ventoOrario = oreUtili.map(ora => {
    const h = hourly.find(h => h.time.getHours() === ora);
    const q: Record<number, { speed: number; dir: number }> = {};
    const surface = h ? { speed: h.windSpeed, dir: h.windDir } : { speed: 0, dir: 0 };

    for (const qAlt of quoteBase) {
      const ratio = Math.max(1, qAlt / 10);
      const speed = Math.min(surface.speed * Math.pow(ratio, 0.143), surface.speed * 1.5);
      const rot = Math.round((qAlt / 250) * 2);
      const dir = ((surface.dir + rot) % 360 + 360) % 360;
      q[qAlt] = {
        speed: Math.max(0.5, Math.round(speed * 10) / 10),
        dir: Math.round(dir),
      };
    }

    return { ora, gust: h?.windGusts ?? 0, quote: q };
  });

  return { ventoOrario };
}