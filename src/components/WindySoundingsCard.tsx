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
      className="my-8 p-6 rounded-2xl border-4 border-amber-400 bg-gradient-to-br from-amber-900/90 to-yellow-900/90 shadow-2xl shadow-amber-500/40"
    >
      {/* Header con icona */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center shrink-0 shadow-lg">
          <CloudLightning className="w-6 h-6 text-amber-950" />
        </div>
        <div>
          <h3 className="text-lg font-black text-amber-100 leading-none">WINDY PG SOUNDINGS</h3>
          <p className="text-xs text-amber-300/80 mt-1 font-semibold">Sondaggi atmosferici per parapendio</p>
        </div>
      </div>

      {/* Griglia dati */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div
          data-testid="windy-card-cape"
          className="bg-amber-950/60 rounded-xl p-3 text-center border border-amber-400/30"
        >
          <div className="text-xs text-amber-300/70 font-bold uppercase tracking-widest">CAPE</div>
          <div className="text-3xl font-black text-emerald-400 leading-tight mt-1">120</div>
          <div className="text-xs text-amber-300/50 mt-0.5">J/kg</div>
        </div>
        <div
          data-testid="windy-card-freezing-level"
          className="bg-amber-950/60 rounded-xl p-3 text-center border border-amber-400/30"
        >
          <div className="text-xs text-amber-300/70 font-bold uppercase tracking-widest">Liv. 0°C</div>
          <div className="text-3xl font-black text-amber-300 leading-tight mt-1">3800</div>
          <div className="text-xs text-amber-300/50 mt-0.5">m quota</div>
        </div>
        <div
          data-testid="windy-card-wind-850"
          className="bg-amber-950/60 rounded-xl p-3 text-center border border-amber-400/30"
        >
          <div className="text-xs text-amber-300/70 font-bold uppercase tracking-widest">Vento 850hPa</div>
          <div className="text-3xl font-black text-sky-300 leading-tight mt-1">22</div>
          <div className="text-xs text-amber-300/50 mt-0.5">km/h S-SE</div>
        </div>
      </div>

      {/* Sezione Skew-T */}
      <div className="p-4 bg-amber-950/50 rounded-xl border border-amber-400/20">
        <div className="text-sm font-black text-amber-200 mb-3 flex items-center gap-2 uppercase tracking-wider">
          <Wind className="w-4 h-4" />
          Profilo verticale — Skew-T
        </div>
        <div className="h-20 bg-amber-950/70 rounded-lg border border-amber-400/20 flex items-center justify-center">
          <span className="text-amber-400/60 text-xs font-semibold">[Diagramma Skew-T]</span>
        </div>
      </div>

      {/* Link plugin */}
      <div className="mt-4 text-center">
        <a
          href="https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-black text-amber-100 hover:text-white transition-colors bg-amber-400/20 border-2 border-amber-400/50 px-5 py-2.5 rounded-xl hover:bg-amber-400/30"
        >
          <Wind className="w-4 h-4" />
          Plugin originale Windy (apri)
        </a>
      </div>
    </div>
  );
}
