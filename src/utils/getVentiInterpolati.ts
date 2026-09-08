"use client";

import { fetchWithProxyFallback } from "@/utils/proxyFallback";

export interface QuotaVento {
  speed: number;
  dir: number;
}

export interface VentiInterpolatiPerOra {
  ora: number;
  quote: Record<number, QuotaVento>;
  gust: number;
  temp: number;
}

export interface VentiInterpolatiData {
  giorno: string;
  lat: number;
  lon: number;
  quotaDecollo: number;
  ventoOrario: VentiInterpolatiPerOra[];
}

const cacheVenti = new Map<string, { data: VentiInterpolatiData; ts: number }>();
const CACHE_TTL = 3 * 60 * 1000;

const LIVELLI_QUOTA = [
  { quota: 0, speedKey: "wind_speed_10m", dirKey: "wind_direction_10m" },
  { quota: 760, speedKey: "wind_speed_925hPa", dirKey: "wind_direction_925hPa" },
  { quota: 1450, speedKey: "wind_speed_850hPa", dirKey: "wind_direction_850hPa" },
  { quota: 3000, speedKey: "wind_speed_700hPa", dirKey: "wind_direction_700hPa" },
  { quota: 4000, speedKey: "wind_speed_600hPa", dirKey: "wind_direction_600hPa" },
];

function interpolateVento(
  quota: number,
  sotto: { quota: number; speed: number; dir: number },
  sopra: { quota: number; speed: number; dir: number }
): { speed: number; dir: number } {
  const ratio = (quota - sotto.quota) / (sopra.quota - sotto.quota);
  const speed = sotto.speed + ratio * (sopra.speed - sotto.speed);

  let diffDir = sopra.dir - sotto.dir;
  if (diffDir > 180) diffDir -= 360;
  if (diffDir < -180) diffDir += 360;
  const dir = ((sotto.dir + diffDir * ratio) % 360 + 360) % 360;

  return { speed: Math.round(speed), dir: Math.round(dir) };
}

export async function getVentiInterpolati(
  lat: number,
  lon: number,
  quotaDecollo: number,
  day: string
): Promise<VentiInterpolatiData> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)},${quotaDecollo},${day}`;
  const cached = cacheVenti.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_925hPa,wind_direction_925hPa,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_600hPa,wind_direction_600hPa",
    timezone: "Europe/Rome",
    start_date: day,
    end_date: day,
  });
  const url = params.toString();

  const res = await fetchWithProxyFallback(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const hours: string[] = data.hourly.time;
  const temps: number[] = data.hourly.temperature_2m;

  const partenza = Math.floor(quotaDecollo / 250) * 250;
  const quoteInterpolazione: number[] = [];
  for (let q = partenza; q <= 4000; q += 250) {
    quoteInterpolazione.push(q);
  }
  if (!quoteInterpolazione.includes(quotaDecollo)) {
    quoteInterpolazione.push(quotaDecollo);
    quoteInterpolazione.sort((a, b) => a - b);
  }

  const ventoOrario: VentiInterpolatiPerOra[] = [];

  for (let i = 0; i < hours.length; i++) {
    const ora = Number(hours[i].split("T")[1].split(":")[0]);
    if (ora >= 9 && ora <= 19) {
      const quote: Record<number, QuotaVento> = {};
      const livelliDisponibili: { quota: number; speed: number; dir: number }[] = [];

      LIVELLI_QUOTA.forEach((livello) => {
        const speedArr = data.hourly[livello.speedKey];
        const dirArr = data.hourly[livello.dirKey];
        if (speedArr && dirArr && speedArr[i] != null && dirArr[i] != null) {
          livelliDisponibili.push({
            quota: livello.quota,
            speed: speedArr[i] as number,
            dir: dirArr[i] as number,
          });
        }
      });

      if (livelliDisponibili.length === 0) continue;

      livelliDisponibili.sort((a, b) => a.quota - b.quota);

      quoteInterpolazione.forEach((q) => {
        const esatto = livelliDisponibili.find((l) => l.quota === q);
        if (esatto) {
          quote[q] = { speed: Math.round(esatto.speed), dir: Math.round(esatto.dir) };
          return;
        }

        const sotto = livelliDisponibili.filter((l) => l.quota <= q).pop();
        const sopra = livelliDisponibili.find((l) => l.quota >= q);

        if (sotto && sopra && sotto !== sopra) {
          quote[q] = interpolateVento(q, sotto, sopra);
        } else if (sotto && !sopra) {
          const ultimo = sotto;
          const penultimo = livelliDisponibili[livelliDisponibili.length - 2] || ultimo;
          const gradientVento =
            ultimo.quota !== penultimo.quota
              ? (ultimo.speed - penultimo.speed) / (ultimo.quota - penultimo.quota)
              : 0.01;
          const speed = Math.max(0, ultimo.speed + gradientVento * (q - ultimo.quota));
          quote[q] = { speed: Math.round(speed), dir: Math.round(ultimo.dir) };
        } else if (!sotto && sopra) {
          quote[q] = { speed: Math.round(sopra.speed), dir: Math.round(sopra.dir) };
        }
      });

      ventoOrario.push({
        ora,
        quote,
        gust: data.hourly.wind_gusts_10m[i],
        temp: temps[i],
      });
    }
  }

  const result: VentiInterpolatiData = {
    giorno: day,
    lat,
    lon,
    quotaDecollo,
    ventoOrario,
  };

  cacheVenti.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}