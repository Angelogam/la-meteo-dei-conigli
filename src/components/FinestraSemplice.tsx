"use client";

import React from "react";
import { Clock, Thermometer, Wind, ArrowUp, Cloud, Info } from "lucide-react";

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
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
      {/* Titolo + giudizio */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-white leading-tight">{titolo}</h3>
        <span className="shrink-0 text-xs font-bold bg-emerald-900/40 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 whitespace-nowrap">
          {giudizio}
        </span>
      </div>

      {/* Griglia dati principali */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-900/50 rounded-xl p-2.5 text-center">
          <Wind className="w-4 h-4 text-sky-400 mx-auto mb-0.5" />
          <div className="text-xs font-bold text-sky-300">{vento}</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-2.5 text-center">
          <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-0.5" />
          <div className="text-xs font-bold text-amber-300">{temperatura}</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-2.5 text-center">
          <ArrowUp className="w-4 h-4 text-orange-400 mx-auto mb-0.5" />
          <div className="text-xs font-bold text-orange-300">{termiche}</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-2.5 text-center">
          <Clock className="w-4 h-4 text-emerald-400 mx-auto mb-0.5" />
          <div className="text-xs font-bold text-emerald-300">{finestra}</div>
        </div>
      </div>

      {/* Note */}
      {note && (
        <div className="flex items-start gap-1.5 text-xs text-slate-400 bg-slate-900/40 rounded-xl px-3 py-2 border border-slate-700/30">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}