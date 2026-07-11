"use client";

import { wic, wa, getZeroTermico } from "@/utils/meteo";
import type { HourData, DailyData, ThermalData, PressureGradient, AiAnalysis } from "@/types/meteo";
import { FinestreVolabilita } from "./FinestreVolabilita";

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
                ? "bg-orange-50 border-orange-400 shadow-md"
                : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300")
            }
          >
            <div className="text-xs font-bold text-gray-600 mb-1">{dateLabels[i]}</div>
            <div className="text-2xl my-1">{wic(d.weatherCode, true)}</div>
            <div className="text-sm font-extrabold text-orange-600">
              {Math.round(d.tempMax)}°/{Math.round(d.tempMin)}°
            </div>
            <div className="text-xs font-semibold text-gray-400">Δ{d.delta}°C</div>
          </button>
        ))}
      </div>

      {/* Slider ora */}
      <div className="flex items-center gap-3 mb-4 py-2 px-4 bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-sm font-bold text-gray-600">🕐 Ora</span>
        <input
          type="range"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => onHourChange(parseInt(e.target.value))}
          className="flex-1 h-2 accent-orange-500 min-w-[60px] rounded-full"
        />
        <span className="text-base font-extrabold text-gray-800 min-w-[50px] text-center">
          {String(hour).padStart(2, "0")}:00
        </span>
      </div>

      {/* Finestre volabilità */}
      <FinestreVolabilita
        temperature={current.temperature}
        humidity={current.humidity}
        cloudCover={current.cloudCover}
        precipitation={current.precipitation}
        cloudBase={thermal?.cloudBase ?? null}
        thermalTop={thermal?.thermalTop ?? null}
        soarIdx={thermal?.soarIdx ?? null}
        windDir={wa(current.windDir)}
        windSpeed={current.windSpeed}
      />

      {/* Zero Termico */}
      <div className="mb-4 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h4 className="text-sm font-extrabold text-blue-600 mb-2">🔺 Zero Termico</h4>
        <div className="text-center">
          <div className="text-3xl font-black text-gray-800">
            {getZeroTermico(current.temperature, 0)} m
          </div>
          <div className="text-xs font-semibold text-gray-400 mt-0.5">
            Altitudine dove T = 0°C (gradiente 0.98°C/100m)
          </div>
        </div>
      </div>

      {/* Pressione */}
      <div className="mb-4 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h4 className="text-sm font-extrabold text-blue-600 mb-2">📊 Pressione</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-400">Attuale</div>
            <div className="text-xl font-black text-gray-800">{Math.round(current.pressure)} hPa</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-gray-400">Gradiente</div>
            <div className="text-xl font-black" style={{color: pressureGrad.grad > 0 ? "#16a34a" : pressureGrad.grad < 0 ? "#dc2626" : "#ca8a04"}}>
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
            ? "bg-red-50 border-red-300"
            : "bg-white border-gray-200"
        }`}>
          <div className="text-sm leading-relaxed whitespace-pre-wrap font-bold text-gray-700">
            {aiData.thunderstorm}
          </div>
        </div>
      )}
    </>
  );
};