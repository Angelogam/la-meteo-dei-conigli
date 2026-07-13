"use client";

import React, { useMemo, useState, useEffect } from "react";
import GraficoTermiche from "@/components/GraficoTermiche";
import type { CurrentData, DailyData, HourData } from "@/types/meteo";
import { calcolaPrevisioneTermica } from "@/services/algoritmoPrevisioni";
import { fetchRealHourlyData } from "@/services/openMeteoService";
import type { RealHourData } from "@/services/openMeteoService";

interface TermicheTabProps {
  currentData: CurrentData | null;
  dayData: DailyData | null;
  site: { alt: number; lat: number; lon: number };
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
  const [realData, setRealData] = useState<RealHourData[]>([]);
  const [loading, setLoading] = useState(true);

  // Carica dati REALI da Open-Meteo
  useEffect(() => {
    if (!site?.lat || !site?.lon) return;
    
    setLoading(true);
    fetchRealHourlyData(site.lat, site.lon, site.alt, 3)
      .then(data => {
        setRealData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [site?.lat, site?.lon, site?.alt]);

  // Calcola previsioni usando DATI REALI
  const previsioni = useMemo(() => {
    if (realData.length === 0) return [];

    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    
    // Filtra le ore per il giorno selezionato
    const dayHours = realData.filter(h => {
      return h.time.getFullYear() === targetDate.getFullYear() &&
             h.time.getMonth() === targetDate.getMonth() &&
             h.time.getDate() === targetDate.getDate();
    });

    if (dayHours.length === 0) return [];

    return dayHours.map((weather: RealHourData) => {
      const previsione = calcolaPrevisioneTermica(
        weather, // cast compatibile
        weather.cape,
        weather.cin,
        weather.li,
        site.alt
      );

      return {
        hour: weather.time.getHours(),
        previsione,
        weather,
      };
    });
  }, [realData, site.alt, selectedDay]);

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

  if (loading) {
    return (
      <div className="bg-slate-800/40 rounded-xl p-8 border border-slate-700/30 text-center">
        <span className="text-sm text-slate-500">
          ⏳ Caricamento previsioni reali da Open-Meteo...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Badge dati reali */}
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 bg-emerald-900/40 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-700/30">
          ✅ Dati reali Open-Meteo
        </span>
        <span className="text-[10px] text-slate-500">
          {site.lat?.toFixed(2)}, {site.lon?.toFixed(2)} · {realData.length} ore
        </span>
      </div>

      {/* Riepilogo multi-fonte */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <h3 className="text-sm font-semibold mb-3 text-slate-300">
          Previsioni termiche reali 9:00 – 19:00
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-slate-900/40 rounded-lg p-3">
            <span className="text-[10px] text-cyan-400 block">CAPE reale</span>
            <span className="text-base font-bold text-white">
              {Math.round(previsioni.reduce((s, p) => s + p.weather.cape, 0) / Math.max(1, previsioni.length))} J/kg
            </span>
            <span className="text-xs text-slate-400 ml-2">Media</span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-3">
            <span className="text-[10px] text-green-400 block">Temp. reale</span>
            <span className="text-base font-bold text-white">
              {Math.round(previsioni.reduce((s, p) => s + p.weather.temperature, 0) / Math.max(1, previsioni.length))}°C
            </span>
            <span className="text-xs text-slate-400 ml-2">Media</span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-3">
            <span className="text-[10px] text-amber-400 block">Vento reale</span>
            <span className="text-base font-bold text-white">
              {Math.round(previsioni.reduce((s, p) => s + p.weather.windSpeed, 0) / Math.max(1, previsioni.length))} m/s
            </span>
            <span className="text-xs text-slate-400 ml-2">Media</span>
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

      {/* Grafico */}
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
            ⏳ Nessun dato disponibile per il giorno selezionato
          </span>
        </div>
      )}
    </div>
  );
}