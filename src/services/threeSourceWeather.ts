"use client";

import { DECOLLI } from "@/data/decolli";
import { fetchFull } from "@/lib/openMeteoClient";

export type Decollo = {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
};

export type MeteoDecollo = {
  temp: number | string;
  rain: number | string;
  cloud: number | string;
  wind: number | string;
  dir: number | string;
  stato: string;
  baseNubi: string;
  termiche: string;
  indice: number | null;
  indiceLabel: string;
  freezingLevel: number | null;
  weatherCode: number | null;
  fonte: string;
  /** Serie oraria Open-Meteo (fino a 3 giorni): alimenta timeline, windgram e verdetto di volo. */
  hourly?: HourlyPoint[];
};

/** Un livello di pressione del modello (sounding semplificato) per un'ora. */
export type WindLevel = {
  /** Livello di pressione in hPa (925 = ~750 m, 550 = ~4900 m). */
  hpa: number;
  /** Geopotenziale del livello in metri s.l.m. */
  gh: number;
  /** Vento in km/h. */
  ws: number;
  /** Direzione meteorologica del vento in gradi (da cui proviene), se disponibile. */
  wd?: number | null;
  /** Temperatura dell'aria in °C (solo livelli chiave per il profilo termico). */
  t?: number | null;
};

/** Un'ora della serie oraria Open-Meteo per un decollo. */
export type HourlyPoint = {
  /** Ora locale in formato "2026-10-27T14:00" (timezone Europe/Rome). */
  time: string;
  wind: number | null;
  gusts: number | null;
  dir: number | null;
  temp: number | null;
  dew: number | null;
  rain: number | null;
  cloud: number | null;
  code: number | null;
  cape: number | null;
  freezing: number | null;
  /** Radiazione diretta (W/m²) — motore del campo termico stile Meteo-Parapente */
  rad: number | null;
  /** Sounding del modello: vento/geopotenziale ai livelli di pressione (dal più basso al più alto). */
  levels?: WindLevel[];
};

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_KEY || "";
const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_KEY || "";

/** Livelli di pressione del sounding (condivisi da client e server batch). */
export const PRESSURE_LEVELS = [925, 900, 850, 800, 750, 700, 650, 600, 550];

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function findCurrentIndex(times: unknown[], now = new Date()): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i++) {
    const t = new Date(String(times[i]));
    if (Number.isNaN(t.getTime())) continue;
    const distance = Math.abs(t.getTime() - now.getTime());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }

  return best;
}

/**
 * Modella la risposta grezza Open-Meteo (una località) nella forma usata dall'app.
 * Condivisa dal fetch per-decollo e dal batch /api/decolli-batch.
 */
