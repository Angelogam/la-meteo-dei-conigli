"use client";

import type { HourData, AiAnalysis, ThermalData } from "@/types/meteo";
import { wa, wic } from "./meteo";

function mediaVento(dayData: HourData[]): number {
  if (!dayData.length) return 0;
  return dayData.reduce((s, h) => s + h.windSpeed, 0) / dayData.length;
}

function direzioneDominante(dayData: HourData[]): string {
  if (!dayData.length) return "variabile";
  const freq: Record<number, number> = {};
  for (const h of dayData) {
    freq[h.windDir] = (freq[h.windDir] || 0) + 1;
  }
  const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  return best ? wa(parseInt(best[0])) : "variabile";
}

function mediaNuvole(dayData: HourData[]): number {
  if (!dayData.length) return 0;
  return dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;
}

function maxPreece(dayData: HourData[]): number {
  if (!dayData.length) return 0;
  return Math.max(...dayData.map((h) => h.precipitation));
}

export function genAI(dayData: HourData[], selected: { altitude: number }, thermal: ThermalData | null): AiAnalysis | null {
  if (!dayData.length) return null;

  const vMedia = mediaVento(dayData);
  const vMax = Math.round(Math.max(...dayData.map((h) => h.windSpeed)));
  const vMin = Math.round(Math.min(...dayData.map((h) => h.windSpeed)));
  const dDir = direzioneDominante(dayData);
  const nMedia = Math.round(mediaNuvole(dayData));
  const pMax = maxPreece(dayData);
  const tMin = Math.round(Math.min(...dayData.map((h) => h.temperature)));
  const tMax = Math.round(Math.max(...dayData.map((h) => h.temperature)));

  // Situazione generale
  let general = "";
  if (nMedia <= 25) {
    general = `Cielo prevalente sereno o poco nuvoloso (${nMedia}% copertura media). Condizioni stabili per l'intera giornata, ideali per il volo. L'alta pressione mantiene il cielo terso, con buona visibilità e scarsa probabilità di precipitazioni.`;
  } else if (nMedia <= 50) {
    general = `Cielo da parzialmente nuvoloso a variabile (${nMedia}% copertura media). Qualche annuvolamento pomeridiano, specie nelle ore più calde. Possibili velature, ma senza rischi di fulmini. Condizioni volabili con attenzione.`;
  } else if (nMedia <= 75) {
    general = `Cielo molto nuvoloso (${nMedia}% copertura media). Presenza di nubi cumuliformi che possono svilupparsi in temporali sparsi. Prestare attenzione all'evoluzione pomeridiana. Il rischio fulmini aumenta nelle ore centrali se i cumuli diventano imponenti.`;
  } else {
    general = `Cielo coperto (${nMedia}% copertura media). Possibili precipitazioni e temporali. Rischi di fulmini elevati: evitare di volare in prossimità dei nuclei temporaleschi. La situazione potrebbe migliorare solo in serata, se il fronte si allontana.`;
  }

  // Termiche
  let thermalStr = "";
  const tempRange = tMax - tMin;
  if (!thermal) {
    thermalStr = `Non ci sono abbastanza dati per un'analisi termica dettagliata.`;
  } else if (thermal.soarIdx >= 7) {
    thermalStr = `Condizioni termiche eccellenti. Base termica a ${thermal.cloudBase}m e plafond a ${thermal.thermalTop}m. Differenza termica giornaliera di ${tempRange}°C, ideale per lo sviluppo di termiche forti e ben strutturate. Volo libero consigliato.`;
  } else if (thermal.soarIdx >= 4) {
    thermalStr = `Condizioni termiche moderate. Base stimata ${thermal.cloudBase}m, plafond ${thermal.thermalTop}m. Le termiche ci sono ma potrebbero essere discontinue. Meglio volare nelle ore centrali quando l'irraggiamento è massimo.`;
  } else {
    thermalStr = `Termiche deboli o assenti. Base a ${thermal.cloudBase}m, plafond limitato a ${thermal.thermalTop}m. Lo scarso gradiente termico (${tempRange}°C) non favorisce lo sviluppo di correnti ascendenti significative. Giornata più adatta per un volo termico.`;
  }

  // Vento
  let windStr = "";
  if (vMedia < 8) {
    windStr = `Vento debole da ${dDir}, media ${Math.round(vMedia)} km/h (range ${vMin}-${vMax} km/h). Ideale per volo libero, direzione costante e ben allineata. Nessun rischio di turbolenza significativa.`;
  } else if (vMedia < 16) {
    windStr = `Vento moderato da ${dDir}, media ${Math.round(vMedia)} km/h (range ${vMin}-${vMax} km/h). Direzione prevalente, buona per decollo e atterraggio. Qualche raffica pomeridiana possibile ma gestibile.`;
  } else {
    windStr = `Vento sostenuto da ${dDir}, media ${Math.round(vMedia)} km/h (range ${vMin}-${vMax} km/h). Raffiche anche intense nelle ore centrali. Turbolenza da sottovento possibile. Attenzione ai colpi di vento improvvisi, specialmente in presenza di cumuli.`;
  }

  // Evoluzione oraria
  let hourlyStr = "";
  const morning = dayData.filter((h) => h.time.getHours() >= 6 && h.time.getHours() < 12);
  const afternoon = dayData.filter((h) => h.time.getHours() >= 12 && h.time.getHours() < 18);
  const evening = dayData.filter((h) => h.time.getHours() >= 18 && h.time.getHours() < 22);

  const mM = morning.length ? Math.round(morning.reduce((s, h) => s + h.temperature, 0) / morning.length) : 0;
  const mA = afternoon.length ? Math.round(afternoon.reduce((s, h) => s + h.temperature, 0) / afternoon.length) : 0;
  const mE = evening.length ? Math.round(evening.reduce((s, h) => s + h.temperature, 0) / evening.length) : 0;
  const pM = morning.length ? Math.round(Math.max(...morning.map((h) => h.precipitation)) * 10) / 10 : 0;
  const pA = afternoon.length ? Math.round(Math.max(...afternoon.map((h) => h.precipitation)) * 10) / 10 : 0;
  const pE = evening.length ? Math.round(Math.max(...evening.map((h) => h.precipitation)) * 10) / 10 : 0;

  hourlyStr = `Mattino: ${mM}°C, vento da ${dDir} ${Math.round(vMedia)} km/h, nuvole ${Math.min(100, nMedia)}%. Precipitazioni: ${pM > 0 ? pM + "mm" : "assenti"}. Pomeriggio: ${mA}°C, vento ${Math.round(vMedia + 2)} km/h, possibile aumento nuvole. Precipitazioni: ${pA > 0 ? pA + "mm" : "scarsa probabilità"}. Sera: ${mE}°C, vento in calo. Precipitazioni: ${pE > 0 ? pE + "mm" : "assenti"}.`;

  // Consiglio finale
  let advice = "";
  const riskArray: string[] = [];

  if (vMax > 25) riskArray.push("vento forte");
  if (nMedia > 60 && pMax > 2) riskArray.push("rischi di fulmini e temporali");
  if (tempRange > 18) riskArray.push("turbolenza termica pomeridiana");
  if (thermal && thermal.soarIdx < 4) riskArray.push("termiche deboli");

  if (!riskArray.length) {
    advice = `Giornata ottimale per il volo. Tutti i parametri sono favorevoli: vento moderato, assenza di precipitazioni e rischi di fulmini, buona termica. Decollo e atterraggio in condizioni sicure. Approfittane!`;
  } else if (riskArray.length <= 2) {
    advice = `Giornata volabile con cautela. Attenzione a: ${riskArray.join(", ")}. Controlla sempre l'evoluzione prima del decollo e mantieni una via di fuga.`;
  } else {
    advice = `Giornata da valutare con molta attenzione. Rischi presenti: ${riskArray.join(", ")}. Meglio rimandare il volo se le condizioni peggiorano. La prudenza non è mai troppa.`;
  }

  // Temporale
  const precipHours = dayData.filter((h) => h.precipitation > 0.5);
  const thunderHours = dayData.filter((h) => h.weatherCode >= 95);
  let thunderstorm = "";

  if (thunderHours.length > 0) {
    thunderstorm = `⚠️ ALLERTA TEMPORALI ⚠️\nSono previsti temporali nelle ore: ${thunderHours.map((h) => h.time.getHours() + ":00").join(", ")}. RISCHI DI FULMINI elevati. Evitare assolutamente di volare durante i temporali. Meteo deteriorato.`;
  } else if (precipHours.length > 3 && nMedia > 60) {
    thunderstorm = `Possibili rovesci sparsi. Il cielo molto nuvoloso (${nMedia}%) potrebbe generare qualche temporale pomeridiano. Rischi di fulmini da monitorare. Se vedi cumulonembi avvicinarsi, mettiti al sicuro.`;
  } else if (nMedia > 50 && tempRange > 14) {
    thunderstorm = `Sviluppo di cumuli possibile nel pomeriggio. Rischi di fulmini bassi ma non nulli se i cumuli diventano imponenti. Tieni d'occhio l'orizzonte.`;
  } else {
    thunderstorm = `Nessun rischio temporali e rischi di fulmini trascurabili. Cielo sereno o poco nuvoloso, condizioni sicure per il volo.`;
  }

  return { general, thermal: thermalStr, wind: windStr, hourly: hourlyStr, advice, thunderstorm, altitude: "", pressure: "" } as AiAnalysis;
}