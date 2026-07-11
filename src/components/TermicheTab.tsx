"use client";

import type { AiAnalysis } from "@/types/meteo";

interface TermicheTabProps {
  aiData: AiAnalysis | null;
}

export const TermicheTab = ({ aiData }: TermicheTabProps) => {
  if (!aiData) return null;
  
  const sections: { key: keyof AiAnalysis; label: string; color: string }[] = [
    { key: "thermal", label: "🌡️ Profilo Termico", color: "text-orange-600" },
    { key: "altitude", label: "⬆️ Plafond e Sviluppo Verticale", color: "text-sky-600" },
    { key: "hourly", label: "🕐 Evoluzione Oraria", color: "text-indigo-600" },
  ];

  return (
    <div className="space-y-3">
      {sections.map(({ key, label, color }) => {
        const content = aiData[key];
        if (!content) return null;
        return (
          <div key={key} className="p-3 bg-white/90 rounded-xl border-2 border-gray-300 shadow-sm">
            <h4 className={`text-sm font-extrabold mb-2 ${color}`}>{label}</h4>
            <div className="text-sm leading-relaxed whitespace-pre-wrap font-semibold text-gray-900">
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
};