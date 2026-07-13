"use client";

import React, { useMemo } from "react";
import GraficoTermiche from "@/components/GraficoTermiche";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import {
  Thermometer,
  Wind,
  Cloud,
  Droplets,
  ArrowUp,
  TrendingUp,
  Clock,
  Sun,
  Gauge,
  Sparkles,
  Activity,
} from "lucide-react";

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
    const bestHour = previsioni.reduce((best, p) => p.previsione.rateo > best.previsione.rateo ? p : best, previsioni[0]);

    let giornataLabel = "";
    let giornataColore = "";
    if (media >= 3) { giornataLabel = "ECCELLENTE"; giornataColore = "#ef4444"; }
    else if (media >= 2) { giornataLabel = "BUONA"; giornataColore = "#f97316"; }
    else if (media >= 1) { giornataLabel = "DISCRETA"; giornataColore = "#eab308"; }
    else if (media >= 0.3) { giornataLabel = "DEBOLE"; giornataColore = "#84cc16"; }
    else { giornataLabel = "ASSENTI"; giornataColore = "#64748b"; }

    return {
      media: Math.round(media * 10) / 10,
      max: Math.round(max * 10) / 10,
      oreAttive,
      totale: previsioni.length,
      bestHour: bestHour.hour,
      bestRateo: bestHour.previsione.rateo,
      bestLabel: bestHour.previsione.label,
      bestColore: bestHour.previsione.colore,
      giornataLabel,
      giornataColore,
    };
  }, [previsioni]);

  const currentThermic = useMemo(() => {
    if (!previsioni.length) return null;
    return previsioni.find(p => p.hour === selectedHour) || null;
  }, [previsioni, selectedHour]);

  if (previsioni.length === 0) {
    return (
      <div className="bg-slate-800/40 rounded-2xl p-12 border border-slate-700/30 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 border border-slate-600/50 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-slate-400 animate-pulse" />
        </div>
        <span className="text-base text-slate-400 font-medium">
          Recupero dati meteo in corso...
        </span>
        <p className="text-sm text-slate-500 mt-2">Attendi qualche secondo, i dati stanno arrivando</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* BANNER GIORNATA */}
      {riepilogo && (
        <div
          className="rounded-2xl p-5 border-2 relative overflow-hidden transition-all duration-300 hover:border-green-400/50 group cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${riepilogo.giornataColore}22, ${riepilogo.giornataColore}08)`,
            borderColor: `${riepilogo.giornataColore}44`,
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.07] pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${riepilogo.giornataColore}, transparent)`,
              transform: 'translate(30%, -30%)',
            }}
          />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 shrink-0"
                style={{
                  backgroundColor: `${riepilogo.giornataColore}20`,
                  borderColor: `${riepilogo.giornataColore}40`,
                }}
              >
                {riepilogo.media >= 3 ? "🔥" : riepilogo.media >= 2 ? "🪂" : riepilogo.media >= 1 ? "🌤️" : riepilogo.media >= 0.3 ? "🌥️" : "❄️"}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 tracking-wide">
                  Giornata <span style={{ color: riepilogo.giornataColore }}>{riepilogo.giornataLabel}</span>
                </h3>
                <p className="text-sm text-slate-400 mt-0.5 tracking-wide">
                  <strong className="text-slate-300">{riepilogo.oreAttive}</strong> ore attive su {riepilogo.totale} · 
                  Migliore alle <strong className="text-slate-300">{String(riepilogo.bestHour).padStart(2, "0")}:00</strong> ({riepilogo.bestRateo.toFixed(1)} m/s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-700/40">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Media</span>
                <div className="text-xl font-bold text-amber-300 mt-0.5">{riepilogo.media} <span className="text-sm text-slate-400 font-normal">m/s</span></div>
              </div>
              <div className="text-center bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-700/40">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Picco</span>
                <div className="text-xl font-bold text-green-300 mt-0.5">{riepilogo.max} <span className="text-sm text-slate-400 font-normal">m/s</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETTAGLIO ORA SELEZIONATA */}
      {currentThermic && (
        <div
          className="rounded-2xl p-5 border-2 relative overflow-hidden transition-all duration-300 hover:border-green-400/50 group cursor-default"
          style={{
            background: `linear-gradient(135deg, ${currentThermic.previsione.colore}18, transparent)`,
            borderColor: `${currentThermic.previsione.colore}30`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border-2 shadow-lg shrink-0"
                style={{
                  backgroundColor: `${currentThermic.previsione.colore}25`,
                  borderColor: `${currentThermic.previsione.colore}50`,
                  boxShadow: `0 0 20px ${currentThermic.previsione.colore}20`,
                }}
              >
                {currentThermic.previsione.rateo >= 3 ? "🔥" : currentThermic.previsione.rateo >= 2 ? "🪂" : currentThermic.previsione.rateo >= 1 ? "🌤️" : currentThermic.previsione.rateo >= 0.3 ? "🌥️" : "❄️"}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-700/50">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-base font-bold text-white tabular-nums tracking-wider">
                      {String(currentThermic.hour).padStart(2, "0")}:00
                    </span>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-bold border-2 tracking-wide"
                    style={{
                      color: currentThermic.previsione.colore,
                      borderColor: `${currentThermic.previsione.colore}50`,
                      backgroundColor: `${currentThermic.previsione.colore}15`,
                    }}
                  >
                    {currentThermic.previsione.label}
                  </span>
                </div>
                <p className="text-sm text-slate-400 tracking-wide">
                  Gradiente termico: <strong className="text-purple-300">{currentThermic.previsione.gradienteReale}°C/100m</strong> · 
                  Spessore: <strong className="text-amber-300">{currentThermic.previsione.top - currentThermic.previsione.base}m</strong>
                </p>
              </div>
            </div>

            <div
              className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 shrink-0"
              style={{
                backgroundColor: `${currentThermic.previsione.colore}20`,
                borderColor: `${currentThermic.previsione.colore}40`,
              }}
            >
              <span
                className="text-3xl font-extrabold tabular-nums tracking-tight"
                style={{ color: currentThermic.previsione.colore }}
              >
                {currentThermic.previsione.rateo.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider">m/s</span>
            </div>
          </div>

          {/* Griglia metriche 4 colonne */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30 text-center">
              <ArrowUp className="w-4 h-4 text-green-400 mb-1.5 mx-auto" />
              <span className="text-[10px] text-slate-400 tracking-wide block mb-0.5">Base termica (LCL)</span>
              <span className="text-base font-bold text-green-300 tracking-tight">{currentThermic.previsione.base} <span className="text-xs text-green-400/70 font-normal">m</span></span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30 text-center">
              <ArrowUp className="w-4 h-5 text-red-400 mb-1.5 mx-auto rotate-180" />
              <span className="text-[10px] text-slate-400 tracking-wide block mb-0.5">Cima termica (Top)</span>
              <span className="text-base font-bold text-red-300 tracking-tight">{currentThermic.previsione.top} <span className="text-xs text-red-400/70 font-normal">m</span></span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30 text-center">
              <Activity className="w-4 h-5 text-amber-400 mb-1.5 mx-auto" />
              <span className="text-[10px] text-slate-400 tracking-wide block mb-0.5">Spessore verticale</span>
              <span className="text-base font-bold text-amber-300 tracking-tight">{currentThermic.previsione.top - currentThermic.previsione.base} <span className="text-xs text-amber-400/70 font-normal">m</span></span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30 text-center">
              <TrendingUp className="w-4 h-5 text-purple-400 mb-1.5 mx-auto" />
              <span className="text-[10px] text-slate-400 tracking-wide block mb-0.5">Indice di forza</span>
              <span className="text-base font-bold text-purple-300 tracking-tight">{currentThermic.previsione.forza.toFixed(1)} <span className="text-xs text-purple-400/70 font-normal">/ 10</span></span>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDE ORARIE 9:00–19:00 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-orange-400" />
          <h4 className="text-sm font-bold text-slate-200 tracking-wide">Previsioni orarie 9:00 – 19:00</h4>
          <span className="text-xs text-slate-500 bg-slate-800/60 px-2.5 py-0.5 rounded-full tracking-wide font-medium">
            {previsioni.length} ore
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {previsioni.map((p) => {
            const isCurrent = p.hour === selectedHour;
            return (
              <div
                key={p.hour}
                className={`rounded-xl border-2 p-3 transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
                  isCurrent
                    ? "border-green-400/60 bg-green-900/20 shadow-lg shadow-green-500/20"
                    : "border-slate-700/40 bg-slate-800/40 hover:border-green-400/30 hover:bg-slate-700/40"
                }`}
              >
                {/* Ora + icona */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-sm font-bold tabular-nums tracking-wide ${isCurrent ? "text-green-300" : "text-white"}`}>
                    {String(p.hour).padStart(2, "0")}:00
                  </span>
                  <span className="text-xl">{p.previsione.rateo >= 3 ? "🔥" : p.previsione.rateo >= 2 ? "🪂" : p.previsione.rateo >= 1 ? "🌤️" : p.previsione.rateo >= 0.3 ? "🌥️" : "❄️"}</span>
                </div>

                {/* Rateo grande */}
                <div className="text-center mb-2.5">
                  <span
                    className="text-2xl font-extrabold tabular-nums tracking-tight"
                    style={{ color: p.previsione.colore }}
                  >
                    {p.previsione.rateo.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-0.5 font-medium">m/s</span>
                </div>

                {/* Barra forza */}
                <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-2.5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(p.previsione.forza / 10) * 100}%`,
                      backgroundColor: p.previsione.colore,
                    }}
                  />
                </div>

                {/* Metriche */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <ArrowUp className="w-3 h-3 text-green-400" />
                      Base
                    </span>
                    <span className="font-bold text-green-300 tracking-tight text-xs">{p.previsione.base}m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <ArrowUp className="w-3 h-3 text-red-400 rotate-180" />
                      Top
                    </span>
                    <span className="font-bold text-red-300 tracking-tight text-xs">{p.previsione.top}m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Activity className="w-3 h-3 text-amber-400" />
                      Spessore
                    </span>
                    <span className="font-bold text-amber-300 tracking-tight text-xs">{p.previsione.top - p.previsione.base}m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <TrendingUp className="w-3 h-3 text-purple-400" />
                      Gradiente
                    </span>
                    <span className="font-bold text-purple-300 tracking-tight text-xs">{p.previsione.gradienteReale}°</span>
                  </div>
                </div>

                {/* Badge */}
                <div className="mt-2.5 pt-2 border-t border-slate-700/30 text-center">
                  <span
                    className="text-[11px] font-bold tracking-wide"
                    style={{ color: p.previsione.colore }}
                  >
                    {p.previsione.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRAFICO TERMICHE */}
      {hourlyForGraph.length > 0 && (
        <div className="bg-slate-800/40 rounded-2xl p-4 border-2 border-slate-700/40 hover:border-green-400/40 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-200 tracking-wide">Andamento termico orario</h4>
          </div>
          <GraficoTermiche
            hourly={hourlyForGraph}
            oraCorrente={selectedHour}
          />
        </div>
      )}
    </div>
  );
}