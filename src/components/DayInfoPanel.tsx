"use client";

import React from "react";
import {
  Sun,
  Thermometer,
  Droplets,
  Wind,
  ArrowUp,
  Cloud,
  AlertTriangle,
  Gauge,
  Clock,
  Calendar,
} from "lucide-react";

interface DayInfoPanelProps {
  currentData: {
    temp?: number;
    tempFeel?: number;
    humidity?: number;
    windSpeed?: number;
    windGust?: number;
    windDir?: string;
    clouds?: number;
    precip?: number;
    thermalStrength?: number;
    thermalDelta?: number;
    liftingIndex?: number;
    cape?: number;
    stabilityIndex?: string;
    visibility?: string;
    rainProb?: number;
  };
  dayData?: {
    tempMax?: number;
    tempMin?: number;
    windMax?: number;
    thermalMax?: number;
    thermalAvg?: number;
    rainProb?: number;
    uvIndex?: number;
    sunrise?: string;
    sunset?: string;
  };
  site?: {
    name: string;
    alt: number;
  };
}

function getStabilityLabel(index?: number | string): { text: string; color: string; icon: React.ElementType } {
  if (index === undefined || index === null) return { text: "Dati non disponibili", color: "text-slate-400", icon: Gauge };
  const val = typeof index === "string" ? parseFloat(index) : index;
  if (val <= -4) return { text: "Molto instabile ⚠️", color: "text-red-400", icon: AlertTriangle };
  if (val <= -2) return { text: "Instabile", color: "text-orange-400", icon: AlertTriangle };
  if (val <= 0) return { text: "Leggermente instabile", color: "text-amber-400", icon: Gauge };
  if (val <= 2) return { text: "Stabile", color: "text-yellow-400", icon: Gauge };
  if (val <= 4) return { text: "Molto stabile", color: "text-green-400", icon: Gauge };
  return { text: "Estremamente stabile", color: "text-emerald-400", icon: Gauge };
}

function getThermalText(strength?: number): string {
  if (strength === undefined || strength === null) return "Dati non disponibili";
  if (strength < 0.5) return "Termiche deboli o assenti";
  if (strength < 1.5) return "Termiche deboli-moderate";
  if (strength < 3) return "Termiche moderate";
  if (strength < 5) return "Termiche forti";
  return "Termiche molto forti ⚠️";
}

function getWindText(speed?: number): string {
  if (speed === undefined || speed === null) return "";
  if (speed < 5) return "Vento debole o calma";
  if (speed < 12) return "Vento leggero, ideale per volo libero";
  if (speed < 20) return "Vento moderato, buone condizioni";
  if (speed < 30) return "Vento sostenuto, attenzione in quota";
  return "Vento forte ⚠️";
}

function getCloudText(clouds?: number): string {
  if (clouds === undefined || clouds === null) return "";
  if (clouds < 10) return "Cielo sereno o poco nuvoloso";
  if (clouds < 30) return "Prevalenza di sereno, qualche velatura";
  if (clouds < 60) return "Parzialmente nuvoloso, possibili cumuli pomeridiani";
  if (clouds < 80) return "Molto nuvoloso";
  return "Cielo coperto";
}

const hoursData = [
  { period: "Mattina (8–11)", icon: "🌤️", cond: "Sole pieno, vento debole", note: "Ottima visibilità, aria secca" },
  { period: "Pomeriggio (12–17)", icon: "⛅", cond: "Termiche moderate, qualche cumulo", note: "Buone condizioni per volo libero" },
  { period: "Sera (18–21)", icon: "🌙", cond: "Cielo sereno, vento in calo", note: "Atmosfera stabile, temperatura in discesa" },
];

