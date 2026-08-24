0.1mm o cloud > 80%.">
"use client";

export type StatoMeteo = "sereno" | "variabile" | "nuvoloso" | "pioggia" | "temporale" | "offline";

export interface MeteoInput {
  precipNow: number;        // mm/h (valore orario corrente)
  precipNextHours: number;  // mm (somma prossime 3-6 ore)
  cloudNow: number;         // % (valore orario corrente)
  windSpeed: number;        // km/h
  windDir: number;          // gradi
  temperature: number;      // °C
  cape?: number;            // J/kg
  weatherCode?: number;     // WMO code
  isDay?: boolean;
}

export interface StatoMeteoResult {
  stato: StatoMeteo;
  label: string;
  icona: string;
  confidence: number;       // 0-1
  motivi: string[];
}

// Soglie FERREE (non modificabili)
const PRECIP_THRESHOLD_RAIN = 0.1;   // mm/h
const CLOUD_THRESHOLD_CLEAR = 20;    // %
const CLOUD_THRESHOLD_OVERCAST = 80; // %

// Mapping WMO weather code → stato base
const WMO_BASE_STATE: Record<number, StatoMeteo> = {
  0: "sereno",
  1: "variabile",
  2: "variabile",
  3: "nuvoloso",
  45: "nuvoloso",  // nebbia
  48: "nuvoloso",  // nebbia gelata
  51: "pioggia",   // pioviggine
  53: "pioggia",
  55: "pioggia",
  56: "pioggia",   // pioviggine gelata
  57: "pioggia",
  61: "pioggia",   // pioggia
  63: "pioggia",
  65: "pioggia",
  66: "pioggia",   // pioggia gelata
  67: "pioggia",
  71: "nuvoloso",  // neve
  73: "nuvoloso",
  75: "nuvoloso",
  77: "nuvoloso",
  80: "pioggia",   // rovesci
  81: "pioggia",
  82: "pioggia",
  95: "temporale", // temporale
  96: "temporale", // temporale con grandine
  99: "temporale", // temporale forte con grandine
};

const ICON_MAP: Record<StatoMeteo, string> = {
  sereno: "☀️",
  variabile: "🌤️",
  nuvoloso: "☁️",
  pioggia: "🌧️",
  temporale: "⛈️",
  offline: "📡",
};

const LABEL_MAP: Record<StatoMeteo, string> = {
  sereno: "Sereno",
  variabile: "Variabile",
  nuvoloso: "Nuvoloso",
  pioggia: "Pioggia",
  temporale: "Temporale",
  offline: "Dati non disponibili",
};

/**
 * Calcola lo stato meteo SOLO dai dati reali Open-Meteo.
 * REGOLA FERREA: "sereno" VIETATO se precipNow > 0.1 OPPURE cloudNow > 80%.
 */
export function calcolaStatoMeteo(input: MeteoInput): StatoMeteoResult {
  const { precipNow, precipNextHours, cloudNow, windSpeed, cape, weatherCode } = input;
  const motivi: string[] = [];

  // 1. STATO OFFLINE se mancano dati essenziali
  if (cloudNow === undefined || precipNow === undefined) {
    return { stato: "offline", label: "Offline", icona: ICON_MAP.offline, confidence: 0, motivi: ["Dati mancanti"] };
  }

  // 2. TEMPESTALE ha priorità assoluta (WMO 95, 96, 99)
  if (weatherCode !== undefined && (weatherCode === 95 || weatherCode === 96 || weatherCode === 99)) {
    motivi.push("Codice WMO temporale (95/96/99)");
    return { stato: "temporale", label: "Temporale", icona: ICON_MAP.temporale, confidence: 0.95, motivi };
  }
  if (cape !== undefined && cape > 1200 && precipNow > PRECIP_THRESHOLD_RAIN && cloudNow > CLOUD_THRESHOLD_OVERCAST) {
    motivi.push(`CAPE alto (${cape} J/kg) + pioggia + copertura > 80%`);
    return { stato: "temporale", label: "Temporale", icona: ICON_MAP.temporale, confidence: 0.85, motivi };
  }

  // 3. PIOGGIA - VIETATO mostrare "sereno" se c'è pioggia
  const pioggiaPresente = precipNow > PRECIP_THRESHOLD_RAIN;
  const pioggiaImminente = precipNextHours > PRECIP_THRESHOLD_RAIN;
  
  if (pioggiaPresente || pioggiaImminente) {
    motivi.push(pioggiaPresente ? `Pioggia ora: ${precipNow.toFixed(1)} mm/h` : `Pioggia prossime ore: ${precipNextHours.toFixed(1)} mm`);
    return { stato: "pioggia", label: "Pioggia", icona: ICON_MAP.pioggia, confidence: 0.9, motivi };
  }

  // 4. NUVOLOSO - copertura > 80%
  if (cloudNow > CLOUD_THRESHOLD_OVERCAST) {
    motivi.push(`Copertura nuvolosa ${cloudNow}% > 80%`);
    return { stato: "nuvoloso", label: "Nuvoloso", icona: ICON_MAP.nuvoloso, confidence: 0.85, motivi };
  }

  // 5. VARIABILE - copertura 20-80%
  if (cloudNow >= CLOUD_THRESHOLD_CLEAR && cloudNow <= CLOUD_THRESHOLD_OVERCAST) {
    motivi.push(`Copertura nuvolosa ${cloudNow}% (20-80%)`);
    return { stato: "variabile", label: "Variabile", icona: ICON_MAP.variabile, confidence: 0.8, motivi };
  }

  // 6. SERENO - SOLO se: NO pioggia (ora+prossime ore) E copertura < 20%
  // REGOLA FERREA: questo è l'UNICO caso in cui "sereno" è permesso
  if (cloudNow < CLOUD_THRESHOLD_CLEAR && precipNow <= PRECIP_THRESHOLD_RAIN && precipNextHours <= PRECIP_THRESHOLD_RAIN) {
    motivi.push(`Cielo sereno: copertura ${cloudNow}% < 20%, nessuna pioggia`);
    return { stato: "sereno", label: "Sereno", icona: ICON_MAP.sereno, confidence: 0.9, motivi };
  }

  // Fallback: usa WMO code se disponibile
  if (weatherCode !== undefined && WMO_BASE_STATE[weatherCode]) {
    const statoWmo = WMO_BASE_STATE[weatherCode];
    motivi.push(`Fallback WMO code ${weatherCode}: ${statoWmo}`);
    return { 
      stato: statoWmo, 
      label: LABEL_MAP[statoWmo], 
      icona: ICON_MAP[statoWmo], 
      confidence: 0.7, 
      motivi 
    };
  }

  // Ultimo fallback conservativo
  return { stato: "variabile", label: "Variabile", icona: ICON_MAP.variabile, confidence: 0.5, motivi: ["Fallback conservativo"] };
}

/**
 * Calcola precipitazione prossime N ore dai dati orari
 */
export function calcolaPrecipProssimeOre(hourly: MeteoHourly[], oreAvanti: number = 6): number {
  if (!hourly || hourly.length === 0) return 0;
  const now = new Date();
  const currentHour = now.getHours();
  let somma = 0;
  let conteggio = 0;
  
  for (const h of hourly) {
    const hHour = new Date(h.time).getHours();
    if (hHour >= currentHour && hHour < currentHour + oreAvanti) {
      somma += h.precipitation ?? 0;
      conteggio++;
      if (conteggio >= oreAvanti) break;
    }
  }
  return somma;
}