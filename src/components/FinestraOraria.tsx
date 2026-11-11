"use client";

import React from "react";
import { Wind, Timer, Gauge, ArrowUp, Mountain, CheckCircle, AlertCircle, AlertTriangle, XCircle } from "lucide-react";

function direzioneFreccia(dir: number): string {
  if (dir >= 337 || dir < 22) return "↑ N";
  if (dir >= 22 && dir < 67) return "↗ NE";
  if (dir >= 67 && dir < 112) return "→ E";
  if (dir >= 112 && dir < 157) return "↘ SE";
  if (dir >= 157 && dir < 202) return "↓ S";
  if (dir >= 202 && dir < 247) return "↙ SW";
  if (dir >= 247 && dir < 292) return "← W";
  return "↖ NW";
}

function coloreVento(speed: number): string {
  if (speed <= 10) return "#4CAF50";
  if (speed <= 18) return "#FFC107";
  if (speed <= 25) return "#FF9800";
  return "#F44336";
}

function qualitàVolo(speed: number, gust: number): { label: string; icon: React.ReactNode; color: string; bg: string } {
  if (speed <= 10 && gust <= 18) {
    return {
      label: "Ottimo",
      icon: <CheckCircle className="w-4 h-4" />,
      color: "text-green-400",
      bg: "bg-green-900/20 border-green-500/40"
    };
  }
  if (speed <= 15 && gust <= 22) {
    return {
      label: "Buono",
      icon: <AlertCircle className="w-4 h-4" />,
      color: "text-amber-400",
      bg: "bg-amber-900/20 border-amber-500/40"
    };
  }
  if (speed <= 22 && gust <= 30) {
    return {
      label: "Difficile",
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-orange-400",
      bg: "bg-orange-900/20 border-orange-500/40"
    };
  }
  return {
    label: "Sconsigliato",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400",
    bg: "bg-red-900/20 border-red-500/40"
  };
}

interface DatoOrario {
  ora: number;
  quote: Record<number, { speed: number; dir: number }>;
  gust: number;
  base?: number;
  top?: number;
  temp?: number;
}

interface FinestraOrariaProps {
  ventoOrario?: DatoOrario[];
  quotaDecollo?: number;
}

export default function FinestraOraria({ ventoOrario = [], quotaDecollo = 1000 }: FinestraOrariaProps) {
  if (!ventoOrario || ventoOrario.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-10 text-center">
        <Wind className="w-14 h-14 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-base">Nessun dato disponibile per questa giornata.</p>
      </div>
    );
  }

  const now = new Date().getHours();

  return (
    <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/60 border border-slate-700/40 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/40 border-b border-slate-700/30">
        <div className="flex items-center gap-2.5">
          <Timer className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Previsione oraria (09–19)</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Mountain className="w-4 h-4 text-amber-400" />
          <span>Decollo {quotaDecollo}m</span>
        </div>
      </div>

      {/* Header colonne */}
      <div className="hidden lg:grid grid-cols-[60px_1fr_80px_80px_80px_120px] gap-3 px-5 py-2.5 bg-slate-800/30 border-b border-slate-700/20 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        <span>Ora</span>
        <span>Vento decollo</span>
        <span>Raffiche</span>
        <span>Direzione</span>
        <span>Base</span>
        <span>Volo</span>
      </div>

      {/* Righe orarie */}
      <div className="divide-y divide-slate-700/20">
        {ventoOrario.map((v) => {
          const vento = v.quote?.[quotaDecollo] || { speed: 0, dir: 0 };
          const speed = vento.speed || 0;
          const gust = v.gust || 0;
          const qv = qualitàVolo(speed, gust);
          const isCurrent = v.ora === now;

          return (
            <div
              key={v.ora}
              className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[60px_1fr_80px_80px_80px_120px] gap-2 lg:gap-3 px-5 py-3 items-center transition-all ${
                isCurrent
                  ? "bg-emerald-900/20 border-l-4 border-l-emerald-400"
                  : "hover:bg-slate-800/30"
              }`}
            >
              {/* Ora */}
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black tabular-nums ${
                  isCurrent ? "text-emerald-300" : "text-white"
                }`}>
                  {String(v.ora).padStart(2, "0")}:00
                </span>
                {isCurrent && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-900/50 px-1.5 py-0.5 rounded-full">Adesso</span>
                )}
              </div>

              {/* Vento decollo */}
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: coloreVento(speed) }} />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{speed} km/h</span>
                  <span className="text-[10px] text-slate-500">{direzioneFreccia(vento.dir)}</span>
                </div>
              </div>

              {/* Raffiche */}
              <div className="flex items-center gap-1.5 text-sm">
                <Gauge className="w-4 h-4 text-red-300 shrink-0" />
                <span className="font-bold text-red-200">{gust} km/h</span>
              </div>

              {/* Direzione (solo desktop) */}
              <div className="hidden sm:block text-sm font-bold text-sky-300 text-center">
                {direzioneFreccia(vento.dir)}
              </div>

              {/* Base termica */}
              <div className="hidden sm:flex items-center gap-1.5 text-sm">
                <ArrowUp className="w-4 h-4 text-green-400 shrink-0" />
                <span className="font-bold text-green-300">{v.base ? `${v.base}m` : "—"}</span>
              </div>

              {/* Qualità volo */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${qv.bg} ${qv.color}`}>
                {qv.icon}
                <span>{qv.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-slate-700/20 bg-slate-800/20">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#4CAF50" }} /> ≤10
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FFC107" }} /> 11-18
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FF9800" }} /> 19-25
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#F44336" }} /> {'>'}25
        </div>
        <span className="text-[10px] text-slate-500 ml-auto">km/h</span>
      </div>
    </div>
  );
}