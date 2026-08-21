"use client";

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

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return res;
      if (res.status >= 500 && i < retries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      return res;
    } catch {
      if (i === retries) throw new Error("Network error");
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("Max retries");
}

export async function getVento(lat: number, lon: number, day: string): Promise<VentoData> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)},${day}`;
  const cached = cacheVento.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Europe/Rome&start_date=${day}&end_date=${day}`;

  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const hours: string[] = data.hourly.time;
  const speeds: number[] = data.hourly.wind_speed_10m;
  const dirs: number[] = data.hourly.wind_direction_10m;
  const gusts: number[] = data.hourly.wind_gusts_10m;

  const ventoOrario: VentoOrario[] = [];
  for (let i = 0; i < hours.length; i++) {
    const ora = Number(hours[i].split("T")[1].split(":")[0]);
    if (ora >= 9 && ora <= 19) {
      ventoOrario.push({ ora, speed: speeds[i], dir: dirs[i], gust: gusts[i] });
    }
  }

  const result: VentoData = {
    giorno: day,
    lat, lon,
    ventoOrario,
    ventoDecollo: speeds[9] ?? 0,
    ventoAtterraggio: speeds[10] ?? 0,
  };

  cacheVento.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}