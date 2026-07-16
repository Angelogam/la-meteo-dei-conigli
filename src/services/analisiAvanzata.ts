"use client";

/**
 * MOTORE DI ANALISI METEOROLOGICA AVANZATA
 * 
 * Usa TUTTI i dati disponibili da Open-Meteo per calcolare previsioni precise:
 * - Gradiente termico verticale reale (da temperature a 80m, 120m)
 * - CAPE, CIN, Lifted Index (energia convettiva reale)
 * - Profilo vento fino a 4000m
 * - Stabilità atmosferica multi-livello
 * 
 * L'algoritmo restituisce un punteggio di confidenza per ogni predizione.
 */

import type { MeteoHourly, MeteoDaily, MeteoCurrent } from "./weatherService";

// Costanti fisiche
const ADIABATIC_SECCO = 0.98; // °C/100m
const ADIABATIC_UMIDO = 0.6;  // °C/100m
const LCL_FACTOR = 125;       // (T - Td) × 125 = base nuvole in metri
const GRAVITY = 9.80665;      // m/s²
const CP = 1004;              // J/kg·K (calore specifico aria secca)

export interface AnalisiCompleta {
  // Dati base
  data: string;
  ora: number;
  
  // Temperature
  temperatura: number;
  tempMax: number;
  tempMin: number;
  deltaTermico: number;
  
  // Umidità e rugiada
  umidita: number;
  rugiada: number;
  spread: number;
  
  // Pressione
  pressione: number;
  tendenzaPressione: "stabile" | "in aumento" | "in calo";
  
  // Nuvolosità
  nuvolositaMedia: number;
  copertura: "sereno" | "poco nuvoloso" | "nuvoloso" | "molto nuvoloso" | "coperto";
  
  // Vento
  ventoMedio: number;
  ventoMax: number;
  rafficheMax: number;
  direzioneDominante: string;
  direzioneGradi: number;
  
  // CAPE e stabilità
  cape: number;
  cin: number;
  liftedIndex: number;
  stabilitàAtmosferica: "molto stabile" | "stabile" | "leggermente instabile" | "instabile" | "molto instabile";
  
  // Termiche
  baseNuvole: number;
  zeroTermico: number;
  topTermico: number;
  rateoSalita: number;
  forzaTermica: number; // 0-10
  intensitaTermica: "assenti" | "deboli" | "moderate" | "buone" | "forti" | "molto forti";
  
  // Gradiente termico
  gradienteReale: number;
  gradienteDescrizione: string;
  
  // Turbolenza
  turbolenza: "assente" | "leggera" | "moderata" | "forte" | "severa";
  windShear: number;
  
  // Precipitazioni
  pioggiaTotale: number;
  probabilitàPioggia: number;
  rischioTemporali: number; // 0-100
  
  // Radiazione UV
  uvIndex: number;
  
  // Qualità volo
  voloScore: number; // 0-100
  voloGiudizio: string;
  voloDescrizione: string;
  
  // Confidenza
  confidenza: number; // 0-1
}

function getCopertura(clouds: number): AnalsiCompleta["copertura"] {
  if (clouds < 10) return "sereno";
  if (clouds < 25) return "poco nuvoloso";
  if (clouds < 50) return "nuvoloso";
  if (clouds < 80) return "molto nuvoloso";
  return "coperto";
}

