"use client";

import type { AiAnalysis } from "@/types/meteo";

interface TermicheTabProps {
  aiData: AiAnalysis | null;
}

export const TermicheTab = ({ aiData }: TermicheTabProps) => {
  if (!aiData) return null;
  
  return (
    <>
      {["thermal", "altitude", "hourly"].map((key) => (
        <div key={key} className="mb-2.5 p-2 bg-white/60 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs leading-relaxed whitespace-pre-wrap text-gray-700">{aiData[key as keyof AiAnalysis] as string}</div>
        </div>
      ))}
    </>
  );
};