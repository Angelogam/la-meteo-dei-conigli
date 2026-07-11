"use client";

import React from "react";
import { AlertTriangle, AlertCircle, CheckCircle, CloudRain, Zap, Sun, Wind } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface AlertVoloProps {
  weather: HourData | undefined;
}

const AlertVolo = ({ weather }: AlertVoloProps) => {
  if (!weather) return null;

  // Condizioni pericolose
  const isRaining = weather.precipitation && weather.precipitation > 0.5;
  const isStorm = weather.weatherCode >= 95 && weather.weatherCode <= 99;
  const isDrizzle = weather.weatherCode >= 80 && weather.weatherCode <= 82;
  const isThunder = weather.weatherCode >= 95;
  const isFog = weather.weatherCode >= 45 && weather.weatherCode <= 48;
  const strongWind = weather.windSpeed > 40;
  const gustyWind = (weather.windGust || 0) > 55;

  const hasWarning = isRaining || isStorm || isDrizzle || isThunder || isFog || strongWind || gustyWind;

  if (hasWarning) {
    let icon = <AlertTriangle className="w-5 h-5 text-red-400" />;
    let title = "Pericolo";
    let description = "Condizioni avverse";
    let bgColor = "bg-red-900/50 border-red-500/50";
    let textColor = "text-red-200";

    if (isStorm || isThunder) {
      icon = <Zap className="w-5 h-5 text-yellow-400" />;
      title = "Temporale";
      description = "Pericoloso - non volare";
      bgColor = "bg-yellow-900/50 border-yellow-500/50";
      textColor = "text-yellow-200";
    } else if (isRaining || isDrizzle) {
      icon = <CloudRain className="w-5 h-5 text-blue-400" />;
      title = "Pioggia";
      description = "Aliante a rischio";
      bgColor = "bg-blue-900/50 border-blue-500/50";
      textColor = "text-blue-200";
    } else if (strongWind || gustyWind) {
      icon = <Wind className="w-5 h-5 text-orange-400" />;
      title = "Vento forte";
      description = "Raffiche pericolose";
      bgColor = "bg-orange-900/50 border-orange-500/50";
      textColor = "text-orange-200";
    } else if (isFog) {
      icon = <AlertCircle className="w-5 h-5 text-slate-400" />;
      title = "Nebbia";
      description = "Visibilità ridotta";
      bgColor = "bg-slate-800/80 border-slate-500/50";
      textColor = "text-slate-200";
    }

    return (
      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${bgColor} mt-1`}>
        {icon}
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold ${textColor} truncate`}>{title}</p>
          <p className={`text-[10px] ${textColor}/80 truncate`}>{description}</p>
        </div>
      </div>
    );
  }

  // Condizioni buone per volare
  const isOptimal = weather.windSpeed >= 8 && weather.windSpeed <= 30 && weather.cloudCover <= 40 && !isRaining && !isStorm && !isFog && !strongWind;
  const isGood = weather.windSpeed >= 5 && weather.windSpeed <= 35 && weather.cloudCover <= 60 && !isRaining && !isStorm;

  if (isOptimal) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-green-500/50 bg-green-900/40 mt-1">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-green-200 truncate">Si vola! 🪂</p>
          <p className="text-[10px] text-green-200/80 truncate">Condizioni ottimali</p>
        </div>
      </div>
    );
  }

  if (isGood) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-900/30 mt-1">
        <Sun className="w-5 h-5 text-emerald-400" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-emerald-200 truncate">Si vola</p>
          <p className="text-[10px] text-emerald-200/70 truncate">Condizioni decenti</p>
        </div>
      </div>
    );
  }

  // Condizioni incerte
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-900/20 mt-1">
      <AlertCircle className="w-5 h-5 text-yellow-400" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-yellow-200 truncate">Cautela</p>
        <p className="text-[10px] text-yellow-200/70 truncate">Valuta bene</p>
      </div>
    </div>
  );
};

export default AlertVolo;