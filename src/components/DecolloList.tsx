"use client";

import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Navigation,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  ThermometerSun,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface DecolloListProps {
  decolli: { id: string; name: string; valley: string; exposure: string; alt: number }[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentData: any;
}

function getFlightRating(
  temp: number,
  windSpeed: number,
  cloudCover: number,
  precipitation: number
): { label: string; color: string; icon: React.ReactNode } {
  let score = 0;

  if (temp >= 20 && temp <= 30) score += 3;
  else if (temp >= 15 && temp < 20) score += 2;
  else if (temp >= 10 && temp < 15) score += 1;

  if (windSpeed >= 8 && windSpeed <= 20) score += 3;
  else if (windSpeed >= 5 && windSpeed < 8) score += 2;
  else if (windSpeed >= 20 && windSpeed <= 25) score += 1;
  else if (windSpeed > 25) score -= 1;

  if (cloudCover >= 10 && cloudCover <= 40) score += 3;
  else if (cloudCover >= 0 && cloudCover < 10) score += 2;
  else if (cloudCover > 40 && cloudCover <= 60) score += 1;
  else if (cloudCover > 60) score -= 1;

  if (precipitation === 0) score += 2;
  else if (precipitation > 0 && precipitation <= 1) score += 1;
  else score -= 1;

  if (score >= 8)
    return {
      label: "Ottimo",
      color: "border-emerald-500 bg-emerald-500/10 text-emerald-300",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  if (score >= 5)
    return {
      label: "Buono",
      color: "border-lime-500 bg-lime-500/10 text-lime-300",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  if (score >= 2)
    return {
      label: "Medio",
      color: "border-amber-500 bg-amber-500/10 text-amber-300",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    };
  return {
    label: "Scarso",
    color: "border-red-500 bg-red-500/10 text-red-300",
    icon: <XCircle className="w-3.5 h-3.5" />,
  };
}

function getWeatherIconComponent(code: number, size: number = 24) {
  const props = { size, className: "text-sky-300" };
  if (code === 0) return <Sun {...props} />;
  if (code <= 3) return <Cloud {...props} />;
  if (code >= 45 && code <= 48) return <Cloud {...props} />;
  if (code >= 51 && code <= 57) return <CloudRain {...props} />;
  if (code >= 61 && code <= 67) return <CloudRain {...props} />;
  if (code >= 71 && code <= 77) return <CloudRain {...props} />;
  if (code >= 80 && code <= 82) return <CloudRain {...props} />;
  if (code >= 95) return <CloudLightning {...props} />;
  return <Cloud {...props} />;
}

export default function DecolloList({
  decolli,
  selectedId,
  onSelect,
  currentData,
}: DecolloListProps) {
  const rating = currentData
    ? getFlightRating(
        currentData.temperature,
        currentData.windSpeed,
        currentData.cloudCover,
        currentData.precipitation
      )
    : null;

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border-2 border-emerald-500/20 p-4 h-[calc(100vh-200px)] overflow-hidden shadow-xl shadow-emerald-500/5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-emerald-300 flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          Decolli
        </h2>
        {rating && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${rating.color}`}
          >
            {rating.icon}
            <span>{rating.label}</span>
          </div>
        )}
      </div>
      <div className="overflow-y-auto h-[calc(100%-48px)] space-y-2.5 pr-1">
        {decolli.map((d) => {
          const isSelected = d.id === selectedId;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`w-full text-left rounded-xl px-4 py-3.5 transition-all duration-200 border-2 ${
                isSelected
                  ? "bg-emerald-900/30 border-emerald-400 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                  : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/40 hover:border-emerald-500/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-100 truncate">
                      {d.name}
                    </span>
                    {isSelected && currentData && (
                      <span className="shrink-0 text-xl">
                        {getWeatherIconComponent(currentData.weatherCode || 0, 20)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-rose-400" />
                      {d.valley}
                    </span>
                    <span className="flex items-center gap-1">
                      <Compass className="w-2.5 h-2.5 text-sky-400" />
                      {d.exposure}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mountain className="w-2.5 h-2.5 text-amber-400" />
                      {d.alt}m
                    </span>
                  </div>
                </div>
                {isSelected && currentData && (
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xl font-bold text-emerald-300 tabular-nums">
                      {Math.round(currentData.temperature)}°
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Wind className="w-3 h-3 text-sky-400" />
                      <span className="tabular-nums">
                        {Math.round(currentData.windSpeed)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}