/**
 * Derived Meteorology — calcola grandezze derivate da dati reali Open-Meteo.
 *
 * Tutte le funzioni sono pure e testabili.
 * Non inventano valori: se un dato necessario manca, restituiscono null.
 *
 * CLASSIFICAZIONE:
 *   REALI     → forniti direttamente dall'API
 *   DERIVATI  → calcolati da dati reali (LCL, lapse rate, spread, shear)
 *   STIMATI   → approssimazioni quando mancano dati sufficienti (etichettati esplicitamente)
 */

import type { MeteoHourly } from "@/services/openMeteoService";
import { directionDifference, type WindObservation, calculateWindShear } from "@/utils/windShearCalculator";

// ─── DATI REALI (estratti direttamente dall'API) ───────────────────────────

export interface RealData {
  temperature2m: number | null;
  dewPoint2m: number | null;
  windSpeed10m: number | null;
  windDir10m: number | null;
  windSpeed80m: number | null;
  windDir80m: number | null;
  windSpeed120m: number | null;
  windDir120m: number | null;
  windSpeed180m: number | null;
  windDir180m: number | null;
  windSpeed925hPa: number | null;
  windDir925hPa: number | null;
  windSpeed850hPa: number | null;
  windDir850hPa: number | null;
  windSpeed700hPa: number | null;
  windDir700hPa: number | null;
  windSpeed600hPa: number | null;
  windDir600hPa: number | null;
  windSpeed500hPa: number | null;
  windDir500hPa: number | null;
  cape: number | null;
  cin: number | null;
  liftedIndex: number | null;
  freezingLevel: number | null;
  cloudCover: number | null;
  shortwaveRadiation: number | null;
  boundaryLayerHeight: number | null;
  pressureMsl: number | null;
  surfacePressure: number | null;
}

/**
 * Estrae i dati reali da un oggetto MeteoHourly.
 * Tutti i campi sono null se l'API non li fornisce.
 */
export function extractRealData(hourly: MeteoHourly): RealData {
  return {
    temperature2m: hourly.temperature,
    dewPoint2m: hourly.dewPoint,
    windSpeed10m: hourly.windSpeed,
    windDir10m: hourly.windDir,
    windSpeed80m: hourly.windSpeed80m,
    windDir80m: hourly.windDir80m,
    windSpeed120m: hourly.windSpeed120m,
    windDir120m: hourly.windDir120m,
    windSpeed180m: hourly.windSpeed180m,
    windDir180m: hourly.windDir180m,
    windSpeed925hPa: hourly.windSpeed925,
    windDir925hPa: hourly.windDir925,
    windSpeed850hPa: hourly.windSpeed850,
    windDir850hPa: hourly.windDir850,
    windSpeed700hPa: hourly.windSpeed700,
    windDir700hPa: hourly.windDir700,
    windSpeed600hPa: hourly.windSpeed600,
    windDir600hPa: hourly.windDir600,
    windSpeed500hPa: hourly.windSpeed500,
    windDir500hPa: hourly.windDir500,
    cape: hourly.cape,
    cin: hourly.cin,
    liftedIndex: hourly.liftedIndex,
    freezingLevel: hourly.freezingLevel,
    cloudCover: hourly.cloudCover,
    shortwaveRadiation: hourly.shortwaveRadiation,
    boundaryLayerHeight: hourly.boundaryLayerHeight, // MODEL_FORECAST — disponibile su GFS/ICON, non sempre su AROME
    pressureMsl: hourly.pressure,
    surfacePressure: hourly.surfacePressure,
  };
}

// ─── DATI DERIVATI ──────────────────────────────────────────────────────────

export interface DerivedSurfaceData {
  /** Differenza temperatura - punto di rugiada (°C). Null se mancano i dati. */
  spread: number | null;
  /** Base cumuli stimata (LCL) in metri s.l.m. Stima basata su formula standard. */
  estimatedCloudBase: number | null;
  /** Gradiente termico reale °C/100m tra 2m e il livello più alto disponibile.
   *  Null se non sufficienti dati di temperatura in quota. */
  realLapseRate: number | null;
  /** Vento al suolo in km/h. Null se non disponibile. */
  windSpeedGround: number | null;
  /** Direzione vento al suolo in gradi. Null se non disponibile. */
  windDirGround: number | null;
}

