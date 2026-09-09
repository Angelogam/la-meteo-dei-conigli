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
  pressione: number;
  umidita: number;
  uvIndex: number;
  stabilitàAtmosferica: string;
  turbolenza: string;
  windShear: number;
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

function calcolaTurbolenza(windSpeed: number, windGusts: number, windShear: number): string {
  let score = 0;
  if (windGusts > 40) score += 3;
  else if (windGusts > 25) score += 2;
  else if (windGusts > 15) score += 1;
  if (windShear > 10) score += 3;
  else if (windShear > 5) score += 2;
  else if (windShear > 2) score += 1;
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
  if (score >= 85) return {
    giudizio: "Eccellente ⭐",
    descrizione: "Condizioni migliori della giornata. Termiche sviluppate, cielo ideale. Volo consigliato.",
  };
  if (score >= 70) return {
    giudizio: "Buono 👍",
    descrizione: "Buone condizioni termiche. Volo piacevole con termiche moderate.",
  };
  if (score >= 55) return {
    giudizio: "Discreto 😐",
    descrizione: "Condizioni sufficienti per volo locale. Termiche deboli o moderate.",
  };
  if (score >= 40) return {
    giudizio: "Mediocre ⚠️",
    descrizione: "Termiche deboli e irregolari. Volo possibile ma poco produttivo.",
  };
  return {
    giudizio: "Scarso ❌",
    descrizione: "Condizioni sfavorevoli al volo. Termiche assenti o troppo deboli.",
  };
}

