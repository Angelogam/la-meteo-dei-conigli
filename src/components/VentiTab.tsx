"use client";

import React from "react";
import { Wind, TrendingUp } from "lucide-react";

interface WindLevel {
  alt: number;
  speed: number;
  dir: number;
  dirName: string;
}

interface VentiTabProps {
  currentData: any;
  dayData: any[];
  windProfile: WindLevel[];
  hourlyData?: any[];
  targetHour?: number;
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

function buildProfileFromHourlyData(
  hourlyData: any[] | undefined,
  targetHour: number,
  fallbackProfile: WindLevel[],
  surfaceSpeed: number,
  surfaceDir: number,
): WindLevel[] {
  if (!hourlyData || hourlyData.length === 0) return fallbackProfile;
  const target = hourlyData.find(h => h.time?.getHours() === targetHour);
  if (!target) return fallbackProfile;
  const fixedAltitudes = [10, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
  const speed10m = target.windSpeed ?? surfaceSpeed;
  const dir10m = target.windDir ?? surfaceDir;
  return fixedAltitudes.map((alt) => {
    if (alt === 10) return { alt, speed: speed10m, dir: dir10m, dirName: getWindDirName(dir10m) };
    const ratio = Math.min(2.5, 1 + (alt / 2000) * 1.2);
    const speed = Math.round(speed10m * ratio);
    const rotazione = Math.round((alt / 2000) * 30);
    const dir = (dir10m + rotazione) % 360;
    return { alt, speed, dir, dirName: getWindDirName(dir) };
  });
}

export default function VentiTab({ currentData, dayData, windProfile, hourlyData, targetHour = 12 }: VentiTabProps) {
  if (!currentData) return null;

  const profileFromHourly = buildProfileFromHourlyData(hourlyData, targetHour, windProfile, currentData.windSpeed, currentData.windDir);
  const realWindProfile = ((currentData.windProfile && currentData.windProfile.length > 0) ? currentData.windProfile : profileFromHourly)
    .map((level: any) => ({ alt: level.alt ?? level.height ?? 0, speed: level.speed ?? 0, dir: level.dir ?? 0, dirName: level.dirName ?? getWindDirName(level.dir ?? 0) }));

  const fixedAltitudes = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 10];
  const profileWithAltitudes = fixedAltitudes.map((alt) => {
    const matched = realWindProfile.find((l) => l.alt === alt);
    if (matched) return matched;
    const sorted = [...realWindProfile].sort((a, b) => Math.abs(a.alt - alt) - Math.abs(b.alt - alt));
    const nearest = sorted[0];
    if (nearest && Math.abs(nearest.alt - alt) <= 250) return { alt, speed: nearest.speed, dir: nearest.dir, dirName: nearest.dirName };
    return { alt, speed: 0, dir: 0, dirName: "-" };
  });

  const windCards = [
    { label: "Superficie (10m)", speed: profileFromHourly.find(l => l.alt === 10)?.speed ?? currentData.windSpeed, dir: profileFromHourly.find(l => l.alt === 10)?.dir ?? currentData.windDir, gust: currentData.windGust || currentData.windSpeed + 8 },
    { label: "Bassa (500m)", speed: profileFromHourly.find(l => l.alt === 500)?.speed ?? currentData.windSpeed * 1.5, dir: profileFromHourly.find(l => l.alt === 500)?.dir ?? currentData.windDir + 10, gust: null },
    { label: "Media (1000m)", speed: profileFromHourly.find(l => l.alt === 1000)?.speed ?? currentData.windSpeed * 2.0, dir: profileFromHourly.find(l => l.alt === 1000)?.dir ?? currentData.windDir + 20, gust: null },
    { label: "Alta (2000m)", speed: profileFromHourly.find(l => l.alt === 2000)?.speed ?? currentData.windSpeed * 2.8, dir: profileFromHourly.find(l => l.alt === 2000)?.dir ?? currentData.windDir + 35, gust: null },
    { label: "Molto alta (4000m)", speed: profileFromHourly.find(l => l.alt === 4000)?.speed ?? currentData.windSpeed * 3.5, dir: profileFromHourly.find(l => l.alt === 4000)?.dir ?? currentData.windDir + 45, gust: null },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
          <Wind className="w-5 h-5" /> Vento a diverse quote
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {windCards.map((w, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-sm text-slate-400 font-bold mb-2">{w.label}</div>
              <div className="text-xl font-bold text-white">{getWindArrow(w.dir)} {Math.round(w.speed)}</div>
              <div className="text-sm text-slate-400">{getWindDirName(w.dir)}</div>
              {w.gust && <div className="text-sm text-red-300 mt-1">Raff. {Math.round(w.gust)}</div>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Profilo vento verticale
        </h4>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-1">
          {profileWithAltitudes.map((level, idx) => {
            const maxSpeed = Math.max(...profileWithAltitudes.map(l => l.speed || 0), 1);
            const width = maxSpeed > 0 ? Math.min(100, (level.speed / maxSpeed) * 100) : 10;
            const barColor = width < 30 ? "bg-emerald-400" : width < 50 ? "bg-lime-400" : width < 70 ? "bg-amber-400" : width < 90 ? "bg-orange-400" : "bg-red-400";
            return (
              <div key={idx} className="grid grid-cols-[70px_1fr_80px] gap-3 items-center py-2">
                <span className="text-sm text-slate-300 font-bold">{level.alt}m</span>
                <div className="h-7 bg-slate-700/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full flex items-center justify-end pr-2 ${barColor}`} style={{ width: `${Math.max(width, 20)}%` }}>
                    <span className="text-sm text-white font-bold">{level.speed != null ? Math.round(level.speed) : "—"}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-300 text-center font-bold">{level.dir != null ? `${getWindArrow(level.dir)} ${getWindDirName(level.dir)}` : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}