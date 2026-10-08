"use client";

import { DECOLLI } from "@/data/decolli";
import { fetchHourly, fetchDaily } from "@/lib/openMeteoClient";

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

async function getOpenMeteo(lat: number, lon: number) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [hourlyData, dailyData] = await Promise.all([
      fetchHourly(
        lat,
        lon,
        "temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,cape,freezing_level_height",
        today,
        today
      ),
      fetchDaily(
        lat,
        lon,
        "temperature_2m_max,temperature_2m_min,cloud_cover_mean,precipitation_sum",
        1
      ),
    ]);

    const times = hourlyData.hourly?.time ?? [];
    if (!Array.isArray(times) || times.length === 0) return null;

    const i = findCurrentIndex(times);
    if (i < 0) return null;

    const h = hourlyData.hourly;
    const d = dailyData.daily;

    return {
      temp: numOrNull(h.temperature_2m?.[i]),
      rain: numOrNull(h.precipitation?.[i]),
      cloud: numOrNull(h.cloud_cover?.[i]),
      wind: numOrNull(h.wind_speed_10m?.[i]),
      dir: numOrNull(h.wind_direction_10m?.[i]),
      cape: numOrNull(h.cape?.[i]),
      freezingLevel: numOrNull(h.freezing_level_height?.[i]),
      tMax: numOrNull(d?.temperature_2m_max?.[0]),
      tMin: numOrNull(d?.temperature_2m_min?.[0]),
      cloudDaily: numOrNull(d?.cloud_cover_mean?.[0]),
      rainDaily: numOrNull(d?.precipitation_sum?.[0]),
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

function statoAggressivo(openMeteo: any, openWeather: any, tomorrow: any): string {
  if (openWeather?.stato === "Thunderstorm") return "Temporale";

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
  const [openMeteo, openWeather, tomorrow] = await Promise.all([
    getOpenMeteo(d.lat, d.lon),
    getOpenWeather(d.lat, d.lon),
    getTomorrow(d.lat, d.lon),
  ]);

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
    fonte: "Open-Meteo + OpenWeather + Tomorrow.io",
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
          fonte: "Nessuna fonte disponibile",
        });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, DECOLLI.length) }, worker));
  return results;
}
