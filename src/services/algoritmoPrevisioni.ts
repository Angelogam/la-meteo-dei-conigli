"use client";

import type { HourData } from "@/types/meteo";
import { fetchCapeData } from "./capeService";

const CLIMATOLOGIA_LOCALE = [
  { mese: 1, tempMedia: -2, umiditaMedia: 65, ventoMedio: 8, termicheMedie: 1.2 },
  { mese: 2, tempMedia: 0, umiditaMedia: 60, ventoMedio: 9, termicheMedie: 1.4 },
  { mese: 3, tempMedia: 4, umiditaMedia: 55, ventoMedio: 10, termicheMedie: 1.8 },
  { mese: 4, tempMedia: 8, umiditaMedia: 50, ventoMedio: 11, termicheMedie: 2.2 },
  { mese: 5, tempMedia: 13, umiditaMedia: 48, ventoMedio: 10, termicheMedie: 2.8 },
  { mese: 6, tempMedia: 17, umiditaMedia: 45, ventoMedio: 9, termicheMedie: 3.2 },
  { mese: 7, tempMedia: 20, umiditaMedia: 42, ventoMedio: 8, termicheMedie: 3.8 },
  { mese: 8, tempMedia: 19, umiditaMedia: 44, ventoMedio: 8, termicheMedie: 3.5 },
  { mese: 9, tempMedia: 15, umiditaMedia: 48, ventoMedio: 9, termicheMedie: 2.8 },
  { mese: 10, tempMedia: 10, umiditaMedia: 55, ventoMedio: 10, termicheMedie: 2.0 },
  { mese: 11, tempMedia: 4, umiditaMedia: 62, ventoMedio: 11, termicheMedie: 1.3 },
  { mese: 12, tempMedia: -1, umiditaMedia: 68, ventoMedio: 9, termicheMedie: 1.0 },
];

export interface PrevisioneTermica {
  ora: number;
  rateoFinale: number;
  rateoGFS: number;
  rateoOpenMeteo: number;
  rateoClimatologia: number;
  confidenza: number;
  base: number;
  top: number;
  label: string;
}

export function calcolaPrevisioneTermica(
  weather: HourData,
  capeValue: number,
  cinValue: number,
  liValue: number,
  altitude: number
): PrevisioneTermica {
  const mese = new Date(weather.time).getMonth() + 1;
  const ora = weather.time.getHours();
  const clima = CLIMATOLOGIA_LOCALE.find(c => c.mese === mese) ?? CLIMATOLOGIA_LOCALE[5];

  let rateoOpenMeteo = 0;
  const spread = weather.temperature - weather.dewPoint;
  const base = Math.max(200, Math.min(3000, Math.round(spread * 125)));
  
  let gradiente = 0.98;
  if (weather.temp80m != null) {
    gradiente = ((weather.temperature - weather.temp80m) / 78) * 100;
  } else if (weather.temp120m != null) {
    gradiente = ((weather.temperature - weather.temp120m) / 118) * 100;
  }

  let forzaOM = 0;
  if (gradiente > 1.2) forzaOM += 3;
  else if (gradiente > 0.98) forzaOM += 2;
  else if (gradiente > 0.7) forzaOM += 1;

  if (weather.windSpeed >= 5 && weather.windSpeed <= 15) forzaOM += 2;
  if (weather.cloudCover >= 15 && weather.cloudCover <= 45) forzaOM += 2;
  else if (weather.cloudCover >= 5 && weather.cloudCover < 15) forzaOM += 1;

  if (weather.humidity >= 30 && weather.humidity <= 50) forzaOM += 1.5;
  if (weather.uvIndex >= 5) forzaOM += 1;
  if (ora >= 11 && ora <= 15) forzaOM += 1;

  rateoOpenMeteo = Math.max(0, (forzaOM / 10.5) * 4);
  if (weather.precipitation > 1) rateoOpenMeteo = 0;

  let rateoGFS = 0;
  if (capeValue > 50) {
    const spessore = Math.max(300, base + (capeValue * 2.5) - base);
    rateoGFS = Math.sqrt((2 * Math.max(1, capeValue)) / spessore) * 4;
    if (cinValue < -100) rateoGFS *= 0.5;
    if (liValue > 0) rateoGFS *= 0.7;
  }

  const rateoClimatologia = clima.termicheMedie;

  const weightGFS = capeValue > 100 ? 0.40 : capeValue > 50 ? 0.30 : 0.15;
  const weightOpenMeteo = spread > 5 ? 0.35 : spread > 2 ? 0.25 : 0.15;
  const weightClimatologia = 1 - weightGFS - weightOpenMeteo;

  const rateoFinale = (
    rateoGFS * weightGFS +
    rateoOpenMeteo * weightOpenMeteo +
    rateoClimatologia * weightClimatologia
  );

  const divergenza = Math.max(
    Math.abs(rateoGFS - rateoOpenMeteo),
    Math.abs(rateoGFS - rateoClimatologia),
    Math.abs(rateoOpenMeteo - rateoClimatologia)
  );
  const confidenza = Math.max(0, Math.min(1, 1 - divergenza / 4));

  const top = Math.min(5000, base + Math.round(capeValue * 2.5 * (0.5 + confidenza * 0.5)));

  let label: string;
  if (rateoFinale >= 4.0) label = "🔥 Termiche forti";
  else if (rateoFinale >= 3.0) label = "🪂 Buone termiche";
  else if (rateoFinale >= 2.0) label = "🌤️ Termiche moderate";
  else if (rateoFinale >= 1.0) label = "🌥️ Termiche deboli";
  else if (rateoFinale >= 0.3) label = "☁️ M. deboli";
  else label = "❌ Assenti";

  return {
    ora,
    rateoFinale: Math.round(rateoFinale * 10) / 10,
    rateoGFS: Math.round(rateoGFS * 10) / 10,
    rateoOpenMeteo: Math.round(rateoOpenMeteo * 10) / 10,
    rateoClimatologia: Math.round(rateoClimatologia * 10) / 10,
    confidenza: Math.round(confidenza * 100) / 100,
    base,
    top,
    label,
  };
}

export async function calcolaPrevisioniMultiFonte(
  hourlyData: HourData[],
  lat: number,
  lon: number,
  altitude: number
): Promise<PrevisioneTermica[]> {
  const capeData = await fetchCapeData(lat, lon);

  // 🔁 Ore volo 9:00 – 19:00
  const oreVolo = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const oggi = new Date();
  const giornoCorrente = oggi.getDate();

  return oreVolo.map(ora => {
    const weather = hourlyData.find(h => {
      const t = new Date(h.time);
      return t.getHours() === ora && t.getDate() === giornoCorrente;
    });

    const cape = capeData.find(c => {
      const ct = new Date(c.time);
      return ct.getHours() === ora && ct.getDate() === giornoCorrente;
    });

    if (!weather) {
      return {
        ora, rateoFinale: 0, rateoGFS: 0, rateoOpenMeteo: 0,
        rateoClimatologia: 0, confidenza: 0, base: 0, top: 0, label: "N/D",
      };
    }

    return calcolaPrevisioneTermica(
      weather, cape?.cape ?? 0, cape?.cin ?? 0, cape?.li ?? 0, altitude
    );
  });
}