"use client";

import React from "react";
import { Loader2, CloudSun } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <CloudSun className="w-8 h-8 text-emerald-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="mt-6 text-lg text-slate-200 font-semibold tracking-wide animate-pulse">
        Caricamento previsioni meteo...
      </p>
      <p className="text-sm text-slate-400 mt-2">
        Consulto le migliori fonti per il tuo volo
      </p>
      <div className="flex gap-1.5 mt-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-emerald-400/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}