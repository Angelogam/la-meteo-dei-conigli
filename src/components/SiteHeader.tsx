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
    <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-slate-600 shadow-inner flex flex-col items-center text-center gap-3">
      <div className="min-w-0">
        <div className="flex flex-col items-center gap-1.5 mb-1.5">
          <h2 className="text-base md:text-lg font-bold text-white truncate">{site.name}</h2>
          {current && (
            <span className={`px-3 py-0.5 rounded-md text-xs md:text-sm font-bold border ${volo.color}`}>
              {volo.icon} {volo.label}
            </span>
          )}
        </div>
        <p className="text-xs md:text-sm text-slate-300 flex items-center justify-center gap-1.5 flex-wrap">
          <MapPin className="w-3.5 h-3.5 text-slate-300" />
          {site.valley} · {site.exposure} · {site.altitude}m · D{site.difficulty}
        </p>
        {current && (
          <p className="text-xs text-slate-400 mt-1 italic">{volo.description}</p>
        )}
      </div>
      {current && (
        <div className="flex items-center justify-center gap-4">
          <span className="text-3xl leading-none">{wic(current.weatherCode, false)}</span>
          <span className="text-lg md:text-xl font-bold text-white">{Math.round(current.temperature)}°C</span>
          <span className="text-sm text-blue-200 flex items-center gap-1">
            <Wind className="w-3.5 h-3.5" />
            {Math.round(current.windSpeed)} km/h
          </span>
          {current.precipitation > 0 && (
            <span className="text-sm text-blue-300 flex items-center gap-1 animate-pulse">
              <CloudRain className="w-3.5 h-3.5" />
              {current.precipitation.toFixed(1)}mm
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SiteHeader;