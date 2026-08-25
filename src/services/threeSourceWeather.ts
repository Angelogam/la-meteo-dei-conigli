"use client";

// ============================================================================
// METEO DEI CONIGLI – MOTORE 3-FONTI (Open-Meteo + OpenWeather + Tomorrow.io)
// SOLO LOGICA DATI – NESSUNA UI, NESSUN DOM
// ============================================================================

import { DECOLLI } from "@/data/decolli";

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
  stato: string;
  baseNubi: string;
  termiche: string;
  indice: number;
  indiceLabel: string;
  fonte: string;
};

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5/weather";
// API Keys - in produzione usare variabili d'ambiente
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_KEY || "f01a9f572541fc5951d78441cbe750c6";

const TOMORROW_BASE = "https://api.tomorrow.io/v4/timelines";
const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_KEY || "EBox6MVYAysc2A5X5EOhVgKeaDuFg4Pk";

// ============================================================================
// FETCH 3 FONTI
// ============================================================================

async function getOpenMeteo(lat: number, lon: number) {
  const url =
    `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,precipitation,cloudcover,windspeed_10m,winddirection_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,cloudcover_mean` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo error");
  const data = await res.json();

  return {
    temp: data.hourly?.temperature_2m?.[0] ?? NaN,
    rain: data.hourly?.precipitation?.[0] ?? NaN,
    cloud: data.hourly?.cloudcover?.[0] ?? NaN,
    wind: data.hourly?.windspeed_10m?.[0] ?? NaN,
    dir: data.hourly?.winddirection_10m?.[0] ?? NaN,
    tMax: data.daily?.temperature_2m_max?.[0] ?? NaN,
    tMin: data.daily?.temperature_2m_min?.[0] ?? NaN,
    cloudDaily: data.daily?.cloudcover_mean?.[0] ?? NaN,
    rainDaily: data.daily?.precipitation_sum?.[0] ?? NaN
  };
}

