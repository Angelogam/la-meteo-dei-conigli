"use client";

import React from "react";
import { X, Clock, Thermometer, Wind, Droplets, Cloud, Gauge, CloudRain } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { getVoloStatus } from "@/utils/volo";
import GraficoTermiche from "@/components/GraficoTermiche";
import { calcolaTermiche } from "@/utils/termiche";

function getWeatherEmoji(code: number): string {
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌧️";
  if (code >= 71) return "❄️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 20) return "☁️";
  if (code >= 10) return "⛅";
  if (code >= 5) return "🌤️";
  return "☀️";
}

interface PopupTermicheProps {
  siteName: string;
  siteAltitude: number;
  hourlyData: HourData[];
  onClose: () => void;
}

export default function PopupTermiche({ siteName, siteAltitude, hourlyData, onClose }: PopupTermicheProps) {
  const now = new Date();
  const oraCorrente = now.getHours();

  // Calcola termiche per ogni ora
  const termiche = hourlyData
    .filter(h => {
      const hh = h.time.getHours();
      return hh >= 8 && hh <= 19;
    })
    .map(h => ({
      hour: h.time.getHours(),
      termiche: calcolaTermiche(h, siteAltitude),
    }));

  if (!hourlyData || hourlyData.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-3">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-emerald-500/30 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800/60 to-emerald-700/30 border border-emerald-500/40 flex items-center justify-center">
              <span className="text-xl">🪂</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-200">
                Previsioni orarie · {siteName}
              </h3>
              <p className="text-xs text-slate-400">
                Quota decollo: {siteAltitude}m · Fascia oraria 8:00–19:00
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-700 transition-colors border border-slate-500/60"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Scroll container */}
        <div className="overflow-y-auto p-5 space-y-6">
          {/* Grafico termiche */}
          <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-3">
            <GraficoTermiche hourly={termiche} oraCorrente={oraCorrente} />
          </div>

          {/* Tabella oraria */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-300">Dettaglio orario</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
              {hourlyData.map((h, idx) => {
                const volo = getVoloStatus(h);
                const termica = termiche.find(t => t.hour === h.time.getHours());
                const isCurrentHour = h.time.getHours() === oraCorrente;
                return (
                  <div
                    key={idx}
                    className={`rounded-lg px-2.5 py-2 border transition-all ${
                      isCurrentHour
                        ? "bg-emerald-900/30 border-emerald-400/50 shadow-sm"
                        : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-mono font-bold ${
                        isCurrentHour ? "text-emerald-300" : "text-slate-400"
                      }`}>
                        {String(h.time.getHours()).padStart(2, "0")}:00
                      </span>
                      <span className="text-lg">{getWeatherEmoji(h.weatherCode)}</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-slate-300">
                        <Thermometer className="w-2.5 h-2.5 text-amber-400" />
                        <span className="font-semibold">{Math.round(h.temperature)}°C</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Wind className="w-2.5 h-2.5 text-blue-400" />
                        <span>{Math.round(h.windSpeed)} km/h</span>
                        {h.windGusts && (
                          <span className="text-slate-500">/{Math.round(h.windGusts)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Droplets className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{h.humidity}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Cloud className="w-2.5 h-2.5 text-slate-400" />
                        <span>{h.cloudCover}%</span>
                      </div>
                      {h.precipitation > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-300">
                          <CloudRain className="w-2.5 h-2.5" />
                          <span>{h.precipitation.toFixed(1)}mm</span>
                        </div>
                      )}
                      {termica && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-300">
                          <span>↑</span>
                          <span className="font-semibold">{termica.termiche.rateo.toFixed(1)} m/s</span>
                        </div>
                      )}
                      <span className={`inline-block px-1 py-0.5 rounded text-[8px] font-bold border mt-0.5 ${volo.color}`}>
                        {volo.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}