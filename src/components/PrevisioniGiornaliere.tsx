"use client";

import React, { useMemo } from "react";
import {
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, CloudFog,
  Calendar
} from "lucide-react";
import type { HourData } from "@/types/meteo";

interface PrevisioniGiornaliereProps {
  enrichedDaily: Array<{
    date: Date;
    tempMax: number;
    tempMin: number;
    weatherCode: number;
    precipitationSum: number;
    thermalDelta: number;
    avgWind?: number;
    maxWind?: number;
    avgCloud?: number;
  }>;
  currentData: HourData | null;
  dayData: HourData[];
  site: { name: string; altitude: number; exposure?: string };
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

export default function PrevisioniGiornaliere({
  enrichedDaily,
  currentData,
  dayData,
  site,
  selectedDay,
  onSelectDay
}: PrevisioniGiornaliereProps) {
  const today = new Date();

  const dateLabels = useMemo(() => {
    return enrichedDaily.map((d: any) => {
      if (!d?.date) return "Giorno";
      const date = new Date(d.date);
      const oggi = new Date();
      const domani = new Date(oggi); domani.setDate(oggi.getDate() + 1);
      const dopodomani = new Date(oggi); dopodomani.setDate(oggi.getDate() + 2);
      if (date.toDateString() === oggi.toDateString()) return "Oggi";
      if (date.toDateString() === domani.toDateString()) return "Domani";
      if (date.toDateString() === dopodomani.toDateString()) return "Dopodomani";
      return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    });
  }, [enrichedDaily]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/40 rounded-xl">
        <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
        <span className="text-sm font-bold text-white">{site?.name || "Decollo"}</span>
        <span className="text-xs text-slate-500">{site?.altitude || 0}m · {site?.exposure || ""}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {enrichedDaily.map((day: any, idx: number) => {
          const isSelected = idx === selectedDay;
          const date = day.date ? new Date(day.date) : new Date();
          const label = dateLabels[idx] || date.toLocaleDateString('it-IT');
          const emoji = getWeatherEmoji(day.weatherCode || 0);
          
          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`rounded-xl p-3 text-center transition-all border-2 ${
                isSelected
                  ? "bg-emerald-900/40 border-emerald-500 shadow-md"
                  : "bg-slate-800/60 border-slate-700/50 hover:bg-slate-700/40"
              }`}
            >
              <div className="text-lg mb-1">{emoji}</div>
              <div className="text-xs font-bold text-white">{label}</div>
              <div className="text-[11px]">
                <span className="text-amber-300 font-bold">{day.tempMax ? `${Math.round(day.tempMax)}°` : "—"}</span>
                <span className="text-slate-500 mx-0.5">/</span>
                <span className="text-blue-300">{day.tempMin ? `${Math.round(day.tempMin)}°` : "—"}</span>
              </div>
              {day.maxWind != null && (
                <div className="text-[10px] text-sky-400 mt-0.5">{Math.round(day.maxWind)} km/h</div>
              )}
              {day.precipitationSum != null && day.precipitationSum > 0 && (
                <div className="text-[10px] text-blue-300">{day.precipitationSum.toFixed(1)}mm</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}