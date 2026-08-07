"use client";

import type { HourData } from "@/types/meteo";

export interface AnalisiApprofondita {
  data: string;
  luogo: string;
  lat: number;
  lon: number;
  alt: number;

  tempMax: number;
  tempMin: number;
  tempAttuale: number;
  dewPoint: number;
  umidita: number;
  ventoSuolo: number;
  rafficheSuolo: number;
  ventoDir: number;
  ventoDirNome: string;

  pbl: number;
  thermalIndex: number;
  thermalIndexDesc: string;
  topTermiche: number;
  rateoMedio: number;

  cape: number;
  capeDesc: string;
  liftedIndex: number;
  liDesc: string;
  cin: number;

  gradienteVento: string;
  inversione: string;
  windShear: string;

  visibilita: number;
  radiazione: number;
  uvIndex: number;

  nuvoleMedie: number;
  nuvoleBasse: number;
  nuvoleAlte: number;

  rischioTemporali: number;
  temporaliDesc: string;

  slotMigliori: string;
  valutazione: string;
  punteggio: number;
}

function getWindDirName(deg: number): string {
  if (deg == null) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getThermalIndexDesc(ti: number): string {
  if (ti >= 0) return "assenza di termiche";
  if (ti > -3) return "termiche deboli";
  if (ti > -6) return "termiche moderate";
  if (ti > -9) return "termiche forti";
  return "termiche molto forti";
}

function getCAPEDesc(cape: number): string {
  if (cape < 100) return "molto bassa, atmosfera stabile";
  if (cape < 300) return "bassa, convezione limitata";
  if (cape < 600) return "moderata, buona energia convettiva";
  if (cape < 1000) return "alta, forte convezione possibile";
  return "molto alta, rischio temporali intensi";
}

function getLIDesc(li: number): string {
  if (li > 6) return "fortemente stabile";
  if (li > 3) return "stabile";
  if (li > 0) return "leggermente stabile";
  if (li > -3) return "leggermente instabile";
  if (li > -6) return "instabile";
  return "molto instabile, temporali probabili";
}

function getPBL(pblRaw: number, temp: number, spread: number): number {
  if (pblRaw > 500 && pblRaw < 6000) return Math.round(pblRaw);
  return Math.round(Math.min(5000, Math.max(800, spread * 350 + temp * 50)));
}

function calcolaThermalIndex(omega: number, temp: number, alt: number): number {
  return Math.round((omega * 0.1 - (temp - 15) * 0.3 + alt * 0.001) * 10) / 10;
}

export function calcolaAnalisiApprofondita(
  dayData: HourData[],
  site: { alt: number; lat?: number; lon?: number; name?: string },
  oraCorrente?: number
): AnalisiApprofondita | null {
  if (!dayData || dayData.length < 3) return null;

  const oreValide = dayData.filter(h => {
    const hh = new Date(h.time).getHours();
    return hh >= 8 && hh <= 18;
  });
  if (oreValide.length < 3) return null;

  const oraTarget = oraCorrente ?? 13;
  const hAttuale = oreValide.reduce((best, h) => {
    const hDiff = Math.abs(new Date(h.time).getHours() - oraTarget);
    const bestDiff = Math.abs(new Date(best.time).getHours() - oraTarget);
    return hDiff < bestDiff ? h : best;
  }, oreValide[0]);

  const tempMax = Math.round(Math.max(...oreValide.map(h => h.temperature)));
  const tempMin = Math.round(Math.min(...oreValide.map(h => h.temperature)));
  const tempAttuale = Math.round(hAttuale.temperature);
  const dewPoint = hAttuale.dewPoint ?? (tempAttuale - 10);
  const umidita = Math.round(hAttuale.humidity);

  const ventoSuolo = Math.round(hAttuale.windSpeed);
  const rafficheSuolo = Math.round(hAttuale.windGusts || ventoSuolo * 1.5);
  const ventoDir = Math.round(hAttuale.windDir);

  const pbl = getPBL(hAttuale.freezingLevel || 0, tempAttuale, tempAttuale - dewPoint);

  const omega = Math.max(0, (tempAttuale - dewPoint) * 0.5 - hAttuale.windSpeed * 0.1);
  const thermalIndex = calcolaThermalIndex(omega, tempAttuale, site.alt);
  const thermalIndexDesc = getThermalIndexDesc(thermalIndex);

  const cape = Math.round(Math.max(0, hAttuale.cape || (tempAttuale - dewPoint) * 40));
  const capeDesc = getCAPEDesc(cape);

  const liftedIndex = Math.round((hAttuale.liftedIndex ?? (tempAttuale - dewPoint - 5)) * 100) / 100;
  const liDesc = getLIDesc(liftedIndex);

  const cin = Math.round(Math.max(0, hAttuale.cin || 200 - cape * 0.3));

  const topTermiche = Math.round(Math.max(
    site.alt + 500,
    Math.min(pbl + 500, site.alt + (tempAttuale - dewPoint) * 250 + 500)
  ));

  const rateoMedio = Math.round(Math.min(4.5, Math.max(0.3,
    (tempAttuale - dewPoint) * 0.2 + (pbl > 3000 ? 0.5 : 0) + (thermalIndex < -6 ? 0.5 : 0)
  )) * 10) / 10;

  const ventoSuoloKmh = ventoSuolo;
  const ventoQuota = Math.round(hAttuale.windSpeed * 1.3 + 5);
  let gradienteVento = "debole";
  if (ventoQuota - ventoSuoloKmh > 20) gradienteVento = "moderato";
  if (ventoQuota - ventoSuoloKmh > 35) gradienteVento = "forte";

  const inversione = (tempAttuale - tempMin > 12)
    ? "assente, buon rimescolamento"
    : (tempAttuale - tempMin > 8)
      ? "debole, non penalizza le termiche"
      : "presente, possibile capping";

  const windShear = (rafficheSuolo - ventoSuolo < 8)
    ? "debole, termiche stabili"
    : (rafficheSuolo - ventoSuolo < 15)
      ? "moderato, termiche irregolari"
      : "forte, termiche turbolente";

  const nuvoleMedie = Math.round(
    oreValide.reduce((s, h) => s + (h.cloudCoverMid || h.cloudCover * 0.3), 0) / oreValide.length
  );
  const nuvoleBasse = Math.round(
    oreValide.reduce((s, h) => s + (h.cloudCoverLow || h.cloudCover * 0.4), 0) / oreValide.length
  );
  const nuvoleAlte = Math.round(
    oreValide.reduce((s, h) => s + (h.cloudCoverHigh || h.cloudCover * 0.3), 0) / oreValide.length
  );

  const visibilita = Math.round((hAttuale.visibility || 20000) / 1000);
  const radiazione = Math.round(Math.max(0, hAttuale.radiation ?? 500));
  const uvIndex = Math.round(hAttuale.uvIndex ?? 5);

  const pioggiaTot = oreValide.reduce((s, h) => s + (h.precipitation || 0), 0);
  const oreTemporale = oreValide.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
  let rischioTemporali = 2;
  let temporaliDesc = "nessun rischio";

  if (oreTemporale > 0) {
    rischioTemporali = 85;
    temporaliDesc = "temporali in atto!";
  } else if (pioggiaTot > 3) {
    rischioTemporali = 45;
    temporaliDesc = "possibili rovesci pomeridiani";
  } else if (cape > 600 && liftedIndex < -2) {
    rischioTemporali = 35;
    temporaliDesc = "rischio isolato, da monitorare";
  } else if (cape > 1000) {
    rischioTemporali = 55;
    temporaliDesc = "rischio moderato: energia convettiva elevata";
  }

  let slotMigliori = "11:00 - 16:00";
  if (topTermiche > 3500 && rateoMedio > 2) {
    slotMigliori = "10:30 - 16:30 (termiche forti e regolari)";
  } else if (rateoMedio < 1) {
    slotMigliori = "12:00 - 15:00 (finestra limitata)";
  }

  let punteggio = 50;
  if (thermalIndex < -6) punteggio += 20;
  else if (thermalIndex < -3) punteggio += 10;
  else if (thermalIndex >= 0) punteggio -= 20;

  if (cape >= 300 && cape <= 800) punteggio += 10;
  else if (cape < 100) punteggio -= 10;
  else if (cape > 1000) punteggio -= 10;

  if (ventoSuolo >= 3 && ventoSuolo <= 15) punteggio += 10;
  else if (ventoSuolo < 1) punteggio -= 5;
  else if (ventoSuolo > 22) punteggio -= 15;

  if (nuvoleMedie + nuvoleBasse + nuvoleAlte >= 15 && nuvoleMedie + nuvoleBasse + nuvoleAlte <= 50) punteggio += 10;
  else if (nuvoleMedie + nuvoleBasse + nuvoleAlte > 70) punteggio -= 15;

  if (visibilita > 30) punteggio += 5;
  if (topTermiche > 3000) punteggio += 10;

  let valutazione = "";
  if (punteggio >= 80) {
    valutazione = "Condizioni eccellenti per il volo termico secco. Termiche forti e regolari, vento gestibile, visibilità ottima, assenza di rischi. Giornata da cross classico.";
  } else if (punteggio >= 60) {
    valutazione = "Buone condizioni di volo. Termiche moderate-forti, vento nei limiti. Possibili alcune limitazioni (nuvole o vento in quota).";
  } else if (punteggio >= 40) {
    valutazione = "Condizioni discrete. Termiche presenti ma non ottimali. Valutare con attenzione le ore migliori e le zone di convergenza.";
  } else if (punteggio >= 20) {
    valutazione = "Condizioni difficili. Termiche deboli o vento sfavorevole. Consigliata prudenza e valutazione in loco.";
  } else {
    valutazione = "Condizioni non favorevoli. Forti limitazioni: vento eccessivo, assenza di termiche o rischio temporali. Si sconsiglia il volo.";
  }

  return {
    data: dayData[0]?.time?.toLocaleDateString("it-IT", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }) || "N/D",
    luogo: site.name || "Decollo",
    lat: site.lat || 0,
    lon: site.lon || 0,
    alt: site.alt,

    tempMax,
    tempMin,
    tempAttuale,
    dewPoint,
    umidita,
    ventoSuolo,
    rafficheSuolo,
    ventoDir,
    ventoDirNome: getWindDirName(ventoDir),

    pbl,
    thermalIndex,
    thermalIndexDesc,
    topTermiche,
    rateoMedio,

    cape,
    capeDesc,
    liftedIndex,
    liDesc,
    cin,

    gradienteVento,
    inversione,
    windShear,

    visibilita,
    radiazione,
    uvIndex,

    nuvoleMedie,
    nuvoleBasse,
    nuvoleAlte,

    rischioTemporali,
    temporaliDesc,

    slotMigliori,
    valutazione,
    punteggio,
  };
}