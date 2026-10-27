/**
 * Logica aerologica server-side per La Meteo dei Conigli API.
 * Porta fedele delle formule client (src/utils/indiceVolabilita.ts,
 * src/utils/termiche.ts, src/utils/calcCloudBase.ts) senza dipendenze
 * dal bundler Vite: utilizzabile dai route handler Nitro.
 *
 * Le previsioni sono dati modellistici e non certificano la sicurezza
 * o l'idoneità al volo.
 */

export const MAX_CLOUD_BASE_GAIN = 1800; // metri sopra il sito

export interface ParametriVolabilita {
  windSpeed: number;        // km/h (al suolo)
  windGusts?: number;       // km/h
  windDir: number;          // gradi 0-360 (da dove viene il vento)
  esposizione: string;      // orientamento decollo: "N", "NE", ..., "SO", "NO"
  temperature: number;      // °C
  dewPoint: number;         // °C
  cloudCover: number;       // %
  precipitation: number;    // mm
  weatherCode?: number;     // WMO
  cape?: number;            // J/kg
  liftedIndex?: number;     // LI
  quota: number;            // metri slm
}

export interface RisultatoVolabilita {
  indice: number;           // 1 (Perfetto) ... 10 (Pericoloso)
  label: string;
  severity: "ottimo" | "buono" | "discreto" | "impegnativo" | "rischioso" | "pericoloso";
  baseNubiM: number;        // quota base cumuli (m slm)
  rateoTermicoMs: number;   // m/s stimato
  motivi: string[];
  windRelativo: "frontale" | "diagonale" | "laterale" | "di_coda" | "sconosciuto";
}

export function calcCloudBase(siteAlt: number, t: number, dew: number): number {
  const spread = t - dew;
  return Math.round(siteAlt + Math.min(MAX_CLOUD_BASE_GAIN, spread * 125));
}

export function esposizioneToGradi(esposizione: string | undefined | null): number {
  const m: Record<string, number> = {
    "N": 0, "NNE": 22.5, "NE": 45, "ENE": 67.5,
    "E": 90, "ESE": 112.5, "SE": 135, "SSE": 157.5,
    "S": 180, "SSW": 202.5, "SW": 225, "WSW": 247.5,
    "W": 270, "WNW": 292.5, "NW": 315, "NNW": 337.5,
    "O": 270, "SO": 225, "NO": 315, // alias italiani (O = Ovest)
    "S/SE": 157.5, "S/SW": 202.5, "N/NE": 22.5, "N/NW": 337.5,
    "E/NE": 67.5, "E/SE": 112.5, "W/NW": 292.5, "W/SW": 247.5,
    "SE/S": 157.5, "SW/S": 202.5, "SO/S": 202.5, "NE/N": 22.5,
  };
  if (!esposizione) return 180; // default: Sud
  const clean = esposizione.trim().toUpperCase().replace(/\s+/g, "");
  return m[clean] ?? 180;
}

