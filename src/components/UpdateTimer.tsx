"use client";

import React from "react";
import { RefreshCw, CloudSun } from "lucide-react";

interface UpdateTimerProps {
  lastUpdate: Date | null;
  countdown: number;
I need to continue creating the missing files with proper exports. Let me create them systematically.

<dyad-write path="src/utils/volo.ts">
"use client";

import type { HourData } from "@/types/meteo";

export interface VoloStatus {
  level: "info" | "warning" | "danger" | "success";
  message: string;
  icon: string;
}

export function getVoloStatus(data: HourData): VoloStatus {
  const windSpeed = data.windSpeed ?? 0;
  const windGusts = data.windGusts ?? 0;
  const weatherCode = data.weatherCode ?? 0;
  const precipitation = data.precipitation ?? 0;
  const cloudCover = data.cloudCover ?? 0;

  if (weatherCode >= 95) return { level: "danger", message: "⛈️ Temporale in corso", icon: "🚨" };
  if (precipitation > 2) return { level: "danger", message: "🌧️ Pioggia intensa", icon: "🚨" };
  if (windSpeed > 35) return { level: "danger", message: "💨 Vento fortissimo", icon: "🚨" };
  if (windGusts > 45) return { level: "danger", message: "💨 Raffiche pericolose", icon: "🚨" };

  if (windSpeed > 25) return { level: "warning", message: "⚠️ Vento forte", icon: "⚡" };
  if (windGusts > 30) return { level: "warning", message: "⚠️ Raffiche intense", icon: "⚡" };
  if (precipitation > 0.5) return { level: "warning", message: "⚠️ Pioggia debole", icon: "⚡" };
  if (cloudCover > 80) return { level: "warning", message: "⚠️ Cielo molto coperto", icon: "⚡" };
  if (windSpeed < 4) return { level: "warning", message: "⚠️ Vento troppo debole per volare", icon: "⚡" };

  if (windSpeed >= 5 && windSpeed <= 18 && cloudCover <= 40) {
    return { level: "success", message: "✅ Condizioni ottimali per volare!", icon: "🪂" };
  }

  return { level: "info", message: "ℹ️ Condizioni nella norma", icon: "🌤️" };
}

export function getWeatherIcon(code: number, isDay: number): string {
  const icons: Record<number, string> = {
    0: isDay ? "☀️" : "🌙",
    1: isDay ? "🌤️" : "🌤️",
    2: isDay ? "⛅" : "☁️",
    3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌦️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    71: "❄️", 73: "❄️", 75: "❄️",
    80: "🌧️", 81: "🌧️", 82: "🌧️",
    95: "⛈️", 96: "⛈️", 99: "⛈️",
  };
  return icons[code] || (isDay ? "☀️" : "🌙");
}

export function getWindDirection(deg: number): string {
  if (deg == null) return "--";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function getWindArrow(deg: number): string {
  if (deg == null) return "→";
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

export function getCloudCondition(cover: number): { text: string; icon: string; color: string } {
  if (cover < 20) return { text: "Sereno", icon: "☀️", color: "#ffd93d" };
  if (cover < 40) return { text: "Poco nuvoloso", icon: "🌤️", color: "#f9a825" };
  if (cover < 60) return { text: "Nuvoloso", icon: "☁️", color: "#90a4ae" };
  if (cover < 80) return { text: "Molto nuvoloso", icon: "☁️", color: "#78909c" };
  return { text: "Coperto", icon: "☁️", color: "#546e7a" };
}

export interface WindLevel {
  quota: number;
  speed: number;
  dir: number;
  dirName: string;
}

export function getWindProfile(
  surfaceWind: number,
  surfaceDir: number,
  realProfile?: { height: number; speed: number; dir: number }[]
): WindLevel[] {
  if (realProfile && realProfile.length > 0) {
    return realProfile.map((level) => ({
      quota: level.height,
      speed: level.speed,
      dir: level.dir,
      dirName: getWindDirection(level.dir),
    }));
  }

  const profile: WindLevel[] = [];
  const heights = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
  for (const alt of heights) {
    if (alt === 0) {
      profile.push({ alt: 10, speed: surfaceWind, dir: surfaceDir, dirName: getWindDirection(surfaceDir) });
      continue;
    }
    const factor = 1 + (alt / 1000) * 0.25;
    const speed = Math.min(surfaceWind * factor, surfaceWind * 3.5);
    const dirOffset = Math.min((alt / 1000) * 15, 45);
    const dir = (surfaceDir + dirOffset) % 360;
    profile.push({
      alt,
      speed: Math.round(speed * 10) / 10,
      dir: Math.round(dir),
      dirName: getWindDirection(dir),
    });
  }
  return profile;
}

export function getThermalStrength(temp: number, cloud: number, hum: number, thermalDelta: number): { label: string; color: string } {
  const score = (temp > 22 ? 2 : temp > 18 ? 1 : 0) +
    (cloud < 30 ? 2 : cloud < 50 ? 1 : 0) +
    (hum < 50 ? 1 : 0) +
    (thermalDelta > 10 ? 2 : thermalDelta > 6 ? 1 : 0);
  if (score >= 6) return { label: "Forte 🔥", color: "#ff1744" };
  if (score >= 4) return { label: "Media 💪", color: "#ff6d00" };
  if (score >= 1) return { label: "Debole 🌤️", color: "#ffd600" };
  return { label: "Assente ❄️", color: "#4fc3f7" };
}

export function getStabilityIndex(temp: number, hum: number, cloud: number): { label: string; color: string } {
  const cape = Math.max(0, (temp - 15) * 50 + (50 - hum) * 10 - cloud * 2);
  if (cape > 1500) return { label: "Instabile ⚠️", color: "#ff1744" };
  if (cape > 800) return { label: "Moderato 🌡️", color: "#ff9800" };
  if (cape > 300) return { label: "Stabile 🌤️", color: "#4caf50" };
  return { label: "Molto stabile ✅", color: "#4fc3f7" };
}

export function getWeatherDescription(code: number): string {
  if (code === 0 || code === 1) return "Sereno";
  if (code === 2) return "Poco nuvoloso";
  if (code === 3) return "Nuvoloso";
  if (code >= 45 && code <= 48) return "Nebbia";
  if (code >= 51 && code <= 57) return "Pioggerella";
  if (code >= 61 && code <= 67) return "Pioggia";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Rovesci";
  if (code >= 95) return "Temporali";
  return "N/D";
}

export function getCloudBase(temp: number, dewPoint: number, siteAlt: number): number {
  return Math.round((temp - dewPoint) * 120 + siteAlt);
}

export function getThermalPlafond(siteAlt: number, thermalDelta: number): number {
  return Math.round(siteAlt + (thermalDelta * 100));
}

export function getPressureGradient(dayData: any[]): string {
  const first = dayData[0]?.pressure;
  const last = dayData[dayData.length - 1]?.pressure;
  if (first == null || last == null) return "--";
  const diff = last - first;
  return diff > 0 ? "↑ +" + Math.round(diff) + " hPa" : diff < 0 ? "↓ " + Math.round(diff) + " hPa" : "→ Stabile";
}