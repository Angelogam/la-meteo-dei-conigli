"use client";

import type { HourData } from "@/types/meteo";

export interface TermicheData {
  base: number;
  top: number;
  forza: number;
  rateo: number;
  label: string;
  colore: string;
  turbolenza: "alta" | "media" | "bassa";
  stabilita: number; // 0-100 indice di stabilità/comfort
}

export function calcolaTermiche(params: {
  hour: number;
  temperature: number;
  windSpeed: number;
  windGust: number;
  humidity: number;
  cloudCover: number;
  pressure: number;
}): TermicheData {
  const { hour, temperature, windSpeed, windGust, humidity, cloudCover, pressure } = params;

  // Fattori base
  const tempFactor = Math.max(0, (temperature - 12) / 28);
  const windIdeal = Math.max(0, 1 - Math.abs(windSpeed - 10) / 25);
  const gustPenalty = Math.max(0, 1 - (windGust - windSpeed) / 30);
  const humidityIdeal = Math.max(0, 1 - Math.abs(humidity - 40) / 60);
  const cloudIdeal = (() => {
    if (cloudCover <= 10) return 1.0;
    if (cloudCover <= 30) return 0.9;
    if (cloudCover <= 60) return 0.7;
    return 0.4;
  })();
  const pressureFactor = Math.max(0, (pressure - 1000) / 30);

  const hourFactor = (() => {
    if (hour >= 10 && hour <= 15) return 1.0;
    if (hour >= 8 && hour <= 9) return 0.7 + (hour - 8) * 0.15;
    if (hour === 16) return 0.6;
    if (hour === 17) return 0.4;
    if (hour === 18) return 0.25;
    if (hour >= 7) return 0.4;
    return 0.1;
  })();

  const isLateAfternoon = hour >= 16;
  const windModerate = windSpeed >= 8 && windSpeed <= 18;

  const dolcezzaFactor = (() => {
    if (!isLateAfternoon) return 1.0;
    if (windModerate) return 0.85;
    return 0.9;
  })();

  const forzaBase = tempFactor * windIdeal * humidityIdeal * cloudIdeal * pressureFactor * hourFactor;
  const forzaArrotondata = Math.round(forzaBase * 10 * dolcezzaFactor) / 10;
  const forza = Math.min(10, Math.max(0, forzaArrotondata));

  const turbolenza: "alta" | "media" | "bassa" = (() => {
    if (isLateAfternoon && windModerate) return "bassa";
    if (windGust - windSpeed > 15 || windSpeed > 25) return "alta";
    if (windGust - windSpeed > 8 || windSpeed > 18) return "media";
    return "bassa";
  })();

  const stabilita = (() => {
    let stab = 50;
    if (isLateAfternoon && windModerate) stab += 30;
    if (windSpeed > 25) stab -= 20;
    else if (windSpeed > 18) stab -= 10;
    if (windGust - windSpeed > 12) stab -= 15;
    if (cloudCover <= 20) stab += 10;
    if (hour >= 17) stab += 10;
    return Math.min(100, Math.max(0, stab));
  })();

  const rateoBase = 1.0 + forza * 0.45;
  const rateo = Math.round(rateoBase * dolcezzaFactor * 10) / 10;

  const base = Math.round(400 + temperature * 20 + forza * 50);
  const top = Math.round(base + 200 + forza * 180);

  const label = (() => {
    if (forza >= 7) return "Forti";
    if (forza >= 5) return "Buone";
    if (forza >= 3) return (isLateAfternoon && windModerate) ? "Moderate/dolci" : "Moderate";
    if (forza >= 1) return (isLateAfternoon && windModerate) ? "Deboli/dolci" : "Deboli";
    return "Assenti";
  })();

  const colore = (() => {
    if (forza >= 7) return "#ef4444";
    if (forza >= 5) return "#f97316";
    if (forza >= 3) return "#eab308";
    if (forza >= 1) return "#84cc16";
    return "#64748b";
  })();

  return { base, top, forza, rateo, label, colore, turbolenza, stabilita };
}

/** Genera i dati termici orari per le ore 9-19 a partire dai dati meteo orari */
export function generaTermicheOrarie(
  dayData: HourData[],
  altitude: number
): { hour: number; termiche: TermicheData }[] {
  if (!dayData || dayData.length === 0) return [];

  return dayData
    .filter((h) => {
      const hh = h.time.getHours();
      return hh >= 9 && hh <= 19;
    })
    .map((h) => ({
      hour: h.time.getHours(),
      termiche: calcolaTermiche({
        hour: h.time.getHours(),
        temperature: h.temperature,
        windSpeed: h.windSpeed,
        windGust: h.windGust ?? h.windSpeed,
        humidity: h.humidity,
        cloudCover: h.cloudCover,
        pressure: h.pressure ?? 1013,
      }),
    }));
}