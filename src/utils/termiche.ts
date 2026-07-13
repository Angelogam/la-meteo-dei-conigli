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
 * - Gradiente termico verticale reale (temp 2m vs 80m/120m)
 * - Vento a tutte le quote (da windProfile: 0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000m)
 * - Pressione, UV, temperatura suolo, spread temperatura-rugiada
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

  // --- 1. Gradiente termico reale ---
  let gradienteReale = GRADIENTE_SECCO;

  if (temp80m != null) {
    const diffAlt = 78; // 80m - 2m
    const diffTemp = temperature - temp80m;
    gradienteReale = (diffTemp / diffAlt) * 100;
  } else if (temp120m != null) {
    const diffAlt = 118;
    const diffTemp = temperature - temp120m;
    gradienteReale = (diffTemp / diffAlt) * 100;
  }

  // --- 2. Spread e base nuvole ---
  const spread = temperature - dewPoint;
  const cloudBase = Math.round(Math.max(100, spread * 125));

  // --- 3. CAPE stimato ---
  let capeBase = spread * 80;
  if (gradienteReale > GRADIENTE_SECCO) {
    capeBase *= 1.4;
  } else if (gradienteReale > GRADIENTE_SECCO * 0.7) {
    capeBase *= 1.0;
  } else {
    capeBase *= 0.5;
  }

  if (temperature > 25) {
    capeBase += 300;
  } else if (temperature > 20) {
    capeBase += 200;
  } else if (temperature > 15) {
    capeBase += 100;
  }

  if (uvIndex != null && uvIndex > 5) {
    capeBase *= 1.3;
  } else if (uvIndex != null && uvIndex > 3) {
    capeBase *= 1.1;
  }

  if (soilTemp != null && soilTemp > temperature) {
    capeBase *= 1.2;
  } else if (soilTemp != null && soilTemp < temperature - 5) {
    capeBase *= 0.7;
  }

  if (pressure != null && pressure > 1020) {
    capeBase *= 1.2;
  } else if (pressure != null && pressure < 1005) {
    capeBase *= 0.6;
  }

  const cape = Math.max(0, Math.round(capeBase));

  // --- 4. Velocità termica base ---
  const H = Math.max(300, cloudBase + 500);
  const thermalSpeed = Math.sqrt(Math.max(0.01, (2 * cape) / H)) * 3.6;

  // --- 5. Fattori correttivi basati su DATI REALI DI VENTO IN QUOTA ---
  const avgWind10m = windSpeed || 0;

  // Trova shear verticale reale dal windProfile
  const findWindAtHeight = (height: number): { speed: number; dir: number } | null => {
    if (!windProfile || windProfile.length === 0) return null;
    let closest = windProfile[0];
    let minDiff = Math.abs(closest.height - height);
    for (const level of windProfile) {
      const diff = Math.abs(level.height - height);
      if (diff < minDiff) {
        minDiff = diff;
        closest = level;
      }
    }
    if (closest.speed != null && closest.dir != null) {
      return { speed: closest.speed, dir: closest.dir };
    }
    return null;
  };

  const wind1000m = findWindAtHeight(1000);
  const wind500m = findWindAtHeight(500);

  let windShear = 0;
  const wind10m = { speed: windSpeed, dir: windDir };
  if (wind1000m) {
    windShear = Math.abs(wind1000m.speed - wind10m.speed);
  }

  let dirShear = 0;
  if (wind500m) {
    let diff = Math.abs(wind500m.dir - wind10m.dir);
    if (diff > 180) diff = 360 - diff;
    dirShear = diff;
  } else if (wind1000m) {
    let diff = Math.abs(wind1000m.dir - wind10m.dir);
    if (diff > 180) diff = 360 - diff;
    dirShear = diff * 0.5;
  }

  // Fattore vento basato su dati reali
  let windFactor: number;
  if (avgWind10m >= 8 && avgWind10m <= 18) {
    windFactor = 1.3;
  } else if (avgWind10m >= 5 && avgWind10m < 8) {
    windFactor = 1.0;
  } else if (avgWind10m >= 18 && avgWind10m <= 25) {
    windFactor = 0.7;
  } else if (avgWind10m < 5) {
    windFactor = 0.4;
  } else {
    windFactor = 0.3;
  }

  if (windShear > 15) windFactor *= 0.6;
  else if (windShear > 10) windFactor *= 0.8;

  if (dirShear > 60) windFactor *= 0.7;
  else if (dirShear > 30) windFactor *= 0.9;

  // --- 6. Nuvolosità ---
  let cloudFactor: number;
  if (cloudCover >= 10 && cloudCover <= 40) {
    cloudFactor = 1.3;
  } else if (cloudCover >= 5 && cloudCover < 10) {
    cloudFactor = 1.1;
  } else if (cloudCover > 40 && cloudCover <= 60) {
    cloudFactor = 0.8;
  } else if (cloudCover > 60 && cloudCover <= 80) {
    cloudFactor = 0.4;
  } else if (cloudCover > 80) {
    cloudFactor = 0.1;
  } else {
    cloudFactor = 0.7;
  }

  // --- 7. Umidità ---
  let humidityFactor: number;
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

  // --- 8. Pressione ---
  let pressureFactor: number;
  if (pressure != null) {
    if (pressure >= 1020) {
      pressureFactor = 1.3;
    } else if (pressure >= 1013) {
      pressureFactor = 1.1;
    } else if (pressure >= 1005) {
      pressureFactor = 0.8;
    } else {
      pressureFactor = 0.5;
    }
  } else {
    pressureFactor = 1.0;
  }

  // --- 9. Ora del giorno ---
  const hour = weather.time?.getHours() ?? 12;
  let hourFactor = 1.0;
  if (hour >= 11 && hour <= 15) {
    hourFactor = 1.3;
  } else if (hour >= 9 && hour < 11) {
    hourFactor = 0.8;
  } else if (hour > 15 && hour <= 18) {
    hourFactor = 0.6;
  } else {
    hourFactor = 0.1;
  }

  // --- 10. Calcolo finale ---
  const rateo = Math.round(
    Math.max(0.05, thermalSpeed * windFactor * cloudFactor * humidityFactor * pressureFactor * hourFactor) * 10
  ) / 10;

  // --- Label e colore ---
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

  const top = Math.round(
    Math.min(5000, Math.max(cloudBase + 200, cloudBase + (rateo / GRADIENTE_SECCO) * 300))
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