windGust">
"use client";

import type { HourData } from "@/types/meteo";
import { wa } from "@/utils/meteo";

interface VentiTabProps {
  dayData: HourData[];
}

export const VentiTab = ({ dayData }: VentiTabProps) => {
  if (!dayData.length) {
    return <div className="text-sm text-gray-500 p-4 text-center">Nessun dato vento disponibile</div>;
  }

  return (
    <div className="space-y-1">
      {dayData.map((h, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5 px-2 border-b border-gray-100 last:border-0">
          <div className="text-xs font-bold text-gray-500 w-10">
            {String(h.time.getHours()).padStart(2, "0")}:00
          </div>
          <div className="text-sm text-gray-700 w-16">{wa(h.windDir)}</div>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, (h.windSpeed / 40) * 100)}%` }}
            />
          </div>
          <div className="text-sm font-bold text-gray-800 w-14 text-right">{Math.round(h.windSpeed)} km/h</div>
          <div className="text-xs text-gray-500 w-10 text-right">{h.windGust ? Math.round(h.windGust) : "--"} km/h</div>
        </div>
      ))}
    </div>
  );
};