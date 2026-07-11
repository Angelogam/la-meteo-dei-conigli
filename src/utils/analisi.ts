"use client";

import type { HourData } from "@/types/meteo";
import type { Decollo } from "@/data/decolli";
import { wa, wd } from "@/utils/meteo";

/** Genera testo AI in stile bollettino meteorologico aeronautico */
export function genAI(dayData: HourData[], site: Decollo, thermal: any) {
  if (!dayData?.length) return null;

  // Calcoli medi su finestra 8-20
  const window = dayData.filter((h) => {
    const hour = h.time.getHours();
    return hour >= 8 && hour <= 20;
  });
  if (!window.length) return null;

  const avgTemp = window.reduce((s, h) => s + h.temperature, 0) / window.length;
  const avgHum = window.reduce((s, h) => s + h.humidity, 0) / window.length;
  const avgCloud = window.reduce((s, h) => s + h.cloudCover, 0) / window.length;
  const maxWind = Math.max(...window.map((h) => h.windSpeed));
  const avgWind = window.reduce((s, h) => s + h.windSpeed, 0) / window.length;
  const totalRain = window.reduce((s, h) => s + h.precipitation, 0);
  const hasStorm = window.some((h) => h.weatherCode >= 95);
  const hasRain = window.some((h) => h.precipitation > 0.5);
  const minHum = Math.min(...window.map((h) => h.humidity));
  const maxTemp = Math.max(...window.map((h) => h.temperature));

  // Calcola vento dominante
  const dirCount: Record<string, number> = {};
  window.forEach((h) => {
    const dir = wa(h.windDir);
    dirCount[dir] = (dirCount[dir] || 0) + 1;
  });
  const dominantDir = Object.entries(dirCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "variabile";

  // --- SEZIONE GENERALE ---
  let general = "\u2600\uFE0F **Situazione Generale**\n\n";
  general += `Temperatura al suolo: intorno ai ${Math.round(avgTemp)}\u00B0C al mattino, con massima nelle ore centrali fino a circa ${Math.round(maxTemp)}\u00B0C.\n\n`;
  general += `Umidit\u00e0 relativa: ${Math.round(avgHum)}%, con minimo di ${Math.round(minHum)}% nelle ore pi\u00f9 calde; l\u2019aria \u00e8 ${avgHum < 50 ? "secca" : avgHum < 65 ? "moderata" : "umida"} nei bassi strati, segno di ${avgHum < 60 ? "buona visibilit\u00e0 e scarsa probabilit\u00e0 di nebbie" : "possibile foschia"}.\n\n`;
  general += `Vento: ${wd(avgWind)} da ${dominantDir} al suolo, tendente a rinforzare in quota fino a ${Math.round(maxWind)} km/h.\n\n`;
  general += `Cielo: prevalenza di ${ct(avgCloud)}; ${avgCloud > 50 ? "qualche sviluppo cumuliforme pomeridiano possibile sulle creste" : "assenza di nubi convettive significative"}${hasStorm ? ", con rischio di temporali" : ", senza rischio di temporali significativi"}.\n\n`;

  // --- SEZIONE PROFILO TERMICO ---
  let thermalSec = "\uD83C\uDF21\uFE0F **Profilo Termico e Stabilit\u00e0**\n\n";
  if (thermal) {
    const delta = thermal.delta || (maxTemp - (maxTemp - (100 - avgHum) / 5));
    const stability = thermal.soarIdx >= 7 ? "instabile" : thermal.soarIdx >= 4 ? "debolmente instabile" : "stabile";
    thermalSec += `Il gradiente verticale di temperatura mostra un\u2019atmosfera piuttosto ${stability}:`;
    thermalSec += ` la temperatura al suolo e il punto di rugiada restano ${delta > 8 ? "ben separati" : "abbastanza vicini"}, quindi ${delta > 8 ? "scarsa convezione profonda" : "possibile attivit\u00e0 termica"}.\n\n`;
    thermalSec += `Indice di galleggiamento: ${thermal.soarIdx}/10, confermando ${stability === "instabile" ? "eccellenti condizioni termiche" : stability === "debolmente instabile" ? "moderata attivit\u00e0 termica" : "stabilit\u00e0 e scarsa probabilit\u00e0 di temporali"}.\n\n`;
    thermalSec += `La base delle nubi \u00e8 stimata a ${thermal.cloudBase}m, con plafond termico a ${thermal.thermalTop}m.\n\n`;
    thermalSec += `${thermal.soarIdx >= 6 ? "Il profilo favorisce buone condizioni di volo libero: aria asciutta, termiche regolari e nessuna turbolenza marcata." : "Attenzione: la stabilit\u00e0 potrebbe limitare lo sviluppo termico pomeridiano."}\n\n`;
  } else {
    thermalSec += `Dati termici non disponibili per questa giornata.\n\n`;
  }

  // --- SEZIONE VENTO ---
  let windSec = "\uD83C\uDF2C\uFE0F **Vento e Dinamica in Quota**\n\n";
  windSec += `Il profilo del vento mostra direzione prevalente da ${dominantDir}, con intensit\u00e0`;
  windSec += maxWind > 30 ? " sostenuta" : maxWind > 20 ? " moderata" : " debole";
  windSec += ` crescente fino a ${Math.round(maxWind)} km/h sopra i 1500m.\n\n`;
  windSec += maxWind < 25
    ? `Questo favorisce buone condizioni di volo libero: aria asciutta, termiche regolari e nessuna turbolenza marcata.`
    : `Vento piuttosto teso in quota: valutare con attenzione l\u2019uscita dal decollo.`;
  windSec += `\n\nNon si osservano inversioni termiche forti: la temperatura decresce regolarmente con la quota, segno di buon rimescolamento dell\u2019aria.\n\n`;

  // --- SEZIONE SVOLGIMENTO GIORNATA ---
  let hourlySec = "\uD83C\uDF24\uFE0F **Previsione per la Giornata**\n\n";
  const fasce = [
    { label: "Mattina (8\u201311)", hours: [8, 9, 10, 11] },
    { label: "Pomeriggio (12\u201317)", hours: [12, 13, 14, 15, 16, 17] },
    { label: "Sera (18\u201320)", hours: [18, 19, 20] },
  ];
  for (const fascia of fasce) {
    const dw = window.filter((h) => fascia.hours.includes(h.time.getHours()));
    if (!dw.length) continue;
    const avgT = dw.reduce((s, h) => s + h.temperature, 0) / dw.length;
    const avgW = dw.reduce((s, h) => s + h.windSpeed, 0) / dw.length;
    const avgCld = dw.reduce((s, h) => s + h.cloudCover, 0) / dw.length;
    const hasRainFascia = dw.some((h) => h.precipitation > 0.3);
    const note = [];
    if (avgCld < 20) note.push("sole pieno");
    else if (avgCld < 50) note.push("qualche nuvola");
    else if (avgCld < 80) note.push("nuvolosit\u00e0 variabile");
    else note.push("cielo coperto");
    if (avgW < 8) note.push("vento debole");
    else if (avgW < 18) note.push("vento moderato");
    else note.push("vento sostenuto");
    if (hasRainFascia) note.push("possibile pioggia");
    hourlySec += `**${fascia.label}**: ${note.slice(0, 2).join(", ")}\n`;
    hourlySec += `Temperatura: ${Math.round(avgT)}\u00B0C, Vento: ${Math.round(avgW)} km/h, Nuvole: ${Math.round(avgCld)}%\n\n`;
  }

  // --- SEZIONE INTERPRETAZIONE ---
  let interp = "\uD83E\uDE82 **Interpretazione per Attivit\u00e0 Outdoor / Volo Libero**\n\n";
  if (hasStorm) {
    interp += "ALLERTA TEMPORALI: \u00e8 sconsigliato volare oggi.\nRischio elevato di fulminazioni in quota.\n";
  } else if (hasRain || avgWind > 25) {
    interp += "Condizioni non ottimali per il volo.\n";
    if (avgWind > 25) interp += "Vento forte in quota (>25 km/h).\n";
    if (hasRain) interp += "Precipitazioni previste durante la giornata.\n";
  } else if (thermal && thermal.soarIdx >= 6 && avgWind < 20) {
    interp += "Condizioni ideali per decolli e veleggiamento: aria asciutta, termiche regolari, vento gestibile.\n\n";
    interp += "Nessun rischio di temporali o pioggia.\n\n";
    interp += thermal.thermalTop > 2500
      ? "Ottime opportunit\u00e0 di cross country con plafond oltre i 2500m."
      : "Buone condizioni per voli locali e di mezza distanza.";
  } else {
    interp += "Condizioni mediocri o incerte.\nValutare con attenzione le condizioni locali prima di decollare.\n";
  }

  // --- SEZIONE PRESSIONE ---
  const pressures = window.filter((h) => h.pressure).map((h) => h.pressure);
  let press = "\uD83D\uDD0D **Pressione**\n\n";
  if (pressures.length > 0) {
    const avgP = pressures.reduce((a, b) => a + b, 0) / pressures.length;
    const trend = pressures[pressures.length - 1] - pressures[0];
    press += `Pressione media: ${Math.round(avgP)} hPa.\n`;
    press += `Trend: ${trend > 3 ? "in aumento (alta pressione in arrivo)" : trend < -3 ? "in diminuzione (possibile peggioramento)" : "stabile (regime anticiclonico)"}.\n\n`;
    if (trend < -3 && avgHum > 65) press += "Attenzione: calo pressorio combinato a umidit\u00e0 alta potrebbe portare instabilit\u00e0 pomeridiana.\n";
  }

  // --- SEZIONE TEMPORALI ---
  let storm = "\u26C8\uFE0F **Temporali**\n\n";
  if (hasStorm) storm += "ALLERTA TEMPORALI! Volo sconsigliato! Rischio di fulminazioni in quota.\n";
  else if (totalRain > 3 && avgCloud > 70) storm += "Possibili temporali pomeridiani - monitorare l\u2019evoluzione.\n";
  else storm += "Nessun rischio di temporali significativi per la giornata.\n";

  return {
    general,
    advice: interp,
    thermal: thermalSec,
    altitude: `🌤️ **Plafond e Sviluppo Verticale**\n\nBase nuvole: ${thermal?.cloudBase || "N/D"}m\nPlafond termico: ${thermal?.thermalTop || "N/D"}m`,
    hourly: hourlySec,
    wind: windSec,
    pressure: press,
    thunderstorm: storm,
  };
}

function ct(avgCloud: number): string {
  if (avgCloud <= 20) return "sereno o poco nuvoloso";
  if (avgCloud <= 40) return "poco nuvoloso";
  if (avgCloud <= 60) return "nuvolosit\u00e0 variabile";
  if (avgCloud <= 80) return "molto nuvoloso";
  return "coperto";
}