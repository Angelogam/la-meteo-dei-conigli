"use client";

import type { HourData } from "@/types/meteo";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const GRADIENTE_SECCO = 0.98; // °C/100m
const LCL_FACTOR = 125; // (T - Td) × 125

// Cache per non rifare sempre le stesse richieste
const capeCache = new Map<string, { time: string; cape: number; cin: number; li: number }[]>();

interface CapeData {
  time: Date;
  cape: number;
  cin: number;
  li: number;
}

/**
 * Recupera CAPE, CIN e Lifted Index da Open-Meteo (GFS)
 */
export async function fetchCapeData(lat: number, lon: number): Promise<CapeData[]> {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  
  // Controlla cache (5 minuti)
  const cached = capeCache.get(cacheKey);
  if (cached) {
    const now = Date.now();
    const firstTime = new Date(cached[0]?.time).getTime();
    if (now - firstTime < 300000) { // 5 minuti
      return cached.map(c => ({
        time: new Date(c.time),
        cape: c.cape,
        cin: c.cin,
        li: c.li,
      }));
    }
  }

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: [
        "cape",
        "convective_inhibition",
        "lifted_index",
      ].join(","),
      // Aggiungiamo temperature a livelli di pressione per gradiente verticale
      "temperature_1000hPa",
      "temperature_975hPa",
      "temperature_950hPa",
      "temperature_925hPa",
      "temperature_900hPa",
      "temperature_850hPa",
      "temperature_800hPa",
      "temperature_700hPa",
      "temperature_600hPa",
      // Geopotenziale per quote reali
      "geopotential_height_1000hPa",
      "geopotential_height_975hPa",
      "geopotential_height_950hPa",
      "geopotential_height_925hPa",
      "geopotential_height_900hPa",
      "geopotential_height_850hPa",
      "geopotential_height_800hPa",
      "geopotential_height_700hPa",
      "geopotential_height_600hPa",
      timezone: "Europe/Rome",
      forecast_days: "5",
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const raw = await res.json();
    
    const capes: CapeData[] = raw.hourly.time.map((t: string, i: number) => ({
      time: new Date(t),
      cape: raw.hourly.cape?.[i] ?? 0,
      cin: raw.hourly.convective_inhibition?.[i] ?? 0,
      li: raw.hourly.lifted_index?.[i] ?? 0,
    }));

    // Salva in cache
    capeCache.set(cacheKey, capes.map(c => ({
      time: c.time.toISOString(),
      cape: c.cape,
      cin: c.cin,
      li: c.li,
    })));

    // Pulisci cache vecchia
    setTimeout(() => capeCache.delete(cacheKey), 300000);

    return capes;
  } catch {
    return [];
  }
}

interface TermicheEngineInput {
  hourlyData: HourData[];
  lat: number;
  lon: number;
  altitude: number;
}

export interface TermicheReali {
  hour: number;
  base: number;
  top: number;
  rateo: number;
  forza: number;
  label: string;
  colore: string;
  cape: number;
  cin: number;
  li: number;
  gradienteReale: number;
  totaleOre: number; // ore totali di termiche nella giornata
}

/**
 * Calcola termiche REALI combinando:
 * 1. Open-Meteo base (temp, dew, vento, nuvole) — dati locali
 * 2. GFS (CAPE, CIN, LI) — energia convettiva reale
 * 3. Fattori fisici: gradiente verticale, wind shear, ora del giorno, stagione
 */