/**
 * Calcola i dati derivati di superficie da RealData.
 */
export function computeDerivedSurface(real: RealData): DerivedSurfaceData {
  // Spread: differenza reale T - Td. Null se mancano i dati.
  // NON applicare minimi artificiali: un valore piccolo è un dato reale.
  const spread =
    real.temperature2m != null && real.dewPoint2m != null
      ? real.temperature2m - real.dewPoint2m
      : null;

  // Il calcolo della base nube (LCL) avviene in computeCloudBase(),
  // che richiede l'altitudine del sito. Qui restituiamo solo lo spread.

  // Lapse rate reale: usa i dati di temperatura reali disponibili
  // I dati di temperatura in quota sono su MeteoHourly, non su RealData
  // Per computeDerivedSurface abbiamo solo i dati di superficie
  const tempLevels: { alt: number; temp: number | null }[] = [
    { alt: 2, temp: real.temperature2m },
  ];

  const validTemps = tempLevels.filter((l) => l.temp != null);
  let realLapseRate: number | null = null;

  if (validTemps.length >= 2) {
    const lowest = validTemps[0];
    const highest = validTemps[validTemps.length - 1];
    const altDiff = highest.alt - lowest.alt;
    if (altDiff > 0 && lowest.temp != null && highest.temp != null) {
      // Lapse rate = (T_basso - T_alto) / dislivello * 100
      realLapseRate = Math.round(((lowest.temp - highest.temp) / altDiff) * 100 * 100) / 100;
    }
  }

  return {
    spread,
    estimatedCloudBase: null, // calcolato separatamente con altitudine sito
    realLapseRate,
    windSpeedGround: real.windSpeed10m,
    windDirGround: real.windDir10m,
  };
}

// computeDerivedSurface usa solo dati di superficie (temperatura2m, dewPoint2m).
// Le temperature in quota (temp80m, temp120m, temperature180m) sono usate in computeHourlyDerived.

/**
 * Calcola la base nube (LCL stimato) data l'altitudine del sito e lo spread T-Td.
 * CLASSIFICAZIONE: DERIVED / ESTIMATED — formula semplificata, non misura osservata.
 *
 * Formula: siteAltitude + 125 × (T - Td)
 * NON usa il freezing level. NON aggiunge minimi artificiali.
 */
export function computeCloudBase(siteAltitude: number, spread: number | null): number | null {
  if (spread == null) return null;
  return Math.round(siteAltitude + spread * 125);
}

// ─── DATI VERTICALI REALI (pressioni) ──────────────────────────────────────

/**
 * Rappresenta un livello di pressione con vento reale.
 * altitude è approssimato (ISO standard), non geopotenziale reale.
 */
export interface PressureLevelWind {
  pressureHpa: number;
  /** Altitudine approssimata ISA (non reale). */
  estimatedAltitudeM: number;
  windSpeedKmh: number | null;
  windDirDeg: number | null;
}

/**
 * Estrae i venti ai livelli di pressione dai dati reali.
 * Solo i livelli per cui l'API fornisce dati reali.
 */
export function extractPressureLevelWinds(real: RealData): PressureLevelWind[] {
  const levels: PressureLevelWind[] = [];

  if (real.windSpeed925hPa != null && real.windDir925hPa != null) {
    levels.push({ pressureHpa: 925, estimatedAltitudeM: 760, windSpeedKmh: real.windSpeed925hPa, windDirDeg: real.windDir925hPa });
  }
  if (real.windSpeed850hPa != null && real.windDir850hPa != null) {
    levels.push({ pressureHpa: 850, estimatedAltitudeM: 1450, windSpeedKmh: real.windSpeed850hPa, windDirDeg: real.windDir850hPa });
  }
  if (real.windSpeed700hPa != null && real.windDir700hPa != null) {
    levels.push({ pressureHpa: 700, estimatedAltitudeM: 3000, windSpeedKmh: real.windSpeed700hPa, windDirDeg: real.windDir700hPa });
  }
  if (real.windSpeed600hPa != null && real.windDir600hPa != null) {
    levels.push({ pressureHpa: 600, estimatedAltitudeM: 4200, windSpeedKmh: real.windSpeed600hPa, windDirDeg: real.windDir600hPa });
  }
  if (real.windSpeed500hPa != null && real.windDir500hPa != null) {
    levels.push({ pressureHpa: 500, estimatedAltitudeM: 5500, windSpeedKmh: real.windSpeed500hPa, windDirDeg: real.windDir500hPa });
  }

  return levels;
}

