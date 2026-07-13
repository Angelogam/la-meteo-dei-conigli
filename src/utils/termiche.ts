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

const GRADIENTE_SECCO = 0.98;

/**
 * Calcola le termiche usando DATI REALI da Open-Meteo:
 * - Base nuvole (LCL) = (T - Td) × 125   [Lifting Condensation Level]
 * - Top termico = base + CAPE/500 × 1500
 * - Rateo (m/s) calcolato da CAPE, vento, nuvolosità, umidità, ora del giorno
 */
export function calcolaTermiche(weather: HourData, altitude: number): TermicheData {
  const {
    temperature,
    dewPoint,
    humidity,
    windSpeed,
    windDir,
    temp80m,
    temp120m,
    cloudCover,
    pressure,
    precipitation,
    uvIndex,
    soilTemp,
    soilMoisture,
    windProfile,
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

  // --- 1. Gradiente termico reale (da temp 2m vs 80m/120m) ---
  let gradienteReale = GRADIENTE_SECCO;
  if (temp80m != null) {
    gradienteReale = ((temperature - temp80m) / 78) * 100;
  } else if (temp120m != null) {
    gradienteReale = ((temperature - temp120m) / 118) * 100;
  }

  // --- 2. BASE DELLA TERMICA (LCL) = dove si condensa l'aria ---
  // Formula: LCL (metri) = (T - Td) × 125
  const spread = temperature - dewPoint;
  const cloudBase = Math.round(Math.max(200, spread * 125));

  // --- 3. CAPE stimato dai dati reali ---
  // Base: spread termico × 80
  let capeBase = spread * 80;

  // Correzione per gradiente termico reale
  if (gradienteReale > GRADIENTE_SECCO) {
    capeBase *= 1.4;
  } else if (gradienteReale > GRADIENTE_SECCO * 0.7) {
    capeBase *= 1.0;
  } else {
    capeBase *= 0.5;
  }

  // Correzione per temperatura alta (più energia)
  if (temperature > 28) {
    capeBase += 400;
  } else if (temperature > 22) {
    capeBase += 250;
  } else if (temperature > 18) {
    capeBase += 150;
  } else if (temperature > 14) {
    capeBase += 80;
  }

  // Correzione UV (più irraggiamento = più termiche)
  if (uvIndex != null && uvIndex > 6) {
    capeBase *= 1.4;
  } else if (uvIndex != null && uvIndex > 4) {
    capeBase *= 1.2;
  } else if (uvIndex != null && uvIndex > 2) {
    capeBase *= 1.1;
  }

  // Correzione temperatura suolo (se più calda dell'aria, aiuta)
  if (soilTemp != null && soilTemp > temperature + 3) {
    capeBase *= 1.3;
  } else if (soilTemp != null && soilTemp > temperature) {
    capeBase *= 1.1;
  } else if (soilTemp != null && soilTemp < temperature - 5) {
    capeBase *= 0.6;
  }

  // Correzione pressione (alta pressione = aria più stabile)
  if (pressure != null) {
    if (pressure >= 1025) capeBase *= 0.8;
    else if (pressure >= 1020) capeBase *= 0.9;
    else if (pressure >= 1015) capeBase *= 1.0;
    else if (pressure >= 1008) capeBase *= 1.2;
    else if (pressure >= 1000) capeBase *= 1.3;
    else capeBase *= 1.4;
  }

  const cape = Math.max(0, Math.round(capeBase));

  // --- 4. TOP DELLA TERMICA = base + (CAPE factor) ---
  // Con CAPE basso (<200), top = base + 200m (niente sviluppo)
  // Con CAPE alto (>1000), top = base + 2000m+
  const topExtra = Math.round((cape / 500) * 1500);
  const top = Math.round(Math.min(5000, Math.max(cloudBase + 200, cloudBase + topExtra)));

  // --- 5. VELOCITÀ TERMICA (rateo in m/s) ---
  // Formula fisica: v = sqrt(2 × CAPE / H) dove H = spessore dello strato convettivo
  const H = Math.max(300, top - cloudBase + 200);
  let rateoBase = Math.sqrt(Math.max(0.01, (2 * cape) / H)) * 3.6;
  if (isNaN(rateoBase) || rateoBase < 0.05) rateoBase = 0.05;

  // --- 6. FATTORI CORRETTIVI ---
  // Vento a 10m
  let windFactor = 1.0;
  if (windSpeed >= 8 && windSpeed <= 16) {
    windFactor = 1.3;  // Vento ideale per termiche
  } else if (windSpeed >= 5 && windSpeed < 8) {
    windFactor = 1.0;
  } else if (windSpeed >= 16 && windSpeed <= 22) {
    windFactor = 0.8;
  } else if (windSpeed > 22) {
    windFactor = 0.4;
  } else if (windSpeed < 5) {
    windFactor = 0.5;  // Troppo calma = termiche deboli
  }

  // Shear verticale dal windProfile (se disponibile)
  let shearFactor = 1.0;
  if (windProfile && windProfile.length > 0) {
    const wind300m = windProfile.find((l) => l.height >= 200 && l.height <= 500);
    const wind10m = { speed: windSpeed, dir: windDir };
    if (wind300m && wind300m.speed != null) {
      const shear = Math.abs(wind300m.speed - wind10m.speed);
      if (shear > 20) shearFactor = 0.5;
      else if (shear > 12) shearFactor = 0.7;
      else if (shear > 6) shearFactor = 0.9;
    }
  }

  // Nuvolosità (cumuli aiutano, cielo coperto no)
  let cloudFactor = 1.0;
  if (cloudCover >= 15 && cloudCover <= 45) {
    cloudFactor = 1.3;  // Cumuli ben formati
  } else if (cloudCover >= 5 && cloudCover < 15) {
    cloudFactor = 1.1;
  } else if (cloudCover > 45 && cloudCover <= 65) {
    cloudFactor = 0.7;
  } else if (cloudCover > 65 && cloudCover <= 85) {
    cloudFactor = 0.3;
  } else if (cloudCover > 85) {
    cloudFactor = 0.1;
  }

  // Umidità
  let humidityFactor = 1.0;
  if (humidity >= 30 && humidity <= 50) {
    humidityFactor = 1.2;
  } else if (humidity > 50 && humidity <= 65) {
    humidityFactor = 1.0;
  } else if (humidity > 65 && humidity <= 80) {
    humidityFactor = 0.6;
  } else if (humidity > 80) {
    humidityFactor = 0.2;
  } else {
    humidityFactor = 0.8;
  }

  // Ora del giorno (picco 11-15)
  const hour = weather.time?.getHours() ?? 12;
  let hourFactor = 1.0;
  if (hour >= 11 && hour <= 15) {
    hourFactor = 1.3;
  } else if (hour >= 9 && hour < 11) {
    hourFactor = 0.8;
  } else if (hour > 15 && hour <= 18) {
    hourFactor = 0.6;
  } else if (hour > 18 || hour < 8) {
    hourFactor = 0.1;
  }

  // --- 7. RATEO FINALE ---
  const rateo = Math.round(
    Math.max(0.05, rateoBase * windFactor * shearFactor * cloudFactor * humidityFactor * hourFactor) * 10
  ) / 10;

  // --- 8. LABEL E COLORE ---
  let label: string;
  let colore: string;

  if (rateo >= 4.0) {
    label = "🔥 Termiche forti";
    colore = "#ef4444";
  } else if (rateo >= 3.0) {
    label = "🪂 Buone termiche";
    colore = "#f97316";
  } else if (rateo >= 2.0) {
    label = "🌤️ Termiche moderate";
    colore = "#eab308";
  } else if (rateo >= 1.0) {
    label = "🌥️ Termiche deboli";
    colore = "#84cc16";
  } else if (rateo >= 0.3) {
    label = "☁️ Termiche molto deboli";
    colore = "#6b7280";
  } else {
    label = "❌ Niente termiche";
    colore = "#475569";
  }

  const forza = Math.max(0, Math.min(10, Math.round((rateo / 5) * 10 * 10) / 10));

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
 * Genera dati termici per tutte le ore in un array di HourData
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