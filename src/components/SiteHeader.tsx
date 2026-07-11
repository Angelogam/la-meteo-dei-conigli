"use client";

import type { HourData } from "@/types/meteo";
import type { Decollo } from "@/data/decolli";
import { wic } from "@/utils/meteo";

interface SiteHeaderProps {
  site: Decollo;
  current: HourData;
}

export const SiteHeader = ({ site, current }: SiteHeaderProps) => {
  return (
    <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
      <div>
        <h2 className="text-xl font-extrabold text-gray-800">
          {site.name}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {site.altitude}m s.l.m.
        </p>
      </div>
      <div className="text-right">
        <div className="text-3xl">{wic(current.weatherCode, true)}</div>
        <div className="text-lg font-black text-gray-800">{Math.round(current.temperature)}°C</div>
        <div className="text-xs text-gray-500">{current.windSpeed} km/h &middot; {current.humidity}%</div>
      </div>
    </div>
  );
};