export function shapeOpenMeteo(forecast: {
  hourly?: Record<string, unknown>;
  daily?: Record<string, unknown>;
}): {
  temp: number | null;
  rain: number | null;
  cloud: number | null;
  wind: number | null;
  dir: number | null;
  cape: number | null;
  freezingLevel: number | null;
  weatherCode: number | null;
  tMax: number | null;
  tMin: number | null;
  cloudDaily: number | null;
  rainDaily: number | null;
  hourly: HourlyPoint[];
} | null {
  const h = forecast.hourly;
  const d = forecast.daily;
  const times = h?.time;
  if (!Array.isArray(times) || times.length === 0) return null;

  const hourly: HourlyPoint[] = times.map((t, idx) => {
    const levels: WindLevel[] = [];
    for (const hpa of PRESSURE_LEVELS) {
      const gh = numOrNull((h as Record<string, unknown>)[`geopotential_height_${hpa}hPa`]?.[idx]);
      const ws = numOrNull((h as Record<string, unknown>)[`wind_speed_${hpa}hPa`]?.[idx]);
      if (gh === null || ws === null) continue;
      const wd = numOrNull((h as Record<string, unknown>)[`wind_direction_${hpa}hPa`]?.[idx]);
      const tempKey = [`925`, `850`, `700`, `550`].includes(String(hpa))
        ? numOrNull((h as Record<string, unknown>)[`temperature_${hpa}hPa`]?.[idx])
        : null;
      levels.push({ hpa, gh, ws, wd, t: tempKey });
    }
    return {
      time: String(t),
      wind: numOrNull(h.wind_speed_10m?.[idx]),
      gusts: numOrNull(h.wind_gusts_10m?.[idx]),
      dir: numOrNull(h.wind_direction_10m?.[idx]),
      temp: numOrNull(h.temperature_2m?.[idx]),
      dew: numOrNull(h.dew_point_2m?.[idx]),
      rain: numOrNull(h.precipitation?.[idx]),
      cloud: numOrNull(h.cloud_cover?.[idx]),
      code: numOrNull(h.weather_code?.[idx]),
      cape: numOrNull(h.cape?.[idx]),
      freezing: numOrNull(h.freezing_level_height?.[idx]),
      rad: numOrNull(h.direct_radiation?.[idx]),
      levels: levels.length ? levels : undefined,
    };
  });

  const i = findCurrentIndex(times);
  return {
    temp: numOrNull(h.temperature_2m?.[i]),
    rain: numOrNull(h.precipitation?.[i]),
    cloud: numOrNull(h.cloud_cover?.[i]),
    wind: numOrNull(h.wind_speed_10m?.[i]),
    dir: numOrNull(h.wind_direction_10m?.[i]),
    cape: numOrNull(h.cape?.[i]),
    freezingLevel: numOrNull(h.freezing_level_height?.[i]),
    weatherCode: numOrNull(h.weather_code?.[i]),
    tMax: numOrNull(d?.temperature_2m_max?.[0]),
    tMin: numOrNull(d?.temperature_2m_min?.[0]),
    cloudDaily: numOrNull(d?.cloud_cover_mean?.[0]),
    rainDaily: numOrNull(d?.precipitation_sum?.[0]),
    hourly,
  };
}

async function getOpenMeteo(lat: number, lon: number) {
  try {
    // Hourly and daily variables are returned together, reducing upstream calls per launch.
    // dew_point_2m serve alla base nubi (LCL), wind_gusts_10m all'indice di volabilità;
    // 3 giorni per alimentare le timeline orarie del selettore giorni.
    // Sounding a livelli di pressione per il windgram stile Meteo-Parapente:
    // vento + geopotenziale a 9 livelli (925→550 hPa ≈ 750→4900 m) e temperatura
    // a 4 livelli chiave per ricavare top termica e inversioni dal profilo reale.
    const pressureLevels = PRESSURE_LEVELS;
    const soundingVars = pressureLevels
      .map((hpa) => `wind_speed_${hpa}hPa,geopotential_height_${hpa}hPa,wind_direction_${hpa}hPa`)
      .join(",") + ",temperature_925hPa,temperature_850hPa,temperature_700hPa,temperature_550hPa";
    const forecast = await fetchFull(
      lat,
      lon,
      "temperature_2m,dew_point_2m,precipitation,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cape,freezing_level_height,weather_code,direct_radiation," + soundingVars,
      "temperature_2m_max,temperature_2m_min,cloud_cover_mean,precipitation_sum",
      "",
      3,
    );

    return shapeOpenMeteo(forecast);
  } catch {
    return null;
  }
}

async function getOpenWeather(lat: number, lon: number) {
  if (!OPENWEATHER_API_KEY) return null;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      temp: numOrNull(data.main?.temp),
      rain: numOrNull(data.rain?.["1h"]),
      cloud: numOrNull(data.clouds?.all),
      wind: numOrNull(data.wind?.speed),
      dir: numOrNull(data.wind?.deg),
      stato: typeof data.weather?.[0]?.main === "string" ? data.weather[0].main : null,
    };
  } catch {
    return null;
  }
}

