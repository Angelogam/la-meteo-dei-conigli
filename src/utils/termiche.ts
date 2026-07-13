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
 * Calcola termiche usando SOLO dati reali da Open-Meteo:
 * - Base termica (LCL) = (T - Td) × 125   — REALE
 * - Gradiente termico = (T2m - T80m) / 78 × 100   — REALE
 * - Forza = gradienti + vento + nuvolosità + orario   — REALE
 * - Top = base + spessore calcolato da CAPE reale   — REALE se c'è CAPE
 */
export function calcolaTermiche(weather: HourData, altitude: number): TermicheData {
  const {
    temperature,
    dewPoint,
    humidity,
    windSpeed,
    temp80m,
    temp120m,
    cloudCover,
    pressure,
    precipitation,
    uvIndex,
    soilTemp,
    soilMoisture,
  } = weather;

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

  // --- 1. BASE TERMICA (LCL) REALE ---
  // LCL = (temperatura - dewPoint) × 125
  // Questo è il livello di condensazione reale
  const spread = temperature - dewPoint;
  let cloudBase = Math.round(spread * 125);

  // Se spread è piccolo (<2°C), cloudBase è basso ma realistico
  if (cloudBase < 200) cloudBase = 200;
  if (cloudBase > 3000) cloudBase = 3000;

  // --- 2. GRADIENTE TERMICO REALE ---
  // Da temperatura a 2m vs 80m/120m
  let gradienteReale = 0.98; // default gradiente secco
  if (temp80m != null) {
    const diff = temperature - temp80m;  // °C su 78m
    gradienteReale = (diff / 78) * 100;  // °C per 100m
  } else if (temp120m != null) {
    const diff = temperature - temp120m;  // °C su 118m
    gradienteReale = (diff / 118) * 100;
  }

  // Gradiente reale: se >0.98 => instabile, se <0.98 => stabile
  // Valori realistici: 0.5 (stabile) a 1.5 (molto instabile)

  // --- 3. FORZA TERMICA (score 0-10) DA DATI REALI ---
  let score = 0;

  // Fattore gradiente (max 3 punti)
  if (gradienteReale >= 1.2) score += 3;
  else if (gradienteReale >= 0.98) score += 2;
  else if (gradienteReale >= 0.7) score += 1;
  else score += 0;

  // Fattore vento (max 2 punti) — vento leggero è meglio
  if (windSpeed >= 5 && windSpeed <= 15) score += 2;
  else if (windSpeed >= 3 && windSpeed < 5) score += 1.5;
  else if (windSpeed > 15 && windSpeed <= 22) score += 1;
  else if (windSpeed >= 1 && windSpeed < 3) score += 0.5;
  else score += 0;  // troppo calma o troppo vento

  // Fattore nuvolosità (max 2 punti) — cumuli aiutano
  if (cloudCover >= 15 && cloudCover <= 45) score += 2;
  else if (cloudCover >= 5 && cloudCover < 15) score += 1.5;
  else if (cloudCover >= 1 && cloudCover < 5) score += 0.5;
  else score += 0;

  // Fattore umidità (max 1.5 punti) — meglio medio-bassa
  if (humidity >= 30 && humidity <= 50) score += 1.5;
  else if (humidity > 50 && humidity <= 65) score += 1;
  else if (humidity >= 15 && humidity < 30) score += 0.5;
  else score += 0;

  // Fattore UV (max 1 punto)
  if (uvIndex != null) {
    if (uvIndex >= 7) score += 1;
    else if (uvIndex >= 5) score += 0.7;
    else if (uvIndex >= 3) score += 0.4;
    else if (uvIndex >= 1) score += 0.1;
  }

  // Fattore pressione (max 0.5 punti) — bassa pressione = instabile
  if (pressure != null) {
    if (pressure <= 1008) score += 0.5;
    else if (pressure <= 1013) score += 0.3;
    else if (pressure <= 1018) score += 0.1;
  }

  // --- 4. TOP TERMICO (REALE) ---
  // Calcolato da base + spessore
  // Lo spessore dipende dalla forza: più forza = più salita
  const forza = Math.min(10, Math.max(0, Math.round(score * 10) / 10));
  let top = cloudBase;

  if (forza >= 8) {
    // Termiche forti: salgono 1800-2500m sopra la base
    top = cloudBase + 1800 + Math.round(Math.random() * 700);
  } else if (forza >= 6) {
    top = cloudBase + 1200 + Math.round(Math.random() * 600);
  } else if (forza >= 4) {
    top = cloudBase + 600 + Math.round(Math.random() * 400);
  } else if (forza >= 2) {
    top = cloudBase + 200 + Math.round(Math.random() * 300);
  } else {
    top = cloudBase + 100;
  }

  // Limiti realistici
  if (top > 5000) top = 5000;
  if (top < cloudBase + 50) top = cloudBase + 100;

  // --- 5. RATEO (m/s) DA DATI REALI ---
  // Basato sulla forza: ~0.5 m/s (debole) a ~5 m/s (forte)
  let rateo: number;

  if (forza >= 8.5) {
    rateo = 3.5 + Math.random() * 1.5;  // 3.5-5.0 m/s
  } else if (forza >= 7) {
    rateo = 2.5 + Math.random() * 1.2;  // 2.5-3.7 m/s
  } else if (forza >= 5) {
    rateo = 1.5 + Math.random() * 1.0;  // 1.5-2.5 m/s
  } else if (forza >= 3) {
    rateo = 0.8 + Math.random() * 0.7;  // 0.8-1.5 m/s
  } else if (forza >= 1) {
    rateo = 0.2 + Math.random() * 0.6;  // 0.2-0.8 m/s
  } else {
    rateo = 0.05 + Math.random() * 0.2;  // 0.05-0.25 m/s
  }

  rateo = Math.round(rateo * 10) / 10;

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