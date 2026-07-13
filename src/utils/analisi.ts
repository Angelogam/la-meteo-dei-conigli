"use client";

import type { HourData } from "@/types/meteo";

interface AnalisiCompleta {
  situazioneGenerale: string;
  profiloTermico: string;
  ventoQuota: string;
  tabellaOraria: { fascia: string; condizioni: string; note: string }[];
  interpretazione: string;
}

export function generaAnalisiReale(dayData: HourData[], altitude: number): AnalisiCompleta {
  if (!dayData.length) {
    return { situazioneGenerale: "Dati insufficienti per generare un'analisi.", profiloTermico: "N/D", ventoQuota: "N/D", tabellaOraria: [], interpretazione: "N/D" };
  }

  const mattina = dayData.filter((h) => h.time.getHours() >= 8 && h.time.getHours() <= 11);
  const pomeriggio = dayData.filter((h) => h.time.getHours() >= 12 && h.time.getHours() <= 17);
  const sera = dayData.filter((h) => h.time.getHours() >= 18 && h.time.getHours() <= 21);
  const media = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : 0;
  const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
  const min = (arr: number[]) => arr.length ? Math.min(...arr) : 0;

  const tempMattina = mattina.length ? media(mattina.map((h) => h.temperature)) : null;
  const tempMaxDay = max(dayData.map((h) => h.temperature));
  const umidMattina = mattina.length ? media(mattina.map((h) => h.humidity)) : null;
  const ventoMattina = mattina.length ? media(mattina.map((h) => h.windSpeed)) : null;
  const precipitazioni = dayData.reduce((s, h) => s + h.precipitation, 0);
  const nuvolositaMedia = media(dayData.map((h) => h.cloudCover || 0));
  const avgSpread = mattina.length ? media(mattina.map((h) => h.temperature - h.dewPoint)) : 0;
  const rischioTemporali = avgSpread > 10 && precipitazioni > 1 && nuvolositaMedia > 50 ? "possibili" : "improbabili";
  const ventiAlti = dayData.filter((h) => h.time.getHours() >= 10 && h.time.getHours() <= 14).length > 0
    ? media(dayData.filter((h) => h.time.getHours() >= 10 && h.time.getHours() <= 14).map((h) => h.windSpeed))
    : ventoMattina ?? 0;
  const spreadMattina = mattina.length ? media(mattina.map((h) => h.temperature - h.dewPoint)) : null;
  const stabile = ventiAlti - (ventoMattina ?? 0) < 8 && spreadMattina !== null && spreadMattina > 8;
  const ventoMax = max(dayData.map((h) => h.windSpeed));
  const windGustsMax = max(dayData.filter((h) => h.windGusts !== null && h.windGusts !== undefined).map((h) => h.windGusts ?? 0));
  const tempMin = min(dayData.map((h) => h.temperature));
  const descrizioneNuvolosita = () => {
    if (nuvolositaMedia < 15) return "prevalenza di sereno";
    if (nuvolositaMedia < 35) return "poco nuvoloso";
    if (nuvolositaMedia < 60) return "parzialmente nuvoloso";
    if (nuvolositaMedia < 85) return "molto nuvoloso";
    return "coperto";
  };
  const descrizioneVentoSuolo = (ws: number) => {
    if (ws < 5) return "debole";
    if (ws < 10) return "moderato";
    if (ws < 18) return "sostenuto";
    if (ws < 25) return "forte";
    return "molto forte";
  };

  const situazioneGenerale = `Situazione generale
Temperatura al suolo: intorno ai ${tempMattina !== null ? Math.round(tempMattina) : "N/D"} °C al mattino, con lieve aumento nelle ore centrali fino a circa ${Math.round(tempMaxDay)} °C.
Umidità relativa: ${umidMattina !== null ? (umidMattina < 45 ? "bassa" : umidMattina < 65 ? "moderata" : "alta") : "N/D"}.
Vento: ${descrizioneVentoSuolo(ventoMattina ?? 0)} al suolo, tendente a rinforzare leggermente in quota.
Cielo: ${descrizioneNuvolosita()}${nuvolositaMedia < 60 ? "; qualche sviluppo cumuliforme pomeridiano possibile sulle creste" : ""}${rischioTemporali === "possibili" ? ", con rischio di temporali pomeridiani" : ", senza rischio di temporali significativi"}.`;

  const profiloTermico = `🌡️ Profilo termico e stabilità
Il gradiente verticale di temperatura mostra un'atmosfera ${stabile ? "piuttosto stabile" : "tendenzialmente instabile"}.
${stabile ? "Non si osservano inversioni termiche forti." : "Possibili inversioni termiche nei bassi strati al mattino."}`;

  const ventoQuota = `🌬️ Vento e dinamica in quota
Il profilo del vento mostra intensità ${ventiAlti < 10 ? "debole" : ventiAlti < 18 ? "moderata" : "sostenuta"} (${Math.round(ventiAlti)} km/h medi tra 10–14).
${ventiAlti < 15 ? "Questo favorisce buone condizioni di volo libero." : ventiAlti < 22 ? "Condizioni di volo gestibili." : "Vento sostenuto in quota: possibile turbolenza sopra i 2000 m."}`;

  const tabellaOraria = [
    { fascia: "Mattina (8–11)", condizioni: `${tempMattina !== null ? Math.round(tempMattina) : "?"}°C, vento ${descrizioneVentoSuolo(ventoMattina ?? 0)}`, note: "" },
    { fascia: "Pomeriggio (12–17)", condizioni: `${Math.round(tempMaxDay)}°C massima, vento in aumento`, note: `${rischioTemporContinua esattamente da dove mi sono interrotto.

```tsx
    { fascia: "Pomeriggio (12–17)", condizioni: `${Math.round(tempMaxDay)}°C massima, vento in aumento`, note: `${rischioTemporali !== "possibili" ? "Buone condizioni per volo libero" : "Possibili temporali pomeridiani"}` },
    { fascia: "Sera (18–21)", condizioni: `${Math.round(tempMin)}°C minima serale, vento in calo`, note: `Atmosfera stabile` },
  ];

  const conditions: string[] = [];
  if (ventoMax < 18 && nuvolositaMedia < 40 && precipitazioni < 0.5) {
    conditions.push("Condizioni ideali per decolli e veleggiamento: aria asciutta, termiche regolari, vento gestibile.");
  } else if (ventoMax < 22 && precipitazioni < 1) {
    conditions.push("Condizioni generalmente buone per il volo libero, con vento leggermente sostenuto in quota.");
  } else if (ventoMax < 28) {
    conditions.push("Condizioni marginali: vento sostenuto, si consiglia prudenza e quote moderate.");
  } else {
    conditions.push("Condizioni difficili: vento forte, si sconsiglia il volo libero.");
  }

  if (rischioTemporali === "possibili") {
    conditions.push("Attenzione: possibile sviluppo temporalesco pomeridiano, monitorare l'evoluzione.");
  } else {
    conditions.push("Nessun rischio di temporali o pioggia.");
  }

  if (ventoMax > 20) {
    conditions.push(`Attenzione al vento in quota: sopra i 2500 m può essere più sostenuto (raffiche fino a ${Math.round(windGustsMax)} km/h), quindi conviene restare su quote moderate.`);
  }

  return {
    situazioneGenerale,
    profiloTermico,
    ventoQuota,
    tabellaOraria,
    interpretazione: `🪂 Interpretazione per attività outdoor / volo libero\n${conditions.join("\n")}`,
  };
}