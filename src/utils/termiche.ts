"use client";

import type { HourData } from "@/types/meteo";

interface TermicheResult {
  rateo: number;
  base: number;
  top: number;
  forza: number;
  attendibilita: number;
}

/**
 * Calcola le termiche a partire dai dati orari reali (Open‑Meteo).
 * Versione REALISTICA: produce 1.0-2.5 m/s in condizioni normali,
 * 0.0-0.5 in condizioni avverse, 3.0-4.0 in condizioni eccellenti.
 */
export function calcolaTermiche(h: HourData | undefined | null, altitude: number = 500): TermicheResult {
  if (!h || typeof h.temperature !== "number") {
    return { rateo: 0.5, base: altitude + 200, top: altitude + 400, forza: 0.5, attendibilita: 30 };
  }

  const temp = h.temperature;
  const dewPoint = h.dewPoint ?? temp - 8;
  const windSpeed = h.windSpeed ?? 5;
  const cloudCover = h.cloudCover ?? 30;
  const humidity = h.humidity ?? 50;
  const precipitation = h.precipitation ?? 0;
  const ora = new Date(h.time).getHours();

  // Se piove o temporale -> zero
  if (precipitation > 1 || h.weatherCode >= 95) {
    return { rateo: 0, base: altitude + 50, top: altitude + 100, forza: 0, attendibilita: 90 };
  }

  // Spread termico
  const spread = temp - dewPoint;

  // Se freddo o spread nullo
  if (temp < 5 || spread < 1) {
    return { rateo: 0.2, base: altitude + 50, top: altitude + 200, forza: 0.2, attendibilita: 70 };
  }

  // ===== CALCOLO RATEO BASE =====
  // Spread 5°C → 0.8 m/s, 10°C → 1.5 m/s, 15°C → 2.2 m/s, 20°C → 3.0 m/s
  let rateo = 0.15 * spread + 0.05;

  // Bonus ora del giorno: 11:00-15:00 è il picco
  if (ora >= 11 && ora <= 15) rateo += 0.4;
  else if (ora >= 9 && ora <= 10) rateo += 0.2;
  else if (ora >= 16 && ora <= 17) rateo += 0.1;
  else if (ora < 8 || ora > 18) rateo *= 0.3;

  // Bonus vento: 5-15 km/h aiuta, sotto 3 indebolisce, sopra 20 rompe
  if (windSpeed >= 5 && windSpeed <= 15) rateo += 0.3;
  else if (windSpeed > 15 && windSpeed <= 22) rateo -= 0.2;
  else if (windSpeed > 22) rateo -= 0.5;
  else if (windSpeed < 3) rateo -= 0.3;

  // Bonus nuvolosità: 15-50% è ideale (cumuli)
  if (cloudCover >= 15 && cloudCover <= 50) rateo += 0.2;
  else if (cloudCover > 70) rateo -= 0.5;
  else if (cloudCover > 50) rateo -= 0.2;

  // Bonus temperatura
  if (temp >= 22 && temp <= 30) rateo += 0.3;
  else if (temp >= 18 && temp < 22) rateo += 0.1;
  else if (temp > 30) rateo += 0.1;

  // Penalità umidità eccessiva
  if (humidity > 70) rateo -= 0.3;
  else if (humidity > 85) rateo -= 0.6;

  // Pioggia leggera
  if (precipitation > 0.3) rateo *= 0.5;
  if (precipitation > 0.8) rateo = 0.2;

  // Limiti
  rateo = Math.max(0, Math.min(4.5, rateo));

  // Arrotonda
  rateo = Math.round(rateo * 10) / 10;

  // ===== BASE TERMICA =====
  const base = Math.round(Math.max(altitude + 100, Math.min(altitude + 2500, spread * 125 + altitude)));

  // ===== TOP TERMICO =====
  const topIncrement = rateo * 400 + spread * 30;
  const top = Math.round(Math.max(base + 200, altitude + topIncrement));

  // ===== FORZA (0-10) =====
  const forza = Math.round(Math.min(10, Math.max(0, rateo * 2.5)));

  // ===== ATTENDIBILITÀ =====
  const attendibilita = Math.min(100, Math.round(40 + (h.dewPoint != null ? 20 : 0) + (h.windGusts != null ? 10 : 0) + (rateo > 0.5 ? 20 : 0)));

  return { rateo, base, top, forza, attendibilita };
}

/**
 * Calcola le termiche cumulativamente su un array di ore
 */
export function calcolaTermicheBatch(dayData: HourData[], altitude: number) {
  return dayData
    .filter(h => h && h.time)
    .map(h => ({
      ora: new Date(h.time).getHours(),
      termiche: calcolaTermiche(h, altitude),
    }));
}