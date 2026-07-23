"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const TIMER_URL = "https://www.7timer.info/bin/astro.php";

export interface RawOpenMeteoResponse {
  hourly: Record<string, any[]>;
  daily: Record<string, any[]>;
}

// === PARAMETRI FISSI ===
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

// === RATE LIMITER A CODA ===
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

// === RETRY CON BACKOFF ESPONENZIALE ===
async function fetchWithRetry(url: string, retries = 3, signal?: AbortSignal): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Unisci l'abort signal esterno con quello interno
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

// === CLUSTERING GEOGRAFICO (da weatherService) ===
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

// === FETCH FUNCTIONS (PURE) ===
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

/** Fetch singolo con fallback automatico su 7Timer */
export async function fetchWithFallback(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<{ raw: RawOpenMeteoResponse | null; source: "open-meteo" | "7timer" }> {
  // Tenta Open-Meteo
  const om = await fetchOpenMeteoRaw(lat, lon, signal);
  if (om) return { raw: om, source: "open-meteo" };

  // Fallback 7Timer
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

    // 7Timer restituisce dati in formato diverso
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
</dyad-file>

<dyad-write path="src/services/meteoParser.ts" description="Layer 2: parser unico che trasforma raw JSON in tipi finali">
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

  // Dati giornalieri
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

  // Current (prima ora disponibile)
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
</dyad-file>

<dyad-write path="src/services/meteoRepository.ts" description="Layer 3: repository che usa fetcher + parser e integra React Query">
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithFallback, clusterCoords, type GeoCluster } from "./meteoFetcher";
import { parseRawResponse, type ParsedMeteoData, type CurrentParsed } from "./meteoParser";
import type { HourData, DailyData } from "@/types/meteo";

// === QUERY KEYS FACTORY ===
export const meteoKeys = {
  all: ["meteo"] as const,
  forecast: (lat: number, lon: number) => ["meteo", "forecast", lat.toFixed(4), lon.toFixed(4)] as const,
  batch: (coords: string) => ["meteo", "batch", coords] as const,
} as const;

// === HOOK PRINCIPALE ===
export function useMeteoForecast(lat: number, lon: number) {
  return useQuery({
    queryKey: meteoKeys.forecast(lat, lon),
    queryFn: async ({ signal }) => {
      const { raw, source } = await fetchWithFallback(lat, lon, signal);
      if (!raw) throw new Error("Nessun dato ricevuto");

      const parsed = parseRawResponse(raw);
      if (!parsed) throw new Error("Errore parsing dati");

      return { ...parsed, source };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
    enabled: lat != null && lon != null,
  });
}

// === HOOK BATCH PER DECOLLI (clustering geografico) ===
export function useMeteoBatch(
  decolli: Array<{ id: string; lat: number; lon: number; name: string }>
) {
  const queryClient = useQueryClient();

  // Crea il clustering
  const clusters = clusterCoords(decolli.map(d => ({ lat: d.lat, lon: d.lon })));

  // Query per ogni cluster
  const clusterQueries = clusters.map((cluster, idx) => {
    return useQuery({
      queryKey: meteoKeys.batch(`cluster:${cluster.center.lat.toFixed(4)}:${cluster.center.lon.toFixed(4)}`),
      queryFn: async ({ signal }) => {
        const { raw } = await fetchWithFallback(cluster.center.lat, cluster.center.lon, signal);
        const parsed = raw ? parseRawResponse(raw) : null;
        return {
          cluster: idx,
          data: parsed,
          sites: cluster.sites,
        };
      },
      staleTime: 10 * 60 * 1000,
      refetchInterval: 15 * 60 * 1000,
      retry: 1,
    });
  });

  // Unisce i risultati per singolo decollo
  const decolliData: Record<string, {
    loading: boolean;
    data: CurrentParsed | null;
  }> = {};

  for (const decollo of decolli) {
    const cluster = clusters.find(c =>
      c.sites.some(s => s.lat === decollo.lat || s.lon === decollo.lon)
    );
    const idx = clusters.indexOf(cluster!);
    const q = clusterQueries[idx];
    const parsed = q.data?.data;

    decolliData[decollo.id] = {
      loading: q.isLoading,
      data: parsed?.current ?? null,
    };

    // Prefetch se non ancora caricato
    if (!q.data && !q.isLoading) {
      queryClient.prefetchQuery({
        queryKey: meteoKeys.forecast(decollo.lat, decollo.lon),
        queryFn: async ({ signal }) => {
          const { raw, source } = await fetchWithFallback(decollo.lat, decollo.lon, signal);
          const parsed = raw ? parseRawResponse(raw) : null;
          return parsed ? { ...parsed, source } : null;
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }

  const isLoading = clusterQueries.some(q => q.isLoading);
  const isFetching = clusterQueries.some(q => q.isFetching);

  return { decolliData, isLoading, isFetching };
}

// === HOOK PER VENTO IN QUOTA ===
export function useMeteoWindProfile(lat: number) {
  const query = useMeteoForecast(lat, 0); // lon viene ignorato
  return query;
}

// === FUNZIONE SINGOLA (senza React Query, per chiamate one-shot) ===
export async function fetchSingleForecast(lat: number, lon: number): Promise<ParsedMeteoData | null> {
  const { raw } = await fetchWithFallback(lat, lon);
  if (!raw) return null;
  return parseRawResponse(raw);
}
</dyad-field>

Now rewrite `useWeatherData` to use the new repository.

<dyad-write path="src/hooks/useWeatherData.ts" description="Riscrittura completa usando il nuovo meteoRepository">
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { HourData, DailyData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { useMeteoForecast, type ParsedMeteoData } from "@/services/meteoRepository";

const STORAGE_KEY_SITE = "meteo_selected_decollo";
const REFRESH_INTERVAL = 600000; // 10 minuti

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_SITE) || DECOLLI[0].id;
    }
    return DECOLLI[0].id;
  });

  const site = DECOLLI.find(d => d.id === selectedId) || DECOLLI[0];
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<"meteo" | "venti" | "termiche" | "analisi">("meteo");
  const [activeModel, setActiveModel] = useState("gfs");

  // React Query tramite repository
  const {
    data: meteoData,
    isLoading: loading,
    isFetching: updating,
    dataUpdatedAt: lastUpdateTimestamp,
    refetch: refetchForecast,
    error: forecastError,
  } = useMeteoForecast(site.lat, site.lon);

  const lastUpdate = lastUpdateTimestamp ? new Date(lastUpdateTimestamp) : null;

  const hourlyData: HourData[] = useMemo(() => {
    return meteoData?.hourly ?? [];
  }, [meteoData?.hourly]);

  const dailyData: DailyData[] = useMemo(() => {
    return meteoData?.daily ?? [];
  }, [meteoData?.daily]);

  const dayData = useMemo(() => {
    return hourlyData.filter(h => {
      const oggi = new Date();
      const targetDate = new Date(oggi);
      targetDate.setDate(oggi.getDate() + selectedDay);
      const hDate = new Date(h.time);
      return (
        hDate.getDate() === targetDate.getDate() &&
        hDate.getMonth() === targetDate.getMonth() &&
        hDate.getFullYear() === targetDate.getFullYear()
      );
    });
  }, [hourlyData, selectedDay]);

  const currentData = useMemo(() => {
    const found = dayData.find(h => new Date(h.time).getHours() === selectedHour);
    const fallback = dayData[0] || hourlyData[0] || null;
    const data = found || fallback;
    if (!data) return null;
    return {
      ...data,
      temperature: Math.round(data.temperature * 10) / 10,
      windSpeed: Math.round(data.windSpeed * 10) / 10,
      windGusts: data.windGusts ? Math.round(data.windGusts) : 0,
      humidity: Math.round(data.humidity),
      pressure: Math.round(data.pressure),
      precipitation: Math.round(data.precipitation * 100) / 100,
      cloudCover: Math.round(data.cloudCover),
      uvIndex: Math.round(data.uvIndex * 10) / 10,
      visibility: data.visibility ? Math.round(data.visibility / 100) * 100 : 10000,
    };
  }, [dayData, hourlyData, selectedHour]);

  const enrichedDaily = useMemo(() => {
    return dailyData.map((d, i) => {
      const dayHours = hourlyData.filter(h => {
        const hDate = new Date(h.time);
        const dDate = new Date(d.date);
        return (
          hDate.getDate() === dDate.getDate() &&
          hDate.getMonth() === dDate.getMonth()
        );
      });

      const temps = dayHours.map(h => h.temperature).filter(t => t != null);
      const winds = dayHours.map(h => h.windSpeed).filter(w => w != null);
      const clouds = dayHours.map(h => h.cloudCover).filter(c => c != null);

      return {
        ...d,
        temperatureMax: temps.length > 0 ? Math.round(Math.max(...temps)) : d.temperatureMax,
        temperatureMin: temps.length > 0 ? Math.round(Math.min(...temps)) : d.temperatureMin,
        windSpeedMax: winds.length > 0 ? Math.round(Math.max(...winds)) : d.windSpeedMax,
        windSpeed: winds.length > 0 ? Math.round(winds.reduce((s, w) => s + w, 0) / winds.length) : d.windSpeed,
        cloudCover: clouds.length > 0 ? Math.round(clouds.reduce((s, c) => s + c, 0) / clouds.length) : d.cloudCover,
        weatherDescription: d.weatherDescription,
      };
    });
  }, [dailyData, hourlyData]);

  const thermalDelta = useMemo(() => {
    if (!currentData) return 0;
    return Math.round((currentData.temperature - (currentData.dewPoint || currentData.temperature - 8)) * 10) / 10;
  }, [currentData]);

  const currentCape = useMemo(() => {
    if (!currentData) return null;
    return {
      cape: Math.round(currentData.cape || 0),
      cin: Math.round(currentData.cin || 0),
      liftedIndex: currentData.liftedIndex !== undefined ? Math.round(currentData.liftedIndex * 10) / 10 : 0,
    };
  }, [currentData]);

  const dateLabels = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
      const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
      return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
    });
  }, []);

  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  useEffect(() => {
    setCountdown(Math.min(REFRESH_INTERVAL, Math.max(0, REFRESH_INTERVAL - (Date.now() - (lastUpdateTimestamp || 0)))));
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdateTimestamp]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SITE, selectedId);
  }, [selectedId]);

  useEffect(() => {
    const ora = new Date().getHours();
    if (selectedHour < 0 || selectedHour > 23) {
      setSelectedHour(ora);
    }
  }, [selectedDay, selectedHour]);

  const loadWeather = useCallback(() => {
    refetchForecast();
    setCountdown(REFRESH_INTERVAL);
  }, [refetchForecast]);

  return {
    selectedId, setSelectedId,
    loading,
    updating,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate,
    countdown,
    activeModel, setActiveModel,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    hourlyData,
    allHourlyData: {} as Record<string, HourData[]>,
    allDailyData: dailyData,
    currentCape,
    loadWeather,
    forecastError,
  };
}