"use client";

import type { AiAnalysis } from "@/types/meteo";

interface AnalisiTabProps {
  aiData: AiAnalysis | null;
  aiLoading: boolean;
}

export const AnalisiTab = ({ aiData, aiLoading }: AnalisiTabProps) => {
  const sections: { key: keyof AiAnalysis; label: string }[] = [
    { key: "general", label: "\u2600\uFE0F Situazione Generale" },
    { key: "thermal", label: "\uD83C\uDF21\uFE0F Profilo Termico e Stabilit\u00e0" },
    { key: "wind", label: "\uD83C\uDF2C\uFE0F Vento e Dinamica in Quota" },
    { key: "hourly", label: "\uD83C\uDF24\uFE0F Previsione per la Giornata" },
    { key: "altitude", label: "\uD83C\uDFD4\uFE0F Plafond e Sviluppo Verticale" },
    { key: "advice", label: "\uD83E\uDE82 Interpretazione per Volo Libero" },
    { key: "pressure", label: "\uD83D\uDD0D Pressione" },
    { key: "thunderstorm", label: "\u26C8\uFE0F Temporali" },
  ];

  return (
    <div className="mb-4 bg-white/60 rounded-xl border border-red-200 overflow-hidden">
      <div className="flex items-center gap-2 p-2 bg-red-50 border-b border-red-100">
        <h4 className="text-sm text-red-700 font-semibold m-0">Analisi Completa</h4>
        {aiLoading && <span className="ml-auto text-xs font-medium text-amber-600">Analisi in corso...</span>}
      </div>
      <div className="p-2 max-h-[520px] overflow-y-auto space-y-2">
        {aiData && !aiLoading && sections.map(({ key, label }) => {
          const content = aiData[key];
          if (!content) return null;
          const isAlert = key === "thunderstorm" && content.includes("ALLERTA");
          return (
            <div
              key={key}
              className={`p-3 rounded-xl border shadow-sm ${
                isAlert
                  ? "bg-red-50 border-red-300"
                  : "bg-white/50 border-gray-200"
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800 font-normal">
                {content}
              </div>
            </div>
          );
        })}
        {!aiData && !aiLoading && (
          <div className="p-4 text-center text-gray-400 text-sm">
            Seleziona un giorno per visualizzare l'analisi
          </div>
        )}
      </div>
    </div>
  );
};