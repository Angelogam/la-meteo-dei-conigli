"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Thermometer,
  Droplets,
  Clock,
  Sparkles,
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import { getVoloStatus } from "@/utils/volo";

interface HourlyForecastChartProps {
  hourlyData: HourData[];
  selectedDay: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

const sunYellow = "#fbbf24";
const sunOrange = "#f97316";
const cloudWhite = "#e2e8f0";
const cloudDark = "#94a3b8";
const rainBlue = "#38bdf8";
const lightningPurple = "#a78bfa";

// Animazioni per ogni icona
const iconAnimations = [
  "animate-float-slow",
  "animate-bounce-gentle",
  "animate-float-medium",
  "animate-twinkle",
  "animate-pulse",
];

function getWeatherIcon(code: number, isDay: boolean, size: number = 32) {
  const animClass = iconAnimations[code % iconAnimations.length];
  const s = Math.round(size * 0.85);
  const l = Math.round(size * 1.1);

  if (code === 0) {
    if (isDay) {
      return (
        <div className={`relative flex items-center justify-center ${animClass}`} style={{ width: size, height: size }}>
          <Sun size={l} color={sunYellow} strokeWidth={1.5} className="drop-shadow-lg" />
          <div className="absolute w-10 h-10 rounded-full bg-yellow-400/10 blur-md animate-ping" />
        </div>
      );
    }
    return (
      <div className={`flex items-center justify-center ${animClass}`} style={{ width: size, height: size }}>
        <Moon size={l} color="#93c5fd" strokeWidth={1.5} className="drop-shadow-lg" />
      </div>
    );
  }

  if (code <= 2) {
    return (
      <div className={`relative flex items-center justify-center ${animClass}`} style={{ width: size, height: size }}>
        <Sun size={s} color={sunOrange} strokeWidth={1.5} className="drop-shadow-lg absolute top-0 left-0" />
        <Cloud size={l} color={cloudWhite} strokeWidth={1.5} className="drop-shadow-lg absolute bottom-0 right-0" />
      </div>
    );
  }

  if (code === 3) {
    return (
      <div className={`flex items-center justify-center ${animClass}`} style={{ width: size, height: size }}>
        <Cloud size={l + 2} color={cloudDark} strokeWidth={1.5} className="drop-shadow-lg" />
        <Cloud size={s} color={cloudWhite} strokeWidth={1.5} className="drop-shadow-lg absolute bottom-1 right-1" />
      </div>
    );
  }

  if (code <= 48) {
    return (
      <div className={`flex items-center justify-center ${animClass}`} style={{ width: size, height: size }}>
        <CloudFog size={l} color={cloudWhite} strokeWidth={1.5} className="drop-shadow-lg" />
      </div>
    );
  }

  if (code <= 57) {
    return (
      <div className={`relative flex items-center justify-center ${animClass}`} style={{ width: size, height: size }}>
        <Cloud size={l} color={cloudWhite} strokeWidth={1.5} className="drop-shadow-lg" />
        <CloudDrizzle size={s} color={rainBlue} strokeWidth={1.5} className="absolute bottom-0" />
      </div>
    );
  }

  if (code <= 67) {
    return (
      <div className={`relative flex items-center justify-center ${animClass}`} style={{ width: size, height: size }}>
        <Cloud size={l + 2} color={cloudDark} strokeWidth={1.5} className="drop-shadow-lg" />
        <CloudRain size={s} color={rainBlue} strokeWidth={1.5} className="absolute bottom-0" />
      </div>
    );
  }

  if (code <= 77) {
    return (
      <div className={`relative flex items-center justify-center ${animClass}`} style={{ width: size, height: size }}>
        <Cloud size={l} color={cloudWhite} strokeWidth={1.5} className="drop-shadow-lg" />
        <CloudSnow size={s} color="#93c5fd" strokeWidth={1.5} className="absolute bottom-0" />
      </div>
    );
  }

  if (code <= 82) {
    return (
      <div className={`relative flex items-center justify-center ${animClass}`} style={{ width: size, height: size }}>
        <Cloud size={l + 2} color={cloudDark} strokeWidth={1.5} className="drop-shadow-lg" />
        <CloudRain size={s + 2} color="#2563eb" strokeWidth={1.5} className="absolute bottom-0" />
      </div>
    );
  }

  // temporali
  return (
    <div className={`relative flex items-center justify-center ${animClass} animate-pulse`} style={{ width: size, height: size }}>
      <Cloud size={l} color={cloudDark} strokeWidth={1.5} className="drop-shadow-lg" />
      <CloudLightning size={s} color={lightningPurple} strokeWidth={2} className="absolute bottom-0" />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300/40 rounded-full blur-sm animate-ping" />
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
  if (code <= 82) return "🌧️";
  return "⛈️";
}

function getWindDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "—";
}

export default function HourlyForecastChart({
  hourlyData,
  selectedDay,
  selectedHour,
  onHourSelect,
}: HourlyForecastChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Filtra dati per giorno selezionato
  const dayHours = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];
    
    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    
    const hours = hourlyData.filter((h: any) => {
      const t = new Date(h.time);
      return t.getFullYear() === targetDate.getFullYear() &&
             t.getMonth() === targetDate.getMonth() &&
             t.getDate() === targetDate.getDate();
    });

