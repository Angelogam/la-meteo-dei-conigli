"use client";

import { wic } from "@/utils/meteo";
import type { HourData } from "@/types/meteo";
import type { Decollo } from "@/data/decolli";

interface SiteHeaderProps {
  site: Decollo;
  current: HourData;
}

export const SiteHeader = ({ site, current }: SiteHeaderProps) => {
  return (
    <div className="flex justify-between items-center pb-3 border-b border-white/20 mb-3 flex-wrap gap-2">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white">{site.name}</h2>
        <span className="text-sm text-gray-300">{site.exposure} - {site.valley} - {site.altitude}m</span>
      </div>
      <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
        <span className="text-2xl md:text-3xl">{wic(current.weatherCode, current.isDay)}</span>
        <span className="text-xl md:text-2xl font-bold text-yellow-300">{Math.round(current.temperature)}&deg;C</span>
      </div>
    </div>
  );
};