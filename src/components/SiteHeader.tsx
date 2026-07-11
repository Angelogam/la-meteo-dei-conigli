"use client";

import type { Decollo, HourData } from "@/types/meteo";
import { wic } from "@/utils/meteo";

interface SiteHeaderProps {
  site: Decollo;
  current: HourData;
}

export const SiteHeader = ({ site, current }: SiteHeaderProps) => {
  return (
    <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-500">
      <div>
        <h2 className="text-xl font-extrabold text-white">
          {site.icon} {site.name}
        </h2>
        <p className="text-xs text-gray-300">
          {site.altitude}m s.l.m. &middot; {site.province} &middot; {site.description}
        </p>
      </div>
      <div className="text-right">
        <div className="text-3xl">{wic(current.weatherCode, true)}</div>
        <div className="text-lg font-black text-white">{Math.round(current.temperature)}°C</div>
        <div className="text-xs text-gray-300">
          {current.windSpeed} km/h &middot; {current.humidity}%
        </div>
      </div>
    </div>
  );
};