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
    const currentHour = hourly.find(h =>
      h.time.getFullYear() === now.getFullYear() &&
      h.time.getMonth() === now.getMonth() &&
      h.time.getDate() === now.getDate() &&
      h.time.getHours() === now.getHours()
    );
    if (currentHour) return currentHour;
    const first = hourly.find(h =>
      h.time.getFullYear() === now.getFullYear() &&
      h.time.getMonth() === now.getMonth() &&
      h.time.getDate() === now.getDate()
    );
    return first || null;
  };

  return (
    <div className="space-y-3">
      <div className="card bg-slate-800/60 border border-emerald-500/30 flex items-center gap-2 px-4 py-3">
        <Navigation className="w-6 h-6 text-emerald-400 shrink-0" />
        <span className="text-lg font-bold text-emerald-300">Decolli</span>
        <span className="text-sm text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full ml-auto">{decolli.length}</span>
      </div>

      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
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
              className={`card w-full text-left p-4 transition-all border-2 cursor-pointer ${
                isSelected
                  ? "bg-emerald-900/50 border-emerald-500 shadow-lg"
                  : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl mt-0.5 shrink-0">{emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white mb-1 flex items-center gap-1">
                    {site.name}
                    {isSelected && <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><Compass className="w-4 h-4 text-sky-400 shrink-0" />{site.exposure}</span>
                    <span className="flex items-center gap-1"><Mountain className="w-4 h-4 text-amber-400 shrink-0" />{site.altitude}m</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-rose-400 shrink-0" />{site.valley}</span>
                  </div>
                  {hasData && temp != null && (
                    <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-700/30">
                      <span className="flex items-center gap-1.5 text-base font-bold text-amber-300">
                        <Thermometer className="w-5 h-5 text-amber-400 shrink-0" />{temp}°
                      </span>
                      <span className="flex items-center gap-1.5 text-base font-bold text-sky-300">
                        <Wind className="w-5 h-5 text-sky-400 shrink-0" />{wind}
                        <span className="text-slate-400 font-normal text-sm">{dirArrow}{dirName}</span>
                      </span>
                      {gust != null && gust > 0 && (
                        <span className="text-sm text-red-300"><Gauge className="w-4 h-4 inline" />{gust}</span>
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