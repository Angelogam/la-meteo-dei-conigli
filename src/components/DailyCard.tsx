"use client";

import React from "react";
import { Calendar, Thermometer, Wind, Droplets, Umbrella, Sun } from "lucide-react";
import type { DailyData } from "@/types/meteo";

interface DailyCardProps {
  dailyData: DailyData[];
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
  if (code >= 3) return "🌤️";
  return "☀️";
}

function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return `${giorni[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

export default function DailyCard({ dailyData }: DailyCardProps) {
  if (!dailyData || dailyData.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
      <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-emerald-400" />
        Previsioni giornaliere
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {dailyData.map((day, i) => (
          <div
            key={i}
            className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3"
          >
            <div className="text-xs font-bold text-slate-400 mb-2">{formatDate(day.date)}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getWeatherEmoji(day.weatherCode)}</span>
              <div className="text-sm">
                <span className="text-amber-300 font-bold">{Math.round(day.temperatureMax)}°</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-blue-300 font-bold">{Math.round(day.temperatureMin)}°</span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Wind className="w-3 h-3 text-sky-400" />
                <span>{Math.round(day.windSpeedMax)} km/h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Umbrella className="w-3 h-3 text-blue-400" />
                <span>{day.precipitationSum > 0 ? `${day.precipitationSum.toFixed(1)}mm` : "Nessuna"}</span>
              </div>
              {day.precipitationProbabilityMax > 0 && (
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  <span>{day.precipitationProbabilityMax}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}