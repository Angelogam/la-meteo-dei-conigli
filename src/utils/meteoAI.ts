"use client";

import type { HourData } from "@/types/meteo";
import { calcCloudBase } from "@/utils/calcCloudBase";
import { circularMeanWindDirection } from "@/utils/windDirection";

// Helper che calcola cloudBase sopra il livello del mare (senza sito)
const calcCloudBaseSLM = (_temp: number, _dew: number) =>
  Math.max(0, Math.round((_temp - _dew) * 125));

// Stima vento in quota (solo per testo descrittivo)
const calcWindAloft = (groundSpeed: number, groundDir: number, alt: number) => ({
  speed: Math.round(groundSpeed * (1 + alt / 4000)),
  dir: (groundDir + alt * 0.3) % 360,
});
const dirText = (deg: number) => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};
const windDesc = (speed: number) => {
  if (speed < 5) return "calma o brezza leggera";
  if (speed < 12) return "brezza moderata";
  if (speed < 22) return "vento moderato";
  if (speed < 32) return "vento teso";
  if (speed < 42) return "vento forte";
  return "vento molto forte o burrasca";
};
const thermicDesc = (cape: number, cloudBase: number, temp: number) => {
  if (cape < 100) return `Termiche molto deboli o assenti. Base nuvola a ${cloudBase}m, differenziale termico insufficiente per sviluppo convettivo significativo.`;
  if (cape < 300) return `Termiche deboli. Base a ${cloudBase}m con sviluppo verticale limitato. Attivazione prevista dopo le 11:00.`;
  if (cape < 600) return `Termiche moderate. Base a ${cloudBase}m, sviluppo verticale discreto con cumuli ben formati. Velocità di salita media 1-2 m/s. Buona finestra tra le 11:00 e le 16:00.`;
  if (cape < 1000) return `Termiche buone. Base a ${cloudBase}m con sviluppo verticale sostenuto. Velocità di salita 2-3.5 m/s. Possibile formazione di cumulonembi nel pomeriggio.`;
  if (cape < 1500) return `Termiche forti. Base a ${cloudBase}m, sviluppo verticale marcato. Velocità di salita 3-5 m/s. Cumuli congesti con rischio di sviluppo a cumulonembo.`;
  return `Termiche molto forti. Base a ${cloudBase}m con sviluppo verticale intenso. Velocità di salita oltre 5 m/s. Cumulonembi probabili con rischio temporali pomeridiani.`;
};
const windForAltText = (groundSpeed: number, groundDir: number) => {
  const altitudes = [500, 1000, 1500, 2000, 2500, 3000];
  return altitudes.map(alt => {
    const w = calcWindAloft(groundSpeed, groundDir, alt);
    return `${alt}m: ${dirText(w.dir)} ${w.speed} km/h (${windDesc(w.speed)})`;
  }).join(" • ");
};
const thunderstormText = (cape: number, hour: number, temp: number, cloudCover: number) => {
  const afternoon = hour >= 12 && hour <= 17;
  if (cape > 1200 && afternoon) return `⚠️ ALLERTA TEMPORALI — Rischio temporali forte nelle ore pomeridiane (13:00-18:00). CAPE > 1200 J/kg. Si raccomanda di rientrare entro le 12:00.`;
  if (cape > 800 && afternoon) return `⚠️ Rischio temporali — Possibili rovesci e temporali sparsi nel pomeriggio (14:00-17:00). CAPE moderato-alto (${cape} J/kg).`;
  if (cape > 600 && cloudCover > 60) return `Possibili isolati rovesci pomeridiani (15:00-17:00). CAPE ${cape} J/kg.`;
  if (cape > 400) return `Bassa probabilità di temporali. CAPE ${cape} J/kg insufficiente per sviluppo convettivo significativo.`;
  return `Nessun rischio temporali. CAPE basso (${cape} J/kg), stabilità atmosferica prevalente.`;
};

