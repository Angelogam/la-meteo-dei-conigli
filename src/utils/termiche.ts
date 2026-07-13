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
 * CALIBRATA v2 — più severa per le Alpi Piemontesi (Bric Lombatera, Pian Munè).
 *
 * Base termica (LCL) = (T - Td) × 100
 * Top = base + (forza × 120)
 * Rateo massimo = 2.5 m/s
 *
 * Fattori (score 0-10):
 * - Gradiente: max 2.5
 * - Vento: max 2 (ideale 8-20 km/h)
 * - Nuvolosità: max 1.5 (idealmente 15-45%)
 * - UV: max 1
 * - Umidità: max 1
 * - Pressione: max 0.5
 *
 * Penalità:
 * - Vento < 8 km/h: forte riduzione
 * - Vento > 22 km/h: riduzione
 * - Pioggia: annulla
 * - Nuvole > 60%: riduzione
 * - Umidità > 65%: riduzione
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
  const spread = temperature - dewPoint;
  let cloudBase = Math.round(spread * 100);
  if (cloudBase < 300) cloudBase = 300;
  if (cloudBase > 2500) cloudBase = 2500;

  // --- 2. GRADIENTE TERMICO REALE ---
  let gradienteReale = 0.98;
  if (temp80m != null) {
    const diff = temperature - temp80m;
    gradienteReale = (diff / 78) * 100;
  } else if (temp120m != null) {
    const diff = temperature - temp120m;
    gradienteReale = (diff / 118) * 100;
  }

  // --- 3. FORZA TERMICA (score 0-10) ---
  let score = 0;

  // Fattore gradiente (max 2.5)
  if (gradienteReale >= 1.2) score += 2.5;
  else if (gradienteReale >= 0.98) score += 1.5;
  else if (gradienteReale >= 0.7) score += 0.5;

  // Fattore vento (max 2) — ideale 8-20 km/h
  if (windSpeed >= 8 && windSpeed <= 20) {
    score += 2;
  } else if (windSpeed > 20 && windSpeed <= 25) {
    score += 0.8;
  } else if (windSpeed > 25) {
    score += 0.3;
  } else {
    // Vento < 8 km/h: penalità forte
    if (windSpeed >= 6 && windSpeed < 8) score += 0.8;
    else if (windSpeed >= 4 && windSpeed < 6) score += 0.3;
    // sotto 4 km/h non si aggiunge nulla
  }

  // Fattore nuvolosità (max 1.5) — cumuli ideali per termiche
  if (cloudCover >= 15 && cloudCover <= 45) score += 1.5;
  else if (cloudCover >= 5 && cloudCover < 15) score += 1;
  else if (cloudCover >= 1 && cloudCover < 5) score += 0.3;

  // Fattore UV (max 1)
  if (uvIndex != null) {
    if (uvIndex >= 8) score += 1;
    else if (uvIndex >= 6) score += 0.7;
    else if (uvIndex >= 4) score += 0.4;
    else if (uvIndex >= 2) score += 0.2;
  }

  // Fattore umidità (max 1)
  if (humidity >= 30 && humidity <= 45) score += 1;
  else if (humidity > 45 && humidity <= 55) score += 0.7;
  else if (humidity >= 20 && humidity < 30) score += 0.3;

  // Fattore pressione (max 0.5)
  if (pressure != null) {
    if (pressure <= 1005) score += 0.5;
    else if (pressure <= 1010) score += 0.3;
    else if (pressure <= 1015) score += 0.1;
  }

  // Penalità per vento debole (termiche non si attivano)
  if (windSpeed < 4) score *= 0.5;
  else if (windSpeed >= 4 && windSpeed < 6) score *= 0.7;

  // --- 4. TOP TERMICO ---
  const forza = Math.min(10, Math.max(0, Math.round(score * 10) / 10));
  // Spessore più conservativo: forza × 120
  const spessore = Math.round(forza * 120);
  let top = cloudBase + Math.max(50, spessore);
  if (top > 3500) top = 3500;
  if (top < cloudBase + 50) top = cloudBase + 50;

  // --- 5. RATEO (m/s) — max 2.5 m/s (più realistico) ---
  let rateo = (forza / 10) * 2.5;

  // Correzione per pioggia
  if (precipitation > 1) rateo = 0;

  // Correzione per vento forte
  if (windSpeed > 22) rateo *= 0.4;
  else if (windSpeed > 15) rateo *= 0.7;

  // Correzione per nuvole eccessive
  if (cloudCover > 70) rateo *= 0.2;
  else if (cloudCover > 60) rateo *= 0.4;

  // Correzione per vento troppo debole
  if (windSpeed < 3) rateo *= 0.3;
  else if (windSpeed < 5) rateo *= 0.6;

  // Correzione per umidità alta
  if (humidity > 65) rateo *= 0.5;

  rateo = Math.max(0.05, Math.round(rateo * 10) / 10);

  // --- 6. LABEL ---
  let label: string;
  let colore: string;

  if (rateo >= 2.2) {
    label = "Buona 🪂";
    colore = "#f97316";
  } else if (rateo >= 1.5) {
    label = "Moderata 🌤️";
    colore = "#eab308";
  } else if (rateo >= 0.7) {
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