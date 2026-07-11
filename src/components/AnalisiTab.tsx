"use client";

import type { AiAnalysis } from "@/types/meteo";

interface AnalisiTabProps {
  aiData: AiAnalysis | null;
}

export const AnalisiTab = ({ aiData }: AnalisiTabProps) => {
  if (!aiData) {
    return <div className="text-sm text-gray-500 p-4 text-center">Nessuna analisi disponibile</div>;
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap">
      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-extrabold text-orange-600 mb-1">🌤️ Situazione Generale</h4>
        <p className="text-gray-700">{aiData.general}</p>
      </div>
      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-extrabold text-orange-600 mb-1">🔥 Termiche</h4>
        <p className="text-gray-700">{aiData.thermal}</p>
      </div>
      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-extrabold text-orange-600 mb-1">💨 Vento</h4>
        <p className="text-gray-700">{aiData.wind}</p>
      </div>
      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-extrabold text-orange-600 mb-1">🕐 Evoluzione Oraria</h4>
        <p className="text-gray-700">{aiData.hourly}</p>
      </div>
      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-extrabold text-orange-600 mb-1">💡 Consiglio</h4>
        <p className="text-gray-700">{aiData.advice}</p>
      </div>
      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-extrabold text-orange-600 mb-1">⚡ Temporali</h4>
        <p className="text-gray-700">{aiData.thunderstorm}</p>
      </div>
    </div>
  );
};