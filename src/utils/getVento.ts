"use client";

import { fetchHourly } from "@/lib/openMeteoClient";

export interface VentoOrario {
  ora: number;
  speed: number;
  dir: number;
  gust: number;
}

export interface VentoData {
  giorno: string;
  lat: number;
  lon: number;
  ventoOrario: VentoOrario[];
  ventoDecollo: number;
  ventoAtterraggio: number;
}

const cacheVento = new Map<string, { data: VentoData; ts: number }>();
const CACHE_TTL = 3 * 60 * 1000;

export async function getVento(lat: number, lon: number, day: string): Promise<VentoData> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)},${day}`;
  const cached = cacheVento.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchHourly(lat, lon, "wind_speed_10m,wind_direction_10m,wind_gusts_10m", day, day);
  const hours: string[] = data.hourly.time;
  const speeds: number[] = data.hourly.wind_speed_10m || [];
  const dirs: number[] = data.hourly.wind_direction_10m || [];
  const gusts: number[] = data.hourly.wind_gusts_10m || [];

  const ventoOrario: VentoOrario[] = [];
  for (let i = 0; i < hours.length; i++) {
    const ora = Number(hours[i].split("T")[1].split(":")[0]);
    if (ora >= 9 && ora <= 19) {
      ventoOrario.push({
        ora,
        speed: Number(speeds[i]) || 0,
        dir: Number(dirs[i]) || 0,
        gust: Number(gusts[i]) || 0,
      });
    }
  }

  // Vento decollo = media delle prime 3 ore mattutine (9-11), atterraggio = ultime 2 (17-18)
  const mattina = ventoOrario.filter((v) => v.ora >= 9 && v.ora <= 11);
  const sera = ventoOrario.filter((v) => v.ora >= 17 && v.ora <= 18);
  const ventoDecollo = mattina.length > 0
    ? Math.round(mattina.reduce((s, v) => s + v.speed, 0) / mattina.length)
    : (ventoOrario[0]?.speed ?? 0);
  const ventoAtterraggio = sera.length > 0
    ? Math.round(sera.reduce((s, v) => s + v.speed, 0) / sera.length)
    : (ventoOrario[ventoOrario.length - 1]?.speed ?? 0);

  const result: VentoData = {
    giorno: day,
    lat,
    lon,
    ventoOrario,
    ventoDecollo,
    ventoAtterraggio,
  };

  cacheVento.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}
