"use client";

import type { MeteoHourly } from "@/services/openMeteoService";

export type StatoMeteo = "sereno" | "variabile" | "nuvoloso" | "pioggia" | "temporale" | "offline";

export interface MeteoInput {
  precipNow: number;
  precipNextHours: number;
  cloudNow: number;
  windSpeed: number;
  windDir: number;
  temperature: number;
  cape?: number;
  weatherCode?: number;
  isDay?: boolean;
}

export interface StatoMeteoResult {
  stato: StatoMeteo;
  label: string;
  icona: string;
  confidence: number;
  motivi: string[];
}

const PRECIP_THRESHOLD_RAIN = 0.1;
const CLOUD_THRESHOLD_CLEAR = 20;
const CLOUD_THRESHOLD_OVERCAST = 80;

const WMO_BASE_STATE: Record<number, StatoMeteo> = {
  0: "sereno",
  1: "variabile",
  2: "variabile",
  3: "nuvoloso",
  45: "nuvoloso",
  48: "nuvoloso",
  51: "pioggia",
  53: "pioggia",
  55: "pioggia",
  56: "pioggia",
  57: "pioggia",
  61: "pioggia",
  63: "pioggia",
  65: "pioggia",
  66: "pioggia",
  67: "pioggia",
  71: "nuvoloso",
  73: "nuvoloso",
  75: "nuvoloso",
  77: "nuvoloso",
  80: "pioggia",
  81: "pioggia",
  82: "pioggia",
  95: "temporale",
  96: "temporale",
  99: "temporale",
};

const ICON_MAP: Record<StatoMeteo, string> = {
  sereno: "☀️",
  variabile: "🌤️",
  nuvoloso: "☁️",
  pioggia: "🌧️",
  temporale: "⛈️",
  offline: "📡",
};

const LABEL_MAP: Record<StatoMeteo, string> = {
  sereno: "Sereno",
  variabile: "Variabile",
  nuvoloso: "Nuvoloso",
  pioggia: "Pioggia",
  temporale: "Temporale",
  offline: "Dati non disponibili",
};

export function calcolaStatoMeteo(input: MeteoInput): StatoMeteoResult {
  const { precipNow, precipNextHours, cloudNow, windSpeed, cape, weatherCode } = input;
  const motivi: string[] = [];

  if (cloudNow === undefined || precipNow === undefined) {
    return { stato: "offline", label: "Offline", icona: ICON_MAP.offline, confidence: 0, motivi: ["Dati mancanti"] };
  }

  if (weatherCode !== undefined && (weatherCode === 95 || weatherCode === 96 || weatherCode === 99)) {
    motivi.push("Codice WMO temporale (95/96/99)");
    return { stato: "temporale", label: "Temporale", icona: ICON_MAP.temporale, confidence: 0.95, motivi };
  }
  if (cape !== undefined && cape > 1200 && precipNow > PRECIP_THRESHOLD_RAIN && cloudNow > CLOUD_THRESHOLD_OVERCAST) {
    motivi.push(`CAPE alto (${cape} J/kg) + pioggia + copertura > 80%`);
    return { stato: "temporale", label: "Temporale", icona: ICON_MAP.temporale, confidence: 0.85, motivi };
  }

  const pioggiaPresente = precipNow > PRECIP_THRESHOLD_RAIN;
  const pioggiaImminente = precipNextHours > PRECIP_THRESHOLD_RAIN;
  
  if (pioggiaPresente || pioggiaImminente) {
    motivi.push(pioggiaPresente ? `Pioggia ora: ${precipNow.toFixed(1)} mm/h` : `Pioggia prossime ore: ${precipNextHours.toFixed(1)} mm`);
    return { stato: "pioggia", label: "Pioggia", icona: ICON_MAP.pioggia, confidence: 0.9, motivi };
  }

  if (cloudNow > CLOUD_THRESHOLD_OVERCAST) {
    motivi.push(`Copertura nuvolosa ${cloudNow}% > 80%`);
    return { stato: "nuvoloso", label: "Nuvoloso", icona: ICON_MAP.nuvoloso, confidence: 0.85, motivi };
  }

  if (cloudNow >= CLOUD_THRESHOLD_CLEAR && cloudNow <= CLOUD_THRESHOLD_OVERCAST) {
    motivi.push(`Copertura nuvolosa ${cloudNow}% (20-80%)`);
    return { stato: "variabile", label: "Variabile", icona: ICON_MAP.variabile, confidence: 0.8, motivi };
  }

  if (cloudNow < CLOUD_THRESHOLD_CLEAR && precipNow <= PRECIP_THRESHOLD_RAIN && precipNextHours <= PRECIP_THRESHOLD_RAIN) {
    motivi.push(`Cielo sereno: copertura ${cloudNow}% < 20%, nessuna pioggia`);
    return { stato: "sereno", label: "Sereno", icona: ICON_MAP.sereno, confidence: 0.9, motivi };
  }

  if (weatherCode !== undefined && WMO_BASE_STATE[weatherCode]) {
    const statoWmo = WMO_BASE_STATE[weatherCode];
    motivi.push(`Fallback WMO code ${weatherCode}: ${statoWmo}`);
    return { 
      stato: statoWmo, 
      label: LABEL_MAP[statoWmo], 
      icona: ICON_MAP[statoWmo], 
      confidence: 0.7, 
      motivi 
    };
  }

  return { stato: "variabile", label: "Variabile", icona: ICON_MAP.variabile, confidence: 0.5, motivi: ["Fallback conservativo"] };
}

export function calcolaPrecipProssimeOre(hourly: MeteoHourly[], oreAvanti: number = 6): number {
  if (!hourly || hourly.length === 0) return 0;
  const now = new Date();
  const currentHour = now.getHours();
  let somma = 0;
  let conteggio = 0;
  
  for (const h of hourly) {
    const hHour = new Date(h.time).getHours();
    if (hHour >= currentHour && hHour < currentHour + oreAvanti) {
      somma += h.precipitation ?? 0;
      conteggio++;
      if (conteggio >= oreAvanti) break;
    }
  }
  return somma;
}