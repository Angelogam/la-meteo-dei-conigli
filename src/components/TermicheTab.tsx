"use client";

import React, { useMemo } from "react";
import GraficoTermiche from "@/components/GraficoTermiche";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface TermicheTabProps {
  currentData: any;
  dayData: any;
  site: { alt: number; lat?: number; lon?: number };
  thermalDelta?: number;
  thermalStrength?: any;
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

  // Calcola termiche REALI dai dati orari di Open-Meteo
  const previsioni = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];

    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);

    // Filtra dati orari per il giorno selezionato
    const dayHours = hourlyData.filter((d: any) => {
      const t = new Date(d.time);
      return t.getFullYear() === targetDate.getFullYear() &&
             t.getMonth() === targetDate.getMonth() &&
             t.getDate() === targetDate.getDate();
    });

    if (dayHours.length === 0) return [];

    return dayHours
      .map((weather: HourData) => {
        const hour = new Date(weather.time).getHours();
        const t = calcolaTermiche(weather, site.alt);
        return { hour, previsione: t, weather };
      })
      // Solo ore 9:00 – 19:00
      .filter(p => p.hour >= 9 && p.hour <= 19)
      .sort((a, b) => a.hour - b.hour);
  }, [hourlyData, site.alt, selectedDay]);

  // Dati per grafico
  const hourlyForGraph = useMemo(() => {
    return previsioni.map(p => ({
      hour: p.hour,
      termiche: {
        base: p.previsione.base,
        top: p.previsione.top,
        forza: p.previsione.forza,
        rateo: p.previsione.rateo,
        label: p.previsione.label,
        colore: p.previsione.colore,
        gradienteReale: p.previsione.gradienteReale,
      },
    }));
  }, [previsioni]);

  // Riepilogo
  const riepilogo = useMemo(() => {
    if (previsioni.length === 0) return null;

    const ratei = previsioni.map(p => p.previsione.rateo);
    const media = ratei.reduce((s, v) => s + v, 0) / ratei.length;
    const max = Math.max(...ratei);
    const oreAttive = previsioni.filter(p => p.previsione.rateo >= 0.3).length;

    return {
      media: Math.round(media * 10) / 10,
      max: Math.round(max * 10) / 10,
      oreAttive,
      totale: previsioni.length,
    };
  }, [previsioni]);

  if (previsioni.length === 0) {
    return (
      <div className="bg-slate-800/40 rounded-xl p-8 border border-slate-700/30 text-center">
        <span className="text-sm text-slate-500">
          ⏳ Recupero dati meteo in corso...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Riepilogo */}
      {riepilogo && (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Termiche reali · Open-Meteo</h3>
            <span className="text-[10px] text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded-full">
              {riepilogo.oreAttive}/{riepilogo.totale} ore attive
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/40 rounded-lg p-3">
              <span className="text-[10px] text-amber-400 block">Rateo medio</span>
              <span className="text-xl font-bold text-amber-300">{riepilogo.media}</span>
              <span className="text-xs text-slate-400 ml-1">m/s</span>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3">
              <span className="text-[10px] text-green-400 block">Rateo massimo</span>
              <span className="text-xl font-bold text-green-300">{riepilogo.max}</span>
              <span className="text-xs text-slate-400 ml-1">m/s</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 text-center">
            {previsioni.length} ore (9:00–19:00) · Calcolato da dati reali
          </div>
        </div>
      )}

      {/* Tabella previsioni orarie 9:00-19:00 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-2 px-2 text-slate-400">Ora</th>
              <th className="text-left py-2 px-2 text-slate-400">Rateo</th>
              <th className="text-left py-2 px-2 text-slate-400">Forza</th>
              <th className="text-left py-2 px-2 text-slate-400">Base</th>
              <th className="text-left py-2 px-2 text-slate-400">Top</th>
              <th className="text-left py-2 px-2 text-slate-400">Δ</th>
              <th className="text-left py-2 px-2 text-slate-400">Gradiente</th>
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
                  {p.previsione.rateo.toFixed(1)} m/s
                </td>
                <td className="py-2 px-2 text-slate-300">
                  {p.previsione.forza.toFixed(1)}/10
                </td>
                <td className="py-2 px-2 text-slate-300">{p.previsione.base}m</td>
                <td className="py-2 px-2 text-slate-300">{p.previsione.top}m</td>
                <td className="py-2 px-2 text-slate-300">{p.previsione.top - p.previsione.base}m</td>
                <td className="py-2 px-2 text-slate-300">{p.previsione.gradienteReale}°C/100m</td>
                <td className="py-2 px-2 text-xs font-medium" style={{ color: p.previsione.colore }}>
                  {p.previsione.label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grafico termiche */}
      {hourlyForGraph.length > 0 && (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
          <GraficoTermiche
            hourly={hourlyForGraph}
            oraCorrente={selectedHour}
          />
        </div>
      )}
    </div>
  );
}