async function getTomorrow(lat: number, lon: number) {
  if (!TOMORROW_API_KEY) return null;
  try {
    const url = `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}&fields=temperature,cloudCover,precipitationIntensity,windSpeed,windDirection&timesteps=1h&apikey=${TOMORROW_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const v = data.data?.timelines?.[0]?.intervals?.[0]?.values;
    if (!v) return null;
    return {
      temp: numOrNull(v.temperature),
      rain: numOrNull(v.precipitationIntensity),
      cloud: numOrNull(v.cloudCover),
      wind: numOrNull(v.windSpeed),
      dir: numOrNull(v.windDirection),
    };
  } catch {
    return null;
  }
}

function circularMeanWindDirection(values: number[]): number | null {
  const valid = values.filter(Number.isFinite);
  if (valid.length === 0) return null;

  const sumCos = valid.reduce((sum, v) => sum + Math.cos((v * Math.PI) / 180), 0);
  const sumSin = valid.reduce((sum, v) => sum + Math.sin((v * Math.PI) / 180), 0);
  const mean = (Math.atan2(sumSin, sumCos) * 180) / Math.PI;
  return (mean + 360) % 360;
}

function fuse(values: Array<{ value: number | null; weight: number }>): number | null {
  const valid = values.filter(v => v.value !== null && Number.isFinite(v.value));
  if (!valid.length) return null;

  const weight = valid.reduce((sum, v) => sum + v.weight, 0);
  if (weight <= 0) return null;

  return valid.reduce((sum, v) => sum + (v.value as number) * v.weight, 0) / weight;
}

const WEIGHTS = {
  temp: { om: 0.3, ow: 0.3, tw: 0.4 },
  wind: { om: 0.3, ow: 0.4, tw: 0.3 },
  cloud: { om: 0.3, ow: 0.3, tw: 0.4 },
  rain: { om: 0.3, ow: 0.4, tw: 0.3 },
};

/** Forma comune (parziale) dei dati restituiti dai tre provider dopo la normalizzazione. */
interface FusedWeatherSource {
  temp?: number | null;
  rain?: number | null;
  cloud?: number | null;
  wind?: number | null;
  dir?: number | null;
  stato?: string | null;
  weatherCode?: number | null;
  cape?: number | null;
  freezingLevel?: number | null;
  tMax?: number | null;
  tMin?: number | null;
  cloudDaily?: number | null;
  rainDaily?: number | null;
}

function statoAggressivo(
  openMeteo: FusedWeatherSource | null,
  openWeather: FusedWeatherSource | null,
  tomorrow: FusedWeatherSource | null
): string {
  if (openWeather?.stato === "Thunderstorm") return "Temporale";
  if ([71, 73, 75, 77, 85, 86].includes(openMeteo?.weatherCode)) return "Neve";

  const rains = [openMeteo?.rain, openWeather?.rain, tomorrow?.rain]
    .filter((v): v is number => Number.isFinite(v));
  if (rains.some(v => v > 0.1)) return "Pioggia";

  const clouds = [openMeteo?.cloud, openWeather?.cloud, tomorrow?.cloud]
    .filter((v): v is number => Number.isFinite(v));
  if (!clouds.length) return "N/D";

  const cloudMax = Math.max(...clouds);
  if (cloudMax > 80) return "Coperto";
  if (cloudMax > 40) return "Variabile";
  return "Sereno";
}

function baseNubiAggressiva(cloud: number | null): string {
  if (cloud === null) return "N/D";
  if (cloud > 80) return "Molto bassa";
  if (cloud > 60) return "Bassa";
  if (cloud > 40) return "Media";
  return "Alta";
}

function termicheAggressive(
  tMax: number | null,
  tMin: number | null,
  cloudDaily: number | null,
  rainDaily: number | null
): string {
  if (tMax === null || tMin === null) return "N/D";
  if (rainDaily !== null && rainDaily > 1) return "Disturbate";
  if (cloudDaily !== null && cloudDaily > 80) return "Deboli";
  const deltaT = tMax - tMin;
  if (deltaT < 6) return "Scarse";
  if (deltaT < 10) return "Moderate";
  if (deltaT < 15) return "Buone";
  return "Forti";
}

function indiceAffidabilitaStima(
  wind: number | null,
  rain: number | null,
  cloud: number | null,
  baseNubi: string,
  termiche: string
): number | null {
  if (wind === null && rain === null && cloud === null) return null;

  let score = 10;
  if (rain !== null) {
    if (rain > 2) score -= 5;
    else if (rain > 0.1) score -= 3;
  }
  if (wind !== null) {
    if (wind > 30) score -= 5;
    else if (wind > 25) score -= 4;
    else if (wind > 15) score -= 2;
  }
  if (cloud !== null && cloud > 70) score -= 2;
  if (baseNubi === "Molto bassa") score -= 2;
  if (termiche === "Disturbate" || termiche === "Scarse") score -= 2;

  return Math.max(0, Math.min(10, score));
}

function labelIndice(i: number | null): string {
  if (i === null) return "N/D";
  if (i <= 3) return "Ottimo";
  if (i <= 5) return "Buono";
  if (i <= 7) return "Impegnativo";
  if (i <= 8) return "Rischioso";
  return "Sconsigliato";
}

function safe(v: number | null): string {
  return v === null || !Number.isFinite(v) ? "--" : v.toFixed(1);
}

export async function getMeteoDecolloAggressivo(d: Decollo): Promise<MeteoDecollo> {
  console.log(`[3S] Fetching weather for ${d.name} (${d.lat}, ${d.lon})`);

  const [openMeteo, openWeather, tomorrow] = await Promise.all([
    getOpenMeteo(d.lat, d.lon).catch((e) => { console.warn(`[3S] OpenMeteo failed for ${d.name}:`, e instanceof Error ? e.message : e); return null; }),
    getOpenWeather(d.lat, d.lon).catch((e) => { console.warn(`[3S] OpenWeather failed for ${d.name}:`, e instanceof Error ? e.message : e); return null; }),
    getTomorrow(d.lat, d.lon).catch((e) => { console.warn(`[3S] Tomorrow failed for ${d.name}:`, e instanceof Error ? e.message : e); return null; })
  ]);

  const sourcesAvailable = [openMeteo, openWeather, tomorrow].filter(s => s !== null).length;
  console.log(`[3S] ${d.name}: sources=${sourcesAvailable} (OM=${!!openMeteo}, OW=${!!openWeather}, TW=${!!tomorrow})`);

  if (!openMeteo && !openWeather && !tomorrow) {
    throw new Error("Nessuna fonte meteo disponibile");
  }

  const tempNum = fuse([
    { value: openMeteo?.temp ?? null, weight: WEIGHTS.temp.om },
    { value: openWeather?.temp ?? null, weight: WEIGHTS.temp.ow },
    { value: tomorrow?.temp ?? null, weight: WEIGHTS.temp.tw },
  ]);
  const rainNum = fuse([
    { value: openMeteo?.rain ?? null, weight: WEIGHTS.rain.om },
    { value: openWeather?.rain ?? null, weight: WEIGHTS.rain.ow },
    { value: tomorrow?.rain ?? null, weight: WEIGHTS.rain.tw },
  ]);
  const cloudNum = fuse([
    { value: openMeteo?.cloud ?? null, weight: WEIGHTS.cloud.om },
    { value: openWeather?.cloud ?? null, weight: WEIGHTS.cloud.ow },
    { value: tomorrow?.cloud ?? null, weight: WEIGHTS.cloud.tw },
  ]);
  const windNum = fuse([
    { value: openMeteo?.wind ?? null, weight: WEIGHTS.wind.om },
    { value: openWeather?.wind ?? null, weight: WEIGHTS.wind.ow },
    { value: tomorrow?.wind ?? null, weight: WEIGHTS.wind.tw },
  ]);

  const directions = [
    openMeteo?.dir,
    openWeather?.dir,
    tomorrow?.dir,
  ].filter((v): v is number => Number.isFinite(v));
  const dirNum = circularMeanWindDirection(directions);

  const stato = statoAggressivo(openMeteo, openWeather, tomorrow);
  const baseNubi = baseNubiAggressiva(cloudNum);
  const termiche = termicheAggressive(
    openMeteo?.tMax ?? null,
    openMeteo?.tMin ?? null,
    openMeteo?.cloudDaily ?? null,
    openMeteo?.rainDaily ?? null
  );
  const indice = indiceAffidabilitaStima(windNum, rainNum, cloudNum, baseNubi, termiche);

  return {
    temp: safe(tempNum),
    rain: safe(rainNum),
    cloud: safe(cloudNum),
    wind: safe(windNum),
    dir: safe(dirNum),
    stato,
    baseNubi,
    termiche,
    indice: indice ?? 0,
    indiceLabel: labelIndice(indice),
    freezingLevel: openMeteo?.freezingLevel ?? null,
    weatherCode: openMeteo?.weatherCode ?? null,
    fonte: "Open-Meteo + OpenWeather + Tomorrow.io",
    hourly: openMeteo?.hourly,
  };
}

export async function getAllMeteoDecolliAggressivo(): Promise<Map<string, MeteoDecollo>> {
  const results = new Map<string, MeteoDecollo>();

  // Concorrenza limitata: evita timeout del browser senza bombardare le API.
  const queue = [...DECOLLI];
  const worker = async () => {
    while (queue.length) {
      const d = queue.shift();
      if (!d) return;

      try {
        results.set(d.name, await getMeteoDecolloAggressivo({
          name: d.name,
          lat: d.lat,
          lon: d.lon,
          elevation: d.elevation_m,
        }));
      } catch {
        results.set(d.name, {
          temp: "--",
          rain: "--",
          cloud: "--",
          wind: "--",
          dir: "--",
          stato: "N/D",
          baseNubi: "N/D",
          termiche: "N/D",
          indice: 0,
          indiceLabel: "N/D",
          freezingLevel: null,
          weatherCode: null,
          fonte: "Nessuna fonte disponibile",
          hourly: undefined,
        });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, DECOLLI.length) }, worker));
  return results;
}

/**
 * BATCH METEO-PARAPENTE — una sola richiesta a /api/decolli-batch (che a sua volta
 * fa UNA chiamata Open-Meteo multi-location): tutti i decolli in ~1-2 s, senza
 * rate-limit né 24 connessioni dal browser. Fallback: getAllMeteoDecolliAggressivo.
 */
interface BatchSiteRaw {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  hourly: Record<string, unknown> | null;
  daily: Record<string, unknown> | null;
}

export async function getAllMeteoDecolliBatch(): Promise<Map<string, MeteoDecollo>> {
  const res = await fetch("/api/decolli-batch", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error("Batch decolli HTTP " + res.status);
  const json: unknown = await res.json();
  const sites = (json as { sites?: BatchSiteRaw[] }).sites;
  if (!Array.isArray(sites) || !sites.length) throw new Error("Batch decolli vuoto");

  const results = new Map<string, MeteoDecollo>();
  for (const site of sites) {
    const shaped = site.hourly ? shapeOpenMeteo({ hourly: site.hourly, daily: site.daily ?? undefined }) : null;
    if (!shaped) {
      results.set(site.name, {
        temp: "--", rain: "--", cloud: "--", wind: "--", dir: "--",
        stato: "N/D", baseNubi: "N/D", termiche: "N/D",
        indice: 0, indiceLabel: "N/D",
        freezingLevel: null, weatherCode: null,
        fonte: "Nessun dato dal modello", hourly: undefined,
      });
      continue;
    }
    const stato = statoAggressivo(shaped, null, null);
    const baseNubi = baseNubiAggressiva(shaped.cloud);
    const termiche = termicheAggressive(shaped.tMax, shaped.tMin, shaped.cloudDaily, shaped.rainDaily);
    const indice = indiceAffidabilitaStima(shaped.wind, shaped.rain, shaped.cloud, baseNubi, termiche);
    results.set(site.name, {
      temp: safe(shaped.temp),
      rain: safe(shaped.rain),
      cloud: safe(shaped.cloud),
      wind: safe(shaped.wind),
      dir: safe(shaped.dir),
      stato,
      baseNubi,
      termiche,
      indice: indice ?? 0,
      indiceLabel: labelIndice(indice),
      freezingLevel: shaped.freezingLevel,
      weatherCode: shaped.weatherCode,
      fonte: "Open-Meteo · modello grigliato batch",
      hourly: shaped.hourly,
    });
  }
  return results;
}
