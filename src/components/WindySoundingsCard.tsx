"use client";

import React from "react";
import { CloudLightning, Wind, CloudRain } from "lucide-react";

interface WindySoundingsCardProps {
  siteName?: string;
}

export default function WindySoundingsCard({ siteName }: WindySoundingsCardProps) {
  return (
    <div className="bg-slate-900/90 border-2 border-violet-500 rounded-2xl overflow-hidden shadow-xl shadow-violet-900/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-900/80 to-slate-900/80 px-4 py-3 border-b border-violet-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudLightning className="w-5 h-5 text-violet-400" />
            <span className="text-sm font-black text-white">Windy PG Soundings</span>
          </div>
          <span className="text-[10px] text-violet-300/70 font-semibold">v1.6.2</span>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-4 space-y-4">
        {/* Skew-T diagram placeholder */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CloudRain className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-white">Profilo verticale — Skew-T</span>
          </div>
          
          {/* Diagramma */}
          <div className="relative h-40 bg-slate-900/60 rounded-lg overflow-hidden">
            {/* Griglia */}
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={`iso-${i}`}
                className="absolute border-l border-dashed border-slate-600/20 h-full"
                style={{ left: `${5 + i * 10}%` }}
              />
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={`adiab-${i}`}
                className="absolute w-full border-t border-dashed border-slate-600/20"
                style={{ top: `${10 + i * 18}%` }}
              />
            ))}
            
            {/* Profilo temperatura */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tempGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              {/* Temperatura */}
              <polyline
                fill="none"
                stroke="url(#tempGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                points="10,90 25,75 40,62 55,52 70,44 85,36 100,30 115,25 130,20 145,16 160,13 175,10 190,8"
              />
              {/* Rugiada */}
              <polyline
                fill="none"
                stroke="#6366F1"
                strokeWidth="1.5"
                strokeDasharray="4,3"
                points="10,95 25,88 40,80 55,72 70,64 85,56 100,48 115,40 130,33 145,28 160,23 175,19 190,16"
              />
              {/* Livello 0°C */}
              <line x1="0" y1="30" x2="200" y2="30" stroke="#EF4444" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.6" />
              <text x="195" y="28" fill="#EF4444" fontSize="6" textAnchor="end">0°C</text>
            </svg>
            
            {/* Labels */}
            <div className="absolute top-1 right-2 text-[8px] text-slate-500">1000 hPa</div>
            <div className="absolute bottom-1 left-2 text-[8px] text-slate-500">-40°C</div>
            <div className="absolute bottom-1 right-2 text-[8px] text-slate-500">+20°C</div>
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-gradient-to-r from-amber-500 to-blue-500 rounded" /> Temperatura
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-indigo-500 border-t border-dashed" /> Rugiada
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-red-500 border-t border-dashed" /> Liv. 0°C
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40 text-center">
            <div className="text-[10px] text-slate-500 font-medium">CAPE</div>
            <div className="text-xl font-black text-emerald-400">120</div>
            <div className="text-[9px] text-emerald-400/70">J/kg</div>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40 text-center">
            <div className="text-[10px] text-slate-500 font-medium">Liv. 0°C</div>
            <div className="text-xl font-black text-amber-400">3,800m</div>
            <div className="text-[9px] text-slate-500">quota</div>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40 text-center">
            <div className="text-[10px] text-slate-500 font-medium">Vento 850hPa</div>
            <div className="text-xl font-black text-sky-400">22</div>
            <div className="text-[9px] text-slate-500">km/h S-SE</div>
          </div>
        </div>

        {/* Link */}
        <div className="text-center pt-2 border-t border-slate-700/30">
          <a
            href="https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            <Wind className="w-3.5 h-3.5" />
            Plugin originale Windy (apri in nuova scheda)
          </a>
        </div>
      </div>
    </div>
  );
}
