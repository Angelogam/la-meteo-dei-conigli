"use client";

import React from "react";
import { Star, TrendingUp, Clock } from "lucide-react";

interface FlightScoreProps {
  score: number;
  label: string;
  bestHour?: number;
  bestRateo?: number;
  oreAttive?: number;
  totaleOre?: number;
  thermalLabel?: string;
}

const getScoreMeta = (s: number) => {
  if (s >= 8) return { color: "#22c55e", bg: "from-emerald-500/10", border: "border-emerald-500/30", label: "Eccellente" };
  if (s >= 6) return { color: "#84cc16", bg: "from-lime-500/10", border: "border-lime-500/30", label: "Buona" };
  if (s >= 4) return { color: "#eab308", bg: "from-yellow-500/10", border: "border-yellow-500/30", label: "Discreta" };
  if (s >= 2) return { color: "#f97316", bg: "from-orange-500/10", border: "border-orange-500/30", label: "Mediocre" };
  return { color: "#ef4444", bg: "from-red-500/10", border: "border-red-500/30", label: "Scarsa" };
};

export default function FlightScore({ score, bestHour, bestRateo, oreAttive, totaleOre, thermalLabel }: FlightScoreProps) {
  const meta = getScoreMeta(score);
  const clamped = Math.max(0, Math.min(10, score));

  return (
    <div className={`rounded-xl border ${meta.border} bg-gradient-to-br ${meta.bg} to-transparent p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Cerchio punteggio */}
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="16"
                fill="none"
                stroke={meta.color}
                strokeWidth="3"
                strokeDasharray={`${(clamped / 10) * 100} 100`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold tabular-nums" style={{ color: meta.color }}>
                {clamped.toFixed(0)}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingUp className="w-4 h-4" style={{ color: meta.color }} />
              <span className="text-sm font-semibold text-slate-200">
                {meta.label}
              </span>
            </div>
            {oreAttive != null && totaleOre != null && (
              <p className="text-xs text-slate-500">
                <strong className="text-slate-400">{oreAttive}</strong>/{totaleOre} ore volabili
                {bestHour != null && bestRateo != null && (
                  <span> · Migliore <strong className="text-amber-400">{String(bestHour).padStart(2,"0")}:00</strong> ({bestRateo.toFixed(1)} m/s)</span>
                )}
              </p>
            )}
            {thermalLabel && (
              <p className="text-xs text-slate-500 mt-0.5">{thermalLabel}</p>
            )}
          </div>
        </div>

        {/* Stelle */}
        <div className="flex gap-0.5 shrink-0">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3 h-3 ${s <= Math.round(clamped / 2) ? "text-yellow-500 fill-yellow-500" : "text-slate-700"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
