"use client";

import React from "react";
import { Activity, RefreshCw, Clock, CheckCircle } from "lucide-react";

interface RefreshIndicatoreProps {
  tempoTrascorso: number;
  ultimoAggiornamento: Date;
  loading: boolean;
  errore: string | null;
}

export default function RefreshIndicatore({ tempoTrascorso, ultimoAggiornamento, loading, errore }: RefreshIndicatoreProps) {
  const secondiDalUltimoAggiornamento = Math.floor((Date.now() - ultimoAggiornamento.getTime()) / 1000);
  
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
        <span className="text-sm font-bold text-white">
          {loading ? "Aggiornamento in corso..." : "Dati aggiornati"}
        </span>
        <span className="text-xs text-slate-500 ml-auto">
          <Clock className="w-3 h-3 inline mr-1" />
          {tempoTrascorso}s
        </span>
      </div>

      {!loading && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          <span>Ultimo aggiornamento: {ultimoAggiornamento.toLocaleTimeString("it-IT")}</span>
          <span className="text-slate-600">·</span>
          <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
          <span>Refresh ogni 4s</span>
        </div>
      )}

      {errore && (
        <div className="text-[10px] text-red-400 mt-1">
          Errore: {errore}
        </div>
      )}
    </div>
  );
}