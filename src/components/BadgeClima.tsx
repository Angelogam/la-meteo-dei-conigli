"use client";

import React from "react";
import { Thermometer, Wind, CloudRain, Activity, AlertTriangle, Info } from "lucide-react";
import type { AnomaliaClima } from "@/utils/climatologia";

interface BadgeClimaProps {
  anomalie: AnomaliaClima[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  temp_max: <Thermometer className="w-3.5 h-3.5" />,
  temp_min: <Thermometer className="w-3.5 h-3.5" />,
  vento: <Wind className="w-3.5 h-3.5" />,
  pioggia: <CloudRain className="w-3.5 h-3.5" />,
  delta: <Activity className="w-3.5 h-3.5" />,
};

export default function BadgeClima({ anomalie }: BadgeClimaProps) {
  if (!anomalie || anomalie.length === 0) return null;

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold text-cyan-300">Confronto climatologico</span>
      </div>
      <div className="space-y-1.5">
        {anomalie.map((a, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 border ${
              a.severita === "warning"
                ? "bg-orange-900/20 border-orange-500/30 text-orange-200"
                : "bg-sky-900/15 border-sky-500/20 text-sky-200"
            }`}
          >
            <span className="shrink-0">{ICON_MAP[a.tipo] || <Info className="w-3.5 h-3.5" />}</span>
            <span className="flex-1">
              <span className="font-bold">{a.etichetta}:</span> {a.valore}°C
              <span className="text-slate-500 mx-1">|</span>
              <span className="opacity-80">{a.descrizione}</span>
            </span>
            {a.severita === "warning" && (
              <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}