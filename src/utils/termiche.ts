"use client";

import type { HourData } from "@/types/meteo";

export interface TermicheData {
  base: number;         // Quota base termica (m AGL)
  top: number;          // Quota massima raggiungibile (m AGL)
  forza: number;        // Forza termica 0-10
  rateo: number;        // Rateo di salita (m/s)
  label: string;        // Descrizione
  colore: string;       // Colore esadecimale
  gradienteReale: number; // Gradiente termico reale °C/100m (per debugging/trasparenza)
}

/**
 * Calcola le termiche usando parametri reali da Open-Meteo:
 * - Gradiente termico verticale reale (se disponibile: diff temp 2m vs 80m/120m)
 * - Vento a diverse quote (10m, 80m, 120m, 180m)
 * - Pressione atmosferica
 * - UV index
 * - Temperatura suolo
 * - Spread temperatura-rugiada per base nuvole
 */
export function calcolaTermiche(weather: HourData, altitude: number): TermicheData {
  const {
    temperature, dewPoint, humidity, windSpeed, windDir,
    wind80m, windDir80m,
    wind120m, windDir120m,
    wind180m, windDir180m,
    temp80m, temp120m,
    cloudCover, pressure, precipitation, uvIndex,
    soilTemp, soilMoisture,
  } = weather;

  // Se piove, niente termiche
  if (precipitation > 1) {
    return {
      base: 0, top: 0, forza: 0, rateo: 0,
      label: "Niente termiche (pioggia)",
      colore: "#475569", gradienteReale: 0,
    };
  }

  // --- 1. Gradiente termico reale (se possibile) ---
  // Gradiente secco adiabatico: ~0.98°C/100m
  const GRADIENTE_SECCO = 0.98;
  let gradienteReale = GRADIENTE_SECCO; // fallback

  if (temp80m != null) {
    // Gradiente tra 2m e 80m
    const diffAlt = 80 - 2; // 78m
    const diffTemp = temperature - temp80m;
    gradienteReale = (diffTemp / diffAlt) * 100; // °C/100m
  } else if (temp120m != null) {
    const diffAlt = 120 - 2;
    const diffTemp = temperature - temp120m;
    gradienteReale = (diffTemp / diffAlt) * 100;
  }

  // --- 2. Spread temperatura-rugiada (base nuvole) ---
  const spread = temperature - dewPoint;
  const cloudBase = Math.round(Math.max(100, spread * 125)); // LCL approssimato in metri AGL

  // --- 3. CAPE stimato realistico ---
  // Base: spread * 80 + correzione per umidità e gradiente
  let capeBase = spread * 80;
  if (gradienteReale > GRADIENTE_SECCO) capeBase *= 1.4; // sovra-adiabatico = forte
  else if (gradienteReale > GRADIENTE_SECCO * 0.7) capeBase *= 1.0;
  else capeBase *= 0.5; // gradiente debole

  // bonus temperatura
  if (temperature > 25) capeBase += 300;
  else if (temperature > 20) capeBase += 200;
  else if (temperature > 15) capeBase += 100;

  // bonus UV
  if (uvIndex != null && uvIndex > 5) capeBase *= 1.3;
  else if (uvIndex != null && uvIndex > 3) capeBase *= 1.1;

  // bonus suolo caldo
  if (soilTemp != null && soilTemp > temperature) capeBase *= 1.2;
  else if (soilTemp != null && soilTemp < temperature - 5) capeBase *= 0.7;

  // bonus pressione alta
  if (pressure != null && pressure > 1020) capeBase *= 1.2;
  else if (pressure != null && pressure < 1005) capeBase *= 0.6;

  const cape = Math.max(0, Math.round(capeBase));

  // --- 4. Velocità termica base da CAPE ---
  // formula: v = sqrt(2 * CAPE / H) dove H è spessore strato convettivo
  const H = Math.max(300, cloudBase + 500);
  const thermalSpeed = Math.sqrt(Math.max(0.01, (2 * cape) / H)) * 3.6; // in m/s

  // --- 5. Fattori correttivi basati su vento reale in quota ---

  // Vento medio al suolo e shear verticale
  const avgWind10m = windSpeed || 0;
  const avgWind80m = wind80m ?? avgWind10m * 1.3;
  const avgWind120m = wind120m ?? avgWind80m * 1.15;
  const avgWind180m = wind180m ?? avgWind120m * 1.1;

  // Shear verticale: differenza di velocità tra 10m e 180m
  const windShear = Math.abs(avgWind180m - avgWind10m);

  // Vento ideale per termiche organizzate: 8-18 km/h al suolo  
  // Vento troppo debole (<5) = termiche non si staccano
  // Vento troppo forte (>25) = termiche disorganizzate, turbolenza
  let windFactor: number;
  if (avgWind10m >= 8 && avgWind10m <= 18) windFactor = 1.3; // perfetto
  else if (avgWind10m >= 5 && avgWind10m < 8) windFactor = 1.0;
  else if (avgWind10m >= 18 && avgWind10m <= 25) windFactor = 0.7;
  else if (avgWind10m < 5) windFactor = 0.4; // calma
  else windFactor = 0.3; // vento forte

  // Penalità per wind shear verticale eccessivo
  if (windShear > 15) windFactor *= 0.6;
  else if (windShear > 10) windFactor *= 0.8;

  // Rotazione del vento con la quota (directions)
  // Se c'è troppa rotazione, le termiche si inclinano
  let dirShear = 0;
  if (windDir != null && windDir80m != null) {
    let diff = Math.abs(windDir80m - windDir);
    if (diff > 180) diff = 360 - diff;
    dirShear = diff;
  }
  if (dirShear > 60) windFactor *= 0.7;
  else if (dirShear > 30) windFactor *= 0.9;

  // --- 6. Nuvolosità ---
  // Cumuli 10-40% = migliori termiche (ci sono nuvole che segnalano termiche)
  let cloudFactor: number;
  if (cloudCover >= 10 && cloudCover <= 40) cloudFactor = 1.3;
  else if (cloudCover >= 5 && cloudCover < 10) cloudFactor = 1.1;
  else if (cloudCover > 40 && cloudCover <= 60) cloudFactor = 0.8;
  else if (cloudCover > 60 && cloudCover <= 80) cloudFactor = 0.4;
  else if (cloudCover > 80) cloudFactor = 0.1;
  else cloudFactor = 0.7; // <5% cielo sereno = termiche deboli (mancano i "marcatori")

  // --- 7. Umidità ---
  let humidityFactor: number;
  if (humidity >= 30 && humidity <= 50) humidityFactor = 1.2;
  else if (humidity > 50 && humidity <= 65) humidityFactor = 1.0;
  else if (humidity > 65 && humidity <= 80) humidityFactor = 0.6;
  else if (humidity > 80) humidityFactor = 0.2;
  else humidityFactor = 0.8; // <30%

  // --- 8. Pressione ---
  let pressureFactor: number;
  if (pressure != null) {
    if (pressure >= 1020) pressureFactor = 1.3;
    else if (pressure >= 1013) pressureFactor = 1.1;
    else if (pressure >= 1005) pressureFactor = 0.8;
    else pressureFactor = 0.5;
  } else {
    pressureFactor = 1.0;
  }

  // --- 9. Correzione per ora del giorno (non più del giorno) ---
  // Le termiche sono più forti tra 11:00 e 15:00
  const hour = weather.time?.getHours() ?? 12;
  let hourFactor = 1.0;
  if (hour >= 11 && hour <= 15) hourFactor = 1.3;
  else if (hour >= 9 && hour < 11) hourFactor = 0.8;
  else if (hour > 15 && hour <= 18) hourFactor = 0.6;
  else hourFactor = 0.1; // fuori finestra

  // --- 10. Calcolo finale ---
  const rateo = Math.round(
    Math.max(0.05, thermalSpeed * windFactor * cloudFactor * humidityFactor * pressureFactor * hourFactor) * 10
  ) / 10;

  // --- Label e colore ---
  let label: string;
  let colore: string;

  if (rateo >= 4.0) { label = "🔥 Termiche forti"; colore = "#ef4444"; }
  else if (rateo >= 3.0) { label = "🪂 Buone termiche"; colore = "#f97316"; }
  else if (rateo >= 2.0) { label = "🌤️ Termiche moderate"; colore = "#eab308"; }
  else if (rateo >= 1.0) { label = "🌥️ Termiche deboli"; colore = "#84cc16"; }
  else if (rateo >= 0.3) { label = "☁️ Termiche molto deboli"; colore = "#6b7280"; }
  else { label = "❌ Niente termiche"; colore = "#475569"; }

  // --- Forza 0-10 ---
  const forza = Math.max(0, Math.min(10, Math.round((rateo / 5) * 10 * 10) / 10));

  // --- Top termica (m AGL) ---
  // Base + quota guadagnabile basata su rateo e gradiente
  const top = Math.round(
    Math.min(
      5000,
      Math.max(
        cloudBase + 200,
        cloudBase + (rateo / GRADIENTE_SECCO) * 300
      )
    )
  );

  return {
    base: cloudBase,
    top,
    forza,
    rateo,
    label,
    colore,
    gradienteReale: Math.round(gradienteReale * 100) / 100,
  };
}

/**
 * Genera dati termici per tutte le ore in un array di HourData (per uno specifico giorno)
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