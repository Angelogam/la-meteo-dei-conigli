"use client";

import React, { useState } from "react";
import type { TermicheResult } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheResult }[];
  oraCorrente: number;
}

const HOURS_VISIBILI = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const GraficoTermiche = ({ hourly, oraCorrente }: GraficoTermicheProps) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  if (!hourly || hourly.length === 0) {
    return <div className="text-center py-8 text-slate-500">Nessun dato termico</div>;
  }

  const daMostrare = HOURS_VISIBILI.map((h) => {
    const trovato = hourly.find((x) => x.hour === h);
    if (trovato) return trovato;
    for (let i = h + 1; i <= h + 2; i++) {
      const vicino = hourly.find((x) => x.hour === i);
      if (vicino) return vicino;
    }
    return { hour: h, termiche: { rateo: 0, forza: 0, base: 0, top: 0, label: "N/D", colore: "#475569", gradienteReale: 0, attendibilita: 0 } as TermicheResult };
  });

  const maxVal = Math.max(...daMostrare.map((d) => d.termiche.rateo), 0.1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {daMostrare.map((d) => {
          const pct = (d.termiche.rateo / maxVal) * 100;
          const isSelected = d.hour === selectedHour;
          const isCorrente = d.hour === oraCorrente;

          return (
            <button
              key={d.hour}
              onClick={() => setSelectedHour(d.hour === selectedHour ? null : d.hour)}
              className={`flex flex-col items-center flex-1 transition-all rounded cursor-pointer p-1 ${
                isSelected ? "bg-green-900/30 scale-110" : isCorrente ? "bg-emerald-900/20" : "hover:bg-slate-700/30"
              }`}
            >
              <div className="w-full h-24 bg-slate-800/60 rounded-md relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(pct, 3)}%`,
                    backgroundColor: d.termiche.colore || "#475569",
                    opacity: d.termiche.rateo > 0 ? 0.8 : 0.3,
                  }}
                />
              </div>
              <span className={`text-[10px] mt-1 font-mono ${isSelected ? "text-green-300 font-bold" : "text-slate-500"}`}>
                {String(d.hour).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      {selectedHour !== null && (
        <div className="bg-slate-800/60 rounded-xl p-3 border border-green-400/30 text-center">
          <div className="text-xs text-slate-400 mb-1">Ore {String(selectedHour).padStart(2, "0")}:00</div>
          <div className="text-lg font-bold text-green-300">
            {daMostrare.find((d) => d.hour === selectedHour)?.termiche.rateo.toFixed(1) || "0.0"} m/s
          </div>
          <div className="text-xs text-slate-400">
            Base {daMostrare.find((d) => d.hour === selectedHour)?.termiche.base || 0}m
            · Top {daMostrare.find((d) => d.hour === selectedHour)?.termiche.top || 0}m
          </div>
        </div>
      )}
    </div>
  );
};

export default GraficoTermiche;