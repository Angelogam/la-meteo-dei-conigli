"use client";

import React from "react";
import { MapPin, Mountain, Compass, Navigation, Sparkles, Thermometer, Wind, Gauge } from "lucide-react";
import type { Decollo } from "@/data/decolli";
import type { MeteoDaily, MeteoHourly } from "@/services/weatherService";

interface DecolloListProps {
  decolli: Decollo[];
  selectedId: string;
  onSelect: (id: string) => void;
  allDailyData?: Record<string, MeteoDaily[]>;
  allHourlyData?: Record<string, MeteoHourly[]>;
}

function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "☀️";
}

function getDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

const DecolloList = ({ decolli, selectedId, onSelect, allDailyData, allHourlyData }: DecolloListProps) => {
  const getCurrentData = (id: string) => {
    const hourly = allHourlyData?.[id];
    if (!hourly || hourly.length === 0) return null;
    const now = new Date();
    // Cerca l'ora corrente
    const currentHour = hourly.find(h =>
      h.time.getFullYear() === now.getFullYear() &&
      h.time.getMonth() === now.getMonth() &&
      h.time.getDate() === now.getDate() &&
      h.time.getHours() === now.getHours()
    );
    if (currentHour) return currentHour;
    // Fallback: primo dato del giorno corrente
    const first = hourly.find(h =>
      h.time.getFullYear() === now.getFullYear() &&
      h.time.getMonth() === now.getMonth() &&
      h.time.getDate() === now.getDate()
    );
    return first || null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Intestazione fissa */}
      <div className="bg-slate-800/80 border border-emerald-500/30 rounded-t-xl flex items-center gap-2 px-4 py-3 shrink-0">
        <Navigation className="w-5 h-5 text-emerald-400 shrink-0" />
        <span className="text-base font-bold text-emerald-300">Decolli</span>
        <span className="text-xs text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full ml-auto">{decolli.length}</span>
      </div>

      {/* LISTA UNICA SCROLLABILE — TUTTI I 24 DECOLLI */}
      <div className="flex-1 overflow-y-auto space-y-1.5 p-2 bg-slate-900/50 rounded-b-xl border-x border-b border-slate-700/30">
        {decolli.map((site) => {
          const isSelected = site.id === selectedId;
          const current = getCurrentData(site.id);
          const hasData = current != null;
          const temp = hasData ? Math.round(current.temperature) : null;
          const wind = hasData ? Math.round(current.windSpeed) : null;
          const dir = hasData ? Math.round(current.windDir) : null;
          const gust = hasData && current.windGusts > 0 ? Math.round(current.windGusts) : null;
          const code = hasData ? current.weatherCode : null;
          const dirArrow = dir != null ? getDirArrow(dir) : "";
          const dirName = dir != null ? getDirLabel(dir) : "";
          const emoji = code != null ? getWeatherEmoji(code) : "—";

          return (
            <button
              key={site.id}
              onClick={() => onSelect(site.id)}
              className={`w-full text-left p-3 transition-all border rounded-xl cursor-pointer ${
                isSelected
                  ? "bg-emerald-900/50 border-emerald-500 shadow-md"
                  : "bg-slate-800/50 border-slate-700/40 hover:bg-slate-700/50 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="text-xl shrink-0">{emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white truncate">{site.name}</span>
                    {isSelected && <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                    <span>{site.exposure}</span>
                    <span>{site.altitude}m</span>
                    <span className="truncate">{site.valley}</span>
                  </div>
                  {hasData && temp != null && (
                    <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-700/30">
                      <span className="flex items-center gap-1 text-sm font-bold text-amber-300">
                        <Thermometer className="w-3.5 h-3.5 text-amber-400" />{temp}°
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold text-sky-300">
                        <Wind className="w-3.5 h-3.5 text-sky-400" />{wind}
                        <span className="text-slate-400 font-normal text-[11px]">{dirArrow}{dirName}</span>
                      </span>
                      {gust != null && gust > 0 && (
                        <span className="text-[11px] text-red-300"><Gauge className="w-3 h-3 inline" />{gust}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolloList;