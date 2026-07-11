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
    <div className="space-y-4">
      {/* Select day - pillole eleganti */}
      <div className="flex gap-1.5 flex-wrap">
        {enrichedDaily.map((day: any, i: number) => (
          <button
            key={i}
            onClick={() => onDaySelect(i)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border ${
              i === dayIdx
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-lg shadow-orange-500/20 scale-105"
                : "bg-white/[0.05] text-blue-200/70 border-white/10 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            {dateLabels[i]}
          </button>
        ))}
      </div>

      {/* Hour slider 9-19 con etichette eleganti */}
      <div className="pt-3 pb-1 px-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-medium text-blue-300/60">{startHour}:00</span>
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-orange-400/60" />
            <span className="text-sm font-bold text-white">{String(hour).padStart(2, "0")}:00</span>
            <Sun className="w-3.5 h-3.5 text-orange-400/60" />
          </div>
          <span className="text-[10px] font-medium text-blue-300/60">{endHour}:00</span>
        </div>
        <Slider
          value={[hour]}
          min={startHour}
          max={endHour}
          step={1}
          onValueChange={([v]) => onHourChange(v)}
          className="[&_[role=slider]]:bg-orange-400 [&_[role=slider]]:border-orange-500 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_[role=slider]]:shadow-lg"
        />
        <div className="flex justify-between mt-1 text-[8px] text-blue-300/30">
          {hours.filter((_, i) => i % 2 === 0).map((h) => (
            <span key={h.value}>{h.label}</span>
          ))}
        </div>
      </div>

      {/* Current weather card - rinnovata */}
      <Card className="border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center">
                <WeatherIcon code={current.weatherCode} size={36} />
              </div>
              <div>
                <div className="text-4xl font-black text-white tracking-tight leading-none">
                  {Math.round(current.temperature)}°
                </div>
                <div className="text-xs font-medium text-blue-300/70 mt-1">
                  Percepita {Math.round(current.feelsLike)}°
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Droplets className="w-3 h-3 text-blue-400/60" />
                <span className="text-[11px] font-medium text-blue-200/80">{current.humidity}%</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Wind className="w-3 h-3 text-cyan-400/60" />
                <span className="text-[11px] font-medium text-blue-200/80">{Math.round(current.windSpeed)} km/h</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Gauge className="w-3 h-3 text-purple-400/60" />
                <span className="text-[11px] font-medium text-blue-200/80">{Math.round(current.windGust)} km/h</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Cloud className="w-3 h-3 text-gray-400/60" />
                <span className="text-[11px] font-medium text-blue-200/80">{current.cloudCover}%</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">Pressione {Math.round(current.pressure)} hPa</span>
            <span className="text-gray-400">UV {current.uvIndex ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Thermal summary - card più raffinata */}
      {thermal && (
        <Card className="border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-sm font-bold text-amber-200">Condizioni termiche</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/5 p-2.5 text-center border border-white/5">
                <div className="text-[9px] font-medium text-amber-300/70 uppercase tracking-wider">Base</div>
                <div className="text-sm font-bold text-white mt-0.5">{thermal.cloudBase}m</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2.5 text-center border border-white/5">
                <div className="text-[9px] font-medium text-amber-300/70 uppercase tracking-wider">Cima</div>
                <div className="text-sm font-bold text-white mt-0.5">{thermal.thermalTop}m</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2.5 text-center border border-white/5">
                <div className="text-[9px] font-medium text-amber-300/70 uppercase tracking-wider">Soaring</div>
                <div className="text-sm font-bold text-white mt-0.5">{thermal.soarIdx}/10</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI analysis preview */}
      {aiData && (
        <Card className="border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-xs">📊</span>
              </div>
              <span className="text-sm font-bold text-blue-200">Analisi meteo</span>
            </div>
            <p className="text-xs text-blue-200/70 leading-relaxed line-clamp-3">{aiData.general}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}