"use client";

import React from "react";
import { Zap } from "lucide-react"; // Risolve TS2304

export const MeteoTesterPanel: React.FC = () => {
  return (
    <div className="p-4 bg-slate-800/60 border border-slate-700/40 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-white">Meteo Tester</h3>
      </div>
      <p className="text-xs text-slate-400">Pannello di test per simulazione parametri atmosferici.</p>
    </div>
  );
};

export default MeteoTesterPanel;