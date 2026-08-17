"use client";

import React from "react";
import { Wind, Info, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { InterpretazioneVento } from "@/utils/windInterpretation";

interface InterpretazioneVentoCardProps {
  interpretazione: InterpretazioneVento;
}

export default function InterpretazioneVentoCard({ interpretazione }: InterpretazioneVentoCardProps) {
  const [open, setOpen] = React.useState(false);

  if (!interpretazione || !interpretazione.riassunto) return null;

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
      {/* Riga riassuntiva (sempre visibile) */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Wind className="w-5 h-5 text-cyan-400 shrink-0" />
        <p className="text-sm text-slate-200 flex-1">
          {interpretazione.riassunto}
        </p>
        {interpretazione.warning && (
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
        )}
        <button
          onClick={() => setOpen(!open)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Dettaglio espandibile */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/30 pt-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            {interpretazione.dettaglio}
          </p>

          {interpretazione.condizioniQuota.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Condizioni per quota</div>
              {interpretazione.condizioniQuota.map((cq, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-20 shrink-0 font-mono text-slate-300">{cq.quota}</span>
                  <span className="w-28 shrink-0 font-mono text-cyan-300">{cq.vento}</span>
                  <span className="text-slate-400">{cq.interpretazione}</span>
                </div>
              ))}
            </div>
          )}

          {interpretazione.warning && (
            <div className="flex items-start gap-2 rounded-lg bg-orange-900/20 border border-orange-500/30 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-200">{interpretazione.warning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}