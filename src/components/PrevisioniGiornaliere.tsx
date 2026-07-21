"use client";

import React from "react";
import {
  Sun,
  CloudSun,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Cloud,
  Wind,
} from "lucide-react";
import FinestraSemplice from "@/components/FinestraSemplice";

interface EnrichedDay {
  date: Date;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationSum: number;
  thermalDelta?: number;
  avgWind?: number;
  maxWind?: number;
  avgCloud?: number;
}

interface PrevisioniGiornaliereProps {
  nomeDecollo: string;
  enrichedDaily: EnrichedDay[];
  dateLabels: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
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

function getWeatherIcon(code: number, size: number = 24): React.ReactNode {
  if (code >= 95) return <CloudLightning size={size} className="text-purple-400" />;
  if (code >= 80) return <CloudRain size={size} className="text-blue-400" />;
  if (code >= 61) return <CloudRain size={size} className="text-blue-400" />;
  if (code >= 51) return <CloudDrizzle size={size} className="text-blue-300" />;
  if (code >= 45) return <Cloud size={size} className="text-gray-400" />;
  if (code >= 20) return <Cloud size={size} className="text-gray-300" />;
  if (code >= 10) return <CloudSun size={size} className="text-yellow-400" />;
  return <Sun size={size} className="text-yellow-400" />;
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  selectedDay,
  onSelectDay,
}: PrevisioniGiornaliereProps) {
  if (!enrichedDaily || enrichedDaily.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        Nessuna previsione giornaliera disponibile.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {enrichedDaily.slice(0, 3).map((day, idx) => {
          const isSelected = idx === selectedDay;
          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`rounded-2xl p-4 transition-all border-2 text-left ${
                isSelected
                  ? "bg-emerald-900/40 border-emerald-500 shadow-lg"
                  : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">
                  {dateLabels[idx] || ""}
                </span>
                <span className="text-lg">{getWeatherEmoji(day.weatherCode)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">{Math.round(day.tempMax)}°C</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-400">{Math.round(day.tempMin)}°C</span>
              </div>
              {day.thermalDelta != null && (
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                  <span>Delta: {day.thermalDelta}°C</span>
                </div>
              )}
              {day.avgWind != null && (
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                  <Wind className="w-3 h-3 text-sky-400" />
                  <span>{Math.round(day.avgWind)} km/h</span>
                </div>
              )}
              {day.precipitationSum > 0 && (
                <div className="flex items-center gap-1 text-xs text-blue-300 mt-0.5">
                  <CloudRain className="w-3 h-3" />
                  <span>{day.precipitationSum} mm</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}