"use client";

import React from "react";
import { Thermometer, ArrowUp, Wind, Droplets, Gauge, Sun, Cloud, TrendingUp, Info } from "lucide-react";
import type { TermicheData } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

const QUOTE = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];

const LEGENDA: { colore: string; label: string; soglia: [number, number] }[] = [
  { colore: "#ef4444", label: "Forte (>3 m/s)", soglia: [3, 10] },
  { colore: "#f97316", label: "Buona (2-3 m/s)", soglia: [2, 3] },
  { colore: "#eab308", label: "Moderata (1-2 m/s)", soglia: [1, 2] },
  { colore: "#84cc16", label: "Debole (0.3-1 m/s)", soglia: [0.3, 1] },
  { colore: "#64748b", label: "Assente (<0.3 m/s)", soglia: [0, 0.3] },
];

function getColoreDaRateo(rateo: number): string {
  if (rateo >= 3) return "#ef4444";
  if (rateo >= 2) return "#f97316";
  if (rateo >= 1) return "#eab308";
  if (rateo >= 0.3) return "#84cc16";
  return "#64748b";
}

const GraficoTermiche = ({ hourly, oraCorrente }: GraficoTermicheProps) => {
  if (!hourly || hourly.length === 0) return null;

  // Raggruppa per ora: calcola la forza termica media per ogni ora
  const oreMostrate = hourly
    .filter(h => h.hour >= 8 && h.hour <= 19)
    .sort((a, b) => a.hour - b.hour);

  // Trova il rateo massimo per scala
  const maxRateo = Math.max(...oreMostrate.map(h => h.termiche.rateo), 0.3);

  return (
    <div className="w-full py-3 px-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-7 h-7 rounded-lg bg-amber-800/50 border border-amber-500/50 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-amber-200">Termiche · quota 0–4000m</h3>
          <p className="text-[8px] text-slate-400">Step 500m · Forza in m/s per fascia oraria</p>
        </div>
      </div>

      {/* Grafico a barre orizzontali: per ogni ora, barra da 0 a 4000m con colore = forza */}
      <div className="space-y-0.5">
        {oreMostrate.map((h) => {
          const t = h.termiche;
          const isCurrentHour = h.hour === oraCorrente;
          const colore = getColoreDaRateo(t.rateo);

          // Calcola la percentuale di quota raggiunta (top) rispetto a 4000m
          const quotaMax = Math.min(4000, t.top);
          const percentQuota = Math.round((quotaMax / 4000) * 100);

          return (
            <div
              key={h.hour}
              className={`relative flex items-center gap-1.5 py-1 px-1.5 rounded-lg transition-all ${
                isCurrentHour
                  ? "bg-green-900/30 border-l-2 border-green-400 scale-[1.02]"
                  : "hover:bg-slate-700/30"
              }`}
            >
              {/* Ora */}
              <div className="shrink-0 w-8 text-[9px] font-mono font-bold text-slate-400">
                {String(h.hour).padStart(2, "0")}:00
              </div>

              {/* Barra quota 0-4000m */}
              <div className="flex-1 h-5 bg-slate-700/60 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(percentQuota, 5)}%`,
                    backgroundColor: colore,
                    opacity: 0.85,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <span className="text-[9px] font-bold text-white drop-shadow-md">
                    {t.rateo.toFixed(1)} m/s
                  </span>
                  <span className="text-[8px] text-white/70 drop-shadow-md">
                    {quotaMax}m
                  </span>
                </div>
              </div>

              {/* Etichetta forza */}
              <div className="shrink-0 w-12 text-right">
                <span className="text-[9px] font-bold text-amber-200" style={{ color: colore }}>
                  {t.label.split(" ")[0]}
                </span>
              </div>

              {isCurrentHour && <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            </div>
          );
        })}
      </div>

      {/* Info quote */}
      <div className="mt-2 pt-2 border-t border-slate-600/30 px-1">
        <div className="flex items-center gap-1 mb-1.5">
          <Info className="w-2.5 h-2.5 text-slate-400" />
          <span className="text-[8px] font-medium text-slate-400">Quote (m slm)</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUOTE.map((q, i) => (
            <span key={q} className="text-[7px] text-slate-500">
              {q}m{i < QUOTE.length - 1 ? " ·" : ""}
            </span>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-2 pt-1.5 border-t border-slate-600/30">
        <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-400">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <ArrowUp className="w-2 h-2 text-amber-400 shrink-0" />
            <span>Quota max raggiunta</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;