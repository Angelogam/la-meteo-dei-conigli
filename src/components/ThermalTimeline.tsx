"use client";

import React, { useMemo } from "react";

interface ThermalTimelineProps {
  hourlyData: { ora: number; rateo: number; temp: number; vento: number }[];
  selectedHour: number;
  onHourSelect: (ora: number) => void;
}

export default function ThermalTimeline({ hourlyData, selectedHour, onHourSelect }: ThermalTimelineProps) {
  if (!hourlyData || hourlyData.length === 0) return null;

  const maxRateo = useMemo(() => Math.max(...hourlyData.map(h => h.rateo), 0.1), [hourlyData]);

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-orange-500/30 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-orange-300 mb-4 flex items-center gap-2 tracking-wide uppercase">
        <span>🔥 Timeline termiche</span>
        <span className="text-xs text-slate-500 font-normal normal-case">(m/s)</span>
      </h3>

      <div className="flex items-end gap-2 h-48 pb-8 relative">
        {/* Linea di fondo */}
        <div className="absolute left-0 right-0 top-0 bottom-8 border-t border-slate-700/30" />

        {hourlyData.map((h, i) => {
          const pct = (h.rateo / maxRateo) * 100;
          const isSelected = h.ora === selectedHour;

          // Colore in base al rateo
          let barColor = "bg-slate-700";
          let glowColor = "shadow-none";
          if (h.rateo >= 3) { barColor = "bg-gradient-to-t from-red-500 to-red-400"; glowColor = "shadow-red-500/30"; }
          else if (h.rateo >= 2) { barColor = "bg-gradient-to-t from-orange-500 to-orange-400"; glowColor = "shadow-orange-500/30"; }
          else if (h.rateo >= 1) { barColor = "bg-gradient-to-t from-amber-500 to-amber-400"; glowColor = "shadow-amber-500/30"; }
          else if (h.rateo >= 0.3) { barColor = "bg-gradient-to-t from-green-500 to-green-400"; glowColor = "shadow-green-500/20"; }

          return (
            <button
              key={h.ora}
              onClick={() => onHourSelect(h.ora)}
              className={`flex-1 flex flex-col items-center group transition-all duration-300 ${
                isSelected ? "scale-110 z-10" : "hover:scale-105"
              }`}
            >
              {/* Rateo label */}
              <span className={`text-[9px] font-bold mb-1 transition-all ${
                h.rateo >= 2 ? "text-orange-300" :
                h.rateo >= 1 ? "text-amber-300" :
                h.rateo >= 0.3 ? "text-green-300" :
                "text-slate-600"
              }`}>
                {h.rateo.toFixed(1)}
              </span>

              {/* Barra */}
              <div className={`w-full rounded-lg overflow-hidden transition-all duration-300 ${
                isSelected ? "ring-2 ring-white/30" : ""
              }`}>
                <div
                  className={`${barColor} ${glowColor} rounded-lg transition-all duration-500`}
                  style={{
                    height: `${Math.max(pct, 3)}%`,
                    minHeight: "4px",
                  }}
                />
              </div>

              {/* Ora label */}
              <span className={`text-[9px] mt-2 font-mono font-bold ${
                isSelected ? "text-orange-300" : "text-slate-500"
              }`}>
                {String(h.ora).padStart(2, "0")}
              </span>

              {/* Tooltip su hover */}
              <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20`}>
                {Math.round(h.temp)}°C · {Math.round(h.vento)} km/h
              </div>
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 mt-4 pt-3 border-t border-slate-700/30">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500" /> ≥3 — Forti
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-orange-500" /> 2-3 — Buone
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500" /> 1-2 — Moderate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500" /> 0.3-1 — Deboli
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="bg-slate-900/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Picco termico</div>
          <div className="text-lg font-bold text-orange-300">
            {hourlyData.reduce((max, h) => h.rateo > max ? h.rateo : max, 0).toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500">m/s</div>
        </div>
        <div className="bg-slate-900/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Media</div>
          <div className="text-lg font-bold text-amber-300">
            {(hourlyData.reduce((s, h) => s + h.rateo, 0) / hourlyData.length).toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500">m/s</div>
        </div>
        <div className="bg-slate-900/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Ore attive</div>
          <div className="text-lg font-bold text-emerald-300">
            {hourlyData.filter(h => h.rateo >= 0.3).length}/{hourlyData.length}
          </div>
          <div className="text-[10px] text-slate-500">≥0.3 m/s</div>
        </div>
      </div>
    </div>
  );
}