"use client";

import React from "react";
import { RefreshCw, CloudSun } from "lucide-react";

interface UpdateTimerProps {
  lastUpdate: Date | null;
  countdown: number;
  updating: boolean;
  onRefresh: () => void;
}

export default function UpdateTimer({ lastUpdate, updating, onRefresh }: UpdateTimerProps) {
  const updateStatus = lastUpdate
    ? `Ultimo aggiornamento alle ${lastUpdate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
    : "In attesa del primo aggiornamento";

  return (
    <section className="weather-refresh-card bg-slate-900/80 border border-slate-700/60 rounded-xl p-4" aria-label="Aggiornamento dati meteo">
      <div className="weather-refresh-inner flex items-center gap-3">
        <div className="weather-refresh-summary flex items-center gap-2 flex-1 min-w-0">
          <CloudSun className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">Dati meteo</div>
            <div className="text-xs text-emerald-300 mt-0.5">
              {updateStatus}
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-busy={updating}
          onClick={onRefresh}
          disabled={updating}
          className={`weather-refresh-button flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all shrink-0 ${
            updating
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow"
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${updating ? "animate-spin" : ""}`} />
          {updating ? "Aggiornamento…" : "Aggiorna tutto"}
        </button>
      </div>
    </section>
  );
}