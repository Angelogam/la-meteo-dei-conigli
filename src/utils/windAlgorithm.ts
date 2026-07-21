"use client";

/**
 * ALGORITMO SERIO PER IL VENTO IN QUOTA
 * Basato ESCLUSIVAMENTE su dati reali da Open-Meteo (livelli 10m, 80m, 120m, 180m).
 * Interpola fino a 3000m con gradienti realistici.
 */

export interface WindLevel {
  quota: number;
  vento: number;
  direzione: string;
}

export interface WindAlgorithmResult {
  profilo: WindLevel[];
  warning: string | null;
  datiReali: { quota: number; speed: number; dir: number }[];
  gradienteMedio: number;
  direzioneMedia: string;
}

const DIR_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export function degTo16Dir(deg: number): string {
  if (deg == null || isNaN(deg)) return "N";
  const index = Math.round(((deg % 360 + 360) % 360) / 22.5) % 16;
  return DIR_16[index];
}

export function dir16ToDeg(dir: string): number {
  const index = DIR_16.indexOf(dir);
  if (index === -1) return 0;
  return index * 22.5;
}

function mediaDir(dirs: number[]): number {
  if (dirs.length === 0) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const d of dirs) {
    const rad = (d * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  const avgRad = Math.atan2(sinSum / dirs.length, cosSum / dirs.length);
  return ((avgRad * 180) / Math.PI + 360) % 360;
}

// ... resto identico ...