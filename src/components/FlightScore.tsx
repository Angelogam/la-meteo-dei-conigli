"use client";

import React from "react";
import { Calendar, TrendingUp, Clock, Thermometer, Star } from "lucide-react";

interface FlightScoreProps {
  score: number;
  label: string;
  bestHour: number;
  bestRateo: number;
  oreAttive: number;
  totaleOre: number;
  thermalLabel: string;
  dayLabel?: string;
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
}: FlightScoreProps) {
  return (
    <div className="card bg-slate-800/30 border border-slate-700/50 p-4">
      {/* Data */}
      {dayLabel && (
        <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-3">
          <Calendar className="w-3 h-3 text-slate-500" />{dayLabel}
        </div>
      )}

      {/* Score + badge */}
      <div className="text-center mb-3">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-slate-300 uppercase tracking-wider font-bold">Indice di Volo</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-5xl font-extrabold text-emerald-300">{score}</span>
          <span className="text-sm font-bold bg-emerald-900/30 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">{label}</span>
        </div>
      </div>

      {/* Griglia */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-slate-800/60 rounded-lg p-2.5 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="text-slate-300">{thermalLabel}</span>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2.5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-slate-300">{oreAttive}/{totaleOre} ore attive</span>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2.5 flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-slate-300">Miglior ora <strong className="text-white">{String(bestHour).padStart(2, "0")}:00</strong></span>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2.5 flex items-center gap-2">
          <Star className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-slate-300">Picco <strong className="text-purple-300">{bestRateo.toFixed(1)} m/s</strong></span>
        </div>
      </div>
    </div>
  );
}