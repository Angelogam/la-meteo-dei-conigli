"use client";

import type { HourData } from "@/types/meteo";

export interface TermicheData {
  base: number;         // Quota base termica (m)
  top: number;          // Quota massima raggiungibile (m)
  forza: number;        // Forza termica 0-10
  rateo: number;        // Rateo di salita (m/s)
  label: string;        // Descrizione
  colore: string;       // Colore esadecimale
}

export function calcolaTermiche(weather: HourData, altitude: number): TermicheData {
  const { temperature, windSpeed, cloudCover, pressure, humidity } = weather;

  // Temperatura base (per calcoli)
  const tempBase = temperature + (altitude / 100) * 0.65; // Temperatura al livello del mare approssimata

  // Stima del gradiente termico (più alto = meglio)
  const tempGradient = Math.max(0.3, Math.min(1.5, (tempBase - temperature) / 20));

  // Forza base del vento per le termiche
  // Vento leggero (5-15 km/h) aiuta le termiche
  let ventoForza = 1;
  if (windSpeed >= 5 && windSpeed <= 8) ventoForza = 1.3;
  else if (windSpeed > 8 && windSpeed <= 12) ventoForza = 1.5;
  else if (windSpeed > 12 && windSpeed <= 18) ventoForza = 1.2;
  else if (windSpeed > 18 && windSpeed <= 25) ventoForza = 0.8;
  else if (windSpeed > 25) ventoForza = 0.4;
  else ventoForza = 0.6; // Vento troppo debole

  // Nuvolosità (cumuli = buone termiche)
  let nuvoleForza = 1;
  if (cloudCover >= 10 && cloudCover <= 30) nuvoleForza = 1.4;  // Cumuli di bel tempo
  else if (cloudCover > 30 && cloudCover <= 50) nuvoleForza = 1.2;
  else if (cloudCover > 50 && cloudCover <= 70) nuvoleForza = 0.8;
  else if (cloudCover > 70) nuvoleForza = 0.3;  // Troppo nuvoloso
  else nuvoleForza = 0.9; // Cielo sereno (termiche più deboli ma presenti)

  // Umidità
  let umiditaForza = 1;
  if (humidity >= 30 && humidity <= 50) umiditaForza = 1.2;
  else if (humidity > 50 && humidity <= 65) umiditaForza = 1.0;
  else if (humidity > 65 && humidity <= 80) umiditaForza = 0.7;
  else if (humidity > 80) umiditaForza = 0.3;
  else umiditaForza = 0.9; // Molto secco

  // Pressione (alta pressione = migliori termiche)
  let pressForza = 1;
  if (pressure && pressure >= 1020) pressForza = 1.2;
  else if (pressure && pressure >= 1010) pressForza = 1.0;
  else if (pressure && pressure >= 1000) pressForza = 0.8;
  else pressForza = 0.6;

  // Pioggia blocca tutto
  if (weather.precipitation > 0.5) {
    return {
      base: 0,
      top: 0,
      forza: 0,
      rateo: 0,
      label: "Niente termiche (pioggia)",
      colore: "#475569",
    };
  }

  // Calcolo forza finale (0-10)
  const rawForza = tempGradient * ventoForza * nuvoleForza * umiditaForza * pressForza * 3.5;
  const forza = Math.max(0, Math.min(10, Math.round(rawForza * 10) / 10));

  // Calcolo base termica (m AGL)
  const tempDiff = Math.max(2, temperature - (dewPointEstimate(temperature, humidity) || 5));
  const base = Math.round(Math.min(2500, Math.max(200, altitude + tempDiff * 80 * (cloudCover > 50 ? 0.6 : 1))));

  // Calcolo top termica (m AGL)
  const topDiff = tempDiff * 120 * (forza / 5);
  const top = Math.round(Math.min(4000, Math.max(base + 200, base + topDiff)));

  // Rateo di salita (m/s)
  const rateo = Math.round((forza / 10) * 4 * 10) / 10;

  // Label e colore
  let label: string;
  let colore: string;

  if (forza >= 7) {
    label = "Termiche forti 🔥";
    colore = "#ef4444"; // Rosso
  } else if (forza >= 5) {
    label = "Buone termiche 🪂";
    colore = "#f97316"; // Arancione
  } else if (forza >= 3) {
    label = "Termiche moderate 🌤️";
    colore = "#eab308"; // Giallo
  } else if (forza >= 1) {
    label = "Termiche deboli 🌥️";
    colore = "#84cc16"; // Verde chiaro
  } else {
    label = "Niente termiche ❌";
    colore = "#64748b"; // Grigio
  }

  // Se vento troppo forte, termiche disorganizzate
  if (windSpeed > 30) {
    return {
      base: Math.round(altitude + 50),
      top: Math.round(altitude + 100),
      forza: 0.5,
      rateo: 0.1,
      label: "Vento forte - termiche disorganizzate 💨",
      colore: "#94a3b8",
    };
  }

  return {
    base,
    top,
    forza,
    rateo: Math.max(0.1, rateo),
    label,
    colore,
  };
}

function dewPointEstimate(temp: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * temp) / (b + temp) + Math.log(humidity / 100);
  return (b * gamma) / (a - gamma);
}

// Genera dati termici per tutte le ore 9-19
export function generaTermicheOrarie(
  hourlyData: HourData[],
  altitude: number
): { hour: number; termiche: TermicheData }[] {
  return hourlyData.map((h) => ({
    hour: h.time.getHours(),
    termiche: calcolaTermiche(h, altitude),
  }));
}

// Soglie per i metri a salire
export function metriSalitaForza(forza: number, base: number, top: number): number {
  return Math.max(0, top - base);
}