function diffAngolare(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function windRelativoLabel(
  windDir: number,
  esposizione: string,
): "frontale" | "diagonale" | "laterale" | "di_coda" | "sconosciuto" {
  const expDeg = esposizioneToGradi(esposizione);
  const diff = diffAngolare(windDir, expDeg);
  if (diff <= 45) return "frontale";
  if (diff <= 90) return "diagonale";
  if (diff <= 135) return "laterale";
  return "di_coda";
}

export function calcolaIndiceVolabilita(p: ParametriVolabilita): RisultatoVolabilita {
  const motivi: string[] = [];

  // 1. BASE NUBI (LCL semplificato)
  const baseNubiM = calcCloudBase(p.quota, p.temperature, p.dewPoint);

  // 2. RATEO TERMICO stimato
  const spread = p.temperature - p.dewPoint;
  let rateoTermico = Math.max(0, spread * 0.22 + (p.cape ? Math.min(1.5, p.cape / 800) : 0.3));
  if (p.precipitation > 0.3 || (p.weatherCode !== undefined && p.weatherCode >= 51)) rateoTermico = 0;
  if (p.cloudCover > 85) rateoTermico *= 0.25;
  rateoTermico = Math.round(rateoTermico * 10) / 10;

  const pericoloso = (indice: number, label: string, severity: RisultatoVolabilita["severity"], motivo: string): RisultatoVolabilita => ({
    indice, label, severity, baseNubiM, rateoTermicoMs: 0, motivi: [motivo], windRelativo: "sconosciuto",
  });

  // 3. CONDIZIONI BLOCCANTI → indice >= 8
  if (p.weatherCode !== undefined && (p.weatherCode === 95 || p.weatherCode === 96 || p.weatherCode === 99)) {
    return pericoloso(10, "Pericoloso", "pericoloso", "Temporale in atto (WMO 95/96/99)");
  }
  if (p.cape !== undefined && p.cape > 1500 && p.precipitation > 0.5) {
    return pericoloso(9, "Rischioso", "rischioso", `CAPE estremo (${p.cape} J/kg) + pioggia`);
  }
  if (p.precipitation > 1.0) {
    return pericoloso(9, "Non volabile - Pioggia", "pericoloso", `Pioggia ${p.precipitation.toFixed(1)} mm`);
  }
  if (p.precipitation > 0.2) {
    return {
      indice: 8, label: "Sconsigliato - Pioviggine", severity: "rischioso",
      baseNubiM, rateoTermicoMs: rateoTermico, motivi: ["Pioviggine in corso"], windRelativo: "sconosciuto",
    };
  }
  if (p.windSpeed > 30 || (p.windGusts !== undefined && p.windGusts > 40)) {
    return pericoloso(9, "Pericoloso - Vento forte", "pericoloso",
      `Vento ${Math.round(p.windSpeed)} km/h, raffiche ${Math.round(p.windGusts || 0)} km/h`);
  }

  // 4. CALCOLO PROGRESSIVO (1 = perfetto)
  let punteggio = 1.0;

  // A. VENTO AL SUOLO (ideale 8-16 km/h)
  if (p.windSpeed < 3) {
    punteggio += 1.5; motivi.push("Vento quasi nullo (decollo a corsa)");
  } else if (p.windSpeed < 5) {
    // Fix gap 3-5 km/h: prima cadeva nel ramo "vento forte"
    punteggio += 0.5; motivi.push("Vento leggero, decollo a corsa");
  } else if (p.windSpeed >= 5 && p.windSpeed <= 15) {
    // ideale: +0
  } else if (p.windSpeed > 15 && p.windSpeed <= 20) {
    punteggio += 1.5; motivi.push("Vento moderato-sostenuto");
  } else if (p.windSpeed > 20 && p.windSpeed <= 26) {
    punteggio += 3.5; motivi.push("Vento sostenuto, impegnativo");
  } else {
    punteggio += 5.5; motivi.push("Vento forte al limite");
  }

  // Raffiche eccessive
  if (p.windGusts !== undefined && p.windGusts > p.windSpeed + 10) {
    punteggio += 2.0; motivi.push(`Raffiche irregolari (+${Math.round(p.windGusts - p.windSpeed)} km/h)`);
  }

  // B. DIREZIONE VENTO vs ESPOSIZIONE DECOLLO
  const rel = windRelativoLabel(p.windDir, p.esposizione);
  if (rel === "frontale") {
    // +0 - ideale
  } else if (rel === "diagonale") {
    punteggio += 0.5; motivi.push("Vento diagonale favorevole");
  } else if (rel === "laterale") {
    punteggio += 2.5; motivi.push("Vento laterale (crosswind forte)");
  } else if (rel === "di_coda") {
    punteggio += 5.0; motivi.push("VENTO DI CODA / SOTTOVENTO - PERICOLOSO");
  }

  // C. NUVOLOSITÀ
  if (p.cloudCover > 90) {
    punteggio += 2.0; motivi.push("Cielo coperto > 90%");
  } else if (p.cloudCover > 70) {
    punteggio += 1.0; motivi.push("Molto nuvoloso");
  }

  // D. BASE NUBI BASSA
  if (baseNubiM <= p.quota + 100) {
    punteggio += 3.0; motivi.push(`Base nubi bassa (${baseNubiM}m vs decollo ${p.quota}m)`);
  }

  // E. INSTABILITÀ / TURBOLENZA (CAPE, Lifted Index)
  if (p.cape !== undefined && p.cape > 1200) {
    punteggio += 1.5; motivi.push(`CAPE alto (${p.cape} J/kg) - turbolenza probabile`);
  }
  if (p.liftedIndex !== undefined && p.liftedIndex < -4) {
    punteggio += 1.0; motivi.push(`Lifted Index ${p.liftedIndex} - instabilità marcata`);
  }

  // Normalizza 1-10
  const indiceFinale = Math.max(1, Math.min(10, Math.round(punteggio)));

  let label = "";
  let severity: RisultatoVolabilita["severity"] = "discreto";
  if (indiceFinale <= 2) { label = "Perfetto"; severity = "ottimo"; }
  else if (indiceFinale <= 3) { label = "Ottimo"; severity = "ottimo"; }
  else if (indiceFinale <= 4) { label = "Buono"; severity = "buono"; }
  else if (indiceFinale <= 5) { label = "Discreto"; severity = "discreto"; }
  else if (indiceFinale <= 6) { label = "Impegnativo"; severity = "impegnativo"; }
  else if (indiceFinale <= 7) { label = "Difficile"; severity = "impegnativo"; }
  else if (indiceFinale <= 8) { label = "Rischioso"; severity = "rischioso"; }
  else { label = "Sconsigliato"; severity = "pericoloso"; }

  return {
    indice: indiceFinale,
    label,
    severity,
    baseNubiM,
    rateoTermicoMs: rateoTermico,
    motivi,
    windRelativo: rel,
  };
}

export interface OraTermica {
  time: string;             // ISO
  ora: number;              // 0-23
  temperature: number;      // °C
  dewPoint: number;         // °C
  windSpeed: number | null; // km/h
  windGusts: number | null; // km/h
  cloudCover: number | null; // %
  humidity: number | null;  // %
  precipitation: number | null; // mm
  weatherCode: number | null;   // WMO
  rateo: number;            // m/s
  base: number;             // m slm
  top: number;              // m slm
  forza: number;            // 0-10
  attendibilita: number;    // 0-100
}

export interface InputTermica {
  time: string;
  temperature: number;
  dewPoint: number;
  windSpeed?: number | null;
  windGusts?: number | null;
  cloudCover?: number | null;
  humidity?: number | null;
  precipitation?: number | null;
  weatherCode?: number | null;
}

/**
 * Calcola le termiche a partire dai dati orari reali (Open-Meteo).
 * Restituisce null quando mancano dati fondamentali (temperature o dew point).
 */
export function calcolaTermiche(h: InputTermica | undefined | null, altitude: number = 500): OraTermica | null {
  if (!h || typeof h.temperature !== "number" || !Number.isFinite(h.temperature)) return null;
  const temp = h.temperature;
  const dewPoint = (h.dewPoint != null && h.dewPoint > -10) ? h.dewPoint : null;
  if (dewPoint == null) return null;

  const windSpeed = h.windSpeed ?? null;
  const cloudCover = h.cloudCover ?? null;
  const humidity = h.humidity ?? null;
  const precipitation = h.precipitation ?? null;
  const weatherCode = h.weatherCode ?? null;
  const ora = new Date(h.time).getHours();

  const base: Omit<OraTermica, "rateo" | "base" | "top" | "forza" | "attendibilita"> = {
    time: h.time,
    ora,
    temperature: temp,
    dewPoint,
    windSpeed,
    windGusts: h.windGusts ?? null,
    cloudCover,
    humidity,
    precipitation,
    weatherCode,
  };

  // Se piove o temporale -> termiche assenti
  if ((precipitation != null && precipitation > 1) || (weatherCode != null && weatherCode >= 95)) {
    return { ...base, rateo: 0, base: altitude, top: altitude + 50, forza: 0, attendibilita: 90 };
  }

  // Se precipitation > 0.3 ma < 1, termiche molto deboli
  if (precipitation != null && precipitation > 0.3) {
    return { ...base, rateo: 0.3, base: altitude, top: altitude + 100, forza: 0.3, attendibilita: 80 };
  }

  const spread = temp - dewPoint;

  // Se fa molto freddo
  if (temp < 5) {
    return { ...base, rateo: 0.2, base: altitude, top: altitude + 100, forza: 0.2, attendibilita: 60 };
  }

  // Rateo principale: spread * 0.25 + 0.25
  let rateo = spread * 0.25 + 0.25;

  // Bonus ora del giorno (picco 11-15)
  if (ora >= 11 && ora <= 15) rateo += 0.5;
  else if (ora >= 9 && ora <= 10) rateo += 0.3;
  else if (ora >= 16 && ora <= 17) rateo += 0.2;
  else if (ora < 8 || ora > 18) rateo = Math.min(rateo, 0.5);

  // Vento: usa dato reale quando disponibile
  if (windSpeed != null) {
    if (windSpeed >= 5 && windSpeed <= 15) rateo += 0.4;
    else if (windSpeed > 15 && windSpeed <= 22) rateo -= 0.3;
    else if (windSpeed > 22) rateo -= 0.6;
    else if (windSpeed < 3) rateo -= 0.4;
  }

  // Nuvolosità
  if (cloudCover != null) {
    if (cloudCover >= 15 && cloudCover <= 50) rateo += 0.3;
    else if (cloudCover > 70) rateo -= 0.6;
    else if (cloudCover > 50) rateo -= 0.3;
  }

  // Temperatura alta = più energia
  if (temp >= 25 && temp <= 32) rateo += 0.4;
  else if (temp >= 20 && temp < 25) rateo += 0.2;
  else if (temp > 32) rateo += 0.2;

  // Umidità
  if (humidity != null) {
    if (humidity > 75) rateo -= 0.4;
    else if (humidity > 85) rateo -= 0.7;
  }

  // Clamp e arrotonda
  rateo = Math.max(0.1, Math.min(4.5, rateo));
  rateo = Math.round(rateo * 10) / 10;

  // Base termica (LCL)
  const baseM = Math.max(altitude + 100, calcCloudBase(altitude, temp, dewPoint));

  // Top termico
  const topIncrement = rateo * 400 + spread * 50;
  const top = Math.max(baseM + 150, Math.round(altitude + topIncrement));

  // Forza (0-10)
  const forza = Math.min(10, Math.max(1, Math.round(rateo * 2.5)));

  // Attendibilità
  const attendibilita = Math.min(100, Math.round(
    50 + (h.dewPoint != null && h.dewPoint > -10 ? 20 : 0) +
    (h.windGusts != null ? 10 : 0) +
    (rateo > 0.5 ? 15 : 0),
  ));

  return { ...base, rateo, base: baseM, top, forza, attendibilita };
}

export interface EsitoVentoDecollo {
  windRelativo: "frontale" | "diagonale" | "laterale" | "di_coda" | "sconosciuto";
  classificazione: "ideale" | "buono" | "attenzione" | "sconsigliato" | "pericoloso";
  decolloConsigliato: boolean;
  ventoMedioKmh: number;
  rafficheKmh: number | null;
  direzioneGradi: number;
  esposizioneGradi: number;
  deltaAngolare: number;
  motivi: string[];
}

/**
 * Valida il vento in superficie rispetto all'esposizione del decollo.
 */
export function valutaVentoDecollo(input: {
  windSpeed: number;
  windGusts?: number | null;
  windDir: number;
  esposizione: string;
}): EsitoVentoDecollo {
  const { windSpeed, windGusts, windDir, esposizione } = input;
  const esposizioneGradi = esposizioneToGradi(esposizione);
  const rel = windRelativoLabel(windDir, esposizione);
  const delta = diffAngolare(windDir, esposizioneGradi);
  const motivi: string[] = [];

  let classificazione: EsitoVentoDecollo["classificazione"] = "ideale";
  let decolloConsigliato = true;

  // Direzione
  if (rel === "frontale") {
    motivi.push("Vento frontale sul decollo: gin chiaro e decollo in sicurezza");
  } else if (rel === "diagonale") {
    classificazione = "buono";
    motivi.push("Vento diagonale: corsa leggermente più lunga, gestibile");
  } else if (rel === "laterale") {
    classificazione = "attenzione";
    decolloConsigliato = windSpeed <= 18;
    motivi.push("Vento laterale marcato: valuta decolli alternativi allineati");
  } else if (rel === "di_coda") {
    classificazione = "pericoloso";
    decolloConsigliato = false;
    motivi.push("VENTO DI CODA: rischio gonfiata e ribaltamento, non decollare");
  }

  // Intensità
  if (windSpeed < 3) {
    motivi.push("Vento debole: serve decollo a corsa");
    if (classificazione === "ideale") classificazione = "buono";
  } else if (windSpeed < 5) {
    motivi.push("Vento leggero (3-5 km/h): decollo a corsa agevolato");
    if (classificazione === "ideale") classificazione = "buono";
  } else if (windSpeed >= 5 && windSpeed <= 15) {
    motivi.push("Vento ideale per il gonfiaggio (5-15 km/h)");
  } else if (windSpeed <= 20) {
    if (classificazione === "ideale" || classificazione === "buono") classificazione = "attenzione";
    motivi.push("Vento sostenuto (16-20 km/h): solo piloti esperti");
  } else if (windSpeed <= 26) {
    classificazione = "sconsigliato";
    decolloConsigliato = false;
    motivi.push("Vento forte (21-26 km/h): decollo sconsigliato");
  } else {
    classificazione = "pericoloso";
    decolloConsigliato = false;
    motivi.push("Vento oltre 26 km/h: oltre il limite di sicurezza");
  }

  // Raffiche
  if (windGusts != null) {
    const deltaRaffiche = windGusts - windSpeed;
    if (windGusts > 40) {
      classificazione = "pericoloso";
      decolloConsigliato = false;
      motivi.push(`Raffiche oltre 40 km/h (${Math.round(windGusts)})`);
    } else if (deltaRaffiche > 10) {
      if (classificazione === "ideale" || classificazione === "buono") classificazione = "attenzione";
      motivi.push(`Gradient di raffica elevato (+${Math.round(deltaRaffiche)} km/h): turbolenza probabile`);
    }
  }

  return {
    windRelativo: rel,
    classificazione,
    decolloConsigliato,
    ventoMedioKmh: Math.round(windSpeed * 10) / 10,
    rafficheKmh: windGusts != null ? Math.round(windGusts * 10) / 10 : null,
    direzioneGradi: Math.round(windDir),
    esposizioneGradi,
    deltaAngolare: Math.round(delta),
    motivi,
  };
}
