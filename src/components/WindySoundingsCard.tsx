"use client";

import React from "react";
import { CloudLightning, Wind } from "lucide-react";

interface WindySoundingsCardProps {
  siteName?: string;
}

export default function WindySoundingsCard({ siteName }: WindySoundingsCardProps) {
  console.log("[WindySoundingsCard] RENDERED — siteName:", siteName);

  return (
    <div className="my-6 border-4 border-yellow-400 bg-yellow-50 text-yellow-900 p-6 rounded-xl shadow-lg" data-testid="windy-soundings-card">
      <h3 className="text-xl font-black mb-2">⚡ CARD WINDY PG SOUNDINGS ⚡</h3>
      <p className="text-sm mb-4">Siti: Montoso, Pian Munè, Colle Agnello, Monte Birrone</p>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/60 rounded-lg p-3 text-center" data-testid="windy-card-cape">
          <div className="text-xs text-slate-500">CAPE</div>
          <div className="text-2xl font-black text-emerald-600">120</div>
          <div className="text-xs">J/kg</div>
        </div>
        <div className="bg-white/60 rounded-lg p-3 text-center" data-testid="windy-card-freezing-level">
          <div className="text-xs text-slate-500">Liv. 0°C</div>
          <div className="text-2xl font-black text-amber-600">3800m</div>
          <div className="text-xs">quota</div>
        </div>
        <div className="bg-white/60 rounded-lg p-3 text-center" data-testid="windy-card-wind-850">
          <div className="text-xs text-slate-500">Vento 850hPa</div>
          <div className="text-2xl font-black text-blue-600">22</div>
          <div className="text-xs">km/h S-SE</div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-white/40 rounded-lg border border-yellow-300">
        <div className="text-xs font-bold text-slate-700 mb-1">Profilo verticale — Skew-T</div>
        <div className="h-24 bg-white/60 rounded border border-slate-300 flex items-center justify-center">
          <span className="text-slate-500 text-xs">[Diagramma Skew-T]</span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <a
          href="https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800"
        >
          <Wind className="w-4 h-4" />
          Plugin originale Windy (apri)
        </a>
      </div>
    </div>
  );
}
