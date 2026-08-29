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
import type { HourData } from "@/types/meteo";
import { useGroqValidationContext } from "@/context/GroqValidationContext";
import GroqBadge from "@/components/GroqBadge";

interface SiteHeaderProps {
  site_name: string;
  location_name: string;
  orientation: string;
  elevation_m: number;
  currentData: HourData | null;
}

function getWeatherLabel(weatherCode: number): string {
  if (weatherCode >= 95) return "temporale";
  if (weatherCode >= 80) return "rovesci";
  if (weatherCode >= 71) return "neve";
  if (weatherCode >= 61) return "pioggia";
  if (weatherCode >= 51) return "pioviggine";
  if (weatherCode >= 45) return "nebbia";
  if (weatherCode >= 26) return "nuvole";
  if (weatherCode >= 20) return "coperto";
  if (weatherCode >= 10) return "nuvole e sole";
  if (weatherCode >= 5) return "poco nuvoloso";
  return "sereno";
}

function getWeatherIcon(code: number): string {
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌧️";
  if (code >= 71) return "❄️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 20) return "☁️";
  if (code >= 10) return "⛅";
  if (code >= 5) return "🌤️";
  return "☀️";
}

export default function SiteHeader({
  site_name,
  location_name,
  orientation,
  elevation_m,
  currentData,
}: SiteHeaderProps) {
  const { getValidation } = useGroqValidationContext();
  const validation = getValidation(site_name?.toLowerCase().replace(/\s+/g, "-") || "");
  
  const weatherCode = currentData?.weatherCode ?? 0;
  const label = getWeatherLabel(weatherCode);
  const isOvercast = weatherCode >= 20 && weatherCode < 61;
  const isFog = weatherCode >= 45 && weatherCode <= 48;

  return (
    <div className="card header-decollo pb-5 mb-4 border-b border-orange-400/20 relative overflow-hidden">
      <div className="absolute -top-4 -left-4 w-32 h-32 bg-gradient-to-br from-orange-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-center gap-3 relative">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 to-amber-500/15 border border-orange-400/40 flex items-center justify-center shadow-lg shadow-orange-500/10 shrink-0">
          <Navigation className="w-6 h-6 md:w-7 md:h-7 text-orange-400" />
        </div>
        <div className="text-center min-w-0">
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center justify-center gap-2 tracking-tight">
            {site_name}
            <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-twinkle shrink-0" />
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm text-slate-400 mt-1">
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
              <MapPin className="w-3 h-3 text-rose-400" />
              {location_name}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
              <Compass className="w-3 h-3 text-sky-400" />
              {orientation}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
              <Mountain className="w-3 h-3 text-amber-400" />
              {elevation_m}m
            </span>
          </div>
        </div>
      </div>
      {currentData && (
        <div className="flex items-center justify-center gap-4 bg-gradient-to-br from-orange-900/30 to-amber-900/15 border border-orange-400/30 rounded-2xl px-4 py-2.5 relative overflow-hidden mt-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-3xl animate-float shrink-0">
              {getWeatherIcon(weatherCode)}
            </span>
            {isOvercast && (
              <span className="flex items-center -ml-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="w-6 h-6 text-slate-500/60">
                  <ellipse cx="20" cy="22" rx="12" ry="7" fill="currentColor"/>
                  <ellipse cx="15" cy="18" rx="9" ry="6" fill="currentColor" opacity="0.7"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="w-5 h-5 text-slate-600/50 -ml-2 mt-1">
                  <ellipse cx="20" cy="22" rx="10" ry="6" fill="currentColor"/>
                  <ellipse cx="16" cy="19" rx="8" ry="5" fill="currentColor" opacity="0.7"/>
                </svg>
              </span>
            )}
          </div>
          <div className="text-center relative z-10">
            <div className="text-2xl font-black text-white tabular-nums">
              {currentData.temperature !== null && currentData.temperature !== undefined 
                ? `${Math.round(currentData.temperature)}°` 
                : "--°"}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Wind className="w-3 h-3 text-sky-400" />
              <span className="tabular-nums font-bold">{Math.round(currentData.windSpeed)} km/h</span>
            </div>
          </div>
          <div className="text-xs text-slate-300 font-bold whitespace-nowrap">
            {label}
          </div>
          {validation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <GroqBadge result={validation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}