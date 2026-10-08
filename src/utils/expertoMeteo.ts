"use client";

/**
 * ALGORITMO ESPERTO METEO PARAPENDIO
 * Simula un pilota di 30 anni di esperienza che legge le condizioni
 * prima di decollare ogni mattina.
 */

import type { HourData } from "@/types/meteo";
import { calcCloudBase } from "@/utils/calcCloudBase";
import { confrontaClima } from "@/utils/climatologia";
import { circularMeanWindDirection } from "@/utils/windDirection";

// ─── TIPOLOGIE DI VOLO ───────────────────────────────────────────────────────

export type TipoVolo = "termico" | "dinamico_cresta" | "cross_country" | "libero" | "niente";

export interface EsitoEsperto {
  // Voto complessivo 1-10 (10 = perfetto)
  voto: number;
  label: string;             // "Volo ideale", "Buono", "Impegnativo", "Sconsigliato", "Pericoloso"
  tipoVolo: TipoVolo;
  // Sottotitolo: cosa fare concretamente oggi
  raccomandazione: string;
  // Quale momento della giornata è migliore
  momentoIdeale: string;
  // Finestra di volo (ore ottimali)
  finestraVolo: string;
  oreFavorabili: number;
  // Venti al decollo per ogni ora chiave
  ventoOreChiave: { ora: number; vento: number; direzione: string; giudizio: string }[];
  // Rischio temporali 0-100%
  rischioTemporale: number;
  // Venti nei vari strati
  ventoSuolo: number;
  vento850hPa: number | null;
  windSheer: number;        // delta km/h tra 850hPa e 10m
  waveIndex: number;        // differenza direzione 10m vs 850hPa (0-180°)
  waveAttivo: boolean;
  // Rischio rotore (vento di valle contrario)
  rischioRotore: number;    // 0-100
  // Base cumuli
  baseCumuli: number;
  topTermico: number;
  // Stabilità
  liStabilita: string;      // "stabile", "moderata", "instabile", "estremamente instabile"
  capeDescrizione: string;
  // Climatologia
  anomalieClima: string[];
  // Factori di rischio pesanti
  fattoriRischio: { nome: string; livello: "basso" | "medio" | "alto" | "critico"; dettaglio: string }[];
}

