"use client";

import type { HourData, ThermalData, AiAnalysis, DailyData } from "@/types/meteo";
import { WeatherIcon } from "@/components/WeatherIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useEffect, useMemo } from "react";

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

  const sliderValue = hour;

  return (
    <div className="space-y-4">
      {/* Select day */}
      <div className="flex gap-1 flex-wrap">
        {enrichedDaily.map((day: any, i: number) => (
          <button
            key={i}
            onClick={() => onDaySelect(i)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
              i === dayIdx
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {dateLabels[i]}
          </button>
        ))}
      </div>

      {/* Hour slider 9-19 */}
      <div className="pt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{startHour}:00</span>
          <span className="font-semibold text-blue-700">{hour}:00</span>
          <span>{endHour}:00</span>
        </div>
        <Slider
          value={[sliderValue]}
          min={startHour}
          max={endHour}
          step={1}
          onValueChange={([v]) => onHourChange(v)}
        />
      </div>

      {/* Current weather card */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WeatherIcon code={current.weatherCode} size={40} />
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {Math.round(current.temperature)}°
                </div>
                <div className="text-sm text-gray-500">
                  Percepita {Math.round(current.apparentTemperature)}°
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600 space-y-1">
              <div>Umidità: {current.humidity}%</div>
              <div>Vento: {Math.round(current.windSpeed)} km/h</div>
              <div>Raffiche: {Math.round(current.gustSpeed)} km/h</div>
              <div>Pioggia: {current.precipitation} mm</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thermal summary */}
      {thermal && (
        <Card className="border border-amber-200 bg-amber-50">
          <CardContent className="p-3">
            <div className="text-sm font-medium text-amber-800">Termica</div>
            <div className="text-xs text-amber-700 mt-1">
              Base: {thermal.base} m · Cima: {thermal.top} m · {thermal.strength}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI analysis preview */}
      {aiData && (
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="text-sm font-medium text-blue-800">Analisi</div>
            <div className="text-xs text-blue-700 mt-1 line-clamp-2">{aiData.summary}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}