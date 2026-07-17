"use client";

/**
 * TEST AUTOMATICO METEO
 * Verifica che i dati di Open-Meteo siano corretti e coerenti.
 * I risultati vengono stampati in console (F12).
 */

import type { MeteoResponse } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";

export function autoTestMeteo(response: MeteoResponse | null, lat: number, lon: number) {
  if (!response) {
    console.warn("⚠️ TEST: Nessun dato ricevuto da Open-Meteo");
    return { ok: false, errori: ["Nessun dato"] };
  }

  const errori: string[] = [];
  const avvisi: string[] = [];
  const superati: string[] = [];

  // 1. Verifica dati base
  if (!response.hourly || response.hourly.length === 0) {
    errori.push("Dati orari mancanti o vuoti");
  } else {
    superati.push(`${response.hourly.length} ore di dati disponibili`);
  }

  if (!response.daily || response.daily.length === 0) {
    errori.push("Dati giornalieri mancanti o vuoti");
  } else {
    superati.push(`${response.daily.length} giorni di previsioni`);
  }

  if (!response.current) {
    errori.push("Dati correnti mancanti");
  } else {
    superati.push("Dati correnti presenti");
  }

  // 2. Temperature realistiche
  const temps = response.hourly.map(h => h.temperature);
  const tempMin = Math.min(...temps);
  const tempMax = Math.max(...temps);
  if (tempMax > 50 || tempMin < -30) {
    errori.push(`Temperature non realistiche: min ${tempMin}°C, max ${tempMax}°C`);
  } else {
    superati.push(`Temperature realistiche: ${Math.round(tempMin)}°C ~ ${Math.round(tempMax)}°C`);
  }

  // 3. Vento realistico
  const winds = response.hourly.map(h => h.windSpeed);
  const windMax = Math.max(...winds);
  if (windMax > 120) {
    errori.push(`Vento massimo non realistico: ${Math.round(windMax)} km/h`);
  } else {
    superati.push(`Vento massimo realistico: ${Math.round(windMax)} km/h`);
  }

  // 4. Nuvolosità nel range
  const clouds = response.hourly.map(h => h.cloudCover);
  const cloudInvalid = clouds.filter(c => c < 0 || c > 100);
  if (cloudInvalid.length > 0) {
    errori.push(`${cloudInvalid.length} valori di nuvolosità fuori range (0-100%)`);
  } else {
    superati.push(`Nuvolosità: tutti i ${clouds.length} valori nel range 0-100%`);
  }

  // 5. Umidità nel range
  const hums = response.hourly.map(h => h.humidity);
  const humInvalid = hums.filter(h => h < 0 || h > 100);
  if (humInvalid.length > 0) {
    errori.push(`${humInvalid.length} valori di umidità fuori range (0-100%)`);
  } else {
    superati.push(`Umidità: tutti i ${hums.length} valori nel range 0-100%`);
  }

  // 6. Zero termico
  const freezingCurrent = response.current.freezingLevelHeight;
  if (freezingCurrent > 0) {
    superati.push(`Zero termico corrente: ${Math.round(freezingCurrent)}m`);
  } else {
    avvisi.push("Zero termico non disponibile");
  }

  // 7. Weather code validi
  const codes = response.hourly.map(h => h.weatherCode);
  const validCodes = codes.filter(c => c >= 0 && c <= 99);
  if (validCodes.length < codes.length) {
    errori.push(`${codes.length - validCodes.length} weather code non validi`);
  } else {
    superati.push(`Weather code: tutti validi (0-99)`);
  }

  // 8. CAPE realistico
  const capes = response.hourly.map(h => h.cape);
  const capeInvalid = capes.filter(c => c < 0 || c > 10000);
  if (capeInvalid.length > 0) {
    errori.push(`${capeInvalid.length} valori CAPE non realistici`);
  } else {
    superati.push(`CAPE: tutti i ${capes.length} valori realistici`);
  }

  // 9. UV index
  const uvs = response.hourly.map(h => h.uvIndex);
  const uvInvalid = uvs.filter(u => u < 0 || u > 20);
  if (uvInvalid.length > 0) {
    errori.push(`${uvInvalid.length} valori UV fuori range (0-20)`);
  } else {
    superati.push(`UV Index: tutti i ${uvs.length} valori nel range 0-20`);
  }

  // 10. Sito riconosciuto
  const sito = DECOLLI.find(d => Math.abs(d.lat - lat) < 0.01 && Math.abs(d.lon - lon) < 0.01);
  if (sito) {
    superati.push(`Sito riconosciuto: ${sito.name} (${sito.altitude}m)`);
  } else {
    avvisi.push(`Coordinate (${lat.toFixed(4)}, ${lon.toFixed(4)}) non corrispondono a nessun decollo`);
  }

  // STAMPA IN CONSOLE
  console.log("");
  console.log("%c🧪 TEST AUTOMATICO METEO", "font-weight:bold;font-size:16px;color:#10b981");
  console.log(`%c✅ ${superati.length} test superati`, "color:#22c55e");
  console.log(`%c⚠️  ${avvisi.length} avvisi`, "color:#eab308");
  console.log(`%c❌ ${errori.length} errori`, "color:#ef4444");
  console.log("");

  if (superati.length > 0) {
    console.log("%c✅ SUPERATI:", "font-weight:bold;color:#22c55e");
    superati.forEach(m => console.log(`  ${m}`));
  }
  if (avvisi.length > 0) {
    console.log("%c⚠️ AVVISI:", "font-weight:bold;color:#eab308");
    avvisi.forEach(m => console.log(`  ${m}`));
  }
  if (errori.length > 0) {
    console.log("%c❌ ERRORI:", "font-weight:bold;color:#ef4444");
    errori.forEach(m => console.log(`  ${m}`));
  }

  // RIEPILOGO METEO ATTUALE
  console.log("");
  console.log("%c📊 METEO ATTUALE:", "font-weight:bold;color:#60a5fa");
  console.log(`  🌡️  ${Math.round(response.current.temperature)}°C`);
  console.log(`  💨 ${Math.round(response.current.windSpeed)} km/h da ${Math.round(response.current.windDir)}°`);
  console.log(`  ☁️  ${response.current.cloudCover}% nuvole (codice ${response.current.weatherCode})`);
  console.log(`  🌧️  ${response.current.precipitation}mm pioggia`);
  console.log(`  ❄️  Zero termico: ${Math.round(response.current.freezingLevelHeight)}m`);
  console.log(`  💧  Umidità: ${response.current.humidity}%`);
  console.log("");

  return { ok: errori.length === 0, errori, avvisi, superati: superati.length };
}