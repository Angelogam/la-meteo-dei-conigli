"use client";

import React from "react";
import {
  Sparkles,
  CloudRain,
  Droplets,
  Sun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
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
  const sunYellow = "#fbbf24";       // giallo sole
  const sunOrange = "#f97316";       // arancione
  const cloudWhite = "#e2e8f0";      // bianco nuvola
  const cloudDark = "#94a3b8";       // grigio scuro
  const rainBlue = "#38bdf8";        // azzurro pioggia
  const lightningPurple = "#a78bfa"; // viola fulmine

  switch (true) {
    case code === 0: // sereno ☀️
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Sun size={36} color={sunYellow} className="drop-shadow-lg" strokeWidth={1.5} />
          <div className="absolute w-10 h-10 rounded-full bg-yellow-400/15 blur-md animate-ping" />
        </div>
      );

    case code <= 2: // poco nuvoloso ⛅
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Sun size={28} color={sunOrange} className="drop-shadow-lg absolute top-0 left-0" strokeWidth={1.5} />
          <Cloud size={32} color={cloudWhite} className="drop-shadow-lg absolute bottom-0 right-0" strokeWidth={1.5} />
        </div>
      );

    case code === 3: // molto nuvoloso ☁️☁️
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud size={40} color={cloudDark} className="drop-shadow-lg" strokeWidth={1.5} />
          <Cloud size={28} color={cloudWhite} className="drop-shadow-lg absolute -bottom-1 right-0" strokeWidth={1.5} />
        </div>
      );

    case code <= 30: // foschia 🌫️
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <CloudFog size={40} color={cloudWhite} className="drop-shadow-lg" strokeWidth={1.5} />
        </div>
      );

    case code <= 48: // nebbia 🌁
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <CloudFog size={40} color={cloudDark} className="drop-shadow-lg" strokeWidth={1.5} />
          <CloudFog size={28} color={cloudWhite} className="absolute -bottom-1 opacity-70" strokeWidth={1.5} />
        </div>
      );

    case code <= 57: // pioviggine 🌦️
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud size={36} color={cloudWhite} className="drop-shadow-lg" strokeWidth={1.5} />
          <CloudDrizzle size={24} color={rainBlue} className="absolute bottom-0" strokeWidth={1.5} />
        </div>
      );

    case code <= 67: // pioggia coperta ☁️🌧️
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud size={40} color={cloudDark} className="drop-shadow-lg" strokeWidth={1.5} />
          <CloudRain size={28} color={rainBlue} className="absolute bottom-0" strokeWidth={1.5} />
        </div>
      );

    case code <= 77: // neve 🌨️
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud size={40} color={cloudWhite} className="drop-shadow-lg" strokeWidth={1.5} />
          <CloudSnow size={24} color="#93c5fd" className="absolute bottom-0" strokeWidth={1.5} />
        </div>
      );

    case code <= 82: // pioggia forte 🌧️
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud size={40} color={cloudDark} className="drop-shadow-lg" strokeWidth={1.5} />
          <CloudRain size={32} color="#2563eb" className="absolute bottom-0" strokeWidth={1.5} />
        </div>
      );

    default: // temporali ⛈️
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Cloud size={38} color={cloudDark} className="drop-shadow-lg" strokeWidth={1.5} />
          <CloudLightning size={24} color={lightningPurple} className="absolute bottom-0 animate-pulse" strokeWidth={2} />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300/60 rounded-full blur-sm animate-ping" />
        </div>
      );
  }
}