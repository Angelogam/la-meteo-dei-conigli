"use client";

import React, { useMemo } from "react";
import { calcolaTermiche } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";

interface ThermalChartProps {
  hourlyData: HourData[];
  selectedHour: number;
  siteAltitude: number;
  selectedDay: number; // 0 = oggi, 1 = domani, ...
}

function getColorFromLabel(label: string): string {
  if (label.includes("forti")) return "bg-red-500/70";
  if (label.includes("Buone")) return "bg-orange-400/70";
  if (label.includes("moderate")) return "bg-yellow-400/60";
  if (label.includes("deboli")) return "bg-green-400/60";
  if (label.includes("molto deboli")) return "bg-slate-500/50";
  if (label.includes("Niente")) return "bg-slate-700/40";
  return "bg-slate-700/40";
}

function getTextColor(label: string): string {
  if (label.includes("forti")) return "text-red-200";
  if (label.includes("Buone")) return "text-orange-200";
  if (label.includes("moderate")) return "text-yellow-200";
  if (label.includes("deboli")) return "text-green-200";
  return "text-slate-400";
}

function getColorFromRateo(rateo: number): string {
  if (rateo >= 3) return "bg-red-500/70";
  if (rateo >= 2) return "bg-orange-400/70";
  if (rateo >= 1) return "bg-yellow-400/60";
  if (rateo >= 0.3) return "bg-green-400/60";
  return "bg-slate-700/40";
}

function getLabelFromRateo(rateo: number): string {
  if (rateo >= 3) return "forti";
  if (rateo >= 2) return "Buone";
  if (rateo >= 1) return "moderate";
  if (rateo >= 0.3) return "deboli";
  return "Niente";
}

const HOURS_LOCAL = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 – 21:00

export default function ThermalChart({ hourlyData, selectedHour, siteAltitude, selectedDay }: ThermalChartProps) {
  const data = useMemo(() => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + selectedDay);

    const dayHours = (hourlyData || []).filter((d: any) => {
      const t = new Date(d.time);
      return t.getFullYear() === targetDate.getFullYear() &&
             t.getMonth() === targetDate.getMonth() &&
             t.getDate() === targetDate.getDate();
    });

    if (dayHours.length === 0) {
      return HOURS_LOCAL.map((hour) => ({
        hour,
        value: 0,
        rateo: 0,
        label: "N/D",
        colore: "bg-slate-700/40",
        top: 0, base: 0,
      }));
    }

    return HOURS_LOCAL.map((localHour) => {
      const weatherData = dayHours.find((d: any) => {
        const t = new Date(d.time);
        return t.getHours() === localHour;
      });

      if (!weatherData) {
        return {
          hour: localHour,
          value: 0,
          rateo: 0,
          label: "N/D",
          colore: "bg-slate-700/40",
          top: 0, base: 0,
        };
      }

      const termiche = calcolaTermiche(weatherData, siteAltitude);
      if (termiche == null) {
        return {
          hour: localHour,
          value: 0,
          rateo: 0,
          label: "N/D",
          colore: "bg-slate-700/40",
          top: 0, base: 0,
        };
      }
      const label = getLabelFromRateo(termiche.rateo);

      return {
        hour: localHour,
        value: termiche.forza,
        rateo: termiche.rateo,
        label,
        colore: getColorFromRateo(termiche.rateo),
        top: termiche.top,
        base: termiche.base,
      };
    });
  }, [hourlyData, siteAltitude, selectedDay]);

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const selectedDetail = data.find((d) => d.hour === selectedHour);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica · ora locale (Europe/Rome)
        </h3>
        <span className="text-[10px] text-slate-500">m/s · indice 0-10</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {[
          { label: "Forte (3+)", color: "bg-red-500/70" },
          { label: "Buona (2-3)", color: "bg-orange-400/70" },
          { label: "Moderata (1-2)", color: "bg-yellow-400/60" },
          { label: "Debole (0.3-1)", color: "bg-green-400/60" },
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
              <span
                className={`text-[10px] font-bold leading-none mb-1 transition-colors ${
                  d.value > 0 ? getTextColor(d.label) : "text-slate-600"
                } ${isSelected ? "text-white text-xs" : ""}`}
              >
                {d.rateo > 0 ? d.rateo.toFixed(1) : "—"}
              </span>

              <div className="w-full h-28 bg-slate-800/60 rounded-md relative overflow-hidden">
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-500 ${d.colore} ${
                    isSelected ? "ring-1 ring-white/30" : ""
                  }`}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                >
                  {isSelected && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50" />
                  )}
                </div>
              </div>

              <span
                className={`text-[10px] mt-1 font-mono ${
                  isSelected ? "text-orange-300 font-bold" : d.value > 0 ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {d.hour.toString().padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected hour detail */}
      {selectedDetail && selectedDetail.rateo > 0 && (
        <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
          <span className="text-xs text-slate-400 block">
            Alle {selectedDetail.hour.toString().padStart(2, "0")}:00 — {selectedDetail.label}
          </span>
          <span className="text-2xl font-bold text-orange-300">
            {selectedDetail.rateo.toFixed(1)} m/s
          </span>
          <span className="text-xs text-slate-500 ml-2">di salita</span>
          {selectedDetail.base > 0 && (
            <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-slate-400">
              <span>Base: {selectedDetail.base}m</span>
              <span>Top: {selectedDetail.top}m</span>
              <span>Salita: {selectedDetail.top - selectedDetail.base}m</span>
            </div>
          )}
        </div>
      )}

      {selectedDetail && selectedDetail.rateo === 0 && selectedDetail.label !== "N/D" && (
        <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
          <span className="text-xs text-slate-400 block">
            Alle {selectedDetail.hour.toString().padStart(2, "0")}:00 — {selectedDetail.label}
          </span>
        </div>
      )}
    </div>
  );
}