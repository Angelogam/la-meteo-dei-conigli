"use client";

import React from "react";
import { RefreshCw, Clock, CloudSun, Timer } from "lucide-react";

interface UpdateTimerProps {
  lastUpdate: Date;
  countdown: number;
  updating: boolean;
  onRefresh: () => void;
}

export default function UpdateTimer({ lastUpdate, countdown, updating, onRefresh }: UpdateTimerProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <CloudSun className="w-7 h-7 text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-bold text-white">Open-Meteo</div>
            <div className="text-base font-bold text-emerald-300 tabular-nums mt-0.5">
              {lastUpdate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700/50">
          <Timer className="w-5 h-5 text-sky-400 shrink-0" />
          <div className="text-center">
            <div className="text-sm font-bold text-sky-300 tabular-nums">{countdown} min</div>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={updating}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all shrink-0 ${
            updating
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow"
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${updating ? "animate-spin" : ""}`} />
          {updating ? "..." : "Aggiorna"}
        </button>
      </div>
      <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${((30 - countdown) / 30) * 100}%` }} />
      </div>
    </div>
  );
}