"use client";

import React from "react";

export const Header = () => {
  return (
    <header className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-b border-orange-800/20 overflow-hidden">
      {/* Bagliore sottile in alto */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
      
      {/* Decorazioni di luce soffuse */}
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-3.5 md:py-4">
        <div className="flex items-center justify-center gap-3 md:gap-5">
          {/* Logo Mascotte MeteoConigli */}
          <div className="relative group shrink-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white p-1 shadow-lg shadow-orange-500/20 border-2 border-orange-400/40 flex items-center justify-center transition-transform group-hover:scale-105">
              <img
                src="/logo.svg"
                alt="Meteo dei Conigli Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center" title="Previsioni attive">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </div>
          </div>

          {/* Titolo e Dettagli */}
          <div className="flex flex-col items-start text-left">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent drop-shadow-md">
                Meteo dei Conigli
              </span>
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-400 mt-0.5 tracking-wide flex items-center gap-2">
              <span>Previsioni & Aerologia per Volo Libero</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-emerald-400 font-semibold">Open-Meteo AROME</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};