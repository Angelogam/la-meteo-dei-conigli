"use client";

import { wic, wa, getZeroTermico } from "@/utils/meteo";
import type { HourData, DailyData, ThermalData, PressureGradient, AiAnalysis } from "@/types/meteo";
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

  return (
    <>
      {/* Giorni della settimana */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {enrichedDaily.map((d, i) => (
          <button
            key={i}
            onClick={() => { onDaySelect(i); }}
            className={
              "rounded-xl p-2.5 text-center cursor-pointer transition-all duration-200 border " +
              (dayIdx === i
                ? "bg-white/15 border-orange-400 shadow-lg shadow-orange-500/10"
                : "bg-white/5 border-gray-600 hover:bg-white/10 hover:border-gray-500")
            }
          >
            <div className="text-xs font-bold text-gray-200 mb-1">{dateLabels[i]}</div>
            <div className="text-2xl my-1 drop-shadow-md">{wic(d.weatherCode, true)}</div>
            <div className="text-sm font-extrabold text-orange-300">
              {Math.round(d.tempMax)}°/{Math.round(d.tempMin)}°
            </div>
            <div className="text-xs font-semibold text-gray-400">Δ{d.delta}°C</div>
          </button>
        ))}
      </div>

      {/* Slider ora */}
      <div className="flex items-center gap-3 mb-4 py-2 px-4 bg-white/10 rounded-xl border border-gray-600 shadow-sm">
        <span className="text-sm font-bold text-gray-200">🕐 Ora</span>
        <input
          type="range"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => onHourChange(parseInt(e.target.value))}
          className="flex-1 h-2 accent-orange-400 min-w-[60px] rounded-full"
        />
        <span className="text-base font-extrabold text-white min-w-[50px] text-center">
          {String(hour).padStart(2, "0")}:00
        </span>
      </div>

      {/* Finestre volabilità */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          ["🌡️ Temperatura", `${Math.round(current.temperature)}°C`, "text-orange-300"],
          ["💧 Umidità", `${Math.round(current.humidity)}%`, "text-blue-300"],
          ["☁️ Nuvolosità", `${Math.round(current.cloudCover)}%`, "text-gray-200"],
          ["🌧️ Precipitazioni", current.precipitation === 0 ? "Assenti" : `${current.precipitation} mm`, "text-sky-300"],
          ["☁️ Base Nuvole", thermal ? `${thermal.cloudBase}m` : "--", "text-gray-200"],
          ["⬆️ Plafond", thermal ? `${thermal.thermalTop}m` : "--", "text-gray-200"],
          ["🪁 Galleggiamento", thermal ? `${thermal.soarIdx}/10` : "--", "text-amber-300"],
          ["💨 Vento", `${wa(current.windDir)} ${Math.round(current.windSpeed)} km/h`, "text-indigo-300"],
        ].map(([l, v, color]) => (
          <div key={l as string} className="bg-white/10 p-2.5 rounded-xl border border-gray-600 shadow-sm">
            <div className="text-xs font-bold text-gray-300 mb-0.5">{l}</div>
            <div className={`text-base font-extrabold ${color}`}>{v}</div>
          </div>
        ))}
      </div>

      {/* Zero Termico */}
      <div className="mb-4 p-3 bg-white/10 rounded-xl border border-gray-600 shadow-sm">
        <h4 className="text-sm font-extrabold text-blue-300 mb-2">🔺 Zero Termico</h4>
        <div className="text-center">
          <div className="text-3xl font-black text-white drop-shadow-sm">
            {getZeroTermico(current.temperature, 0)} m
          </div>
          <div className="text-xs font-semibold text-gray-400 mt-0.5">
            Altitudine dove T = 0°C (gradiente 0.98°C/100m)
          </div>
        </div>
      </div>

      {/* Pressione */}
      <div className="mb-4 p-3 bg-white/10 rounded-xl border border-gray-600 shadow-sm">
        <h4 className="text-sm font-extrabold text-blue-300 mb-2">📊 Pressione</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-400">Attuale</div>
            <div className="text-xl font-black text-white">{Math.round(current.pressure)} hPa</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-gray-400">Gradiente</div>
            <div className="text-xl font-black" style={{color: pressureGrad.grad > 0 ? "#4ade80" : pressureGrad.grad < 0 ? "#f87171" : "#fbbf24"}}>
              {pressureGrad.grad > 0 ? "↑" : pressureGrad.grad < 0 ? "↓" : "→"} {Math.abs(pressureGrad.grad)} hPa
            </div>
            <div className="text-xs font-semibold text-gray-400">{pressureGrad.desc}</div>
          </div>
        </div>
      </div>

      {/* Allerta temporali */}
      {aiData?.thunderstorm && (
        <div className={`p-3 rounded-xl mb-2 border shadow-sm ${
          aiData.thunderstorm.includes("ALLERTA")
            ? "bg-red-900/30 border-red-500"
            : "bg-white/10 border-gray-600"
        }`}>
          <div className="text-sm leading-relaxed whitespace-pre-wrap font-bold text-gray-100">
            {aiData.thunderstorm}
          </div>
        </div>
      )}
    </>
  );
};