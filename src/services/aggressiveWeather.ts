"use client";

import type { MeteoCurrent, MeteoHourly, MeteoDaily } from "./openMeteoService";
import { fetchWithProxyFallback } from "@/utils/proxyFallback";

const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5/weather";
const OPENWEATHER_API_KEY = "f01a9f572541fc5951d78441cbe750c6";

export interface DecolloConfig {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
}

export const DECOLLI_AGGRESSIVI: DecolloConfig[] = [
  { name: "Malanotte", lat: 44.33, lon: 7.75, elevation: 1800 },
  { name: "Colle di Tenda", lat: 44.20, lon: 7.58, elevation: 1870 },
  { name: "Boves", lat: 44.33, lon: 7.50, elevation: 600 },
  { name: "Monte Male – Dronero", lat: 44.45, lon: 7.35, elevation: 1500 },
  { name: "Iretta", lat: 44.47, lon: 7.28, elevation: 1300 },
  { name: "Pratoni di Val Mala", lat: 44.48, lon: 7.25, elevation: 1400 },
  { name: "Monte Birrone", lat: 44.52, lon: 7.18, elevation: 2130 },
  { name: "Colle dell'Agnello", lat: 44.63, lon: 6.98, elevation: 2744 },
  { name: "Pian Munè – Seggiovia", lat: 44.70, lon: 7.25, elevation: 1870 },
  { name: "Pian Munè – Bric Lombatera", lat: 44.71, lon: 7.26, elevation: 2100 },
  { name: "Martiniana Po", lat: 44.65, lon: 7.30, elevation: 900 },
  { name: "Rucas Alto", lat: 44.75, lon: 7.30, elevation: 1500 },
  { name: "Montoso – decollo basso", lat: 44.65, lon: 7.35, elevation: 1100 },
  { name: "Monte Vandalino", lat: 44.85, lon: 7.15, elevation: 2120 },
  { name: "Pian dell'Alpe", lat: 45.00, lon: 7.05, elevation: 1900 },
  { name: "Roletto – Piggi", lat: 44.90, lon: 7.35, elevation: 900 },
  { name: "Piossasco – Monte S. Giorgio", lat: 45.00, lon: 7.35, elevation: 837 },
  { name: "Truccetti", lat: 45.30, lon: 7.60, elevation: 900 },
  { name: "Val della Torre", lat: 45.15, lon: 7.45, elevation: 1000 },
  { name: "Rocca Canavese – M. della Neve", lat: 45.33, lon: 7.60, elevation: 1300 },
  { name: "Santa Elisabetta", lat: 45.35, lon: 7.65, elevation: 900 },
  { name: "Santa Elisabetta alto", lat: 45.36, lon: 7.66, elevation: 1100 },
  { name: "Monte Cavallaria", lat: 45.37, lon: 7.67, elevation: 1600 },
  { name: "Andrate", lat: 45.48, lon: 7.80, elevation: 1000 }
];

interface OpenMeteoData {
  temp: number;
  rain: number;
  cloud: number;
  wind: number;
  dir: number;
  tMax: number;
  tMin: number;
  cloudDaily: number;
  rainDaily: number;
}

interface OpenWeatherData {
  temp: number;
  rain: number;
  cloud: number;
  wind: number;
  dir: number;
  stato: string;
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

async function fetchOpenMeteo(lat: number, lon: number): Promise<OpenMeteoData | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: "temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,cloud_cover_mean",
      timezone: "auto",
    });
    const res = await fetchWithProxyFallback(params.toString());
    if (!res.ok) return null;
    const data = await res.json();
    
    return {
      temp: data.hourly?.temperature_2m?.[0] ?? 0,
      rain: data.hourly?.precipitation?.[0] ?? 0,
      cloud: data.hourly?.cloudcover?.[0] ?? 0,
      wind: data.hourly?.windspeed_10m?.[0] ?? 0,
      dir: data.hourly?.winddirection_10m?.[0] ?? 0,
      tMax: data.daily?.temperature_2m_max?.[0] ?? 0,
      tMin: data.daily?.temperature_2m_min?.[0] ?? 0,
      cloudDaily: data.daily?.cloudcover_mean?.[0] ?? 0,
      rainDaily: data.daily?.precipitation_sum?.[0] ?? 0
    };
  } catch {
    return null;
  }
}

