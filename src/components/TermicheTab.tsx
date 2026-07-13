"use client";

import React, { useMemo } from "react";
import GraficoTermiche from "@/components/GraficoTermiche";
import type { HourData, CurrentData, DailyData } from "@/types/meteo";
import { calcolaPrevisioneTermica } from "@/services/algoritmoPrevisioni";
import { fetchCapeData } from "@/services/capeService";

// Cache per CAPE
let capeCacheGlobal: { time: Date; cape: number; cin: number; li: number }[] = [];
let capeLoaded = false;

interface TermicheTabProps {
  currentData: CurrentData | null;
  dayData: DailyData | null;
  site: { alt: number };
  thermalDelta?: number;
  thermalStrength?: number;
  hourlyData?: HourData[];
  selectedHour: number;
  selectedDay: number;
}

export default function TermicheTab({
  currentData,
  dayData,
  site,
  thermalDelta,
  thermalStrength,
  hourlyData,
  selectedHour,
  selectedDay,
}: TermicheTabProps) {
  // Scarica CAPE al mount
  React.useEffect(() => {
    if (!capeLoaded) {
      capeLoaded = true;
      fetchCapeData(44.2587, 7.7943).then(data => {
        capeCacheGlobal = data;
      });
    }
  }, []);

  // Calcola previsioni multi-fonte
  const previsioni = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];

    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    
    const dayHours = hourlyData.filter((d: any) => {
      const t = new Date(d.time);
      return t.getFullYear() === targetDate.getFullYear() &&
             t.getMonth() === targetDate.getMonth() &&
             t.getDate() === targetDate.getDate();
    });

    if (dayHours.length === 0) return [];

    const result = dayHours.map((weather: HourData) => {
      const capeEntry = capeCacheGlobal.find(c => {
        const ct = c.time;
        const wt = new Date(weather.time);
        return ct.getHours() === wt.getHours() && 
               ct.getDate() === wt.getDate();
      });

      const previsione = calcolaPrevisioneTermica(
        weather,
        capeEntry?.cape ?? 0,
        capeEntry?.cin ?? 0,
        capeEntry?.li ?? 0,
        site.alt
      );

      return {
        hour: new Date(weather.time).getHours(),
        previsione,
        weather,
      };
    });

    // FILTRA SOLO ORE 9:00 – 19:00
    return result.filter(p => p.hour >= 9 && p.hour <= 19);
  }, [hourlyData, site.alt, selectedDay]);

  const hourlyForGraph = useMemo(() => {
    return previsioni.map(p => ({
      hour: p.hour,
      termiche: {
        base: p.previsione.base,
        top: p.previsione.top,
        forza: Math.min(10, p.previsione.rateoFinale / 0.5),
        rateo: p.previsione.rateoFinale,
        label: p.previsione.label,
        colore: 
          p.previsione.rateoFinale >= 4 ? "#ef4444" :
          p.previsione.rateoFinale >= 3 ? "#f97316" :
          p.previsione.rateoFinale >= 2 ? "#eab308" :
          p.previsione.rateoFinale >= 1 ? "#84cc16" :
          p.previsione.rateoFinale >= 0.3 ? "#6b7280" : "#475569",
        gradienteReale: 0.98,
      },
    }));
  }, [previsioni]);

  return (
    <div className="space-y-6">
      {/* Riepilogo multi-fonte */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <h3 className="text-sm font-semibold mb-3 text-slate-300">Motore previsionale multi-fonte</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-slate-900/40 rounded-lg p-3">
            <span className="text-[10px] text-cyan-400 block">GFS / CAPE</span>
            <span className="text-base font-bold text-white">40%</span>
            <span className="text-xs text-slate-400 ml-2">Energia convettiva</span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-3">
            <span className="text-[10px] text-green-400 block">Open-Meteo</span>
            <span className="text-base font-bold text-white">35%</span>
            <span className="text-xs text-slate-400 ml-2">Condizioni locali</span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-3">
            <span className="text-[10px] text-amber-400 block">Climatologia</span>
            <span className="text-base font-bold text-white">25%</span>
            <span className="text-xs text-slate-400 ml-2">Pattern stagionali</span>
          </div>
        </div>
      </div>

      {/* Tabella previsioni */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-2 px-2 text-slate-400">Ora</th>
              <th className="text-left py-2 px-2 text-slate-400">Finale</th>
              <th className="text-left py-2 px-2 text-cyan-400/70">GFS</th>
              <th className="text-left py-2 px-2 text-green-400/70">OM</th>
              <th className="text-left py-2 px-2 text-amber-400/70">Clim</th>
              <th className="text-left py-2 px-2 text-slate-400">Confidenza</th>
              <th className="text-left py-2 px-2 text-slate-400">Base</th>
              <th className="text-left py-2 px-2 text-slate-400">Top</th>
              <th className="text-left py-2 px-2 text-slate-400">Label</th>
            </tr>
          </thead>
          <tbody>
            {previsioni.map((p) => (
              <tr key={p.hour} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                <td className="py-2 px-2 font-bold text-white">
                  {String(p.hour).padStart(2, "0")}:00
                </td>
                <td className="py-2 px-2 text-amber-300 font-bold">
                  {p.previsione.rateoFinale.toFixed(1)} m/s
                </td>
                <td className="py-2 px-2 text-cyan-300">
                  {p.previsione.rateoGFS.toFixed(1)}
                </td>
                <td className="py-2 px-2 text-green-300">
                  {p.previsione.rateoOpenMeteo.toFixed(1)}
                </td>
                <td className="py-2 px-2 text-amber-300">
                  {p.previsione.rateoClimatologia.toFixed(1)}
                </td>
                <td className="py-2 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    p.previsione.confidenza > 0.7 ? "bg-green-900/50 text-green-300" :
                    p.previsione.confidenza > 0.4 ? "bg-amber-900/50 text-amber-300" :
                    "bg-red-900/50 text-red-300"
                  }`}>
                    {Math.round(p.previsione.confidenza * 100)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-slate-300">{p.previsione.base}m</td>
                <td className="py-2 px-2 text-slate-300">{p.previsione.top}m</td>
                <td className="py-2 px-2 text-xs">{p.previsione.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grafico termiche multi-fonte */}
      {hourlyForGraph.length > 0 && (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
          <GraficoTermiche
            hourly={hourlyForGraph}
            oraCorrente={selectedHour}
          />
        </div>
      )}

      {previsioni.length === 0 && (
        <div className="bg-slate-800/40 rounded-xl p-8 border border-slate-700/30 text-center">
          <span className="text-sm text-slate-500">
            ⏳ Recupero dati multi-fonte...
          </span>
        </div>
      )}
    </div>
  );
}