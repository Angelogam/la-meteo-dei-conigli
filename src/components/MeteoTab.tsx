"use client";

import type { HourData, ThermalData, AiAnalysis } from "@/types/meteo";
import { WeatherIcon } from "@/components/WeatherIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useMemo } from "react";
import { Sun, Cloud, Wind, Droplets, Gauge, Thermometer } from "lucide-react";

interface MeteoTabProps {
  current: HourData;
  dayIdx: number;
  hour: number;
  enrichedDaily: any[];
  dateLabels: string[];
  thermal: ThermalData | null;
  pressureGrad: { grad: number; desc: string };
  aiData: AiAnalysis | null;
  onDaySelect: (idx: number) => void;
  onHourChange: (h: number) => void;
  startHour?: number;
  endHour?: number;
}

export function MeteoTab({
  current,
  dayIdx,
  hour,
  enrichedDaily,
  dateLabels,
  thermal,
  pressureGrad,
  aiData,
  onDaySelect,
  onHourChange,
  startHour = 9,
  endHour = 19,
}: MeteoTabProps) {
  const hours = useMemo(() => {
    const arr: { value: number; label: string }[] = [];
    for (let h = startHour; h <= endHour; h++) {
      arr.push({ value: h, label: `${h}:00` });
    }
    return arr;
  }, [startHour, endHour]);

  return (
    <div className="space-y-4 text-slate-700">
      {/* Select day - pillole eleganti */}
      <div className="flex gap-1.5 flex-wrap">
        {enrichedDaily.map((day: any, i: number) => (
          <button
            key={i}
            onClick={() => onDaySelect(i)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border ${
              i === dayIdx
                ? "bg-gradient-to-r from-blue-700 to-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30 scale-105"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {dateLabels[i]}
          </button>
        ))}
      </div>

      {/* Hour slider 9-19 con etichette eleganti */}
      <div className="pt-3 pb-1 px-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-medium text-slate-500">{startHour}:00</span>
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-sm font-bold text-slate-800">{String(hour).padStart(2, "0")}:00</span>
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="text-[10px] font-medium text-slate-500">{endHour}:00</span>
        </div>
        <Slider
          value={[hour]}
          min={startHour}
          max={endHour}
          step={1}
          onValueChange={([v]) => onHourChange(v)}
          className="[&_[role=slider]]:bg-blue-700 [&_[role=slider]]:border-blue-500 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_[role=slider]]:shadow-lg"
        />
        <div className="flex justify-between mt-1 text-[8px] text-slate-400">
          {hours.filter((_, i) => i % 2 === 0).map((h) => (
            <span key={h.value}>{h.label}</span>
          ))}
        </div>
      </div>

      {/* Current weather card - rinnovata */}
      <Card className="border border-slate-300 bg-white shadow-md overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-50 border border-slate-300 flex items-center justify-center">
                <WeatherIcon code={current.weatherCode} size={36} />
              </div>
              <div>
                <div className="text-4xl font-black text-slate-800 tracking-tight leading-none">
                  {Math.round(current.temperature)}°
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">
                  Percepita {Math.round(current.feelsLike)}°
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Droplets className="w-3 h-3 text-blue-500" />
                <span className="text-[11px] font-medium text-slate-700">{current.humidity}%</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Wind className="w-3 h-3 text-sky-500" />
                <span className="text-[11px] font-medium text-slate-700">{Math.round(current.windSpeed)} km/h</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Gauge className="w-3 h-3 text-purple-500" />
                <span className="text-[11px] font-medium text-slate-700">{Math.round(current.windGust)} km/h</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Cloud className="w-3 h-3 text-slate-500" />
                <span className="text-[11px] font-medium text-slate-700">{current.cloudCover}%</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Pressione {Math.round(current.pressure)} hPa</span>
            <span className="text-slate-500">UV {current.uvIndex ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Thermal summary - card più raffinata */}
      {thermal && (
        <Card className="border border-amber-300 bg-amber-50/80 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center">
                <Thermometer className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <span className="text-sm font-bold text-slate-800">Condizioni termiche</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white p-2.5 text-center border border-amber-200 shadow-sm">
                <div className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">Base</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{thermal.cloudBase}m</div>
              </div>
              <div className="rounded-xl bg-white p-2.5 text-center border border-amber-200 shadow-sm">
                <div className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">Cima</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{thermal.thermalTop}m</div>
              </div>
              <div className="rounded-xl bg-white p-2.5 text-center border border-amber-200 shadow-sm">
                <div className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">Soaring</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{thermal.soarIdx}/10</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI analysis preview */}
      {aiData && (
        <Card className="border border-slate-300 bg-slate-50/80 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center">
                <span className="text-xs">📊</span>
              </div>
              <span className="text-sm font-bold text-slate-800">Analisi meteo</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{aiData.general}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}