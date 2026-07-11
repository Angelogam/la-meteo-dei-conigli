"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { X, Wind, Thermometer, RefreshCw, Droplets, Gauge, Cloud, CloudRain, CloudLightning, Sun, Clock } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { wic, wd } from "@/utils/meteo";
import { getVoloStatus } from "@/utils/volo";
import { WeatherIcon } from "@/components/WeatherIcon";

interface SidebarDecolliProps {
  selected: string;
  current: HourData | null;
  onSelect: (id: string) => void;
  weatherMap: Record<string, HourData>;
  isOpen: boolean;
  onClose: () => void;
}

function getWeatherDesc(code: number, precipitation: number, temp: number): { label: string; emoji: string; color: string } {
  if (code >= 95) return { label: "Temporale", emoji: "⛈️", color: "text-purple-300 bg-purple-900/40 border-purple-500/50" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82) || precipitation > 0.5) {
    if (precipitation > 5) return { label: "Pioggia forte", emoji: "🌧️", color: "text-blue-300 bg-blue-900/40 border-blue-500/50" };
    return { label: "Pioggia", emoji: "🌦️", color: "text-sky-300 bg-sky-900/40 border-sky-500/50" };
  }
  if (code >= 71 && code <= 77) return { label: "Neve", emoji: "❄️", color: "text-white bg-slate-600/40 border-slate-400/50" };
  if (code >= 45 && code <= 48) return { label: "Nebbia", emoji: "🌫️", color: "text-slate-300 bg-slate-600/40 border-slate-400/50" };
  if (code <= 3) {
    const map = ["Sereno ☀️", "Poco nuvoloso 🌤️", "Parzialmente nuv. ⛅", "Nuvoloso ☁️"];
    const colors = ["text-amber-300 bg-amber-900/30 border-amber-500/40", "text-yellow-300 bg-yellow-900/30 border-yellow-500/40", "text-slate-300 bg-slate-700/40 border-slate-500/40", "text-slate-200 bg-slate-600/40 border-slate-400/50"];
    return { label: map[code] || "Nuvoloso", emoji: ["☀️", "🌤️", "⛅", "☁️"][code] || "☁️", color: colors[code] || colors[3] };
  }
  return { label: "Nuvoloso", emoji: "☁️", color: "text-slate-200 bg-slate-600/40 border-slate-400/50" };
}

const SidebarDecolli = ({ selected, current, onSelect, weatherMap, isOpen, onClose }: SidebarDecolliProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  // Clock in tempo reale
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const currentSecStr = String(now.getSeconds()).padStart(2, "0");

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden" />
      )}

      <div
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-full w-80 max-w-[88vw] z-40
          bg-gradient-to-b from-slate-800 via-slate-800/95 to-slate-900
          border-r border-slate-600 shadow-2xl
          transition-all duration-350 ease-out
          overflow-y-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:relative md:z-auto md:h-auto md:max-h-[calc(100vh-8rem)] md:w-72 md:rounded-2xl md:border md:border-slate-600 md:mr-4 md:shadow-xl md:sticky md:top-4
        `}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-md border-b border-slate-600 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-700 border border-slate-500 flex items-center justify-center">
              <span className="text-base">🪂</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Decolli
              </h2>
              <p className="text-[10px] text-blue-300/60 font-medium flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                {DECOLLI.length} siti · {currentTimeStr}:{currentSecStr}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-700 transition-colors md:hidden border border-slate-500"
            aria-label="Chiudi sidebar"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Lista decolli */}
        <div className="p-3 space-y-2">
          {DECOLLI.map((site) => {
            const w = weatherMap[site.id];
            const isSelected = site.id === selected;
            const volo = getVoloStatus(w);
            const wDesc = w ? getWeatherDesc(w.weatherCode, w.precipitation, w.temperature) : null;
            return (
              <button
                key={site.id}
                onClick={() => {
                  onSelect(site.id);
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={`
                  w-full text-left rounded-xl px-3 py-2.5 transition-all duration-200 border
                  ${
                    isSelected
                      ? "bg-gradient-to-r from-slate-700 to-slate-600 border-slate-400 shadow-lg scale-[1.02]"
                      : "bg-slate-800/60 border-slate-600/50 hover:bg-slate-700 hover:border-slate-500 hover:scale-[1.01]"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className={`text-[12px] font-semibold text-white truncate block leading-snug ${isSelected ? "text-blue-200" : ""}`}>
                        {site.name}
                      </span>
                      {w && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${volo.color}`}>
                          {volo.icon} {volo.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-0.5">
                        <span className="text-slate-500">📍</span>
                        {site.exposure}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-500" />
                      <span>{site.altitude}m</span>
                      <span className="w-1 h-1 rounded-full bg-slate-500" />
                      <span className="truncate">{site.valley}</span>
                    </div>
                    {/* Weather description & icona dinamica */}
                    {w && wDesc && (
                      <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${wDesc.color}`}>
                        <WeatherIcon code={w.weatherCode} size={13} />
                        <span>{wDesc.label} · {Math.round(w.temperature)}°C</span>
                      </div>
                    )}
                  </div>
                  {w && (
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-lg leading-none">{wic(w.weatherCode, true)}</span>
                      <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-200"}`}>
                        {Math.round(w.temperature)}°
                      </span>
                      <span className="text-[8px] text-slate-500">{Math.round(w.windSpeed)} km/h</span>
                    </div>
                  )}
                </div>
                {w && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 pt-1.5 border-t border-slate-600/50">
                    <div className="flex items-center gap-1 text-[10px] text-blue-300/70">
                      <Wind className="w-3 h-3 text-blue-400" />
                      <span className="font-medium">{Math.round(w.windSpeed)} km/h</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-orange-300/70">
                      <span className="text-orange-400">⬆</span>
                      <span className="font-medium">{w.windGust ? Math.round(w.windGust) : "--"} km/h</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-300/70">
                      <Thermometer className="w-3 h-3 text-amber-400" />
                      <span className="font-medium">{Math.round(w.temperature)}°C</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-300/70">
                      <Droplets className="w-3 h-3 text-emerald-400" />
                      <span className="font-medium">{w.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-purple-300/70">
                      <Gauge className="w-3 h-3 text-purple-400" />
                      <span className="font-medium">{w.pressure ? Math.round(w.pressure) : "--"} hPa</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-300/70">
                      <Cloud className="w-3 h-3 text-slate-400" />
                      <span className="font-medium">{w.cloudCover}%</span>
                    </div>
                    {w.precipitation && w.precipitation > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-blue-300/70">
                        <CloudRain className="w-3 h-3 text-blue-400" />
                        <span className="font-medium">{w.precipitation.toFixed(1)} mm</span>
                      </div>
                    )}
                  </div>
                )}
                {!w && (
                  <div className="text-[10px] text-slate-500 mt-1 italic flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                    Caricamento...
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SidebarDecolli;