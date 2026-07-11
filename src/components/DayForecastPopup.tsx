"use client";

import type { HourData } from "@/types/meteo";
import { wa } from "@/utils/meteo";

interface DayForecastPopupProps {
  data: HourData[];
  dayLabel: string;
  onClose: () => void;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

export const DayForecastPopup = ({ data, dayLabel, onClose, selectedHour, onHourSelect }: DayForecastPopupProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl border border-gray-500 shadow-2xl p-4 sm:p-6 w-[90vw] max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold text-white">{dayLabel}</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-1">
          {data.map((h, i) => (
            <button
              key={i}
              onClick={() => onHourSelect(h.time.getHours())}
              className={
                "w-full flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors " +
                (selectedHour === h.time.getHours()
                  ? "bg-orange-500/30 border border-orange-400"
                  : "hover:bg-white/10 border border-transparent")
              }
            >
              <div className="text-xs font-bold text-gray-300 w-10">
                {String(h.time.getHours()).padStart(2, "0")}:00
              </div>
              <div className="text-sm text-gray-200 w-10">{Math.round(h.temperature)}°C</div>
              <div className="text-xs text-gray-300 w-16">{wa(h.windDir)}</div>
              <div className="text-xs font-bold text-white w-10 text-right">{Math.round(h.windSpeed)} km/h</div>
              <div className="text-xs text-gray-300 w-8 text-right">{Math.round(h.humidity)}%</div>
              <div className="text-xs text-gray-300 w-8 text-right">{Math.round(h.cloudCover)}%</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};