"use client";

import type { HourData } from "@/types/meteo";
import { wa } from "@/utils/meteo";

interface VentiTabProps {
  dayData: HourData[];
}

function windColor(speed: number): string {
  if (speed < 8) return "bg-yellow-400";
  if (speed < 12) return "bg-yellow-500";
  if (speed < 16) return "bg-orange-400";
  if (speed < 20) return "bg-orange-500";
  if (speed < 24) return "bg-orange-600";
  if (speed < 28) return "bg-red-500";
  if (speed < 32) return "bg-red-600";
  if (speed < 36) return "bg-red-700";
  return "bg-red-800";
}

export const VentiTab = ({ dayData }: VentiTabProps) => {
  if (!dayData.length) {
    return <div className="text-sm text-slate-300 p-4 text-center">Nessun dato vento disponibile</div>;
  }

  return (
    <div className="space-y-1">
      {dayData.map((h, i) => {
        const barColor = windColor(h.windSpeed);
        return (
          <div key={i} className="flex items-center gap-2 py-1.5 px-2 border-b border-slate-600/30 last:border-0">
            <div className="text-xs font-bold text-slate-300 w-10">
              {String(h.time.getHours()).padStart(2, "0")}:00
            </div>
            <div className="text-sm text-slate-200 w-16">{wa(h.windDir)}</div>
            <div className="flex-1 h-3 bg-slate-600/60 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-300`}
                style={{
                  width: `${Math.min(100, (h.windSpeed / 40) * 100)}%`,
                  boxShadow: h.windSpeed >= 28 ? "0 0 6px rgba(220, 38, 38, 0.6)" : "none",
                }}
              />
            </div>
            <div className="text-sm font-bold text-slate-100 w-14 text-right">
              {Math.round(h.windSpeed)} km/h
            </div>
            <div className="text-xs text-slate-400 w-10 text-right">
              {h.windGust ? Math.round(h.windGust) : "--"} km/h
            </div>
          </div>
        );
      })}
    </div>
  );
};