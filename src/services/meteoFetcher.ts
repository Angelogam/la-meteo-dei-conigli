"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const TIMER_URL = "https://www.7timer.info/bin/astro.php";

export interface RawOpenMeteoResponse {
  hourly: Record<string, any[]>;
  daily: Record<string, any[]>;
}

const HOURLY_PARAMS = [
  "temperature_2m", "relative_humidity_2m", "dew_point_2m",
  "apparent_temperature", "precipitation", "weather_code",
  "cloud_cover", "pressure_msl", "wind_speed_10m",
  "wind_direction_10m", "wind_gusts_10m", "uv_index",
  "shortwave_radiation", "cape", "convective_inhibition",
  "lifted_index", "temperature_80m", "temperature_120m",
  "wind_speed_80m", "wind_direction_80m", "wind_speed_120m",
  "wind_direction_120m", "wind_speed_180m", "wind_direction_180m",
].join(",");

const DAILY_PARAMS = [
  "weather_code", "temperature_2m_max", "temperature_2m_min",
  "precipitation_sum", "precipitation_probability_max",
  "wind_speed_10m_max", "wind_gusts_10m_max",
  "wind_direction_10m_dominant", "uv_index_max",
].join(",");

class RateLimiterQueue {
  private queue: (() => Promise<void>)[] = [];
  private processing = false;
  private minInterval: number;

  constructor(minIntervalMs = 1500) {
    this.minInterval = minIntervalMs;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try { resolve(await fn()); }
        catch (e) { reject(e); }
      });
      if (!this.processing) this._processQueue();
    });
  }

  private async _processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
      if (this.queue.length > 0) {
        await this._sleep(this.minInterval);
      }
    }
    this.processing = false;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}

const rateLimiter = new RateLimiterQueue();

async function fetchWithRetry(url: string, retries = 3, signal?: AbortSignal): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const combinedSignal = signal
        ? combineAbortSignals(signal, controller.signal)
        : controller.signal;
      const res = await fetch(url, { signal: combinedSignal });
      clearTimeout(timeoutId);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await sleep(1000 * Math.pow(2, attempt));
          continue;
        }
        return null;
      }
      return null;
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      return null;
    }
  }
  return null;
}

