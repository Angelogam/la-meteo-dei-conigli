"use client";

import { getMeteoBaseUrl } from "@/config/apiConfig";

// -----------------------------
// 1. MODELLI POTENZIATI
// -----------------------------

export interface Site {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

// Dato grezzo con metadati sorgente
export interface RawPoint {
  time: string;            // ISO string
  temp: number | null;
  wind: number | null;
  dir: number | null;
  gust: number | null;
  cloudBase: number | null;
  cloudCover: number | null;
  rain: number | null;
  thermal: number | null;
  source?: string;         // per tracciabilità
}

// Dato unificato con confidenza per ogni campo
export interface UnifiedPoint {
  time: string;
  temp: number;            // sempre presenti, ma con confidenza
  wind: number;
  dir: number;
  gust: number;
  cloudBase: number;
  cloudCover: number;
  rain: number;
  thermal: number;
  confidence: number;      // complessiva (0-1)
  fieldConfidence: {       // confidenza per singolo campo
    temp: number;
    wind: number;
    dir: number;
    gust: number;
    cloudBase: number;
    cloudCover: number;
    rain: number;
    thermal: number;
  };
}

export interface UnifiedForecast {
  siteSlug: string;
  generatedAt: string;
  points: UnifiedPoint[];
  sources: string[];       // elenco fonti utilizzate
}

// -----------------------------
// 2. UTILS + TIPI
// -----------------------------

type Numeric = number | null | undefined;

const isValid = (v: Numeric): v is number => 
  typeof v === "number" && Number.isFinite(v);

const mean = (arr: number[]): number | null => 
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

// Calcola confidenza in base al numero di dati disponibili
function computeConfidence(values: Numeric[], maxCount: number): number {
  const validVals = values.filter(isValid);
  const count = validVals.length;
  if (count === 0) return 0;
  const base = count / maxCount; // 0..1
  return Math.min(1, base * 1.2); // leggero boost
}

// -----------------------------
// 3. ADAPTERS CON GESTIONE ERRORI
// -----------------------------

export function fromOpenMeteo(json: any): RawPoint[] {
  if (!json?.hourly?.time) return [];
  try {
    return json.hourly.time.map((t: string, i: number) => ({
      time: t,
      temp: json.hourly.temperature_2m?.[i] ?? null,
      wind: json.hourly.wind_speed_10m?.[i] ?? null,
      dir: json.hourly.wind_direction_10m?.[i] ?? null,
      gust: json.hourly.wind_gusts_10m?.[i] ?? null,
      cloudBase: json.hourly.cloud_base?.[i] ?? null,
      cloudCover: json.hourly.cloud_cover?.[i] ?? null,
      rain: json.hourly.rain?.[i] ?? null,
      thermal: json.hourly.thermal_strength?.[i] ?? null,
      source: 'openmeteo',
    }));
  } catch {
    return [];
  }
}

export function fromOpenWeather(json: any): RawPoint[] {
  if (!json?.list) return [];
  try {
    return json.list.map((item: any) => ({
      time: item.dt_txt,
      temp: item.main?.temp ?? null,
      wind: item.wind?.speed ?? null,
      dir: item.wind?.deg ?? null,
      gust: item.wind?.gust ?? null,
      cloudBase: null,
      cloudCover: item.clouds?.all ?? null,
      rain: item.rain?.["1h"] ?? null,
      thermal: null,
      source: 'openweather',
    }));
  } catch {
    return [];
  }
}

export function fromTomorrow(json: any): RawPoint[] {
  if (!json?.timelines?.hourly) return [];
  try {
    return json.timelines.hourly.map((h: any) => ({
      time: h.time,
      temp: h.values?.temperature ?? null,
      wind: h.values?.windSpeed ?? null,
      dir: h.values?.windDirection ?? null,
      gust: h.values?.windGust ?? null,
      cloudBase: h.values?.cloudBase ?? null,
      cloudCover: h.values?.cloudCover ?? null,
      rain: h.values?.rainIntensity ?? null,
      thermal: h.values?.thermalUpdraft ?? null,
      source: 'tomorrow',
    }));
  } catch {
    return [];
  }
}

// -----------------------------
// 4. FUSIONE DATI AVANZATA
// -----------------------------

function mergeRawPoints(rawPoints: RawPoint[]): UnifiedPoint[] {
  // Raggruppa per ora
  const byTime = new Map<string, RawPoint[]>();
  for (const p of rawPoints) {
    if (!byTime.has(p.time)) byTime.set(p.time, []);
    byTime.get(p.time)!.push(p);
  }

  const unified: UnifiedPoint[] = [];

  for (const [time, group] of byTime.entries()) {
    // Estrai array di valori per ogni campo
    const temps = group.map(g => g.temp).filter(isValid);
    const winds = group.map(g => g.wind).filter(isValid);
    const dirs  = group.map(g => g.dir).filter(isValid);
    const gusts = group.map(g => g.gust).filter(isValid);
    const bases = group.map(g => g.cloudBase).filter(isValid);
    const clouds = group.map(g => g.cloudCover).filter(isValid);
    const rains = group.map(g => g.rain).filter(isValid);
    const therms = group.map(g => g.thermal).filter(isValid);

    // Calcola medie
    const temp = mean(temps);
    const wind = mean(winds);
    const dir = mean(dirs);
    const gust = mean(gusts);
    const cloudBase = mean(bases);
    const cloudCover = mean(clouds);
    const rain = mean(rains);
    const thermal = mean(therms);

    // Se mancano dati essenziali (temperatura, vento o direzione) salta
    if (temp === null && wind === null && dir === null) continue;

    // Calcola confidenza per campo (massimo 3 sorgenti)
    const maxSources = 3;
    const confTemp = computeConfidence(temps, maxSources);
    const confWind = computeConfidence(winds, maxSources);
    const confDir  = computeConfidence(dirs, maxSources);
    const confGust = computeConfidence(gusts, maxSources);
    const confBase = computeConfidence(bases, maxSources);
    const confCloud = computeConfidence(clouds, maxSources);
    const confRain = computeConfidence(rains, maxSources);
    const confTherm = computeConfidence(therms, maxSources);

    // Confidenza complessiva = media delle confidenze dei campi rilevanti
    const overall = (confTemp + confWind + confDir) / 3; // solo i principali

    unified.push({
      time,
      temp: temp ?? 0,
      wind: wind ?? 0,
      dir: dir ?? 0,
      gust: gust ?? 0,
      cloudBase: cloudBase ?? 0,
      cloudCover: cloudCover ?? 0,
      rain: rain ?? 0,
      thermal: thermal ?? 0,
      confidence: Math.min(1, overall),
      fieldConfidence: {
        temp: confTemp,
        wind: confWind,
        dir: confDir,
        gust: confGust,
        cloudBase: confBase,
        cloudCover: confCloud,
        rain: confRain,
        thermal: confTherm,
      },
    });
  }

  return unified.sort((a, b) => a.time.localeCompare(b.time));
}

// -----------------------------
// 5. COSTRUISCI FORECAST CON METADATI
// -----------------------------

export function buildUnifiedForecast(
  siteSlug: string,
  openMeteoData: any,
  openWeatherData: any,
  tomorrowData: any
): UnifiedForecast {
  const raw: RawPoint[] = [
    ...fromOpenMeteo(openMeteoData),
    ...fromOpenWeather(openWeatherData),
    ...fromTomorrow(tomorrowData),
  ];

  const sources: string[] = [];
  if (openMeteoData) sources.push('openmeteo');
  if (openWeatherData) sources.push('openweather');
  if (tomorrowData) sources.push('tomorrow');

  return {
    siteSlug,
    generatedAt: new Date().toISOString(),
    points: mergeRawPoints(raw),
    sources,
  };
}

// -----------------------------
// 6. STORE CENTRALE CON CACHE E TTL
// -----------------------------

interface CacheEntry {
  forecast: UnifiedForecast;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minuti

export function setForecast(forecast: UnifiedForecast): void {
  cache.set(forecast.siteSlug, {
    forecast,
    timestamp: Date.now(),
  });
}

export function getForecast(slug: string): UnifiedForecast | null {
  const entry = cache.get(slug);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(slug);
    return null;
  }
  return entry.forecast;
}

export function clearCache(): void {
  cache.clear();
}

// -----------------------------
// 7. REPORT TESTUALE MIGLIORATO
// -----------------------------

export function buildReport(site: Site, forecast: UnifiedForecast): string {
  const points = forecast.points;
  if (points.length === 0) return `Nessun dato disponibile per ${site.name}`;

  // Scegli il punto centrale (o più vicino all'ora corrente)
  const now = new Date();
  let closest = points[0];
  let minDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(new Date(p.time).getTime() - now.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  const mid = closest;

  const lines = [
    `Report meteo per ${site.name}`,
    `Generato: ${new Date(forecast.generatedAt).toLocaleString('it-IT')}`,
    `Ora riferimento: ${new Date(mid.time).toLocaleString('it-IT')}`,
    `Fonti: ${forecast.sources.join(', ') || 'nessuna'}`,
    '--------------------------------',
    `Temperatura: ${mid.temp.toFixed(1)} °C (conf. ${(mid.fieldConfidence.temp * 100).toFixed(0)}%)`,
    `Vento: ${mid.wind.toFixed(1)} m/s da ${mid.dir.toFixed(0)}° (conf. ${(mid.fieldConfidence.wind * 100).toFixed(0)}%)`,
    `Raffiche: ${mid.gust.toFixed(1)} m/s (conf. ${(mid.fieldConfidence.gust * 100).toFixed(0)}%)`,
    `Base cumuli: ${mid.cloudBase.toFixed(0)} m (conf. ${(mid.fieldConfidence.cloudBase * 100).toFixed(0)}%)`,
    `Copertura nuvolosa: ${mid.cloudCover.toFixed(0)} % (conf. ${(mid.fieldConfidence.cloudCover * 100).toFixed(0)}%)`,
    `Pioggia: ${mid.rain.toFixed(1)} mm/h (conf. ${(mid.fieldConfidence.rain * 100).toFixed(0)}%)`,
    `Termica: ${mid.thermal.toFixed(1)} m/s (conf. ${(mid.fieldConfidence.thermal * 100).toFixed(0)}%)`,
    `Attendibilità complessiva: ${(mid.confidence * 100).toFixed(0)} %`,
  ];
  return lines.join('\n');
}

// -----------------------------
// 8. FUNZIONE ASINCRONA PER CARICARE TUTTE LE FONTI (UTILE PER REACT)
// -----------------------------

export async function fetchAllSources(site: Site): Promise<{
  openMeteo: any;
  openWeather: any;
  tomorrow: any;
}> {
  const baseUrl = getMeteoBaseUrl();
  const params = new URLSearchParams({
    latitude: site.latitude.toString(),
    longitude: site.longitude.toString(),
    hourly: 'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,rain',
    timezone: site.timeZone,
    forecast_days: '2',
  });
  const omUrl = `${baseUrl}?${params}`;

  // Placeholder per OpenWeather e Tomorrow — integrare con API key reali
  const [omRes, owRes, tmRes] = await Promise.allSettled([
    fetch(omUrl).then(r => r.json()),
    Promise.resolve(null),
    Promise.resolve(null),
  ]);

  return {
    openMeteo: omRes.status === 'fulfilled' ? omRes.value : null,
    openWeather: owRes.status === 'fulfilled' ? owRes.value : null,
    tomorrow: tmRes.status === 'fulfilled' ? tmRes.value : null,
  };
}