async function getOpenWeather(lat: number, lon: number) {
  const url =
    `${OPENWEATHER_BASE}?lat=${lat}&lon=${lon}` +
    `&appid=${OPENWEATHER_API_KEY}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("OpenWeather error");
  const data = await res.json();

  return {
    temp: data.main?.temp ?? NaN,
    rain: data.rain ? data.rain["1h"] || 0 : 0,
    cloud: data.clouds?.all ?? NaN,
    wind: data.wind?.speed ?? NaN,
    dir: data.wind?.deg ?? NaN,
    stato: data.weather?.[0]?.main ?? "N/D"
  };
}

async function getTomorrow(lat: number, lon: number) {
  const url =
    `${TOMORROW_BASE}?location=${lat},${lon}` +
    `&fields=temperature,cloudCover,precipitationIntensity,windSpeed,windDirection` +
    `&timesteps=1h&apikey=${TOMORROW_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Tomorrow.io error");
  const data = await res.json();

  const v = data.data?.timelines?.[0]?.intervals?.[0]?.values;

  return {
    temp: v?.temperature ?? NaN,
    rain: v?.precipitationIntensity ?? NaN,
    cloud: v?.cloudCover ?? NaN,
    wind: v?.windSpeed ?? NaN,
    dir: v?.windDirection ?? NaN
  };
}

// ============================================================================
// FUSIONE 3 FONTI (PESI + COERENZA)
// ============================================================================

type FonteValore = { value: number; weight: number };

function fuse(values: FonteValore[]): number {
  const valid = values.filter(v => !isNaN(v.value));
  if (valid.length === 0) return NaN;
  const sumW = valid.reduce((a, b) => a + b.weight, 0);
  if (sumW === 0) return NaN;
  return valid.reduce((a, b) => a + b.value * b.weight, 0) / sumW;
}

// Pesi: Tomorrow più forte su attuale, OpenWeather medio, Open-Meteo più debole
const WEIGHTS = {
  temp: { om: 0.3, ow: 0.3, tw: 0.4 },
  wind: { om: 0.3, ow: 0.4, tw: 0.3 },
  cloud: { om: 0.3, ow: 0.3, tw: 0.4 },
  rain: { om: 0.3, ow: 0.4, tw: 0.3 }
};

// ============================================================================
// STATI METEO AGGRESSIVI (3 FONTI)
// ============================================================================

function statoAggressivo(openMeteo: any, openWeather: any, tomorrow: any): string {
  if (openWeather.stato === "Thunderstorm") return "Temporale";
  if (openWeather.stato === "Rain" || openWeather.rain > 0.1 || tomorrow.rain > 0.1 || openMeteo.rain > 0.1) {
    return "Pioggia";
  }

  const cloudMax = Math.max(
    Number(openMeteo.cloud || 0),
    Number(openWeather.cloud || 0),
    Number(tomorrow.cloud || 0)
  );

  if (cloudMax > 80) return "Coperto";
  if (cloudMax > 40) return "Variabile";
  return "Sereno";
}

// ============================================================================
// BASE NUBI / TERMICHE / INDICE
// ============================================================================

function baseNubiAggressiva(cloud: number): string {
  if (cloud > 80) return "Molto bassa (<1200 m)";
  if (cloud > 60) return "Bassa (1200–1800 m)";
  if (cloud > 40) return "Media (1800–2500 m)";
  return "Alta (>2500 m)";
}

function termicheAggressive(
  tMax: number,
  tMin: number,
  cloudDaily: number,
  rainDaily: number
): string {
  const deltaT = tMax - tMin;
  if (rainDaily > 1) return "Termiche disturbate (pioggia)";
  if (cloudDaily > 80) return "Termiche deboli (coperto)";
  if (deltaT < 6) return "Termiche scarse";
  if (deltaT < 10) return "Termiche moderate";
  if (deltaT < 15) return "Termiche buone";
  return "Termiche forti / rischio overdevelopment";
}

function indiceAggressivo(
  wind: number,
  rain: number,
  cloud: number,
  baseNubi: string,
  termiche: string
): number {
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

function safe(v: number): number | string {
  const n = parseFloat(String(v));
  return isNaN(n) ? "--" : n.toFixed(1);
}

// ============================================================================
// MOTORE PRINCIPALE – getMeteoDecolloAggressivo
// ============================================================================

export async function getMeteoDecolloAggressivo(d: Decollo): Promise<MeteoDecollo> {
  const [openMeteo, openWeather, tomorrow] = await Promise.all([
    getOpenMeteo(d.lat, d.lon),
    getOpenWeather(d.lat, d.lon),
    getTomorrow(d.lat, d.lon)
  ]);

  const tempNum = fuse([
    { value: openMeteo.temp, weight: WEIGHTS.temp.om },
    { value: openWeather.temp, weight: WEIGHTS.temp.ow },
    { value: tomorrow.temp, weight: WEIGHTS.temp.tw }
  ]);

  const rainNum = fuse([
    { value: openMeteo.rain, weight: WEIGHTS.rain.om },
    { value: openWeather.rain, weight: WEIGHTS.rain.ow },
    { value: tomorrow.rain, weight: WEIGHTS.rain.tw }
  ]);

  const cloudNum = fuse([
    { value: openMeteo.cloud, weight: WEIGHTS.cloud.om },
    { value: openWeather.cloud, weight: WEIGHTS.cloud.ow },
    { value: tomorrow.cloud, weight: WEIGHTS.cloud.tw }
  ]);

  const windNum = fuse([
    { value: openMeteo.wind, weight: WEIGHTS.wind.om },
    { value: openWeather.wind, weight: WEIGHTS.wind.ow },
    { value: tomorrow.wind, weight: WEIGHTS.wind.tw }
  ]);

  const stato = statoAggressivo(openMeteo, openWeather, tomorrow);
  const baseNubi = baseNubiAggressiva(Number(cloudNum || 0));
  const termiche = termicheAggressive(
    openMeteo.tMax,
    openMeteo.tMin,
    openMeteo.cloudDaily,
    openMeteo.rainDaily
  );

  const indice = indiceAggressivo(
    Number(windNum || 0),
    Number(rainNum || 0),
    Number(cloudNum || 0),
    baseNubi,
    termiche
  );

  const indiceLabel = labelIndice(indice);

  return {
    temp: safe(tempNum),
    rain: safe(rainNum),
    cloud: safe(cloudNum),
    wind: safe(windNum),
    stato,
    baseNubi,
    termiche,
    indice,
    indiceLabel,
    fonte: "Open-Meteo + OpenWeather + Tomorrow.io (fusione aggressiva)"
  };
}

// ============================================================================
// BATCH PER TUTTI I DECOLLI
// ============================================================================

export async function getAllMeteoDecolliAggressivo(): Promise<Map<string, MeteoDecollo>> {
  const results = new Map<string, MeteoDecollo>();
  
  // Usa i decolli dal database locale (24 decolli)
  const decolli = DECOLLI.map(d => ({
    name: d.name,
    lat: d.lat,
    lon: d.lon,
    elevation: d.elevation_m
  }));

  await Promise.all(
    decolli.map(async (decollo) => {
      try {
        const weather = await getMeteoDecolloAggressivo(decollo);
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

// Hook React per usare il motore 3-fonti
import { useState, useEffect, useCallback, useMemo } from "react";

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minuti

export function useThreeSourceWeather() {
  const [weatherData, setWeatherData] = useState<Map<string, MeteoDecollo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mergedDecolli = useMemo(() => {
    return DECOLLI.map(d => {
      const aggressive = weatherData.get(d.name);
      return {
        ...d,
        aggressiveWeather: aggressive
      };
    });
  }, [weatherData]);

  const loadWeather = useCallback(async () => {
    setUpdating(true);
    setError(null);
    try {
      const data = await getAllMeteoDecolliAggressivo();
      setWeatherData(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore caricamento meteo 3-fonti");
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadWeather]);

  const getSelectedDecollo = useCallback((selectedId: string) => {
    return mergedDecolli.find(d => d.id === selectedId);
  }, [mergedDecolli]);

  return {
    weatherData,
    mergedDecolli,
    loading,
    updating,
    lastUpdate,
    error,
    loadWeather,
    getSelectedDecollo
  };
}