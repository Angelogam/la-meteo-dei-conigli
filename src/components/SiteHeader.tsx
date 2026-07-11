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
    <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-3 md:p-3.5 border border-slate-600 shadow-inner flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-0.5 flex-wrap">
          <h2 className="text-sm md:text-base font-bold text-white truncate">{site.name}</h2>
          {current && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] md:text-xs font-bold border ${volo.color}`}>
              {volo.icon} {volo.label}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 flex items-center justify-center md:justify-start gap-1 flex-wrap">
          <MapPin className="w-3 h-3" />
          {site.valley} · {site.exposure} · {site.altitude}m · D{site.difficulty}
        </p>
        {current && (
          <p className="text-[10px] text-slate-500 mt-0.5 italic text-center md:text-left">{volo.description}</p>
        )}
      </div>
      {current && (
        <div className="flex flex-col items-end shrink-0 mt-0.5">
          <span className="text-2xl leading-none">{wic(current.weatherCode, true)}</span>
          <span className="text-sm font-bold text-white">{Math.round(current.temperature)}°C</span>
          <span className="text-[10px] text-blue-300/70 flex items-center gap-0.5">
            <Wind className="w-2.5 h-2.5" />
            {Math.round(current.windSpeed)} km/h
          </span>
        </div>
      )}
    </div>
  );
};

export default SiteHeader;