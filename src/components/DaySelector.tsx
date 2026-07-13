"use client";

import React from "react";
import {
  CalendarDays,
  ThermometerSun,
  CloudRain,
  Droplets,
} from "lucide-react";

interface DaySelectorProps {
  enrichedDaily: any[];
  dateLabels: string[];
  selectedDay: number;
  onSelect: (idx: number) => void;
}

export default function DaySelector({
  enrichedDaily,
  dateLabels,
  selectedDay,
  onSelect,
}: DaySelectorProps) {
  if (!enrichedDaily || enrichedDaily.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-4">
      {enrichedDaily.map((day: any, idx: number) => {
        const isActive = idx === selectedDay;
        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`rounded-xl px-3 py-3 transition-all duration-200 border-2 text-left ${
              isActive
                ? "bg-emerald-900/30 border-emerald-400 shadow-lg shadow-emerald-500/10"
                : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/40 hover:border-emerald-500/20"
            }`}
          >
            <div className="text-xs font-semibold text-slate-300 mb-1.5">
              {dateLabels[idx]}
            </div>
            <div className="text-2xl mb-2">
              {getEmoji(day.weatherCode || 0)}
            </div>
            <div className="text-sm font-bold text-slate-100 tabular-nums">
              {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-0.5">
                <Droplets className="w-2.5 h-2.5 text-sky-400" />
                Δ{day.thermalDelta || 0}°
              </span>
              {day.precipitationSum > 0 && (
                <span className="flex items-center gap-0.5">
                  <CloudRain className="w-2.5 h-2.5 text-blue-400" />
                  {Math.round(day.precipitationSum)}mm
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}