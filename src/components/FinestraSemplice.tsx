"use client";

import React from "react";
import { Clock, Wind, Thermometer, TrendingUp, Sun, Info } from "lucide-react";

interface FinestraSempliceProps {
  titolo: string;
  giudizio: string;
  vento: string;
  temperatura: string;
  termiche: string;
  finestra: string;
  note: string;
}

export default function FinestraSemplice({
  titolo,
  giudizio,
  vento,
  temperatura,
  termiche,
  finestra,
  note,
}: FinestraSempliceProps) {
  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-sky-500/30 rounded-2xl p-4 hover:border-sky-400/50 transition-all duration-200">
      {/* Intestazione */}
      <div className="flex items-center gap-2 mb-3">
        <Sun className="w-5 h-5 text-sky-400 shrink-0" />
        <h3 className="text-sm font-bold text-white">{titolo}</h3>
        <span className="ml-auto text-xs font-bold text-sky-300 bg-sky-900/30 px-2 py-0.5 rounded-full border border-sky-500/30">
          {giudizio}
        </span>
      </div>

      {/* Griglia 4 card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-slate-900/50 rounded-xl p-2.5 text-center">
          <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Vento</div>
          <div className="text-sm font-bold text-cyan-300">{vento}</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-2.5 text-center">
          <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Temp.</div>
          <div className="text-sm font-bold text-amber-300">{temperatura}</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-2.5 text-center">
          <TrendingUp className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Termiche</div>
          <div className="text-sm font-bold text-orange-300">{termiche}</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-2.5 text-center">
          <Clock className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Finestra</div>
          <div className="text-sm font-bold text-emerald-300">{finestra}</div>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 bg-slate-900/40 rounded-xl px-3 py-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed">{note}</p>
      </div>
    </div>
  );
}