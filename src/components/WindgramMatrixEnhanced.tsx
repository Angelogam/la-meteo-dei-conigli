"use client";

import { useState } from "react";
import type { HourData } from "@/types/meteo";

interface WindgramMatrixEnhancedProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
  selectedDay?: number;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

const LEVELS = [
  { name: "10m (suolo)", alt: 0, speedKey: "windSpeed" as const, dirKey: "windDir" as const },
  { name: "80m", alt: 70, speedKey: "windSpeed80m" as const, dirKey: "windDir80m" as const },
  { name: "120m", alt: 110, speedKey: "windSpeed120m" as const, dirKey: "windDir120m" as const },
  { name: "850hPa", alt: 1500, speedKey: "windSpeed850" as const, dirKey: "windDir850" as const },
  { name: "700hPa", alt: 3000, speedKey: "windSpeed700" as const, dirKey: "windDir700" as const },
  { name: "500hPa", alt: 5500, speedKey: "windSpeed500" as const, dirKey: "windDir500" as const },
];

function getWindColor(speed: number) {
  if (speed <= 4) return "#0284c7";
  if (speed <= 8) return "#0d9488";
  if (speed <= 13) return "#16a34a";
  if (speed <= 18) return "#65a30d";
  if (speed <= 24) return "#eab308";
  if (speed <= 30) return "#f97316";
  if (speed <= 42) return "#dc2626";
  return "#991b1b";
}

function getWindDirectionIcon(dir: number) {
  const arrows: Record<number, string> = {
    0: "↑", 45: "↗", 90: "→", 135: "↘", 180: "↓", 225: "↙", 270: "←", 315: "↖",
  };
  const keys = Object.keys(arrows).map(Number);
  const closest = keys.reduce((prev, curr) =>
    Math.abs(curr - dir) < Math.abs(prev - dir) ? curr : prev
  );
  return arrows[closest];
}

function getWindDirLabel(dir: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const idx = Math.round(dir / 45) % 8;
  return dirs[idx];
}

export default function WindgramMatrixEnhanced({
  dayData,
  siteName,
  altitude,
  selectedHour = 13,
  onHourSelect,
}: WindgramMatrixEnhancedProps) {
  const [hoveredCell, setHoveredCell] = useState<{ hour: number; level: string; speed: number; dir: number } | null>(null);
  const now = new Date();
  const currentHour = now.getHours();

  const filteredData = dayData.filter(h => {
    const date = h.time instanceof Date ? h.time : new Date(h.time);
    return date.getHours() >= 8 && date.getHours() <= 18;
  });

  return (
    <div className="space-y-4">
      {/* Titolo */}
      <div className="flex items-center justify-between">
        <h2 className="text-slate-100 font-black text-base flex items-center gap-2">
          <span className="text-xl">🌬️</span>
          Vento Multi-Livello
          <span className="text-slate-500 text-xs font-normal">· {siteName}</span>
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Ora corrente: {currentHour}:00
        </div>
      </div>

      {/* Tabella vento */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/50">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="p-2 text-slate-500 font-bold text-left w-24 sticky left-0 bg-slate-900/90 z-10 backdrop-blur">
                Livello
              </th>
              {HOURS.map(h => (
                <th
                  key={h}
                  className={`p-2 text-center font-bold cursor-pointer transition-all ${
                    h === selectedHour
                      ? "text-orange-400 bg-orange-500/10"
                      : h === currentHour
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  onClick={() => onHourSelect?.(h)}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{h}:00</span>
                    {h === currentHour && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEVELS.map(level => (
              <tr key={level.name} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="p-2 text-slate-400 font-bold sticky left-0 bg-slate-900/90 z-10 backdrop-blur text-[11px]">
                  <div>{level.name}</div>
                  <div className="text-[9px] text-slate-600 font-normal">
                    {level.alt > 0 ? `~${level.alt}m` : "suolo"}
                  </div>
                </td>
                {HOURS.map((hour, i) => {
                  const hourData = filteredData[i];
                  if (!hourData) {
                    return (
                      <td key={hour} className="p-2 text-center text-slate-700">—</td>
                    );
                  }

                  const speed = (hourData as Record<string, unknown>)[level.speedKey] ?? 0;
                  const dir = (hourData as Record<string, unknown>)[level.dirKey] ?? 0;
                  const safeSpeed = Math.round(speed as number);
                  const safeDir = Math.round(dir as number);
                  const color = getWindColor(safeSpeed);
                  const isHovered = hoveredCell?.hour === hour && hoveredCell?.level === level.name;
                  const isCurrent = hour === currentHour;

                  return (
                    <td
                      key={hour}
                      className={`p-2 text-center cursor-pointer transition-all relative ${
                        isHovered ? "bg-slate-700/60" : ""
                      } ${isCurrent ? "bg-emerald-500/10" : ""} hover:bg-slate-800/50`}
                      onClick={() => onHourSelect?.(hour)}
                      onMouseEnter={() => setHoveredCell({ hour, level: level.name, speed: safeSpeed, dir: safeDir })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className="text-base font-black tabular-nums"
                          style={{ color }}
                          title={isHovered ? "" : undefined}
                        >
                          {safeSpeed > 0 ? safeSpeed : "—"}
                        </span>
                        {safeSpeed > 0 && (
                          <span className="text-[9px] text-slate-500 tabular-nums">
                            {getWindDirectionIcon(safeDir)} {safeDir}°
                          </span>
                        )}
                      </div>

                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute z-50 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-slate-200 whitespace-nowrap shadow-xl pointer-events-none left-1/2 -translate-x-1/2 top-0 mt-1">
                          <div className="font-bold">{level.name}</div>
                          <div className="text-slate-400">
                            {safeSpeed} km/h da {safeDir}° ({getWindDirLabel(safeDir)})
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda colori vento */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-500 font-medium">Velocità (km/h):</span>
        {[
          { max: 4, color: "#0284c7", label: "≤4" },
          { max: 8, color: "#0d9488", label: "5-8" },
          { max: 13, color: "#16a34a", label: "9-13" },
          { max: 18, color: "#65a30d", label: "14-18" },
          { max: 24, color: "#eab308", label: "19-24" },
          { max: 30, color: "#f97316", label: "25-30" },
          { max: 42, color: "#dc2626", label: "31-42" },
          { max: Infinity, color: "#991b1b", label: "≥43" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: item.color }} />
            <span className="text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Info tooltip */}
      {hoveredCell && (
        <div className="text-xs text-slate-500 bg-slate-800/40 rounded-lg p-2 border border-slate-700/40 flex items-center gap-2">
          <span className="font-bold text-slate-300">
            {hoveredCell.level} alle {hoveredCell.hour}:00
          </span>
          <span>·</span>
          <span>
            {hoveredCell.speed} km/h da {hoveredCell.dir}°
            <span className="text-slate-500 ml-1">({getWindDirLabel(hoveredCell.dir)})</span>
          </span>
        </div>
      )}
    </div>
  );
}
