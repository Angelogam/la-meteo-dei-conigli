"use client";

import React from "react";
import { X, Thermometer, Wind, CloudRain, Droplets, Gauge, ArrowUp } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { getVoloStatus } from "@/utils/volo";

export default function DayDetailPopup({
  dayData,
  daily,
  dayLabel,
  altitude,
  onClose,
  onHourSelect,
}: {
  dayData: HourData[];
  daily: any[];
  dayLabel: string;
  altitude: number;
  onClose: () => void;
  onHourSelect: (hour: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-600 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
          <h3 className="text-sm font-bold text-white">{dayLabel}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700 border border-slate-500">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{Math.round(daily.tempMax)}°</div>
              <div className="text-[10px] text-slate-400">Max / {Math.round(daily.tempMin)}° Min</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <Wind className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{daily.avgWind !== undefined ? Math.round(daily.avgWind) : "—"} km/h</div>
              <div className="text-[10px] text-slate-400">Media {(daily.maxWind !== undefined ? Math.round(daily.maxWind) : "—")} max</div>
            </div>
            {daily.precipitationSum > 0 && (
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <CloudRain className="w-4 h-4 text-blue-300 mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{daily.precipitationSum} mm</div>
                <div className="text-[10px] text-slate-400">Pioggia</div>
              </div>
            )}
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <ArrowUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{altitude}m</div>
              <div className="text-[10px] text-slate-400">Quota</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}