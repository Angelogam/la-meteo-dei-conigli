"use client";

import React from "react";
import { Sparkles, Star, TrendingUp } from "lucide-react";

interface FlightScoreProps {
  score: number;
  label: string;
  bestHour?: number;
  bestRateo?: number;
  oreAttive?: number;
  totaleOre?: number;
  thermalLabel?: string;
}

export default function FlightScore({
  score,
  label,
  bestHour,
  bestRateo,
  oreAttive,
  totaleOre,
  thermalLabel,
}: FlightScoreProps) {
  // Determina colore in base allo score
  const getScoreColor = (s: number): string => {
    if (s >= 8) return "#22c55e"; // verde
    if (s >= 6) return "#84cc16"; // lime
    if (s >= 4) return "#eab308"; // giallo
    if (s >= 2) return "#f97316"; // arancio
    return "#ef4444"; // rosso
  };

  const getBgGradient = (s: number): string => {
    if (s >= 8) return "from-green-900/30 to-emerald-900/15";
    if (s >= 6) return "from-lime-900/25 to-green-900/10";
    if (s >= 4) return "from-yellow-900/25 to-amber-800/15";
    if (s >= 2) return "from-orange-900/30 to-red-800/15";
    return "from-red-900/30 to-rose-800/15";
  };

  const getBorderColor = (s: number): string => {
    if (s >= 8) return "border-green-400/50";
    if (s >= 6) return "border-lime-400/40";
    if (s >= 4) return "border-yellow-400/40";
    if (s >= 2) return "border-orange-400/40";
    return "border-red-400/40";
  };

  const getScoreEmoji = (s: number): string => {
    if (s >= 9) return "🏆";
    if (s >= 8) return "🌟";
    if (s >= 7) return "🪂";
    if (s >= 5) return "👍";
    if (s >= 3) return "⚠️";
    return "❌";
  };

  const colore = getScoreColor(score);
  const scoreClamped = Math.max(0, Math.min(10, score));

  return (
    <div className={`rounded-2xl border-2 ${getBorderColor(score)} bg-gradient-to-br ${getBgGradient(score)} p-5 relative overflow-hidden`}>
      {/* Sfondo decorativo */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.05] pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${colore}, transparent)`,
          transform: 'translate(30%, -30%)',
        }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-4">
          {/* Cerchio voto */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="16"
                fill="none"
                stroke="rgba(148, 163, 184, 0.15)"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="16"
                fill="none"
                stroke={colore}
                strokeWidth="3"
                strokeDasharray={`${(scoreClamped / 10) * 100} 100`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black tabular-nums" style={{ color: colore }}>
                {scoreClamped.toFixed(0)}
              </span>
              <span className="text-[8px] text-slate-400 font-semibold">/10</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{getScoreEmoji(score)}</span>
              <span className="text-lg font-bold text-slate-100 tracking-wide">
                Giornata <span style={{ color: colore }}>{label}</span>
              </span>
            </div>
            {oreAttive != null && totaleOre != null && (
              <p className="text-sm text-slate-400">
                <strong className="text-slate-300">{oreAttive}</strong> ore volabili su {totaleOre}
                {bestHour != null && bestRateo != null && (
                  <span> · Migliore: <strong className="text-amber-300">{String(bestHour).padStart(2, "0")}:00</strong> ({bestRateo.toFixed(1)} m/s)</span>
                )}
              </p>
            )}
            {thermalLabel && (
              <p className="text-sm text-slate-400 mt-0.5">Termiche: {thermalLabel}</p>
            )}
          </div>
        </div>

        {/* Stelle decorative */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-4 h-4 ${
                s <= Math.round(scoreClamped / 2)
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-slate-600"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}