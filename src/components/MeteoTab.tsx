"use client";

import React from "react";
import {
  ThermometerSun,
  Droplets,
  Cloud,
  CloudRain,
  Mountain,
  Wind,
  ArrowUpDown,
  Gauge,
} from "lucide-react";

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number };
  thermalDelta: number;
  stabilityIndex: { label: string; color: string };
}

export default function MeteoTab({
  currentData,
  dayData,
  site,
  thermalDelta,
  stabilityIndex,
}: MeteoTabProps) {
  if (!currentData) return null;

  const cloudBase = Math.round(
    (currentData.temperature - currentData.dewPoint) * 120 + site.alt
  );
  const thermalPlafond = Math.round(site.alt + thermalDelta * 100);

  const cards = [
    {
      icon: <ThermometerSun className="w-4 h-4 text-amber-400" />,
      label: "Temperatura",
      value: `${Math.round(currentData.temperature)}°C`,
      sub: `Δ ${thermalDelta}°C`,
    },
    {
      icon: <Droplets className="w-4 h-4 text-sky-400" />,
      label: "Umidità",
      value: `${Math.round(currentData.humidity)}%`,
      sub: `Rugiada ${Math.round(currentData.dewPoint)}°C`,
    },
    {
      icon: <Cloud className="w-4 h-4 text-slate-400" />,
      label: "Nuvolosità",
      value: `${Math.round(currentData.cloudCover)}%`,
      sub: getCloudText(currentData.cloudCover),
    },
    {
      icon: <CloudRain className="w-4 h-4 text-blue-400" />,
      label: "Precipitazioni",
      value: currentData.precipitation === 0 ? "Assenti" : `${Math.round(currentData.precipitation * 10) / 10} mm`,
      sub: currentData.precipitation === 0 ? "Ideale" : "Pioggia",
    },
    {
      icon: <Mountain className="w-4 h-4 text-amber-400" />,
      label: "Base nuvole",
      value: `${cloudBase} m`,
      sub: "Cloud base",
    },
    {
      icon: <ArrowUpDown className="w-4 h-4 text-green-400" />,
      label: "Plafond termico",
      value: `${thermalPlafond} m`,
      sub: "Thermal top",
    },
    {
      icon: <Wind className="w-4 h-4 text-sky-400" />,
      label: "Vento",
      value: `${getWindArrow(currentData.windDir)} ${Math.round(currentData.windSpeed)} km/h`,
      sub: getWindDirName(currentData.windDir),
    },
    {
      icon: <Gauge className="w-4 h-4 text-purple-400" />,
      label: "Pressione",
      value: `${Math.round(currentData.pressure)} hPa`,
      sub: getPressureTrend(dayData),
    },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 text-center hover:bg-slate-700/40 transition-colors"
          >
            <div className="flex justify-center mb-1">{card.icon}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              {card.label}
            </div>
            <div className="text-sm font-bold text-slate-100 tabular-nums">
              {card.value}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
          Pressione & Stabilità
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-[10px] text-slate-500 mb-1">Attuale</div>
            <div className="text-base font-bold text-slate-100 tabular-nums">
              {Math.round(currentData.pressure)}
            </div>
            <div className="text-[10px] text-slate-400">hPa</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 mb-1">Gradiente</div>
            <div
              className={`text-base font-bold tabular-nums ${
                getPressureTrend(dayData).includes("↑")
                  ? "text-emerald-400"
                  : getPressureTrend(dayData).includes("↓")
                  ? "text-red-400"
                  : "text-slate-100"
              }`}
            >
              {getPressureTrend(dayData)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 mb-1">Stabilità</div>
            <div
              className="text-sm font-bold tabular-nums"
              style={{ color: stabilityIndex.color }}
            >
              {stabilityIndex.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCloudText(cover: number): string {
  if (cover < 20) return "Sereno";
  if (cover < 40) return "Poco nuvoloso";
  if (cover < 60) return "Nuvoloso";
  if (cover < 80) return "Molto nuvoloso";
  return "Coperto";
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "—";
}

function getPressureTrend(dayData: any[]): string {
  const first = dayData?.[0]?.pressure;
  const last = dayData?.[dayData.length - 1]?.pressure;
  if (first == null || last == null) return "—";
  const diff = last - first;
  if (diff > 1) return `↑ +${Math.round(diff)}`;
  if (diff < -1) return `↓ ${Math.round(diff)}`;
  return "→ Stabile";
}