"use client";

import React from "react";
import {
  CalendarDays,
  ThermometerSun,
  CloudRain,
  Droplets,
  Sparkles,
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudMoon,
  Moon,
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
        const icon = getWeatherIcon(day.weatherCode || 0);
        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`rounded-xl px-3 py-3 transition-all duration-200 border-2 text-left animate-fade-in-up opacity-0 ${
              isActive
                ? "bg-gradient-to-br from-orange-900/30 to-amber-900/15 border-orange-400/50 shadow-lg shadow-orange-500/15 card-hover"
                : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/40 hover:border-orange-400/30 card-hover"
            }`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-semibold text-slate-300">
                {dateLabels[idx]}
              </div>
              {isActive && (
                <Sparkles className="w-3 h-3 text-orange-400 animate-twinkle" />
              )}
            </div>
            <div className="text-2xl mb-2 flex items-center justify-center animate-float-slow" style={{ animationDelay: `${idx * 0.2}s` }}>
              {icon}
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

function getWeatherIcon(code: number): React.ReactNode {
  const sunClass = "text-amber-300 drop-shadow-lg";
  const cloudClass = "text-slate-400 drop-shadow-md";
  const darkCloudClass = "text-slate-500 drop-shadow-lg";
  const rainClass = "text-blue-400 drop-shadow-md";
  const snowClass = "text-blue-200 drop-shadow-md";

  switch (true) {
    case code === 0: // sereno
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Sun className={`w-9 h-9 ${sunClass} animate-pulse`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-amber-300/10 blur-sm animate-ping absolute" />
          </div>
        </div>
      );

    case code <= 2: // poco nuvoloso
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud className={`w-8 h-8 ${cloudClass}`} />
          <Sun className={`w-6 h-6 ${sunClass} absolute -top-1 -right-1`} />
        </div>
      );

    case code === 3: // molto nuvoloso
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud className={`w-9 h-9 ${darkCloudClass}`} />
          <Cloud className={`w-6 h-6 ${cloudClass} absolute -bottom-1 -left-1`} />
        </div>
      );

    case code <= 30: // foschia
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <CloudFog className={`w-9 h-9 text-slate-400 drop-shadow-md`} />
        </div>
      );

    case code <= 48: // nebbia
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <CloudFog className={`w-9 h-9 text-slate-500 drop-shadow-lg`} />
          <CloudFog className={`w-7 h-7 text-slate-400 absolute -bottom-1 opacity-60`} />
        </div>
      );

    case code <= 57: // pioviggine
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud className={`w-9 h-9 ${darkCloudClass}`} />
          <CloudDrizzle className={`w-5 h-5 ${rainClass} absolute bottom-0`} />
        </div>
      );

    case code <= 67: // pioggia coperta
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud className={`w-9 h-9 text-slate-600 drop-shadow-xl`} />
          <CloudRain className={`w-6 h-6 ${rainClass} absolute bottom-0`} />
        </div>
      );

    case code <= 77: // neve
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud className={`w-9 h-9 text-slate-600 drop-shadow-xl`} />
          <CloudSnow className={`w-5 h-5 ${snowClass} absolute bottom-0`} />
        </div>
      );

    case code <= 82: // pioggia forte
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud className={`w-9 h-9 text-slate-700 drop-shadow-xl`} />
          <CloudRain className={`w-7 h-7 text-blue-500 drop-shadow-md absolute bottom-0`} />
        </div>
      );

    case code <= 86: // rovesci misti
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud className={`w-9 h-9 text-slate-600 drop-shadow-xl`} />
          <div className="absolute bottom-0 flex gap-1">
            <CloudRain className={`w-4 h-4 text-blue-500`} />
            <CloudSnow className={`w-4 h-4 text-blue-200`} />
          </div>
        </div>
      );

    default: // temporali
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud className={`w-9 h-9 text-slate-700 drop-shadow-xl`} />
          <CloudLightning className={`w-6 h-6 text-purple-400 drop-shadow-md absolute bottom-0 animate-pulse`} />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400/40 rounded-full blur-sm animate-ping" />
        </div>
      );
  }
}