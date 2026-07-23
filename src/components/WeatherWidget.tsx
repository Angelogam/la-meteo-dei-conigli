"use client";

import React from "react";
import { Thermometer, Wind, CloudSun, Droplets, Eye, Gauge, Navigation, Cloud } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface WeatherWidgetProps {
  data: HourData | null;
  altitude: number;
  siteName: string;
}

export default function WeatherWidget({ data, altitude, siteName }: WeatherWidgetProps) {
  if (!data) return null;

  const getWeatherIcon = (code: number, isDay: boolean): string => {
    if (code === 0) return isDay ? "☀️" : "🌙";
    if (code <= 2) return isDay ? "🌤️" : "🌤️";
    if (code <= 3) return "☁️";
    if (code <= 48) return "🌫️";
    if (code <= 57) return "🌦️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "❄️";
    if (code <= 82) return "🌦️";
    if (code >= 95) return "⛈️";
    return "☀️";
  };

  const getDir = (deg: number): string => {
    if (deg == null) return "—";
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return dirs[Math.round(deg / 22.5) % 16];
  };

  const now = new Date();
  const isDay = now.getHours() >= 6 && now.getHours() <= 20;
  const weatherIcon = getWeatherIcon(data.weatherCode, isDay);

  const items = [
    { icon: <Thermometer className="w-4 h-4 text-orange-400" />, label: "Temperatura", value: `${Math.round(data.temperature)}°C`, sub: `Percepita ${Math.round(data.feelsLike)}°C` },
    { icon: <Thermometer className="w-4 h-4 text-blue-400" />, label: "Punto rugiada", value: `${Math.round(data.dewPoint)}°C`, sub: `Umidità ${data.humidity}%` },
    { icon: <Wind className="w-4 h-4 text-cyan-400" />, label: "Vento", value: `${Math.round(data.windSpeed)} km/h`, sub: `Raffiche ${Math.round(data.windGusts || data.windSpeed * 1.4)} km/h` },
    { icon: <Navigation className="w-4 h-4 text-sky-400" />, label: "Direzione", value: getDir(data.windDir), sub: `${Math.round(data.windDir)}°` },
    { icon: <Cloud className="w-4 h-4 text-slate-400" />, label: "Nuvolosità", value: `${data.cloudCover}%`, sub: data.cloudCover < 30 ? "Sereno" : data.cloudCover < 60 ? "Parzialmente" : "Coperto" },
    { icon: <Droplets className="w-4 h-4 text-blue-400" />, label: "Precipitazioni", value: data.precipitation > 0 ? `${data.precipitation.toFixed(1)} mm` : "0 mm", sub: data.precipitation > 0 ? "Pioggia in corso" : "Nessuna" },
    { icon: <Eye className="w-4 h-4 text-emerald-400" />, label: "Visibilità", value: data.visibility ? `${Math.round(data.visibility / 1000)} km` : "—", sub: "" },
    { icon: <Gauge className="w-4 h-4 text-purple-400" />, label: "Pressione", value: `${Math.round(data.pressure)} hPa`, sub: data.pressure > 1020 ? "Alta" : data.pressure < 1010 ? "Bassa" : "Normale" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/70 via-slate-900/50 to-slate-800/30 border border-slate-700/40 shadow-2xl backdrop-blur-xl">
      {/* Brilla effetto glass */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative px-5 py-4 border-b border-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl animate-float">{weatherIcon}</div>
            <div>
              <h3 className="text-sm font-bold text-white">{siteName}</h3>
              <p className="text-[10px] text-slate-500">{altitude}m slm</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-white tabular-nums">
              {Math.round(data.temperature)}°
            </div>
            <div className="text-[10px] text-slate-500">
              Percepita {Math.round(data.feelsLike)}°
            </div>
          </div>
        </div>
      </div>

      {/* Griglia dati */}
      <div className="relative p-4 grid grid-cols-2 gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-slate-900/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/20 hover:border-slate-600/40 transition-all hover:bg-slate-800/40"
          >
            <div className="flex items-center gap-1.5 mb-1">
              {item.icon}
              <span className="text-[10px] text-slate-500 font-medium">{item.label}</span>
            </div>
            <div className="text-sm font-bold text-white">{item.value}</div>
            {item.sub && <div className="text-[9px] text-slate-500 mt-0.5">{item.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}