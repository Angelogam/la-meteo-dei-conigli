"use client";

import type { AiAnalysis } from "@/types/meteo";

interface TermicheTabProps {
  aiData: AiAnalysis | null;
}

export const TermicheTab = ({ aiData }: TermicheTabProps) => {
  if (!aiData) {
    return <div className="text-sm text-slate-300 p-4 text-center">Nessuna analisi termica disponibile</div>;
  }

  return (
    <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
      <div className="mb-3 p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">🔥 Situazione Termica</h4>
        <p className="text-slate-200">{aiData.thermal}</p>
      </div>
    </div>
  );
};