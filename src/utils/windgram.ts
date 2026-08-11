"use client";

import type { WindLevel } from "@/utils/windAlgorithm";

interface WindgramData {
  quota: number;
  speed: number;
  dir: number;
  dirName: string;
}

interface WindgramParams {
  lat: number;
  lon: number;
  quotaDecollo: number;
  day: string;
}

/**
 * Interpolazione del profilo vento tra quote decollo e quota target
 */
function interpolateWind(
  levels: WindLevel[],
  quota: number
): WindLevel | undefined {
  if (levels.length === 0) return undefined;
  if (quota <= levels[0].quota) return levels[0];
  if (quota >= levels[levels.length - 1].quota) return levels[levels.length - 1];

  for (let i = 0; i < levels.length - 1; i++) {
    if (quota >= levels[i].quota && quota <= levels[i + 1].quota) {
      const ratio = (quota - levels[i].quota) / (levels[i + 1].quota - levels[i].quota);
      return {
        quota,
        speed: levels[i].speed + ratio * (levels[i + 1].speed - levels[i].speed),
        dir: levels[i].dir + ratio * (levels[i + 1].dir - levels[i].dir),
        dirName: levels[i].dirName,
      };
    }
  }
  return undefined;
}

/**
 * Genera il profilo vento per una quota di decollo
 */
export async function fetchWindProfile(
  lat: number,
  lon: number,
  quotaDecollo: number,
  day: string
): Promise<WindLevel[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Europe/Rome&start_date=${day}&end_date=${day}&models=gfs_seamless`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const hours = data.hourly.time;
  const speeds = data.hourly.wind_speed_10m;
  const dirs = data.hourly.wind_direction_10m;
  const gusts = data.hourly.wind_gusts_10m;

  const ventoOrario: WindLevel[] = [];
  for (let i = 0; i < hours.length; i++) {
    const ora = Number(hours[i].split("T")[1].split(":")[0]);
    if (ora >= 9 && ora <= 19) {
      ventoOrario.push({
        quota: ora,
        speed: speeds[i] ?? 0,
        dir: dirs[i] ?? 0,
        dirName: [
          "N",
          "NE",
          "E",
          "SE",
          "S",
          "SW",
          "W",
          "NW",
        ][Math.round(((dirs[i] ?? 0) % 360) / 45) % 8],
      });
    }
  }

  // Interpolazione tra quote decollo e 4000m
  const quoteTarget = [quotaDecollo, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
  const profilo: WindLevel[] = [];

  for (let i = 0; i < quoteTarget.length; i++) {
    const q = quoteTarget[i];
    const entry = interpolateWind(ventoOrario, q);
    profilo.push(entry || { quota: q, speed: 0, dir: 0, dirName: "N" });
  }

  return profilo;
}

/**
 * Genera il windgram completo per un decollo
 */
export async function generateWindgram(
  lat: number,
  lon: number,
  quotaDecollo: number,
  day: string
): Promise<{
  quote: number;
  speed: number;
  dir: number;
  dirName: string;
  gust: number;
}[]> {
  const profilo = await fetchWindProfile(lat, lon, quotaDecollo, day);

  return profilo.map((p) => ({
    quote: p.quota,
    speed: Math.round(p.speed * 10) / 10,
    dir: p.dir,
    dirName: p.dirName,
    gust: 0,
  }));
}

/**
 * Genera il windgram per tutte le quote fino a 4000m
 */
export async function generateWindgramFull(
  lat: number,
  lon: number,
  quotaDecollo: number,
  day: string
): Promise<{
  quote: number;
  speed: number;
  dir: number;
  dirName: string;
  gust: number;
}[]> {
  const profilo = await fetchWindProfile(lat, lon, quotaDecollo, day);

  const quoteTarget = [quotaDecollo, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
  const result: {
    quote: number;
    speed: number;
    dir: number;
    dirName: string;
    gust: number;
  }[] = [];

  for (const q of quoteTarget) {
    const entry = profilo.find((p) => p.quota === q);
    if (entry) {
      result.push({
        quote: q,
        speed: Math.round(entry.speed * 10) / 10,
        dir: entry.dir,
        dirName: entry.dirName,
        gust: 0,
      });
    }
  }

  return result;
}