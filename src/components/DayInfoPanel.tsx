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
  Sparkles,
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

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Genera condizioni e note per ogni ora dalle 9:00 alle 19:00 */
function generateHourlyData(currentData: any, dayDataArray?: any[]) {
  const ore = Array.from({ length: 11 }, (_, i) => i + 9); // 9-19

  return ore.map((ora) => {
    // Cerca il dato orario corrispondente — dayDataArray è un array di ore
    const hData = Array.isArray(dayDataArray) ? dayDataArray.find(
      (h: any) => h.time?.getHours() === ora
    ) : undefined;

    const t = hData?.temperature ?? currentData?.temp ?? 20;
    const ws = hData?.windSpeed ?? currentData?.windSpeed ?? 10;
    const cc = hData?.cloudCover ?? currentData?.cloudCover ?? 30;
    const hum = hData?.humidity ?? currentData?.humidity ?? 50;

    // Emoji base
    let emoji = "☀️";
    if (cc > 80) emoji = "☁️";
    else if (cc > 50) emoji = "⛅";
    else if (cc > 20) emoji = "🌤️";

    // Condizioni
    const tempStr = `${Math.round(t)}°C`;
    const ventoStr = `${Math.round(ws)} km/h`;
    const cloudStr = cc > 50 ? "nuvoloso" : cc > 20 ? "poco nuvoloso" : "sereno";

    // Note
    let note = "";
    if (ora >= 9 && ora <= 10) {
      note = "Mattino fresco, termiche in attivazione";
    } else if (ora >= 11 && ora <= 13) {
      note = "Termiche in sviluppo, buona finestra";
    } else if (ora >= 14 && ora <= 16) {
      note = "Picco termico, condizioni stabili";
    } else if (ora >= 17 && ora <= 19) {
      note = "Termiche in calo, atmosfera tranquilla";
    }

    if (ws > 20) note += " · vento sostenuto";
    else if (ws < 5) note += " · vento debole";
    if (hum > 70) note += " · aria umida";

    return {
      ora,
      emoji,
      condizioni: `${tempStr} · ${ventoStr} · ${cloudStr}`,
      note,
    };
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

  // Assicura che dayData sia un array prima di passarlo
  const dayDataArray = Array.isArray(dayData) ? dayData : undefined;

  // Genera dati per ogni ora 9-19
  const hourlyRows = generateHourlyData(currentData, dayDataArray);

  return (
    <div className="space-y-3 mb-4">
      {/* ☀️ Situazione generale */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-4 hover:border-green-400/40 transition-all duration-200">
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
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-4 hover:border-green-400/40 transition-all duration-200">
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
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-4 hover:border-green-400/40 transition-all duration-200">
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

      {/* 🌤️ Previsione oraria 9:00–19:00 */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-orange-500/40 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Previsione oraria 9:00 – 19:00
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
                <th className="text-left py-2 pr-3 font-medium text-slate-400 whitespace-nowrap w-16">Ora</th>
                <th className="text-left py-2 px-3 font-medium text-slate-400">Condizioni</th>
                <th className="text-left py-2 pl-3 font-medium text-slate-400">Note</th>
              </tr>
            </thead>
            <tbody>
              {hourlyRows.map((h, i) => {
                const isCurrent = h.ora === new Date().getHours();
                return (
                  <tr
                    key={h.ora}
                    className={`border-b border-slate-700/20 last:border-0 hover:bg-slate-700/20 transition-colors ${
                      isCurrent ? "bg-emerald-900/20" : ""
                    }`}
                  >
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <span className={`font-mono font-bold ${
                        isCurrent ? "text-emerald-300" : "text-slate-100"
                      }`}>
                        {String(h.ora).padStart(2, "0")}:00
                      </span>
                    </td>
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <span className="mr-1">{h.emoji}</span>
                      <span>{h.condizioni}</span>
                    </td>
                    <td className="py-1.5 pl-3 text-slate-400 text-[11px] leading-snug">
                      {h.note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪂 Interpretazione */}
      <div className="bg-gradient-to-br from-orange-900/20 to-amber-900/10 border-2 border-orange-700/30 rounded-2xl p-4 hover:border-green-400/40 transition-all duration-200">
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