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
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  TrendingUp,
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
): { label: string; score: number } {
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

  score = Math.max(0, Math.min(10, score));

  if (score >= 7) return { label: "OTTIMO", score };
  if (score >= 5) return { label: "BUONO", score };
  if (score >= 3) return { label: "DUBBIO", score };
  return { label: "SCARSO", score };
}

function getWeatherIconComponent(code: number) {
  const props = { className: "drop-shadow-xl", strokeWidth: 1.5 };
  if (code === 0) return <Sun size={36} {...props} className="text-yellow-300 drop-shadow-xl" />;
  if (code <= 2) return <Sun size={36} {...props} className="text-yellow-200 drop-shadow-xl" />;
  if (code <= 3) return <Cloud size={36} {...props} className="text-slate-200 drop-shadow-xl" />;
  if (code >= 45 && code <= 48) return <Cloud size={36} {...props} className="text-slate-300 drop-shadow-xl" />;
  if (code >= 51 && code <= 57) return <CloudRain size={36} {...props} className="text-blue-200 drop-shadow-xl" />;
  if (code >= 61 && code <= 67) return <CloudRain size={36} {...props} className="text-blue-300 drop-shadow-xl" />;
  if (code >= 80 && code <= 82) return <CloudRain size={36} {...props} className="text-blue-200 drop-shadow-xl" />;
  if (code >= 95) return <CloudLightning size={36} {...props} className="text-purple-200 drop-shadow-xl" />;
  return <Cloud size={36} {...props} className="text-slate-200 drop-shadow-xl" />;
}

interface ScoreRingProps {
  score: number;
  size?: number;
}

