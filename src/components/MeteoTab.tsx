"use client";

import { wic, ct, wa, wd } from "@/utils/meteo";
import type { HourData, DailyData, ThermalData, PressureGradient, AiAnalysis } from "@/types/meteo";

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
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {enrichedDaily.map((d, i) => (
          <button
            key={i}
            onClick={() => onDaySelect(i)}
            className={
              "rounded-xl p-2 text-center cursor-pointer " +
              (dayIdx === i
                ? "bg-red-50 border border-red-300"
                : "bg-white/50 border border-gray-200")
            }
          >
            <div className="text-xs font-semibold text-gray-700">{dateLabels[i]}</div>
            <div className="text-xl my-0.5">{wic(d.weatherCode, 1)}</div>
            <div className="text-sm text-red-600 font-semibold">
              {Math.round(d.tempMax)}&deg;/{Math.round(d.tempMin)}&deg;
            </div>
            <div className="text-xs text-gray-500">&Delta;{d.delta}&deg;C</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5 mb-3 py-1.5 px-3 bg-gray-100 rounded-xl">
        <span className="text-xs text-gray-500">&#x23F0; Ora</span>
        <input
          type="range"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => onHourChange(parseInt(e.target.value))}
          className="flex-1 h-1 accent-red-500 min-w-[60px]"
        />
        <span className="text-sm font-bold text-gray-800 min-w-[40px] text-center">
          {String(hour).padStart(2, "0")}:00
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
        {[
          ["Temperatura", Math.round(current.temperature) + "&deg;C", "&Delta; " + (thermal?.delta || 0) + "&deg;C"],
          ["Umidit\u00e0", Math.round(current.humidity) + "%", "Rugiada " + Math.round(current.dewPoint) + "&deg;C"],
          ["Nuvolosit\u00e0", Math.round(current.cloudCover) + "%", ct(current.cloudCover)],
          ["Precipitazioni", current.precipitation === 0 ? "Assenti" : current.precipitation + " mm", current.precipitation === 0 ? "Ideale" : "Pioggia"],
          ["Base Nuvole", thermal ? thermal.cloudBase + "m" : "--", "Cloud Base"],
          ["Plafond", thermal ? thermal.thermalTop + "m" : "--", "Thermal Top"],
          ["Galleggiamento", thermal ? thermal.soarIdx + "/10" : "--", "Soaring Index"],
          ["Vento", wa(current.windDir) + " " + Math.round(current.windSpeed) + " km/h", wd(current.windDir) + " \u2022 \u26A1" + Math.round(current.windGust) + " km/h"],
        ].map(([l, v, s]) => (
          <div key={l as string} className="bg-white/60 p-2 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">{l}</div>
            <div className="text-sm md:text-base font-bold text-gray-800">{v}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 p-2.5 bg-white/60 rounded-xl border border-gray-200 shadow-sm">
        <h4 className="text-sm text-blue-600 mb-2.5 font-semibold">Pressione</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-xs text-gray-500">Attuale</div>
            <div className="text-lg font-bold text-gray-800">{Math.round(current.pressure)} hPa</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Gradiente</div>
            <div className="text-lg font-bold" style={{color: pressureGrad.grad > 0 ? "#16a34a" : pressureGrad.grad < 0 ? "#dc2626" : "#d97706"}}>
              {pressureGrad.grad > 0 ? "\u2191" : pressureGrad.grad < 0 ? "\u2193" : "\u2192"} {Math.abs(pressureGrad.grad)} hPa
            </div>
            <div className="text-xs text-gray-500">{pressureGrad.desc}</div>
          </div>
        </div>
      </div>

      {aiData?.thunderstorm && (
        <div className={"p-2 rounded-lg mb-2 " + (aiData.thunderstorm.includes("ALLERTA") ? "bg-red-100 border-2 border-red-400" : "bg-green-50 border border-green-300")}>
          <div className="text-xs leading-relaxed whitespace-pre-wrap text-gray-700">{aiData.thunderstorm}</div>
        </div>
      )}
    </>
  );
};