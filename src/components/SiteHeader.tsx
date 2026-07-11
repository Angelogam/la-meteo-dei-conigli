"use client";

import type { HourData } from "@/types/meteo";
import type { Decollo } from "@/data/decolli";
import { wic, wa } from "@/utils/meteo";

interface SiteHeaderProps {
  site: Decollo;
  current: HourData;
}

export const SiteHeader = ({ site, current }: SiteHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/5">
          {wic(current.weatherCode, true)}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
            {site.name}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-blue-300/80 px-2 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/20">
              {site.altitude}m
            </span>
            <span className="text-[11px] font-medium text-gray-400">
              {site.exposure}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
              {site.valley}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-3xl font-black text-white tracking-tight leading-none">
          {Math.round(current.temperature)}°
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-1">
          <span className="text-[11px] font-semibold text-blue-300/80">
            {wa(current.windDir)}
          </span>
          <span className="text-[11px] font-semibold text-white/80">
            {Math.round(current.windSpeed)} km/h
          </span>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          Umidità {current.humidity}%
        </div>
      </div>
    </div>
  );
};