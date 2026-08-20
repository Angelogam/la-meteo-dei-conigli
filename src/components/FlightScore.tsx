"use client";

import React from "react";
import {
  TrendingUp,
  Calendar,
  CloudRain,
  CloudLightning,
  Clock,
} from "lucide-react";

interface FlightScoreProps {
  score: number;
  label: string;
  bestHour: number;
  bestRateo: number;
  oreAttive: number;
  totaleOre: number;
  thermalLabel: string;
  dayLabel?: string;
  rainHours?: number[];
  thunderstormHours?: number[];
}

export default function FlightScore({
  score,
  label,
  bestHour,
  bestRateo,
  oreAttive,
  totaleOre,
  thermalLabel,
  dayLabel,
  rainHours = [],
  thunderstormHours = [],
}: FlightScoreProps) {
  const isRaining = rainHours.length > 0;
  const hasThunderstorm = thunderstormHours.length > 0;
  const hasBadWeather = isRaining || hasThunderstorm;

  // In caso di pioggia o temporale, il punteggio viene azzerato/reso sfavorevole
  const displayScore = hasBadWeather ? 0 : score;
  const displayLabel = hasThunderstorm
    ? "Temporale"
    : isRaining
    ? "Pioggia"
    : label;

  return (
    <div className="card bg-slate-800/40 border border-slate-700/50 p-4 relative overflow-hidden rounded-2xl">
      {/* Banner allerta maltempo */}
      {hasBadWeather && (
        <div className="absolute top-0 left-0 w-full bg-red-950/80 backdrop-blur-sm z-10 border-b border-red-500/40">
          <div className="flex items-center justify-center gap-2 py-1.5 px-3">
            {hasThunderstorm ? (
              <CloudLightning className="w-4 h-4 text-purple-300 animate-pulse" />
            ) : (
              <CloudRain className="w-4 h-4 text-rose-300" />
            )}
            <span className="text-xs font-bold text-rose-200 tracking-wide">
              {hasThunderstorm
                ? `Temporali previsti alle ore: ${thunderstormHours
                    .map((h) => String(h).padStart(2, "0"))
                    .join(", ")}:00`
                : `Pioggia prevista alle ore: ${rainHours
                    .map((h) => String(h).padStart(2, "0"))
                    .join(", ")}:00`}
            </span>
          </div>
        </div>
      )}

      <div className={hasBadWeather ? "pt-7" : ""}>
        {/* Etichetta giorno */}
        {dayLabel && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{dayLabel}</span>
          </div>
        )}

        {/* Punteggio + Badge */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
              Condizioni Volo
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span
              className={`text-5xl font-extrabold tabular-nums transition-all ${
                displayScore === 0
                  ? "text-red-400"
                  : displayScore >= 8
                  ? "text-emerald-400"
                  : displayScore >= 6
                  ? "text-lime-400"
                  : displayScore >= 4
                  ? "text-amber-400"
                  : "text-orange-400"
              }`}
            >
              {displayScore}
            </span>
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full border ${
                displayScore === 0
                  ? "bg-red-900/40 text-red-300 border-red-500/50"
                  : displayScore >= 8
                  ? "bg-emerald-900/40 text-emerald-300 border-emerald-400/40"
                  : displayScore >= 6
                  ? "bg-lime-900/40 text-lime-300 border-lime-400/40"
                  : displayScore >= 4
                  ? "bg-amber-900/40 text-amber-300 border-amber-400/40"
                  : "bg-orange-900/40 text-orange-300 border-orange-400/40"
              }`}
            >
              {displayLabel}
            </span>
          </div>
        </div>

        {/* Griglia dettagli */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-900/60 rounded-xl p-2.5 flex items-center gap-2 border border-slate-700/30">
            <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300 truncate">
              {hasBadWeather ? "Termiche inibite" : thermalLabel}
            </span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-2.5 flex items-center gap-2 border border-slate-700/30">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-300 truncate">
              {hasBadWeather
                ? "Nessuna finestra utile"
                : `Miglior ora: ${String(bestHour).padStart(2, "0")}:00 (${bestRateo.toFixed(1)} m/s)`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}