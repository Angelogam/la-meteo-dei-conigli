"use client";

import type { HourData } from "@/types/meteo";

const TEMP_GRADIENT = 0.98;
const tempAtAlt = (tempBase: number, altM: number) => tempBase - (altM / 100) * TEMP_GRADIENT;
const calcCloudBase = (temp: number, dewPoint: number) => (temp - dewPoint) * 125;
const calcFreezingLevel = (temp: number) => Math.round(temp / TEMP_GRADIENT * 100);
const calcCape = (temp: number, humidity: number) => {
  const dew = temp - (100 - humidity) / 5;
  const delta = temp - dew;
  if (delta < 3) return 0;
  return Math.round((delta * 80) + Math.random() * 200);
};
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
  const flightHours = hourlyData.filter(h => { const hour = h.time.getHours(); return hour >= 8 && hour <= 18; });
  if (flightHours.length === 0) return null;
  const avgTemp = flightHours.reduce((s, h) => s + h.temperature, 0) / flightHours.length;
  const avgHumidity = flightHours.reduce((s, h) => s + h.humidity, 0) / flightHours.length;
  const avgCloud = flightHours.reduce((s, h) => s + h.cloudCover, 0) / flightHours.length;
  const avgWind = flightHours.reduce((s, h) => s + h.windSpeed, 0) / flightHours.length;
  const maxTemp = Math.max(...flightHours.map(h => h.temperature));
  const minTemp = Math.min(...flightHours.map(h => h.temperature));
  const dewPoint = avgTemp - (100 - avgHumidity) / 5;
  const cloudBase = calcCloudBase(avgTemp, dewPoint);
  const freezingLevel = calcFreezingLevel(avgTemp);
  const cape = calcCape(avgTemp, avgHumidity);
  const thermalTop = Math.round(cloudBase + (cape / 500) * 1500);
  const peakHour = flightHours.reduce((best, h) => Math.abs(h.temperature - maxTemp) < Math.abs(best.temperature - maxTemp) ? h : best, flightHours[0]);
  const peakHourNum = peakHour.time.getHours();
  const groundWind = flightHours[Math.floor(flightHours.length / 2)];

  const thermal = `Analisi termica per la giornata:\n\n• Base termica: ${cloudBase}m slm\n• Cima termica prevista: ${thermalTop}m slm\n• Zero termico: ${freezingLevel}m\n• CAPE stimato: ${cape} J/kg\n\n${thermicDesc(cape, cloudBase, avgTemp)}\n\n• Temperatura superficie: ${Math.round(minTemp)}°C ÷ ${Math.round(maxTemp)}°C (media ${Math.round(avgTemp)}°C)\n• Umidità media: ${Math.round(avgHumidity)}%`;
  const altitude = `Venti in quota previsti:\n\n${windForAltText(Math.round(avgWind), Math.round(groundWind.windDir))}`;
  const hourly = flightHours.sort((a, b) => a.time.getHours() - b.time.getHours()).map(h => 
    `🕐 ${String(h.time.getHours()).padStart(2, "0")}:00 — ${Math.round(h.temperature)}°C · Nuvole: ${Math.round(h.cloudCover)}% · Vento: ${Math.round(h.windSpeed)} km/h da ${dirText(h.windDir)} · Pioggia: ${h.precipitation > 0 ? h.precipitation.toFixed(1) + " mm" : "0 mm"}`
  ).join("\n");
  const thunderstorm = thunderstormText(cape, peakHourNum, maxTemp, avgCloud);

  return { thermal, altitude, hourly, thunderstorm };
};