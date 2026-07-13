"use client";

import React from "react";
import { Wind, TrendingUp } from "lucide-react";

interface VentiTabProps {
  currentData: any;
  dayData: any[];
  windProfile: { alt: number; speed: number; dir: number; dirName: string }[];
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

export default function VentiTab({
  currentData,
  dayData,
  windProfile,
}: VentiTabProps) {
  if (!currentData) return null;

  const hourRange = Array.from({ length: 11 }, (_, i) => i + 9);

  const windCards = [
    {
      label: "Superficie (10m)",
      speed: currentData.windSpeed,
      dir: currentData.windDir,
      gust: currentData.windGust || currentData.windSpeed + 8,
    },
    {
      label: "Quota bassa (80m)",
      speed: currentData.wind80m || currentData.windSpeed * 1.3,
      dir: currentData.windDir80m || (currentData.windDir + 10) % 360,
      gust: (currentData.wind80m || currentData.windSpeed * 1.3) * 1.3,
    },
    {
      label: "Quota media (120m)",
      speed: currentData.wind120m || currentData.windSpeed * 1.5,
      dir: currentData.windDir120m || (currentData.windDir + 20) % 360,
      gust: (currentData.wind120m || currentData.windSpeed * 1.5) * 1.35,
    },
  ];

  return (
    <div className="animate-fadeIn space-y-5">
      <div>
        <h4 className="text-base font-bold text-emerald-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Wind className="w-5 h-5" />
          Vento a diverse quote
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {windCards.map((w, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 text-center"
            >
              <div className="text-sm text-slate-300 font-semibold mb-2">{w.label}</div>
              <div className="text-2xl font-bold text-slate-100 tabular-nums">
                {getWindArrow(w.dir)} {Math.round(w.speed)}
              </div>
              <div className="text-sm text-slate-400">{getWindDirName(w.dir)}</div>
              <div className="text-sm text-red-300 flex items-center justify-center gap-2 mt-2">
                <span>Raffiche</span>
                <span className="font-bold tabular-nums">
                  {Math.round(w.gust)} km/h
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-base font-bold text-emerald-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Profilo vento (400m - 4000m)
        </h4>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 max-h-64 overflow-y-auto space-y-1">
          {windProfile.map((level, idx) => {
            const maxSpeed = currentData.windSpeed * 3.5;
            const width = Math.min(100, (level.speed / maxSpeed) * 100);
            const barColor =
              width < 30
                ? "bg-emerald-400"
                : width < 50
                ? "bg-lime-400"
                : width < 70
                ? "bg-amber-400"
                : width < 90
                ? "bg-orange-400"
                : "bg-red-400";
            return (
              <div
                key={idx}
                className="grid grid-cols-[60px_1fr_70px] gap-3 items-center py-2"
              >
                <span className="text-sm text-slate-300 font-mono tabular-nums font-semibold">
                  {level.alt}m
                </span>
                <div className="h-6 bg-slate-700/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-2 ${barColor}`}
                    style={{ width: `${Math.max(width, 20)}%` }}
                  >
                    <span className="text-xs text-white font-bold drop-shadow-md tabular-nums">
                      {Math.round(level.speed)}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-slate-300 text-center tabular-nums font-semibold">
                  {getWindArrow(level.dir)} {level.dirName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-base font-bold text-emerald-300 uppercase tracking-wider mb-4">
          Vento orario (9:00 - 19:00)
        </h4>
        <div className="grid grid-cols-11 gap-2 overflow-x-auto pb-2">
          {hourRange.map((hour) => {
            const hData = dayData?.find(
              (h: any) => h.time.getHours() === hour
            );
            if (!hData) {
              return (
                <div
                  key={hour}
                  className="bg-slate-800/30 rounded-lg p-3 text-center"
                >
                  <div className="text-sm text-slate-400 font-semibold">
                    {String(hour).padStart(2, "0")}
                  </div>
                  <div className="text-base text-slate-500 mt-1">--</div>
                </div>
              );
            }
            return (
              <div
                key={hour}
                className={`rounded-lg p-3 text-center border ${
                  hour === currentData.time?.getHours()
                    ? "bg-emerald-900/30 border-emerald-500/40"
                    : "bg-slate-800/50 border-slate-700/30"
                }`}
              >
                <div className="text-xs text-slate-300 font-mono font-semibold">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="text-base font-bold text-slate-100 tabular-nums mt-1">
                  {getWindArrow(hData.windDir)} {Math.round(hData.windSpeed)}
                </div>
                <div className="text-xs text-slate-400 font-semibold">
                  {getWindDirName(hData.windDir)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}