"use client";

import React, { useMemo } from "react";
import { calcolaTermiche } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";

interface ThermalChartProps {
  hourlyData: HourData[];
  selectedHour: number;
  siteAltitude: number;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 – 21:00

function getColorFromLabel(label: string): string {
  if (label.includes("forti") || label.includes("🔥")) return "bg-red-500/70";
  if (label.includes("Buone") || label.includes("🪂")) return "bg-orange-400/70";
  if (label.includes("moderate") || label.includes("🌤️")) return "bg-yellow-400/60";
  if (label.includes("deboli") || label.includes("🌥️")) return "bg-green-400/60";
  if (label.includes("Niente") || label.includes("❌")) return "bg-slate-700/40";
  if (label.includes("Vento forte") || label.includes("💨")) return "bg-blue-500/60";
  return "bg-slate-700/40";
}

function getTextColor(label: string): string {
  if (label.includes("forti") || label.includes("🔥")) return "text-red-200";
  if (label.includes("Buone") || label.includes("🪂")) return "text-orange-200";
  if (label.includes("moderate") || label.includes("🌤️")) return "text-yellow-200";
  if (label.includes("deboli") || label.includes("🌥️")) return "text-green-200";
  return "text-slate-400";
}

function getLabel(value: number): string {
  if (value < 0.3) return "Nulla";
  if (value < 0.8) return "Debole";
  if (value < 1.5) return "Leggera";
  if (value < 2.5) return "Moderata";
  if (value < 3.5) return "Buona";
  if (value < 5.0) return "Forte";
  if (value < 7.0) return "Molto forte";
  return "Eccezionale";
}

export default function ThermalChart({ hourlyData, selectedHour, siteAltitude }: ThermalChartProps) {
  const data = useMemo(() => {
    return HOURS.map((hour) => {
      // Trova i dati meteo per quest'ora
      const weatherData = hourlyData?.find((d: any) => {
        const h = new Date(d.time).getHours();
        return h === hour;
      });

      if (!weatherData) {
        return {
          hour,
          value: 0,
          rateo: 0,
          label: "N/D",
          colore: "bg-slate-700/40",
        };
      }

      // Calcola termiche reali usando la funzione dedicata
      const termiche = calcolaTermiche(weatherData, siteAltitude);
      
      return {
        hour,
        value: termiche.forza,    // 0-10
        rateo: termiche.rateo,    // m/s
        label: termiche.label,
        colore: getColorFromLabel(termiche.label),
        top: termiche.top,
        base: termiche.base,
      };
    });
  }, [hourlyData, siteAltitude]);

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica · basata su dati Open-Meteo
        </h3>
        <span className="text-[10px] text-slate-500">indice 0-10</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {[
          { label: "Forte", color: "bg-red-500/70" },
          { label: "Buona", color: "bg-orange-400/70" },
          { label: "Moderata", color: "bg-yellow-400/60" },
          { label: "Debole", color: "bg-green-400/60" },
          { label: "Nulla", color: "bg-slate-700/40" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
            <span className="text-slate-400">{item.label}</span>
          </span>
        ))}
      </div>

      {/* Chart bars */}
      <div className="flex items-end gap-1 h-44 overflow-x-auto pb-1">
        {data.map((d) => {
          const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
          const isSelected = d.hour === selectedHour;
          return (
            <div
              key={d.hour}
              className={`flex flex-col items-center flex-shrink-0 w-8 transition-all duration-300 ${
                isSelected ? "scale-110" : ""
              }`}
            >
              {/* Value label */}
              <span
                className={`text-[10px] font-bold leading-none mb-1 transition-colors ${getTextColor(d.label)} ${
                  isSelected ? "text-white text-xs" : ""
                }`}
              >
                {d.rateo > 0 ? d.rateo.toFixed(1) : "—"}
              </span>

              {/* Bar */}
              <div className="w-full h-28 bg-slate-800/60 rounded-md relative overflow-hidden">
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-500 ${d.colore} ${
                    isSelected ? "ring-1 ring-white/30" : ""
                  }`}
                  style={{ height: `${pct}%` }}
                >
                  {isSelected && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50" />
                  )}
                </div>
              </div>

              {/* Hour label */}
              <span
                className={`text-[10px] mt-1 font-mono ${
                  isSelected ? "text-orange-300 font-bold" : "text-slate-500"
                }`}
              >
                {d.hour.toString().padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected hour detail */}
      {(() => {
        const sel = data.find((d) => d.hour === selectedHour);
        if (!sel || !sel.rateo) return null;
        return (
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
            <span className="text-xs text-slate-400 block">
              Alle {sel.hour.toString().padStart(2, "0")}:00 — {sel.label}
            </span>
            <span className="text-2xl font-bold text-orange-300">
              {sel.rateo.toFixed(1)} m/s
            </span>
            <span className="text-xs text-slate-500 ml-2">di salita</span>
            {sel.base > 0 && (
              <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-slate-400">
                <span>Base: {sel.base}m</span>
                <span>Top: {sel.top}m</span>
                <span>Salita: {sel.top - sel.base}m</span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}