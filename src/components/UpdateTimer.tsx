"use client";

import React from "react";
import { RefreshCw, CloudSun } from "lucide-react";

interface UpdateTimerProps {
  lastUpdate: Date | null;
  updating: boolean;
  onRefresh: () => void;
}

export default function UpdateTimer({ lastUpdate, updating, onRefresh }: UpdateTimerProps) {
  const formattedTime = lastUpdate
    ? lastUpdate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-5 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <CloudSun className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">Open-Meteo</div>
            <div className="text-base font-bold text-emerald-300 tabular-nums">
              {formattedTime}
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <button
          onClick={onRefresh}
          disabled={updating}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shrink-0 ${
            updating
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${updating ? "animate-spin" : ""}`} />
          {updating ? "..." : "Aggiorna"}
        </button>
      </div>
    </div>
  );
}