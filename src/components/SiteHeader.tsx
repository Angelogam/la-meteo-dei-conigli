"use client";

import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Navigation,
  ThermometerSun,
  Wind,
  RefreshCcw,
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
    <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-4 border-b border-slate-700/50">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center">
          <Navigation className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">{name}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-400" />
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
        <div className="flex items-center gap-4 bg-emerald-900/20 border border-emerald-500/20 rounded-2xl px-4 py-2.5">
          <span className="text-3xl">
            {getWeatherIcon(currentData.weatherCode || 0, currentData.isDay || 1)}
          </span>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-100 tabular-nums">
              {Math.round(currentData.temperature)}°
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Wind className="w-3 h-3 text-sky-400" />
              <span className="tabular-nums">
                {Math.round(currentData.windSpeed)} km/h
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}