// ─── SHEAR VERTICALE ────────────────────────────────────────────────────────

export interface VerticalWindProfile {
  /** Vento al suolo (10m). */
  ground: WindObservation | null;
  /** Vento ai livelli di pressione disponibili. */
  pressureLevels: WindObservation[];
  /** Shear tra livelli adiacenti. */
  shearBetweenLevels: { from: number; to: number; result: import("./windShearCalculator").WindShearResult }[];
}

/**
 * Costruisce il profilo vento verticale e calcola lo shear tra livelli.
 * Usa SOLO dati reali. Nessun valore inventato.
 */
export function buildVerticalWindProfile(real: RealData, siteAltitude: number): VerticalWindProfile {
  const ground =
    real.windSpeed10m != null && real.windDir10m != null
      ? { altitude: siteAltitude, speed: real.windSpeed10m, direction: real.windDir10m }
      : null;

  const pressureObs: WindObservation[] = [];
  const pressureWinds = extractPressureLevelWinds(real);
  for (const pl of pressureWinds) {
    if (pl.windSpeedKmh != null && pl.windDirDeg != null) {
      pressureObs.push({
        altitude: pl.estimatedAltitudeM,
        speed: pl.windSpeedKmh,
        direction: pl.windDirDeg,
      });
    }
  }

  // Shear tra ground e primo livello di pressione, poi tra livelli adiacenti
  const shearBetweenLevels: VerticalWindProfile["shearBetweenLevels"] = [];

  const allObs = [ground, ...pressureObs].filter((o): o is WindObservation => o != null);

  for (let i = 0; i < allObs.length - 1; i++) {
    const result = calculateWindShear(allObs[i], allObs[i + 1]);
    shearBetweenLevels.push({
      from: allObs[i].altitude,
      to: allObs[i + 1].altitude,
      result,
    });
  }

  return { ground, pressureLevels: pressureObs, shearBetweenLevels };
}

// ─── STABILITÀ ATMOSFERICA ──────────────────────────────────────────────────

export interface StabilityData {
  /** DeltaT reale °C/100m. Null se dati insufficienti. */
  deltaT: number | null;
  /** classificazione: "inversione" | "stabile" | "neutro" | "instabile" | "molto_instabile" */
  classification: string | null;
}

/**
 * Classifica il gradiente termico in categorie standard.
 */
export function classifyLapseRate(deltaT: number): string {
  if (deltaT < 0) return "inversione";
  if (deltaT < 0.3) return "stabile";
  if (deltaT < 0.65) return "neutro";
  if (deltaT < 0.98) return "instabile";
  return "molto_instabile";
}

// ─── Funzione principale: computa tutti i derivati per un'ora ───────────────

export interface HourlyDerivedData {
  // MODEL_FORECAST — dati forniti dal modello numerico Open-Meteo
  real: RealData;

  // DERIVED — calcolati da dati MODEL_FORECAST (LCL, low-level lapse rate, shear)
  spread: number | null;
  cloudBase: number | null; // DERIVED/ESTIMATED — LCL stimato da T e Td
  lowLevelLapseRate: number | null; // °C/100m tra 2m e livello più alto disponibile
  lapseRateClassification: string | null;

  // ESTIMATED — approssimazioni empiriche etichettate come tali
  estimatedThermalTop: number | null; // ESTIMATED / EMPIRICO
  estimatedThermalActivity: number | null; // ESTIMATED / EURISTICO (rateo in m/s)
  estimatedCloudBase: number | null; // alias di cloudBase, mantenuto per compatibilità