    // Filtra ore 6-22
    return hours.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 6 && hh <= 22;
    });
  }, [hourlyData, selectedDay]);

  // Scroll all'ora selezionata
  useEffect(() => {
    if (scrollRef.current && selectedHour) {
      const child = scrollRef.current.querySelector(`[data-hour="${selectedHour}"]`);
      if (child) {
        child.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [selectedHour]);

  // Drag to scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  if (dayHours.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-8 text-center">
        <Clock className="w-12 h-12 text-slate-500 mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-slate-400">Nessun dato orario disponibile per questo giorno</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden shadow-xl shadow-orange-500/5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/30 bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-400/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-400 icon-neon" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Previsioni orarie
              <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-twinkle" />
            </h3>
            <p className="text-[10px] text-slate-400">
              {dayHours.length} fasce orarie · Trascina per scorrere
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Dati Open-Meteo
        </div>
      </div>

      {/* Griglia oraria scrollabile */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`flex gap-3 overflow-x-auto px-4 py-5 pb-6 ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#f97316 transparent' }}
      >
        {dayHours.map((h: any, idx: number) => {
          const hour = new Date(h.time).getHours();
          const isDay = h.isDay ?? (hour >= 6 && hour <= 20);
          const volo = getVoloStatus(h);
          const isSelected = hour === selectedHour;

          return (
            <div
              key={hour}
              data-hour={hour}
              onClick={() => onHourSelect(hour)}
              className={`
                flex-shrink-0 w-[130px] sm:w-[140px] rounded-2xl p-3.5 
                transition-all duration-300 border-2 cursor-pointer
                animate-fade-in-up opacity-0
                ${
                  isSelected
                    ? "bg-gradient-to-b from-orange-900/40 to-amber-900/20 border-orange-400/50 shadow-lg shadow-orange-500/20 scale-[1.04] z-10"
                    : "bg-slate-800/50 border-slate-700/40 hover:bg-slate-700/40 hover:border-orange-400/30 hover:scale-[1.02]"
                }
              `}
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              {/* Ora */}
              <div className={`text-center mb-2.5 ${isSelected ? "text-orange-300" : "text-slate-400"}`}>
                <div className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-300"}`}>
                  {String(hour).padStart(2, "0")}:00
                </div>
                {isSelected && (
                  <div className="text-[9px] text-orange-400/70 font-semibold mt-0.5">• SELEZIONATO •</div>
                )}
              </div>

              {/* Icona meteo animata */}
              <div className="flex justify-center mb-3 h-14">
                <div className="transform transition-transform duration-300 hover:scale-110">
                  {getWeatherIcon(h.weatherCode || 0, isDay, 42)}
                </div>
              </div>

              {/* Temperatura */}
              <div className="text-center mb-1.5">
                <div className="flex items-center justify-center gap-0.5">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  <span className={`text-xl font-extrabold tabular-nums ${isSelected ? "text-amber-200" : "text-slate-100"} text-glow-white`}>
                    {Math.round(h.temperature)}°
                  </span>
                </div>
              </div>

              {/* Vento */}
              <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-1.5">
                <Wind className="w-3 h-3 text-blue-400" />
                <span className="font-semibold tabular-nums">{Math.round(h.windSpeed)}</span>
                <span className="text-[10px] text-slate-500">km/h</span>
              </div>

              {/* Nuvolosità e umidità */}
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                <div className="flex items-center justify-center gap-0.5 bg-slate-900/50 rounded-lg py-1 px-1.5">
                  <span className="text-xs">{getEmoji(h.weatherCode || 0)}</span>
                  <span className="tabular-nums">{h.cloudCover}%</span>
                </div>
                <div className="flex items-center justify-center gap-0.5 bg-slate-900/50 rounded-lg py-1 px-1.5">
                  <Droplets className="w-2.5 h-2.5 text-cyan-400" />
                  <span className="tabular-nums">{h.humidity}%</span>
                </div>
              </div>

              {/* Pioggia */}
              {h.precipitation > 0 && (
                <div className="text-[10px] text-blue-300 text-center mt-1.5 bg-blue-900/30 rounded-lg py-1 border border-blue-500/20">
                  🌧 {h.precipitation.toFixed(1)} mm
                </div>
              )}

              {/* Badge volo */}
              <div className={`mt-2 text-center ${volo.color} rounded-lg py-1 text-[10px] font-bold border`}>
                {volo.icon} {volo.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 border-t border-slate-700/30 bg-slate-800/30 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Thermometer className="w-3 h-3 text-amber-400" />
          Temperatura
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-600" />
        <span className="flex items-center gap-1">
          <Wind className="w-3 h-3 text-blue-400" />
          Vento km/h
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-600" />
        <span className="flex items-center gap-1">
          <Droplets className="w-3 h-3 text-cyan-400" />
          Umidità
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-600" />
        <span className="flex items-center gap-1">
          <span className="text-xs">{getEmoji(0)}</span>
          Nuvolosità
        </span>
      </div>
    </div>
  );
}