function combineAbortSignals(s1: AbortSignal, s2: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  s1.addEventListener("abort", onAbort, { once: true });
  s2.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export interface GeoCluster {
  center: { lat: number; lon: number };
  sites: Array<{ lat: number; lon: number; index: number }>;
}

export function clusterCoords(
  coords: Array<{ lat: number; lon: number }>,
  threshold = 0.1
): GeoCluster[] {
  const clusters: GeoCluster[] = [];
  const used = new Set<number>();
  for (let i = 0; i < coords.length; i++) {
    if (used.has(i)) continue;
    const cluster: GeoCluster = {
      center: { lat: coords[i].lat, lon: coords[i].lon },
      sites: [{ lat: coords[i].lat, lon: coords[i].lon, index: i }],
    };
    used.add(i);
    for (let j = i + 1; j < coords.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.abs(coords[j].lat - coords[i].lat) + Math.abs(coords[j].lon - coords[i].lon);
      if (dist < threshold * 2) {
        cluster.sites.push({ lat: coords[j].lat, lon: coords[j].lon, index: j });
        used.add(j);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

export async function fetchOpenMeteoRaw(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<RawOpenMeteoResponse | null> {
  return rateLimiter.enqueue(async () => {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: HOURLY_PARAMS,
      daily: DAILY_PARAMS,
      timezone: "Europe/Rome",
      forecast_days: "3",
    });
    const url = `${BASE_URL}?${params.toString()}`;
    const res = await fetchWithRetry(url, 3, signal);
    if (!res) return null;
    const raw = await res.json();
    if (!raw?.hourly?.time?.length) return null;
    return raw as RawOpenMeteoResponse;
  });
}

export async function fetchWithFallback(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<{ raw: RawOpenMeteoResponse | null; source: "open-meteo" | "7timer" }> {
  const om = await fetchOpenMeteoRaw(lat, lon, signal);
  if (om) return { raw: om, source: "open-meteo" };
  const timer = await fetchTimerRaw(lat, lon, signal);
  if (timer) return { raw: timer, source: "7timer" };
  return { raw: null, source: "open-meteo" };
}

async function fetchTimerRaw(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<RawOpenMeteoResponse | null> {
  return rateLimiter.enqueue(async () => {
    const url = `${TIMER_URL}?lon=${lon}&lat=${lat}&ac=0&unit=metric&output=json&tzshift=0`;
    const res = await fetchWithRetry(url, 2, signal);
    if (!res) return null;
    const raw = await res.json();
    if (!raw?.dataseries?.length) return null;
    const now = new Date();
    const hourly: Record<string, any[]> = {
      time: [],
      temperature_2m: [],
      relative_humidity_2m: [],
      dew_point_2m: [],
      apparent_temperature: [],
      precipitation: [],
      weather_code: [],
      cloud_cover: [],
      pressure_msl: [],
      wind_speed_10m: [],
      wind_direction_10m: [],
      wind_gusts_10m: [],
      uv_index: [],
      shortwave_radiation: [],
      cape: [],
      convective_inhibition: [],
      lifted_index: [],
      temperature_80m: [],
      temperature_120m: [],
      wind_speed_80m: [],
      wind_direction_80m: [],
      wind_speed_120m: [],
      wind_direction_120m: [],
      wind_speed_180m: [],
      wind_direction_180m: [],
    };
    const daily: Record<string, any[]> = {
      time: [],
      weather_code: [],
      temperature_2m_max: [],
      temperature_2m_min: [],
      precipitation_sum: [],
      precipitation_probability_max: [],
      wind_speed_10m_max: [],
      wind_gusts_10m_max: [],
      wind_direction_10m_dominant: [],
      uv_index_max: [],
    };
    const seenDates = new Set<string>();
    const dailyData: Record<string, any> = {};
    for (let i = 0; i < raw.dataseries.length && i < 72; i++) {
      const d = raw.dataseries[i];
      const time = new Date(now);
      time.setHours(now.getHours() + (d.timepoint || i));
      time.setMinutes(0, 0, 0);
      const temp = d.temp2m ?? 15;
      const rh = d.rh2m ?? 50;
      const windSpeed = d.wind10m?.speed ?? 10;
      const windDir = d.wind10m?.direction ?? 180;
      const cloudCover = d.cloudcover ?? 30;
      const dew = temp - ((100 - rh) / 5);
      const weatherCode = cloudCover > 80 ? 3 : cloudCover > 50 ? 2 : cloudCover > 20 ? 1 : 0;
      const precip = d.prec_type === "rain" ? (d.prec_amount ?? 0.5) : 0;
      hourly.time.push(time.toISOString());
      hourly.temperature_2m.push(temp);
      hourly.relative_humidity_2m.push(rh);
      hourly.dew_point_2m.push(Math.max(dew, -10));
      hourly.apparent_temperature.push(temp);
      hourly.precipitation.push(precip);
      hourly.weather_code.push(weatherCode);
      hourly.cloud_cover.push(cloudCover);
      hourly.pressure_msl.push(d.msl_pressure ?? 1013);
      hourly.wind_speed_10m.push(windSpeed);
      hourly.wind_direction_10m.push(windDir);
      hourly.wind_gusts_10m.push(Math.round(windSpeed * 1.4));
      hourly.uv_index.push(5);
      hourly.shortwave_radiation.push(500);
      hourly.cape.push(0);
      hourly.convective_inhibition.push(0);
      hourly.lifted_index.push(0);
      hourly.temperature_80m.push(null);
      hourly.temperature_120m.push(null);
      hourly.wind_speed_80m.push(null);
      hourly.wind_direction_80m.push(null);
      hourly.wind_speed_120m.push(null);
      hourly.wind_direction_120m.push(null);
      hourly.wind_speed_180m.push(null);
      hourly.wind_direction_180m.push(null);
      const dateKey = `${time.getDate()}/${time.getMonth() + 1}`;
      if (!seenDates.has(dateKey)) {
        seenDates.add(dateKey);
        dailyData[dateKey] = {
          time: time.toISOString(),
          weather_code: weatherCode,
          temperature_2m_max: temp + 3,
          temperature_2m_min: temp - 4,
          precipitation_sum: precip,
          precipitation_probability_max: d.prec_type === "rain" ? 60 : 10,
          wind_speed_10m_max: windSpeed + 5,
          wind_gusts_10m_max: windSpeed + 10,
          wind_direction_10m_dominant: windDir,
          uv_index_max: 5,
        };
      }
    }
    for (const entry of Object.values(dailyData)) {
      const e = entry as any;
      daily.time.push(e.time);
      daily.weather_code.push(e.weather_code);
      daily.temperature_2m_max.push(e.temperature_2m_max);
      daily.temperature_2m_min.push(e.temperature_2m_min);
      daily.precipitation_sum.push(e.precipitation_sum);
      daily.precipitation_probability_max.push(e.precipitation_probability_max);
      daily.wind_speed_10m_max.push(e.wind_speed_10m_max);
      daily.wind_gusts_10m_max.push(e.wind_gusts_10m_max);
      daily.wind_direction_10m_dominant.push(e.wind_direction_10m_dominant);
      daily.uv_index_max.push(e.uv_index_max);
    }
    return { hourly, daily };
  });
}