  // MODEL_FORECAST — dato direttamente dall'API quando disponibile
  boundaryLayerHeight: number | null; // PBL modello, non calculato

  // Vertical wind
  verticalProfile: VerticalWindProfile;

  // Stability
  stability: StabilityData;
}

/**
 * Computa tutti i dati derivati per un'ora, partendo dai dati orari API.
 * Nessun valore inventato: se un dato manca, il derivato è null.
 */
export function computeHourlyDerived(hourly: MeteoHourly, siteAltitude: number): HourlyDerivedData | null {
  const real = extractRealData(hourly);

  // Se mancano i dati fondamentali (temperatura e dew point), non possiamo derivare nulla
  if (real.temperature2m == null || real.dewPoint2m == null) {
    return null;
  }

  // Spread: differenza reale T - Td (MODEL_FORECAST → DERIVED)
  const spread = real.temperature2m - real.dewPoint2m;
  const cloudBase = computeCloudBase(siteAltitude, spread);

  // LOW-LEVEL LAPSE RATE: gradiente termico tra 2m e il livello più alto disponibile.
  // Usa i dati diretti Open-Meteo quando presenti, senza ricostruzioni.
  const tempLevels: { alt: number; temp: number | null }[] = [
    { alt: 2, temp: real.temperature2m },
    { alt: 80, temp: hourly.temp80m ?? null },
    { alt: 120, temp: hourly.temp120m ?? null },
    { alt: 180, temp: hourly.temperature180m ?? null },
  ];

  const validTemps = tempLevels.filter((l): l is { alt: number; temp: number } => l.temp != null);
  let lowLevelLapseRate: number | null = null;
  if (validTemps.length >= 2) {
    const lowest = validTemps[0];
    const highest = validTemps[validTemps.length - 1];
    const altDiff = highest.alt - lowest.alt;
    if (altDiff > 0) {
      lowLevelLapseRate = Math.round(((lowest.temp - highest.temp) / altDiff) * 100 * 100) / 100;
    }
  }

  const lapseRateClass = lowLevelLapseRate != null ? classifyLapseRate(lowLevelLapseRate) : null;

  // BOUNDARY LAYER HEIGHT — dato MODEL_FORECAST direttamente dall'API
  // Null se non disponibile (non sempre supportato da tutti i modelli)
  const boundaryLayerHeight = real.boundaryLayerHeight;

  // ESTIMATED thermal top — formula empirica, NON dato osservato
  let estimatedThermalTop: number | null = null;
  if (cloudBase != null && real.cape != null) {
    const capeFactor = Math.min(800, real.cape * 0.1);
    const spreadFactor = spread * 50;
    estimatedThermalTop = Math.round(Math.min(5000, cloudBase + capeFactor + spreadFactor));
  } else if (cloudBase != null) {
    estimatedThermalTop = Math.round(cloudBase + 400);
  }

  // ESTIMATED thermal activity index — euristiche, NON rateo termico reale misurato
  let estimatedThermalActivity: number | null = null;
  if (real.cape != null) {
    estimatedThermalActivity = Math.round(
      Math.min(4.0, Math.max(0.1, spread * 0.22 + Math.min(1.5, real.cape / 800))) * 10
    ) / 10;
  } else if (spread != null) {
    estimatedThermalActivity = Math.round(Math.max(0.1, spread * 0.22) * 10) / 10;
  }

  // Vertical wind profile
  const verticalProfile = buildVerticalWindProfile(real, siteAltitude);

  // Stability
  const stability: StabilityData = {
    deltaT: lowLevelLapseRate,
    classification: lapseRateClass,
  };

  return {
    real,
    spread,
    cloudBase,
    lowLevelLapseRate,
    lapseRateClassification: lapseRateClass,
    estimatedThermalTop,
    estimatedThermalActivity,
    estimatedCloudBase: cloudBase, // mantenuto per compatibilità con codice esistente
    boundaryLayerHeight,
    verticalProfile,
    stability,
  };
}
