"use client";

import React from "react";
import ThermalChart from "@/components/ThermalChart";

interface TermicheTabProps {
  currentData: any;
  dayData: any;
  site: { alt: number };
  thermalDelta?: number;
  thermalStrength?: { label: string; color: string };
  hourlyData?: any[];
  selectedHour?: number;
}

export default function TermicheTab({ currentData, dayData, site, thermalDelta, thermalStrength, hourlyData, selectedHour }: TermicheTabProps) {
  const hasData = currentData && dayData;

  return (
    <div className="space-y-5">
      {/* Chart */}
      {hasData && hourlyData && (
        <ThermalChart
          hourlyData={hourlyData}
          selectedHour={selectedHour ?? 12}
          siteAltitude={site.alt}
        />
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
          {thermalStrength ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: thermalStrength.color }} />
              <span className="text-lg font-bold text-amber-300">{thermalStrength.label}</span>
            </div>
          ) : (
            <p className="text-lg font-bold text-slate-500">—</p>
          )}
        </div>
      </div>
    </div>
  );
}