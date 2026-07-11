"use client";

import React from "react";
import { Wind, Thermometer, Cloud, Droplets, ArrowUp, Gauge } from "lucide-react";
import type { HourData, AiAnalysis } from "@/types/meteo";
import type { ThermalCalcData, RichDay } from "@/utils/meteo";
import { wic, enrDaily, calcThermal } from "@/utils/meteo";
import { Progress } from "@/components/ui/progress";

function orario2Str(hour: number): string {
  return String(hour).padStart(2, "0") + ":00";
}

function pressioneIcon(grad: number): string {
  if (grad < -3) return "⬇️⬇️";
  if (grad < 0) return "⬇️";
  if (grad > 3) return "⬆️⬆️";
  if (grad > 0) return "⬆️";
  return "➡️";
}

function ventoColore(speed: number): string {
  if (speed < 12) return "text-green-400";
  if (speed < 22) return "text-yellow-400";
  if (speed < 32) return "text-orange-400";
  return "text-red-400";
}

function pioggiaColore(prec: number): string {
  if (prec <= 0.2) return "text-slate-300";
  if (prec <= 2) return "text-blue-300";
  return "text-blue-400";
}

function wicReact(code: number): React.ReactNode {
  return wic(code, true);
}

interface MeteoTabProps {
  current: HourData;
  dayIdx: number;
  hour: number;
  enrichedDaily: RichDay[];
  dateLabels: string[];
  thermal: ThermalCalcData | null;
  pressureGrad: { grad: number; desc: string };
  aiData: AiAnalysis | null;
  onDaySelect: (idx: number) => void;
  onDayDetailClick: (idx: number) => void;
  onHourChange: (hour: number) => void;
}

export const MeteoTab = ({
  current,
  dayIdx,
  hour,
  enrichedDaily,
  dateLabels,
  thermal,
  pressureGrad,
  aiData,
  onDaySelect,
  onDayDetailClick,
  onHourChange,
}: MeteoTabProps) => {
  if (!current) {
    return (
      <div className="text-sm text-slate-300 p-4 text-center">
        Nessun dato disponibile per l&apos;ora selezionata.
      </div>
    );
  }

  const weatherDay = enrichedDaily[dayIdx];

  return (
    <div className="space-y-3">
      {/* Ora corrente e icona grande */}
      <div className="flex items-center justify-center gap-3 bg-slate-700/60 rounded-xl p-3">
        <span className="text-4xl drop-shadow-lg">{wicReact(current.weatherCode)}</span>
        <div className="text-center">
          <span className="text-2xl font-bold text-white">{Math.round(current.temperature)}°C</span>
          <span className="text-sm text-slate-300 block">{orario2Str(hour)}</span>
        </div>
      </div>

      {/* Griglia metriche */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
          <Wind className="w-4 h-4 mx-auto mb-1 text-blue-300" />
          <span className={`text-sm font-semibold ${ventoColore(current.windSpeed)}`}>{Math.round(current.windSpeed)} km/h</span>
          <span className="text-[10px] text-slate-300 block">{current.windDir}°</span>
        </div>
        <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
          <Cloud className="w-4 h-4 mx-auto mb-1 text-slate-300" />
          <span className="text-sm font-semibold text-white">{Math.round(current.cloudCover)}%</span>
          <span className="text-[10px] text-slate-300 block">nuvole</span>
        </div>
        <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
          <Droplets className="w-4 h-4 mx-auto mb-1 text-blue-300" />
          <span className={`text-sm font-semibold ${pioggiaColore(current.precipitation)}`}>{current.precipitation.toFixed(1)} mm</span>
          <span className="text-[10px] text-slate-300 block">pioggia</span>
        </div>
        <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
          <Thermometer className="w-4 h-4 mx-auto mb-1 text-orange-300" />
          <span className="text-sm font-semibold text-white">{Math.round(current.humidity)}%</span>
          <span className="text-[10px] text-slate-300 block">umidità</span>
        </div>
      </div>

      {/* Termiche */}
      {thermal && (
        <div className="bg-slate-700/40 rounded-xl p-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ArrowUp className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-white">Termiche</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <span className="text-slate-300">Base</span>
              <p className="font-semibold text-white">{thermal.base}m</p>
            </div>
            <div>
              <span className="text-slate-300">Cima</span>
              <p className="font-semibold text-white">{thermal.top}m</p>
            </div>
            <div>
              <span className="text-slate-300">Salita</span>
              <p className="font-semibold text-orange-300">{thermal.salita} m/s</p>
            </div>
            <div>
              <span className="text-slate-300">CAPE</span>
              <p className="font-semibold text-yellow-300">{thermal.cape} J/kg</p>
            </div>
          </div>
        </div>
      )}

      {/* Pressione */}
      <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
        <Gauge className="w-4 h-4 mx-auto mb-1 text-slate-300" />
        <span className="text-sm font-semibold text-white">{pressioneIcon(pressureGrad.grad)} {pressureGrad.desc}</span>
      </div>

      {/* Giorni */}
      {enrichedDaily.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-300 font-medium block text-center">Previsioni giornaliere</span>
          <div className="grid grid-cols-1 gap-1.5">
            {enrichedDaily.map((day, idx) => (
              <button
                key={idx}
                onClick={() => onDayDetailClick(idx)}
                className={`text-left p-2.5 rounded-xl border transition-all duration-200 ${
                  idx === dayIdx
                    ? "bg-green-900/30 border-green-500/50 text-white"
                    : "bg-slate-700/30 border-slate-600/40 text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{wicReact(day.weatherCode)}</span>
                    <span className="text-sm font-semibold">{dateLabels[idx]}</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-white font-semibold">{Math.round(day.tempMax)}°</span>
                    <span className="text-slate-400">/{Math.round(day.tempMin)}°</span>
                    <span className="ml-2 text-blue-300">{Math.round(day.windAvg)} km/h</span>
                  </div>
                </div>
                <div className="mt-1">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Vento {Math.round(day.windAvg)} km/h</span>
                    <span>Pioggia {day.precipSum.toFixed(1)} mm</span>
                  </div>
                  <Progress value={day.windAvg > 30 ? 100 : (day.windAvg / 30) * 100} className="h-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};