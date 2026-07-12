"use client";

import React from "react";
import { Thermometer, ArrowUp, Wind, Droplets, Gauge, Sun, Cloud, TrendingUp, Info } from "lucide-react";
import type { TermicheData } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

const LEGENDA: { colore: string; label: string }[] = [
  { colore: "#ef4444", label: "Termiche forti (+7)" },
  { colore: "#f97316", label: "Buone termiche (5-7)" },
  { colore: "#eab308", label: "Moderate (3-5)" },
  { colore: "#84cc16", label: "Deboli (1-3)" },
  { colore: "#64748b", label: "Assenti (0)" },
];

const GraficoTermiche = ({ hourly, oraCorrente }: GraficoTermicheProps) => {
  if (!hourly || hourly.length === 0) return null;

  const maxForza = Math.max(...hourly.map((h) => h.termiche.forza), 1);

  return (
    <div className="w-full py-4 px-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-800/50 border border-amber-500/50 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-200">Forza termiche & quota massima</h3>
          <p className="text-[10px] text-slate-400">
            Elaborazione in tempo reale basata su vento, sole e umidit&agrave;
          </p>
        </div>
      </div>

      {/* Grafico a barre orizzontali */}
      <div className="space-y-1">
        {hourly.map((h) => {
          const t = h.termiche;
          const isCurrentHour = h.hour === oraCorrente;
          const forzaPercent = Math.round((t.forza / maxForza) * 100);
          const metriSalita = t.top - t.base;
          // Quota massima raggiungibile = top (base + salita)
          const quotaMax = t.top;

          return (
            <div
              key={h.hour}
              className={`relative flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all ${
                isCurrentHour
                  ? "bg-green-900/30 border-l-2 border-green-400 scale-[1.02]"
                  : "hover:bg-slate-700/30"
              }`}
            >
              {/* Ora */}
              <div className="shrink-0 w-10 text-[11px] font-mono font-bold text-slate-400">
                {String(h.hour).padStart(2, "0")}:00
              </div>

              {/* Barra forza */}
              <div className="flex-1 h-5 bg-slate-700/60 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${forzaPercent}%`,
                    backgroundColor: t.colore,
                    opacity: 0.8,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold text-white drop-shadow-md">
                    {t.forza.toFixed(1)}/10
                  </span>
                  <span className="text-[9px] text-white/70 drop-shadow-md">{t.label.split(" ")[0]}</span>
                </div>
              </div>

              {/* Quota massima raggiungibile */}
              <div className="shrink-0 w-20 text-right">
                <span className="text-[11px] font-bold text-amber-200 drop-shadow-sm">
                  &uarr; {quotaMax > 0 ? `${quotaMax}m` : "&mdash;"}
                </span>
                <div className="text-[8px] text-slate-500">quota max</div>
              </div>

              {/* Rateo */}
              <div className="shrink-0 w-12 text-right">
                <span className="text-[11px] font-bold text-green-300">{t.rateo} m/s</span>
              </div>

              {isCurrentHour && <div className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 pt-3 border-t border-slate-600/50">
        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <ArrowUp className="w-3 h-3 text-amber-400" />
            <span>Quota massima</span>
          </div>
        </div>
      </div>

      {/* Info calcolo */}
      <div className="mt-3 p-2 rounded-lg bg-slate-800/60 border border-slate-600/30">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Info className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] font-medium text-slate-400">Fattori considerati</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <Sun className="w-2.5 h-2.5 text-amber-400" />
            Gradiente termico
          </span>
          <span className="flex items-center gap-1">
            <Wind className="w-2.5 h-2.5 text-blue-400" />
            Vento (5-15 km/h ideale)
          </span>
          <span className="flex items-center gap-1">
            <Cloud className="w-2.5 h-2.5 text-slate-400" />
            Nuvole (10-30% ideale)
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="w-2.5 h-2.5 text-blue-300" />
            Umidit&agrave; (30-50% ideale)
          </span>
          <span className="flex items-center gap-1">
            <Gauge className="w-2.5 h-2.5 text-purple-400" />
            Pressione (+1015 hPa ideale)
          </span>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;