"use client";

import React from "react";
import { Calendar, Thermometer, Umbrella, Wind } from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: any[];
  dateLabels: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure?: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
  nomeDecollo?: string;
}

const getWeatherIcon = (code: number): string => {
  if (code >= 95) return "⛈️";
  if (code >= 61) return "🌧️";
  if (code >= 45) return "🌫️";
  if (code >= 20) return "☁️";
  if (code >= 10) return "⛅";
  return "☀️";
};

const getWeatherLabel = (code: number): string => {
  if (code >= 95) return "Temporali";
  if (code >= 61) return "Pioggia";
  if (code >= 51) return "Pioggerella";
  if (code >= 45) return "Nebbia";
  if (code >= 20) return "Nuvoloso";
  if (code >= 10) return "Poco nuvoloso";
  return "Sereno";
};

const safeNum = (v: any, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return isNaN(n) ? fallback : n;
};

export default function PrevisioniGiornaliere({
  enrichedDaily,
  selectedDay,
  onSelectDay,
}: PrevisioniGiornaliereProps) {
  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-base">Caricamento previsioni...</div>;
  }

  const days = enrichedDaily.slice(0, 3);
  const dayButtons: React.ReactNode[] = [];

  for (let idx = 0; idx < days.length; idx++) {
    const day = days[idx] || {};
    const isActive = idx === selectedDay;

    const weatherCode = safeNum(day.weatherCode, 0);
    const tempMax = safeNum(day.temperatureMax, 0);
    const tempMin = safeNum(day.temperatureMin, 0);
    const probPioggia = Math.min(100, Math.max(0, safeNum(day.precipitationProbabilityMax, 0)));
    const ventoMax = safeNum(day.windSpeedMax, 0);
    const ventoMedio = Math.round(ventoMax * 0.6);
    const precipSum = safeNum(day.precipitationSum, 0);

    const dayLabel = idx === 0 ? "Oggi" : idx === 1 ? "Domani" : "Dopodomani";

    const btnClass =
      "text-left transition-all border-2 cursor-pointer p-4 rounded-xl flex-1 min-w-36 " +
      (isActive
        ? "border-emerald-400 bg-emerald-900/40 shadow-lg"
        : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600");

    dayButtons.push(
      <button key={idx} onClick={() => onSelectDay(idx)} className={btnClass}>
        <div className="text-sm font-bold text-white mb-1">{dayLabel}</div>
        <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{day.date ? new Date(day.date).toLocaleDateString("it-IT") : ""}</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{getWeatherIcon(weatherCode)}</span>
          <span className="text-sm font-bold text-slate-200">{getWeatherLabel(weatherCode)}</span>
        </div>

        <div className="flex items-center gap-1 text-xs mb-1">
          <Thermometer className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="text-white font-bold">{Math.round(tempMax)}°</span>
          <span className="text-slate-500">max</span>
          <span className="text-white font-bold ml-1">{Math.round(tempMin)}°</span>
          <span className="text-slate-500">min</span>
        </div>

        <div className="flex items-center gap-1 text-xs mb-1">
          <Wind className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="font-bold text-sky-300">{ventoMedio}</span>
          <span className="text-slate-500">km/h</span>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <Umbrella className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="font-bold text-blue-300">{probPioggia}%</span>
          <span className="text-slate-500">pioggia</span>
          {precipSum > 0 && (
            <span className="font-bold text-cyan-300">{precipSum.toFixed(1)} mm</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">{dayButtons}</div>
    </div>
  );
}