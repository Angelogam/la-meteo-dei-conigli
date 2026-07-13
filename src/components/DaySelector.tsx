"use client";

import React from "react";
import {
  CalendarDays,
  ThermometerSun,
  CloudRain,
  Droplets,
  Sparkles,
} from "lucide-react";

interface DaySelectorProps {
  enrichedDaily: any[];
  dateLabels: string[];
  selectedDay: number;
  onSelect: (idx: number) => void;
}

function formatFullDate(dateStr: string): string {
  // dateStr es: "2025-05-24"
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}`;
}

export default function DaySelector({
  enrichedDaily,
  dateLabels,
  selectedDay,
  onSelect,
}: DaySelectorProps) {
  if (!enrichedDaily || enrichedDaily.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {enrichedDaily.slice(0, 3).map((day: any, idx: number) => {
        const isActive = idx === selectedDay;
        
        // Costruisce etichetta con data
        let label = dateLabels[idx] || "Giorno";
        if (idx === 0) label = "Oggi";
        else if (idx === 1) {
          const dateStr = day.date instanceof Date 
            ? `${String(day.date.getDate()).padStart(2, '0')}/${String(day.date.getMonth() + 1).padStart(2, '0')}`
            : formatFullDate(day.date);
          label = `Domani ${dateStr}`;
        }
        else if (idx === 2) {
          const dateStr = day.date instanceof Date 
            ? `${String(day.date.getDate()).padStart(2, '0')}/${String(day.date.getMonth() + 1).padStart(2, '0')}`
            : formatFullDate(day.date);
          label = `Dopodomani ${dateStr}`;
        }

        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`rounded-xl px-3 py-3 transition-all duration-200 border-2 text-left animate-fade-in-up opacity-0 ${
              isActive
                ? "bg-gradient-to-br from-orange-900/30 to-amber-900/15 border-orange-400/50 shadow-lg shadow-orange-500/15"
                : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/40 hover:border-orange-400/30"
            }`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-semibold text-slate-300">
                {label}
              </div>
              {isActive && (
                <Sparkles className="w-3 h-3 text-orange-400 animate-twinkle" />
              )}
            </div>
            <div className="text-2xl mb-2 animate-float-slow" style={{ animationDelay: `${idx * 0.2}s` }}>
              {getEmoji(day.weatherCode || 0)}
            </div>
            <div className="text-sm font-bold text-slate-100 tabular-nums">
              {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-0.5 bg-slate-800/60 px-1.5 py-0.5 rounded-full border border-slate-700/50">
                <Droplets className="w-2.5 h-2.5 text-sky-400" />
                Δ{day.thermalDelta || 0}°
              </span>
              {day.precipitationSum > 0 && (
                <span className="flex items-center gap-0.5 bg-slate-800/60 px-1.5 py-0.5 rounded-full border border-slate-700/50">
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