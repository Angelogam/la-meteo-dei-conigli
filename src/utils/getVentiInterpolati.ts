"use client";

import { fetchHourly } from "@/lib/openMeteoClient";

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

/**
 * Mappa livelli hPa di Open-Meteo alle quote approssimative in metri
 * Quote standard ISA (International Standard Atmosphere)
 */
const HPA_TO_QUOTA: Record<string, number> = {
  "10m": 0,
  "80m": 80,
  "120m": 120,
  "180m": 180,
  "925hPa": 760,
  "850hPa": 1450,
  "700hPa": 3000,
  "600hPa": 4200,
  "500hPa": 5500,
  "400hPa": 7000,
  "300hPa": 9000,
  "250hPa": 10000,
  "200hPa": 11500,
};

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

  // Richiedi tutti i livelli vento disponibili da Open-Meteo
  const windParams = [
    "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
    "wind_speed_80m", "wind_direction_80m",
    "wind_speed_120m", "wind_direction_120m",
    "wind_speed_180m", "wind_direction_180m",
    "wind_speed_925hPa", "wind_direction_925hPa",
    "wind_speed_850hPa", "wind_direction_850hPa",
    "wind_speed_700hPa", "wind_direction_700hPa",
    "wind_speed_600hPa", "wind_direction_600hPa",
    "wind_speed_500hPa", "wind_direction_500hPa",
  ].join(",");

  const data = await fetchHourly(lat, lon, windParams, day, day);
  const hours: string[] = data.hourly.time;
  const h = data.hourly;

  // Costruisci mappa livelli disponibili -> quota reale
  const livelliDisponibili: { quota: number; speed: number; dir: number; key: string }[] = [];

  for (const [key, defaultAlt] of Object.entries(HPA_TO_QUOTA)) {
    const speedArr = h[`wind_speed_${key}`];
    const dirArr = h[`wind_direction_${key}`];
    if (speedArr && dirArr) {
      for (let i = 0; i < hours.length; i++) {
        const speed = safeNumOrNull(speedArr[i]);
        const dir = safeNumOrNull(dirArr[i]);
        if (speed !== null && dir !== null && speed >= 0 && dir >= 0) {
          // Usa quota reale del sito come riferimento per i livelli bassi
          const quota = key === "10m" ? quotaDecollo : key === "80m" ? quotaDecollo + 70 :
                        key === "120m" ? quotaDecollo + 110 : key === "180m" ? quotaDecollo + 170 :
                        defaultAlt;
          livelliDisponibili.push({ quota, speed, dir, key });
        }
      }
      break; // una sola iterazione per chiave
    }
  }

  // Determina range quote da interpolare
  const partenza = Math.floor(quotaDecollo / 250) * 250;
  const quoteInterpolazione: number[] = [];
  for (let q = partenza; q <= 4500; q += 250) {
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
      const livelliOrari: { quota: number; speed: number; dir: number }[] = [];

      for (const [key, defaultAlt] of Object.entries(HPA_TO_QUOTA)) {
        const speedArr = h[`wind_speed_${key}`];
        const dirArr = h[`wind_direction_${key}`];
        if (speedArr && dirArr && speedArr[i] != null && dirArr[i] != null) {
          const speed = Number(speedArr[i]);
          const dir = Number(dirArr[i]);
          if (!isNaN(speed) && !isNaN(dir) && speed >= 0 && dir >= 0) {
            const quota = key === "10m" ? quotaDecollo : key === "80m" ? quotaDecollo + 70 :
                          key === "120m" ? quotaDecollo + 110 : key === "180m" ? quotaDecollo + 170 :
                          defaultAlt;
            livelliOrari.push({ quota, speed, dir });
          }
        }
      }

      if (livelliOrari.length === 0) continue;

      livelliOrari.sort((a, b) => a.quota - b.quota);

      quoteInterpolazione.forEach((q) => {
        const esatto = livelliOrari.find((l) => l.quota === q);
        if (esatto) {
          quote[q] = { speed: Math.round(esatto.speed), dir: Math.round(esatto.dir) };
          return;
        }

        const sotto = livelliOrari.filter((l) => l.quota <= q).pop();
        const sopra = livelliOrari.find((l) => l.quota >= q);

        if (sotto && sopra && sotto !== sopra) {
          quote[q] = interpolateVento(q, sotto, sopra);
        } else if (sotto && !sopra) {
          // Estrapolazione controllata verso l'alto
          const ultimo = sotto;
          const penultimo = livelliOrari[livelliOrari.length - 2] || ultimo;
          const gradientVento = penultimo.quota !== ultimo.quota
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
        gust: safeNum(h.wind_gusts_10m?.[i], 0),
        temp: safeNum(h.temperature_2m?.[i], 15),
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

function safeNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function safeNum(v: unknown, fallback: number = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}
