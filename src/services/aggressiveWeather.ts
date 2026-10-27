"use client";

import { fetchHourly, fetchDaily } from "@/lib/openMeteoClient";

export interface DecolloConfig {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
}

export const DECOLLI_AGGRESSIVI: DecolloConfig[] = [
  { name: "Malanotte", lat: 44.2587, lon: 7.7943, elevation: 1740 },
  { name: "Colle di Tenda", lat: 44.1509, lon: 7.5693, elevation: 1990 },
  { name: "Boves", lat: 44.3211, lon: 7.5447, elevation: 900 },
  { name: "Monte Male – Dronero", lat: 44.4316, lon: 7.3629, elevation: 950 },
  { name: "Iretta", lat: 44.4989, lon: 7.3820, elevation: 1050 },
  { name: "Pratoni di Val Mala", lat: 44.5078, lon: 7.3466, elevation: 1400 },
  { name: "Monte Birrone", lat: 44.5399, lon: 7.2529, elevation: 2131 },
  { name: "Colle dell'Agnello", lat: 44.6828, lon: 6.9782, elevation: 2748 },
  { name: "Pian Munè – Seggiovia", lat: 44.6386, lon: 7.2309, elevation: 1870 },
  { name: "Pian Munè – Bric Lombatera", lat: 44.6574, lon: 7.2600, elevation: 1350 },
  { name: "Martiniana Po", lat: 44.6070, lon: 7.3832, elevation: 1400 },
  { name: "Rucas Alto", lat: 44.7421, lon: 7.2201, elevation: 1500 },
  { name: "Montoso – decollo basso", lat: 44.7644, lon: 7.2498, elevation: 1250 },
  { name: "Monte Vandalino", lat: 44.8367, lon: 7.1739, elevation: 2120 },
  { name: "Pian dell'Alpe", lat: 45.0640, lon: 7.0283, elevation: 1990 },
  { name: "Roletto – Piggi", lat: 44.9325, lon: 7.3110, elevation: 820 },
  { name: "Piossasco – Monte S. Giorgio", lat: 44.9967, lon: 7.4480, elevation: 673 },
  { name: "Truccetti", lat: 45.0797, lon: 7.3420, elevation: 900 },
  { name: "Val della Torre", lat: 45.1626, lon: 7.4637, elevation: 970 },
  { name: "Rocca Canavese – M. della Neve", lat: 45.3276, lon: 7.5728, elevation: 1100 },
  { name: "Santa Elisabetta", lat: 45.4183, lon: 7.6419, elevation: 1000 },
  { name: "Santa Elisabetta alto", lat: 45.4402, lon: 7.6480, elevation: 1400 },
  { name: "Monte Cavallaria", lat: 45.5173, lon: 7.7988, elevation: 1430 },
  { name: "Andrate", lat: 45.5506, lon: 7.8808, elevation: 1000 }
];

interface OpenMeteoData {
  temp: number | null;
  rain: number | null;
  cloud: number | null;
  wind: number | null;
  dir: number | null;
  tMax: number | null;
  tMin: number | null;
  cloudDaily: number | null;
  rainDaily: number | null;
}

interface OpenWeatherData {
  temp: number | null;
  rain: number | null;
  cloud: number | null;
  wind: number | null;
  dir: number | null;
  stato: string | null;
}

interface AggressiveWeatherResult {
  temp: string;
  rain: string;
  cloud: string;
  wind: string;
  stato: string;
  baseNubi: string;
  termiche: string;
  indice: number;
  indiceLabel: string;
  fonte: string;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<OpenMeteoData | null> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [hourlyData, dailyData] = await Promise.all([
      fetchHourly(lat, lon, "temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m", today, today),
      fetchDaily(lat, lon, "temperature_2m_max,temperature_2m_min,cloud_cover_mean,precipitation_sum", 1),
    ]);
    const h = hourlyData.hourly;
    const d = dailyData.daily;
    if (!h?.time?.length) return null;
    return {
      temp: numOrNull(h.temperature_2m?.[0]),
      rain: numOrNull(h.precipitation?.[0]),
      cloud: numOrNull(h.cloud_cover?.[0]),
      wind: numOrNull(h.wind_speed_10m?.[0]),
      dir: numOrNull(h.wind_direction_10m?.[0]),
      tMax: numOrNull(d?.temperature_2m_max?.[0]),
      tMin: numOrNull(d?.temperature_2m_min?.[0]),
      cloudDaily: numOrNull(d?.cloud_cover_mean?.[0]),
      rainDaily: numOrNull(d?.precipitation_sum?.[0]),
    };
  } catch {
    return null;
  }
}

