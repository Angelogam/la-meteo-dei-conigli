"use client";

import React from "react";
import { ArrowUpDown, Thermometer, Wind, Cloud, MapPin } from "lucide-react";

interface DecolloData {
  id: string;
  nome: string;
  temp: number;
  vento: number;
  ventoDir: string;
  nuvole: number;
  alt: number;
  score: number;
}

interface DecolloComparisonProps {
  decolli: DecolloData[];
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-lime-400";
  if (score >= 4) return "text-amber-400";
  if (score >= 2) return "text-orange-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-emerald-900/30 border-emerald-500/30";
  if (score >= 6) return "bg-lime-900/30 border-lime-500/30";
  if (score >= 4) return "bg-amber-900/30 border-amber-500/30";
  if (score >= 2) return "bg-orange-900/30 border-orange-500/30";
  return "bg-red-900/30 border-red-500/30";
}

export default function DecolloComparison({ decolli }: DecolloComparisonProps) {
  if (!decolli || decolli.length === 0) return null;

  // Ordina per score decrescente
  const sorted = [...decolli].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-sky-500/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ArrowUpDown className="w-5 h-5 text-sky-400" />
        <h3 className="text-sm font-bold text-sky-300 uppercase tracking-wider">Confronto decolli</h3>
      </div>

      <div className="space-y-2">
        {sorted.map((d, i) => (
          <div key={d.id} className={`rounded-xl p-3 border ${scoreBg(d.score)}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold w-5">#{i + 1}</span>
                <span className="text-sm font-bold text-white">{d.nome}</span>
              </div>
              <span className={`text-lg font-extrabold ${scoreColor(d.score)}`}>
                {d.score}/10
              </span>
            </div>

            {/* Barra score */}
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${d.score * 10}%` }}
              />
            </div>

            <div className="grid grid-cols-4 gap-2 text-[10px] mt-2">
              <div className="flex items-center gap-1 text-amber-300">
                <Thermometer className="w-3 h-3" />
                <span className="font-bold">{Math.round(d.temp)}°C</span>
              </div>
              <div className="flex items-center gap-1 text-sky-300">
                <Wind className="w-3 h-3" />
                <span className="font-bold">{Math.round(d.vento)} km/h</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <Cloud className="w-3 h-3" />
                <span className="font-bold">{Math.round(d.nuvole)}%</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <MapPin className="w-3 h-3" />
                <span className="font-bold">{d.alt}m</span>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 mt-1">
              Vento da {d.ventoDir}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}