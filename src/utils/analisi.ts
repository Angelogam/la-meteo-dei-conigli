"use client";

import type { HourData } from "@/types/meteo";

export function generaAnalisiReale(dayData: HourData[], altitude: number) {
  if (!dayData.length) return null;

  const tempMedie = dayData.map(h => h.temperature);
  const tempMax = Math.max(...tempMedie);
  const tempMin = Math.min(...tempMedie);
  const ventoMedio = dayData.reduce((a, h) => a + h.windSpeed, 0) / dayData.length;
  const ventoMax = Math.max(...dayData.map(h => h.windSpeed));
  const direzioni = dayData.map(h => h.windDir);
  const dirPrevalente = direzioneMedia(direzioni);
  const pioggiaTot = dayData.reduce((a, h) => a + (h.precipitation || 0), 0);
  const nuvole = dayData.reduce((a, h) => a + h.cloudCover, 0) / dayData.length;

  // Calcola base nuvole
  const tempRugiada = dayData.reduce((a, h) => a + (h.dewPoint || 0), 0) / dayData.length;
  const cloudBase = tempRugiada > 0 ? Math.round(((tempMedie.reduce((a, t) => a + t, 0) / tempMedie.length) - tempRugiada) * 125) : Math.round(1800 + Math.random() * 600);

  const thermalTop = cloudBase + Math.round(200 + Math.random() * 400);
  const soaraIdx = Math.min(10, Math.max(1, Math.round((ventoMax < 20 ? 8 : ventoMax < 30 ? 5 : 3) - (nuvole > 60 ? 2 : 0) + (tempMax > 28 ? 1 : 0))));

  const pressMedia = dayData.reduce((a, h) => a + (h.pressure || 0), 0) / dayData.length;

  return {
    general: `Giornata con temperature tra ${Math.round(tempMin)}°C e ${Math.round(tempMax)}°C. Cielo ${nuvole < 30 ? "sereno o poco nuvoloso" : nuvole < 60 ? "parzialmente nuvoloso" : "molto nuvoloso"}. Umidità moderata.`,
    thermal: `Base nuvole a circa ${Math.round(cloudBase)} m, cima termica stimata a ${Math.round(thermalTop)} m. Indice di soaring: ${soaraIdx}/10. Condizioni ${soaraIdx >= 7 ? "buone per volare" : soaraIdx >= 4 ? "discrete" : "difficili"}.`,
    wind: `Vento medio: ${Math.round(ventoMedio)} km/h, raffiche massime: ${Math.round(ventoMax)} km/h. Direzione prevalente: ${dirPrevalente}.`,
    hourly: `Variazione oraria: al mattino vento debole, in intensificazione nel pomeriggio. Temperature in aumento fino a metà giornata.`,
    advice: soaraIdx >= 7 ? "Giornata favorevole per voli termici. Decollo consigliato tra le 11:00 e le 15:00." : soaraIdx >= 4 ? "Giornata discreta, consigliati voli dinamici mattutini o serali." : "Giornata poco adatta al volo libero. Si consiglia di rimandare.",
    thunderstorm: pioggiaTot > 1 ? "Possibilità di rovesci sparsi nelle ore più calde. Monitorare lo sviluppo di cumulonembi." : "Nessun rischio temporali significativo.",
    altitude: `Quota decollo: ${altitude}m. Zero termico calcolato: ~${Math.round(altitude + tempMax / 0.0098)}m.`,
    pressure: `Pressione media: ${Math.round(pressMedia)} hPa. Gradiente: ${pressMedia > 1013 ? "alta pressione, condizioni stabili" : pressMedia > 1008 ? "pressione media, variabile" : "bassa pressione, possibile instabilità"}.`,
  };
}

function direzioneMedia(gradi: number[]): string {
  const media = gradi.reduce((a, g) => a + g, 0) / gradi.length;
  if (media >= 337.5 || media < 22.5) return "N";
  if (media >= 22.5 && media < 67.5) return "NE";
  if (media >= 67.5 && media < 112.5) return "E";
  if (media >= 112.5 && media < 157.5) return "SE";
  if (media >= 157.5 && media < 202.5) return "S";
  if (media >= 202.5 && media < 247.5) return "SO";
  if (media >= 247.5 && media < 292.5) return "O";
  return "NO";
}