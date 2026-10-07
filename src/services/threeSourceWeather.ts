"use client";

import { DECOLLI } from "@/data/decolli";
import { fetchHourly } from "@/lib/openMeteoClient";

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
  indice: number;
  indiceLabel: string;
  fonte: string;
};

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_KEY || "";
const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_KEY || "";

async function getOpenMeteo(lat: number, lon: number) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const data = await fetchHourly(lat, lon, "temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,cape,freezing_level_height", today, today);
    const t = data.hourly?.temperature_2m?.[0];
    if (t === undefined || t === null) return null;
    return {
      temp: data.hourly?.temperature_2m?.[0] !== undefined ? Number(data.hourly.temperature_2m[0]) : null,
      rain: data.hourly?.precipitation?.[0] !== undefined ? Number(data.hourly.precipitation[0]) : null,
      cloud: data.hourly?.cloud_cover?.[0] !== undefined ? Number(data.hourly.cloud_cover[0]) : null,
      wind: data.hourly?.wind_speed_10m?.[0] !== undefined ? Number(data.hourly.wind_speed_10m[0]) : null,
      dir: data.hourly?.wind_direction_10m?.[0] !== undefined ? Number(data.hourly.wind_direction_10m[0]) : null,
      cape: data.hourly?.cape?.[0] !== undefined ? Number(data.hourly.cape[0]) : null,
      freezingLevel: data.hourly?.freezing_level_height?.[0] !== undefined ? Number(data.hourly.freezing_level_height[0]) : null,
      tMax: null,
      tMin: null,
      cloudDaily: null,
      rainDaily: null
    };
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
      temp: data.main?.temp ?? null,
      rain: data.rain?.["1h"] !== undefined ? Number(data.rain["1h"]) : null,
      cloud: data.clouds?.all !== undefined ? Number(data.clouds.all) : null,
      wind: data.wind?.speed !== undefined ? Number(data.wind.speed) : null,
      dir: data.wind?.deg !== undefined ? Number(data.wind.deg) : null,
      stato: typeof data.weather?.[0]?.main === "string" ? data.weather[0].main : null
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
      temp: v.temperature ?? null,
      rain: v.precipitationIntensity !== undefined && v.precipitationIntensity !== null ? Number(v.precipitationIntensity) : null,
      cloud: v.cloudCover !== undefined && v.cloudCover !== null ? Number(v.cloudCover) : null,
      wind: v.windSpeed !== undefined && v.windSpeed !== null ? Number(v.windSpeed) : null,
      dir: v.windDirection !== undefined && v.windDirection !== null ? Number(v.windDirection) : null
    };
  } catch {
    return null;
  }
}

