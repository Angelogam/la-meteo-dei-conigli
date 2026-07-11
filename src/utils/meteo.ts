"use client";

import type { MeteoData, HourData, DailyData, WindProfile, ThermalData } from "@/types/meteo";
import { Cloud, CloudSun, CloudRain, CloudLightning, CloudSnow, CloudFog, Sun, CloudDrizzle } from "lucide-react";
import React from "react";

export function wic(code: number, emoji?: boolean): string | React.ReactNode {
  if (emoji) {
    // Returns emoji
    if (code === 0 || code === 1) return "☀️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 55) return "🌦️";
    if (code >= 56 && code <= 57) return "🌧️";
    if (code >= 61 && code <= 65) return "🌧️";
    if (code >= 66 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 75) return "🌨️";
    if (code === 77) return "🌨️";
    if (code >= 80 && code <= 82) return "🌦️";
    if (code >= 85 && code <= 86) return "🌨️";
    if (code >= 95 && code <= 99) return "⛈️";
    return "❓";
  }

  // Returns lucide icon component for interactive/animated display
  if (code === 0 || code === 1) return React.createElement(Sun, { className: "w-8 h-8 text-yellow-400 drop-shadow-lg animate-pulse" });
  if (code === 2) return React.createElement(CloudSun, { className: "w-8 h-8 text-yellow-400 drop-shadow-lg" });
  if (code === 3) return React.createElement(Cloud, { className: "w-8 h-8 text-slate-200 drop-shadow-lg" });
  if (code >= 45 && code <= 48) return React.createElement(CloudFog, { className: "w-8 h-8 text-slate-300 drop-shadow-lg animate-pulse" });
  if (code >= 51 && code <= 55) return React.createElement(CloudDrizzle, { className: "w-8 h-8 text-blue-300 drop-shadow-lg animate-bounce" });
  if (code >= 56 && code <= 57) return React.createElement(CloudRain, { className: "w-8 h-8 text-blue-300 drop-shadow-lg" });
  if (code >= 61 && code <= 65) return React.createElement(CloudRain, { className: "w-8 h-8 text-blue-400 drop-shadow-lg animate-bounce" });
  if (code >= 66 && code <= 67) return React.createElement(CloudRain, { className: "w-8 h-8 text-blue-400 drop-shadow-lg animate-bounce" });
  if (code >= 71 && code <= 75) return React.createElement(CloudSnow, { className: "w-8 h-8 text-blue-200 drop-shadow-lg animate-pulse" });
  if (code === 77) return React.createElement(CloudSnow, { className: "w-8 h-8 text-blue-200 drop-shadow-lg" });
  if (code >= 80 && code <= 82) return React.createElement(CloudRain, { className: "w-8 h-8 text-blue-400 drop-shadow-lg animate-bounce" });
  if (code >= 85 && code <= 86) return React.createElement(CloudSnow, { className: "w-8 h-8 text-blue-200 drop-shadow-lg animate-pulse" });
  if (code >= 95 && code <= 99) return React.createElement(CloudLightning, { className: "w-8 h-8 text-yellow-400 drop-shadow-lg animate-pulse" });
  return React.createElement(Sun, { className: "w-8 h-8 text-yellow-400 drop-shadow-lg" });
}