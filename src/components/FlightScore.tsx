"use client";

import React from "react";
import { Calendar, TrendingUp, Clock, CloudRain, CloudLightning } from "lucide-react";

interface FlightScoreProps {
  score: number;
  label: string;
  bestHour: number;
  bestRateo: number;
  oreAttive: number;
  totaleOre: number;
  thermalLabel: string;
  dayLabel?: string;
  isRaining?: boolean;
  hasThunderstorm?: boolean;
  rainHours: number[];
  thunderstormHours: number[];
}

export default function FlightScore({
  score,
  label,
  bestHour,
  bestRateo,
  oreAttive,
  totaleOre,
  thermalLabel,
  dayLabel,
  isRaining = false,
  hasThunderstorm = false,
  rainHours,
  thunderstormHours,
}: FlightScoreProps) {
  
  // Determine if we have bad weather to show alerts
  const hasBadWeather = isRaining || hasThunderstorm;

  return (
    <div className="card bg-slate-800/30 border border-slate-700/50 p-4 relative overflow-hidden">
      {/* Bad weather alert */}
      {hasBadWeather && (
        <div className="absolute top-0 left-0 w-full bg-red-900/40 backdrop-blur-sm z-10 border-b border-red-500/30">
          <div className="flex items-center justify-center gap-2 py-1.5 px-3">
            {hasThunderstorm ? (
              <CloudLightning className="w-4 h-4 text-purple-300 animate-pulse" />
            ) : (
              <CloudRain className="w-4 h-4 text-blue-300" />
            )}
            <span className="text-xs font-bold text-white tracking-wide">
              {hasThunderstorm
                ? `Temporali alle ore: ${thunderstormHours.map(h => String(h).padStart(2, "0")).join(", ")}:00`
                : `Pioggia alle ore: ${rainHours.map(h => String(h).padStart(2, "0")).join(", ")}:00`}
            </span>
          </div>
        </div>
      )}

      <div className={hasBadWeather ? "pt-8" : ""}>
        {/* Day label (if provided) */}
        {dayLabel && (
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-3">
            <Calendar className="w-3 h-3 text-slate-500" />{dayLabel}
          </div>
        )}

        {/* Score + badge */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs text-slate-300 uppercase tracking-wider font-bold">Condizioni Volo</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className={`text-5xl font-extrabold transition-all duration-300 ${
              hasBadWeather 
                ? "text-red-400" 
                : score >= 8 ? "text-emerald-400" 
                : score >= 6 ? "text-lime-400" 
                : score >= 4 ? "text-amber-400" 
                : "text-orange-400"
            }`}>
              {hasBadWeather ? "3" : score}
            </span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-full border ${
              hasBadWeather 
                ? "bg-red-900/30 text-red-300 border-red-500/40" 
                : score >= 8 ? "bg-emerald-900/30 text-emerald-300 border-emerald-400/30" 
                : score >= 6 ? "bg-lime-900/30 text-lime-300 border-lime-400/30" 
                : score >= 4 ? "bg-amber-900/30 text-amber-300 border-amber-400/30" 
                : "bg-orange-900/30 text-orange-300 border-orange-400/30"
            }`}>
              {hasBadWeather ? (hasThunderstorm ? "PERICOLO" : "PIOGGIA") : label}
            </span>
          </div>
        </div>

        {/* Grid of additional info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-slate-800/60 rounded-lg p-2.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-slate-300">{thermalLabel}</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-300">{oreAttive}/{totaleOre} ore attive</span>
          </div>
        </div>
      </div>
    </div>
  );
}
</arg_value></tool_call><dyad-write path="src/components/FlightScore.tsx" description="Fix FlightScore to properly show rain/thunderstorm warnings and remove nonsensical text">
"use client";

import React from "react";
import { Calendar, TrendingUp, Clock, CloudRain, CloudLightning } from "lucide-react";

interface FlightScoreProps {
  score: number;
  label: string;
  bestHour: number;
  bestRateo: number;
  oreAttive: number;
  totaleOre: number;
  thermalLabel: string;
  dayLabel?: string;
  isRaining?: boolean;
  hasThunderstorm?: boolean;
  rainHours: number[];
  thunderstormHours: number[];
}

export default function FlightScore({
  score,
  label,
  bestHour,
  bestRateo,
  oreAttive,
  totaleOre,
  thermalLabel,
  dayLabel,
  isRaining = false,
  hasThunderstorm = false,
  rainHours,
  thunderstormHours,
}: FlightScoreProps) {
  
  // Determine if we have bad weather to show alerts
  const hasBadWeather = isRaining || hasThunderstorm;

  return (
    <div className="card bg-slate-800/30 border border-slate-700/50 p-4 relative overflow-hidden">
      {/* Bad weather alert */}
      {hasBadWeather && (
        <div className="absolute top-0 left-0 w-full bg-red-900/40 backdrop-blur-sm z-10 border-b border-red-500/30">
          <div className="flex items-center justify-center gap-2 py-1.5 px-3">
            {hasThunderstorm ? (
              <CloudLightning className="w-4 h-4 text-purple-300 animate-pulse" />
            ) : (
              <CloudRain className="w-4 h-4 text-blue-300" />
            )}
            <span className="text-xs font-bold text-white tracking-wide">
              {hasThunderstorm
                ? `Temporali alle ore: ${thunderstormHours.map(h => String(h).padStart(2, "0")).join(", ")}:00`
                : `Pioggia alle ore: ${rainHours.map(h => String(h).padStart(2, "0")).join(", ")}:00`}
            </span>
          </div>
        </div>
      )}

      <div className={hasBadWeather ? "pt-8" : ""}>
        {/* Day label (if provided) */}
        {dayLabel && (
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-3">
            <Calendar className="w-3 h-3 text-slate-500" />{dayLabel}
          </div>
        )}

        {/* Score + badge */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs text-slate-300 uppercase tracking-wider font-bold">Condizioni Volo</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className={`text-5xl font-extrabold transition-all duration-300 ${
              hasBadWeather 
                ? "text-red-400" 
                : score >= 8 ? "text-emerald-400" 
                : score >= 6 ? "text-lime-400" 
                : score >= 4 ? "text-amber-400" 
                : "text-orange-400"
            }`}>
              {hasBadWeather ? "3" : score}
            </span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-full border ${
              hasBadWeather 
                ? "bg-red-900/30 text-red-300 border-red-500/40" 
                : score >= 8 ? "bg-emerald-900/30 text-emerald-300 border-emerald-400/30" 
                : score >= 6 ? "bg-lime-900/30 text-lime-300 border-lime-400/30" 
                : score >= 4 ? "bg-amber-900/30 text-amber-300 border-amber-400/30" 
                : "bg-orange-900/30 text-orange-300 border-orange-400/30"
            }`}>
              {hasBadWeather ? (hasThunderstorm ? "PERICOLO" : "PIOGGIA") : label}
            </span>
          </div>
        </div>

        {/* Grid of additional info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-slate-800/60 rounded-lg p-2.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-slate-300">{thermalLabel}</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-300">{oreAttive}/{totaleOre} ore attive</span>
          </div>
        </div>
      </div>
    </div>
  );
}