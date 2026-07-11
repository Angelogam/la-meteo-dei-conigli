"use client";

import type { AiAnalysis } from "@/types/meteo";

interface AnalisiTabProps {
  aiData: AiAnalysis | null;
}

export const AnalisiTab = ({ aiData }: AnalisiTabProps) => {
  if (!aiData) {
    return (
      <div className="p-6 bg-white/90 rounded-2xl border-2 border-gray-300 shadow-sm text-center">
        <div className="text-4xl mb-3">🌤️</div>
        <div className="text-base font-bold text-gray-700">Dati non disponibili</div>
        <div className="text-sm text-gray-500 mt-1">Carica i dati meteo per vedere l&apos;analisi</div>
      </div>
    );
  }

  const sections: { key: keyof AiAnalysis; label: string; emoji: string }[] = [
    { key: "thermal", label: "🌡️ Profilo Termico", emoji: "🌡️" },
    { key: "altitude", label: "💨 Venti in Quota", emoji: "💨" },
    { key: "hourly", label: "🕐 Evoluzione Oraria", emoji: "🕐" },
  ];

  return (
    <div className="space-y-4">
      {/* Temporali - sezione prioritaria */}
      {aiData.thunderstorm && (
        <div className={`p-4 rounded-2xl border-2 shadow-lg ${
          aiData.thunderstorm.includes("ALLERTA")
            ? "bg-red-50 border-red-500 shadow-red-200"
            : "bg-white/90 border-gray-300 shadow-sm"
        }`}>
          <h4 className={`text-base font-extrabold mb-2 flex items-center gap-2 ${
            aiData.thunderstorm.includes("ALLERTA") ? "text-red-700" : "text-gray-700"
          }`}>
            <span className="text-xl">⚡</span> Rischio Temporali
          </h4>
          <div className={`text-sm leading-relaxed whitespace-pre-wrap font-semibold ${
            aiData.thunderstorm.includes("ALLERTA") ? "text-red-900" : "text-gray-900"
          }`}>
            {aiData.thunderstorm}
          </div>
        </div>
      )}

      {/* Altre sezioni */}
      {sections.map(({ key, label }) => {
        const content = aiData[key as keyof AiAnalysis] as string;
        if (!content) return null;

        const lines = content.split("\n");
        const title = lines[0];
        const body = lines.slice(1).join("\n");

        return (
          <div key={key} className="p-4 bg-white/90 rounded-2xl border-2 border-gray-300 shadow-sm">
            <h4 className="text-base font-extrabold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-lg">{label}</span>
            </h4>
            <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium text-gray-900 space-y-1">
              {title && <div className="text-gray-600 mb-2">{title}</div>}
              {body}
            </div>
          </div>
        );
      })}

      {/* Nota */}
      <div className="p-3 bg-amber-50 rounded-2xl border-2 border-amber-300 shadow-sm">
        <div className="text-xs font-semibold text-amber-800">
          📌 L&apos;analisi si basa sui dati open-meteo combinati con modelli statistici. I valori reali possono variare. 
          Per decisioni di volo, consulta sempre bollettini ufficiali e osservazioni locali.
        </div>
      </div>
    </div>
  );
};