function getCurrentDate(): string {
  const now = new Date();
  return now.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DayInfoPanel({ currentData, dayData, site }: DayInfoPanelProps) {
  const stability = getStabilityLabel(currentData?.liftingIndex ?? currentData?.stabilityIndex);
  const StabilityIcon = stability.icon;
  const today = getCurrentDate();
  const nowTime = getCurrentTime();

  return (
    <div className="space-y-3 mb-4">
      {/* ☀️ Situazione generale */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
            <Sun className="w-4 h-4" /> Situazione generale
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {today}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nowTime}
            </span>
          </div>
        </div>
        <div className="space-y-2 text-xs md:text-sm text-slate-300 leading-relaxed">
          <p>
            Temperatura al suolo: <strong className="text-white">
              {currentData?.temp != null ? `intorno ai ${Math.round(currentData.temp)} °C` : "dati non disponibili"}
            </strong>
            {dayData?.tempMin != null && dayData?.tempMax != null && (
              <span>, con range giornaliero tra {Math.round(dayData.tempMin)}°C e {Math.round(dayData.tempMax)}°C</span>
            )}.
          </p>
          <p>
            <Droplets className="w-3 h-3 inline text-blue-400 mr-1" />
            Umidità relativa: <strong className="text-white">
              {currentData?.humidity != null
                ? `${currentData.humidity}% — aria ${currentData.humidity < 50 ? "secca" : currentData.humidity < 70 ? "moderata" : "umida"}, buona visibilità`
                : "dati non disponibili"}
            </strong>.
          </p>
          <p>
            <Wind className="w-3 h-3 inline text-cyan-400 mr-1" />
            Vento: <strong className="text-white">
              {currentData?.windSpeed != null
                ? getWindText(currentData.windSpeed) + (currentData.windDir ? ` da ${currentData.windDir}` : "")
                : "dati non disponibili"}
            </strong>
            {currentData?.windGust != null && <span> (raffiche fino a {currentData.windGust} km/h).</span>}.
          </p>
          <p>
            <Cloud className="w-3 h-3 inline text-slate-400 mr-1" />
            Cielo: <strong className="text-white">
              {currentData?.clouds != null
                ? getCloudText(currentData.clouds)
                : "dati non disponibili"}
            </strong>
            {currentData?.clouds != null && currentData.clouds > 20 && currentData.clouds < 60 && (
              <span>; qualche sviluppo cumuliforme pomeridiano possibile sulle creste, ma senza rischio di temporali significativi.</span>
            )}.
          </p>
        </div>
      </div>

      {/* 🌡️ Profilo termico e stabilità */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Thermometer className="w-4 h-4" /> Profilo termico e stabilità
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {today}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nowTime}
            </span>
          </div>
        </div>
        <div className="space-y-2 text-xs md:text-sm text-slate-300 leading-relaxed">
          <p>
            <Gauge className="w-3 h-3 inline mr-1" style={{ color: stability.color }} />
            L'indice Lifted Index (LI) è <strong className={stability.color}>{stability.text}</strong>
            {currentData?.liftingIndex != null && <span> (valore: {currentData.liftingIndex})</span>}.
            {currentData?.liftingIndex != null && Number(currentData.liftingIndex) > 0 && (
              <span> L'atmosfera è stabile, con scarsa probabilità di temporali.</span>
            )}
            {currentData?.liftingIndex != null && Number(currentData.liftingIndex) <= 0 && (
              <span> Attenzione: l'atmosfera potrebbe essere instabile.</span>
            )}
          </p>
          <p>
            <ArrowUp className="w-3 h-3 inline text-amber-400 mr-1" />
            Termiche: <strong className="text-white">
              {currentData?.thermalStrength != null
                ? `${getThermalText(currentData.thermalStrength)} (${currentData.thermalStrength} m/s)`
                : currentData?.thermalDelta != null
                  ? `ΔT di ${currentData.thermalDelta}°C — ${currentData.thermalDelta > 0.8 ? "buon gradiente termico" : "gradiente termico debole"}`
                  : "dati non disponibili"}
            </strong>
            {dayData?.thermalMax != null && <span>; massimo giornaliero previsto: {dayData.thermalMax} m/s.</span>}
          </p>
          {currentData?.cape != null && (
            <p>
              Il valore CAPE è di <strong className="text-white">{currentData.cape} J/kg</strong>
              {currentData.cape < 200 ? ", indicando energia convettiva quasi nulla." : currentData.cape < 500 ? ", indicando energia convettiva moderata." : ", indicando potenziale energia convettiva significativa."}
            </p>
          )}
        </div>
      </div>

      {/* 🌬️ Vento e dinamica in quota */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
            <Wind className="w-4 h-4" /> Vento e dinamica in quota
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {today}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nowTime}
            </span>
          </div>
        </div>
        <div className="space-y-2 text-xs md:text-sm text-slate-300 leading-relaxed">
          <p>
            Il profilo del vento mostra direzione prevalente da <strong className="text-white">{currentData?.windDir || "dati non disponibili"}</strong>,
            con intensità crescente in quota.
            {currentData?.windGust != null && currentData.windGust > 20 && (
              <span> Attenzione: sopra i 2000 m il vento può essere più sostenuto (raffiche fino a {currentData.windGust} km/h).</span>
            )}
            {(!currentData?.windGust || currentData.windGust <= 20) && (
              <span> Le condizioni sono favorevoli per il volo libero: aria asciutta, termiche regolari e nessuna turbolenza marcata.</span>
            )}
          </p>
          <p>
            <Thermometer className="w-3 h-3 inline text-orange-400 mr-1" />
            Non si osservano inversioni termiche forti: la temperatura decresce regolarmente con la quota,
            segno di buon rimescolamento dell'aria e termiche ben sviluppate.
          </p>
        </div>
      </div>

      {/* 🌤️ Previsione per la giornata */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Previsione per la giornata
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {today}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nowTime}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2 pr-3 font-medium text-slate-400">Fascia oraria</th>
                <th className="text-left py-2 px-3 font-medium text-slate-400">Condizioni previste</th>
                <th className="text-left py-2 pl-3 font-medium text-slate-400">Note</th>
              </tr>
            </thead>
            <tbody>
              {hoursData.map((h, i) => (
                <tr key={i} className="border-b border-slate-700/20 last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className="text-white font-medium">{h.icon} {h.period}</span>
                  </td>
                  <td className="py-2 px-3">{h.cond}</td>
                  <td className="py-2 pl-3 text-slate-400">{h.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪂 Interpretazione per attività outdoor / volo libero */}
      <div className="bg-gradient-to-br from-orange-900/20 to-amber-900/10 border border-orange-700/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
            🪂 Interpretazione per attività outdoor / volo libero
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {today}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nowTime}
            </span>
          </div>
        </div>
        <div className="space-y-2 text-xs md:text-sm text-slate-300 leading-relaxed">
          <p>
            <strong className="text-orange-300">Condizioni</strong>:{" "}
            {currentData?.windSpeed != null && currentData.windSpeed < 20
              ? "ideali per decolli e veleggiamento: aria asciutta, termiche regolari, vento gestibile."
              : currentData?.windSpeed != null && currentData.windSpeed < 30
                ? "buone per volo libero, ma con vento sostenuto in quota. Consigliata attenzione."
                : "da valutare con cautela: vento forte o condizioni instabili."}
          </p>
          <p>
            <strong className="text-green-400">Nessun rischio</strong> di temporali o pioggia{" "}
            {currentData?.rainProb != null && <span>(probabilità: {currentData.rainProb}%)</span>}.
          </p>
          <p>
            <strong className="text-amber-400">Attenzione</strong>:{" "}
            {currentData?.windGust != null && currentData.windGust > 25
              ? "sopra i 2500 m il vento può essere più sostenuto, quindi conviene restare su quote moderate."
              : "condizioni generalmente favorevoli su tutte le quote."}
          </p>
        </div>
      </div>
    </div>
  );
}