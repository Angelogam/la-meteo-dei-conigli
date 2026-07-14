"use client";

import React, { useMemo, useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { Thermometer, Mountain, ArrowUp, TrendingUp, X, Gauge } from "lucide-react";
import { useWeatherData } from "@/hooks/useWeatherData";

interface ZeroTermicoWindowProps {
  onClose?: () => void;
}

export default function ZeroTermicoWindow({ onClose }: ZeroTermicoWindowProps) {
  const { allHourlyData } = useWeatherData();
  
  const datiZeroTermico = useMemo(() => {
    return DECOLLI.map(site => {
      const hourly = allHourlyData[site.id];
      if (!hourly || hourly.length === 0) return null;

      // Prende il giorno corrente (oggi)
      const oggi = new Date();
      const todayHours = hourly.filter(h => {
        const t = h.time;
        return t.getFullYear() === oggi.getFullYear() &&
               t.getMonth() === oggi.getMonth() &&
               t.getDate() === oggi.getDate();
      });

      if (todayHours.length === 0) return null;

      // Temperature medie per calcolare zero termico
      const temps = todayHours.map(h => h.temperature).filter(t => t != null);
      const tempMedia = temps.length > 0 
        ? temps.reduce((s, v) => s + v, 0) / temps.length 
        : 15;
      const tempMax = temps.length > 0 ? Math.max(...temps) : 0;
      
      // Zero termico: quota + (tempMedia / gradiente adiabatico secco) × 100
      const zeroTermico = Math.round(site.altitude + (tempMedia / 0.0098));

      return {
        ...site,
        zeroTermico,
        tempMedia: Math.round(tempMedia),
        tempMax: Math.round(tempMax),
        haDati: true,
      };
    }).filter(Boolean) as (typeof DECOLLI[0] & { zeroTermico: number; tempMedia: number; tempMax: number; haDati: boolean })[];
  }, [allHourlyData]);

  // Ordina per zero termico decrescente
  const ordinati = useMemo(() => {
    return [...datiZeroTermico].sort((a, b) => b.zeroTermico - a.zeroTermico);
  }, [datiZeroTermico]);

  const mediaZero = ordinati.length > 0 
    ? Math.round(ordinati.reduce((s, d) => s + d.zeroTermico, 0) / ordinati.length) 
    : 0;
  const minZero = ordinati.length > 0 ? Math.min(...ordinati.map(d => d.zeroTermico)) : 0;
  const maxZero = ordinati.length > 0 ? Math.max(...ordinati.map(d => d.zeroTermico)) : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 border-2 border-emerald-500/30 rounded-2xl p-5 shadow-2xl shadow-emerald-500/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-800/60 to-red-800/30 border border-orange-500/40 flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Zero termico · tutti i decolli</h3>
            <p className="text-xs text-slate-400">
              Media {mediaZero}m · Min {minZero}m · Max {maxZero}m
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-700/50 border border-slate-600/30 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grafico a barre */}
      <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
        {ordinati.map((d, i) => {
          const percentuale = maxZero > 0 ? (d.zeroTermico / maxZero) * 100 : 50;
          const isAlto = d.zeroTermico > 3000;
          const isMedio = d.zeroTermico > 2200;
          const isBasso = d.zeroTermico > 1500;
          const barColor = isAlto ? "bg-orange-500" : isMedio ? "bg-amber-500" : isBasso ? "bg-green-500" : "bg-blue-500";

          return (
            <div
              key={d.id}
              className="grid grid-cols-[1fr_100px_80px] gap-3 items-center py-2 px-3 rounded-lg hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-slate-500 font-mono w-6 shrink-0">{i + 1}</span>
                <span className="text-sm font-bold text-white truncate">{d.name}</span>
                <span className="text-[10px] text-slate-500 shrink-0">{d.altitude}m</span>
              </div>

              {/* Barra zero termico */}
              <div className="h-6 bg-slate-800/60 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.max(percentuale, 15)}%` }}
                >
                  <span className="text-[10px] text-white font-bold">{d.zeroTermico}</span>
                </div>
              </div>

              {/* Temperatura media */}
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Thermometer className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="font-bold text-amber-200">{d.tempMedia}°</span>
                <span className="text-slate-500">media</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-700/30">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-full bg-orange-500" /> >3000m (molto alto)
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-full bg-amber-500" /> 2200-3000m
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-full bg-green-500" /> 1500-2200m
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-full bg-blue-500" /> <1500m (basso)
        </div>
      </div>
    </div>
  );
}