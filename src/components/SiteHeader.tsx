"use client";

import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Navigation,
  Wind,
  Sparkles,
  CloudRain,
  Droplets,
} from "lucide-react";
import type { HourData } from "@/types/meteo";

interface SiteHeaderProps {
  name: string;
  exposure: string;
  valley: string;
  alt: number;
  currentData: HourData | null;
  selectedHour?: number;
}

function getWeatherConditionDetails(current: HourData | null) {
  if (!current) return { label: "sereno", icon: "☀️" };

  const code = current.weatherCode ?? 0;
  const precip = (current.precipitation || current.rain || 0);
  const cloud = current.cloudCover ?? 0;

  if (code >= 95 || (precip > 3 && cloud > 70)) return { label: "temporale", icon: "⛈️" };
  if (code >= 80 || precip > 1.5) return { label: "rovesci di pioggia", icon: "🌧️" };
  if (code >= 61 || precip > 0.3) return { label: "pioggia", icon: "🌧️" };
  if (code >= 51 || precip > 0) return { label: "pioggerella", icon: "🌦️" };
  if (code >= 71 && code <= 77) return { label: "neve", icon: "❄️" };
  if (code >= 45 && code <= 48) return { label: "nebbia", icon: "🌫️" };
  if (cloud >= 85) return { label: "cielo coperto", icon: "☁️" };
  if (cloud >= 60) return { label: "molto nuvoloso", icon: "⛅" };
  if (cloud >= 25) return { label: "poco nuvoloso", icon: "🌤️" };
  return { label: "sereno", icon: "☀️" };
}

export default function SiteHeader({
  name,
  exposure,
  valley,
  alt,
  currentData,
  selectedHour,
}: SiteHeaderProps) {
  const { label, icon } = getWeatherConditionDetails(currentData);
  const precip = currentData ? (currentData.precipitation || currentData.rain || 0) : 0;
  const cloud = currentData?.cloudCover ?? 0;
  const displayHour = selectedHour != null ? `${String(selectedHour).padStart(2, "0")}:00` : "";

  return (
    <div className="card header-decollo pb-5 mb-4 border-b border-orange-400/20 relative overflow-hidden bg-slate-900/60">
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
        <div className="flex flex-wrap items-center justify-center gap-4 bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/60 rounded-2xl px-4 py-3 relative overflow-hidden mt-3 shadow-inner">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-3xl animate-float shrink-0 drop-shadow">
              {icon}
            </span>
          </div>
          <div className="text-center relative z-10">
            <div className="text-2xl font-black text-white tabular-nums">
              {Math.round(currentData.temperature)}°C
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span className="tabular-nums font-bold text-slate-200">{Math.round(currentData.windSpeed)} km/h</span>
            </div>
          </div>
          <div className="text-xs text-left">
            <div className="font-bold text-slate-100 capitalize">
              {label} {displayHour && <span className="text-emerald-400 font-mono">({displayHour})</span>}
            </div>
            <div className="text-slate-400 flex items-center gap-2 mt-0.5 text-[11px]">
              <span>Nuvole: <strong className="text-slate-300">{cloud}%</strong></span>
              <span>&bull;</span>
              <span className={precip > 0 ? "text-rose-300 font-bold flex items-center gap-0.5" : "text-emerald-400"}>
                {precip > 0 ? (
                  <>
                    <Droplets className="w-3 h-3" />
                    {precip.toFixed(1)} mm
                  </>
                ) : (
                  "Nessuna pioggia"
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}