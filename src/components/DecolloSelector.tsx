"use client";

import React from "react";
import { X, MapPin, Mountain, Compass, Navigation, Sparkles } from "lucide-react";
import { DECOLLI } from "@/data/decolli";

interface DecolloSelectorProps {
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function DecolloSelector({ currentIndex, onSelect, onClose }: DecolloSelectorProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Tutti i decolli ({DECOLLI.length})</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 border border-slate-600/40 transition-all">
          <X className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      {/* Lista scrollabile */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {DECOLLI.map((site, i) => {
          const isSelected = i === currentIndex;
          return (
            <button
              key={site.id}
              onClick={() => { onSelect(i); onClose(); }}
              className={`w-full text-left rounded-xl p-3.5 transition-all border-2 cursor-pointer ${
                isSelected
                  ? "bg-emerald-900/50 border-emerald-500 shadow-lg"
                  : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/50 hover:border-slate-600/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "bg-emerald-800/60 border border-emerald-500/50"
                    : "bg-slate-700/50 border border-slate-600/40"
                }`}>
                  <span className="text-sm font-black text-white">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className={`text-sm font-bold truncate ${
                      isSelected ? "text-emerald-200" : "text-white"
                    }`}>
                      {site.name}
                    </h3>
                    {isSelected && <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3 h-3 text-sky-400 shrink-0" />
                      {site.exposure}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mountain className="w-3 h-3 text-amber-400 shrink-0" />
                      {site.altitude}m
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      {site.valley}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                    Attivo
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}