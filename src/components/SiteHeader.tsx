"use client";

import React from "react";
import { MapPin, Wind, Thermometer, Cloud } from "lucide-react";
import type { HourData } from "@/types/meteo";
import type { Decollo } from "@/data/decolli";
import { wic } from "@/utils/meteo";
import { getVoloStatus } from "@/utils/volo";

interface SiteHeaderProps {
  site: Decollo;
  current: HourData | null;
}

const SiteHeader = ({ site, current }: SiteHeaderProps) => {
  const volo = getVoloStatus(current);

  return (
    <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-3 md:p-3.5 border border-slate-600 shadow-inner flex flex-col items-center text-center gap-2">
      <div className="min-w-0">
        <div className="flex flex-col items-center gap-1 mb-1">
          <h2 className="text-sm md:text-base font-bold text-white truncate">{site.name}</h2>
          {current && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] md:text-xs font-bold border ${volo.color}`}>
              {volo.icon} {volo.label}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-300 flex items-center justify-center gap-1 flex-wrap">
          <MapPin className="w-3 h-3 text-slate-300" />
          {site.valley} · {site.exposure} · {site.altitude}m · D{site.difficulty}
        </p>
        {current && (
          <p className="text-[10px] text-slate-400 mt-0.5 italic">{volo.description}</p>
        )}
      </div>
      {current && (
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl leading-none">{wic(current.weatherCode, true)}</span>
          <span className="text-sm font-bold text-white">{Math.round(current.temperature)}°C</span>
          <span className="text-[10px] text-blue-200 flex items-center gap-0.5">
            <Wind className="w-2.5 h-2.5" />
            {Math.round(current.windSpeed)} km/h
          </span>
        </div>
      )}
    </div>
  );
};

export default SiteHeader;