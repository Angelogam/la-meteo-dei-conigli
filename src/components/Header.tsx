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
        <div className="flex items-center justify-between gap-3 md:gap-5">

          {/* Coniglio con parapendio — SINISTRA, animato */}
          <div
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center shrink-0
                       drop-shadow-[0_4px_12px_rgba(234,88,12,0.3)]"
            style={{ animation: "bounce 2s ease-in-out infinite" }}
          >
            <img src="/logo.svg" alt="Coniglio con parapendio" className="w-full h-full object-contain" />
          </div>

          {/* Titolo e sottotitoli — CENTRATI */}
          <div className="flex flex-col items-center text-center min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent drop-shadow-md">
                Meteo dei Conigli
              </span>
            </h1>
            <div className="flex flex-col items-center gap-0.5 mt-1">
              <p className="text-[11px] md:text-xs font-medium text-slate-400 tracking-wide">
                Previsioni &bull; Aerologia &bull; Volo Libero
              </p>
              <p className="text-[11px] md:text-xs font-semibold text-emerald-400 tracking-wide">
                Open-Meteo AROME
              </p>
            </div>
          </div>

          {/* Coniglio con parapendio — DESTRA, animato (mirror) */}
          <div
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center shrink-0
                       drop-shadow-[0_4px_12px_rgba(234,88,12,0.3)]"
            style={{ animation: "bounce 2s ease-in-out infinite 0.5s" }}
          >
            <img src="/logo.svg" alt="Coniglio con parapendio" className="w-full h-full object-contain -scale-x-100" />
          </div>

        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-7px); }
        }
      `}</style>
    </header>
  );
};