/** Media circolare della direzione del vento: ignora null, gestisce 360°/0° */
function circularMeanWindDirection(values: number[]): number | null {
  const valid = values.filter(v => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  const sumCos = valid.reduce((sum, v) => sum + Math.cos((v * Math.PI) / 180), 0);
  const sumSin = valid.reduce((sum, v) => sum + Math.sin((v * Math.PI) / 180), 0);
  const mean = Math.atan2(sumSin, sumCos) * 180 / Math.PI;
  const normalized = (mean + 540) % 360; // Porta in [0, 360)
  return normalizzaDirezione(normalized);
}

/** Normalizza una direzione: 359° → 359, 1° → 1, evita 0° come fallback */
function normalizzaDirezione(dir: number): number {
  // Se il risultato è 0°, restituiamo 360° (non 0) per evitare l'errore classico di 350+10→180
  return dir === 0 ? 360 : dir;
}

/* funzione fuse mantenuta per compatibilità ma ora usa solo fonti valide */
function fuse(values: { value: number; weight: number }[]): number | null {
  const valid = values.filter(v => Number.isFinite(v.value));
  if (valid.length === 0) return null;
  const sumW = valid.reduce((a, b) => a + b.weight, 0);
  if (sumW === 0) return null;
  return valid.reduce((a, b) => a + b.value * b.weight, 0) / sumW;
}

const WEIGHTS = {
  temp: { om: 0.3, ow: 0.3, tw: 0.4 },
  wind: { om: 0.3, ow: 0.4, tw: 0.3 },
  cloud: { om: 0.3, ow: 0.3, tw: 0.4 },
  rain: { om: 0.3, ow: 0.4, tw: 0.3 }
};

function statoAggressivo(openMeteo: any, openWeather: any, tomorrow: any): string {
  if (openWeather?.stato === "Thunderstorm") return "Temporale";
  const rains = [openMeteo?.rain, openWeather?.rain, tomorrow?.rain].filter((v): v is number => Number.isFinite(v));
  if (rains.some(v => v > 0.1)) return "Pioggia";
  const clouds = [openMeteo?.cloud, openWeather?.cloud, tomorrow?.cloud].filter((v): v is number => Number.isFinite(v));
  if (!clouds.length) return "N/D";
  const cloudMax = Math.max(...clouds);
  if (cloudMax > 80) return "Coperto";
  if (cloudMax > 40) return "Variabile";
  return "Sereno";
}

function baseNubiAggressiva(cloud: number | null): string {
  if (cloud === null) return "N/D";
  if (cloud > 80) return "Molto bassa (<1200 m)";
  if (cloud > 60) return "Bassa (1200-1800 m)";
  if (cloud > 40) return "Media (1800-2500 m)";
  return "Alta (>2500 m)";
}

function termicheAggressive(tMax: number | null, tMin: number | null, cloudDaily: number | null, rainDaily: number | null): string {
  // Se manca tMax o tMin, non possiamo calcolare deltaT → restituire "Termiche non disponibili"
  if (tMax === null || tMin === null) return "Termiche non disponibili";
  const deltaT = tMax - tMin;
  if (rainDaily > 1) return "Termiche disturbate (pioggia)";
  if (cloudDaily > 80) return "Termiche deboli (coperto)";
  if (deltaT < 6) return "Termiche scarse";
  if (deltaT < 10) return "Termiche moderate";
  if (deltaT < 15) return "Termiche buone";
  return "Termiche forti";
}

/** Indice di volabilità: stima euristica, NON misura scientifica.
 *  Rinominato in indiceAffidabilitaStima per chiarezza. */
function indiceAffidabilitaStima(wind: number | null, rain: number | null, cloud: number | null, baseNubi: string, termiche: string): number {
  if (wind === null && rain === null && cloud === null) return 10;
  let i = 1;
  if ((rain ?? 0) > 0.1) i += 5;
  if ((rain ?? 0) > 2) i += 3;
  if ((wind ?? 0) > 15) i += 2;
  if ((wind ?? 0) > 25) i += 3;
  if ((wind ?? 0) > 30) i += 3;
  if ((cloud ?? 0) > 70) i += 2;
  if (baseNubi.includes("Molto bassa")) i += 3;
  if (termiche.includes("forti")) i += 2;
  return Math.min(i, 10);
}

function labelIndice(i: number): string {
  if (i <= 3) return "Ottimo";
  if (i <= 5) return "Buono";
  if (i <= 7) return "Impegnativo";
  if (i <= 8) return "Rischioso";
  return "Sconsigliato";
}

function safe(v: number | null): string {
  if (v === null) return "--";
  const n = parseFloat(String(v));
  return isNaN(n) ? "--" : n.toFixed(1);
}

export async function getMeteoDecolloAggressivo(d: Decollo): Promise<MeteoDecollo> {
  const [openMeteo, openWeather, tomorrow] = await Promise.all([
    getOpenMeteo(d.lat, d.lon).catch(() => null),
    getOpenWeather(d.lat, d.lon).catch(() => null),
    getTomorrow(d.lat, d.lon).catch(() => null)
  ]);

  if (!openMeteo && !openWeather && !tomorrow) {
    throw new Error("Nessuna fonte meteo disponibile");
  }

  // Non usare valori di default 0 quando la fonte fallisce — usa null per segnalare N/D
  const om = openMeteo ?? null;
  const ow = openWeather ?? null;
  const tw = tomorrow ?? null;

  // Fuse: include solo fonti valide (non null)
  const tempNum = fuse([
    om?.temp !== null ? { value: om.temp, weight: WEIGHTS.temp.om } : null,
    ow?.temp !== null ? { value: ow.temp, weight: WEIGHTS.temp.ow } : null,
    tw?.temp !== null ? { value: tw.temp, weight: WEIGHTS.temp.tw } : null,
  ].filter((v): v is { value: number; weight: number } => v != null));
  const rainNum = fuse([
    om?.rain !== null ? { value: om.rain, weight: WEIGHTS.rain.om } : null,
    ow?.rain !== null ? { value: ow.rain, weight: WEIGHTS.rain.ow } : null,
    tw?.rain !== null ? { value: tw.rain, weight: WEIGHTS.rain.tw } : null,
  ].filter((v): v is { value: number; weight: number } => v != null));
  const cloudNum = fuse([
    om?.cloud !== null ? { value: om.cloud, weight: WEIGHTS.cloud.om } : null,
    ow?.cloud !== null ? { value: ow.cloud, weight: WEIGHTS.cloud.ow } : null,
    tw?.cloud !== null ? { value: tw.cloud, weight: WEIGHTS.cloud.tw } : null,
  ].filter((v): v is { value: number; weight: number } => v != null));
  const windNum = fuse([
    om?.wind !== null ? { value: om.wind, weight: WEIGHTS.wind.om } : null,
    ow?.wind !== null ? { value: ow.wind, weight: WEIGHTS.wind.ow } : null,
    tw?.wind !== null ? { value: tw.wind, weight: WEIGHTS.wind.tw } : null,
  ].filter((v): v is { value: number; weight: number } => v != null));

  // Fuse wind direction using circular mean (ignora valori null)
  const dirPairs: { value: number; weight: number }[] = [
    om?.dir !== null && om?.dir !== undefined ? { value: om.dir, weight: WEIGHTS.wind.om } : null,
    ow?.dir !== null && ow?.dir !== undefined ? { value: ow.dir, weight: WEIGHTS.wind.ow } : null,
    tw?.dir !== null && tw?.dir !== undefined ? { value: tw.dir, weight: WEIGHTS.wind.tw } : null,
  ].filter((v): v is { value: number; weight: number } => v != null);
  const dirNum = dirPairs.length > 0
    ? circularMeanWindDirection(dirPairs.map(p => p.value))
    : null; // Se nessuna direzione valida, restituiamo null (N/D)

  const stato = statoAggressivo(om, ow, tw);
  const baseNubi = baseNubiAggressiva(cloudNum);
  const termiche = termicheAggressive(
    om?.tMax ?? null,
    om?.tMin ?? null,
    om?.cloudDaily ?? null,
    om?.rainDaily ?? null
  );
  const indice = indiceAffidabilitaStima(windNum, rainNum, cloudNum, baseNubi, termiche);
  const indiceLabel = labelIndice(indice);

  return {
    temp: safe(tempNum),
    rain: safe(rainNum),
    cloud: safe(cloudNum),
    wind: safe(windNum),
    dir: dirNum !== null ? safe(dirNum) : "--",
    stato,
    baseNubi,
    termiche,
    indice,
    indiceLabel,
    fonte: "Open-Meteo + OpenWeather + Tomorrow.io"
  };
}

export async function getAllMeteoDecolliAggressivo(): Promise<Map<string, MeteoDecollo>> {
  const results = new Map<string, MeteoDecollo>();
  for (const d of DECOLLI) {
    try {
      const weather = await getMeteoDecolloAggressivo({
        name: d.name,
        lat: d.lat,
        lon: d.lon,
        elevation: d.elevation_m
      });
      results.set(d.name, weather);
    } catch {
      results.set(d.name, {
        temp: "--", rain: "--", cloud: "--", wind: "--",
        dir: "--", stato: "Errore", baseNubi: "--", termiche: "--",
        indice: 10, indiceLabel: "Sconsigliato", fonte: "Errore"
      });
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}