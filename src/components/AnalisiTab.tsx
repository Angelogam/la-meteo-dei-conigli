"use client";

import React, { useMemo } from "react";
import { Sun, Calendar } from "lucide-react";
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent } from "@/services/openMeteoService";
import { calcolaTermiche } from "@/utils/termiche";
import { calcCloudBase } from "@/utils/calcCloudBase";

interface AnalisiTabProps {
  currentData: HourData | MeteoCurrent | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return day + "/" + month + "/" + year;
}

function getWindDirName(deg: number): string {
  if (deg == null) return "\u2014";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default function AnalisiTab({ currentData, dayData, site }: AnalisiTabProps) {
  const analisi = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    const alt = site?.alt ?? 1000;
    const oreGiorno = dayData.filter((h) => {
      const hh = h.time.getHours();
      return hh >= 8 && hh <= 19;
    });
    if (oreGiorno.length < 3) return null;

    const withTemp = oreGiorno.filter(h => h.temperature != null);
    const tempMax = withTemp.length > 0 ? Math.max(...withTemp.map((h) => h.temperature!)) : null;
    const tempMedia = withTemp.length > 0 ? withTemp.reduce((s, h) => s + h.temperature!, 0) / withTemp.length : null;
    const withWind = oreGiorno.filter(h => h.windSpeed != null);
    const windMedia = withWind.length > 0 ? withWind.reduce((s, h) => s + h.windSpeed!, 0) / withWind.length : null;
    const windMax = withWind.length > 0 ? Math.max(...withWind.map((h) => h.windSpeed!)) : null;
    const windGustsMax = Math.max(...oreGiorno.map((h) => h.windGusts || 0));
    const withCloud = oreGiorno.filter(h => h.cloudCover != null);
    const cloudMedia = withCloud.length > 0 ? withCloud.reduce((s, h) => s + h.cloudCover!, 0) / withCloud.length : null;
    const withHum = oreGiorno.filter(h => h.humidity != null);
    const humidityMedia = withHum.length > 0 ? withHum.reduce((s, h) => s + h.humidity!, 0) / withHum.length : null;
    const precipTot = oreGiorno.reduce((s, h) => s + (h.precipitation ?? 0), 0);
    const withPressure = oreGiorno.filter(h => h.pressure != null);
    const pressureMed = withPressure.length > 0 ? withPressure.reduce((s, h) => s + h.pressure!, 0) / withPressure.length : null;
    const withDew = oreGiorno.filter(h => h.dewPoint != null);
    const dewMedia = withDew.length > 0 ? withDew.reduce((s, h) => s + h.dewPoint!, 0) / withDew.length : null;
    const uvMedia = oreGiorno.reduce((s, h) => s + (h.uvIndex || 0), 0) / oreGiorno.length;

    const termichePerOra = oreGiorno
      .map((h) => {
        const t = calcolaTermiche(h, alt);
        if (!t) return null;
        return { rateo: t.rateo, base: t.base, ora: h.time.getHours() };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);
    const rateoMedio = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
    const rateoMax = Math.max(...termichePerOra.map((t) => t.rateo));
    const oreAttive = termichePerOra.filter((t) => t.rateo >= 0.3).length;
    const mediaSpread = (tempMedia != null && dewMedia != null) ? tempMedia - dewMedia : null;
    const baseLCL = (tempMedia != null && dewMedia != null) ? calcCloudBase(1400, tempMedia, dewMedia) : null;

    const dirs = oreGiorno.map((h) => h.windDir).filter((d) => d != null);
    const dirCount: Record<number, number> = {};
    for (const d of dirs) {
      const rounded = Math.round(d / 45) * 45;
      dirCount[rounded] = (dirCount[rounded] || 0) + 1;
    }
    const dirEntries = Object.entries(dirCount);
    dirEntries.sort((a, b) => b[1] - a[1]);
    const dirDom = dirEntries[0]?.[0];
    const dirDomNum = dirDom ? parseInt(dirDom) : (currentData?.windDir ?? 0);
    const dirName = getWindDirName(dirDomNum);

    const zeroTermico = tempMedia != null ? Math.max(0, Math.round(alt + (tempMedia / 0.0098) + 200)) : null;
    const tempMin = Math.min(...oreGiorno.map((h) => h.temperature));
    const deltaTermico = Math.round((tempMax - tempMin) * 10) / 10;

    const gradienteReale = 0.98;
    let forzaTermica = 0;
    if (gradienteReale >= 1.2) { forzaTermica += 3; }
    else if (gradienteReale >= 0.98) { forzaTermica += 2; }
    else if (gradienteReale >= 0.7) { forzaTermica += 1; }
    if (windMedia >= 5 && windMedia <= 15) { forzaTermica += 2; }
    else if (windMedia >= 3 && windMedia < 5) { forzaTermica += 1.5; }
    else if (windMedia > 15 && windMedia <= 22) { forzaTermica += 1; }
    if (cloudMedia >= 15 && cloudMedia <= 45) { forzaTermica += 2; }
    else if (cloudMedia >= 5 && cloudMedia < 15) { forzaTermica += 1.5; }
    if (humidityMedia >= 30 && humidityMedia <= 50) { forzaTermica += 1.5; }
    else if (humidityMedia > 50 && humidityMedia <= 65) { forzaTermica += 1; }
    forzaTermica = Math.min(10, Math.max(0, Math.round(forzaTermica * 10) / 10));

    const rafficaMedia = oreGiorno.reduce((s, h) => s + (h.windGusts || h.windSpeed * 1.4), 0) / oreGiorno.length;
    let turbolenza = "Assente";
    if (rafficaMedia > 30) { turbolenza = "Forte"; }
    else if (rafficaMedia > 22) { turbolenza = "Moderata"; }
    else if (rafficaMedia > 14) { turbolenza = "Leggera"; }

    let score = 5;
    if (windMedia >= 5 && windMedia <= 12) { score += 2; }
    else if (windMedia > 18) { score -= 1; }
    if (precipTot === 0) { score += 2; }
    else if (precipTot < 0.5) { score += 1; }
    if (cloudMedia >= 10 && cloudMedia <= 55) { score += 1; }
    if (rateoMedio >= 2) { score += 2; }
    else if (rateoMedio >= 1) { score += 1; }
    if (windMax > 30) { score -= 1; }
    score = Math.max(0, Math.min(10, score));

    let scoreEmoji = "❌";
    if (score >= 8) { scoreEmoji = "🪂🔥"; }
    else if (score >= 6) { scoreEmoji = "🪂"; }
    else if (score >= 4) { scoreEmoji = "🌤️"; }

    let descVolo: string;
    if (score >= 8) {
      descVolo = "Condizioni eccellenti. Termiche robuste, vento ideale.";
    } else if (score >= 6) {
      descVolo = "Buone condizioni. Qualche limite ma nel complesso si vola bene.";
    } else if (score >= 4) {
      descVolo = "Condizioni discrete. Volo possibile ma con attenzione.";
    } else {
      descVolo = "Condizioni difficili. Sconsigliato ai piloti meno esperti.";
    }

    return {
      tempMax: Math.round(tempMax),
      tempMedia: Math.round(tempMedia),
      windMedia: Math.round(windMedia),
      windMax: Math.round(windMax),
      windGustsMax: Math.round(windGustsMax),
      cloudMedia: Math.round(cloudMedia),
      humidityMedia: Math.round(humidityMedia),
      precipTot: Math.round(precipTot * 10) / 10,
      pressureMed: Math.round(pressureMed),
      uvMedia: Math.round(uvMedia * 10) / 10,
      rateoMedio: Math.round(rateoMedio * 10) / 10,
      rateoMax: Math.round(rateoMax * 10) / 10,
      oreAttive: oreAttive,
      baseLCL: baseLCL,
      zeroTermico: zeroTermico,
      deltaTermico: deltaTermico,
      gradienteReale: Math.round(gradienteReale * 100) / 100,
      forzaTermica: forzaTermica,
      turbolenza: turbolenza,
      dirDom: dirDomNum,
      dirName: dirName,
      score: score,
      scoreEmoji: scoreEmoji,
      descVolo: descVolo,
      totaleOre: termichePerOra.length,
    };
  }, [dayData, currentData, site]);

  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) {
      return formatDateShort(new Date(dayData[0].time));
    }
    return formatDateShort(new Date());
  }, [dayData]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l'analisi.
      </div>
    );
  }

  let scoreColor = "text-red-400";
  if (analisi.score >= 8) { scoreColor = "text-emerald-400"; }
  else if (analisi.score >= 6) { scoreColor = "text-lime-400"; }
  else if (analisi.score >= 4) { scoreColor = "text-amber-400"; }

  let scoreBg = "bg-red-900/30 border-red-500/30";
  if (analisi.score >= 8) { scoreBg = "bg-emerald-900/30 border-emerald-500/30"; }
  else if (analisi.score >= 6) { scoreBg = "bg-lime-900/30 border-lime-500/30"; }
  else if (analisi.score >= 4) { scoreBg = "bg-amber-900/30 border-amber-500/30"; }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-slate-800/60 border border-slate-600/50 px-4 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4 text-slate-400" />
          {dataGiorno}
        </span>
      </div>
      <div className={"rounded-2xl border-2 p-5 " + scoreBg}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{analisi.scoreEmoji}</span>
            <div>
              <div className="text-lg font-bold text-white">
                Giudizio volo: <span className={scoreColor}>{analisi.score}/10</span>
              </div>
              <p className="text-sm text-slate-300 mt-1">{analisi.descVolo}</p>
            </div>
          </div>
          <div className="w-16 h-16 shrink-0 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray={(analisi.score / 10) * 100 + " 100"}
                strokeLinecap="round" className={scoreColor}
              />
            </svg>
            <span className={"absolute inset-0 flex items-center justify-center text-sm font-bold " + scoreColor}>
              {analisi.score}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { l: "Temp media", v: analisi.tempMedia + "\u00b0C", c: "text-amber-300" },
            { l: "Vento medio", v: analisi.windMedia + " km/h", c: "text-sky-300" },
            { l: "Termiche", v: analisi.rateoMedio + " m/s", c: "text-orange-300" },
            { l: "Max termiche", v: analisi.rateoMax + " m/s", c: "text-red-300" },
            { l: "Ore attive", v: analisi.oreAttive + "/" + analisi.totaleOre, c: "text-emerald-300" },
            { l: "Base nuvole", v: analisi.baseLCL + "m", c: "text-purple-300" },
            { l: "Zero termico", v: analisi.zeroTermico + "m", c: "text-cyan-300" },
            { l: "Pressione", v: analisi.pressureMed + " hPa", c: "text-slate-200" },
            { l: "Direzione", v: analisi.dirName, c: "text-blue-300" },
          ].map((item) => (
            <div key={item.l} className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400">{item.l}</div>
              <div className={"text-lg font-bold " + item.c}>{item.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">&bull;</span>Delta termico: {analisi.deltaTermico}\u00b0C · Gradiente: {analisi.gradienteReale}\u00b0C/100m · Forza termica: {analisi.forzaTermica}/10</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span>Turbolenza: {analisi.turbolenza} · Direzione: {analisi.dirName} ({analisi.dirDom}\u00b0) · UV: {analisi.uvMedia}</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span>Umidit\u00e0: {analisi.humidityMedia}% · Pioggia: {analisi.precipTot}mm · Nuvole: {analisi.cloudMedia}%</p>
        </div>
      </div>
    </div>
  );
}