"use client";

import React from "react";
import { MapPin, Mountain, Compass, Navigation, Sparkles, Thermometer, Wind, Gauge, Sun, Cloud, CloudFog, CloudRain, CloudLightning, Snowflake } from "lucide-react";
import type { Decollo } from "@/data/decolli";
import type { MeteoDaily, MeteoHourly } from "@/services/weatherService";

interface DecolloListProps {
  decolli: Decollo[];
  selectedId: string;
  onSelect: (id: string) => void;
  allDailyData?: Record<string, MeteoDaily[]>;
  allHourlyData?: Record<string, MeteoHourly[]>;
}

function getWeatherIcon(code: number) {
  if (code === 0 || code === 1) return <Sun className="w-5 h-5 text-amber-400" />;
  if (code <= 2) return <Sun className="w-5 h-5 text-amber-300" />;
  if (code <= 3) return <Cloud className="w-5 h-5 text-slate-400" />;
  if (code <= 48) return <CloudFog className="w-5 h-5 text-slate-500" />;
  if (code <= 57) return <CloudRain className="w-5 h-5 text-sky-400" />;
  if (code <= 67) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (code <= 77) return <Snowflake className="w-5 h-5 text-blue-200" />;
  if (code <= 82) return <CloudRain className="w-5 h-5 text-sky-400" />;
  if (code >= 95) return <CloudLightning className="w-5 h-5 text-yellow-400" />;
  return <Sun className="w-5 h-5 text-amber-400" />;
}

function getDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

const DecolloList = ({ decolli, selectedId, onSelect, allDailyData, allHourlyData }: DecolloListProps) => {
  const getCurrentData = (id: string) => {
    const hourly = allHourlyData?.[id];
    if (!hourly || hourly.length === 0) return null;
    const now = new Date();
    const currentHour = hourly.find(h =>
      h.time.getFullYear() === now.getFullYear() &&
      h.time.getMonth() === now.getMonth() &&
      h.time.getDate() === now.getDate() &&
      h.time.getHours() === now.getHours()
    );
    if (currentHour) return currentHour;
    const first = hourly.find(h =>
      h.time.getFullYear() === now.getFullYear() &&
      h.time.getMonth() === now.getMonth() &&
      h.time.getDate() === now.getDate()
    );
    return first || null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/50 rounded-lg border border-slate-700/40">
        <Navigation className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-slate-200">Decolli</span>
        <span className="text-xs text-slate-500 ml-auto bg-slate-800/60 px-2 py-0.5 rounded-full">{decolli.length}</span>
      </div>

      <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
        {decolli.map((site) => {
          const isSelected = site.id === selectedId;
          const current = getCurrentData(site.id);
          const hasData = current != null;
          const temp = hasData ? Math.round(current.temperature) : null;
          const wind = hasData ? Math.round(current.windSpeed) : null;
          const dir = hasData ? Math.round(current.windDir) : null;
          const gust = hasData && current.windGusts > 0 ? Math.round(current.windGusts) : null;
          const code = hasData ? current.weatherCode : null;
          const dirName = dir != null ? getDirLabel(dir) : "";

          return (
            <button
              key={site.id}
              onClick={() => onSelect(site.id)}
              className={`w-full text-left rounded-lg px-3 py-3 transition-all border ${
                isSelected
                  ? "bg-emerald-900/40 border-emerald-500/40"
                  : "bg-slate-800/30 border-slate-800/50 hover:bg-slate-700/40"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{code != null ? getWeatherIcon(code) : <Cloud className="w-5 h-5 text-slate-600" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-100 mb-0.5">
                    {site.name}
                    {isSelected && <Sparkles className="w-3 h-3 text-emerald-400 inline ml-1" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><Compass className="w-3 h-3 text-sky-500/70" />{site.exposure}</span>
                    <span className="flex items-center gap-1"><Mountain className="w-3 h-3 text-amber-500/70" />{site.altitude}m</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-500/70" />{site.valley}</span>
                  </div>
                  {hasData && temp != null && (
                    <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-slate-700/20 text-xs">
                      <span className="flex items-center gap-1 font-semibold text-amber-400">
                        <Thermometer className="w-3.5 h-3.5 text-amber-500/70" />{temp}°
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-sky-300">
                        <Wind className="w-3.5 h-3.5 text-sky-500/70" />{wind}
                        <span className="text-slate-500 font-normal">{dirName}</span>
                      </span>
                      {gust != null && gust > 0 && (
                        <span className="text-red-300"><Gauge className="w-3.5 h-3.5 inline" />{gust}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolloList;