export const generateAiAnalysis = (hourlyData: HourData[], dayIdx: number) => {
  if (!hourlyData || hourlyData.length === 0) return null;

  // Filtra solo le ore di volo (8-18) usando DATA + ORA
  const flightHours = hourlyData.filter(h => {
    const d = new Date(h.time);
    const hour = d.getHours();
    // Considera solo la data corretta
    if (dayIdx === 0) {
      const today = new Date();
      return d.toDateString() === today.toDateString() && hour >= 8 && hour <= 18;
    }
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayIdx);
    return d.toDateString() === targetDate.toDateString() && hour >= 8 && hour <= 18;
  });

  if (flightHours.length === 0) return null;

  // Usa DATI REALI dall'API quando disponibili, altrimenti N/D
  const avgTemp = flightHours.reduce((s, h) => s + (h.temperature ?? 0), 0) / flightHours.length;
  const avgHumidity = flightHours.reduce((s, h) => s + (h.humidity ?? 0), 0) / flightHours.length;
  const avgCloud = flightHours.reduce((s, h) => s + (h.cloudCover ?? 0), 0) / flightHours.length;
  const avgWind = flightHours.reduce((s, h) => s + (h.windSpeed ?? 0), 0) / flightHours.length;
  const maxTemp = Math.max(...flightHours.map(h => h.temperature ?? 0));
  const minTemp = Math.min(...flightHours.map(h => h.temperature ?? 0));

  // CAPE: usa dato API reale quando disponibile
  const capeValues = flightHours.map(h => h.cape).filter(c => c !== null && c !== undefined && c > 0);
  const cape = capeValues.length > 0 ? Math.round(capeValues.reduce((s, c) => s + c, 0) / capeValues.length) : null;

  // Cloud base: stima derivata (non dato API diretto)
  const avgDew = flightHours.reduce((s, h) => s + (h.dewPoint ?? 0), 0) / flightHours.length;
  const cloudBase = cape !== null ? calcCloudBaseSLM(avgTemp, avgDew) : null;

  // Freezing level: usa dato API quando disponibile
  const freezeLevels = flightHours.map(h => h.freezingLevel).filter(f => f !== null && f !== undefined);
  const freezingLevel = freezeLevels.length > 0
    ? Math.round(freezeLevels.reduce((s, f) => s + f, 0) / freezeLevels.length)
    : null;

  const peakHour = flightHours.reduce((best, h) =>
    Math.abs(h.temperature ?? 0 - maxTemp) < Math.abs(best.temperature ?? 0 - maxTemp) ? h : best
  , flightHours[0]);
  const peakHourNum = new Date(peakHour.time).getHours();

  const groundWind = flightHours[Math.floor(flightHours.length / 2)];

  const thermal = `Analisi termica per la giornata:\n\n${cloudBase !== null ? `• Base termica: ${cloudBase}m slm` : '• Base termica: N/D'}\n${freezingLevel !== null ? `• Zero termico: ${freezingLevel}m` : '• Zero termico: N/D'}\n${cape !== null ? `• CAPE: ${cape} J/kg` : '• CAPE: N/D'}\n\n${cape !== null ? thermicDesc(cape, cloudBase ?? 0, avgTemp) : 'Impossibile valutare le termiche senza dati CAPE.'}\n\n• Temperatura superficie: ${Math.round(minTemp)}°C ÷ ${Math.round(maxTemp)}°C (media ${Math.round(avgTemp)}°C)\n• Umidità media: ${Math.round(avgHumidity)}%`;

  const altitude = `Venti in quota reali:\n\n${groundWind !== undefined && groundWind.windSpeed !== null ?
    `Suolo: ${Math.round(groundWind.windSpeed)} km/h da ${dirText(groundWind.windDir)}\n` : ''}`;

  const hourly = flightHours.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map(h =>
    `🕐 ${String(new Date(h.time).getHours()).padStart(2, "0")}:00 — ${h.temperature !== null ? Math.round(h.temperature) + '°C' : 'N/D'} · Nuvole: ${h.cloudCover !== null ? Math.round(h.cloudCover) + '%' : 'N/D'} · Vento: ${h.windSpeed !== null ? Math.round(h.windSpeed) + ' km/h' : 'N/D'} da ${h.windDir !== null ? dirText(h.windDir) : 'N/D'} · Pioggia: ${h.precipitation !== null && h.precipitation > 0 ? h.precipitation.toFixed(1) + ' mm' : '0 mm'}`
  ).join("\n");

  const thunderstorm = cape !== null
    ? thunderstormText(cape, peakHourNum, maxTemp, avgCloud)
    : "Impossibile valutare il rischio temporali senza dati CAPE.";

  return { thermal, altitude, hourly, thunderstorm };
};