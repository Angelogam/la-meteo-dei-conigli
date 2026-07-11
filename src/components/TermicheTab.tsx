"use client";

import React from "react";
import { MeteoGram } from "@/components/MeteoGram";
import type { HourData } from "@/types/meteo";
import { generaAnalisiReale } from "@/utils/analisi";

export const TermicheTab = ({ dayData, altitude }: TermicheTabProps) => {
  const analisi = generaAnalisiReale(dayData, altitude);

  if (!dayData.length || !analisi) {
    return <div className="text-sm text-slate-300 p-4 text-center">Nessuna analisi termica disponibile</div>;
  }

  return (
    <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap space-y-3">
      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">🔥 Situazione Generale</h4>
        <p className="text-slate-200 whitespace-pre-line">{analisi.general}</p>
      </div>

      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-blue-300 mb-1">🌡️ Profilo Termico e Stabilità</h4>
        <p className="text-slate-200 whitespace-pre-line">{analisi.thermal}</p>
      </div>

      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-green-300 mb-1">🌬️ Vento e Dinamica in Quota</h4>
        <p className="text-slate-200 whitespace-pre-line">{analisi.wind}</p>
      </div>

      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-yellow-300 mb-1">🌤️ Previsione per la Giornata</h4>
        <p className="text-slate-200 whitespace-pre-line">{analisi.hourly}</p>
      </div>

      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-cyan-300 mb-1">🪂 Interpretazione per Attività Outdoor / Volo Libero</h4>
        <p className="text-slate-200 whitespace-pre-line">{analisi.advice}</p>
      </div>
    </div>
  );
};