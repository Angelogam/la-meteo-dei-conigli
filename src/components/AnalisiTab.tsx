"use client";

import type { AiAnalysis } from "@/types/meteo";

interface AnalisiTabProps {
  aiData: AiAnalysis | null;
  selectedHour?: number;
}

export const AnalisiTab = ({ aiData, selectedHour }: AnalisiTabProps) => {
  if (!aiData) {
    return <div className="text-sm text-slate-300 p-4 text-center">Nessuna analisi disponibile</div>;
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap">
      {/* Ora attuale sincronizzata */}
      {selectedHour !== undefined && (
        <div className="flex items-center justify-between px-2 py-1.5 mb-1 text-xs text-blue-300 font-medium border-b border-slate-600/30">
          <span>🤖 Analisi AI · ora selezionata</span>
          <span className="text-blue-200 font-bold">{String(selectedHour).padStart(2, "0")}:00</span>
        </div>
      )}
      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">🌤️ Situazione Generale</h4>
        <p className="text-slate-200">{aiData.general}</p>
      </div>
      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">🔥 Termiche</h4>
        <p className="text-slate-200">{aiData.thermal}</p>
      </div>
      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">💨 Vento</h4>
        <p className="text-slate-200">{aiData.wind}</p>
      </div>
      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">🕐 Evoluzione Oraria</h4>
        <p className="text-slate-200">{aiData.hourly}</p>
      </div>
      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">💡 Consiglio</h4>
        <p className="text-slate-200">{aiData.advice}</p>
      </div>
      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">⚡ Temporali</h4>
        <p className="text-slate-200">{aiData.thunderstorm}</p>
      </div>
    </div>
  );
};