"use client";

import React from "react";
import { RefreshCw, Clock, Database, CloudSun, Timer } from "lucide-react";

interface UpdateTimerProps {
  lastUpdate: Date;
  countdown: number;
  updating: boolean;
  onRefresh: () => void;
}

export default function UpdateTimer({ lastUpdate, countdown, updating, onRefresh }: UpdateTimerProps) {
  const formatTime = (d: Date) => {
    return d.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-slate-700/40 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        {/* Sinistra: ultimo aggiornamento */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <CloudSun className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Open-Meteo</span>
              <Database className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm font-bold text-white tabular-nums tracking-wide">
                {formatTime(lastUpdate)}
              </span>
            </div>
          </div>
        </div>

        {/* Centro: countdown */}
        <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-700/40">
          <Timer className="w-4 h-4 text-sky-400" />
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block leading-none mb-0.5">
              Prossimo aggiornamento
            </span>
            <span className="text-lg font-black text-sky-300 tabular-nums">
              {countdown}
              <span className="text-sm text-slate-500 font-normal ml-0.5">min</span>
            </span>
          </div>
        </div>

        {/* Destra: pulsante aggiorna */}
        <button
          onClick={onRefresh}
          disabled={updating}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
            ${
              updating
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-95"
            }
          `}
        >
          <RefreshCw className={`w-4 h-4 ${updating ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{updating ? "Aggiornamento..." : "Aggiorna"}</span>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${((30 - countdown) / 30) * 100}%` }}
        />
      </div>
    </div>
  );
}