"use client";

import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Navigation,
  Wind,
  Sparkles,
} from "lucide-react";
import { getWeatherIcon } from "@/utils/weatherHelpers";

interface SiteHeaderProps {
  name: string;
  exposure: string;
  valley: string;
  alt: number;
  currentData: any;
}

export default function SiteHeader({
  name,
  exposure,
  valley,
  alt,
  currentData,
}: SiteHeaderProps) {
  return (
    <div className="card header-decollo pb-5 mb-4 border-b border-orange-400/20 relative overflow-hidden">
      <div className="absolute -top-4 -left-4 w-32 h-32 bg-gradient-to-br from-orange-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-center gap-3 relative">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 to-amber-500/15 border border-orange-400/40 flex items-center justify-center shadow-lg shadow-orange-500/10 shrink-0">
          <Navigation className="w-6 h-6 md:w-7 md:h-7 text-orange-400" />
        </div>
        <div className="text-center min-w-0">
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center justify-center gap-2 tracking-tight">
            {name}
            <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-twinkle shrink-0" />
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm text-slate-400 mt-1">
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
              <MapPin className="w-3 h-3 text-rose-400" />
              {valley}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
              <Compass className="w-3 h-3 text-sky-400" />
              {exposure}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
              <Mountain className="w-3 h-3 text-amber-400" />
              {alt}m
            </span>
          </div>
        </div>
      </div>
      {currentData && (
        <div className="flex items-center justify-center gap-4 bg-gradient-to-br from-orange-900/30 to-amber-900/15 border border-orange-400/30 rounded-2xl px-4 py-2.5 relative overflow-hidden mt-3">
          <span className="text-3xl animate-float shrink-0">
            {getWeatherIcon(currentData.weatherCode || 0, currentData.isDay || 1)}
          </span>
          <div className="text-center relative z-10">
            <div className="text-2xl font-black text-white tabular-nums">
              {Math.round(currentData.temperature)}°
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Wind className="w-3 h-3 text-sky-400" />
              <span className="tabular-nums font-bold">{Math.round(currentData.windSpeed)} km/h</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}