export function analisiAvanzataCompleta(
  hourlyData: MeteoHourly[],
  current: MeteoCurrent,
  altitude: number
): AnalisiCompleta[] {
  if (!hourlyData || hourlyData.length === 0 || !current) return [];

  const oreUtili = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const risultati: AnalisiCompleta[] = [];

  for (const ora of oreUtili) {
    const weather = hourlyData.find(h => {
      const t = new Date(h.time);
      return t.getHours() === ora;
    });
    if (!weather) continue;

    const temp = weather.temperature ?? 15;
    const dew = weather.dewPoint ?? (temp - 8);
    const hum = weather.humidity ?? 60;
    const windSpeed = weather.windSpeed ?? 0;
    const windGusts = weather.windGusts ?? 0;
    const cloudCover = weather.cloudCover ?? 30;
    const uv = weather.uvIndex ?? 0;
    const precipitation = weather.precipitation ?? 0;
    const temp80m = weather.temp80m;
    const temp120m = weather.temp120m;
    const cape = weather.cape ?? 0;

    const pressure = current?.pressure ?? null;
    const presVal = pressure !== null && pressure !== undefined ? pressure : 1013;

    const spread = Math.max(0.3, Math.min(20, temp - (dew !== null ? dew : temp - 8)));
    const estimatedCape = Math.min(1500, Math.round(spread * spread * 6 + (temp - 10) * 5));
    const capeValue = Math.min(1500, Math.max(0, estimatedCape));

    const windShear = Math.round(Math.abs(windSpeed - windGusts) * 10) / 10;

    let gradiente = 0.98;
    if (temp80m !== null && temp80m > -50 && temp80m < 50) {
      gradiente = Math.min(1.5, Math.max(0.3, ((temp - temp80m) / 78) * 100));
    } else if (temp120m !== null && temp120m > -50 && temp120m < 50) {
      gradiente = Math.min(1.5, Math.max(0.3, ((temp - temp120m) / 118) * 100));
    }
    gradiente = Math.round(gradiente * 100) / 100;

    const lclSopraSuolo = Math.min(2500, Math.max(50, Math.round(spread * 120)));
    const baseNuvole = Math.min(3500, altitude + lclSopraSuolo);

    const zeroTermico = Math.min(4800, Math.max(altitude + 200, Math.round(altitude + temp * 80 + spread * 30)));

    let rateoBase = Math.min(3, Math.max(0.05, spread * 0.25));
    if (windSpeed >= 5 && windSpeed <= 15) rateoBase += 0.5;
    if (cloudCover >= 15 && cloudCover <= 40) rateoBase += 0.3;
    if (precipitation > 0.5) rateoBase *= 0.5;
    if (precipitation > 2) rateoBase = 0;
    if (windSpeed > 20) rateoBase *= 0.6;
    const rateo = Math.max(0, Math.min(5, Math.round(rateoBase * 10) / 10));

    let forza = 0;
    if (capeValue > 800) forza += 3;
    else if (capeValue > 400) forza += 2;
    else if (capeValue > 150) forza += 1;
    else if (capeValue > 50) forza += 0.5;
    if (gradiente > 1.2) forza += 1.5;
    else if (gradiente > 0.9) forza += 1;
    if (windSpeed >= 5 && windSpeed <= 15) forza += 0.5;
    if (cloudCover >= 15 && cloudCover <= 40) forza += 0.5;
    const forzaTermica = Math.min(10, Math.max(0, Math.round(forza * 10) / 10));

    const topTermico = Math.min(4500, Math.max(baseNuvole + 200, baseNuvole + Math.round(rateo * 300 + capeValue * 0.8)));

    const stabilita = calcolaStabilita(capeValue, Math.round((temp - (dew !== null ? dew : temp - 6)) * 10) / 10, gradiente);
    const turbolenza = calcolaTurbolenza(windSpeed, windGusts, windShear);

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
    if (["forte", "severa"].indexOf(turbolenza) === -1) score += 5;
    if (topTermico - baseNuvole > 500) score += 10;
    if (rateo >= 2) score += 10;
    const voloScore = Math.min(100, Math.max(0, score));

    const { giudizio, descrizione } = calcolaGiudizioVolo(voloScore);

    const confidenza = Math.min(1, Math.round((0.3 + (rateo / 5) * 0.4 + (forzaTermica / 10) * 0.3) * 100) / 100);

    let coperturaTesto: string;
    if (cloudCover >= 80) coperturaTesto = "coperto";
    else if (cloudCover >= 60) coperturaTesto = "molto nuvoloso";
    else if (cloudCover >= 40) coperturaTesto = "nuvoloso";
    else if (cloudCover >= 20) coperturaTesto = "poco nuvoloso";
    else if (cloudCover >= 5) coperturaTesto = "sereno con nuvole";
    else coperturaTesto = "sereno";

    risultati.push({
      ora,
      data: new Date(weather.time).toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
      temperatura: Math.round(temp),
      tempMax: Math.round(temp + Math.min(5, spread * 0.5)),
      tempMin: Math.round(temp - Math.min(5, (100 - hum) / 20)),
      ventoMedio: Math.round(windSpeed),
      ventoMax: Math.round(windGusts),
      direzioneDominante: "—",
      copertura: coperturaTesto,
      baseNuvole,
      pressione: Math.round(presVal),
      umidita: Math.round(hum),
      uvIndex: Math.round(uv * 10) / 10,
      stabilitàAtmosferica: stabilita,
      turbolenza,
      windShear,
      gradienteReale: gradiente,
      zeroTermico,
      topTermico,
      intensitaTermica: calcolaIntensitaTermica(rateo),
      forzaTermica,
      rateoSalita: rateo,
      cape: capeValue,
      liftedIndex: Math.round((temp - (dew !== null ? dew : temp - 6)) * 10) / 10,
      rischioTemporali: Math.min(100, Math.round(Math.max(0, (capeValue / 1500) * 50 + (spread / 20) * 30 + (1 - presVal / 1013) * 20))),
      pioggiaTotale: Math.round(precipitation * 10) / 10,
      voloScore,
      voloGiudizio: giudizio,
      voloDescrizione: descrizione,
      confidenza,
    });
  }

  return risultati;
}
