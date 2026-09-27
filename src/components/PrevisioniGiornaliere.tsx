"use client";

import React from "react";
import type { HourData } from "@/types/meteo";
import type { MeteoDaily, MeteoCurrent } from "@/services/openMeteoService";
import { CloudRain, Wind, Thermometer } from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: MeteoDaily[];
  dateLabels: string[];
  currentData: HourData | MeteoCurrent | null;
  dayData: HourData[];
  site: { name: string; altitude: number; exposure: string };
  selectedDay: number;
  onSelectDay: (dayIdx: number) => void;
  nomeDecollo?: string;
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
  dateLabels,
  selectedDay,
  onSelectDay,
  nomeDecollo,
  site,
}: PrevisioniGiornaliereProps) {
  const tabs = ["Oggi", "Domani", "Dopodomani"];

  return (
    <div className="space-y-3">
      {nomeDecollo && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            Previsioni 3 giorni · {nomeDecollo}
          </span>
          <span>Open-Meteo GFS</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tabName, idx) => {
          const daily = enrichedDaily[idx];
          const isActive = selectedDay === idx;
          const label = dateLabels[idx] || tabName;
          const isRainy = daily && daily.precipitationSum > 0.5;
          const freezingLevel = daily?.freezingLevel ?? null;
          const trend = daily?.trend;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`text-left transition-all border-2 cursor-pointer p-3 rounded-2xl flex flex-col justify-between min-w-0 ${
                isActive
                  ? "border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-900/20"
                  : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70"
              } ${isRainy ? "border-rose-500/40" : ""}`}
            >
              {/* Header: day name + emoji + trend */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {tabName}
                  </span>
                  {trend && (
                    <span className={`text-sm font-black shrink-0 ${
                      trend === "↑" ? "text-orange-400" : trend === "↓" ? "text-sky-400" : "text-slate-400"
                    }`}>
                      {trend}
                    </span>
                  )}
                </div>
                <span className="text-2xl leading-none">
                  {daily ? getWeatherEmoji(daily.weatherCode) : "☀️"}
                </span>
              </div>

              {/* Date label */}
              <div className="text-[10px] text-slate-400 truncate mb-2">
                {label}
              </div>

              {daily && (
                <div className="space-y-1">
                  {/* Temperatures */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-300 font-black text-base">
                      {Math.round(daily.temperatureMax)}°
                    </span>
                    <span className="text-sky-300 font-bold text-sm">
                      {Math.round(daily.temperatureMin)}°
                    </span>
                  </div>

                  {/* Zero termico */}
                  {freezingLevel && (
                    <div className="flex items-center gap-1 text-[10px] text-violet-300 font-semibold pt-1 border-t border-slate-700/40">
                      <Thermometer className="w-3 h-3 text-violet-400 shrink-0" />
                      <span>0°C: {freezingLevel}m</span>
                      <span className="text-violet-400/70 text-[9px]">
                        ({Math.max(0, freezingLevel - (site?.altitude ?? 0))}m sopr)
                      </span>
                    </div>
                  )}

                  {/* Vento + precipitazioni */}
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Wind className="w-3 h-3 text-cyan-400" />
                      <span className="font-medium">{Math.round(daily.windSpeedMax)} km/h</span>
                    </span>
                    {daily.precipitationSum > 0 && (
                      <span className="flex items-center gap-0.5 text-rose-300 font-semibold">
                        <CloudRain className="w-3 h-3" />
                        {daily.precipitationSum.toFixed(1)}mm
                      </span>
                    )}
                  </div>

                  {/* Tendenza 24h */}
                  {trend && (
                    <div className="text-[9px] text-slate-500 pt-0.5 border-t border-slate-700/30">
                      Tendenza: <span className={`font-bold ${
                        trend === "↑" ? "text-orange-400" : trend === "↓" ? "text-sky-400" : "text-slate-400"
                      }`}>
                        {trend === "↑" ? "Riscaldamento" : trend === "↓" ? "Raffreddamento" : "Stabile"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}