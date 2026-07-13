"use client";

import React from "react";
import { Sun, Cloud, CloudRain, CloudLightning, Wind, Thermometer, Gauge, Sparkles, ArrowUp, AlertTriangle } from "lucide-react";
import type { EnrichedDaily } from "@/types/meteo";
import { wic } from "@/utils/meteo";
import { getVoloStatus } from "@/utils/volo";

interface DaySelectorProps {
  enrichedDaily: EnrichedDaily[];
  dateLabels: string[];
  selectedDay: number;
  onSelect: (day: number) => void;
}

const DaySelector = ({ enrichedDaily, dateLabels, selectedDay, onSelect }: DaySelectorProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      {enrichedDaily.map((day: any, idx: number) => {
        const isSelected = idx === selectedDay;
        const dateLabel = dateLabels[idx] || `Giorno ${idx + 1}`;
        
        const vento = day.windSpeed10m || day.avgWind || 0;
        const raffica = day.windGusts10m || 0;
        const copertura = day.cloudCover || day.avgCloud || 0;
        const pioggia = day.precipitationProbability || day.precipitation_probability || 0;
        const turbolenza = day.turbulence || 0;
        const termiche = day.thermalUpdraft || day.thermal_updraft || 0;
        const tempMax = day.tempMax || day.temperature_2m_max || 0;
        const tempMin = day.tempMin || day.temperature_2m_min || 0;
        const weatherCode = day.weatherCode || day.weather_code || 0;
        const baseNuvole = day.thermalBase || day.thermal_base || 0;
        const visibility = day.visibility || 20;
        const humidity = day.humidity || 50;
        const pressure = day.pressureSeaLevel || day.pressure_msl || 1013;
        const windDir = day.windDirection || day.wind_direction || 180;
        const windShear = day.windShear || day.wind_shear || 0;
        const gustFactor = day.gustFactor || day.gust_factor || 1.5;

        // Valutazione volo
        let voloRating = "BUONO";
        let voloColor = "text-emerald-400 bg-emerald-500/10";
        if (vento > 25 || raffica > 35 || turbolenza > 4) {
          voloRating = "VENTO FORTE";
          voloColor = "text-amber-400 bg-amber-500/10";
        } else if (vento > 18 || copertura > 70 || pioggia > 30) {
          voloRating = "IMPEGNATIVO";
          voloColor = "text-orange-400 bg-orange-500/10";
        } else if (vento < 5) {
          voloRating = "POCA TERMICA";
          voloColor = "text-sky-300 bg-sky-500/10";
        }

        const isToday = idx === 0;

        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`flex-shrink-0 w-[140px] md:w-[160px] rounded-2xl p-3 transition-all duration-200 border-2 text-left ${
              isSelected
                ? "bg-gradient-to-b from-orange-900/30 to-amber-900/15 border-orange-400/50 shadow-lg shadow-orange-500/15 scale-[1.02]"
                : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/40 hover:border-orange-400/30"
            }`}
          >
            {/* Data */}
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isSelected ? "text-orange-300" : "text-slate-300"}`}>
                {isToday ? "OGGI" : dateLabel.toUpperCase()}
              </span>
              <span className="text-lg">{wic(weatherCode, true)}</span>
            </div>

            {/* Temperature */}
            <div className="flex items-center gap-1 mb-1.5">
              <Thermometer className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-bold text-slate-100">
                {Math.round(tempMax)}°
              </span>
              <span className="text-xs text-slate-500">/</span>
              <span className="text-xs text-slate-400">
                {Math.round(tempMin)}°
              </span>
            </div>

            {/* Vento e termiche */}
            <div className="grid grid-cols-2 gap-1 mb-2">
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-blue-400" />
                <span className="text-[11px] text-slate-300 font-medium tabular-nums">
                  {Math.round(vento)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-slate-300 font-medium tabular-nums">
                  {termiche > 0 ? termiche.toFixed(1) : "0"}
                </span>
              </div>
            </div>

            {/* Rating volo */}
            <div className="flex items-center justify-center">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${voloColor}`}>
                {voloRating}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DaySelector;