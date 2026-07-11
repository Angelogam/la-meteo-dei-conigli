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
    <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-slate-600 shadow-inner flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 text-center">
        <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
          <h2 className="text-base md:text-lg font-extrabold text-white truncate tracking-tight">{site.name}</h2>
          {current && (
            <span className={`px-2.5 py-1 rounded-md text-xs md:text-sm font-bold border ${volo.color} shadow-sm`}>
              {volo.icon} {volo.label}
            </span>
          )}
        </div>
        <p className="text-sm md:text-base text-slate-300 flex items-center justify-center gap-1 flex-wrap font-medium">
          <MapPin className="w-4 h-4 text-blue-400" />
          {site.valley} · {site.exposure} · {site.altitude}m · D{site.difficulty}
        </p>
        {current && (
          <p className="text-xs md:text-sm text-slate-400 mt-1 italic text-center leading-relaxed">{volo.description}</p>
        )}
      </div>
      {current && (
        <div className="flex flex-col items-end shrink-0 mt-0.5">
          <span className="text-3xl md:text-4xl leading-none drop-shadow-lg">{wic(current.weatherCode, true)}</span>
          <span className="text-base md:text-lg font-black text-white tracking-tight">{Math.round(current.temperature)}°C</span>
          <span className="text-xs md:text-sm text-blue-300/80 flex items-center gap-0.5 font-semibold">
            <Wind className="w-3.5 h-3.5" />
            {Math.round(current.windSpeed)} km/h
          </span>
        </div>
      )}
    </div>
  );
};

export default SiteHeader;