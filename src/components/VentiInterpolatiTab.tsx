"use client";

import { Wind, Calendar, TrendingUp, Gauge } from "lucide-react";

export default function VentiInterpolatiTab() {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Wind className="w-4 h-4" />
        Venti interpolati
      </h3>
      <p className="text-slate-400 text-sm">Dati vento interpolati</p>
    </div>
  );
}