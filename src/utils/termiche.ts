"use client";

import type { HourData } from "@/types/meteo";

export interface TermicheData {
  rateo: number;
  forza: number;
  base: number;
  top: number;
  label: string;
  colore: string;
  gradienteReale: number;
}

/**
 * Calcola le termiche per una data ora meteo.
 * BASE e TOP sono in metri sul livello del mare (slm).
 * 
 * Formula:
 * - LCL (base termica) = (temp - dew) × 125 + altitude (slm)
 * - TOP = base + spessore stimato da CAPE / gradiente
 * - RATEO = (forza / 10) × 4 (m/s)
 */
export function calcolaTermiche(weather: HourData | any, altitude: number): TermicheData {
  const alt = altitude ?? 1000;

  if (!weather) {
    return { rateo: 0, forza: 0, base: 0, top: 0, label: "N/D", colore: "#475569", gradienteReale: 0 };
  }

  const temp = weather.temperature ?? 15;
  const dew = weather.dewPoint ?? (temp - 8);
  const hum = weather.humidity ?? 60;
  const windSpeed = weather.windSpeed ?? 10;
  const cloudCover = weather.cloudCover ?? 30;
  const precipitation = weather.precipitation ?? 0;
  const temp80m = weather.temp80m ?? null;
  const temp120m = weather.temp120m ?? null;

  // 1. Spread (differenza tra T e Td)
  const spread = Math.max(0.5, temp - dew);

  // 2. BASE TERMICA = LCL (sollevamento per convezione) IN METRI SUL LIVELLO DEL MARE
  const lclSopraSuolo = Math.round(spread * 125);
  const base = Math.max(alt + 100, Math.min(alt + 3000, alt + lclSopraSuolo));

  // 3. GRADIENTE TERMICO VERTICALE REALE (da temperature_80m / 120m)
  let gradiente = 0.98;
  if (temp80m != null) {
    gradiente = ((temp - temp80m) / 78) * 100;
  } else if (temp120m != null) {
    gradiente = ((temp - temp120m) / 118) * 100;
  }

  // 4. FORZA TERMICA (0-10)
  let forza = 0;

  if (gradiente >= 1.2) forza += 3;
  else if (gradiente >= 0.98) forza += 2;
  else if (gradiente >= 0.7) forza += 1;

  if (windSpeed >= 5 && windSpeed <= 15) forza += 2;
  else if (windSpeed >= 3 && windSpeed < 5) forza += 1.5;
  else if (windSpeed > 15 && windSpeed <= 22) forza += 1;

  if (cloudCover >= 15 && cloudCover <= 45) forza += 2;
  else if (cloudCover >= 5 && cloudCover < 15) forza += 1.5;

  if (hum >= 30 && hum <= 50) forza += 1.5;
  else if (hum > 50 && hum <= 65) forza += 1;

  if (spread >= 10) forza += 1.5;
  else if (spread >= 6) forza += 1;
  else if (spread >= 3) forza += 0.5;

  if (precipitation > 1) forza = 0;

  forza = Math.max(0, Math.min(10, Math.round(forza * 10) / 10));

  // 5. TOP TERMICO (slm) = base + spessore stimato
  const spessore = Math.round(forza * 250);
  const top = Math.min(alt + 5000, base + spessore);

  // 6. RATEO (m/s)
  let rateo = (forza / 10) * 4;
  if (precipitation > 1) rateo = 0;
  rateo = Math.max(0.05, Math.round(rateo * 10) / 10);

  // 7. Label e colore
  let label: string;
  let colore: string;

  if (rateo >= 4.0) { label = "Forti"; colore = "#ef4444"; }
  else if (rateo >= 3.0) { label = "Buone"; colore = "#f97316"; }
  else if (rateo >= 2.0) { label = "Moderate"; colore = "#eab308"; }
  else if (rateo >= 1.0) { label = "Deboli"; colore = "#84cc16"; }
  else if (rateo >= 0.3) { label = "M. deboli"; colore = "#6b7280"; }
  else { label = "Assenti"; colore = "#475569"; }

  return {
    rateo,
    forza,
    base,
    top,
    label,
    colore,
    gradienteReale: Math.round(gradiente * 100) / 100,
  };
}