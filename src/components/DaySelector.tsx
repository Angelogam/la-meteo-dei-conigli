"use client";

import React from "react";
import {
  CalendarDays,
  ThermometerSun,
  CloudRain,
  Droplets,
  Sparkles,
  Wind,
  Cloud,
  Eye,
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

        // Dati meteo reali
        const weatherCode = day.weatherCode || 0;
        const condition = getCondition(weatherCode);
        const icon = getWeatherIcon(weatherCode);
        const ventoDecollo = day.windSpeed10m ?? day.windSpeed ?? 0;
        const ventoRaffica = day.windGusts10m ?? day.windGusts ?? 0;
        const copertura = day.cloudCover ?? 0;
        const pioggia = day.precipitationProbability ?? day.precipitationSum ?? 0;
        const visibilita = day.visibility ?? 10;

        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`rounded-xl px-3 py-3.5 transition-all duration-200 border-2 text-left animate-fade-in-up opacity-0 ${
              isActive
                ? "bg-gradient-to-br from-orange-900/30 to-amber-900/15 border-orange-400/50 shadow-lg shadow-orange-500/15 card-hover"
                : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/40 hover:border-orange-400/30 card-hover"
            }`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            {/* Giorno + badge */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-300">
                {dateLabels[idx]}
              </div>
              {isActive && (
                <Sparkles className="w-3 h-3 text-orange-400 animate-twinkle" />
              )}
            </div>

            {/* Icona meteo grande + label sotto */}
            <div className="flex flex-col items-center mb-3">
              <span className="text-4xl mb-1 animate-float-slow" style={{ animationDelay: `${idx * 0.2}s` }}>
                {icon}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center leading-tight">
                {condition}
              </span>
            </div>

            {/* Temperature */}
            <div className="text-sm font-bold text-slate-100 tabular-nums text-center mb-2.5">
              {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
            </div>

            {/* Griglia dati meteo reali */}
            <div className="space-y-1.5">
              {/* VENTO IN DECOLLO */}
              <div className="flex items-center justify-between text-[10px] bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/30">
                <span className="flex items-center gap-1 text-slate-400">
                  <Wind className="w-3 h-3 text-cyan-400" />
                  Vento
                </span>
                <span className="font-bold text-cyan-300">
                  {Math.round(ventoDecollo)} <span className="text-[8px] text-cyan-400/70">km/h</span>
                </span>
              </div>

              {/* R AFFICA */}
              {ventoRaffica > 0 && (
                <div className="flex items-center justify-between text-[10px] bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/30">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Wind className="w-3 h-3 text-purple-400" />
                    Raffiche
                  </span>
                  <span className="font-bold text-purple-300">
                    {Math.round(ventoRaffica)} <span className="text-[8px] text-purple-400/70">km/h</span>
                  </span>
                </div>
              )}

              {/* COPERTURA NUVOLOSA */}
              <div className="flex items-center justify-between text-[10px] bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/30">
                <span className="flex items-center gap-1 text-slate-400">
                  <Cloud className="w-3 h-3 text-sky-400" />
                  Nuvole
                </span>
                <span className="font-bold text-sky-300">
                  {copertura}%
                </span>
              </div>

              {/* PIOGGIA */}
              <div className="flex items-center justify-between text-[10px] bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/30">
                <span className="flex items-center gap-1 text-slate-400">
                  <CloudRain className="w-3 h-3 text-blue-400" />
                  Pioggia
                </span>
                <span className="font-bold text-blue-300">
                  {typeof day.precipitationProbability === "number"
                    ? `${Math.round(day.precipitationProbability)}%`
                    : `${Math.round(day.precipitationSum)}mm`}
                </span>
              </div>

              {/* VISIBILITA' */}
              {visibilita > 0 && (
                <div className="flex items-center justify-between text-[10px] bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/30">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Eye className="w-3 h-3 text-emerald-400" />
                    Visibilità
                  </span>
                  <span className="font-bold text-emerald-300">
                    {visibilita} km
                  </span>
                </div>
              )}

              {/* DELTA TERMICO (se presente) */}
              {day.thermalDelta !== undefined && (
                <div className="flex items-center justify-between text-[10px] bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/30">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ThermometerSun className="w-3 h-3 text-orange-400" />
                    Δ termico
                  </span>
                  <span className="font-bold text-orange-300">
                    {day.thermalDelta}°
                  </span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Mappa codici WMO a condizioni meteo
function getCondition(code: number): string {
  if (code === 0) return "Sereno";
  if (code <= 1) return "Poco nuvoloso";
  if (code <= 2) return "Parz. nuvoloso";
  if (code <= 3) return "Nuvoloso";
  if (code <= 10) return "Nebbia";
  if (code <= 20) return "Pioggia leggera";
  if (code <= 30) return "Pioggia";
  if (code <= 40) return "Pioggia forte";
  if (code <= 50) return "Neve";
  if (code <= 60) return "Temporale";
  if (code <= 70) return "Grandine";
  return "Tempesta";
}

function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 1) return "🌤️";
  if (code <= 2) return "⛅";
  if (code <= 3) return "☁️";
  if (code <= 10) return "🌫️";
  if (code <= 20) return "🌦️";
  if (code <= 30) return "🌧️";
  if (code <= 40) return "🌧️";
  if (code <= 50) return "🌨️";
  if (code <= 60) return "⛈️";
  if (code <= 70) return "🧊";
  return "🌪️";
}