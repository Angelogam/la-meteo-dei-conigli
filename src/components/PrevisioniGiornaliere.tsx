"use client";

import React from "react";
import type { HourData, DailyData } from "@/types/meteo";
import { CloudRain, Sun, Cloud, Wind, Thermometer, Calendar } from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: DailyData[];
  dateLabels: string[];
  currentData: HourData | null;
  dayData: HourData[];
  site: { name: string; altitude: number; exposure: string };
  selectedDay: number;
  onSelectDay: (dayIdx: number) => void;
  nomeDecollo?: string;
}

function getWeatherEmoji(code: number): string {
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌧️";
  if (code >= 71) return "❄️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 20) return "☁️";
  if (code >= 10) return "⛅";
  if (code >= 5) return "🌤️";
  return "☀️";
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  selectedDay,
  onSelectDay,
  nomeDecollo,
}: PrevisioniGiornaliereProps) {
  const tabs = ["Oggi", "Domani", "Dopodomani"];

  return (
    <div className="space-y-3">
      {nomeDecollo && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            Previsioni 3 giorni · {nomeDecollo}
          </span>
          <span>Open-Meteo GFS</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tabName, idx) => {
          const daily = enrichedDaily[idx];
          const isActive = selectedDay === idx;
          const label = dateLabels[idx] || tabName;
          const isRainy = daily && daily.precipitationSum > 0.5;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`text-left transition-all border-2 cursor-pointer p-3 rounded-2xl flex flex-col justify-between min-w-0 ${
                isActive
                  ? "border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-900/20"
                  : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70"
              } ${isRainy ? "border-rose-500/40" : ""}`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-white truncate">
                  {tabName}
                </span>
                <span className="text-lg">
                  {daily ? getWeatherEmoji(daily.weatherCode) : "☀️"}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 truncate mb-2">
                {label}
              </div>

              {daily && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold">
                      {Math.round(daily.temperatureMax)}°
                    </span>
                    <span className="text-sky-300 font-medium">
                      {Math.round(daily.temperatureMin)}°
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
                    <span className="flex items-center gap-0.5">
                      <Wind className="w-3 h-3 text-slate-400" />
                      {Math.round(daily.windSpeedMax)} km/h
                    </span>
                    {daily.precipitationSum > 0 ? (
                      <span className="text-rose-300 font-semibold flex items-center gap-0.5">
                        <CloudRain className="w-3 h-3" />
                        {daily.precipitationSum.toFixed(1)}mm
                      </span>
                    ) : (
                      <span className="text-emerald-400">0mm</span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}