async function fetchOpenWeather(lat: number, lon: number): Promise<OpenWeatherData | null> {
  const apiKey = import.meta.env.VITE_OPENWEATHER_KEY || "";
  if (!apiKey) return null;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
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

function weightedMean(values: Array<{ value: number | null; weight: number }>): number | null {
  const valid = values.filter(v => v.value !== null && Number.isFinite(v.value));
  if (!valid.length) return null;
  const weight = valid.reduce((s, v) => s + v.weight, 0);
  return weight > 0 ? valid.reduce((s, v) => s + (v.value as number) * v.weight, 0) / weight : null;
}

function safe(v: number | null): string {
  return v === null || !Number.isFinite(v) ? "--" : v.toFixed(1);
}

function statoAggressivo(om: OpenMeteoData | null, ow: OpenWeatherData | null): string {
  if (ow?.stato === "Thunderstorm") return "Temporale";
  const rains = [om?.rain, ow?.rain].filter((v): v is number => v !== null && Number.isFinite(v));
  if (rains.some(v => v > 0.1)) return "Pioggia";
  const clouds = [om?.cloud, ow?.cloud].filter((v): v is number => v !== null && Number.isFinite(v));
  if (!clouds.length) return "N/D";
  const cloud = Math.max(...clouds);
  if (cloud > 70) return "Coperto";
  if (cloud > 40) return "Variabile";
  return "Sereno";
}

function baseNubiAggressiva(cloud: number | null): string {
  if (cloud === null) return "N/D";
  if (cloud > 80) return "Molto bassa (<1200 m)";
  if (cloud > 60) return "Bassa (1200–1800 m)";
  if (cloud > 40) return "Media (1800–2500 m)";
  return "Alta (>2500 m)";
}

function termicheAggressive(tMax: number | null, tMin: number | null, cloudDaily: number | null, rainDaily: number | null): string {
  if (tMax === null || tMin === null) return "Termiche non disponibili";
  const deltaT = tMax - tMin;
  if (rainDaily !== null && rainDaily > 1) return "Termiche disturbate (pioggia)";
  if (cloudDaily !== null && cloudDaily > 80) return "Termiche deboli (coperto)";
  if (deltaT < 6) return "Termiche scarse";
  if (deltaT < 10) return "Termiche moderate";
  if (deltaT < 15) return "Termiche buone";
  return "Termiche forti";
}

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

export async function getAggressiveWeatherForDecollo(decollo: DecolloConfig): Promise<AggressiveWeatherResult> {
  const [openMeteo, openWeather] = await Promise.all([
    fetchOpenMeteo(decollo.lat, decollo.lon),
    fetchOpenWeather(decollo.lat, decollo.lon)
  ]);

  if (!openMeteo && !openWeather) throw new Error("Nessuna fonte meteo disponibile");

  const temp = weightedMean([
    { value: openMeteo?.temp ?? null, weight: 0.5 },
    { value: openWeather?.temp ?? null, weight: 0.5 },
  ]);
  const rainValues = [openMeteo?.rain ?? null, openWeather?.rain ?? null].filter((v): v is number => v !== null);
  const rain = rainValues.length ? Math.max(...rainValues) : null;
  const cloud = weightedMean([
    { value: openMeteo?.cloud ?? null, weight: 0.5 },
    { value: openWeather?.cloud ?? null, weight: 0.5 },
  ]);
  const wind = weightedMean([
    { value: openMeteo?.wind ?? null, weight: 0.5 },
    { value: openWeather?.wind ?? null, weight: 0.5 },
  ]);

  const baseNubi = baseNubiAggressiva(cloud);
  const termiche = termicheAggressive(
    openMeteo?.tMax ?? null,
    openMeteo?.tMin ?? null,
    openMeteo?.cloudDaily ?? null,
    openMeteo?.rainDaily ?? null
  );
  const indice = indiceAffidabilitaStima(wind, rain, cloud, baseNubi, termiche);

  return {
    temp: safe(temp),
    rain: safe(rain),
    cloud: safe(cloud),
    wind: safe(wind),
    stato: statoAggressivo(openMeteo, openWeather),
    baseNubi,
    termiche,
    indice,
    indiceLabel: labelIndice(indice),
    fonte: `Ibrido Aggressivo (${openMeteo ? "Open-Meteo" : ""}${openMeteo && openWeather ? " + " : ""}${openWeather ? "OpenWeather" : ""})`,
  };
}

export async function getAllAggressiveWeather(): Promise<Map<string, AggressiveWeatherResult>> {
  const results = new Map<string, AggressiveWeatherResult>();
  await Promise.all(DECOLLI_AGGRESSIVI.map(async (decollo) => {
    try {
      results.set(decollo.name, await getAggressiveWeatherForDecollo(decollo));
    } catch (err) {
      console.error(`Errore per ${decollo.name}:`, err);
      results.set(decollo.name, {
        temp: "--", rain: "--", cloud: "--", wind: "--",
        stato: "Errore", baseNubi: "--", termiche: "--",
        indice: 10, indiceLabel: "Sconsigliato", fonte: "Errore"
      });
    }
  }));
  return results;
}