function getCardinalDir(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function calcolaStabilità(cape: number, cin: number, li: number, gradiente: number): AnalsiCompleta["stabilitàAtmosferica"] {
  let score = 0;
  
  // Da CAPE
  if (cape > 1500) score += 5;
  else if (cape > 1000) score += 4;
  else if (cape > 500) score += 3;
  else if (cape > 200) score += 2;
  else if (cape > 50) score += 1;
  
  // Da Lifted Index
  if (li < -6) score += 4;
  else if (li < -4) score += 3;
  else if (li < -2) score += 2;
  else if (li < 0) score += 1;
  else if (li > 2) score -= 1;
  
  // Da gradiente
  if (gradiente > 1.2) score += 2;
  else if (gradiente < 0.6) score -= 1;
  
  if (score >= 8) return "molto instabile";
  if (score >= 5) return "instabile";
  if (score >= 3) return "leggermente instabile";
  if (score >= 1) return "stabile";
  return "molto stabile";
}

function calcolaIntensitaTermica(forza: number): AnalsiCompleta["intensitaTermica"] {
  if (forza >= 9) return "molto forti";
  if (forza >= 7) return "forti";
  if (forza >= 5) return "buone";
  if (forza >= 3) return "moderate";
  if (forza >= 1) return "deboli";
  return "assenti";
}

function calcolaTurbolenza(windGusts: number, windShear: number, stabilità: string): AnalsiCompleta["turbolenza"] {
  let score = 0;
  
  if (windGusts > 40) score += 4;
  else if (windGusts > 30) score += 3;
  else if (windGusts > 20) score += 2;
  else if (windGusts > 12) score += 1;
  
  if (windShear > 15) score += 3;
  else if (windShear > 8) score += 2;
  else if (windShear > 4) score += 1;
  
  if (stabilità === "molto instabile") score += 2;
  else if (stabilità === "instabile") score += 1;
  
  if (score >= 7) return "severa";
  if (score >= 5) return "forte";
  if (score >= 3) return "moderata";
  if (score >= 1) return "leggera";
  return "assente";
}

export function analisiAvanzataCompleta(
  hourlyData: MeteoHourly[],
  current: MeteoCurrent,
  altitude: number
): AnalisiCompleta[] {
  if (!hourlyData || hourlyData.length === 0) return [];
  
  const oreAnalizzate = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const oggi = new Date();
  const giorno = oggi.getDate();
  
  return oreAnalizzate.map(ora => {
    // Trova il dato meteo per quest'ora
    const weather = hourlyData.find(h => {
      const t = new Date(h.time);
      return t.getHours() === ora && t.getDate() === giorno;
    });
    
    if (!weather) {
      return generaAnalisiVuota(ora);
    }
    
    return analizzaOra(weather, hourlyData, current, altitude, ora);
  });
}

function analizzaOra(
  weather: MeteoHourly,
  allHours: MeteoHourly[],
  current: MeteoCurrent,
  altitude: number,
  ora: number
): AnalisiCompleta {
  // 1. CALCOLI BASE
  const spread = weather.temperature - weather.dewPoint;
  const baseNuvole = Math.max(200, Math.min(4000, altitude + Math.round(spread * LCL_FACTOR)));
  const zeroTermico = Math.max(0, Math.round(altitude + (weather.temperature / 0.0098) + 200));
  
  // 2. GRADIENTE TERMICO REALE
  let gradienteReale = ADIABATIC_SECCO;
  let gradienteDescrizione = "Adiabatico secco (stimato)";
  
  if (weather.temp80m != null) {
    gradienteReale = ((weather.temperature - weather.temp80m) / 78) * 100;
    gradienteDescrizione = "Da T80m (reale)";
  } else if (weather.temp120m != null) {
    gradienteReale = ((weather.temperature - weather.temp120m) / 118) * 100;
    gradienteDescrizione = "Da T120m (reale)";
  }
  
  // 3. FORZA TERMICA REALE (algoritmo fisico multi-parametrico)
  let forzaTermica = 0;
  
  // Gradiente verticale (max 3 punti)
  if (gradienteReale >= 1.2) forzaTermica += 3;
  else if (gradienteReale >= ADIABATIC_SECCO) forzaTermica += 2.5;
  else if (gradienteReale >= 0.7) forzaTermica += 1.5;
  else if (gradienteReale >= 0.4) forzaTermica += 0.5;
  
  // Vento (max 2 punti)
  if (weather.windSpeed >= 5 && weather.windSpeed <= 12) forzaTermica += 2;
  else if (weather.windSpeed >= 3 && weather.windSpeed < 5) forzaTermica += 1.5;
  else if (weather.windSpeed > 12 && weather.windSpeed <= 18) forzaTermica += 1.2;
  else if (weather.windSpeed > 18 && weather.windSpeed <= 22) forzaTermica += 0.5;
  
  // Nuvolosità (max 2 punti)
  if (weather.cloudCover >= 15 && weather.cloudCover <= 45) forzaTermica += 2;
  else if (weather.cloudCover >= 5 && weather.cloudCover < 15) forzaTermica += 1.5;
  else if (weather.cloudCover > 45 && weather.cloudCover <= 60) forzaTermica += 0.5;
  
  // Umidità (max 1.5 punti)
  if (weather.humidity >= 30 && weather.humidity <= 50) forzaTermica += 1.5;
  else if (weather.humidity > 50 && weather.humidity <= 65) forzaTermica += 1;
  else if (weather.humidity > 65 && weather.humidity <= 75) forzaTermica += 0.3;
  
  // Spread T-Td (max 1.5 punti)
  if (spread >= 12) forzaTermica += 1.5;
  else if (spread >= 8) forzaTermica += 1.2;
  else if (spread >= 5) forzaTermica += 0.8;
  else if (spread >= 3) forzaTermica += 0.3;
  
  // CAPE reale (max 2 punti bonus)
  if (weather.cape > 1500) forzaTermica += 2;
  else if (weather.cape > 800) forzaTermica += 1.5;
  else if (weather.cape > 300) forzaTermica += 1;
  else if (weather.cape > 100) forzaTermica += 0.5;
  
  // Ora del giorno (max 0.5 punti)
  if (ora >= 11 && ora <= 15) forzaTermica += 0.5;
  else if (ora >= 9 && ora < 11) forzaTermica += 0.3;
  else if (ora > 15 && ora <= 17) forzaTermica += 0.2;
  
  // UV Index (max 0.5 punti)
  if (weather.uvIndex >= 7) forzaTermica += 0.5;
  else if (weather.uvIndex >= 5) forzaTermica += 0.3;
  else if (weather.uvIndex >= 3) forzaTermica += 0.2;
  
  // Pioggia annulla tutto
  if (weather.precipitation > 1) forzaTermica = 0;
  
  forzaTermica = Math.max(0, Math.min(10, Math.round(forzaTermica * 10) / 10));
  
  // 4. RATEO DI SALITA (m/s) - formula fisica basata su CAPE e spessore termico
  let rateoSalita = 0;
  if (weather.cape > 50 && (baseNuvole - altitude) > 200) {
    const spessore = Math.max(300, (weather.cape * 2.5) - baseNuvole);
    rateoSalita = Math.sqrt((2 * Math.max(1, weather.cape)) / spessore) * 4;
  } else {
    rateoSalita = (forzaTermica / 10) * 4.5;
  }
  
  // Correzione per vento forte
  if (weather.windSpeed > 22) rateoSalita *= 0.5;
  else if (weather.windSpeed > 15) rateoSalita *= 0.8;
  
  // Correzione per nuvolosità eccessiva
  if (weather.cloudCover > 75) rateoSalita *= 0.2;
  else if (weather.cloudCover > 60) rateoSalita *= 0.5;
  
  // Pioggia
  if (weather.precipitation > 1) rateoSalita = 0;
  
  rateoSalita = Math.max(0.05, Math.round(rateoSalita * 10) / 10);
  
  // 5. TOP TERMICO
  let topTermico: number;
  if (weather.cape > 50) {
    topTermico = Math.min(6000, baseNuvole + Math.round(weather.cape * 2.5));
  } else {
    topTermico = Math.min(5000, baseNuvole + Math.round(forzaTermica * 300));
  }
  
  // 6. WIND SHEAR
  const windShear = weather.windProfile?.length > 1
    ? Math.max(...weather.windProfile.map((w, i, arr) => 
        i === 0 ? 0 : Math.abs(w.speed - arr[i-1].speed)
      ))
    : 0;
  
  // 7. STABILITÀ ATMOSFERICA
  const stabilità = calcolaStabilità(
    weather.cape,
    weather.cin,
    weather.liftedIndex,
    gradienteReale
  );
  
  // 8. TURBOLENZA
  const turbolenza = calcolaTurbolenza(
    weather.windGusts,
    windShear,
    stabilità
  );
  
  // 9. RISCHIO TEMPORALI (0-100%)
  let rischioTemporali = 0;
  
  if (weather.weatherCode >= 95) {
    rischioTemporali = 100;
  } else if (weather.precipitation > 2 && weather.cape > 500) {
    rischioTemporali = 60;
  } else if (weather.cape > 1000 && stabilità !== "molto stabile") {
    rischioTemporali = 40;
  } else if (weather.cape > 500) {
    rischioTemporali = 20;
  } else if (weather.cape > 200) {
    rischioTemporali = 10;
  } else {
    rischioTemporali = 2;
  }
  
  // Ore pomeridiane aumentano il rischio
  if (ora >= 13 && ora <= 17) {
    rischioTemporali = Math.min(100, rischioTemporali * 1.3);
  }
  
  // 10. TENDENZA PRESSIONE
  const now = new Date().getHours();
  const nowIdx = allHours.findIndex(h => {
    const t = new Date(h.time);
    return t.getHours() === now && t.getDate() === new Date().getDate();
  });
  
  let tendenzaPressione: AnalsiCompleta["tendenzaPressione"] = "stabile";
  if (nowIdx > 0 && nowIdx < allHours.length - 1) {
    const diff = (allHours[nowIdx + 1]?.pressure ?? 1013) - (allHours[nowIdx]?.pressure ?? 1013);
    if (diff > 2) tendenzaPressione = "in aumento";
    else if (diff < -2) tendenzaPressione = "in calo";
  }
  
  // 11. CALCOLA TEMP MAX/MIN DAL GIORNO
  const oggi = allHours.filter(h => {
    const t = new Date(h.time);
    return t.getDate() === new Date().getDate();
  });
  const tempMax = Math.max(...oggi.map(h => h.temperature));
  const tempMin = Math.min(...oggi.map(h => h.temperature));
  const deltaTermico = Math.round((tempMax - tempMin) * 10) / 10;
  
  // 12. VOLO SCORE (0-100)
  let voloScore = 50; // base
  
  // Vento ideale
  if (weather.windSpeed >= 5 && weather.windSpeed <= 12) voloScore += 20;
  else if (weather.windSpeed >= 3 && weather.windSpeed < 5) voloScore += 10;
  else if (weather.windSpeed > 18 && weather.windSpeed <= 22) voloScore += 5;
  else if (weather.windSpeed > 22 && weather.windSpeed <= 28) voloScore -= 10;
  else if (weather.windSpeed > 28) voloScore -= 20;
  else if (weather.windSpeed < 3) voloScore -= 5;
  
  // Termiche
  if (forzaTermica >= 7) voloScore += 20;
  else if (forzaTermica >= 5) voloScore += 15;
  else if (forzaTermica >= 3) voloScore += 10;
  else if (forzaTermica >= 1) voloScore += 5;
  
  // Pioggia
  if (weather.precipitation === 0) voloScore += 15;
  else if (weather.precipitation < 0.3) voloScore += 8;
  else if (weather.precipitation > 1) voloScore -= 20;
  
  // Nuvolosità
  if (weather.cloudCover >= 15 && weather.cloudCover <= 45) voloScore += 10;
  else if (weather.cloudCover < 15) voloScore += 5;
  else if (weather.cloudCover > 60) voloScore -= 5;
  else if (weather.cloudCover > 80) voloScore -= 10;
  
  // Turbolenza
  if (turbolenza === "assente" || turbolenza === "leggera") voloScore += 5;
  else if (turbolenza === "moderata") voloScore -= 5;
  else if (turbolenza === "forte") voloScore -= 15;
  else if (turbolenza === "severa") voloScore -= 25;
  
  // Rischio temporali
  if (rischioTemporali < 10) voloScore += 5;
  else if (rischioTemporali > 50) voloScore -= 15;
  
  // CAPE ideale (né troppo poco né troppo)
  if (weather.cape >= 100 && weather.cape <= 800) voloScore += 10;
  else if (weather.cape > 800 && weather.cape <= 1500) voloScore += 5;
  else if (weather.cape > 1500) voloScore -= 5;
  
  voloScore = Math.max(0, Math.min(100, voloScore));
  
  // Giudizio volo
  let voloGiudizio: string;
  let voloDescrizione: string;
  
  if (voloScore >= 85) {
    voloGiudizio = "ECCELLENTE 🪂🔥";
    voloDescrizione = "Condizioni perfette per il volo libero. Termiche robuste, vento ideale, cielo favorevole. Si vola!";
  } else if (voloScore >= 70) {
    voloGiudizio = "BUONO ✅";
    voloDescrizione = "Buone condizioni per il volo. Qualche limite ma nel complesso si vola bene.";
  } else if (voloScore >= 55) {
    voloGiudizio = "DISCRETO ⚠️";
    voloDescrizione = "Condizioni discrete. Volo possibile ma con attenzione. Valuta bene il sito.";
  } else if (voloScore >= 40) {
    voloGiudizio = "DIFFICILE 🌤️";
    voloDescrizione = "Condizioni difficili. Solo per piloti esperti che conoscono bene il sito.";
  } else if (voloScore >= 25) {
    voloGiudizio = "SCONSIGLIATO ⛔";
    voloDescrizione = "Condizioni avverse. Meglio rimandare a un giorno migliore.";
  } else {
    voloGiudizio = "PERICOLOSO 🚨";
    voloDescrizione = "Condizioni pericolose. NON VOLARE.";
  }
  
  // 13. CONFIDENZA (quanto possiamo fidarci di questa analisi)
  let confidenza = 0.5; // base
  
  if (weather.cape > 0 && weather.cape < 10000) confidenza += 0.1;
  if (weather.temp80m != null || weather.temp120m != null) confidenza += 0.15;
  if (weather.windProfile && weather.windProfile.length >= 3) confidenza += 0.1;
  if (weather.cin !== 0) confidenza += 0.05;
  if (weather.liftedIndex > -10 && weather.liftedIndex < 10) confidenza += 0.05;
  if (spread > 0) confidenza += 0.05;
  
  confidenza = Math.min(0.99, confidenza);

  const tempMaxGiorno = oggi.length > 0 ? Math.max(...oggi.map(h => h.temperature)) : weather.temperature;
  const tempMinGiorno = oggi.length > 0 ? Math.min(...oggi.map(h => h.temperature)) : weather.temperature;

  return {
    data: new Date(weather.time).toLocaleDateString("it-IT"),
    ora,
    temperatura: Math.round(weather.temperature),
    tempMax: Math.round(tempMaxGiorno),
    tempMin: Math.round(tempMinGiorno),
    deltaTermico: Math.round((tempMaxGiorno - tempMinGiorno) * 10) / 10,
    umidita: Math.round(weather.humidity),
    rugiada: Math.round(weather.dewPoint),
    spread: Math.round(spread * 10) / 10,
    pressione: Math.round(weather.pressure),
    tendenzaPressione,
    nuvolositaMedia: Math.round(weather.cloudCover),
    copertura: getCopertura(weather.cloudCover),
    ventoMedio: Math.round(weather.windSpeed),
    ventoMax: Math.round(Math.max(weather.windSpeed, weather.windGusts || 0)),
    rafficheMax: Math.round(weather.windGusts || weather.windSpeed * 1.4),
    direzioneDominante: getCardinalDir(weather.windDir),
    direzioneGradi: Math.round(weather.windDir),
    cape: Math.round(weather.cape),
    cin: Math.round(weather.cin),
    liftedIndex: Math.round(weather.liftedIndex * 10) / 10,
    stabilitàAtmosferica: stabilità,
    baseNuvole,
    zeroTermico,
    topTermico,
    rateoSalita,
    forzaTermica,
    intensitaTermica: calcolaIntensitaTermica(forzaTermica),
    gradienteReale: Math.round(gradienteReale * 100) / 100,
    gradienteDescrizione,
    turbolenza,
    windShear: Math.round(windShear),
    pioggiaTotale: Math.round(weather.precipitation * 10) / 10,
    probabilitàPioggia: weather.precipitationProbability,
    rischioTemporali: Math.round(rischioTemporali),
    uvIndex: weather.uvIndex,
    voloScore,
    voloGiudizio,
    voloDescrizione,
    confidenza: Math.round(confidenza * 100) / 100,
  };
}

function generaAnalisiVuota(ora: number): AnalisiCompleta {
  return {
    data: new Date().toLocaleDateString("it-IT"),
    ora,
    temperatura: 0,
    tempMax: 0,
    tempMin: 0,
    deltaTermico: 0,
    umidita: 0,
    rugiada: 0,
    spread: 0,
    pressione: 1013,
    tendenzaPressione: "stabile",
    nuvolositaMedia: 0,
    copertura: "sereno",
    ventoMedio: 0,
    ventoMax: 0,
    rafficheMax: 0,
    direzioneDominante: "N",
    direzioneGradi: 0,
    cape: 0,
    cin: 0,
    liftedIndex: 0,
    stabilitàAtmosferica: "stabile",
    baseNuvole: 0,
    zeroTermico: 0,
    topTermico: 0,
    rateoSalita: 0,
    forzaTermica: 0,
    intensitaTermica: "assenti",
    gradienteReale: 0.98,
    gradienteDescrizione: "N/D",
    turbolenza: "assente",
    windShear: 0,
    pioggiaTotale: 0,
    probabilitàPioggia: 0,
    rischioTemporali: 0,
    uvIndex: 0,
    voloScore: 0,
    voloGiudizio: "N/D",
    voloDescrizione: "Dati non disponibili per questa ora.",
    confidenza: 0,
  };
}