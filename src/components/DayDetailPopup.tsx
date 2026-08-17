"use client";

import React from "react";
import { X, Thermometer, Wind, CloudRain, Droplets, Gauge, ArrowUp } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface DayDetailPopupProps {
  dayData: HourData[];
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
  altitude: number;
  onClose: () => void;
  onHourSelect: (hour: number) => void;
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

function calcCloudBase(weather: HourData): { cloudBase: number } {
  const spread = weather.temperature - weather.dewPoint;
  return { cloudBase: Math.max(200, Math.min(3000, Math.round(spread * 125))) };
}

function calcThermal(_dayData: HourData[], _altitude: number) {
  const cloudBases = _dayData.map(h => calcCloudBase(h));
  const avgBase = cloudBases.length > 0
    ? Math.round(cloudBases.reduce((s, c) => s + c.cloudBase, 0) / cloudBases.length)
    : 0;
  return { cloudBase: avgBase };
}

const DayDetailPopup = ({ dayData, daily, dayLabel, altitude, onClose, onHourSelect }: DayDetailPopupProps) => {
  const thermal = calcThermal(dayData, altitude);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-600 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
          <h3 className="text-sm font-bold text-white">
            {dayLabel}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700 border border-slate-500">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {/* Riepilogo giornaliero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{Math.round(daily.tempMax)}°</div>
              <div className="text-[10px] text-slate-400">Max / {Math.round(daily.tempMin)}° Min</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <Wind className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">
                {daily.avgWind !== undefined ? Math.round(daily.avgWind) : "—"} km/h
              </div>
              <div className="text-[10px] text-slate-400">
                Media {(daily.maxWind !== undefined ? Math.round(daily.maxWind) : "—")} max
              </div>
            </div>
            {daily.precipitationSum > 0 && (
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <CloudRain className="w-4 h-4 text-blue-300 mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{daily.precipitationSum} mm</div>
                <div className="text-[10px] text-slate-400">Pioggia</div>
              </div>
            )}
            {thermal && (
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <ArrowUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{thermal.cloudBase} m</div>
                <div className="text-[10px] text-slate-400">Base nuvole</div>
              </div>
            )}
          </div>

          {/* Tabella oraria */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Previsioni orarie</h4>
            {dayData.map((h) => (
              <button
                key={h.time.getHours()}
                onClick={() => onHourSelect(h.time.getHours())}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 bg-slate-700/30 border border-slate-600/50 hover:bg-slate-700 hover:border-slate-500 transition-all text-left"
              >
                <div className="w-12 shrink-0 text-center">
                  <span className="text-xs font-bold text-white">
                    {h.time.getHours().toString().padStart(2, "0")}:00
                  </span>
                </div>
                <span className="text-lg shrink-0">{getWeatherEmoji(h.weatherCode)}</span>
                <div className="flex-1 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                  <span>{Math.round(h.temperature)}°C</span>
                  <span>{Math.round(h.windSpeed)} km/h</span>
                  <span>{h.humidity}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { DayDetailPopup };