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
  Sparkles,
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
      color: "border-emerald-400 bg-emerald-500/15 text-emerald-300 badge-glow",
      icon: <CheckCircle2 className="w-3.5 h-3.5 icon-neon-green" />,
    };
  if (score >= 5)
    return {
      label: "Buono",
      color: "border-lime-400 bg-lime-500/15 text-lime-300 badge-glow",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  if (score >= 2)
    return {
      label: "Medio",
      color: "border-amber-400 bg-amber-500/15 text-amber-300 badge-glow",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    };
  return {
    label: "Scarso",
    color: "border-red-400 bg-red-500/15 text-red-300 badge-glow",
    icon: <XCircle className="w-3.5 h-3.5" />,
  };
}

function getWeatherIconComponent(code: number, size: number = 24) {
  const props = { size, className: "text-sky-300 animate-twinkle" };
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
    <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border-2 border-orange-400/20 p-4 h-[calc(100vh-180px)] overflow-hidden shadow-xl shadow-orange-500/5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-orange-300 flex items-center gap-2">
          <Navigation className="w-4 h-4 icon-neon" />
          Decolli
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-400">
            {decolli.length}
          </span>
        </h2>
        {rating && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${rating.color}`}>
            {rating.icon}
            <span>{rating.label}</span>
          </div>
        )}
      </div>
      <div className="overflow-y-auto h-[calc(100%-44px)] space-y-2.5 pr-1">
        {decolli.map((d, i) => {
          const isSelected = d.id === selectedId;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              style={{ animationDelay: `${i * 0.05}s` }}
              className={`w-full text-left rounded-xl px-4 py-3.5 transition-all duration-200 border-2 animate-fade-in-up opacity-0 ${
                isSelected
                  ? "bg-gradient-to-r from-orange-900/40 to-amber-900/20 border-orange-400/50 shadow-lg shadow-orange-500/15 scale-[1.02] card-hover"
                  : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/40 hover:border-orange-400/30 card-hover"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-orange-100' : 'text-slate-100'}`}>
                      {d.name}
                    </span>
                    {isSelected && currentData && (
                      <span className="shrink-0 text-lg animate-twinkle">
                        {getWeatherIconComponent(currentData.weatherCode || 0, 18)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-rose-400/80" />
                      {d.valley}
                    </span>
                    <span className="flex items-center gap-1">
                      <Compass className="w-2.5 h-2.5 text-sky-400/80" />
                      {d.exposure}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mountain className="w-2.5 h-2.5 text-amber-400/80" />
                      {<dyad-write path="src/components/DecolloList.tsx" description="Completo la sidebar dei decolli">
                      {d.alt}m
                    </span>
                  </div>
                </div>
                {isSelected && currentData && (
                  <div className="flex flex-col items-end shrink-0 bg-slate-800/80 rounded-xl px-3 py-2 border border-orange-400/20">
                    <span className="text-xl font-bold text-orange-300 tabular-nums text-glow">
                      {Math.round(currentData.temperature)}°
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Wind className="w-3 h-3 text-sky-400/80" />
                      <span className="tabular-nums font-medium">
                        {Math.round(currentData.windSpeed)}
                      </span>
                      <span className="text-[10px] text-slate-500">km/h</span>
                    </div>
                  </div>
                )}
              </div>
              {/* Linea decorativa sottile per separare */}
              {i < decolli.length - 1 && !isSelected && (
                <div className="mt-2.5 border-b border-slate-700/30" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}