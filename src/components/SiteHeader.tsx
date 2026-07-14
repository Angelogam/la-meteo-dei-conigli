"use client";

import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Thermometer,
  Wind,
  Navigation,
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
    <div className="flex flex-col items-center gap-3 pb-4 mb-4 border-b border-slate-800/60">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Navigation className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg md:text-xl font-bold text-slate-100">
            {name}
          </h2>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-0.5">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              {valley}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-sky-400" />
              {exposure}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="flex items-center gap-1">
              <Mountain className="w-3 h-3 text-amber-400" />
              {alt}m
            </span>
          </div>
        </div>
      </div>

      {currentData && (
        <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-2.5">
          <span className="text-2xl">
            {getWeatherIcon(currentData.weatherCode || 0, currentData.isDay || 1)}
          </span>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-bold text-slate-100 tabular-nums">
                {Math.round(currentData.temperature)}°
              </div>
              <div className="text-[11px] text-slate-500">temperatura</div>
            </div>
            <div className="w-px h-8 bg-slate-700/50" />
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-semibold text-sky-300 tabular-nums">
                <Wind className="w-3.5 h-3.5 text-sky-400" />
                {Math.round(currentData.windSpeed)} <span className="text-[11px] font-normal text-slate-500">km/h</span>
              </div>
              <div className="text-[11px] text-slate-500">vento</div>
            </div>
            <div className="w-px h-8 bg-slate-700/50" />
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-semibold text-amber-300 tabular-nums">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                {Math.round(currentData.humidity)} <span className="text-[11px] font-normal text-slate-500">%</span>
              </div>
              <div className="text-[11px] text-slate-500">umidità</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
