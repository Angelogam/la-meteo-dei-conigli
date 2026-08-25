"use client";

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
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_KEY || "f01a9f572541fc5951d78441cbe750c6";

const TOMORROW_BASE = "https://api.tomorrow.io/v4/timelines";
const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_KEY || "EBox6MVYAysc2A5X5EOhVgKeaDuFg4Pk";

async function getOpenMeteo(lat: number, lon: number) {
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const t = data.hourly?.temperature_2m?.[0];
    if (t === undefined || t === null) return null;

    return {
      temp: t ?? 0,
      rain: data.hourly?.precipitation?.[0] ?? 0,
      cloud: data.hourly?.cloud_cover?.[0] ?? 0,
      wind: data.hourly?.wind_speed_10m?.[0] ?? 0,
      dir: data.hourly?.wind_direction_10m?.[0] ?? 0,
      tMax: data.daily?.temperature_2m_max?.[0] ?? 0,
      tMin: data.daily?.temperature_2m_min?.[0] ?? 0,
      cloudDaily: data.daily?.cloud_cover_mean?.[0] ?? 0,
      rainDaily: data.daily?.precipitation_sum?.[0] ?? 0
    };
  } catch {
    return null;
  }
}

async function getOpenWeather(lat: number, lon: number) {
  try {
    const url = `${OPENWEATHER_BASE}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    return {
      temp: data.main?.temp ?? 0,
      rain: data.rain ? (data.rain["1h"] || 0) : 0,
      cloud: data.clouds?.all ?? 0,
      wind: data.wind?.speed ?? 0,
      dir: data.wind?.deg ?? 0,
      stato: data.weather?.[0]?.main ?? "Clear"
    };
  } catch {
    return null;
  }
}

async function getTomorrow(lat: number, lon: number) {
  try {
    const url = `${TOMORROW_BASE}?location=${lat},${lon}&fields=temperature,cloudCover,precipitationIntensity,windSpeed,windDirection&timesteps=1h&apikey=${TOMORROW_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const v = data.data?.timelines?.[0]?.intervals?.[0]?.values;
    if (!v) return null;

    return {
      temp: v.temperature ?? 0,
      rain: v.precipitationIntensity ?? 0,
      cloud: v.cloudCover ?? 0,
      wind: v.windSpeed ?? 0,
      dir: v.windDirection ?? 0
    };
  } catch {
    return null;
  }
}

type FonteValore = { value: number; weight: number };

function fuse(values: FonteValore[]): number {
  const valid = values.filter(v => !isNaN(v.value));
  if (valid.length === 0) return 0;
  const sumW = valid.reduce((a, b) => a + b.weight, 0);
  if (sumW === 0) return 0;
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
  const rainMax = Math.max(openMeteo?.rain || 0, openWeather?.rain || 0, tomorrow?.rain || 0);
  if (rainMax > 0.1) return "Pioggia";

  const cloudMax = Math.max(
    Number(openMeteo?.cloud || 0),
    Number(openWeather?.cloud || 0),
    Number(tomorrow?.cloud || 0)
  );
  if (cloudMax > 80) return "Coperto";
  if (cloudMax > 40) return "Variabile";
  return "Sereno";
}

function baseNubiAggressiva(cloud: number): string {
  if (cloud > 80) return "Molto bassa (<1200 m)";
  if (cloud > 60) return "Bassa (1200-1800 m)";
  if (cloud > 40) return "Media (1800-2500 m)";
  return "Alta (>2500 m)";
}

function termicheAggressive(tMax: number, tMin: number, cloudDaily: number, rainDaily: number): string {
  const deltaT = tMax - tMin;
  if (rainDaily > 1) return "Termiche disturbate (pioggia)";
  if (cloudDaily > 80) return "Termiche deboli (coperto)";
  if (deltaT < 6) return "Termiche scarse";
  if (deltaT < 10) return "Termiche moderate";
  if (deltaT < 15) return "Termiche buone";
  return "Termiche forti";
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

function safe(v: number): string {
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

  const om = openMeteo || { temp: 0, rain: 0, cloud: 0, wind: 0, dir: 0, tMax: 0, tMin: 0, cloudDaily: 0, rainDaily: 0 };
  const ow = openWeather || { temp: 0, rain: 0, cloud: 0, wind: 0, dir: 0, stato: "Clear" };
  const tw = tomorrow || { temp: 0, rain: 0, cloud: 0, wind: 0, dir: 0 };

  const tempNum = fuse([
    { value: om.temp, weight: WEIGHTS.temp.om },
    { value: ow.temp, weight: WEIGHTS.temp.ow },
    { value: tw.temp, weight: WEIGHTS.temp.tw }
  ]);

  const rainNum = fuse([
    { value: om.rain, weight: WEIGHTS.rain.om },
    { value: ow.rain, weight: WEIGHTS.rain.ow },
    { value: tw.rain, weight: WEIGHTS.rain.tw }
  ]);

  const cloudNum = fuse([
    { value: om.cloud, weight: WEIGHTS.cloud.om },
    { value: ow.cloud, weight: WEIGHTS.cloud.ow },
    { value: tw.cloud, weight: WEIGHTS.cloud.tw }
  ]);

  const windNum = fuse([
    { value: om.wind, weight: WEIGHTS.wind.om },
    { value: ow.wind, weight: WEIGHTS.wind.ow },
    { value: tw.wind, weight: WEIGHTS.wind.tw }
  ]);

  const stato = statoAggressivo(om, ow, tw);
  const baseNubi = baseNubiAggressiva(Number(cloudNum || 0));
  const termiche = termicheAggressive(om.tMax, om.tMin, om.cloudDaily, om.rainDaily);
  const indice = indiceAggressivo(Number(windNum || 0), Number(rainNum || 0), Number(cloudNum || 0), baseNubi, termiche);
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
        stato: "Errore", baseNubi: "--", termiche: "--",
        indice: 10, indiceLabel: "Sconsigliato", fonte: "Errore"
      });
    }
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

import { useState, useEffect, useCallback, useMemo } from "react";

const REFRESH_INTERVAL = 15 * 60 * 1000;

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