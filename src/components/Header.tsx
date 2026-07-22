"use client";

import { CloudSun, Navigation } from "lucide-react";

export const Header = () => {
  return (
    <header className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-emerald-800/20 overflow-hidden">
      {/* Bagliore superiore elegante */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
      
      {/* Sfumature decorative */}
      <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-center gap-3 md:gap-5">
          {/* Icona sinistra - stilizzata */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 flex items-center justify-center">
                <Navigation className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Titolo centrale migliorato */}
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-emerald-300 via-green-400 to-teal-300 bg-clip-text text-transparent drop-shadow-md">
                Meteo dei Conigli
              </span>
            </h1>
            <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-0.5 tracking-wider uppercase">
              Previsioni per volo libero
            </p>
          </div>

          {/* Icona destra - stilizzata */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-sky-500/20 to-sky-400/10 border border-sky-500/30 flex items-center justify-center">
                <CloudSun className="w-4 h-4 md:w-5 md:h-5 text-sky-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};