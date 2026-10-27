"use client";

import React from "react";
import { Activity, TrendingUp, Thermometer, Wind, Cloud, ArrowUp } from "lucide-react";

interface MargineErroreMeteoProps {
  margini: {
    temperatura: number;
    vento: number;
    termiche: number;
    baseNuvole: number;
    topTermico: number;
    pressione: number;
    umidita: number;
    pioggia: number;
  };
  confidenzaMedia: number;
  erroreMedio: number;
}

function getConfidenzaColor(confidenza: number): string {
  if (confidenza >= 0.8) return "text-emerald-400 bg-emerald-900/20 border-emerald-500/30";
  if (confidenza >= 0.6) return "text-amber-400 bg-amber-900/20 border-amber-500/30";
  return "text-red-400 bg-red-900/20 border-red-500/30";
}

function getConfidenzaLabel(confidenza: number): string {
  if (confidenza >= 0.9) return "Molto alta";
  if (confidenza >= 0.8) return "Alta";
  if (confidenza >= 0.6) return "Media";
  if (confidenza >= 0.4) return "Bassa";
  return "Molto bassa";
}

export default function MargineErroreMeteo({ margini, confidenzaMedia, erroreMedio }: MargineErroreMeteoProps) {
  const confidenzaLabel = getConfidenzaLabel(confidenzaMedia);
  const confidenzaColor = getConfidenzaColor(confidenzaMedia);

  return (
    <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h3 className="text-base font-bold text-cyan-300">Margini d'errore previsioni</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ml-auto ${confidenzaColor}`}>
          {confidenzaLabel} ({Math.round(confidenzaMedia * 100)}%)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
          <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">±{margini.temperatura}°C</div>
          <div className="text-[10px] text-slate-500">Temperatura</div>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
          <Wind className="w-4 h-4 text-sky-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">±{margini.vento} km/h</div>
          <div className="text-[10px] text-slate-500">Vento</div>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
          <ArrowUp className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">±{margini.termiche} m/s</div>
          <div className="text-[10px] text-slate-500">Termiche</div>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
          <Cloud className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">±{margini.baseNuvole}m</div>
          <div className="text-[10px] text-slate-500">Base nuvole</div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
        <span>Pioggia: ±{margini.pioggia}mm</span>
        <span>Umidità: ±{margini.umidita}%</span>
        <span>Pressione: ±{margini.pressione}hPa</span>
        <span>Errore medio: {erroreMedio}%</span>
      </div>
    </div>
  );
}