function ScoreRing({ score, size = 52 }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(10, score));
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (clamped / 10) * circumference;

  let strokeColor = "#ef4444"; // rosso
  let bgColor = "rgba(239, 68, 68, 0.15)";
  let textColor = "text-red-300";

  if (clamped >= 7) {
    strokeColor = "#22c55e";
    bgColor = "rgba(34, 197, 94, 0.15)";
    textColor = "text-emerald-300";
  } else if (clamped >= 5) {
    strokeColor = "#84cc16";
    bgColor = "rgba(132, 204, 22, 0.15)";
    textColor = "text-lime-300";
  } else if (clamped >= 3) {
    strokeColor = "#eab308";
    bgColor = "rgba(234, 179, 8, 0.15)";
    textColor = "text-amber-300";
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="22" fill={bgColor} stroke={strokeColor} strokeWidth="3" strokeOpacity="0.2" />
        <circle
          cx="26" cy="26" r="22"
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-black tabular-nums drop-shadow-lg ${textColor}`}>
          {clamped}
        </span>
      </div>
    </div>
  );
}

export default function DecolloList({
  decolli,
  selectedId,
  onSelect,
  currentData,
}: DecolloListProps) {
  const rating = currentData ? getFlightRating(
    currentData.temperature,
    currentData.windSpeed,
    currentData.cloudCover,
    currentData.precipitation
  ) : null;

  return (
    <div className="rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-emerald-400/20 bg-gradient-to-r from-emerald-800/30 to-amber-800/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-amber-500/20 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-400/20">
              <Navigation className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight drop-shadow-lg">
                🪂 DECOLLI
              </h2>
              <p className="text-[11px] text-emerald-200/60 font-bold tracking-widest uppercase">
                Piemonte · {decolli.length} siti
              </p>
            </div>
          </div>
          {rating && (
            <div className={`px-4 py-2 rounded-2xl border-2 font-extrabold text-sm tracking-wider shadow-lg ${
              rating.score >= 7
                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-emerald-400/20"
                : rating.score >= 5
                ? "bg-lime-500/20 border-lime-400/50 text-lime-200 shadow-lime-400/20"
                : rating.score >= 3
                ? "bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-amber-400/20"
                : "bg-red-500/20 border-red-400/50 text-red-200 shadow-red-400/20"
            }`}>
              {rating.label}
            </div>
          )}
        </div>
      </div>

      {/* Lista decolli */}
      <div className="overflow-y-auto h-[calc(100%-76px)] space-y-3 p-3">
        {decolli.map((d, i) => {
          const isSelected = d.id === selectedId;
          const localRating = currentData && isSelected ? rating : null;

          let bgGrad = "from-slate-800/80 to-slate-700/40";
          let borderColor = "border-slate-600/40";
          let glowColor = "";

          if (isSelected) {
            if (localRating && localRating.score >= 7) {
              bgGrad = "from-emerald-800/60 via-emerald-700/30 to-amber-700/20";
              borderColor = "border-emerald-400/60";
              glowColor = "shadow-emerald-400/20";
            } else if (localRating && localRating.score >= 5) {
              bgGrad = "from-lime-800/60 via-lime-700/30 to-amber-700/20";
              borderColor = "border-lime-400/60";
              glowColor = "shadow-lime-400/20";
            } else if (localRating && localRating.score >= 3) {
              bgGrad = "from-amber-800/60 via-amber-700/30 to-red-700/20";
              borderColor = "border-amber-400/60";
              glowColor = "shadow-amber-400/20";
            } else {
              bgGrad = "from-red-800/60 via-red-700/30 to-rose-700/20";
              borderColor = "border-red-400/60";
              glowColor = "shadow-red-400/20";
            }
          }

          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`
                w-full text-left rounded-2xl px-5 py-4 transition-all duration-300 border-2
                bg-gradient-to-br ${bgGrad} ${borderColor} ${glowColor}
                ${isSelected ? `shadow-xl ${glowColor} scale-[1.02]` : "hover:scale-[1.01] hover:border-emerald-400/40 hover:shadow-lg hover:shadow-emerald-400/10"}
                relative overflow-hidden
              `}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Glow di sfondo se selezionato */}
              {isSelected && (
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none"
                  style={{
                    background: localRating && localRating.score >= 7
                      ? "radial-gradient(circle, #22c55e, transparent)"
                      : localRating && localRating.score >= 5
                      ? "radial-gradient(circle, #84cc16, transparent)"
                      : localRating && localRating.score >= 3
                      ? "radial-gradient(circle, #eab308, transparent)"
                      : "radial-gradient(circle, #ef4444, transparent)"
                  }}
                />
              )}

              {/* Riga superiore: nome + voto cerchio + icona meteo */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-lg font-black tracking-tight drop-shadow-md ${
                      isSelected ? "text-white" : "text-slate-100"
                    }`}>
                      {d.name.toUpperCase()}
                    </span>
                    {isSelected && (
                      <Sparkles className="w-4 h-4 text-emerald-300 animate-twinkle" />
                    )}
                  </div>

                  {/* Badge valle + esposizione + quota */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-600/40 text-xs font-semibold text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span className="truncate max-w-[90px]">{d.valley}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-600/40 text-xs font-semibold text-sky-300">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      {d.exposure}
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-600/40 text-xs font-semibold text-amber-300">
                      <Mountain className="w-3.5 h-3.5 text-amber-400" />
                      {d.alt}m
                    </span>
                  </div>
                </div>

                {/* Voto + icona meteo solo per selezionato */}
                {isSelected && currentData && localRating && (
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-center">
                      {getWeatherIconComponent(currentData.weatherCode || 0)}
                    </div>
                    <ScoreRing score={localRating.score} size={56} />
                  </div>
                )}
              </div>

              {/* Barra meteo in basso per selezionato */}
              {isSelected && currentData && (
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    {/* Temperatura grossa */}
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-black text-white drop-shadow-lg tabular-nums">
                        {Math.round(currentData.temperature)}
                      </span>
                      <span className="text-lg font-bold text-amber-300">°C</span>
                    </div>
                    {/* Vento */}
                    <div className="flex items-center gap-1.5">
                      <Wind className="w-5 h-5 text-sky-300" />
                      <span className="text-lg font-black text-sky-200 tabular-nums drop-shadow">
                        {Math.round(currentData.windSpeed)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">km/h</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/70 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-extrabold text-white tracking-wider">
                      {localRating.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Stato caricamento */}
              {!currentData && isSelected && !localRating && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 relative z-10">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium">Caricamento dati...</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}