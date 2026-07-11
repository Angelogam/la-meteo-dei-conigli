"use client";

import React, { useEffect, useRef } from "react";
import { X, Wind, Thermometer, RefreshCw, Droplets, Gauge, Cloud, CloudRain } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { wic, wd } from "@/utils/meteo";
import { getVoloStatus } from "@/utils/volo";

interface SidebarDecolliProps {
  selected: string;
  current: HourData | null;
  onSelect: (id: string) => void;
  weatherMap: Record<string, HourData>;
  isOpen: boolean;
  onClose: () => void;
}

const SidebarDecolli = ({ selected, current, onSelect, weatherMap, isOpen, onClose }: SidebarDecolliProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  const now = new Date();

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
          border-r-2 border-green-500/40 shadow-2xl
          transition-all duration-350 ease-out
          overflow-y-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:relative md:z-auto md:h-auto md:max-h-[calc(100vh-8rem)] md:w-80 md:rounded-2xl md:border-2 md:border-green-500/40 md:mr-4 md:shadow-xl md:shadow-green-500/10 md:sticky md:top-4
        `}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-md border-b-2 border-green-500/30 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-700 border border-green-500/40 flex items-center justify-center">
              <span className="text-lg">🪂</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-green-300 tracking-tight">
                Decolli
              </h2>
              <p className="text-[11px] text-blue-300/80 font-medium flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {DECOLLI.length} siti · {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-700 transition-colors md:hidden border border-slate-500"
            aria-label="Chiudi sidebar"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Lista decolli */}
        <div className="p-3 space-y-2.5">
          {DECOLLI.map((site) => {
            const w = weatherMap[site.id];
            const isSelected = site.id === selected;
            const volo = getVoloStatus(w);
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
                  w-full text-left rounded-xl px-3 py-3 transition-all duration-200 border-2
                  ${
                    isSelected
                      ? "bg-gradient-to-r from-slate-700 to-slate-600 border-green-400 shadow-lg scale-[1.02] shadow-green-500/20"
                      : "bg-slate-800/60 border-green-500/25 hover:bg-slate-700 hover:border-green-400/50 hover:scale-[1.01]"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className={`text-sm font-bold text-green-200 truncate block leading-snug ${isSelected ? "text-green-100" : ""}`}>
                        {site.name}
                      </span>
                      {w && (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border-2 ${volo.color} animate-pulse`}>
                          {volo.icon} {volo.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-slate-300">
                      <span className="flex items-center gap-0.5">
                        <span className="text-slate-500">📍</span>
                        {site.exposure}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-500" />
                      <span>{site.altitude}m</span>
                      <span className="w-1 h-1 rounded-full bg-slate-500" />
                      <span className="truncate">{site.valley}</span>
                    </div>
                  </div>
                  {w && (
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-[11px] text-blue-300/90 font-mono font-semibold">
                          {String(w.time.getHours()).padStart(2, "0")}:00
                        </span>
                        <span className="text-3xl leading-none drop-shadow-lg animate-pulse">{wic(w.weatherCode, true)}</span>
                        <span className={`text-base font-extrabold ${isSelected ? "text-white" : "text-slate-100"}`}>
                          {Math.round(w.temperature)}°
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">{Math.round(w.windSpeed)} km/h</span>
                      </div>
                  )}
                </div>
                {w && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 pt-2.5 border-t-2 border-green-500/20">
                    <div className="flex items-center gap-1.5 text-[12px] text-blue-200/90">
                      <Wind className="w-4 h-4 text-blue-300 animate-pulse" />
                      <span className="font-semibold">{Math.round(w.windSpeed)} km/h</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-orange-200/90">
                      <span className="text-orange-300 text-base animate-bounce">⬆</span>
                      <span className="font-semibold">{w.windGust ? Math.round(w.windGust) : "--"} km/h</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-amber-200/90">
                      <Thermometer className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span className="font-semibold">{Math.round(w.temperature)}°C</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-emerald-200/90">
                      <Droplets className="w-4 h-4 text-emerald-300 animate-pulse" />
                      <span className="font-semibold">{w.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-purple-200/90">
                      <Gauge className="w-4 h-4 text-purple-300 animate-pulse" />
                      <span className="font-semibold">{w.pressure ? Math.round(w.pressure) : "--"} hPa</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-slate-200/90">
                      <Cloud className="w-4 h-4 text-slate-300 animate-pulse" />
                      <span className="font-semibold">{w.cloudCover}%</span>
                    </div>
                    {w.precipitation && w.precipitation > 0 && (
                      <div className="flex items-center gap-1.5 text-[12px] text-blue-200/90">
                        <CloudRain className="w-4 h-4 text-blue-300 animate-pulse" />
                        <span className="font-semibold">{w.precipitation.toFixed(1)} mm</span>
                      </div>
                    )}
                  </div>
                )}
                {!w && (
                  <div className="text-[12px] text-slate-400 mt-1.5 italic flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
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