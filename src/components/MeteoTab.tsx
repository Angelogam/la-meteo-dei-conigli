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
                ? "bg-red-500/20 border border-red-400/60"
                : "bg-white/[0.06] border border-white/20")
            }
          >
            <div className="text-xs font-semibold text-gray-200">{dateLabels[i]}</div>
            <div className="text-xl my-0.5">{wic(d.weatherCode, 1)}</div>
            <div className="text-sm text-red-400 font-semibold">
              {Math.round(d.tempMax)}&deg;/{Math.round(d.tempMin)}&deg;
            </div>
            <div className="text-xs text-gray-400">&Delta;{d.delta}&deg;C</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5 mb-3 py-1.5 px-3 bg-white/[0.08] rounded-xl">
        <span className="text-xs text-gray-400">&#x23F0; Ora</span>
        <input
          type="range"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => onHourChange(parseInt(e.target.value))}
          className="flex-1 h-1 accent-red-400 min-w-[60px]"
        />
        <span className="text-sm font-bold text-white min-w-[40px] text-center">
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
          <div key={l as string} className="bg-white/[0.07] p-2 rounded-xl border border-white/15">
            <div className="text-xs text-gray-300 font-medium">{l}</div>
            <div className="text-sm md:text-base font-bold text-white">{v}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 p-2.5 bg-white/[0.07] rounded-xl border border-white/15">
        <h4 className="text-sm text-blue-300 mb-2.5 font-semibold">Pressione</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-xs text-gray-400">Attuale</div>
            <div className="text-lg font-bold text-white">{Math.round(current.pressure)} hPa</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Gradiente</div>
            <div className="text-lg font-bold" style={{color: pressureGrad.grad > 0 ? "#4caf50" : pressureGrad.grad < 0 ? "#f44336" : "#ffd93d"}}>
              {pressureGrad.grad > 0 ? "\u2191" : pressureGrad.grad < 0 ? "\u2193" : "\u2192"} {Math.abs(pressureGrad.grad)} hPa
            </div>
            <div className="text-xs text-gray-400">{pressureGrad.desc}</div>
          </div>
        </div>
      </div>

      {aiData?.thunderstorm && (
        <div className={"p-2 rounded-lg mb-2 " + (aiData.thunderstorm.includes("ALLERTA") ? "bg-red-500/15 border-2 border-red-500" : "bg-green-500/10 border border-green-500/30")}>
          <div className="text-xs leading-relaxed whitespace-pre-wrap text-gray-200">{aiData.thunderstorm}</div>
        </div>
      )}
    </>
  );
};