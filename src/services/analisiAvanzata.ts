"use client";

import type { MeteoHourly, MeteoCurrent } from "./openMeteoService";

export interface AnalisiCompleta {
  ora: number;
  data: string;
  temperatura: number;
  tempMax: number;
  tempMin: number;
  ventoMedio: number;
  ventoMax: number;
  direzioneDominante: string;
  copertura: string;
  baseNuvole: number;
  pressione: number | null;
  umidita: number;
  uvIndex: number;
  stabilitàAtmosferica: string;
  turbolenza: string;
  gustSpread: number | null;
  gradienteReale: number;
  zeroTermico: number;
  topTermico: number;
  intensitaTermica: string;
  forzaTermica: number;
  rateoSalita: number;
  cape: number;
  liftedIndex: number;
  rischioTemporali: number;
  pioggiaTotale: number;
  voloScore: number;
  voloGiudizio: string;
  voloDescrizione: string;
  confidenza: number;
}

function calcolaStabilita(cape: number, li: number, gradiente: number): string {
  let score = 0;
  if (cape > 800) score += 3;
  else if (cape > 300) score += 2;
  else if (cape > 100) score += 1;
  if (li < -4) score += 3;
  else if (li < -2) score += 2;
  else if (li < 0) score += 1;
  if (gradiente > 1.1) score += 2;
  else if (gradiente > 0.9) score += 1;
  if (score >= 6) return "molto instabile";
  if (score >= 4) return "instabile";
  if (score >= 2) return "leggermente instabile";
  if (score >= 1) return "stabile";
  return "molto stabile";
}

function calcolaTurbolenza(windSpeed: number, windGusts: number, gustSpread: number | null): string {
  let score = 0;
  if (windGusts > 40) score += 3;
  else if (windGusts > 25) score += 2;
  else if (windGusts > 15) score += 1;
  if (gustSpread !== null) {
    if (gustSpread > 10) score += 3;
    else if (gustSpread > 5) score += 2;
    else if (gustSpread > 2) score += 1;
  }
  if (windSpeed > 25) score += 2;
  else if (windSpeed > 18) score += 1;
  if (score >= 6) return "severa";
  if (score >= 4) return "forte";
  if (score >= 2) return "moderata";
  if (score >= 1) return "leggera";
  return "assente";
}

function calcolaIntensitaTermica(rateo: number): string {
  if (rateo >= 4) return "fortissima";
  if (rateo >= 3) return "forte";
  if (rateo >= 2) return "moderata";
  if (rateo >= 1) return "debole";
  if (rateo >= 0.3) return "molto debole";
  return "assente";
}

function calcolaGiudizioVolo(score: number): { giudizio: string; descrizione: string } {
  if (score >= 85) return { giudizio: "Eccellente ⭐", descrizione: "Condizioni migliori della giornata. Termiche sviluppate, cielo ideale. Volo consigliato." };
  if (score >= 70) return { giudizio: "Buono 👍", descrizione: "Buone condizioni termiche. Volo piacevole con termiche moderate." };
  if (score >= 55) return { giudizio: "Discreto 😐", descrizione: "Condizioni sufficienti per volo locale. Termiche deboli o moderate." };
  if (score >= 40) return { giudizio: "Mediocre ⚠️", descrizione: "Termiche deboli e irregolari. Volo possibile ma poco produttivo." };
  return { giudizio: "Scarso ❌", descrizione: "Condizioni sfavorevoli al volo. Termiche assenti o troppo deboli." };
}

