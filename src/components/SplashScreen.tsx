"use client";

import React, { useEffect, useState } from "react";
import { CloudSun, Wind, Thermometer, Sparkles } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const messages = [
    "Svegliando i coniglietti... 🐰",
    "Consultando le stelle... ⭐",
    "Analizzando i venti... 🌬️",
    "Preparando le termiche... 🔥",
    "Pronti al decollo! 🪂",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 8 + 3;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onFinish, 500);
          return 100;
        }
        return Math.min(next, 100);
      });
    }, 200);

    return () => clearInterval(timer);
  }, [onFinish]);

  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhase(prev => Math.min(prev + 1, messages.length - 1));
    }, 900);
    return () => clearInterval(phaseTimer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Particelle decorative */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-emerald-400/30 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
          }}
        />
      ))}

      <div className="relative mb-8">
        {/* Cerchio glow */}
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />

        {/* Coniglietti */}
        <div className="flex items-center gap-6 relative">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-orange-400/30 to-amber-400/20 border-2 border-orange-400/50 flex items-center justify-center animate-hop shadow-2xl shadow-orange-500/30">
            <span className="text-4xl md:text-5xl drop-shadow-md">🐰</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative">
              <CloudSun className="w-12 h-12 md:w-16 md:h-16 text-emerald-300 animate-float" />
              <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>

          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-sky-400/30 to-emerald-400/20 border-2 border-sky-400/50 flex items-center justify-center animate-hop shadow-2xl shadow-sky-500/30" style={{ animationDelay: '0.3s' }}>
            <span className="text-4xl md:text-5xl drop-shadow-md">🐰</span>
          </div>
        </div>
      </div>

      {/* Titolo */}
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
        <span className="bg-gradient-to-r from-orange-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-lg">
          Meteo dei Conigli
        </span>
      </h1>

      <p className="text-emerald-300/80 text-lg md:text-xl font-medium mb-8 animate-pulse">
        {messages[phase]}
      </p>

      {/* Barra di progresso */}
      <div className="w-64 md:w-96 h-2 bg-slate-800/60 rounded-full overflow-hidden border border-emerald-500/20">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-slate-500 text-sm mt-3 font-mono">{Math.round(progress)}%</p>
    </div>
  );
}