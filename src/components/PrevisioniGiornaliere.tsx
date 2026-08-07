"use client";

import React, { useMemo } from "react";
import { Calendar, Thermometer, Umbrella, Wind, Droplets } from "lucide-react";

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

function iconaMeteo(code: number): string {
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

function descrizioneMeteo(code: number): string {
  if (code >= 95) return "Temporali";
  if (code >= 80) return "Rovesci";
  if (code >= 71) return "Neve";
  if (code >= 61) return "Pioggia";
  if (code >= 51) return "Pioggerella";
  if (code >= 45) return "Nebbia";
  if (code >= 20) return "Nuvoloso";
  if (code >= 10) return "Poco nuv.";
  if (code >= 3) return "Sereno";
  return "Sereno";
}

function ventoLabel(speed: number): string {
  if (speed < 3) return "Calma";
  if (speed < 8) return "Leggero";
  if (speed < 15) return "Moderato";
  if (speed < 22) return "Fresco";
  if (speed < 30) return "Forte";
  return "Molto forte";
}

function probPioggiaColor(prob: number): string {
  if (prob >= 70) return "text-red-300";
  if (prob >= 40) return "text-amber-300";
  if (prob >= 15) return "text-yellow-300";
  return "text-emerald-300";
}

function formatDateShort(date: any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
}

function getDayLabel(idx: number): string {
  if (idx === 0) return "Oggi";
  if (idx === 1) return "Domani";
  return "Dopodomani";
}

function safeNum(v: any, fallback: number = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return isNaN(n) ? fallback : n;
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dayData,
  selectedDay,
  onSelectDay,
}: PrevisioniGiornaliereProps) {
  const precipTotaleReale = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < dayData.length; i++) {
      sum += dayData[i].precipitation || 0;
    }
    return Math.round(sum * 10) / 10;
  }, [dayData]);

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
    const precipSum = idx === selectedDay && precipTotaleReale > 0
      ? precipTotaleReale
      : safeNum(day.precipitationSum, 0);
    const probPioggia = Math.min(100, Math.max(0, safeNum(day.precipitationProbabilityMax, 0)));
    const ventoMax = safeNum(day.windSpeedMax, 0);
    const ventoMedio = Math.round(ventoMax * 0.6);

    const baseClass = "text-left transition-all border-2 cursor-pointer p-4 rounded-xl flex-1 min-w-36";
    const activeClass = isActive
      ? "border-emerald-400 bg-emerald-900/40 shadow-lg"
      : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600";
    const btnClass = baseClass + " " + activeClass;

    dayButtons.push(
      <button key={idx} onClick={() => onSelectDay(idx)} className={btnClass}>
        <div className="text-sm font-bold text-white mb-1">{getDayLabel(idx)}</div>
        <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {day.date ? formatDateShort(day.date) : ""}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{iconaMeteo(weatherCode)}</span>
          <span className="text-sm font-bold text-slate-200">{descrizioneMeteo(weatherCode)}</span>
        </div>

        <div className="flex items-center gap-1 text-xs mb-1">
          <Thermometer className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="text-white font-bold">{tempMax}°</span>
          <span className="text-slate-500">max</span>
          <span className="text-white font-bold ml-1">{tempMin}°</span>
          <span className="text-slate-500">min</span>
        </div>

        <div className="flex items-center gap-1 text-xs mb-1">
          <Wind className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="font-bold text-sky-300">{ventoLabel(ventoMedio)}</span>
          <span className="text-slate-500">({ventoMedio} km/h)</span>
        </div>

        <div className="flex items-center gap-1 text-xs mb-1">
          <Umbrella className="w-3 h-3 text-blue-400 shrink-0" />
          <span className={"font-bold " + probPioggiaColor(probPioggia)}>{probPioggia}%</span>
          <span className="text-slate-500">pioggia</span>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <Droplets className="w-3 h-3<Droplets className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="font-bold text-cyan-300">{precipSum > 0 ? precipSum.toFixed(1) + " mm" : "0 mm"}</span>
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