export function analisiAvanzataCompleta(
  hourlyData: MeteoHourly[],
  current: MeteoCurrent,
  altitude: number
): AnalisiCompleta[] {
  if (!hourlyData?.length || !current) return [];

  // L'analisi usa data + ora: evita di prendere, per esempio, le 14:00 di domani.
  const target = new Date(current.time);
  const sameDay = hourlyData.filter(h => {
    const t = new Date(h.time);
    return t.getFullYear() === target.getFullYear() &&
      t.getMonth() === target.getMonth() &&
      t.getDate() === target.getDate();
  });

  const oreUtili = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const risultati: AnalisiCompleta[] = [];

  for (const ora of oreUtili) {
    const weather = sameDay.find(h => new Date(h.time).getHours() === ora);
    if (!weather) continue;

    // Nessun valore meteorologico mancante viene inventato. Se manca un dato
    // fondamentale per questa analisi, l'ora viene marcata come non disponibile.
    const temp = weather.temperature;
    const dew = weather.dewPoint;
    const hum = weather.humidity;
    const windSpeed = weather.windSpeed;
    const windGusts = weather.windGusts;
    const cloudCover = weather.cloudCover;
    const uv = weather.uvIndex;
    const precipitation = weather.precipitation;
    const cape = weather.cape;
    const liftedIndex = weather.liftedIndex;
    const freezingLevel = weather.freezingLevel;

    if (
      temp === null || dew === null || hum === null ||
      windSpeed === null || windGusts === null ||
      cape === null || liftedIndex === null ||
      freezingLevel === null || uv === null
    ) continue;

    const pressure = weather.pressure ?? current.pressure ?? null;
    const gustSpread = Math.round(Math.abs(windGusts - windSpeed) * 10) / 10;

    // Gradiente verticale reale quando è disponibile una temperatura a 80/120 m.
    let gradiente = 0.98;
    if (weather.temp80m !== null) {
      gradiente = Math.min(1.5, Math.max(0.3, ((temp - weather.temp80m) / 80) * 100));
    } else if (weather.temp120m !== null) {
      gradiente = Math.min(1.5, Math.max(0.3, ((temp - weather.temp120m) / 120) * 100));
    }
    gradiente = Math.round(gradiente * 100) / 100;

    // Base nubi: stima derivata da T/Td, non un dato API. Non viene usata
    // come sostituto dello zero termico reale.
    const spread = Math.max(0, temp - dew);
    const lclSopraSuolo = Math.min(2500, Math.max(50, Math.round(spread * 120)));
    const baseNuvole = Math.min(3500, Math.max(50, altitude + lclSopraSuolo));

    // Zero termico: esclusivamente il valore API Open-Meteo.
    const zeroTermico = Math.round(freezingLevel);

    // Rateo/forza/top sono stime derivate e non valori osservati.
    let rateoBase = Math.min(3, Math.max(0.05, spread * 0.25));
    if (windSpeed >= 5 && windSpeed <= 15) rateoBase += 0.5;
    if (cloudCover >= 15 && cloudCover <= 40) rateoBase += 0.3;
    if (precipitation > 0.5) rateoBase *= 0.5;
    if (precipitation > 2) rateoBase = 0;
    if (windSpeed > 20) rateoBase *= 0.6;
    const rateo = Math.max(0, Math.min(5, Math.round(rateoBase * 10) / 10));

    let forza = 0;
    if (cape > 800) forza += 3;
    else if (cape > 400) forza += 2;
    else if (cape > 150) forza += 1;
    else if (cape > 50) forza += 0.5;
    if (gradiente > 1.2) forza += 1.5;
    else if (gradiente > 0.9) forza += 1;
    if (windSpeed >= 5 && windSpeed <= 15) forza += 0.5;
    if (cloudCover >= 15 && cloudCover <= 40) forza += 0.5;
    const forzaTermica = Math.min(10, Math.max(0, Math.round(forza * 10) / 10));

    const topTermico = Math.min(4500, Math.max(baseNuvole + 200, baseNuvole + Math.round(rateo * 300 + cape * 0.8)));

    const stabilita = calcolaStabilita(cape, liftedIndex, gradiente);
    const turbolenza = calcolaTurbolenza(windSpeed, windGusts, gustSpread);

    let score = 0;
    score += Math.min(30, Math.round(rateo * 8));
    score += Math.min(20, Math.round((forzaTermica / 10) * 20));
    if (windSpeed >= 5 && windSpeed <= 15) score += 10;
    else if (windSpeed >= 3 && windSpeed < 5) score += 5;
    else if (windSpeed > 15 && windSpeed <= 20) score += 3;
    if (cloudCover >= 15 && cloudCover <= 45) score += 10;
    else if (cloudCover >= 5 && cloudCover < 15) score += 5;
    if (precipitation < 0.3) score += 5;
    if (uv >= 4) score += 5;
    if (stabilita === "leggermente instabile") score += 5;
    else if (stabilita === "stabile") score += 3;
    if (!["forte", "severa"].includes(turbolenza)) score += 5;
    if (topTermico - baseNuvole > 500) score += 10;
    if (rateo >= 2) score += 10;
    const voloScore = Math.min(100, Math.max(0, score));
    const { giudizio, descrizione } = calcolaGiudizioVolo(voloScore);

    // Euristico, non probabilità statistica.
    const confidenza = Math.round((0.5 + Math.min(0.5, sameDay.length / 24 * 0.5)) * 100) / 100;

    const cloudText =
      cloudCover >= 80 ? "coperto" :
      cloudCover >= 60 ? "molto nuvoloso" :
      cloudCover >= 40 ? "nuvoloso" :
      cloudCover >= 20 ? "poco nuvoloso" :
      cloudCover >= 5 ? "sereno con nuvole" : "sereno";

    const dayTemps = sameDay.map(h => h.temperature).filter((v): v is number => v !== null);
    const tempMax = dayTemps.length ? Math.round(Math.max(...dayTemps)) : Math.round(temp);
    const tempMin = dayTemps.length ? Math.round(Math.min(...dayTemps)) : Math.round(temp);

    risultati.push({
      ora,
      data: new Date(weather.time).toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
      temperatura: Math.round(temp),
      tempMax,
      tempMin,
      ventoMedio: Math.round(windSpeed),
      ventoMax: Math.round(windGusts),
      direzioneDominante: weather.windDir !== null ? `(${Math.round(weather.windDir)}°)` : "—",
      copertura: cloudText,
      baseNuvole,
      pressione: pressure !== null ? Math.round(pressure) : null,
      umidita: Math.round(hum),
      uvIndex: Math.round(uv * 10) / 10,
      stabilitàAtmosferica: stabilita,
      turbolenza,
      gustSpread,
      gradienteReale: gradiente,
      zeroTermico,
      topTermico,
      intensitaTermica: calcolaIntensitaTermica(rateo),
      forzaTermica,
      rateoSalita: rateo,
      cape: Math.round(cape),
      liftedIndex: Math.round(liftedIndex * 10) / 10,
      rischioTemporali: Math.min(100, Math.round(Math.max(0, (cape / 1500) * 70 + Math.max(0, -liftedIndex) * 7))),
      pioggiaTotale: Math.round(precipitation * 10) / 10,
      voloScore,
      voloGiudizio: giudizio,
      voloDescrizione: descrizione,
      confidenza,
    });
  }

  return risultati;
}
