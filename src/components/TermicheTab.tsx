"use client";

import React from "react";
import ThermalChart from "@/components/ThermalChart";

interface TermicheTabProps {
  currentData: any;
  dayData: any;
  site: { alt: number };
  thermalDelta?: number;
  thermalStrength?: number;
}

export default function TermicheTab({ currentData, dayData, site, thermalDelta, thermalStrength }: TermicheTabProps) {
  const hasData = currentData && dayData;

  return (
    <div className="space-y-5">
      {/* Chart */}
      {hasData && (
        <ThermalChart dayData={dayData} selectedHour={currentData.hour ?? 12} />
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Quota decollo</span>
          </div>
          <p className="text-lg font-bold text-slate-100">{site.alt} m</p>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Delta termico</span>
          </div>
          <p className="text-lg font-bold text-cyan-300">
            {thermalDelta != null ? `${thermalDelta > 0 ? "+" : ""}${thermalDelta.toFixed(1)}°C` : "—"}
          </p>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Forza termica</span>
          </div>
          <p className="text-lg font-bold text-amber-300">
            {thermalStrength != null ? `${thermalStrength.toFixed(1)} m/s` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}