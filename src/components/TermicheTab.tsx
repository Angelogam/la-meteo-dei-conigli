"use client";

import React from "react";
import {
  Flame,
  ThermometerSun,
  Droplets,
  CloudSun,
  ArrowUp,
  Mountain,
  TrendingUp,
  MapPin,
} from "lucide-react";

interface TermicheTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number };
  thermalDelta: number;
  thermalStrength: { label: string; color: string };
}

export default function TermicheTab({
  currentData,
  dayData,
  site,
  thermalDelta,
  thermalStrength,
}: TermicheTabProps) {
  if (!currentData) return null;

  const cloudBase = Math.round(
    (currentData.temperature - currentData.dewPoint) * 120 + site.alt
  );
  const thermalPlafond = Math.round(site.alt + thermalDelta * 100);

  const cards = [
    {
      icon: <ThermometerSun className="w-4 h-4 text-amber-400" />,
      label: "Temperatura media",
      value: `${Math.round(currentData.temperature)}°C`,
    },
    {
      icon: <ArrowUp className="w-4 h-4 text-green-400" />,
      label: "Delta termico",
      value: `${thermalDelta}°C`,
    },
    {
      icon: <CloudSun className="w-4 h-4 text-slate-400" />,
      label: "Nuvolosità media",
      value: `${Math.round(currentData.cloudCover)}%`,
    },
    {
      icon: <Droplets className="w-4 h-4 text-sky-400" />,
      label: "Umidità media",
      value: `${Math.round(currentData.humidity)}%`,
    },
    {
      icon: <Mountain className="w-4 h-4 text-amber-400" />,
      label: "Base nuvole",
      value: `${cloudBase} m`,
    },
    {
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      label: "Plafond termico",
      value: `${thermalPlafond} m`,
    },
    {
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      label: "Galleggiamento",
      value: thermalDelta > 10 ? "Eccellente ⭐" : thermalDelta > 6 ? "Buono 👍" : "Limitato 🫤",
    },
    {
      icon: <MapPin className="w-4 h-4 text-purple-400" />,
      label: "Cross Country",
      value:
        thermalDelta > 10 && currentData.windSpeed < 20
          ? "✅ Favorevole"
          : "🫤 Valutare",
    },
  ];

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Card overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 text-center"
          >
            <div className="flex justify-center mb-1">{card.icon}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              {card.label}
            </div>
            <div className="text-sm font-bold text-slate-100 tabular-nums">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Forza termiche oraria */}
      <div>
        <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Sviluppo orario termiche
        </h4>
        <div className="grid grid-cols-9 gap-1.5 overflow-x-auto pb-2">
          {Array.from({ length: 9 }, (_, i) => i + 10).map((hour) => {
            const hData = dayData?.find(
              (h: any) => h.time.getHours() === hour
            );
            if (!hData)
              return (
                <div
                  key={hour}
                  className="bg-slate-800/30 rounded-lg p-2 text-center text-[10px] text-slate-500"
                >
                  {String(hour).padStart(2, "0")}
                  <div className="mt-1">--</div>
                </div>
              );
            const score =
              (hData.temperature > 22 ? 2 : hData.temperature > 18 ? 1 : 0) +
              (hData.cloudCover < 30 ? 2 : hData.cloudCover < 50 ? 1 : 0) +
              (hData.humidity < 50 ? 1 : 0);
            const label =
              score >= 5
                ? "Forte"
                : score >= 3
                ? "Media"
                : score >= 1
                ? "Debole"
                : "Assente";
            const colorMap: Record<string, string> = {
              Forte: "text-red-400 border-red-500/30 bg-red-500/10",
              Media: "text-orange-400 border-orange-500/30 bg-orange-500/10",
              Debole: "text-amber-400 border-amber-500/30 bg-amber-500/10",
              Assente: "text-slate-400 border-slate-500/30 bg-slate-500/10",
            };
            return (
              <div
                key={hour}
                className={`rounded-lg p-2 text-center border ${
                  hour === currentData.time?.getHours()
                    ? "bg-emerald-900/30 border-emerald-500/40"
                    : colorMap[label] || "bg-slate-800/50 border-slate-700/30"
                }`}
              >
                <div className="text-[9px] text-slate-500 font-mono">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="text-[10px] font-bold mt-0.5">{label}</div>
                <div className="text-[9px] text-slate-400 mt-0.5 tabular-nums">
                  {Math.round(hData.temperature)}° ·{" "}
                  {Math.round(hData.cloudCover)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}