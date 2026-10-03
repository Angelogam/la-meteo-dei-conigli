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
      className="relative my-8 border-2 border-amber-400 bg-amber-950/80 p-5 rounded-2xl shadow-xl shadow-amber-500/20"
    >
      {/* Pulsante evidenzia */}
      <div className="absolute -top-3 left-4 bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
        ★ Soundings
      </div>

      <div className="flex items-center gap-3 mb-4 pt-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
          <CloudLightning className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h3 className="text-base font-black text-amber-200 leading-none">WINDY PG SOUNDINGS</h3>
          <p className="text-[10px] text-amber-400/70 mt-0.5 font-semibold">Sondaggi atmosferici per parapendio</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div
          data-testid="windy-card-cape"
          className="bg-slate-900/80 rounded-xl p-3 text-center border border-emerald-500/40"
        >
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CAPE</div>
          <div className="text-3xl font-black text-emerald-400 leading-tight mt-1">120</div>
          <div className="text-[10px] text-slate-500 mt-0.5">J/kg</div>
        </div>
        <div
          data-testid="windy-card-freezing-level"
          className="bg-slate-900/80 rounded-xl p-3 text-center border border-amber-500/40"
        >
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Liv. 0°C</div>
          <div className="text-3xl font-black text-amber-400 leading-tight mt-1">3800</div>
          <div className="text-[10px] text-slate-500 mt-0.5">m quota</div>
        </div>
        <div
          data-testid="windy-card-wind-850"
          className="bg-slate-900/80 rounded-xl p-3 text-center border border-sky-500/40"
        >
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vento 850hPa</div>
          <div className="text-3xl font-black text-sky-400 leading-tight mt-1">22</div>
          <div className="text-[10px] text-slate-500 mt-0.5">km/h S-SE</div>
        </div>
      </div>

      <div className="p-3 bg-slate-900/60 rounded-xl border border-amber-500/20">
        <div className="text-xs font-black text-amber-300 mb-2 flex items-center gap-2 uppercase tracking-wider">
          <Wind className="w-4 h-4" />
          Profilo verticale — Skew-T
        </div>
        <div className="h-20 bg-slate-950/80 rounded-lg border border-amber-500/20 flex items-center justify-center">
          <span className="text-slate-500 text-xs font-semibold">[Diagramma Skew-T]</span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <a
          href="https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-black text-amber-300 hover:text-amber-100 transition-colors bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl"
        >
          <Wind className="w-4 h-4" />
          Plugin originale Windy (apri)
        </a>
      </div>
    </div>
  );
}
