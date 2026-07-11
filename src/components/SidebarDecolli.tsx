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
  1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  2: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  3: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  4: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  5: "bg-red-500/20 text-red-400 border-red-500/30",
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden" />
      )}

      {/* Sidebar - a sinistra */}
      <div
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-full w-80 max-w-[88vw] z-40
          bg-gradient-to-b from-gray-900/95 via-slate-900/95 to-gray-900/95
          backdrop-blur-xl
          border-r border-white/10 shadow-2xl
          transition-all duration-350 ease-out
          overflow-y-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:relative md:z-auto md:h-auto md:max-h-[calc(100vh-8rem)] md:w-72 md:rounded-2xl md:border md:border-white/10 md:mr-4 md:shadow-xl md:sticky md:top-4
        `}
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        {/* Header sidebar */}
        <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <span className="text-base">🪂</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Decolli
              </h2>
              <p className="text-[10px] text-blue-300/60 font-medium">
                {DECOLLI.length} siti disponibili
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 transition-colors md:hidden border border-white/5"
            aria-label="Chiudi sidebar"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Lista decolli */}
        <div className="p-3 space-y-2">
          {DECOLLI.map((site) => {
            const w = weatherMap[site.id];
            const isSelected = site.id === selected;
            const diffClass = diffColors[site.difficulty] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
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
                      ? "bg-gradient-to-r from-orange-900/50 to-orange-800/20 border-orange-500/60 shadow-lg shadow-orange-500/10 scale-[1.02]"
                      : "bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.08] hover:border-white/[0.15] hover:scale-[1.01]"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[12px] font-semibold text-white/90 truncate block leading-snug ${isSelected ? "text-orange-200" : ""}`}>
                        {site.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${diffClass}`}>
                        D{site.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-0.5">
                        <span className="text-gray-500">📍</span>
                        {site.exposure}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span>{site.altitude}m</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span className="truncate">{site.valley}</span>
                    </div>
                  </div>
                  {w && (
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-lg leading-none">{wic(w.weatherCode, true)}</span>
                      <span className={`text-xs font-bold ${isSelected ? "text-orange-300" : "text-white"}`}>
                        {Math.round(w.temperature)}°
                      </span>
                    </div>
                  )}
                </div>
                {w && (
                  <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-white/5">
                    <div className="flex items-center gap-1 text-[10px] text-blue-300/70">
                      <Wind className="w-3 h-3 text-blue-400/60" />
                      <span className="font-medium">{w.windSpeed} km/h</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-300/70">
                      <Thermometer className="w-3 h-3 text-amber-400/60" />
                      <span className="font-medium">{Math.round(w.temperature)}°C</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-300/70">
                      <span className="w-2 h-2 rounded-full bg-emerald-400/40" />
                      <span className="font-medium">{w.humidity}%</span>
                    </div>
                  </div>
                )}
                {!w && (
                  <div className="text-[10px] text-gray-600 mt-1 italic flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse" />
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