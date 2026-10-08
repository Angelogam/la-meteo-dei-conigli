"use client";

import type { HourData } from "@/types/meteo";
import { calcCloudBase } from "@/utils/calcCloudBase";

interface TermicheResult {
  rateo: number;
  base: number;
  top: number;
  forza: number;
  attendibilita: number;
}

/**
 * Calcola le termiche a partire dai dati orari reali (Open‑Meteo).
 * PRODUCE VALORI REALISTICI: 1.0-3.5 m/s in condizioni normali,
 * 0.3-0.9 in condizioni deboli, 0.0-0.2 in caso di pioggia/temporale.
 */
export function calcolaTermiche(h: HourData | undefined | null, altitude: number = 500): TermicheResult {
  if (!h || typeof h.temperature !== "number") {
    return { rateo: 0.5, base: altitude + 200, top: altitude + 400, forza: 0.5, attendibilita: 30 };
  }

  const temp = h.temperature;
  // Usa dew point REALE dall'API — nessun fallback inventato
  const dewPoint = (h.dewPoint != null && h.dewPoint > -10) ? h.dewPoint : null;
  if (dewPoint == null) {
    return { rateo: 0.5, base: altitude + 200, top: altitude + 400, forza: 0.5, attendibilita: 30 };
  }
  // Dati reali Open-Meteo, nessun fallback artificiale
  const windSpeed = h.windSpeed;
  const cloudCover = h.cloudCover;
  const humidity = h.humidity;
  const precipitation = h.precipitation;
  const weatherCode = h.weatherCode;
  const ora = new Date(h.time).getHours();

  // Se piove o temporale -> termiche debolissime o zero
  if ((precipitation != null && precipitation > 1) || (weatherCode != null && weatherCode >= 95)) {
    return { rateo: 0, base: altitude + 50, top: altitude + 100, forza: 0, attendibilita: 90 };
  }

  // Se precipitation > 0.3 ma < 1, termiche molto deboli
  if (precipitation != null && precipitation > 0.3) {
    return { rateo: 0.3, base: altitude + 100, top: altitude + 200, forza: 0.3, attendibilita: 80 };
  }

  // Spread termico (differenza temp - dew) — valore reale, nessun minimo artificiale
  const spread = temp - dewPoint;

  // Se fa molto freddo
  if (temp < 5) {
    return { rateo: 0.2, base: altitude + 50, top: altitude + 150, forza: 0.2, attendibilita: 60 };
  }

  // ===== CALCOLO RATEO PRINCIPALE =====
  // Spread 3°C → 1.0 m/s, 6°C → 1.8 m/s, 10°C → 2.5 m/s, 15°C → 3.5 m/s
  // Formula: spread * 0.25 + 0.25
  let rateo = spread * 0.25 + 0.25;

  // Bonus ora del giorno (picco 11-15)
  if (ora >= 11 && ora <= 15) rateo += 0.5;
  else if (ora >= 9 && ora <= 10) rateo += 0.3;
  else if (ora >= 16 && ora <= 17) rateo += 0.2;
  else if (ora < 8 || ora > 18) rateo = Math.min(rateo, 0.5);

  // Vento: usa dato reale quando disponibile
  if (windSpeed != null) {
    if (windSpeed >= 5 && windSpeed <= 15) rateo += 0.4;
    else if (windSpeed > 15 && windSpeed <= 22) rateo -= 0.3;
    else if (windSpeed > 22) rateo -= 0.6;
    else if (windSpeed < 3) rateo -= 0.4;
  }

  // Nuvolosità: usa dato reale quando disponibile
  if (cloudCover != null) {
    if (cloudCover >= 15 && cloudCover <= 50) rateo += 0.3;
    else if (cloudCover > 70) rateo -= 0.6;
    else if (cloudCover > 50) rateo -= 0.3;
  }

  // Temperatura alta = più energia
  if (temp >= 25 && temp <= 32) rateo += 0.4;
  else if (temp >= 20 && temp < 25) rateo += 0.2;
  else if (temp > 32) rateo += 0.2;

  // Umidità: usa dato reale quando disponibile
  if (humidity != null) {
    if (humidity > 75) rateo -= 0.4;
    else if (humidity > 85) rateo -= 0.7;
  }

  // Clamp e arrotonda
  rateo = Math.max(0.1, Math.min(4.5, rateo));
  rateo = Math.round(rateo * 10) / 10;

  // ===== BASE TERMICA (LCL) =====
  const base = Math.max(altitude + 100, calcCloudBase(altitude, temp, dewPoint));

  // ===== TOP TERMICO =====
  const topIncrement = rateo * 400 + spread * 50;
  const top = Math.max(base + 150, Math.round(altitude + topIncrement));

  // ===== FORZA (0-10) =====
  const forza = Math.min(10, Math.max(1, Math.round(rateo * 2.5)));

  // ===== ATTENDIBILITÀ =====
  const attendibilita = Math.min(100, Math.round(
    50 + (h.dewPoint != null && h.dewPoint > -10 ? 20 : 0) +
    (h.windGusts != null ? 10 : 0) +
    (rateo > 0.5 ? 15 : 0)
  ));

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