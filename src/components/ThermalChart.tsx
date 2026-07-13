"use client";

import React, { useMemo } from "react";

interface ThermalChartProps {
  dayData: any;
  selectedHour: number;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5:00 – 22:00

function getThermalIntensity(hour: number, dayData: any): number {
  if (!dayData) return 0;
  const solarNoon = 12 + (dayData.timezoneOffset || 0);
  const dist = Math.abs(hour - solarNoon);
  const peak = dayData.thermalMax || 3;
  const base = Math.max(0, peak * Math.max(0, 1 - dist * 0.12));
  const noise = (Math.sin(hour * 1.7) * 0.15 + Math.cos(hour * 0.9) * 0.1) * peak * 0.12;
  return Math.max(0, Math.round((base + noise) * 10) / 10);
}

function getColor(value: number): string {
  if (value < 0.5) return "bg-slate-700/40";
  if (value < 1.5) return "bg-blue-500/60";
  if (value < 3.0) return "bg-cyan-400/60";
  if (value < 4.5) return "bg-green-400/60";
  if (value < 6.0) return "bg-yellow-400/60";
  if (value < 7.5) return "bg-orange-400/70";
  if (value < 9.0) return "bg-red-500/70";
  return "bg-purple-600/80";
}

function getTextColor(value: number): string {
  if (value < 0.5) return "text-slate-500";
  if (value < 1.5) return "text-blue-300";
  if (value < 3.0) return "text-cyan-200";
  if (value < 4.5) return "text-green-200";
  if (value < 6.0) return "text-yellow-200";
  if (value < 7.5) return "text-orange-200";
  if (value < 9.0) return "text-red-200";
  return "text-purple-200";
}

function getLabel(value: number): string {
  if (value < 0.5) return "Nulla";
  if (value < 1.5) return "Debole";
  if (value < 3.0) return "Leggera";
  if (value < 4.5) return "Moderata";
  if (value < 6.0) return "Buona";
  if (value < 7.5) return "Forte";
  if (value < 9.0) return "Molto forte";
  return "Eccezionale";
}

export default function ThermalChart({ dayData, selectedHour }: ThermalChartProps) {
  const data = useMemo(() => {
    return HOURS.map((hour) => ({
      hour,
      value: getThermalIntensity(hour, dayData),
    }));
  }, [dayData]);

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica oraria
        </h3>
        <span className="text-[10px] text-slate-500">m/s</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {[
          { label: "Nulla", color: "bg-slate-700/40" },
          { label: "Debole", color: "bg-blue-500/60" },
          { label: "Leggera", color: "bg-cyan-400/60" },
          { label: "Moderata", color: "bg-green-400/60" },
          { label: "Buona", color: "bg-yellow-400/60" },
          { label: "Forte", color: "bg-orange-400/70" },
          { label: "Molto forte", color: "bg-red-500/70" },
          { label: "Eccezionale", color: "bg-purple-600/80" },
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
                className={`text-[10px] font-bold leading-none mb-1 transition-colors ${getTextColor(d.value)} ${
                  isSelected ? "text-white text-xs" : ""
                }`}
              >
                {d.value.toFixed(1)}
              </span>

              {/* Bar */}
              <div className="w-full h-28 bg-slate-800/60 rounded-md relative overflow-hidden">
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-500 ${getColor(d.value)} ${
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
        if (!sel) return null;
        return (
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
            <span className="text-xs text-slate-400 block">
              Alle {sel.hour.toString().padStart(2, "0")}:00 — {getLabel(sel.value)}
            </span>
            <span className="text-2xl font-bold text-orange-300">
              {sel.value.toFixed(1)} m/s
            </span>
            <span className="text-xs text-slate-500 ml-2">di salita</span>
          </div>
        );
      })()}
    </div>
  );
}