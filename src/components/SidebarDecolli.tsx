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
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" />
      )}

      {/* Sidebar - ora a sinistra */}
      <div
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-full w-72 max-w-[85vw] z-40
          bg-gradient-to-b from-gray-900 via-slate-900 to-gray-900
          border-r border-white/10 shadow-2xl
          transition-all duration-300 ease-in-out
          overflow-y-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:relative md:z-auto md:h-auto md:max-h-[calc(100vh-8rem)] md:w-64 md:rounded-2xl md:border md:border-white/10 md:mr-3 md:shadow-lg md:sticky md:top-4
        `}
      >
        {/* Header sidebar */}
        <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-3 py-2.5">
          <h2 className="text-sm font-bold text-orange-400 flex items-center gap-1.5">
            <span className="text-base">🪂</span>
            Decolli
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors md:hidden"
            aria-label="Chiudi sidebar"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Lista decolli */}
        <div className="p-2 space-y-1.5">
          {DECOLLI.map((site) => {
            const w = weatherMap[site.id];
            const isSelected = site.id === selected;
            return (
              <button
                key={site.id}
                onClick={() => {
                  onSelect(site.id);
                  // Su mobile chiudi la sidebar dopo la selezione
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={`
                  w-full text-left rounded-xl px-2.5 py-2 transition-all duration-200 border
                  ${
                    isSelected
                      ? "bg-orange-900/40 border-orange-500/50 shadow-md shadow-orange-500/10"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-white/90 truncate block leading-tight">
                      {site.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {site.altitude}m
                    </span>
                  </div>
                  {w && (
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <span className="text-sm">{wic(w.weatherCode, true)}</span>
                      <span className="text-xs font-bold text-white">{Math.round(w.temperature)}°</span>
                    </div>
                  )}
                </div>
                {w && (
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <Wind className="w-2.5 h-2.5" />
                      {w.windSpeed} km/h
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Thermometer className="w-2.5 h-2.5" />
                      {Math.round(w.temperature)}°C
                    </span>
                  </div>
                )}
                {!w && (
                  <div className="text-[10px] text-gray-500 mt-1 italic">N/D</div>
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