"use client";

import React from "react";
import { X, Thermometer, Wind, CloudRain, Droplets, Gauge } from "lucide-react";
import type { HourData, DailyData } from "@/types/meteo";
import { wic } from "@/utils/meteo";
import { getVoloStatus } from "@/utils/volo";

interface DayDetailPopupProps {
  dayData: HourData[];
  daily: DailyData;
  dayLabel: string;
  altitude: number;
  onClose: () => void;
  onHourSelect: (hour: number) => void;
}

export const DayDetailPopup = ({ dayData, daily, dayLabel, altitude, onClose, onHourSelect }: DayDetailPopupProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-600 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
          <div>
            <h3 className="text-sm font-bold text-white">
              {dayLabel} · {altitude}m
            </h3>
            <p className="text-[10px] text-slate-400">
              Max {Math.round(daily.tempMax)}°C · Min {Math.round(daily.tempMin)}°C · Pioggia {daily.precipitationSum.toFixed(1)}mm
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700 border border-slate-500">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Griglia ore */}
        <div className="overflow-y-auto p-3 space-y-1.5">
          {dayData.map((h) => {
            const volo = getVoloStatus(h);
            return (
              <button
                key={h.time.getHours()}
                onClick={() => onHourSelect(h.time.getHours())}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all duration-150 border text-left bg-slate-800/60 border-slate-600/50 hover:bg-slate-700 hover:border-slate-500"
              >
                <div className="w-10 shrink-0 text-center">
                  <span className="block text-xs font-bold text-white">
                    {h.time.getHours().toString().padStart(2, "0")}:00
                  </span>
                </div>

                <span className="text-lg shrink-0">{wic(h.weatherCode, true)}</span>

                <div className="flex items-center gap-2 text-[11px] text-slate-300 flex-1 min-w-0">
                  <span className="flex items-center gap-0.5">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    {Math.round(h.temperature)}°
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="flex items-center gap-0.5">
                    <Wind className="w-3 h-3 text-blue-400" />
                    {Math.round(h.windSpeed)}
                    {h.windGust && (
                      <span className="text-slate-500">/{Math.round(h.windGust)}</span>
                    )}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="flex items-center gap-0.5">
                    <Droplets className="w-3 h-3 text-emerald-400" />
                    {h.humidity}%
                  </span>
                  {h.precipitation && h.precipitation > 0 && (
                    <>
                      <span className="text-slate-500">|</span>
                      <span className="flex items-center gap-0.5 text-blue-300">
                        <CloudRain className="w-3 h-3" />
                        {h.precipitation.toFixed(1)}mm
                      </span>
                    </>
                  )}
                </div>

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