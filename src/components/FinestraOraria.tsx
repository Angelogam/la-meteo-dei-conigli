"use client";

import React from "react";
import { Wind, Cloud, Thermometer, ArrowUp, Gauge, Timer } from "lucide-react";

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

function coloreBgVento(speed: number): string {
  if (speed <= 10) return "bg-green-900/20 border-green-500/30";
  if (speed <= 18) return "bg-amber-900/20 border-amber-500/30";
  if (speed <= 25) return "bg-orange-900/20 border-orange-500/30";
  return "bg-red-900/20 border-red-500/30";
}

function coloreBgTermiche(rateo: number): string {
  if (rateo >= 4) return "bg-red-900/30";
  if (rateo >= 3) return "bg-orange-900/30";
  if (rateo >= 2) return "bg-amber-900/30";
  if (rateo >= 1) return "bg-lime-900/30";
  if (rateo >= 0.3) return "bg-emerald-900/20";
  return "bg-slate-800/30";
}

function coloreTestoTermiche(rateo: number): string {
  if (rateo >= 4) return "text-red-300";
  if (rateo >= 3) return "text-orange-300";
  if (rateo >= 2) return "text-amber-300";
  if (rateo >= 1) return "text-lime-300";
  if (rateo >= 0.3) return "text-emerald-300";
  return "text-slate-500";
}

interface DatoOrario {
  ora: number;
  speed: number;
  dir: number;
  gust: number;
  temp?: number;
  cloudCover?: number;
  rateoTermico?: number;
  baseTermica?: number;
  topTermico?: number;
}

interface FinestraOrariaProps {
  ventoOrario?: DatoOrario[];
  quotaDecollo?: number;
}

export default function FinestraOraria({ ventoOrario = [], quotaDecollo = 1000 }: FinestraOrariaProps) {
  if (!ventoOrario || ventoOrario.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 text-center">
        <Wind className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-base">Nessun dato disponibile per questa giornata.</p>
      </div>
    );
  }

  const now = new Date().getHours();

  return (
    <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/60 border border-slate-700/40 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-800/40 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Previsione oraria</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5" /> km/h</span>
          <span className="flex items-center gap-1"><ArrowUp className="w-3.5 h-3.5" /> m/s</span>
        </div>
      </div>

      {/* Header colonne */}
      <div className="hidden md:grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-2 bg-slate-800/30 border-b border-slate-700/20 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        <span>Ora</span>
        <span>Vento decollo</span>
        <span>Raffiche</span>
        <span>Direzione</span>
        <span>Temp</span>
        <span>Termiche</span>
      </div>

      {/* Righe orarie */}
      <div className="divide-y divide-slate-700/20">
        {ventoOrario.map((v) => {
          const isCurrent = v.ora === now;
          const speed = v.speed || 0;
          const gust = v.gust || 0;
          const temp = v.temp ?? 20;
          const rateo = v.rateoTermico ?? 0;
          const base = v.baseTermica ?? 0;
          const top = v.topTermico ?? 0;

          return (
            <div
              key={v.ora}
              className={`grid grid-cols-2 md:grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-3 items-center transition-all ${
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
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  speed <= 10 ? "bg-green-400" : speed <= 18 ? "bg-amber-400" : speed <= 25 ? "bg-orange-400" : "bg-red-400"
                }`} />
                <span className="text-sm font-bold text-white">{speed} km/h</span>
              </div>

              {/* Raffiche */}
              <div className="text-sm text-slate-300 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-red-300" />
                {gust} km/h
              </div>

              {/* Direzione */}
              <div className="text-sm font-bold text-sky-300">
                {direzioneFreccia(v.dir)}
              </div>

              {/* Temperatura */}
              <div className="flex items-center gap-1 text-sm">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white">{Math.round(temp)}°C</span>
              </div>

              {/* Termiche */}
              <div className={`text-sm font-bold ${coloreTestoTermiche(rateo)}`}>
                {rateo > 0 ? (
                  <span>{rateo.toFixed(1)} m/s</span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
                {rateo > 1 && (
                  <span className="text-[10px] text-slate-400 ml-1">
                    B{base}m T{top}m
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 px-5 py-3 border-t border-slate-700/20 bg-slate-800/20">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> ≤10
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> 11-18
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> 19-25
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> {'>'}25
        </div>
      </div>
    </div>
  );
}