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
  Star,
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
): { label: string; score: number; color: string; bg: string; border: string; icon: React.ReactNode } {
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

  if (score >= 8) return {
    label: "OTTIMO",
    score,
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/50",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  };
  if (score >= 5) return {
    label: "BUONO",
    score,
    color: "text-lime-300",
    bg: "bg-lime-500/12",
    border: "border-lime-400/40",
    icon: <CheckCircle2 className="w-4 h-4 text-lime-400" />,
  };
  if (score >= 2) return {
    label: "DUBBIO",
    score,
    color: "text-amber-300",
    bg: "bg-amber-500/12",
    border: "border-amber-400/40",
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  };
  return {
    label: "SCARSO",
    score,
    color: "text-red-300",
    bg: "bg-red-500/12",
    border: "border-red-400/40",
    icon: <XCircle className="w-4 h-4 text-red-400" />,
  };
}

function getWeatherIconComponent(code: number, size: number = 28) {
  const props = { size, className: "drop-shadow-lg" };
  if (code === 0) return <Sun {...props} className="text-yellow-400 drop-shadow-lg" />;
  if (code <= 2) return <Sun {...props} className="text-yellow-300 drop-shadow-lg" />;
  if (code <= 3) return <Cloud {...props} className="text-slate-300 drop-shadow-lg" />;
  if (code >= 45 && code <= 48) return <Cloud {...props} className="text-slate-400 drop-shadow-lg" />;
  if (code >= 51 && code <= 57) return <CloudRain {...props} className="text-blue-300 drop-shadow-lg" />;
  if (code >= 61 && code <= 67) return <CloudRain {...props} className="text-blue-400 drop-shadow-lg" />;
  if (code >= 71 && code <= 77) return <CloudRain {...props} className="text-cyan-300 drop-shadow-lg" />;
  if (code >= 80 && code <= 82) return <CloudRain {...props} className="text-blue-400 drop-shadow-lg" />;
  if (code >= 95) return <CloudLightning {...props} className="text-purple-400 drop-shadow-lg" />;
  return <Cloud {...props} className="text-slate-300 drop-shadow-lg" />;
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
    <div className="bg-gradient-to-b from-slate-900/95 via-slate-800/95 to-slate-900/90 backdrop-blur-md rounded-2xl border-2 border-emerald-500/20 p-4 h-[calc(100vh-180px)] overflow-hidden shadow-xl shadow-emerald-500/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-800/60 to-emerald-700/30 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Navigation className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-200 tracking-tight">
              DECOLLI
            </h2>
            <p className="text-[10px] text-emerald-300/60 font-medium tracking-wider">
              PIEMONTE · {decolli.length} SITI
            </p>
          </div>
        </div>
        {rating && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${rating.bg} ${rating.border}`}>
            {rating.icon}
            <span className={`text-[11px] font-extrabold tracking-wider ${rating.color}`}>
              {rating.label}
            </span>
          </div>
        )}
      </div>

      {/* Lista scrollabile */}
      <div className="overflow-y-auto h-[calc(100%-52px)] space-y-2.5 pr-1.5">
        {decolli.map((d, i) => {
          const isSelected = d.id === selectedId;
          const localRating = currentData && isSelected ? rating : null;

          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              style={{ animationDelay: `${i * 0.06}s` }}
              className={`w-full text-left rounded-xl px-4 py-4 transition-all duration-300 border-2 animate-fade-in-up opacity-0 relative overflow-hidden ${
                isSelected
                  ? "bg-gradient-to-r from-emerald-900/60 via-emerald-800/40 to-amber-900/20 border-emerald-400/60 shadow-xl shadow-emerald-500/20 scale-[1.03]"
                  : "bg-slate-800/60 border-slate-600/50 hover:bg-slate-700/60 hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/10"
              }`}
            >
              {/* Glow se selezionato */}
              {isSelected && (
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
              )}

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex-1 min-w-0">
                  {/* Nome + esposizione + quota in una riga */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-base font-extrabold tracking-tight truncate ${
                      isSelected ? "text-white drop-shadow" : "text-emerald-100"
                    }`}>
                      {d.name.toUpperCase()}
                    </span>
                    {isSelected && (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-twinkle shrink-0" />
                    )}
                  </div>

                  {/* Dettagli in riga compatta */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="flex items-center gap-1 text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate max-w-[100px]">{d.valley}</span>
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40">
                      <Compass className="w-3 h-3 text-sky-400 shrink-0" />
                      {d.exposure}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40">
                      <Mountain className="w-3 h-3 text-amber-400 shrink-0" />
                      {d.alt}m
                    </span>
                  </div>
                </div>

                {/* Voto a semaforo + meteo */}
                {isSelected && currentData && (
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 shadow-lg ${localRating?.bg} ${localRating?.border}`}>
                      {getWeatherIconComponent(currentData.weatherCode || 0, 22)}
                    </div>
                    <span className={`text-lg font-black mt-0.5 tabular-nums ${localRating?.color}`}>
                      {localRating?.score}/10
                    </span>
                  </div>
                )}
              </div>

              {/* Meteo bar in basso se selezionato */}
              {isSelected && currentData && (
                <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-white tabular-nums drop-shadow">
                      {Math.round(currentData.temperature)}°
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Wind className="w-3.5 h-3.5 text-sky-400" />
                      <span className="font-bold tabular-nums">{Math.round(currentData.windSpeed)}</span>
                      <span className="text-slate-500">km/h</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span>{currentData.humidity}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-700/40">
                    <span className="text-[10px] text-slate-400">VOLO</span>
                    <span className={`text-[11px] font-extrabold ${localRating?.color}`}>
                      {localRating?.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Stato caricamento */}
              {!currentData && isSelected && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Aggiornamento...</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}