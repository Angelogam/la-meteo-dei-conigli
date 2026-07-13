"use client";

import React from "react";
import {
  Thermometer,
  Wind,
  Sun,
  ArrowUp,
  Droplets,
  Gauge,
  Cloud,
} from "lucide-react";

interface DayInfoPanelProps {
  currentData: {
    temp?: number;
    tempFeel?: number;
    windSpeed?: number;
    windGust?: number;
    windDir?: string;
    humidity?: number;
    pressure?: number;
    clouds?: number;
    precip?: number;
    thermalStrength?: number;
    thermalDelta?: number;
    liftingIndex?: string;
    stabilityIndex?: string;
  };
  dayData?: {
    tempMax?: number;
    tempMin?: number;
    windMax?: number;
    thermalMax?: number;
    thermalAvg?: number;
    rainProb?: number;
    uvIndex?: number;
  };
  site?: {
    name: string;
    alt: number;
  };
}

export default function DayInfoPanel({ currentData, dayData, site }: DayInfoPanelProps) {
  const items = [
    {
      label: "Temperatura",
      value: currentData?.temp != null ? `${Math.round(currentData.temp)}°C` : "—",
      sub: currentData?.tempFeel != null ? `Percepita ${Math.round(currentData.tempFeel)}°C` : undefined,
      icon: Thermometer,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Vento",
      value: currentData?.windSpeed != null ? `${currentData.windSpeed} km/h` : "—",
      sub: currentData?.windGust && currentData.windDir
        ? `Raffiche ${currentData.windGust} · ${currentData.windDir}`
        : currentData?.windGust
          ? `Raffiche ${currentData.windGust}`
          : undefined,
      icon: Wind,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Termiche",
      value: currentData?.thermalStrength != null
        ? `${currentData.thermalStrength} m/s`
        : currentData?.thermalDelta != null
          ? `${currentData.thermalDelta}°C Δ`
          : "—",
      sub: dayData?.thermalMax != null ? `Max ${dayData.thermalMax} m/s` : undefined,
      icon: ArrowUp,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Nuvolosità",
      value: currentData?.clouds != null ? `${currentData.clouds}%` : "—",
      sub: currentData?.precip != null && currentData.precip > 0
        ? `Precip. ${currentData.precip} mm`
        : dayData?.rainProb != null
          ? `Pioggia ${dayData.rainProb}%`
          : undefined,
      icon: Cloud,
      color: "text-slate-300",
      bg: "bg-slate-500/10",
    },
    {
      label: "Umidità",
      value: currentData?.humidity != null ? `${currentData.humidity}%` : "—",
      sub: currentData?.pressure != null ? `${currentData.pressure} hPa` : undefined,
      icon: Droplets,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Stabilità",
      value: currentData?.stabilityIndex || currentData?.liftingIndex || "—",
      sub: currentData?.thermalDelta != null ? `ΔT ${currentData.thermalDelta}°C` : undefined,
      icon: Gauge,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="bg-slate-900/50 border border-slate-700/30 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Dati giornata
        </h3>
        {dayData?.tempMin != null && dayData?.tempMax != null && (
          <span className="text-xs text-slate-500">
            {Math.round(dayData.tempMin)}° / {Math.round(dayData.tempMax)}°C
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`${item.bg} rounded-xl p-3 border border-white/5`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {item.label}
              </span>
            </div>
            <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
            {item.sub && (
              <div className="text-[10px] text-slate-500 mt-0.5">{item.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}