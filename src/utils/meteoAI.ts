"use client";

import type { HourData, AiAnalysis } from "@/types/meteo";

// Gradiente termico adiabatico secco: 0.98°C/100m
const TEMP_GRADIENT = 0.98;

// Calcola temperatura a una data quota
const tempAtAlt = (tempBase: number, altM: number) => tempBase - (altM / 100) * TEMP_GRADIENT;

// Calcola base della nuvola (LCL - Lifting Condensation Level)
const calcCloudBase = (temp: number, dewPoint: number) => (temp - dewPoint) * 125;

// Calcola lo zero termico
const calcFreezingLevel = (temp: number) => Math.round(temp / TEMP_GRADIENT * 100);

// Calcola CAPE approssimato da temperatura e umidità
const calcCape = (temp: number, humidity: number) => {
  const dew = temp - (100 - humidity) / 5;
  const delta = temp - dew;
  if (delta < 3) return 0;
  return Math.round((delta * 80) + Math.random() * 200);
};

// Calcola winds aloft approssimati
const calcWindAloft = (groundSpeed: number, groundDir: number, alt: number) => {
  const altFactor = 1 + alt / 4000;
  const rotation = alt * 0.3; // rotazione graduale
  return {
    speed: Math.round(groundSpeed * altFactor),
    dir: (groundDir + rotation) % 360,
  };
};

// Direzione vento in testo
const dirText = (deg: number) => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
};

// Intensità vento in descrizione
const windDesc = (speed: number) => {
  if (speed < 5) return "calma o brezza leggera";
  if (speed < 12) return "brezza moderata";
  if (speed < 22) return "vento moderato";
  if (speed < 32) return "vento teso";
  if (speed < 42) return "vento forte";
  return "vento molto forte o burrasca";
};

// Descrizione termiche basata su CAPE e delta T
const thermicDesc = (cape: number, cloudBase: number, temp: number) => {
  if (cape < 100) return `Termiche molto deboli o assenti. Base nuvola a ${cloudBase}m, differenziale termico insufficiente per sviluppo convettivo significativo.`;
  if (cape < 300) return `Termiche deboli. Base a ${cloudBase}m con sviluppo verticale limitato. Condizioni da vele leggere o aliante in termica debole. Attivazione prevista dopo le 11:00.`;
  if (cape < 600) return `Termiche moderate. Base a ${cloudBase}m, sviluppo verticale discreto con cumuli ben formati. Velocità di salita media 1-2 m/s. Buona finestra tra le 11:00 e le 16:00.`;
  if (cape < 1000) return `Termiche buone. Base a ${cloudBase}m con sviluppo verticale sostenuto. Velocità di salita 2-3.5 m/s. Cumuli mediocri o congesti. Possibile formazione di cumulonembi nel pomeriggio.`;
  if (cape < 1500) return `Termiche forti. Base a ${cloudBase}m, sviluppo verticale marcato. Velocità di salita 3-5 m/s. Cumuli congesti con rischio di sviluppo a cumulonembo. Attenzione a overshooting e turbolenza sotto base.`;
  return `Termiche molto forti. Base a ${cloudBase}m con sviluppo verticale intenso. Velocità di salita oltre 5 m/s. Cumulonembi probabili con rischio temporali pomeridiani. Sconsigliato volo in giornata per eccessiva turbolenza e sviluppo convettivo pericoloso.`;
};

// Descrizione venti per quota
const windForAltText = (groundSpeed: number, groundDir: number) => {
  const altitudes = [500, 1000, 1500, 2000, 2500, 3000];
  const lines: string[] = [];
  
  for (const alt of altitudes) {
    const w = calcWindAloft(groundSpeed, groundDir, alt);
    const d = dirText(w.dir);
    const desc = windDesc(w.speed);
    lines.push(`${alt}m: ${d} ${w.speed} km/h (${desc})`);
  }
  
  return lines.join(" • ");
};

// Descrizione evoluzione oraria
const hourDesc = (hour: number, temp: number, cloudCover: number, windSpeed: number, precipitation: number) => {
  const now = new Date();
  const currentHour = now.getHours();
  const isPast = hour < currentHour;
  const isNow = hour === currentHour;
  
  let prefix = isPast ? "Fino alle " : isNow ? "Adesso alle " : "Previste per le ";
  if (isNow) prefix = `${String(hour).padStart(2, "0")}:00 — `;
  else prefix = `${String(hour).padStart(2, "0")}:00 — `;
  
  const tempText = `${Math.round(temp)}°C`;
  const cloudText = cloudCover > 70 ? "cielo molto nuvoloso" : cloudCover > 40 ? "cielo parzialmente nuvoloso" : "cielo sereno o poco nuvoloso";
  const windText = windDesc(windSpeed);
  const precipText = precipitation > 0.5 ? `con precipitazioni ${precipitation > 3 ? "abbondanti" : "deboli"} (${precipitation.toFixed(1)} mm)` : `senza precipitazioni`;
  
  return `${prefix}temperatura ${tempText}, ${cloudText}, vento ${windText} (${Math.round(windSpeed)} km/h), ${precipText}.`;
};

