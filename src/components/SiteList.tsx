"use client";

import type { HourData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { wic } from "@/utils/meteo";

interface SiteListProps {
  selected: string;
  current: HourData | null;
  onSelect: (id: string) => void;
  weatherMap: Record<string, HourData>;
}

export const SiteList = ({ selected, current, onSelect, weatherMap }: SiteListProps) => {
  return (
    <div className="flex flex-col gap-2">
      {DECOLLI.map((site) => {
        const w = weatherMap[site.id];
        const isSelected = site.id === selected;
        return (
          <button
            key={site.id}
            onClick={() => onSelect(site.id)}
            className={
              "w-full text-left rounded-xl p-3 transition-all duration-200 border-2 " +
              (isSelected
                ? "bg-white/20 border-orange-400 shadow-lg"
                : "bg-white/10 border-gray-600 hover:bg-white/20 hover:border-gray-400")
            }
          >
            <div className="text-sm font-bold text-white">
              {site.name}
            </div>
            <div className="text-xs text-gray-300 mt-0.5">
              {site.altitude}m s.l.m.
            </div>
            {w && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-lg">{wic(w.weatherCode, true)}</span>
                <span className="text-sm font-bold text-white">{Math.round(w.temperature)}°C</span>
                <span className="text-xs text-gray-300">{w.windSpeed} km/h</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};