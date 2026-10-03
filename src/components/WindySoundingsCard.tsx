"use client";

import React from "react";
import { CloudLightning, Wind } from "lucide-react";

interface WindySoundingsCardProps {
  siteName?: string;
}

export default function WindySoundingsCard({ siteName }: WindySoundingsCardProps) {
  return (
    <div
      data-testid="windy-soundings-card"
      className="my-0 p-5 rounded-2xl border-2 border-blue-400 bg-gradient-to-r from-blue-950/90 to-cyan-950/90 shadow-xl shadow-blue-500/30"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-400 flex items-center justify-center shrink-0 shadow-lg shadow-blue-400/50">
          <CloudLightning className="w-5 h-5 text-blue-950" />
        </div>
        <div>
          <h3 className="text-base font-black text-blue-100 leading-none">WINDY PG SOUNDINGS</h3>
          <p className="text-[10px] text-blue-300/70 mt-0.5 font-semibold">Sondaggi atmosferici per parapendio</p>
        </div>
      </div>

      {/* Griglia dati */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div
          data-testid="windy-card-cape"
          className="bg-blue-950/70 rounded-xl p-3 text-center border border-blue-400/30"
        >
          <div className="text-xs text-blue-300/60 font-bold uppercase tracking-widest">CAPE</div>
          <div className="text-2xl font-black text-emerald-400 leading-tight mt-1">120</div>
          <div className="text-[10px] text-blue-300/40 mt-0.5">J/kg</div>
        </div>
        <div
          data-testid="windy-card-freezing-level"
          className="bg-blue-950/70 rounded-xl p-3 text-center border border-blue-400/30"
        >
          <div className="text-xs text-blue-300/60 font-bold uppercase tracking-widest">Liv. 0°C</div>
          <div className="text-2xl font-black text-yellow-300 leading-tight mt-1">3800</div>
          <div className="text-[10px] text-blue-300/40 mt-0.5">m quota</div>
        </div>
        <div
          data-testid="windy-card-wind-850"
          className="bg-blue-950/70 rounded-xl p-3 text-center border border-blue-400/30"
        >
          <div className="text-xs text-blue-300/60 font-bold uppercase tracking-widest">Vento 850hPa</div>
          <div className="text-2xl font-black text-sky-300 leading-tight mt-1">22</div>
          <div className="text-[10px] text-blue-300/40 mt-0.5">km/h S-SE</div>
        </div>
      </div>

      {/* Sezione Skew-T */}
      <div className="p-3 bg-blue-950/50 rounded-xl border border-blue-400/20 mb-3">
        <div className="text-xs font-black text-blue-200 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
          <Wind className="w-3.5 h-3.5" />
          Profilo verticale — Skew-T
        </div>
        <div className="h-16 bg-blue-950/80 rounded-lg border border-blue-400/20 flex items-center justify-center">
          <span className="text-blue-400/50 text-xs font-semibold">[Diagramma Skew-T]</span>
        </div>
      </div>

      {/* Link plugin */}
      <div className="text-center">
        <a
          href="https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-black text-blue-200 hover:text-white transition-colors bg-blue-400/15 border border-blue-400/40 px-4 py-2 rounded-xl hover:bg-blue-400/25"
        >
          <Wind className="w-4 h-4" />
          Plugin originale Windy (apri)
        </a>
      </div>
    </div>
  );
}
