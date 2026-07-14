"use client";

import { CloudSun, Wind } from "lucide-react";

export const Header = () => {
  return (
    <header className="relative bg-slate-900 border-b border-slate-800/80 overflow-hidden">
      {/* Linea sottile superiore */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <CloudSun className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-100">
              Meteo del Volo
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Previsioni per volo libero · Piemonte
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center">
              <Wind className="w-5 h-5 text-sky-400" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
