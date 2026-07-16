"use client";

import type { MeteoHourly, MeteoCurrent } from "./weatherService";

const ADIABATIC_SECCO = 0.98;
const LCL_FACTOR = 125;

export interface AnalisiCompleta {
  data: string;
  ora: number;
  temperatura: number;
  tempMax: number;
  tempMin: number;
  deltaTermico: number;
  umidita: number;
  rugiada: number;
  spread: number;
  pressione: number;
  tendenzaPressione: "stabile" | "in aumento" | "in calo";
  nuvolositaMedia: number;
  copertura: "sereno" | "poco nuvoloso" | "nuvoloso" | "molto nuvoloso" | "coperto";
  ventoMedio: number;
  ventoMax: number;
  rafficheMax: number;
  direzioneDominante: string;
  direzioneGradi: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  stabilitàAtmosferica: "molto stabile" | "stabile" | "leggermente instabile" | "instabile" | "molto instabile";
  baseNuvole: number;
  zeroTermico: number;
  topTermico: number;
  rateoSalita: number;
  forzaTermica: number;
  intensitaTermica: "assenti" | "deboli" | "moderate" | "buone" | "forti" | "molto forti";
  gradienteReale: number;
  gradienteDescrizione: string;
  turbolenza: "assente" | "leggera" | "moderata" | "forte" | "severa";
  windShear: number;
  pioggiaTotale: number;
  probabilitàPioggia: number;
  rischioTemporali: number;
  uvIndex: number;
  voloScore: number;
  voloGiudizio: string;
  voloDescrizione: string;
  confidenza: number;
}

