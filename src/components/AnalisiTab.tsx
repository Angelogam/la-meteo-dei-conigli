</dyad-delete>

<dyad-write path="src/components/AnalisiTab.tsx">
"use client";

import React, { useMemo } from "react";
import { Sun, Wind, Thermometer, Cloud, Droplets, Gauge, TrendingUp, ArrowUp, Calendar } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface AnalisiTabProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
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
    const oreGiorno = dayData.filter(h => { const hh = h.time.getHours(); return hh >= 8 && hh <= 19; });
    if (oreGiorno.length < 3) return null;

    const tempMax = Math.max(...oreGiorno.map(h => h.temperature));
    const tempMedia = oreGiorno.reduce((s, h) => s + h.temperature, 0) / oreGiorno.length;
    const windMedia = oreGiorno.reduce((s, h) => s + h.windSpeed, 0) / oreGiorno.length;
    const windMax = Math.max(...oreGiorno.map(h => h.windSpeed));
    const windGustsMax = Math.max(...oreGiorno.map(h => h.windGusts || 0));
    const cloudMedia = oreGiorno.reduce((s, h) => s + h.cloudCover, 0) / oreGiorno.length;
    const humidityMedia = oreGiorno.reduce((s, h) => s + h.humidity, 0) / oreGiorno.length;
    const precipTot = oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0);
    const pressureMed = oreGiorno.reduce((s, h) => s + h.pressure, 0) / oreGiorno.length;
    const dewMedia = oreGiorno.reduce((s, h) => s + h.dewPoint, 0) / oreGiorno.length;
    const uvMedia = oreGiorno.reduce((s, h) => s + (h.uvIndex || 0), 0) / oreGiorno.length;

    const termichePerOra = oreGiorno.map(h => ({ ...calcolaTermiche(h, alt), ora: h.time.getHours() }));
    const rateoMedio = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
    const rateoMax = Math.max(...termichePerOra.map(t => t.rateo));
    const oreAttive = termichePerOra.filter(t => t.rateo >= 0.3).length;
    const mediaSpread = tempMedia - dewMedia;
    const baseLCL = Math.max(200, Math.min(3000, Math.round(mediaSpread * 125)));

    const dirs = oreGiorno.map(h => h.windDir).filter(d => d != null);
    const dirCount: Record<number, number> = {};
    for (const d of dirs) dirCount[Math.round(d / 45) * 45] = (dirCount[Math.round(d / 45) * 45] || 0) + 1;
    const dirDom = Object.entries(dirCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const dirDomNum = dirDom ? parseInt(dirDom) : (currentData?.windDir ?? 0);

    const zeroTermico = Math.max(0, Math.round(alt + (tempMedia / 0.0098) + 200));
    const tempMin = Math.min(...oreGiorno.map(h => h.temperature));
    const deltaTermico = Math.round((tempMax - tempMin) * 10) / 10;

    let gradienteReale = 0.98;
    if (currentData?.temp80m != null) gradienteReale = ((currentData.temperature - currentData.temp80m) / 78) * 100;
    else if (currentData?.temp120m != null) gradienteReale = ((currentData.temperature - currentData.temp120m) / 118) * 100;

    let forzaTermica = 0;
    if (gradienteReale >= 1.2) forzaTermica += 3; else if (gradienteReale >= 0.98) forzaTermica += 2; else if (gradienteReale >= 0.7) forzaTermica += 1;
    if (windMedia >= 5 && windMedia <= 15) forzaTermica += 2; else if (windMedia >= 3 && windMedia < 5) forzaTermica += 1.5; else if (windMedia > 15 && windMedia <= 22) forzaTermica += 1;
    if (cloudMedia >= 15 && cloudMedia <= 45) forzaTermica += 2; else if (cloudMedia >= 5 && cloudMedia < 15) forzaTermica += 1.5;
    if (humidityMedia >= 30 && humidityMedia <= 50) forzaTermica += 1.5; else if (humidityMedia > 50 && humidityMedia <= 65) forzaTermica += 1;
    forzaTermica = Math.min(10, Math.max(0, Math.round(forzaTermica * 10) / 10));

    const rafficaMedia = oreGiorno.reduce((s, h) => s + (h.windGusts || h.windSpeed * 1.4), 0) / oreGiorno.length;
    const turbolenza = rafficaMedia > 30 ? "Forte" : rafficaMedia > 22 ? "Moderata" : rafficaMedia > 14 ? "Leggera" : "Assente";

    let score = 5;
    if (windMedia >= 5 && windMedia <= 12) score += 2; else if (windMedia > 18) score -= 1;
    if (precipTot === 0) score += 2; else if (precipTot < 0.5) score += 1;
    if (cloudMedia >= 10 && cloudMedia <= 55) score += 1;
    if (rateoMedio >= 2) score += 2; else if (rateoMedio >= 1) score += 1;
    if (windMax > 30) score -= 1;
    score = Math.max(0, Math.min(10, score));

    const scoreEmoji = score >= 8 ? "🪂🔥" : score >= 6 ? "🪂" : score >= 4 ? "🌤️" : "❌";

    let descVolo: string;
    if (score >= 8) descVolo = "Condizioni eccellenti per il volo libero. Termiche robuste, vento ideale e cielo favorevole.";
    else if (score >= 6) descVolo = "Buone condizioni per il volo. Qualche limite ma nel complesso si vola bene.";
    else if (score >= 4) descVolo = "Condizioni discrete. Volo possibile ma con qualche attenzione in più.";
    else descVolo = "Condizioni difficili. Sconsigliato ai piloti meno esperti.";

    return { tempMax: Math.round(tempMax), tempMedia: Math.round(tempMedia), windMedia: Math.round(windMedia), windMax: Math.round(windMax), windGustsMax: Math.round(windGustsMax), cloudMedia: Math.round(cloudMedia), humidityMedia: Math.round(humidityMedia), precipTot: Math.round(precipTot * 10) / 10, pressureMed: Math.round(pressureMed), uvMedia: Math.round(uvMedia * 10) / 10, rateoMedio: Math.round(rateoMedio * 10) / 10, rateoMax: Math.round(rateoMax * 10) / 10, oreAttive, baseLCL, zeroTermico, deltaTermico, gradienteReale: Math.round(gradienteReale * 100) / 100, forzaTermica, turbolenza, dirDom: dirDomNum, dirName: getWindDirName(dirDomNum), score, scoreEmoji, descVolo, totaleOre: termichePerOra.length };
  }, [dayData, currentData, site]);

  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) return formatDateShort(new Date(dayData[0].time));
    return formatDateShort(new Date());
  }, [dayData]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l&apos;analisi.
      </div>
    );
  }

  const scoreColor = analisi.score >= 8 ? "text-emerald-400" : analisi.score >= 6 ? "text-lime-400" : analisi.score >= 4 ? "text-amber-400" : "text-red-400";
  const scoreBg = analisi.score >= 8 ? "bg-emerald-900/30 border-emerald-500/30" : analisi.score >= 6 ? "bg-lime-900/30 border-lime-500/30" : analisi.score >= 4 ? "bg-amber-900/30 border-amber-500/30" : "bg-red-900/30 border-red-500/30";

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-slate-800/60 border border-slate-600/50 px-4 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4 text-slate-400" />{dataGiorno}
        </span>
      </div>

      <div className={`rounded-2xl border-2 p-5 ${scoreBg}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{analisi.scoreEmoji}</span>
            <div>
              <div className="text-lg font-bold text-white">Giudizio volo: <span className={scoreColor}>{analisi.score}/10</span></div>
              <p className="text-sm text-slate-300 mt-1">{analisi.descVolo}</p>
            </div>
          </div>
          <div className="w-16 h-16 shrink-0 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${(analisi.score / 10) * 100} 100`} strokeLinecap="round" className={scoreColor} />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${scoreColor}`}>{analisi.score}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-1"><Thermometer className="w-5 h-5 text-amber-400" /></div>
          <div className="text-xs text-slate-400 uppercase font-bold mb-0.5">Temperatura</div>
          <div className="text-lg font-bold text-white">{analisi.tempMedia}°C</div>
          <div className="text-xs text-slate-400 mt-1">max {analisi.tempMax}°C · delta {analisi.deltaTermico}°C</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-1"><Wind className="w-5 h-5 text-sky-400" /></div>
          <div className="text-xs text-slate-400 uppercase font-bold mb-0.5">Vento medio</div>
          <div className="text-lg font-bold text-white">{analisi.windMedia} km/h</div>
          <div className="text-xs text-slate-400 mt-1">max {analisi.windMax} · raffiche {analisi.windGustsMax}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-1"><ArrowUp className="w-5 h-5 text-orange-400" /></div>
          <div className="text-xs text-slate-400 uppercase font-bold mb-0.5">Termiche</div>
          <div className="text-lg font-bold text-white">{analisi.rateoMedio} m/s</div>
          <div className="text-xs text-slate-400 mt-1">picco {analisi.rateoMax} · {analisi.oreAttive}/{analisi.totaleOre}h attive</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-1"><Cloud className="w-5 h-5 text-slate-400" /></div>
          <div className="text-xs text-slate-400 uppercase font-bold mb-0.5">Nuvolosità</div>
          <div className="text-lg font-bold text-white">{analisi.cloudMedia}%</div>
          <div className="text-xs text-slate-400 mt-1">{analisi.cloudMedia < 20 ? "Sereno" : analisi.cloudMedia < 40 ? "Poco nuvoloso" : analisi.cloudMedia < 60 ? "Nuvoloso" : "Coperto"}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-1"><Droplets className="w-5 h-5 text-blue-400" /></div>
          <div className="text-xs text-slate-400 uppercase font-bold mb-0.5">Umidità</div>
          <div className="text-lg font-bold text-white">{analisi.humidityMedia}%</div>
          <div className="text-xs text-slate-400 mt-1">{analisi.humidityMedia < 40 ? "Aria secca" : analisi.humidityMedia < 60 ? "Normale" : "Aria umida"}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-1"><Gauge className="w-5 h-5 text-purple-400" /></div>
          <div className="text-xs text-slate-400 uppercase font-bold mb-0.5">Pressione</div>
          <div className="text-lg font-bold text-white">{analisi.pressureMed} hPa</div>
          <div className="text-xs text-slate-400 mt-1">{analisi.pressureMed > 1020 ? "Alta" : analisi.pressureMed < 1010 ? "Bassa" : "Normale"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-orange-300 mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Termiche</h4>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between"><span>Base nuvole (LCL):</span><span className="font-bold text-green-300">{analisi.baseLCL} m</span></div>
            <div className="flex justify-between"><span>Zero termico:</span><span className="font-bold text-amber-300">{analisi.zeroTermico} m</span></div>
            <div className="flex justify-between"><span>Gradiente reale:</span><span className={`font-bold ${analisi.gradienteReale > 1.2 ? "text-red-300" : analisi.gradienteReale > 0.98 ? "text-amber-300" : "text-green-300"}`}>{analisi.gradienteReale}°C/100m</span></div>
            <div className="flex justify-between"><span>Forza termica:</span><span className="font-bold text-white">{analisi.forzaTermica}/10</span></div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2"><Wind className="w-4 h-4" /> Vento & atmosfera</h4>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between"><span>Direzione dominante:</span><span className="font-bold text-white">{analisi.dirName} ({analisi.dirDom}°)</span></div>
            <div className="flex justify-between"><span>Turbolenza:</span><span className={`font-bold ${analisi.turbolenza === "Forte" ? "text-red-300" : analisi.turbolenza === "Moderata" ? "text-amber-300" : "text-green-300"}`}>{analisi.turbolenza}</span></div>
            <div className="flex justify-between"><span>UV Index medio:</span><span className="font-bold text-yellow-300">{analisi.uvMedia}</span></div>
            <div className="flex justify-between"><span>Pioggia totale:</span><span className={`font-bold ${analisi.precipTot > 1 ? "text-blue-300" : "text-green-300"}`}>{analisi.precipTot === 0 ? "Assente" : `${analisi.precipTot} mm`}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}