"use client";

import { Sunrise, Wind } from "lucide-react";

export const Header = () => {
  return (
    <header className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-b border-orange-800/20 overflow-hidden">
      {/* Bagliore sottile in alto */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
      
      {/* Decorazione laterale destra */}
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-orange-500/5 blur-3xl" />
      <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-5">
        <div className="flex items-center justify-center gap-4 md:gap-8">
          {/* Decorazione sinistra - desktop */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-10 h-px bg-orange-500/30" />
            <Sunrise className="w-5 h-5 text-orange-400/60" />
            <div className="w-10 h-px bg-orange-500/30" />
          </div>

          {/* Titolo centrale */}
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-orange-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-lg">
                Meteo dei Conigli
              </span>
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 tracking-wide">
              Previsioni per volo libero · Open-Meteo · SHV FSVL Style
            </p>
          </div>

          {/* Decorazione destra - desktop */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-10 h-px bg-orange-500/30" />
            <Wind className="w-5 h-5 text-sky-400/60" />
            <div className="w-10 h-px bg-orange-500/30" />
          </div>
        </div>
      </div>
    </header>
  );
};