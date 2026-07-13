"use client";

import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Navigation,
  Sparkles,
} from "lucide-react";

interface DecolloItem {
  id: string;
  name: string;
  valley: string;
  exposure: string;
  alt: number;
}

interface DecolloListProps {
  decolli: DecolloItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentData: any;
}

const DecolloList = ({ decolli, selectedId, onSelect, currentData }: DecolloListProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 rounded-2xl border border-emerald-500/20">
        <Navigation className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-black text-emerald-300 tracking-wider uppercase">Decolli</h3>
        <span className="text-[10px] text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full ml-auto">
          {decolli.length}
        </span>
      </div>

      <div className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
        {decolli.map((site) => {
          const isSelected = site.id === selectedId;
          return (
            <button
              key={site.id}
              onClick={() => onSelect(site.id)}
              className={`
                w-full text-left rounded-2xl px-3.5 py-3 transition-all duration-200 border-2
                ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-900/50 to-slate-800/70 border-emerald-400/60 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                    : "bg-slate-800/40 border-slate-700/30 hover:bg-slate-700/50 hover:border-slate-600/50 hover:scale-[1.01]"
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-sm font-black truncate block leading-snug tracking-tight ${
                      isSelected ? "text-white neon-green" : "text-slate-200"
                    }`}>
                      {site.name}
                    </span>
                    {isSelected && (
                      <Sparkles className="w-3 h-3 text-emerald-400 animate-twinkle shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <Compass className="w-3 h-3 text-sky-400" />
                      {site.exposure}
                    </span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                    <span className="flex items-center gap-0.5">
                      <Mountain className="w-3 h-3 text-amber-400" />
                      <span className="font-bold text-amber-300">{site.alt}</span>m
                    </span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate">{site.valley}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-300/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold tracking-wide uppercase">Selezionato</span>
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