export async function calcolaTermicheReali(
  input: TermicheEngineInput
): Promise<TermicheReali[]> {
  const { hourlyData, lat, lon, altitude } = input;

  if (!hourlyData || hourlyData.length === 0) return [];

  // 1. Recupera CAPE da GFS
  const capeData = await fetchCapeData(lat, lon);

  // 2. Calcola per ogni ora
  const oreVolo = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const oggi = new Date();
  const giornoCorrente = oggi.getDate();

  const risultati: TermicheReali[] = [];

  for (const ora of oreVolo) {
    // Trova il dato meteo per quest'ora
    const weather = hourlyData.find(h => {
      const t = new Date(h.time);
      return t.getHours() === ora && t.getDate() === giornoCorrente;
    });

    if (!weather) {
      risultati.push({
        hour: ora,
        base: 0, top: 0, rateo: 0, forza: 0,
        label: "N/D", colore: "#475569",
        cape: 0, cin: 0, li: 0,
        gradienteReale: 0, totaleOre: 0,
      });
      continue;
    }

    // Trova CAPE per quest'ora
    const cape = capeData.find(c => {
      const ct = new Date(c.time);
      return ct.getHours() === ora && ct.getDate() === giornoCorrente;
    });

    const capeValue = cape?.cape ?? 0;
    const cinValue = cape?.cin ?? 0;
    const liValue = cape?.li ?? 0;

    // --- CALCOLO FISICO REALE ---

    // 1. BASE TERMICA (LCL) = (T - Td) × 125
    const spread = weather.temperature - weather.dewPoint;
    const base = Math.max(200, Math.min(3000, Math.round(spread * LCL_FACTOR)));

    // 2. GRADIENTE TERMICO VERTICALE REALE
    let gradiente = GRADIENTE_SECCO;
    if (weather.temp80m != null) {
      gradiente = ((weather.temperature - weather.temp80m) / 78) * 100;
    } else if (weather.temp120m != null) {
      gradiente = ((weather.temperature - weather.temp120m) / 118) * 100;
    }

    // 3. TOP TERMICO da CAPE reale (se disponibile)
    // Formula: top = base + (CAPE × 2.5)
    // CAPE di 500 J/kg = top +1250m sopra la base
    // CAPE di 1000 J/kg = top +2500m sopra la base
    let top: number;
    if (capeValue > 50) {
      top = Math.min(5000, base + Math.round(capeValue * 2.5));
    } else {
      // Fallback: usa gradiente termico
      const deltaPoten = Math.max(1, gradiente / GRADIENTE_SECCO);
      top = Math.min(4500, base + Math.round(500 * deltaPoten));
    }

    // 4. Forza termica (0-10) — combinazione di CAPE, CIN, gradiente, vento, nuvole, ora
    let forza = 0;

    // Da CAPE (max 5 punti)
    if (capeValue > 1500) forza += 5;
    else if (capeValue > 1000) forza += 4;
    else if (capeValue > 600) forza += 3;
    else if (capeValue > 300) forza += 2;
    else if (capeValue > 100) forza += 1;
    else if (capeValue > 50) forza += 0.5;

    // Da gradiente (max 2 punti)
    if (gradiente > 1.2) forza += 2;
    else if (gradiente > 0.98) forza += 1.5;
    else if (gradiente > 0.7) forza += 1;

    // Da CIN (max 1 punto) — più CIN = più stabile
    if (cinValue > -50) forza += 1;
    else if (cinValue > -100) forza += 0.5;
    else forza += 0;

    // Da Lifted Index (max 1 punto)
    if (liValue < -4) forza += 1; // molto instabile
    else if (liValue < -2) forza += 0.7;
    else if (liValue < 0) forza += 0.3;

    // Da vento (max 1 punto)
    if (weather.windSpeed >= 5 && weather.windSpeed <= 15) forza += 1;
    else if (weather.windSpeed >= 3 && weather.windSpeed < 5) forza += 0.5;
    else if (weather.windSpeed > 15 && weather.windSpeed <= 22) forza += 0.3;

    // Da nuvolosità (max 1 punto)
    if (weather.cloudCover >= 15 && weather.cloudCover <= 45) forza += 1;
    else if (weather.cloudCover >= 5 && weather.cloudCover < 15) forza += 0.5;
    else if (weather.cloudCover > 45 && weather.cloudCover <= 60) forza += 0.3;

    // Da ora del giorno (max 0.5 punti)
    if (ora >= 11 && ora <= 15) forza += 0.5;
    else if (ora >= 9 && ora < 11) forza += 0.3;
    else if (ora > 15 && ora <= 17) forza += 0.2;

    // Da umidità (max 0.5 punti)
    if (weather.humidity >= 30 && weather.humidity <= 50) forza += 0.5;
    else if (weather.humidity > 50 && weather.humidity <= 65) forza += 0.3;

    // Pioggia annulla tutto
    if (weather.precipitation > 1) forza = 0;

    forza = Math.max(0, Math.min(10, Math.round(forza * 10) / 10));

    // 5. RATEO (m/s) da formula fisica: v = √(2 × CAPE / spessore)
    const spessore = Math.max(300, top - base);
    let rateo: number;
    
    if (capeValue > 50 && spessore > 0) {
      rateo = Math.sqrt((2 * capeValue) / spessore) * 4;
    } else {
      // Fallback basato sulla forza
      rateo = (forza / 10) * 4;
    }

    // Correzione per vento
    if (weather.windSpeed > 22) rateo *= 0.5;
    else if (weather.windSpeed > 15) rateo *= 0.8;

    // Correzione per nuvolosità eccessiva
    if (weather.cloudCover > 70) rateo *= 0.3;
    else if (weather.cloudCover > 60) rateo *= 0.6;

    rateo = Math.max(0.05, Math.round(rateo * 10) / 10);

    // 6. Label e colore
    let label: string;
    let colore: string;

    if (rateo >= 4.0) {
      label = "🔥 Forti";
      colore = "#ef4444";
    } else if (rateo >= 3.0) {
      label = "🪂 Buone";
      colore = "#f97316";
    } else if (rateo >= 2.0) {
      label = "🌤️ Mod.";
      colore = "#eab308";
    } else if (rateo >= 1.0) {
      label = "🌥️ Deboli";
      colore = "#84cc16";
    } else if (rateo >= 0.3) {
      label = "☁️ M. deboli";
      colore = "#6b7280";
    } else {
      label = "❌ Assenti";
      colore = "#475569";
    }

    risultati.push({
      hour: ora,
      base,
      top,
      rateo,
      forza,
      label,
      colore,
      cape: Math.round(capeValue),
      cin: Math.round(cinValue),
      li: Math.round(liValue * 10) / 10,
      gradienteReale: Math.round(gradiente * 100) / 100,
      totaleOre: 0, // Aggiornato dopo
    });
  }

  // Calcola totale ore con termiche attive
  const oreAttive = risultati.filter(r => r.rateo >= 0.3).length;
  for (const r of risultati) {
    r.totaleOre = oreAttive;
  }

  return risultati;
}