"use client";

import React from "react";
import type { HourData } from "@/types/meteo";

interface WindgramChartProps {
  dayData: HourData[];
  altitude: number;
  siteName: string;
}

const WindgramChart = ({ dayData, altitude, siteName }: WindgramChartProps) => {
  if (!dayData.length) {
    return <div className="text-sm text-gray-500 p-4 text-center">Nessun dato vento disponibile</div>;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
      <h3 className="text-sm font-bold text-gray-700 mb-3">
        💨 Profilo venti — {siteName} ({altitude}m)
      </h3>
      <div className="space-y-1.5">
        {dayData.map((h, i) => {
          const speed = Math.round(h.windSpeed);
          const gust = Math.round(h.windGust);
          const widthPct = Math.min(100, (speed / 40) * 100);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-10 text-gray-500 font-medium">
                {String(h.time.getHours()).padStart(2, "0")}:00
              </span>
              <span className="w-14 text-gray-700">{h.windSpeed} km/h</span>
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="w-14 text-right text-gray-400">
                {gust > 0 ? `${gust} km/h` : "--"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WindgramChart;