function getDirBreve(deg: number): string {
  const dirs = ["N","NE","E","SE","S","SO","O","NO"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function calcWaveIndexVento(dirSuolo: number, dir850: number): number {
  let diff = Math.abs(dir850 - dirSuolo);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * ALGORITMO PRINCIPALE — Valuta una giornata di volo come farebbe
 * un pilota senior che ha volato 30 anni nelle Alpi Occidentali.
 */
export function valutaGiornataVolo(
  dayData: HourData[],
  site: { alt: number; name?: string; orientation?: string },
  currentData: { temperature: number; dewPoint: number; cloudCover: number; windSpeed: number; windDir: number; cape: number; liftedIndex: number; cin: number }
): EsitoEsperto {
  const { alt: siteAlt, orientation } = site;
  const t = currentData.temperature;
  const dew = currentData.dewPoint;
  const spread = Math.max(0.5, t - dew);

  // ── Calcoli base ──
  const cloudBase = calcCloudBase(siteAlt, t, dew);
  const validCape = dayData.length > 0 ? dayData.filter(h => h.cape != null).map(h => h.cape!) : [];
  const validLi = dayData.length > 0 ? dayData.filter(h => h.liftedIndex != null).map(h => h.liftedIndex!) : [];
  const avgCape = validCape.length > 0 ? validCape.reduce((s, h) => s + h, 0) / validCape.length : null;
  const avgLi = validLi.length > 0 ? validLi.reduce((s, h) => s + h, 0) / validLi.length : null;
  const avgSpread = dayData.length > 0 ? dayData.reduce((s, h) => s + Math.max(0.5, (h.temperature ?? t) - (h.dewPoint ?? dew)), 0) / dayData.length : spread;

  // Rateo termico stimato — ESTIMATED / EMPIRICO, NON misura reale
  const rateoTermico = avgCape != null
    ? Math.min(4.0, Math.max(0.3, avgSpread * 0.25 + avgCape * 0.001))
    : Math.min(4.0, Math.max(0.3, avgSpread * 0.25));

  // Top termico — STIMA empirica, NON dato osservato
  const thermalTop = avgCape != null
    ? Math.round(Math.min(4000, cloudBase + Math.min(800, rateoTermico * 100 + avgCape * 0.1)))
    : Math.round(cloudBase + 400);

  // Wind layers
  const midData = dayData.slice(8, 16);
  const valid850 = midData.filter(h => h.windSpeed850 != null);
  const avgWind850 = valid850.length > 0
    ? valid850.reduce((s, h) => s + (h.windSpeed850 ?? 0), 0) / valid850.length
    : null;
  const avgDir850 = valid850.length > 0
    ? circularMeanWindDirection(valid850.map(h => h.windDir850 ?? 0).filter(d => d > 0))
    : null;

  const windSheer = avgWind850 != null ? Math.round(avgWind850 - currentData.windSpeed) : 0;
  const waveIdx = calcWaveIndexVento(currentData.windDir, avgDir850 ?? currentData.windDir);
  const waveAttivo = waveIdx < 45 && (avgWind850 ?? 0) > 15;

  // ── Finestra di volo ──
  const flightHours = dayData.filter(h => {
    const ht = h.temperature ?? t;
    const hd = h.dewPoint ?? dew;
    const hSpread = Math.max(0.5, ht - hd);
    return hSpread > 4 && (h.cape ?? null) < 600 && (h.precipitationProba ?? null) < 30 && (h.cloudCover ?? null) < 85;
  }).length;

  const windowStart = dayData.findIndex(h => (h.temperature ?? t) - (h.dewPoint ?? dew) > 4);
  const reversedEnd = [...dayData].reverse().findIndex(h => (h.temperature ?? t) - (h.dewPoint ?? dew) > 4);
  const windowEnd = dayData.length - 1 - reversedEnd;
  const flightWindow = windowStart >= 0 && windowEnd > windowStart
    ? `${String(dayData[windowStart]?.time?.getHours() ?? 8).padStart(2,"0")}:00 – ${String(dayData[Math.min(windowEnd, dayData.length-1)]?.time?.getHours() ?? 17).padStart(2,"0")}:00`
    : "—";

  // ── Rischio temporali ──
  const thunderProb = avgCape != null && avgLi != null
    ? (avgCape > 1200 && avgLi < -4 ? 80
      : avgCape > 900 && avgLi < -3 ? 60
      : avgCape > 600 && avgLi < -2 ? 40
      : avgCape > 400 ? 20
      : 5)
    : 5;

  // ── Rischio rotore ──
  // In valli esposte S/S-SE il rotore è massimo quando c'è vento da Ovest/Nord-Ovest
  const orientEsposizione = orientation?.toUpperCase() ?? "S";
  const isSWSite = orientEsposizione.includes("SO") || orientEsposizione.includes("SW");
  const windFromWest = currentData.windDir >= 245 && currentData.windDir <= 315;
  const rischioRotore = (isSWSite || windFromWest) && currentData.windSpeed > 20 ? 60
    : windFromWest && currentData.windSpeed > 15 ? 40
    : windFromWest ? 20
    : 5;

  // ── Momento migliore ──
  let momentoIdeale = "Mattina presto (08-10)";
  let tipoVolo: TipoVolo = "niente";
  let label = "Sconsigliato";

  if (thunderProb > 40) {
    tipoVolo = "niente";
    label = "PERICOLOSO";
    momentoIdeale = "Non volare — rischio temporali";
  } else if (currentData.windSpeed > 25 || avgWind850 != null && avgWind850 > 40) {
    tipoVolo = isSWSite ? "dinamico_cresta" : "niente";
    label = "VENTOSO";
    momentoIdeale = "Solo dynamic di cresta al mattino se sei esperto";
  } else if (avgCape > 600 && avgLi < -2 && flightHours > 6) {
    tipoVolo = "cross_country";
    label = "ECCEZIONALE";
    momentoIdeale = "10:00-14:00 — termiche vigorose, cross-country disponibile";
  } else if (flightHours > 8 && avgSpread > 5 && currentData.windSpeed <= 18) {
    tipoVolo = "termico";
    label = "MOLTO BUONO";
    momentoIdeale = "09:30-13:00 — termiche ben organizzate";
  } else if (flightHours > 4 && avgSpread > 4) {
    tipoVolo = "libero";
    label = "BUONO";
    momentoIdeale = "09:00-15:00 — volo locale possibile";
  } else if (waveAttivo || currentData.windSpeed > 15) {
    tipoVolo = "dinamico_cresta";
    label = "DINAMICO";
    momentoIdeale = "Mattina: dinamiche di cresta / onda";
  } else if (flightHours > 2) {
    tipoVolo = "libero";
    label = "REGOLARE";
    momentoIdeale = `Periodo migliore: ${flightWindow}`;
  } else {
    tipoVolo = "niente";
    label = "SCARSO";
    momentoIdeale = "Poche ore volabili — valutare la sera";
  }

  // ── Voto finale (1-10) ──
  let voto = 5;
  if (thunderProb > 40) voto = 1;
  else if (currentData.windSpeed > 30 || avgWind850 != null && avgWind850 > 45) voto = 2;
  else if (tipoVolo === "niente") voto = 1;
  else if (tipoVolo === "dinamico_cresta") voto = 5;
  else if (tipoVolo === "libero") voto = 7;
  else if (tipoVolo === "termico") voto = 8;
  else if (tipoVolo === "cross_country") voto = 10;

  // Penalizzazioni
  if (thunderProb > 60) voto = Math.min(voto, 3);
  if (avgCape > 1500) voto = Math.min(voto, 4);
  if (cloudBase < siteAlt + 200) voto = Math.min(voto, 3);
  if (currentData.windSpeed > 25) voto = Math.min(voto, 4);
  if (rischioRotore > 50) voto = Math.min(voto, 3);

  // ── Climatologia ──
  const tempMax = Math.max(...dayData.map(h => h.temperature ?? 0));
  const tempMin = Math.min(...dayData.map(h => h.temperature ?? 0));
  const ventoMedio = dayData.length > 0 ? dayData.reduce((s,h)=>s+(h.windSpeed??0),0)/dayData.length : 0;
  const pioggiaTotale = dayData.reduce((s,h)=>s+(h.precipitation??0),0);
  const anomalie = confrontaClima(tempMax, tempMin, ventoMedio, pioggiaTotale, tempMax-tempMin);
  const anomalieClima = anomalie.map(a => `${a.etichetta}: ${a.descrizione} (atteso ${a.atteso})`);

  // ── Fattori di rischio ──
  const fattoriRischio: EsitoEsperto["fattoriRischio"] = [];

  if (thunderProb > 40) {
    fattoriRischio.push({ nome: "⚡ Temporali", livello: "critico", dettaglio: `CAPE ${Math.round(avgCape)} J/kg + LI ${avgLi.toFixed(1)}: sviluppo cumulonimbus probabile entro le ${thunderProb > 60 ? "14:00" : "16:00"}. Non volare in quota dopo lo sviluppo.` });
  }
  if (rischioRotore > 40) {
    fattoriRischio.push({ nome: "🌀 Rotore", livello: "alto", dettaglio: `Vento da Ovest/Nord-Ovest (${getDirBreve(currentData.windDir)}) su ${orientation}: rischio turbolenza rotazionale sul versante sottovento. Pericoloso in decollo.` });
  }
  if (windSheer > 15) {
    fattoriRischio.push({ nome: "💨 Wind shear", livello: windSheer > 25 ? "alto" : "medio", dettaglio: `Vento aumenta di ${windSheer} km/h salendo dal suolo ai 2000m. Attenzione alla transizione tra gli strati.` });
  }
  if (cloudBase < siteAlt + 200) {
    fattoriRischio.push({ nome: "🌫️ Nuvole basse", livello: "alto", dettaglio: `Base cumuli a ${Math.round(cloudBase)}m — appena ${Math.max(0, Math.round(cloudBase - siteAlt))}m sopra il campo. Visibilità ridotta al decollo.` });
  }
  if (avgLi < -4) {
    fattoriRischio.push({ nome: "🔥 Instabilità estrema", livello: "alto", dettaglio: `Lifted Index ${avgLi.toFixed(1)}: forte instabilità convettiva. Termiche violente ma rischio sviluppo temporali.` });
  }
  if (currentData.cin > 400) {
    fattoriRischio.push({ nome: "🪨 CIN alta", livello: "medio", dettaglio: `Inibizione convettiva ${Math.round(currentData.cin)} J/kg: le termiche inizieranno tardi. Aspetta che il suolo si riscaldi (10:30+).` });
  }

  // ── Momento ideale basato su CIN ──
  const cinVal = currentData.cin;
  if (cinVal > 300) {
    momentoIdeale = "Primo volo: ~11:00 (CIN impedisce le termiche al mattino)";
  }

  // ── Fattori di rischio: se non ci sono, buon segno ──
  if (fattoriRischio.length === 0 && flightHours > 4) {
    fattoriRischio.push({ nome: "✓ Nessun rischio", livello: "basso", dettaglio: "Condizioni favorevoli — volare con prudenza standard." });
  }

  // ── Vento ore chiave ──
  const ventoOreChiave = [10, 12, 14, 16].map(ora => {
    const h = dayData.find(x => {
      const hr = x.time instanceof Date ? x.time.getHours() : new Date(x.time).getHours();
      return hr === ora;
    });
    const v = h?.windSpeed ?? currentData.windSpeed;
    const d = h?.windDir ?? currentData.windDir;
    const giudizio = v > 25 ? "Pericoloso" : v > 18 ? "Impegnativo" : v > 10 ? "Buono" : "Calmo";
    return { ora, vento: Math.round(v), direzione: getDirBreve(d), giudizio };
  });

  // ── LI descrizione ──
  const liStabilita = avgLi < -4 ? "estremamente instabile"
    : avgLi < -2 ? "instabile"
    : avgLi < 0 ? "moderatamente instabile"
    : "stabile";

  // ── CAPE descrizione ──
  const capeDescrizione = avgCape > 1000 ? "molto alto — temporali probabili"
    : avgCape > 500 ? "elevato — forte instabilità"
    : avgCape > 200 ? "moderato — buone termiche"
    : "basso — cielo probabilmente stabile";

  // ── Raccomandazione finale ──
  let raccomandazione = "";
  switch (tipoVolo) {
    case "cross_country":
      raccomandazione = "Giornata eccezionale: termiche forti, vento sotto controllo, cielo pulito. Cross-country fino al confine francese! Attenzione al ritorno in quota.";
      break;
    case "termico":
      raccomandazione = "Termiche ben organizzate: vola in quota con prudenza. Meglio uscire entro le 14:00 prima dell'instabilità pomeridiana.";
      break;
    case "libero":
      raccomandazione = "Volo locale nel periodo migliore. Valuta se le termiche ti portano alla base prima del tramonto.";
      break;
    case "dinamico_cresta":
      raccomandazione = "Solo dynamic di cresta: le termiche sono deboli o assenti. Scegli la cresta esposta al sole e prova l'onda se presente.";
      break;
    case "niente":
      raccomandazione = "NON VOLARE: condizioni non adeguate. Rimani a terra e pianifica la prossima uscita.";
      break;
  }
  if (thunderProb > 40) raccomandazione = "PERICOLO: rischio temporali elevato. Se decolli, limitati a volate corte e a bassa quota. Meglio non decollare.";
  if (rischioRotore > 50) raccomandazione += " ⚠️ Rischio rotore: tieni sempre la cresta e non andare nella zona sottovento.";

  return {
    voto: Math.max(1, Math.min(10, Math.round(voto))),
    label,
    tipoVolo,
    raccomandazione,
    momentoIdeale,
    finestraVolo: flightWindow,
    oreFavorabili: flightHours,
    ventoOreChiave,
    rischioTemporale: thunderProb,
    ventoSuolo: currentData.windSpeed,
    vento850hPa: avgWind850,
    windSheer,
    waveIndex: waveIdx,
    waveAttivo,
    rischioRotore,
    baseCumuli: Math.round(cloudBase),
    topTermico: thermalTop,
    liStabilita,
    capeDescrizione,
    anomalieClima,
    fattoriRischio,
  };
}
