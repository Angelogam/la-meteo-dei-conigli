"use client";

import React from "react";
import { CloudLightning, Wind } from "lucide-react";

interface WindySoundingsCardProps {
  siteName?: string;
}

export default function WindySoundingsCard({ siteName }: WindySoundingsCardProps) {
  console.log("[WindySoundingsCard] RENDERED — siteName:", siteName);

  return (
    <div
      className="my-6 border-2 border-amber-400/50 bg-gradient-to-br from-amber-950/60 to-slate-900/80 p-5 rounded-2xl shadow-lg shadow-amber-500/10"
      data-testid="windy-soundings-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
          <CloudLightning className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-black text-amber-300 leading-none">WINDY PG SOUNDINGS</h3>
          <p className="text-[10px] text-amber-400/60 mt-0.5">Sondaggi atmosferici per parapendio</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div
          className="bg-slate-800/70 rounded-xl p-3 text-center border border-emerald-500/20"
          data-testid="windy-card-cape"
        >
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">CAPE</div>
          <div className="text-2xl font-black text-emerald-400 leading-tight">120</div>
          <div className="text-[10px] text-slate-500">J/kg</div>
        </div>
        <div
          className="bg-slate-800/70 rounded-xl p-3 text-center border border-amber-500/20"
          data-testid="windy-card-freezing-level"
        >
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Liv. 0°C</div>
          <div className="text-2xl font-black text-amber-400 leading-tight">3800m</div>
          <div className="text-[10px] text-slate-500">quota</div>
        </div>
        <div
          className="bg-slate-800/70 rounded-xl p-3 text-center border border-sky-500/20"
          data-testid="windy-card-wind-850"
        >
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Vento 850hPa</div>
          <div className="text-2xl font-black text-sky-400 leading-tight">22</div>
          <div className="text-[10px] text-slate-500">km/h S-SE</div>
        </div>
      </div>

      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-amber-400" />
          Profilo verticale — Skew-T
        </div>
        <div className="h-20 bg-slate-900/60 rounded-lg border border-slate-700/50 flex items-center justify-center">
          <span className="text-slate-500 text-xs">[Diagramma Skew-T]</span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <a
          href="https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <Wind className="w-4 h-4" />
          Plugin originale Windy (apri)
        </a>
      </div>
    </div>
  );
}
