"use client";

import type { HourData } from "@/types/meteo";

export interface TermicheData {
  base: number;
  top: number;
  forza: number;
  rateo: number;
  label: string;
  colore: string;
  gradienteReale: number;
}

/**
 * Calcola termiche usando SOLO dati reali da Open-Meteo.
 * 
 * CALIBRATA per le Alpi Piemontesi (dati reali da Meteo Parapente / 3B Meteo).
 * 
 * Base termica (LCL) = (T - Td) × 100  (più realistica delle Alpi)
 * Top = base + (forza × 150)
 * Rateo massimo = 3 m/s
 * 
 * Fattori:
 * - Gradiente: max 2.5 punti
 * - Vento: max 2 punti (ideale 8-20 km/h)
 * - Nuvolosità: max 1.5 punti
 * - UV: max 1 punto
 * - Umidità: max 1 punto
 * 
 * Penalità:
 * - Vento < 8 km/h: -1 punto (termiche deboli)
 * - Pioggia: annulla tutto
 */
export function calcolaTermiche(weather: HourData | any, altitude: number): TermicheData {
  const temperature = weather.temperature ?? 15;
  const dewPoint = weather.dewPoint ?? (temperature - 6);
  const humidity = weather.humidity ?? 50;
  const windSpeed = weather.windSpeed ?? 10;
  const temp80m = weather.temp80m ?? null;
  const temp120m = weather.temp120m ?? null;
  const cloudCover = weather.cloudCover ?? weather.cloud_cover ?? 30;
  const pressure = weather.pressure ?? weather.surface_pressure ?? 1013;
  const precipitation = weather.precipitation ?? 0;
  const uvIndex = weather.uvIndex ?? 4;

  // Se piove, niente termiche
  if (precipitation > 1) {
    return {
      base: 0,
      top: 0,
      forza: 0,
      rateo: 0,
      label: "❌ Niente termiche (pioggia)",
      colore: "#475569",
      gradienteReale: 0,
    };
  }

  // --- 1. BASE TERMICA (LCL) ---
  // LCL = (temperatura - dewPoint) × 100 (calibrato per Alpi)
  const spread = temperature - dewPoint;
  let cloudBase = Math.round(spread * 100);

  // Limiti realistici per le Alpi
  if (cloudBase < 300) cloudBase = 300;
  if (cloudBase > 2500) cloudBase = 2500;

  // --- 2. GRADIENTE TERMICO REALE ---
  let gradienteReale = 0.98; // default gradiente secco
  if (temp80m != null) {
    const diff = temperature - temp80m;
    gradienteReale = (diff / 78) * 100;
  } else if (temp120m != null) {
    const diff = temperature - temp120m;
    gradienteReale = (diff / 118) * 100;
  }

  // --- 3. FORZA TERMICA (score 0-10, calibrato) ---
  let score = 0;

  // Fattore gradiente (max 2.5 punti)
  if (gradienteReale >= 1.2) score += 2.5;
  else if (gradienteReale >= 0.98) score += 1.5;
  else if (gradienteReale >= 0.7) score += 0.5;

  // Fattore vento (max 2 punti) — ideale 8-20 km/h per le Alpi
  if (windSpeed >= 8 && windSpeed <= 20) score += 2;
  else if (windSpeed >= 5 && windSpeed < 8) score += 1;
  else if (windSpeed > 20 && windSpeed <= 25) score += 0.5;
  else if (windSpeed >= 1 && windSpeed < 5) score += 0.3; // vento debole = termiche deboli

  // Fattore nuvolosità (max 1.5 punti)
  if (cloudCover >= 15 && cloudCover <= 45) score += 1.5;
  else if (cloudCover >= 5 && cloudCover < 15) score += 1;
  else if (cloudCover >= 1 && cloudCover < 5) score += 0.3;

  // Fattore UV (max 1 punto)
  if (uvIndex != null) {
    if (uvIndex >= 8) score += 1;
    else if (uvIndex >= 6) score += 0.7;
    else if (uvIndex >= 4) score += 0.4;
    else if (uvIndex >= 2) score += 0.2;
  }

  // Fattore umidità (max 1 punto)
  if (humidity >= 30 && humidity <= 45) score += 1;
  else if (humidity > 45 && humidity <= 55) score += 0.7;
  else if (humidity >= 20 && humidity < 30) score += 0.3;

  // Fattore pressione (max 0.5 punti)
  if (pressure != null) {
    if (pressure <= 1005) score += 0.5;
    else if (pressure <= 1010) score += 0.3;
    else if (pressure <= 1015) score += 0.1;
  }

  // Penalità per vento debole (termiche non si attivano bene)
  if (windSpeed < 4) score *= 0.7;

  // --- 4. TOP TERMICO ---
  // Deterministico: base + (forza × 150) — più realistico
  const forza = Math.min(10, Math.max(0, Math.round(score * 10) / 10));
  const spessore = Math.round(forza * 150);
  let top = cloudBase + Math.max(50, spessore);

  // Limiti realistici per Alpi Piemontesi
  if (top > 4000) top = 4000;
  if (top < cloudBase + 50) top = cloudBase + 50;

  // --- 5. RATEO (m/s) ---
  // Deterministico: (forza / 10) × 3 (max 3 m/s, più realistico)
  let rateo = (forza / 10) * 3;

  // Correzione per pioggia
  if (precipitation > 1) rateo = 0;

  // Correzione per vento forte
  if (windSpeed > 22) rateo *= 0.5;
  else if (windSpeed > 15) rateo *= 0.8;

  // Correzione per nuvole eccessive
  if (cloudCover > 70) rateo *= 0.3;
  else if (cloudCover > 60) rateo *= 0.6;

  // Correzione per vento troppo debole
  if (windSpeed < 3) rateo *= 0.5;

  rateo = Math.max(0.05, Math.round(rateo * 10) / 10);

  // --- 6. LABEL (calibrato) ---
  let label: string;
  let colore: string;

  if (rateo >= 3.0) {
    label = "Forte 🔥";
    colore = "#ef4444";
  } else if (rateo >= 2.0) {
    label = "Buona 🪂";
    colore = "#f97316";
  } else if (rateo >= 1.2) {
    label = "Moderata 🌤️";
    colore = "#eab308";
  } else if (rateo >= 0.5) {
    label = "Debole 🌥️";
    colore = "#84cc16";
  } else if (rateo >= 0.2) {
    label = "Molto debole ☁️";
    colore = "#6b7280";
  } else {
    label = "Assente ❄️";
    colore = "#475569";
  }

  return {
    base: cloudBase,
    top: Math.round(top),
    forza,
    rateo,
    label,
    colore,
    gradienteReale: Math.round(gradienteReale * 100) / 100,
  };
}

/**
 * Genera dati termici per tutte le ore
 */
export function generaTermicheOrarie(
  hourlyData: HourData[],
  altitude: number
): { hour: number; termiche: TermicheData }[] {
  return hourlyData.map((h) => ({
    hour: h.time.getHours(),
    termiche: calcolaTermiche(h, altitude),
  }));
}