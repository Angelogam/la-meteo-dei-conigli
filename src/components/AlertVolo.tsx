"use client";

import React from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  CloudRain,
  Zap,
  Sun,
  Wind,
  Cloud,
  Thermometer,
  Droplets,
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import { getVoloStatus } from "@/utils/volo";

interface AlertVoloProps {
  weather: HourData | undefined;
}

const AlertVolo = ({ weather }: AlertVoloProps) => {
  if (!weather) return null;

  const volo = getVoloStatus(weather);

  // Mappa icone per ogni stato
  const statusIcon = (status: string, size: number = 24) => {
    switch (status) {
      case "ottimo":
        return <CheckCircle size={size} className="text-green-400" />;
      case "buono":
        return <CheckCircle size={size} className="text-emerald-400" />;
      case "discreto":
        return <AlertCircle size={size} className="text-amber-400" />;
      case "rischioso":
        return <AlertTriangle size={size} className="text-orange-400" />;
      case "calma":
        return <Wind size={size} className="text-gray-400" />;
      case "temporale":
        return <Zap size={size} className="text-purple-400" />;
      case "pioggia":
        return <CloudRain size={size} className="text-blue-400" />;
      default:
        return <AlertTriangle size={size} className="text-red-400" />;
    }
  };

  // Mappa gradienti di sfondo per ogni stato
  const statusBg = (status: string) => {
    switch (status) {
      case "ottimo":
        return "bg-gradient-to-r from-green-900/60 to-green-800/40 border-green-500/50";
      case "buono":
        return "bg-gradient-to-r from-emerald-900/50 to-emerald-800/30 border-emerald-500/40";
      case "discreto":
        return "bg-gradient-to-r from-amber-900/50 to-amber-800/30 border-amber-500/40";
      case "rischioso":
        return "bg-gradient-to-r from-orange-900/60 to-orange-800/40 border-orange-500/50";
      case "calma":
        return "bg-gradient-to-r from-gray-800/60 to-gray-700/40 border-gray-500/40";
      case "temporale":
        return "bg-gradient-to-r from-purple-900/70 to-purple-800/50 border-purple-500/60";
      case "pioggia":
        return "bg-gradient-to-r from-blue-900/60 to-blue-800/40 border-blue-500/50";
      default:
        return "bg-gradient-to-r from-red-900/60 to-red-800/40 border-red-500/50";
    }
  };

  // Mappa testi descrittivi
  const statusLabel = (status: string) => {
    switch (status) {
      case "ottimo":
        return "Si vola!";
      case "buono":
        return "Si vola";
      case "discreto":
        return "Volo a rischio";
      case "rischioso":
        return "Pericolo";
      case "calma":
        return "Troppo calma";
      case "temporale":
        return "Temporale";
      case "pioggia":
        return "Pioggia";
      default:
        return "Non volabile";
    }
  };

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border-2 ${statusBg(volo.status)} mt-2 shadow-sm transition-all duration-300 hover:scale-[1.02]`}
    >
      <div className="shrink-0 mt-0.5">{statusIcon(volo.status)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-white tracking-tight">
          {statusLabel(volo.status)}
        </p>
        <p className="text-[11px] font-medium text-white/80 mt-0.5 leading-tight">
          {volo.description}
        </p>
        {/* Dettaglio aggiuntivo */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5 pt-1.5 border-t border-white/10">
          <div className="flex items-center gap-1 text-[10px] text-white/70">
            <Wind className="w-3 h-3" />
            <span>{Math.round(weather.windSpeed)} km/h</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/70">
            <Cloud className="w-3 h-3" />
            <span>{weather.cloudCover}%</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/70">
            <Thermometer className="w-3 h-3" />
            <span>{Math.round(weather.temperature)}°C</span>
          </div>
          {weather.precipitation > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-blue-300">
              <Droplets className="w-3 h-3" />
              <span>{weather.precipitation.toFixed(1)} mm</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertVolo;