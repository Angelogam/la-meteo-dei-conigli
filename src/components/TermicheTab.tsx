"use client";

import type { AiAnalysis } from "@/types/meteo";

interface TermicheTabProps {
  aiData: AiAnalysis | null;
}

export const TermicheTab = ({ aiData }: TermicheTabProps) => {
  if (!aiData) {
    return <div className="text-sm text-gray-300 p-4 text-center">Nessuna analisi termica disponibile</div>;
  }

  return (
    <div className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
      <div className="mb-3 p-3 bg-white/10 rounded-xl border border-gray-500">
        <h4 className="font-extrabold text-orange-400 mb-1">🔥 Situazione Termica</h4>
        <p>{aiData.thermal}</p>
      </div>
    </div>
  );
};