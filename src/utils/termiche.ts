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
 * Questa è l'unica funzione autorizzata per calcolare termiche in tutta l'app.
 * 
 * Base termica (LCL) = (T - Td) × 125
 * Gradiente termico da temperature_80m o temperature_120m
 * Top = base + spessore (forza × 250)
 * Rateo = (forza / 10) × 4
 */
export function calcolaTermiche(weather: HourData | any, altitude: number): TermicheData {
  const temperature = weather.temperature ?? 15;
  const dewPoint = weather.dewPoint ?? (temperature - 8);
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
  // LCL = (temperatura - dewPoint) × 125
  const spread = temperature - dewPoint;
  let cloudBase = Math.round(spread * 125);

  if (cloudBase < 200) cloudBase = 200;
  if (cloudBase > 3000) cloudBase = 3000;

  // --- 2. GRADIENTE TERMICO REALE ---
  let gradienteReale = 0.98; // default gradiente secco
  if (temp80m != null) {
    const diff = temperature - temp80m;
    gradienteReale = (diff / 78) * 100;
  } else if (temp120m != null) {
    const diff = temperature - temp120m;
    gradienteReale = (diff / 118) * 100;
  }

  // --- 3. FORZA TERMICA (score 0-10) ---
  let score = 0;

  // Fattore gradiente (max 3 punti)
  if (gradienteReale >= 1.2) score += 3;
  else if (gradienteReale >= 0.98) score += 2;
  else if (gradienteReale >= 0.7) score += 1;

  // Fattore vento (max 2 punti)
  if (windSpeed >= 5 && windSpeed <= 15) score += 2;
  else if (windSpeed >= 3 && windSpeed < 5) score += 1.5;
  else if (windSpeed > 15 && windSpeed <= 22) score += 1;
  else if (windSpeed >= 1 && windSpeed < 3) score += 0.5;

  // Fattore nuvolosità (max 2 punti)
  if (cloudCover >= 15 && cloudCover <= 45) score += 2;
  else if (cloudCover >= 5 && cloudCover < 15) score += 1.5;
  else if (cloudCover >= 1 && cloudCover < 5) score += 0.5;

  // Fattore umidità (max 1.5 punti)
  if (humidity >= 30 && humidity <= 50) score += 1.5;
  else if (humidity > 50 && humidity <= 65) score += 1;
  else if (humidity >= 15 && humidity < 30) score += 0.5;

  // Fattore UV (max 1 punto)
  if (uvIndex != null) {
    if (uvIndex >= 7) score += 1;
    else if (uvIndex >= 5) score += 0.7;
    else if (uvIndex >= 3) score += 0.4;
    else if (uvIndex >= 1) score += 0.1;
  }

  // Fattore pressione (max 0.5 punti)
  if (pressure != null) {
    if (pressure <= 1008) score += 0.5;
    else if (pressure <= 1013) score += 0.3;
    else if (pressure <= 1018) score += 0.1;
  }

  // --- 4. TOP TERMICO ---
  // Deterministico: base + (forza × 250)
  const forza = Math.min(10, Math.max(0, Math.round(score * 10) / 10));
  const spessore = Math.round(forza * 250);
  let top = cloudBase + Math.max(100, spessore);

  // Limiti realistici
  if (top > 5000) top = 5000;
  if (top < cloudBase + 100) top = cloudBase + 100;

  // --- 5. RATEO (m/s) ---
  // Deterministico: (forza / 10) × 4
  let rateo = (forza / 10) * 4;

  // Correzione per pioggia
  if (precipitation > 1) rateo = 0;

  // Correzione per vento forte
  if (windSpeed > 22) rateo *= 0.5;
  else if (windSpeed > 15) rateo *= 0.8;

  // Correzione per nuvole eccessive
  if (cloudCover > 70) rateo *= 0.3;
  else if (cloudCover > 60) rateo *= 0.6;

  rateo = Math.max(0.05, Math.round(rateo * 10) / 10);

  // --- 6. LABEL ---
  let label: string;
  let colore: string;

  if (rateo >= 4.0) {
    label = "Forte 🔥";
    colore = "#ef4444";
  } else if (rateo >= 3.0) {
    label = "Buona 🪂";
    colore = "#f97316";
  } else if (rateo >= 2.0) {
    label = "Moderata 🌤️";
    colore = "#eab308";
  } else if (rateo >= 1.0) {
    label = "Debole 🌥️";
    colore = "#84cc16";
  } else if (rateo >= 0.3) {
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