function getCopertura(clouds: number): AnalisiCompleta["copertura"] {
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

function calcolaStabilità(cape: number, cin: number, li: number, gradiente: number): AnalisiCompleta["stabilitàAtmosferica"] {
  let score = 0;
  if (cape > 1500) score += 5;
  else if (cape > 1000) score += 4;
  else if (cape > 500) score += 3;
  else if (cape > 200) score += 2;
  else if (cape > 50) score += 1;
  if (li < -6) score += 4;
  else if (li < -4) score += 3;
  else if (li < -2) score += 2;
  else if (li < 0) score += 1;
  else if (li > 2) score -= 1;
  if (gradiente > 1.2) score += 2;
  else if (gradiente < 0.6) score -= 1;
  if (score >= 8) return "molto instabile";
  if (score >= 5) return "instabile";
  if (score >= 3) return "leggermente instabile";
  if (score >= 1) return "stabile";
  return "molto stabile";
}

function calcolaIntensitaTermica(forza: number): AnalisiCompleta["intensitaTermica"] {
  if (forza >= 9) return "molto forti";
  if (forza >= 7) return "forti";
  if (forza >= 5) return "buone";
  if (forza >= 3) return "moderate";
  if (forza >= 1) return "deboli";
  return "assenti";
}

function calcolaTurbolenza(windGusts: number, windShear: number, stabilità: string): AnalisiCompleta["turbolenza"] {
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
    const weather = hourlyData.find(h => {
      const t = new Date(h.time);
      return t.getHours() === ora && t.getDate() === giorno;
    });
    if (!weather) return generaAnalisiVuota(ora);
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
  const spread = weather.temperature - weather.dewPoint;
  const baseNuvole = Math.max(200, Math.min(4000, altitude + Math.round(spread * LCL_FACTOR)));
  const zeroTermico = Math.max(0, Math.round(altitude + (weather.temperature / 0.0098) + 200));

  let gradienteReale = ADIABATIC_SECCO;
  let gradienteDescrizione = "Adiabatico secco (stimato)";
  if (weather.temp80m != null && weather.temp80m > 0) {
    gradienteReale = ((weather.temperature - weather.temp80m) / 78) * 100;
    gradienteDescrizione = "Da T80m (reale)";
  } else if (weather.temp120m != null && weather.temp120m > 0) {
    gradienteReale = ((weather.temperature - weather.temp120m) / 118) * 100;
    gradienteDescrizione = "Da T120m (reale)";
  }

  let forzaTermica = 0;
  if (gradienteReale >= 1.2) forzaTermica += 3;
  else if (gradienteReale >= ADIABATIC_SECCO) forzaTermica += 2.5;
  else if (gradienteReale >= 0.7) forzaTermica += 1.5;
  else if (gradienteReale >= 0.4) forzaTermica += 0.5;
  if (weather.windSpeed >= 5 && weather.windSpeed <= 12) forzaTermica += 2;
  else if (weather.windSpeed >= 3 && weather.windSpeed < 5) forzaTermica += 1.5;
  else if (weather.windSpeed > 12 && weather.windSpeed <= 18) forzaTermica += 1.2;
  else if (weather.windSpeed > 18 && weather.windSpeed <= 22) forzaTermica += 0.5;
  if (weather.cloudCover >= 15 && weather.cloudCover <= 45) forzaTermica += 2;
  else if (weather.cloudCover >= 5 && weather.cloudCover < 15) forzaTermica += 1.5;
  else if (weather.cloudCover > 45 && weather.cloudCover <= 60) forzaTermica += 0.5;
  if (weather.humidity >= 30 && weather.humidity <= 50) forzaTermica += 1.5;
  else if (weather.humidity > 50 && weather.humidity <= 65) forzaTermica += 1;
  else if (weather.humidity > 65 && weather.humidity <= 75) forzaTermica += 0.3;
  if (spread >= 12) forzaTermica += 1.5;
  else if (spread >= 8) forzaTermica += 1.2;
  else if (spread >= 5) forzaTermica += 0.8;
  else if (spread >= 3) forzaTermica += 0.3;
  if (weather.cape > 1500) forzaTermica += 2;
  else if (weather.cape > 800) forzaTermica += 1.5;
  else if (weather.cape > 300) forzaTermica += 1;
  else if (weather.cape > 100) forzaTermica += 0.5;
  if (ora >= 11 && ora <= 15) forzaTermica += 0.5;
  else if (ora >= 9 && ora < 11) forzaTermica += 0.3;
  else if (ora > 15 && ora <= 17) forzaTermica += 0.2;
  if (weather.uvIndex >= 7) forzaTermica += 0.5;
  else if (weather.uvIndex >= 5) forzaTermica += 0.3;
  else if (weather.uvIndex >= 3) forzaTermica += 0.2;
  if (weather.precipitation > 1) forzaTermica = 0;
  forzaTermica = Math.max(0, Math.min(10, Math.round(forzaTermica * 10) / 10));

  let rateoSalita = 0;
  if (weather.cape > 50 && (baseNuvole - altitude) > 200) {
    const spessore = Math.max(300, (weather.cape * 2.5) - baseNuvole);
    rateoSalita = Math.sqrt((2 * Math.max(1, weather.cape)) / spessore) * 4;
  } else {
    rateoSalita = (forzaTermica / 10) * 4.5;
  }
  if (weather.windSpeed > 22) rateoSalita *= 0.5;
  else if (weather.windSpeed > 15) rateoSalita *= 0.8;
  if (weather.cloudCover > 75) rateoSalita *= 0.2;
  else if (weather.cloudCover > 60) rateoSalita *= 0.5;
  if (weather.precipitation > 1) rateoSalita = 0;
  rateoSalita = Math.max(0.05, Math.round(rateoSalita * 10) / 10);

  let topTermico: number;
  if (weather.cape > 50) {
    topTermico = Math.min(6000, baseNuvole + Math.round(weather.cape * 2.5));
  } else {
    topTermico = Math.min(5000, baseNuvole + Math.round(forzaTermica * 300));
  }

  const windShear = weather.windProfile?.length > 1
    ? Math.max(...weather.windProfile.map((w, i, arr) =>
        i === 0 ? 0 : Math.abs(w.speed - arr[i - 1].speed)
      ))
    : 0;

  const stabilità = calcolaStabilità(weather.cape, weather.cin, weather.liftedIndex, gradienteReale);
  const turbolenza = calcolaTurbolenza(weather.windGusts, windShear, stabilità);

  let rischioTemporali = 0;
  if (weather.weatherCode >= 95) rischioTemporali = 100;
  else if (weather.precipitation > 2 && weather.cape > 500) rischioTemporali = 60;
  else if (weather.cape > 1000 && stabilità !== "molto stabile") rischioTemporali = 40;
  else if (weather.cape > 500) rischioTemporali = 20;
  else if (weather.cape > 200) rischioTemporali = 10;
  else rischioTemporali = 2;
  if (ora >= 13 && ora <= 17) rischioTemporali = Math.min(100, rischioTemporali * 1.3);

  let tendenzaPressione: AnalisiCompleta["tendenzaPressione"] = "stabile";
  const now = new Date().getHours();
  const idxCorrente = allHours.findIndex(h => {
    const t = new Date(h.time);
    return t.getHours() === now && t.getDate() === new Date().getDate();
  });
  if (idxCorrente > 0 && idxCorrente < allHours.length - 1) {
    const hPrev = allHours[idxCorrente];
    const hNext = allHours[idxCorrente + 1];
    const diff = (hNext.windGusts * 0.1) - (hPrev.windGusts * 0.1);
    if (diff > 2) tendenzaPressione = "in aumento";
    else if (diff < -2) tendenzaPressione = "in calo";
  }

  const oggi = allHours.filter(h => {
    const t = new Date(h.time);
    return t.getDate() === new Date().getDate();
  });
  const tempMaxGiorno = oggi.length > 0 ? Math.max(...oggi.map(h => h.temperature)) : weather.temperature;
  const tempMinGiorno = oggi.length > 0 ? Math.min(...oggi.map(h => h.temperature)) : weather.temperature;

  let voloScore = 50;
  if (weather.windSpeed >= 5 && weather.windSpeed <= 12) voloScore += 20;
  else if (weather.windSpeed >= 3 && weather.windSpeed < 5) voloScore += 10;
  else if (weather.windSpeed > 18 && weather.windSpeed <= 22) voloScore += 5;
  else if (weather.windSpeed > 22 && weather.windSpeed <= 28) voloScore -= 10;
  else if (weather.windSpeed > 28) voloScore -= 20;
  else if (weather.windSpeed < 3) voloScore -= 5;
  if (forzaTermica >= 7) voloScore += 20;
  else if (forzaTermica >= 5) voloScore += 15;
  else if (forzaTermica >= 3) voloScore += 10;
  else if (forzaTermica >= 1) voloScore += 5;
  if (weather.precipitation === 0) voloScore += 15;
  else if (weather.precipitation < 0.3) voloScore += 8;
  else if (weather.precipitation > 1) voloScore -= 20;
  if (weather.cloudCover >= 15 && weather.cloudCover <= 45) voloScore += 10;
  else if (weather.cloudCover < 15) voloScore += 5;
  else if (weather.cloudCover > 60) voloScore -= 5;
  else if (weather.cloudCover > 80) voloScore -= 10;
  if (turbolenza === "assente" || turbolenza === "leggera") voloScore += 5;
  else if (turbolenza === "moderata") voloScore -= 5;
  else if (turbolenza === "forte") voloScore -= 15;
  else if (turbolenza === "severa") voloScore -= 25;
  if (rischioTemporali < 10) voloScore += 5;
  else if (rischioTemporali > 50) voloScore -= 15;
  if (weather.cape >= 100 && weather.cape <= 800) voloScore += 10;
  else if (weather.cape > 800 && weather.cape <= 1500) voloScore += 5;
  else if (weather.cape > 1500) voloScore -= 5;
  voloScore = Math.max(0, Math.min(100, voloScore));

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

  let confidenza = 0.5;
  if (weather.cape > 0 && weather.cape < 10000) confidenza += 0.1;
  if (weather.temp80m != null || weather.temp120m != null) confidenza += 0.15;
  if (weather.windProfile && weather.windProfile.length >= 3) confidenza += 0.1;
  if (weather.cin !== 0) confidenza += 0.05;
  if (weather.liftedIndex > -10 && weather.liftedIndex < 10) confidenza += 0.05;
  if (spread > 0) confidenza += 0.05;
  confidenza = Math.min(0.99, confidenza);

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
    pressione: 1013,
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
    probabilitàPioggia: weather.precipitationProbability ?? 0,
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
    temperatura: 0, tempMax: 0, tempMin: 0, deltaTermico: 0,
    umidita: 0, rugiada: 0, spread: 0, pressione: 1013,
    tendenzaPressione: "stabile", nuvolositaMedia: 0, copertura: "sereno",
    ventoMedio: 0, ventoMax: 0, rafficheMax: 0, direzioneDominante: "N", direzioneGradi: 0,
    cape: 0, cin: 0, liftedIndex: 0, stabilitàAtmosferica: "stabile",
    baseNuvole: 0, zeroTermico: 0, topTermico: 0,
    rateoSalita: 0, forzaTermica: 0, intensitaTermica: "assenti",
    gradienteReale: 0.98, gradienteDescrizione: "N/D", turbolenza: "assente", windShear: 0,
    pioggiaTotale: 0, probabilitàPioggia: 0, rischioTemporali: 0, uvIndex: 0,
    voloScore: 0, voloGiudizio: "N/D", voloDescrizione: "Dati non disponibili per questa ora.", confidenza: 0,
  };
}