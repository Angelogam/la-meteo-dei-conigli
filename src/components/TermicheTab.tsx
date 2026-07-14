"use client";

import React, { useMemo } from "react";
import { calcolaTermiche } from "@/utils/termiche";
import { ArrowUp, TrendingUp, ThermometerSun, CloudSun } from "lucide-react";

interface TermicheTabProps {
  currentData: any;
  dayData: any[];
  site?: { alt: number; lat?: number; lon?: number };
}

export default function TermicheTab({ currentData, dayData, site }: TermicheTabProps) {
  const alt = site?.alt ?? 1000;

  const termichePerOra = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];

    return dayData
      .filter((h: any) => {
        const hh = new Date(h.time).getHours();
        return hh >= 8 && hh <= 19;
      })
      .map((h: any) => {
        const t = calcolaTermiche(h, alt);
        return {
          ora: new Date(h.time).getHours(),
          ...t,
          temp: h.temperature,
          windSpeed: h.windSpeed,
        };
      })
      .sort((a, b) => a.ora - b.ora);
  }, [dayData, alt]);

  if (!termichePerOra || termichePerOra.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <CloudSun className="w-8 h-8 mr-3" />
        <span>Nessun dato termico disponibile</span>
      </div>
    );
  }

  const mediaSalita = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
  const maxSalita = Math.max(...termichePerOra.map(t => t.rateo));
  const oreAttive = termichePerOra.filter(t => t.rateo >= 0.3).length;

  return (
    <div className="space-y-4">
      {/* Riepilogo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 text-center">
          <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-amber-300">{mediaSalita.toFixed(1)}</div>
          <div className="text-xs text-slate-400">Media m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 text-center">
          <ArrowUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-green-300">{maxSalita.toFixed(1)}</div>
          <div className="text-xs text-slate-400">Picco m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 text-center">
          <ThermometerSun className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-orange-300">{oreAttive}</div>
          <div className="text-xs text-slate-400">Ore attive</div>
        </div>
      </div>

      {/* Griglia oraria */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {termichePerOra.map((t) => (
          <div key={t.ora} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 text-center">
            <div className="text-sm font-bold text-slate-300 mb-1">{String(t.ora).padStart(2, "0")}:00</div>
            <div className="text-lg font-bold" style={{ color: t.colore }}>{t.rateo.toFixed(1)} m/s</div>
            <div className="text-xs text-slate-400">{t.label}</div>
            <div className="text-[10px] text-green-300 mt-1">Base {t.base}m</div>
            <div className="text-[10px] text-red-300">Top {t.top}m</div>
          </div>
        ))}
      </div>
    </div>
  );
}