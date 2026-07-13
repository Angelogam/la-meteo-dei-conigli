"use client";

import React from "react";
import {
  Sun,
  Thermometer,
  Droplets,
  Wind,
  ArrowUp,
  Cloud,
  Gauge,
  Clock,
  Calendar,
} from "lucide-react";
import {
  generateSituazioneGenerale,
  generateProfiloTermico,
  generateVentoQuota,
  generateInterpretazione,
} from "@/utils/analisiDescriptions";

interface DayInfoPanelProps {
  currentData: any;
  dayData?: any;
  site?: { name: string; alt: number };
  selectedDate?: string;
}

const hoursData = [
  { period: "Mattina (8–11)", icon: "🌤️", cond: "Sole pieno, vento debole", note: "Ottima visibilità, aria secca" },
  { period: "Pomeriggio (12–17)", icon: "⛅", cond: "Termiche moderate, qualche cumulo", note: "Buone condizioni per volo libero" },
  { period: "Sera (18–21)", icon: "🌙", cond: "Cielo sereno, vento in calo", note: "Atmosfera stabile, temperatura in discesa" },
];

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DayInfoPanel({ currentData, dayData, site, selectedDate }: DayInfoPanelProps) {
  const displayDate = selectedDate || new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const nowTime = getCurrentTime();

  const situazioneLinee = generateSituazioneGenerale(currentData, dayData);
  const termicoLinee = generateProfiloTermico(currentData, dayData);
  const ventoLinee = generateVentoQuota(currentData);
  const interpretazioneLinee = generateInterpretazione(currentData);

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
              {displayDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nowTime}
            </span>
          </div>
        </div>
        <div className="space-y-2 text-xs md:text-sm text-slate-300 leading-relaxed">
          {situazioneLinee.map((linea, i) => (
            <p key={i}>{linea}</p>
          ))}
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
              {displayDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nowTime}
            </span>
          </div>
        </div>
        <div className="space-y-2 text-xs md:text-sm text-slate-300 leading-relaxed">
          {termicoLinee.map((linea, i) => (
            <p key={i}><Gauge className="w-3 h-3 inline mr-1 text-amber-400" />{linea}</p>
          ))}
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
              {displayDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nowTime}
            </span>
          </div>
        </div>
        <div className="space-y-2 text-xs md:text-sm text-slate-300 leading-relaxed">
          {ventoLinee.map((linea, i) => (
            <p key={i}>{linea}</p>
          ))}
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
              {displayDate}
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
            🪂 Interpretazione
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {displayDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nowTime}
            </span>
          </div>
        </div>
        <div className="space-y-2 text-xs md:text-sm text-slate-300 leading-relaxed">
          {interpretazioneLinee.map((linea, i) => (
            <p key={i}>{linea}</p>
          ))}
        </div>
      </div>
    </div>
  );
}