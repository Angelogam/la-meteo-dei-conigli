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
 * Se i dati sono nulli o incompleti, usa stime conservative basate
 * sulle condizioni meteorologiche disponibili.
 */
export function calcolaTermiche(h: HourData | undefined | null, altitude: number = 500): TermicheResult {
  if (!h || typeof h.temperature !== "number") {
    return { rateo: 0, base: altitude + 200, top: altitude + 400, forza: 0, attendibilita: 0 };
  }

  const temp = h.temperature;
  const dewPoint = h.dewPoint ?? temp - 8; // stima realistic se manca dew
  const windSpeed = h.windSpeed ?? 5;
  const cloudCover = h.cloudCover ?? 30;
  const humidity = h.humidity ?? 50;
  const precipitation = h.precipitation ?? 0;

  // Spread termico (differenza temp - dew) — driver principale delle termiche
  const spread = temp - dewPoint;
  let base = Math.round((spread * 125) + altitude);

  // Se la temperatura è sotto zero o spread negativo, termiche debolissime
  if (temp < 0 || spread < 0.5) {
    return { rateo: 0.1, base: altitude + 50, top: altitude + 150, forza: 0.1, attendibilita: 50 };
  }

  // Super-adiabatic gradient rate (fisico: 0.65°C/100m fino a condensa)
  // Rateo base = (spread / 80) * 3.5  MOLTO più realistico
  // Poi modulato da vento (troppo vento rompe le termiche), nuvole e pioggia
  let rateoBase = (spread / 10) * 0.8; // ~ 0.4-1.2 m/s per spread 5-15°C

  // Vento: ottimale 5-15 km/h, sotto 3 termiche deboli, sopra 20 le rompe
  const windFactor = windSpeed < 3
    ? 0.4
    : windSpeed <= 15
      ? 1.0 + (windSpeed - 5) * 0.03  // leggero boost fino a 15
      : Math.max(0.1, 1.3 - (windSpeed - 15) * 0.08);

  // Nuvolosità: cumuli aiutano (20-60%), nubi troppo alte/cielo coperto inibiscono
  const cloudFactor = cloudCover < 10
    ? 0.6                    // cielo sereno = termiche più deboli (sole forte, ma scarsi nuclei)
    : cloudCover <= 60
      ? 0.8 + (cloudCover / 60) * 0.4   // cumuli = 1.2x boost max
      : Math.max(0.3, 1.2 - (cloudCover - 60) * 0.025);

  // Pioggia: se pioggia > 0, termiche azzerate o quasi
  const rainFactor = precipitation > 0 ? Math.max(0.05, 1 - precipitation * 0.5) : 1.0;

  // Umidità: troppo secca = pochi nuclei, troppo umida = sviluppo limitato
  const humFactor = humidity < 30
    ? 0.5
    : humidity <= 70
      ? 0.7 + (humidity / 100) * 0.3
      : Math.max(0.2, 1.0 - (humidity - 70) * 0.02);

  let rateo = rateoBase * windFactor * cloudFactor * rainFactor * humFactor;

  // Limiti fisici realistici
  rateo = Math.max(0.0, Math.min(4.5, rateo));

  // Top termico basato su spread e vento (più realistico)
  const topIncrement = (spread * 80) + (windSpeed < 20 ? 200 : 0) + (cloudCover > 30 ? 150 : 0);
  const top = Math.max(base + 100, Math.round(altitude + topIncrement));

  const attendibilita = Math.round(
    ((dewPoint != null ? 30 : 0) + (h.windGusts != null ? 10 : 0) + 20) // campi realistici
  );

  return {
    rateo: Math.round(rateo * 10) / 10,
    base,
    top,
    forza: Math.round(rateo * 2) / 10,
    attendibilita: Math.min(100, attendibilita),
  };
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