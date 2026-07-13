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
  const { temperature, windSpeed, cloudCover, pressure, humidity, precipitation } = weather;

  // Gradiente termico adiabatico secco
  const GRADIENT = 0.0098; // °C/m

  // Temperatura potenziale (quanto è calda l'aria rispetto all'altitudine)
  const tempPotential = temperature + (altitude / 100) * 0.65;

  // Stima CAPE approssimato basato su temperatura e umidità
  const dewPoint = tempPotential - (100 - humidity) / 5;
  const deltaTemp = temperature - dewPoint; // Spread
  const cape = Math.max(0, Math.round(deltaTemp * 80 + (temperature > 20 ? 200 : 0)));

  // Velocità termica base (m/s) basata su CAPE
  const thermalSpeed = Math.sqrt(cape / 100) * 1.2;

  // Fattori correttivi basati su condizioni reali
  let correction = 1.0;

  // Vento: ideale 5-15 km/h per termiche organizzate
  if (windSpeed >= 5 && windSpeed <= 8) correction = 1.3;
  else if (windSpeed > 8 && windSpeed <= 12) correction = 1.5;
  else if (windSpeed > 12 && windSpeed <= 18) correction = 1.2;
  else if (windSpeed > 18 && windSpeed <= 25) correction = 0.8;
  else if (windSpeed > 25) correction = 0.4;
  else correction = 0.6; // Vento troppo debole

  // Nuvolosità: cumuli 10-30% = migliori termiche
  if (cloudCover >= 10 && cloudCover <= 30) correction *= 1.4;
  else if (cloudCover > 30 && cloudCover <= 50) correction *= 1.2;
  else if (cloudCover > 50 && cloudCover <= 70) correction *= 0.8;
  else if (cloudCover > 70) correction *= 0.3;
  else correction *= 0.9;

  // Umidità: 30-50% ideale
  if (humidity >= 30 && humidity <= 50) correction *= 1.2;
  else if (humidity > 50 && humidity <= 65) correction *= 1.0;
  else if (humidity > 65 && humidity <= 80) correction *= 0.7;
  else if (humidity > 80) correction *= 0.3;
  else correction *= 0.9;

  // Pressione: alta pressione = migliori termiche
  if (pressure && pressure >= 1020) correction *= 1.2;
  else if (pressure && pressure >= 1010) correction *= 1.0;
  else if (pressure && pressure >= 1000) correction *= 0.8;
  else if (pressure) correction *= 0.6;

  // Pioggia: blocca tutto
  if (precipitation > 0.5) {
    return {
      base: 0,
      top: 0,
      forza: 0,
      rateo: 0,
      label: "Niente termiche (pioggia)",
      colore: "#475569",
    };
  }

  // Velocità termica finale (m/s)
  const rateo = Math.round(Math.max(0.1, thermalSpeed * correction) * 10) / 10;

  // Forza termica 0-10
  const forza = Math.max(0, Math.min(10, Math.round((rateo / 4) * 10 * 10) / 10));

  // Base termica (m AGL) = Lifting Condensation Level
  const base = Math.round(Math.min(2500, Math.max(200, altitude + deltaTemp * 80)));

  // Top termica (m AGL) = base + potenza termica
  const top = Math.round(Math.min(4000, Math.max(base + 200, base + rateo * 400)));

  // Label e colore basati su rateo reale
  let label: string;
  let colore: string;

  if (rateo >= 3.5) {
    label = "Termiche forti 🔥";
    colore = "#ef4444";
  } else if (rateo >= 2.5) {
    label = "Buone termiche 🪂";
    colore = "#f97316";
  } else if (rateo >= 1.5) {
    label = "Termiche moderate 🌤️";
    colore = "#eab308";
  } else if (rateo >= 0.5) {
    label = "Termiche deboli 🌥️";
    colore = "#84cc16";
  } else {
    label = "Niente termiche ❌";
    colore = "#64748b";
  }

  // Vento forte: termiche disorganizzate
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
    rateo,
    label,
    colore,
  };
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

// Metri a salire
export function metriSalitaForza(forza: number, base: number, top: number): number {
  return Math.max(0, top - base);
}