async function fetchOpenWeather(lat: number, lon: number): Promise<OpenWeatherData | null> {
  try {
    const url = `${OPENWEATHER_BASE}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    
    return {
      temp: data.main?.temp ?? 0,
      rain: data.rain?.["1h"] ?? 0,
      cloud: data.clouds?.all ?? 0,
      wind: data.wind?.speed ?? 0,
      dir: data.wind?.deg ?? 0,
      stato: data.weather?.[0]?.main ?? "Clear"
    };
  } catch {
    return null;
  }
}

function media(a: number, b: number): number {
  const na = parseFloat(String(a));
  const nb = parseFloat(String(b));
  if (!isNaN(na) && !isNaN(nb)) return (na + nb) / 2;
  if (!isNaN(na)) return na;
  if (!isNaN(nb)) return nb;
  return NaN;
}

function safe(v: number): string {
  const n = parseFloat(String(v));
  return isNaN(n) ? "--" : n.toFixed(1);
}

function statoAggressivo(om: OpenMeteoData, ow: OpenWeatherData): string {
  if (ow.stato === "Thunderstorm") return "Temporale";
  if (ow.stato === "Rain" || ow.rain > 0.1) return "Pioggia";
  if (ow.cloud > 70) return "Coperto";
  if (ow.cloud > 40) return "Variabile";
  if (om.rain > 0.1) return "Pioggia";
  if (om.cloud > 70) return "Coperto";
  if (om.cloud > 40) return "Variabile";
  return "Sereno";
}

function baseNubiAggressiva(cloud: number, elevation: number): string {
  if (cloud > 80) return "Molto bassa (<1200 m)";
  if (cloud > 60) return "Bassa (1200–1800 m)";
  if (cloud > 40) return "Media (1800–2500 m)";
  return "Alta (>2500 m)";
}

function termicheAggressive(tMax: number, tMin: number, cloudDaily: number, rainDaily: number): string {
  const deltaT = tMax - tMin;
  
  if (rainDaily > 1) return "Termiche disturbate (pioggia)";
  if (cloudDaily > 80) return "Termiche deboli (coperto)";
  if (deltaT < 6) return "Termiche scarse";
  if (deltaT < 10) return "Termiche moderate";
  if (deltaT < 15) return "Termiche buone";
  return "Termiche forti / rischio overdevelopment";
}

function indiceAggressivo(wind: number, rain: number, cloud: number, baseNubi: string, termiche: string): number {
  let i = 1;
  
  if (rain > 0.1) i += 5;
  if (rain > 2) i += 3;
  if (wind > 15) i += 2;
  if (wind > 25) i += 3;
  if (wind > 30) i += 3;
  if (cloud > 70) i += 2;
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

  if (!openMeteo && !openWeather) {
    throw new Error("Nessuna fonte meteo disponibile");
  }

  // Se una fonte fallisce, usa l'altra
  const om = openMeteo || { temp: 0, rain: 0, cloud: 0, wind: 0, dir: 0, tMax: 0, tMin: 0, cloudDaily: 0, rainDaily: 0 };
  const ow = openWeather || { temp: 0, rain: 0, cloud: 0, wind: 0, dir: 0, stato: "Clear" };

  const stato = statoAggressivo(om, ow);
  const temp = safe(media(om.temp, ow.temp));
  const rain = safe(Math.max(om.rain, ow.rain));
  const cloud = safe(media(om.cloud, ow.cloud));
  const wind = safe(media(om.wind, ow.wind));

  const baseNubi = baseNubiAggressiva(om.cloud, decollo.elevation);
  const termiche = termicheAggressive(om.tMax, om.tMin, om.cloudDaily, om.rainDaily);
  const indice = indiceAggressivo(
    parseFloat(wind), 
    parseFloat(rain), 
    parseFloat(cloud), 
    baseNubi, 
    termiche
  );
  const indiceLabel = labelIndice(indice);

  return {
    temp,
    rain,
    cloud,
    wind,
    stato,
    baseNubi,
    termiche,
    indice,
    indiceLabel,
    fonte: "Ibrido Aggressivo (Open-Meteo + OpenWeather)"
  };
}

export async function getAllAggressiveWeather(): Promise<Map<string, AggressiveWeatherResult>> {
  const results = new Map<string, AggressiveWeatherResult>();
  
  await Promise.all(
    DECOLLI_AGGRESSIVI.map(async (decollo) => {
      try {
        const weather = await getAggressiveWeatherForDecollo(decollo);
        results.set(decollo.name, weather);
      } catch (err) {
        console.error(`Errore per ${decollo.name}:`, err);
        results.set(decollo.name, {
          temp: "--", rain: "--", cloud: "--", wind: "--",
          stato: "Errore", baseNubi: "--", termiche: "--",
          indice: 10, indiceLabel: "Sconsigliato", fonte: "Errore"
        });
      }
    })
  );
  
  return results;
}