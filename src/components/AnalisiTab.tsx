"use client";

import type { AiAnalysis } from "@/types/meteo";

interface AnalisiTabProps {
  aiData: AiAnalysis | null;
  aiLoading: boolean;
}

export const AnalisiTab = ({ aiData, aiLoading }: AnalisiTabProps) => {
  return (
    <div className="mb-4 bg-white/[0.07] rounded-xl border border-red-500/20 overflow-hidden">
      <div className="flex items-center gap-2 p-2 bg-red-500/10 border-b border-red-500/10">
        <h4 className="text-sm text-red-300 font-semibold m-0">Analisi Completa</h4>
        {aiLoading && <span className="ml-auto text-xs text-yellow-300">Analisi...</span>}
      </div>
      <div className="p-2 max-h-[480px] overflow-y-auto">
        {aiData && !aiLoading && ["general", "advice", "pressure", "thunderstorm"].map((key) => (
          <div key={key} className="mb-2.5 p-2 bg-white/[0.06] rounded-xl border border-white/10">
            <div className="text-xs leading-relaxed whitespace-pre-wrap text-gray-200">{aiData[key as keyof AiAnalysis] as string}</div>
          </div>
        ))}
      </div>
    </div>
  );
};