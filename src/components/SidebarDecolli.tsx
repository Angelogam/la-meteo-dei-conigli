"use client";

import React, { useEffect, useRef } from "react";
import { X, Wind, Thermometer } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { wic } from "@/utils/meteo";

interface SidebarDecolliProps {
  selected: string;
  current: HourData | null;
  onSelect: (id: string) => void;
  weatherMap: Record<string, HourData>;
  isOpen: boolean;
  onClose: () => void;
}

// Difficoltà badge colori
const diffColors: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-700 border-emerald-300",
  2: "bg-blue-100 text-blue-700 border-blue-300",
  3: "bg-amber-100 text-amber-700 border-amber-300",
  4: "bg-orange-100 text-orange-700 border-orange-300",
  5: "bg-red-100 text-red-700 border-red-300",
};

const SidebarDecolli = ({ selected, current, onSelect, weatherMap, isOpen, onClose }: SidebarDecolliProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Chiude la sidebar cliccando fuori su mobile
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

  // Blocca scroll su mobile quando aperta
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

  return (
    <>
      {/* Overlay per mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-800/60 backdrop-blur-sm z-30 md:hidden" />
      )}

      {/* Sidebar - a sinistra */}
      <div
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-full w-80 max-w-[88vw] z-40
          bg-gradient-to-b from-slate-100 via-white to-slate-100
          border-r border-slate-300 shadow-xl
          transition-all duration-350 ease-out
          overflow-y-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:relative md:z-auto md:h-auto md:max-h-[calc(100vh-8rem)] md:w-72 md:rounded-2xl md:border md:border-slate-300 md:mr-4 md:shadow-lg md:sticky md:top-4
        `}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
      >
        {/* Header sidebar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-300 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center">
              <span className="text-base">🪂</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                Decolli
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                {DECOLLI.length} siti disponibili
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 transition-colors md:hidden border border-slate-300"
            aria-label="Chiudi sidebar"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Lista decolli */}
        <div className="p-3 space-y-2">
          {DECOLLI.map((site) => {
            const w = weatherMap[site.id];
            const isSelected = site.id === selected;
            const diffClass = diffColors[site.difficulty] || "bg-slate-200 text-slate-600 border-slate-400";
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
                      ? "bg-gradient-to-r from-slate-200 to-slate-50 border-slate-400 shadow-md scale-[1.02]"
                      : "bg-white/90 border-slate-200 hover:bg-slate-100 hover:border-slate-400 hover:scale-[1.01]"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[12px] font-semibold text-slate-800 truncate block leading-snug ${isSelected ? "text-blue-900" : ""}`}>
                        {site.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${diffClass}`}>
                        D{site.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <span className="text-slate-400">📍</span>
                        {site.exposure}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{site.altitude}m</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="truncate">{site.valley}</span>
                    </div>
                  </div>
                  {w && (
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-lg leading-none">{wic(w.weatherCode, true)}</span>
                      <span className={`text-xs font-bold ${isSelected ? "text-blue-800" : "text-slate-700"}`}>
                        {Math.round(w.temperature)}°
                      </span>
                    </div>
                  )}
                </div>
                {w && (
                  <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-200">
                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Wind className="w-3 h-3 text-slate-500" />
                      <span className="font-medium">{w.windSpeed} km/h</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-700">
                      <Thermometer className="w-3 h-3 text-amber-600" />
                      <span className="font-medium">{Math.round(w.temperature)}°C</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-medium">{w.humidity}%</span>
                    </div>
                  </div>
                )}
                {!w && (
                  <div className="text-[10px] text-slate-400 mt-1 italic flex items-center gap-1">
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