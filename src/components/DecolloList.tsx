"use client";

import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Navigation,
  Sparkles,
  Clock,
  Thermometer,
  Wind,
  Gauge,
} from "lucide-react";
import type { Decollo } from "@/data/decolli";

interface DecolloListProps {
  decolli: Decollo[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentData: any;
  allWeatherData: Record<string, any>;
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

function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function getDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

const DecolloList = ({ decolli, selectedId, onSelect, currentData, allWeatherData }: DecolloListProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/60 rounded-2xl border border-emerald-500/20">
        <Navigation className="w-5 h-5 text-emerald-400" />
        <h3 className="text-base font-black text-emerald-300 tracking-wider uppercase">Decolli</h3>
        <span className="text-xs text-slate-500 bg-slate-700/60 px-2.5 py-0.5 rounded-full">
          {decolli.length}
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
        <Clock className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-bold text-slate-300 tabular-nums">
          {new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
        {decolli.map((site) => {
          const isSelected = site.id === selectedId;
          const siteData = allWeatherData[site.id];
          const hasData = siteData != null;
          const temp = hasData ? Math.round(siteData.temperature ?? 0) : null;
          const wind = hasData ? Math.round(siteData.windSpeed ?? 0) : null;
          const dir = hasData ? Math.round(siteData.windDir ?? 0) : null;
          const gust = hasData && siteData.windGusts != null ? Math.round(siteData.windGusts) : null;
          const code = hasData ? (siteData.weatherCode ?? 0) : null;
          const dirLabel = dir != null ? getDirLabel(dir) : "";
          const dirArrow = dir != null ? getDirArrow(dir) : "";
          const emoji = code != null ? getWeatherEmoji(code) : "—";

          return (
            <button
              key={site.id}
              onClick={() => onSelect(site.id)}
              className={`
                w-full text-left rounded-2xl px-4 py-4 transition-all duration-200 border-2
                ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-900/50 to-slate-800/70 border-emerald-400/60 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                    : "bg-slate-800/40 border-slate-700/30 hover:bg-slate-700/50 hover:border-slate-600/50 hover:scale-[1.01]"
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-base font-black truncate block leading-snug tracking-tight ${
                      isSelected ? "text-white" : "text-slate-200"
                    }`}>
                      {site.name}
                    </span>
                    {isSelected && (
                      <Sparkles className="w-4 h-4 text-emerald-400 animate-twinkle shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Compass className="w-4 h-4 text-sky-400" />
                      {site.exposure}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-500" />
                    <span className="flex items-center gap-1">
                      <Mountain className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-300">{site.altitude}</span>m
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-500" />
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="truncate">
                        {site.name === "Malanotte" ? "Valle Ellero" : site.valley}
                      </span>
                    </span>
                  </div>

                  {hasData && temp != null && (
                    <div className="mt-3 pt-2 border-t border-slate-700/20 grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-1.5 text-sm text-slate-300">
                        <Thermometer className="w-4 h-4 text-amber-400" />
                        <span className="font-bold tabular-nums">{temp}°</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-300">
                        <Wind className="w-4 h-4 text-sky-400" />
                        <span className="font-bold tabular-nums">{wind}</span>
                        {dir != null && (
                          <span className="text-slate-400 text-xs">{dirArrow}{dirLabel}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-end text-xl">{emoji}</div>
                    </div>
                  )}

                  {gust != null && wind != null && gust > wind && (
                    <div className="flex items-center gap-1.5 text-xs text-red-300/80 mt-1">
                      <Gauge className="w-4 h-4" />
                      <span>Raffica {gust} km/h</span>
                    </div>
                  )}
                </div>
              </div>

              {isSelected && (
                <div className="mt-3 pt-2 border-t border-emerald-500/20">
                  <div className="flex items-center gap-2 text-xs text-emerald-300/80">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold tracking-wide uppercase">Selezionato</span>
                    <span className="text-slate-600">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-500 tabular-nums">
                        {new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolloList;