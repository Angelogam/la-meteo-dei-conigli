"use client";

import React, { useMemo } from "react";
import { calcolaTermiche } from "@/utils/termiche";
import { ArrowUp, TrendingUp, ThermometerSun, CloudSun, Calendar } from "lucide-react";

interface TermicheTabProps {
  currentData: any;
  dayData: any[];
  site?: { alt: number; lat?: number; lon?: number };
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function TermicheTab({ currentData, dayData, site }: TermicheTabProps) {
  const alt = site?.alt ?? 1000;

  const termichePerOra = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    return dayData
      .filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 8 && hh <= 19; })
      .map((h: any) => { const t = calcolaTermiche(h, alt); return { ora: new Date(h.time).getHours(), ...t, temp: h.temperature, windSpeed: h.windSpeed }; })
      .sort((a, b) => a.ora - b.ora);
  }, [dayData, alt]);

  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) return formatDateShort(new Date(dayData[0].time));
    return formatDateShort(new Date());
  }, [dayData]);

  if (!termichePerOra || termichePerOra.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-base">
        <CloudSun className="w-10 h-10 mr-3" /> Nessun dato termico disponibile
      </div>
    );
  }

  const mediaSalita = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
  const maxSalita = Math.max(...termichePerOra.map(t => t.rateo));
  const oreAttive = termichePerOra.filter(t => t.rateo >= 0.3).length;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-slate-800/60 border border-slate-600/50 px-4 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4 text-slate-400" />{dataGiorno}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-amber-300">{mediaSalita.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Media m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <ArrowUp className="w-6 h-6 text-green-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-green-300">{maxSalita.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Picco m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <ThermometerSun className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-orange-300">{oreAttive}</div>
          <div className="text-sm text-slate-400">Ore attive</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {termichePerOra.map((t) => (
          <div key={t.ora} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-base font-bold text-slate-200 mb-1">{String(t.ora).padStart(2, "0")}:00</div>
            <div className="text-xl font-bold" style={{ color: t.colore }}>{t.rateo.toFixed(1)} m/s</div>
            <div className="text-sm text-slate-400">{t.label}</div>
            <div className="text-sm text-green-300 mt-1">Base {t.base}m</div>
            <div className="text-sm text-red-300">Top {t.top}m</div>
          </div>
        ))}
      </div>
    </div>
  );
}