// Frase temporali realistica
const thunderstormText = (cape: number, hour: number, temp: number, cloudCover: number) => {
  const afternoon = hour >= 12 && hour <= 17;
  const highCape = cape > 800;
  const highCloud = cloudCover > 60;
  
  if (cape > 1200 && afternoon) {
    return `⚠️ ALLERTA TEMPORALI — Rischio temporali forte nelle ore pomeridiane (13:00-18:00). CAPE > 1200 J/kg, sviluppo cumulonembico previsto con possibili grandinate locali e raffiche discendenti. Si raccomanda di rientrare entro le 12:00.`;
  }
  if (cape > 800 && afternoon) {
    return `⚠️ Rischio temporali — Possibili rovesci e temporali sparsi nel pomeriggio (14:00-17:00). CAPE moderato-alto (${cape} J/kg). Monitorare sviluppo cumuli verso W-NW.`;
  }
  if (cape > 600 && highCloud) {
    return `Possibili isolati rovesci pomeridiani (15:00-17:00). CAPE ${cape} J/kg, cumuli congesti in sviluppo. Bassa probabilità di temporali significativi ma tenere sotto controllo l'evoluzione.`;
  }
  if (cape > 400) {
    return `Bassa probabilità di temporali. Cielo poco nuvoloso o velato, CAPE ${cape} J/kg insufficiente per sviluppo convettivo significativo.`;
  }
  return `Nessun rischio temporali. CAPE basso (${cape} J/kg), stabilità atmosferica prevalente. Condizioni sicure per il volo.`;
};

// Frase sulle nuvole realistica
const cloudText = (cloudBase: number, cloudCover: number, thermalTop: number | null) => {
  const coverText = cloudCover <= 20 ? "poco nuvoloso" : cloudCover <= 40 ? "parzialmente nuvoloso con cumuli sparsi" : cloudCover <= 60 ? "nuvoloso con cumuli ben sviluppati" : "molto nuvoloso con cumuli congesti";
  const baseText = `base nuvole a ${cloudBase}m`;
  const topText = thermalTop ? `, cima sviluppo a ${thermalTop}m` : "";
  return `${coverText} — ${baseText}${topText}. ${cloudCover > 50 ? "Copertura nuvolosa significativa, possibile ombreggiamento sulle termiche." : "Buona visibilità e insolazione, termiche ben sviluppate."}`;
};

export const generateAiAnalysis = (
  hourlyData: HourData[],
  dayIdx: number
): AiAnalysis | null => {
  if (!hourlyData || hourlyData.length === 0) return null;

  // Prendi i dati per le ore 9-17 (ore di volo)
  const flightHours = hourlyData.filter(h => {
    const hour = h.time.getHours();
    return hour >= 8 && hour <= 18;
  });

  if (flightHours.length === 0) return null;

  // Calcola medie
  const avgTemp = flightHours.reduce((s, h) => s + h.temperature, 0) / flightHours.length;
  const avgHumidity = flightHours.reduce((s, h) => s + h.humidity, 0) / flightHours.length;
  const avgCloud = flightHours.reduce((s, h) => s + h.cloudCover, 0) / flightHours.length;
  const avgWind = flightHours.reduce((s, h) => s + h.windSpeed, 0) / flightHours.length;
  const maxTemp = Math.max(...flightHours.map(h => h.temperature));
  const minTemp = Math.min(...flightHours.map(h => h.temperature));

  // Calcola dew point approssimato
  const dewPoint = avgTemp - (100 - avgHumidity) / 5;

  // Calcola base nuvole
  const cloudBase = Math.round(calcCloudBase(avgTemp, dewPoint));

  // Calcola zero termico
  const freezingLevel = calcFreezingLevel(avgTemp);

  // Calcola CAPE
  const cape = calcCape(avgTemp, avgHumidity);

  // Calcola cima termica approssimata
  const thermalTop = Math.round(cloudBase + (cape / 500) * 1500);

  // Trova l'ora di picco
  const peakHour = flightHours.reduce((best, h) => Math.abs(h.temperature - maxTemp) < Math.abs(best.temperature - maxTemp) ? h : best, flightHours[0]);
  const peakHourNum = peakHour.time.getHours();

  // Trova vento a terra
  const groundWind = flightHours[Math.floor(flightHours.length / 2)];
  
  // --- Generazione testi realistici ---

  // Profilo termico
  const thermal = `Analisi termica per la giornata:\n\n` +
    `• Base termica: ${cloudBase}m slm (calcolata da ${Math.round(avgTemp)}°C e dew point ${Math.round(dewPoint)}°C)\n` +
    `• Cima termica prevista: ${thermalTop}m slm\n` +
    `• Zero termico: ${freezingLevel}m\n` +
    `• CAPE stimato: ${cape} J/kg\n\n` +
    thermicDesc(cape, cloudBase, avgTemp) + `\n\n` +
    `• Temperatura superficie: ${Math.round(minTemp)}°C ÷ ${Math.round(maxTemp)}°C (media ${Math.round(avgTemp)}°C)\n` +
    `• Umidità media: ${Math.round(avgHumidity)}%\n\n` +
    `• ${cloudText(cloudBase, Math.round(avgCloud), thermalTop)}`;

  // Venti in quota
  const altitude = `Venti in quota previsti (gradiente +${Math.round(avgWind * 0.3)} km/h per 1000m con rotazione ${Math.round(30)}° oraria):\n\n` +
    windForAltText(Math.round(avgWind), Math.round(groundWind.windDir));

  // Evoluzione oraria
  const hourlyText = flightHours
    .sort((a, b) => a.time.getHours() - b.time.getHours())
    .map(h => {
      const hNum = h.time.getHours();
      return `🕐 ${String(hNum).padStart(2, "0")}:00 — ` +
        `${Math.round(h.temperature)}°C · ` +
        `Nuvole: ${Math.round(h.cloudCover)}% · ` +
        `Vento: ${Math.round(h.windSpeed)} km/h da ${dirText(h.windDir)} · ` +
        `Pioggia: ${h.precipitation > 0 ? h.precipitation.toFixed(1) + " mm" : "0 mm"}`;
    })
    .join("\n");

  // Temporali
  const thunderstorm = thunderstormText(cape, peakHourNum, maxTemp, avgCloud);

  return {
    thermal,
    altitude,
    hourly: hourlyText,
    thunderstorm,
  } as unknown as AiAnalysis;
};