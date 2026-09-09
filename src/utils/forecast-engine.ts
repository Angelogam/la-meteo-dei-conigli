"use client";

import { getMeteoBaseUrl } from "@/config/apiConfig";

// -----------------------------
// 1. MODELLI
// -----------------------------

export interface Site {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export type ForecastSource = 'open-meteo' | 'openweather' | 'tomorrow';

export interface RawForecastPoint {
  source: ForecastSource;
  time: string;
  temp: number | null;
  windSpeed: number | null;
  windDir: number | null;
  gust: number | null;
  cloudCover: number | null;
  rain: number | null;
}

export interface UnifiedForecastPoint {
  time: string;
  temp: number;
  windSpeed: number;
  windDir: number;
  gust: number;
  cloudCover: number;
  rain: number;
  confidence: number;
}

export interface UnifiedForecast {
  siteSlug: string;
  generatedAt: string;
  points: UnifiedForecastPoint[];
}


// -----------------------------
// 2. UTILS
// -----------------------------

function isValidNumber(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function avg(arr: number[], fallback: number): number {
  if (!arr.length) return fallback;
  const sum = arr.reduce((a, b) => a + b, 0);
  return Number.isFinite(sum) ? sum / arr.length : fallback;
}


// -----------------------------
// 3. ADAPTERS API
// -----------------------------

export function fromOpenMeteo(json: any): RawForecastPoint[] {
  if (!json?.hourly?.time) return [];
  return json.hourly.time.map((time: string, i: number) => ({
    source: 'open-meteo',
    time,
    temp: json.hourly.temperature_2m?.[i] ?? null,
    windSpeed: json.hourly.windspeed_10m?.[i] ?? json.hourly.wind_speed_10m?.[i] ?? null,
    windDir: json.hourly.winddirection_10m?.[i] ?? json.hourly.wind_direction_10m?.[i] ?? null,
    gust: json.hourly.gusts_10m?.[i] ?? null,
    cloudCover: json.hourly.cloudcover?.[i] ?? json.hourly.cloud_cover?.[i] ?? null,
    rain: json.hourly.rain?.[i] ?? json.hourly.precipitation?.[i] ?? null,
  }));
}

export function fromOpenWeather(json: any): RawForecastPoint[] {
  if (!json?.list) return [];
  return json.list.map((item: any) => ({
    source: 'openweather',
    time: item.dt_txt,
    temp: item.main?.temp ?? null,
    windSpeed: item.wind?.speed ?? null,
    windDir: item.wind?.deg ?? null,
    gust: item.wind?.gust ?? null,
    cloudCover: item.clouds?.all ?? null,
    rain: item.rain?.['1h'] ?? null,
  }));
}

export function fromTomorrow(json: any): RawForecastPoint[] {
  if (!json?.timelines?.hourly) return [];
  return json.timelines.hourly.map((h: any) => ({
    source: 'tomorrow',
    time: h.time,
    temp: h.values?.temperature ?? null,
    windSpeed: h.values?.windSpeed ?? null,
    windDir: h.values?.windDirection ?? null,
    gust: h.values?.windGust ?? null,
    cloudCover: h.values?.cloudCover ?? null,
    rain: h.values?.rainIntensity ?? null,
  }));
}


// -----------------------------
// 4. MOTORE DI FUSIONE
// -----------------------------

function mergePoints(points: RawForecastPoint[]): UnifiedForecastPoint[] {
  const byTime = new Map<string, RawForecastPoint[]>();

  for (const p of points) {
    if (!byTime.has(p.time)) byTime.set(p.time, []);
    byTime.get(p.time)!.push(p);
  }

  const unified: UnifiedForecastPoint[] = [];

  for (const [time, group] of byTime.entries()) {
    const temps   = group.map(g => g.temp).filter(isValidNumber);
    const winds   = group.map(g => g.windSpeed).filter(isValidNumber);
    const dirs    = group.map(g => g.windDir).filter(isValidNumber);
    const gusts   = group.map(g => g.gust).filter(isValidNumber);
    const clouds  = group.map(g => g.cloudCover).filter(isValidNumber);
    const rains   = group.map(g => g.rain).filter(isValidNumber);

    const temp    = avg(temps, NaN);
    const wind    = avg(winds, NaN);
    const dir     = avg(dirs, NaN);
    const gust    = avg(gusts, NaN);
    const cloud   = avg(clouds, NaN);
    const rain    = avg(rains, 0);

    const totalFields = group.length * 6;
    const presentFields = temps.length + winds.length + dirs.length + gusts.length + clouds.length + rains.length;
    const confidence = totalFields > 0 ? presentFields / totalFields : 0;

    // Skip points where we have no usable data at all
    if (!isValidNumber(temp) && !isValidNumber(wind) && !isValidNumber(dir)) {
      continue;
    }

    unified.push({
      time,
      temp: isValidNumber(temp) ? temp : 0,
      windSpeed: isValidNumber(wind) ? wind : 0,
      windDir: isValidNumber(dir) ? dir : 0,
      gust: isValidNumber(gust) ? gust : 0,
      cloudCover: isValidNumber(cloud) ? cloud : 0,
      rain: isValidNumber(rain) ? rain : 0,
      confidence: Math.max(0, Math.min(1, confidence)),
    });
  }

  unified.sort((a, b) => a.time.localeCompare(b.time));
  return unified;
}


// -----------------------------
// 5. COSTRUISCI FORECAST UNICO
// -----------------------------

export function buildUnifiedForecast(
  siteSlug: string,
  openMeteoJson: any,
  openWeatherJson: any,
  tomorrowJson: any,
): UnifiedForecast {
  const raw: RawForecastPoint[] = [
    ...fromOpenMeteo(openMeteoJson),
    ...fromOpenWeather(openWeatherJson),
    ...fromTomorrow(tomorrowJson),
  ];

  const points = mergePoints(raw);

  return {
    siteSlug,
    generatedAt: new Date().toISOString(),
    points,
  };
}


// -----------------------------
// 6. STORE CENTRALE PER TUTTI I DECOLLI
// -----------------------------

const forecastCache = new Map<string, UnifiedForecast>();

export function setForecast(forecast: UnifiedForecast) {
  forecastCache.set(forecast.siteSlug, forecast);
}

export function getForecast(siteSlug: string): UnifiedForecast | null {
  return forecastCache.get(siteSlug) ?? null;
}

export function clearForecastCache() {
  forecastCache.clear();
}


// -----------------------------
// 7. SITES DATASET
// -----------------------------

import { DECOLLI } from "@/data/decolli";

export const allSites: Site[] = DECOLLI.map(d => ({
  slug: d.id,
  name: d.name,
  latitude: d.lat,
  longitude: d.lon,
  timeZone: "Europe/Rome",
}));


// -----------------------------
// 8. CARICA TUTTI I DECOLLI
// -----------------------------

export async function loadAllForecasts(fetcher: {
  openMeteo: (lat: number, lon: number) => Promise<any>;
  openWeather: (lat: number, lon: number) => Promise<any>;
  tomorrow: (lat: number, lon: number) => Promise<any>;
}) {
  for (const site of allSites) {
    try {
      const [om, ow, tm] = await Promise.all([
        fetcher.openMeteo(site.latitude, site.longitude),
        fetcher.openWeather(site.latitude, site.longitude),
        fetcher.tomorrow(site.latitude, site.longitude),
      ]);

      const forecast = buildUnifiedForecast(site.slug, om, ow, tm);
      setForecast(forecast);
    } catch (err) {
      console.error(`Failed to load forecast for ${site.name}:`, err);
    }
  }
}