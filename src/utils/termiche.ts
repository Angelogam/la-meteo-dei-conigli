"use client";

export interface TermicheData {
  rateo: number;
  forza: number;
  base: number;
  top: number;
  label: string;
  colore: string;
  gradienteReale: number;
}

/**
 * Calcola termiche realistiche per le Alpi.
 * Massimi realistici:
 * - 10-15: fino a 4 m/s (picco)
 * - 8-10, 15-17: fino a 2 m/s
 * - prima delle 8 / dopo le 18: massimo 0.5 m/s
 * - dopo le 19: 0 m/s
 */
export function calcolaTermiche(weather: any, altitude: number): TermicheData {
  if (!weather) {
    return { rateo: 0, forza: 0, base: 0, top: 0, label: "N/D", colore: "#475569", gradienteReale: 0 };
  }

  const temp = weather.temperature ?? 15;
  const dew = weather.dewPoint ?? (temp - 8);
  const hum = weather.humidity ?? 60;
  const windSpeed = weather.windSpeed ?? 10;
  const cloudCover = weather.cloudCover ?? 30;
  const precipitation = weather.precipitation ?? 0;
  const weatherCode = weather.weatherCode ?? 0;
  const ora = weather.time?.getHours?.() ?? new Date().getHours();

  // Se piove o c'è temporale: niente termiche
  if (precipitation > 0.5 || weatherCode >= 95) {
    return { rateo: 0, forza: 0, base: 0, top: 0, label: "Pioggia/Temporale", colore: "#475569", gradienteReale: 0 };
  }

  // Spread termico
  const spread = Math.max(0.5, Math.min(15, temp - dew));

  // Base nuvole (LCL) — più realistica
  const baseSopraSuolo = Math.min(2200, Math.max(100, Math.round(spread * 125)));
  const base = altitude + baseSopraSuolo;

  // Gradiente verticale (valore realistico: 0.5-1.2 °C/100m)
  let gradiente = 0.65 + (spread / 20) * 0.5; // più spread = più gradiente
  gradiente = Math.min(1.2, Math.max(0.5, gradiente));

  // === CALCOLO FORZA TERMICA (0-10) con limiti per ora ===
  let forza = 0;

  // Fattore orario (più importante)
  let fattoreOra = 0;
  if (ora >= 11 && ora <= 15) {
    fattoreOra = 1.0; // picco
  } else if (ora >= 10 && ora < 11) {
    fattoreOra = 0.7;
  } else if (ora > 15 && ora <= 16) {
    fattoreOra = 0.6;
  } else if (ora >= 9 && ora < 10) {
    fattoreOra = 0.4;
  } else if (ora > 16 && ora <= 17) {
    fattoreOra = 0.3;
  } else if (ora >= 8 && ora < 9) {
    fattoreOra = 0.2;
  } else if (ora > 17 && ora <= 18) {
    fattoreOra = 0.1;
  } else if (ora > 18) {
    fattoreOra = 0; // dopo le 18: termiche spente
  } else if (ora < 8) {
    fattoreOra = 0; // prima delle 8: niente
  }

  // Da spread termico
  const daSpread = Math.min(4, spread * 0.35);

  // Da vento
  let daVento = 0;
  if (windSpeed >= 5 && windSpeed <= 12) daVento = 1.5;
  else if (windSpeed >= 3 && windSpeed < 5) daVento = 0.8;
  else if (windSpeed > 12 && windSpeed <= 18) daVento = 0.5;
  else if (windSpeed > 18 && windSpeed <= 22) daVento = 0.2;
  else if (windSpeed > 25) daVento = 0; // vento forte blocca termiche

  // Da nuvolosità
  let daNuvole = 0;
  if (cloudCover >= 15 && cloudCover <= 40) daNuvole = 1.5;
  else if (cloudCover >= 5 && cloudCover < 15) daNuvole = 1;
  else if (cloudCover > 40 && cloudCover <= 55) daNuvole = 0.5;
  else if (cloudCover > 70) daNuvole = 0;

  // Da umidità
  let daUmidita = 0;
  if (hum >= 30 && hum <= 50) daUmidita = 0.8;
  else if (hum > 50 && hum <= 65) daUmidita = 0.4;

  // Se nuvoloso o vento forte, riduci ulteriormente
  let penalita = 1;
  if (cloudCover > 60) penalita *= 0.5;
  if (cloudCover > 80) penalita *= 0.2;
  if (windSpeed > 22) penalita *= 0.3;
  if (windSpeed > 30) penalita = 0;
  if (hum > 75) penalita *= 0.6;

  forza = (daSpread + daVento + daNuvole + daUmidita) * fattoreOra * penalita;
  forza = Math.max(0, Math.min(10, Math.round(forza * 10) / 10));

  // === RATEO (m/s) — limiti REALISTICI ===
  // Picco assoluto nel pomeriggio sulle Alpi: 4-5 m/s solo in condizioni estreme
  let rateoMaxGiornaliero = 4.0;
  
  // Solo in piena estate con spread > 12 e sole forte si arriva a 4
  rateoMaxGiornaliero = Math.min(4.0, 0.5 + spread * 0.25 + (windSpeed >= 5 && windSpeed <= 10 ? 0.5 : 0));

  let rateo = (forza / 10) * rateoMaxGiornaliero;

  // Limite assoluto per ora del giorno
  if (ora > 18) rateo = 0;
  else if (ora > 17) rateo = Math.min(rateo, 0.3);
  else if (ora > 16) rateo = Math.min(rateo, 1.0);
  else if (ora <= 8) rateo = Math.min(rateo, 0.2);
  else if (ora <= 9) rateo = Math.min(rateo, 0.8);

  // Se è nuvoloso, riduci molto
  if (cloudCover > 65) rateo *= 0.3;
  if (cloudCover > 80) rateo = Math.min(rateo, 0.2);

  rateo = Math.max(0, Math.min(rateoMaxGiornaliero, Math.round(rateo * 10) / 10));

  // === TOP TERMICO ===
  const maxTopPerOra = (() => {
    if (ora >= 11 && ora <= 15) return 3000;
    if (ora >= 10 && ora < 11) return 2500;
    if (ora > 15 && ora <= 16) return 2200;
    if (ora >= 9 && ora < 10) return 1800;
    if (ora > 16 && ora <= 17) return 1500;
    if (ora > 17 && ora <= 18) return 1000;
    return 800;
  })();

  const top = Math.min(altitude + maxTopPerOra, Math.max(base + 100, base + Math.round(rateo * 300 + spread * 20)));

  // === LABEL E COLORE ===
  let label: string;
  let colore: string;

  if (rateo >= 3.5) { label = "Forti"; colore = "#dc2626"; }
  else if (rateo >= 2.5) { label = "Buone"; colore = "#f97316"; }
  else if (rateo >= 1.5) { label = "Moderate"; colore = "#eab308"; }
  else if (rateo >= 0.5) { label = "Deboli"; colore = "#84cc16"; }
  else if (rateo >= 0.1) { label = "Molto deboli"; colore = "#6b7280"; }
  else { label = "Niente"; colore = "#475569"; }

  return {
    rateo,
    forza,
    base,
    top,
    label,
    colore,
    gradienteReale: Math.round(gradiente * 100) / 100,
  };
}