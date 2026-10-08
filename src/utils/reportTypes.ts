/**
 * reportTypes.ts — tipi, interfacce e helper per il report meteorologico.
 *
 * Questo modulo contiene SOLO dichiarazioni di tipo e funzioni utility pure.
 * Nessun calcolo meteorologico: i dati vengono estratti in reportDataExtractor.ts
 * e i paragrafi sono generati in generateReportMeteo.ts.
 */

// ─── TIPI UTILITY ────────────────────────────────────────────────────────────

/** Converte gradi meteorologici in nome cardinale completo (16 punti). */
export function degToCardinal(deg: number): string {
  if (deg == null) return "S";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

/** Converte gradi meteorologici in nome cardinale breve (8 punti). */
export function degToCardinalBreve(deg: number): string {
  if (deg == null) return "S";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

/** Formatta un numero per la stampa: null → "N/D". */
export function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "N/D";
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
}

// ─── INTERFACCE ──────────────────────────────────────────────────────────────

/** Parametri in ingresso per la generazione del report. */
export interface ReportMeteoParams {
  siteName: string;
  altitude: number;
  dateObj: Date;
  hourlyData: any;
}

/** Rapporto strutturato prodotto dal report. */
export interface GeneratedReport {
  titolo: string;
  paragrafoTermico: string;
  paragrafoVento: string;
  paragrafoInstabilita: string;
  paragrafoStrategia: string;
  segnaliPericolo: string;
  giudizioFinale: string;
  /** Voto numerico 1–10. */
  score: number;
  testoCompleto: string;
}

/** Tipi di scenario meteorologico identificabile. */
export type ScenarioMeteo =
  | "perfezionistico"
  | "termica-forte"
  | "instabile-temporali"
  | "ventoso"
  | "stabile-coperto"
  | "pioggia"
  | "debole-poco-termico"
  | "misto";

// ─── STRUTTURA DATI ESTRATTI ─────────────────────────────────────────────────

/**
 * Risultato dell'estrazione dati dal JSON Open-Meteo.
 * Tutti i campi sono nullable: se un dato manca, il relativo campo è null.
 */
export interface ExtractedWeatherData {
  // Temperature
  tempMin: number | null;
  tempMax: number | null;
  deltaT: number | null;

  // CAPE e stabilità
  maxCape: number | null;
  avgCape: number | null;
  avgLI: number | null;

  // Freezing level
  avgFreeze: number | null;
  maxFreeze: number | null;

  // Spread e base cumuli
  avgSpread: number | null;
  baseCumuliMin: number | null;
  baseCumuliMax: number | null;
  baseCumuliMedia: number | null;

  // Vento al suolo
  avgWindGround: number | null;
  maxWindGround: number | null;
  maxGust: number | null;
  mainWindDir: string;
  mainWindDirBreve: string;

  // Vento in quota (reale da pressioni)
  wind1500_2500: number | null;
  dir1500_2500: string;
  wind2500_3500: number | null;
  dir2500_3500: string;
  windOver3500: number | null;
  dirOver3500: string;

  // Precipitazioni e nuvolosità
  totPrecip: number;
  orePioggia: number;
  hasRain: boolean;
  hasThunderstorm: boolean;
  avgClouds: number | null;
  maxClouds: number | null;

  // Innesco termico
  oraInnesco: string;

  // Rateo di salita stimato
  rateoMin: number;
  rateoMax: number;

  // Scenario identificato
  scenario: ScenarioMeteo;
}
