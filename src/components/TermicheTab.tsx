"use client";

import type { ThermalAnalysis } from "@/utils/termiche";

interface TermicheTabProps {
  aiData: ThermalAnalysis | null;
}

export const TermicheTab = ({ aiData }: TermicheTabProps) => {
  if (!aiData) {
    return <div className="text-sm text-slate-300 p-4 text-center">Nessuna analisi termica disponibile</div>;
  }

  const strengthColor = () => {
    switch (aiData.strength) {
      case "nulla": return "text-slate-400";
      case "debole": return "text-yellow-400";
      case "moderata": return "text-orange-400";
      case "buona": return "text-orange-300";
      case "forte": return "text-red-400";
    }
  };

  const riskColor = () => {
    switch (aiData.risk) {
      case "nullo": return "text-green-400";
      case "basso": return "text-yellow-400";
      case "medio": return "text-orange-400";
      case "alto": return "text-red-500";
    }
  };

  return (
    <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap space-y-3">
      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">🔥 Situazione Termica</h4>
        <p className="text-slate-200">{aiData.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {aiData.thermalBase && (
          <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Base termiche</div>
            <div className="text-lg font-extrabold text-orange-300">
              {aiData.thermalBase >= 1000 ? `${(aiData.thermalBase / 1000).toFixed(1)} km` : `${aiData.thermalBase} m`} slm
            </div>
          </div>
        )}

        {aiData.thermalTop && (
          <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Sviluppo massimo</div>
            <div className="text-lg font-extrabold text-blue-300">
              {aiData.thermalTop >= 1000 ? `${(aiData.thermalTop / 1000).toFixed(1)} km` : `${aiData.thermalTop} m`} slm
            </div>
          </div>
        )}

        {aiData.avgUpdraft !== null && (
          <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Forza media</div>
            <div className={`text-lg font-extrabold ${strengthColor()}`}>
              {aiData.avgUpdraft} m/s
            </div>
            <div className="text-[10px] text-slate-400 capitalize">{aiData.strength}</div>
          </div>
        )}

        <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Rischio turbolenza</div>
          <div className={`text-lg font-extrabold ${riskColor()}`}>
            {aiData.risk === "nullo" ? "✅" : aiData.risk === "basso" ? "⚠️" : aiData.risk === "medio" ? "⚠️⚠️" : "🔴"}
          </div>
          <div className={`text-[10px] capitalize ${riskColor()}`}>{aiData.risk}</div>
        </div>
      </div>
    </div>
  );
};