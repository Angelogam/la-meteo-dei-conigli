"use client";

import React from "react";
import type { HourData } from "@/types/meteo";
import { getVoloStatus } from "@/utils/volo";
import { X, Wind, Thermometer, CloudRain, Droplets } from "lucide-react";

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

interface DayDetailPopupProps {
  data: HourData[];
  daily: {
    date: Date;
    tempMax: number;
    tempMin: number;
    weatherCode: number;
    precipitationSum: number;
    avgWind?: number;
    maxWind?: number;
    avgCloud?: number;
  };
  dayLabel: string;
  onClose: () => void;
  onHourSelect: (hour: number) => void;
}

const DayDetailPopup = ({ data, daily, dayLabel, onClose, onHourSelect }: DayDetailPopupProps) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-600 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600 shrink-0">
          <h3 className="text-sm font-bold text-white">
            Dettaglio orario · {dayLabel}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 border border-slate-500"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Riepilogo giornaliero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-4 pb-2 shrink-0">
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {Math.round(daily.tempMax)}° / {Math.round(daily.tempMin)}°
            </div>
            <div className="text-[10px] text-slate-400">Max / Min</div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <Wind className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {daily.avgWind !== undefined ? Math.round(daily.avgWind) : "—"} km/h
            </div>
            <div className="text-[10px] text-slate-400">
              Media {daily.maxWind !== undefined ? Math.round(daily.maxWind) : "—"} max
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <CloudRain className="w-4 h-4 text-blue-300 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {daily.precipitationSum > 0 ? `${daily.precipitationSum.toFixed(1)} mm` : "0 mm"}
            </div>
            <div className="text-[10px] text-slate-400">Pioggia</div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <span className="text-2xl block mb-1">{getWeatherEmoji(daily.weatherCode)}</span>
            <div className="text-[10px] text-slate-400">Meteo</div>
          </div>
        </div>

        {/* Griglia ore */}
        <div className="overflow-y-auto p-3 space-y-1.5">
          {data.map((h) => {
            const volo = getVoloStatus(h);
            const isSelected = h.time.getHours() === new Date().getHours();
            return (
              <button
                key={h.time.getHours()}
                onClick={() => onHourSelect(h.time.getHours())}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all ${
                  isSelected
                    ? "bg-slate-700 border-slate-400 shadow-md"
                    : "bg-slate-800/60 border-slate-600/50 hover:bg-slate-700/40 hover:border-slate-500"
                }`}
              >
                <div className="w-10 shrink-0 text-center">
                  <span className="text-xs font-bold text-white">
                    {h.time.getHours().toString().padStart(2, "0")}:00
                  </span>
                </div>
                <span className="text-lg shrink-0">{getWeatherEmoji(h.weatherCode)}</span>
                <div className="flex-1 flex items-center gap-2 text-[11px] text-slate-300 min-w-0">
                  <span>{Math.round(h.temperature)}°C</span>
                  <span className="text-slate-500">|</span>
                  <span>{Math.round(h.windSpeed)} km/h</span>
                  <span className="text-slate-500">|</span<dyad-write path="src/components/Windgram.tsx" description="Rewriting the corrupted Windgram.tsx with a clean DayDetailPopup component">
"use client";

import React from "react";
import type { HourData } from "@/types/meteo";
import { getVoloStatus } from "@/utils/volo";
import { X, Wind, Thermometer, CloudRain, Droplets } from "lucide-react";

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

interface DayDetailPopupProps {
  data: HourData[];
  daily: {
    date: Date;
    tempMax: number;
    tempMin: number;
    weatherCode: number;
    precipitationSum: number;
    avgWind?: number;
    maxWind?: number;
    avgCloud?: number;
  };
  dayLabel: string;
  onClose: () => void;
  onHourSelect: (hour: number) => void;
}

const DayDetailPopup = ({ data, daily, dayLabel, onClose, onHourSelect }: DayDetailPopupProps) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-600 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600 shrink-0">
          <h3 className="text-sm font-bold text-white">
            Dettaglio orario · {dayLabel}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 border border-slate-500"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Riepilogo giornaliero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-4 pb-2 shrink-0">
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {Math.round(daily.tempMax)}° / {Math.round(daily.tempMin)}°
            </div>
            <div className="text-[10px] text-slate-400">Max / Min</div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <Wind className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {daily.avgWind !== undefined ? Math.round(daily.avgWind) : "—"} km/h
            </div>
            <div className="text-[10px] text-slate-400">
              Media {daily.maxWind !== undefined ? Math.round(daily.maxWind) : "—"} max
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <CloudRain className="w-4 h-4 text-blue-300 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {daily.precipitationSum > 0 ? `${daily.precipitationSum.toFixed(1)} mm` : "0 mm"}
            </div>
            <div className="text-[10px] text-slate-400">Pioggia</div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <span className="text-2xl block mb-1">{getWeatherEmoji(daily.weatherCode)}</span>
            <div className="text-[10px] text-slate-400">Meteo</div>
          </div>
        </div>

        {/* Griglia ore */}
        <div className="overflow-y-auto p-3 space-y-1.5">
          {data.map((h) => {
            const volo = getVoloStatus(h);
            const isSelected = h.time.getHours() === new Date().getHours();
            return (
              <button
                key={h.time.getHours()}
                onClick={() => onHourSelect(h.time.getHours())}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all ${
                  isSelected
                    ? "bg-slate-700 border-slate-400 shadow-md"
                    : "bg-slate-800/60 border-slate-600/50 hover:bg-slate-700/40 hover:border-slate-500"
                }`}
              >
                <div className="w-10 shrink-0 text-center">
                  <span className="text-xs font-bold text-white">
                    {h.time.getHours().toString().padStart(2, "0")}:00
                  </span>
                </div>
                <span className="text-lg shrink-0">{getWeatherEmoji(h.weatherCode)}</span>
                <div className="flex-1 flex items-center gap-2 text-[11px] text-slate-300 min-w-0">
                  <span>{Math.round(h.temperature)}°C</span>
                  <span className="text-slate-500">|</span>
                  <span>{Math.round(h.windSpeed)} km/h</span>
                  <span className="text-slate-500">|</span>
                  <span>{h.humidity}%</span>
                </div>
                {h.precipitation > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-300 shrink-0">
                    <Droplets className="w-3 h-3" />
                    {h.precipitation.toFixed(1)}mm
                  </span>
                )}
                <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${volo.color}`}>
                  {volo.icon} {volo.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DayDetailPopup;