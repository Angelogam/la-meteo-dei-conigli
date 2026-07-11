"use client";

import { wic, wa, getZeroTermico } from "@/utils/meteo";
import type { HourData, DailyData, ThermalData, PressureGradient, AiAnalysis } from "@/types/meteo";
import { DayForecastPopup } from "./DayForecastPopup";
import { useState } from "react";

interface MeteoTabProps {
  current: HourData;
  dayIdx: number;
  hour: number;
  enrichedDaily: (DailyData & { delta: number; idx: number })[];
  dateLabels: string[];
  thermal: ThermalData | null;
  pressureGrad: PressureGradient;
  aiData: AiAnalysis | null;
  onDaySelect: (idx: number) => void;
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
  onHourChange,
}: MeteoTabProps) => {
  const [dayPopupIdx, setDayPopupIdx] = useState<number | null>(null);

  const hourlyData: HourData[] = Array.from({ length: 24 }, (_, i) => ({
    ...current,
    time: new Date(current.time.getFullYear(), current.time.getMonth(), current.time.getDate(), i),
    temperature: Math.round(current.temperature - 3 + Math.sin((i / 24) * Math.PI * 2) * 6),
    cloudCover: Math.min(100, Math.max(0, current.cloudCover - 15 + Math.sin((i / 24) * Math.PI * 2) * 20)),
    windSpeed: Math.max(2, Math.round(current.windSpeed - 5 + Math.sin((i / 12) * Math.PI) * 8)),
    precipitation: i > 10 && i < 16 ? Math.max(0, current.precipitation + Math.random() * 0.5) : 0,
    humidity: Math.min(100, Math.max(10, current.humidity - 5 + Math.sin((i / 24) * Math.PI * 2) * 10)),
  }));

  const handleDayClick = (i: number) => {
    onDaySelect(i);
    setDayPopupIdx(dayPopupIdx === i ? null : i);
  };

  const handleHourSelect = (selectedHour: number) => {
    onHourChange(selectedHour);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {enrichedDaily.map((d, i) => (
          <button
            key={i}
            onClick={() => handleDayClick(i)}
            className={
              "rounded-xl p-2.5 text-center cursor-pointer transition-all duration-200 " +
              (dayIdx === i
                ? "bg-white border-2 border-red-500 shadow-lg"
                : "bg-white/80 border-2 border-gray-300 hover:bg-white hover:border-gray-400 shadow-sm")
            }
          >
            <div className="text-xs font-bold text-gray-800 mb-1">{dateLabels[i]}</div>
            <div className="text-2xl my-1 drop-shadow-md">{wic(d.weatherCode, true)}</div>
            <div className="text-sm font-extrabold text-red-600">
              {Math.round(d.tempMax)}°/{Math.round(d.tempMin)}°
            </div>
            <div className="text-xs font-semibold text-gray-500">Δ{d.delta}°C</div>
          </button>
        ))}
      </div>

      {dayPopupIdx !== null && enrichedDaily[dayPopupIdx] && (
        <DayForecastPopup
          data={hourlyData}
          dayLabel={dateLabels[dayPopupIdx]}
          onClose={() => setDayPopupIdx(null)}
          selectedHour={hour}
          onHourSelect={handleHourSelect}
        />
      )}

      <div className="flex items-center gap-3 mb-4 py-2 px-4 bg-white/80 rounded-xl border-2 border-gray-300 shadow-sm">
        <span className="text-sm font-bold text-gray-700">🕐 Ora</span>
        <input
          type="range"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => onHourChange(parseInt(e.target.value))}
          className="flex-1 h-2 accent-red-500 min-w-[60px] rounded-full"
        />
        <span className="text-base font-extrabold text-gray-900 min-w-[50px] text-center">
          {String(hour).padStart(2, "0")}:00
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          ["🌡️ Temperatura", `${Math.round(current.temperature)}°C`, "text-red-600"],
          ["💧 Umidità", `${Math.round(current.humidity)}%`, "text-blue-600"],
          ["☁️ Nuvolosità", `${Math.round(current.cloudCover)}%`, "text-gray-600"],
          ["🌧️ Precipitazioni", current.precipitation === 0 ? "Assenti" : `${current.precipitation} mm`, "text-sky-600"],
          ["☁️ Base Nuvole", thermal ? `${thermal.cloudBase}m` : "--", "text-gray-700"],
          ["⬆️ Plafond", thermal ? `${thermal.thermalTop}m` : "--", "text-gray-700"],
          ["🪁 Galleggiamento", thermal ? `${thermal.soarIdx}/10` : "--", "text-amber-600"],
          ["💨 Vento", `${wa(current.windDir)} ${Math.round(current.windSpeed)} km/h`, "text-indigo-600"],
        ].map(([l, v, color]) => (
          <div key={l as string} className="bg-white/90 p-2.5 rounded-xl border-2 border-gray-300 shadow-sm">
            <div className="text-xs font-bold text-gray-600 mb-0.5">{l}</div>
            <div className={`text-base font-extrabold ${color}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 p-3 bg-white/90 rounded-xl border-2 border-gray-300 shadow-sm">
        <h4 className="text-sm font-extrabold text-blue-700 mb-2">🔺 Zero Termico</h4>
        <div className="text-center">
          <div className="text-3xl font-black text-gray-900 drop-shadow-sm">
            {getZeroTermico(current.temperature, 0)} m
          </div>
          <div className="text-xs font-semibold text-gray-500 mt-0.5">
            Altitudine dove T = 0°C (gradiente 0.98°C/100m)
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-white/90 rounded-xl border-2 border-gray-300 shadow-sm">
        <h4 className="text-sm font-extrabold text-blue-700 mb-2">📊 Pressione</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-500">Attuale</div>
            <div className="text-xl font-black text-gray-900">{Math.round(current.pressure)} hPa</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-gray-500">Gradiente</div>
            <div className="text-xl font-black" style={{color: pressureGrad.grad > 0 ? "#16a34a" : pressureGrad.grad < 0 ? "#dc2626" : "#d97706"}}>
              {pressureGrad.grad > 0 ? "↑" : pressureGrad.grad < 0 ? "↓" : "→"} {Math.abs(pressureGrad.grad)} hPa
            </div>
            <div className="text-xs font-semibold text-gray-500">{pressureGrad.desc}</div>
          </div>
        </div>
      </div>

      {aiData?.thunderstorm && (
        <div className={`p-3 rounded-xl mb-2 border-2 shadow-sm ${
          aiData.thunderstorm.includes("ALLERTA")
            ? "bg-red-50 border-red-400"
            : "bg-white/90 border-gray-300"
        }`}>
          <div className="text-sm leading-relaxed whitespace-pre-wrap font-bold text-gray-900">
            {aiData.thunderstorm}
          </div>
        </div>
      )}
    </>
  );
};