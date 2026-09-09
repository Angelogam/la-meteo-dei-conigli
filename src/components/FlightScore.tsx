"use client";

import React from "react";
import {
  TrendingUp,
  Calendar,
  CloudRain,
  CloudLightning,
  Clock,
  MapPin,
  Sun,
  Cloud,
  Wind,
} from "lucide-react";

interface FlightScoreProps {
  score: number;
  label: string;
  bestHour: number;
  bestRateo: number;
  oreAttive: number;
  totaleOre: number;
  thermalLabel: string;
  dayLabel?: string;
  siteName?: string;
  rainHours?: number[];
  thunderstormHours?: number[];
  fogHours?: number[];
  lightRainHours?: number[];
  cloudCover?: number;
  windSpeed?: number;
  sunHours?: number[];
  // Nuovi indici
  waveIndex?: "forte" | "medio" | "debole" | "assente";
  waveDiffDeg?: number;
  turbulenceIndex?: "bassa" | "moderata" | "alta";
  gustRatio?: number;
  flightWindow?: string;
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
  siteName,
  rainHours = [],
  thunderstormHours = [],
  fogHours = [],
  lightRainHours = [],
  cloudCover,
  windSpeed,
  sunHours = [],
  waveIndex = "medio",
  waveDiffDeg,
  turbulenceIndex = "moderata",
  gustRatio,
  flightWindow,
}: FlightScoreProps) {
  const isRaining = rainHours.length > 0;
  const hasThunderstorm = thunderstormHours.length > 0;
  const hasBadWeather = isRaining || hasThunderstorm;

  const displayScore = hasBadWeather ? 0 : score;
  const displayLabel = hasThunderstorm
    ? "Temporale"
    : isRaining
    ? "Pioggia"
    : label;

  const hasFog = fogHours.length > 0;
  const hasLightRain = lightRainHours.length > 0;
  const isCloudy = cloudCover !== undefined && cloudCover >= 40;
  const isWindy = windSpeed !== undefined && windSpeed > 30;
  const isSunny = sunHours.length > 0 && !hasBadWeather;

  return (
    <div className="card bg-slate-800/40 border border-slate-700/50 p-4 relative overflow-hidden rounded-2xl">
      {/* Banner allerta maltempo */}
      {hasBadWeather && (
        <div className="absolute top-0 left-0 w-full bg-red-950/80 backdrop-blur-sm z-10 border-b border-red-500/40">
          <div className="flex items-center justify-center gap-2 py-1.5 px-3">
            {hasThunderstorm ? (
              <CloudLightning className="w-4 h-4 text-purple-300 animate-pulse" />
            ) : (
              <CloudRain className="w-4 h-4 text-rose-300" />
            )}
            <span className="text-xs font-bold text-rose-200 tracking-wide">
              {hasThunderstorm
                ? `Temporali previsti alle ore: ${thunderstormHours
                    .map((h) => String(h).padStart(2, "0"))
                    .join(", ")}:00`
                : `Pioggia prevista alle ore: ${rainHours
                    .map((h) => String(h).padStart(2, "0"))
                    .join(", ")}:00`}
            </span>
          </div>
        </div>
      )}

      <div className={hasBadWeather ? "pt-7" : ""}>
        {/* Intestazione con nome decollo e giorno */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {siteName && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-300 bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <MapPin className="w-3.5 h-3.5" />
                {siteName}
              </span>
            )}
            {dayLabel && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {dayLabel}
              </span>
            )}
          </div>
        </div>

        {/* Punteggio + Badge */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
              Condizioni Volo
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span
              className={`text-5xl font-extrabold tabular-nums transition-all ${
                displayScore === 0
                  ? "text-red-400"
                  : displayScore >= 8
                  ? "text-emerald-400"
                  : displayScore >= 6
                  ? "text-lime-400"
                  : displayScore >= 4
                  ? "text-amber-400"
                  : "text-orange-400"
              }`}
            >
              {displayScore}
            </span>
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full border ${
                displayScore === 0
                  ? "bg-red-900/40 text-red-300 border-red-500/50"
                  : displayScore >= 8
                  ? "bg-emerald-900/40 text-emerald-300 border-emerald-400/40"
                  : displayScore >= 6
                  ? "bg-lime-900/40 text-lime-300 border-lime-400/40"
                  : displayScore >= 4
                  ? "bg-amber-900/40 text-amber-300 border-amber-400/40"
                  : "bg-orange-900/40 text-orange-300 border-orange-400/40"
              }`}
            >
              {displayLabel}
            </span>
          </div>
        </div>

        {/* Griglia dettagli */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div className="bg-slate-900/60 rounded-xl p-2.5 flex items-center gap-2 border border-slate-700/30">
            <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300 truncate">
              {hasBadWeather ? "Termiche inibite" : thermalLabel}
            </span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-2.5 flex items-center gap-2 border border-slate-700/30">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-300 truncate">
              {hasBadWeather
                ? "Nessuna finestra utile"
                : flightWindow || `Miglior ora: ${String(bestHour).padStart(2, "0")}:00 (${bestRateo.toFixed(1)} m/s)`}
            </span>
          </div>
        </div>

        {/* IndiciWave + Turbolenza */}
        {!hasBadWeather && (
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-slate-900/60 rounded-xl p-2 flex items-center justify-between border border-slate-700/30">
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="text-slate-400 text-[10px]">Wave</span>
              </div>
              <span className={`font-bold tabular-nums ${
                waveIndex === "forte" ? "text-violet-300" :
                waveIndex === "medio" ? "text-sky-300" :
                waveIndex === "debole" ? "text-amber-300" : "text-slate-500"
              }`}>
                {waveDiffDeg != null ? `${waveDiffDeg}°` : "—"}
              </span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-2 flex items-center justify-between border border-slate-700/30">
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-slate-400 text-[10px]">Turbolenza</span>
              </div>
              <span className={`font-bold text-[11px] ${
                turbulenceIndex === "bassa" ? "text-emerald-300" :
                turbulenceIndex === "moderata" ? "text-amber-300" : "text-rose-300"
              }`}>
                {gustRatio != null ? `${Math.round(gustRatio * 100)}%` : "—"}
              </span>
            </div>
          </div>
        )}

        {/* Icone condizioni meteo dinamiche */}
        {(isSunny || isCloudy || hasFog || hasLightRain || isRaining || hasThunderstorm || isWindy) && (
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-700/30 flex-wrap">
            {isSunny && (
              <div className="flex flex-col items-center gap-0.5 group relative cursor-default">
                <Sun className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-[9px] text-slate-500 mt-0.5">Sole</span>
              </div>
            )}

            {isCloudy && !hasFog && (
              <div className="flex flex-col items-center gap-0.5 group relative cursor-default">
                <Cloud className="w-5 h-5 text-slate-400" />
                <span className="text-[9px] text-slate-500 mt-0.5">
                  {cloudCover !== undefined && cloudCover < 70
                    ? "Medio nuvoloso"
                    : "Nuvole"}
                </span>
              </div>
            )}

            {hasFog && (
              <div className="flex flex-col items-center gap-0.5 group relative cursor-default">
                <Cloud className="w-5 h-5 text-slate-300 opacity-60" />
                <span className="text-[9px] text-slate-500 mt-0.5">Nebbia</span>
              </div>
            )}

            {hasLightRain && (
              <div className="flex flex-col items-center gap-0.5 group relative cursor-default">
                <CloudRain className="w-5 h-5 text-blue-400 opacity-60" />
                <span className="text-[9px] text-slate-500 mt-0.5">Pioggia leggera</span>
              </div>
            )}

            {isRaining && !hasLightRain && (
              <div className="flex flex-col items-center gap-0.5 group relative cursor-default">
                <CloudRain className="w-5 h-5 text-cyan-400" />
                <span className="text-[9px] text-slate-500 mt-0.5">Pioggia</span>
              </div>
            )}

            {hasThunderstorm && (
              <div className="flex flex-col items-center gap-0.5 group relative cursor-default">
                <CloudLightning className="w-5 h-5 text-purple-400 animate-pulse" />
                <span className="text-[9px] text-slate-500 mt-0.5">Temporali</span>
              </div>
            )}

            {isWindy && (
              <div className="flex flex-col items-center gap-0.5 group relative cursor-default">
                <Wind
                  className="w-5 h-5 text-cyan-300"
                  style={{
                    animation:
                      windSpeed > 50 ? "wind-bounce 0.8s ease-in-out infinite" : undefined,
                  }}
                />
                <span className="text-[9px] text-slate-500 mt-0.5">
                  Vento {windSpeed} km/h
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes wind-bounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}