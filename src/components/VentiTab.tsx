"use client";

import React, { useMemo } from "react";
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

/** Stima locale del profilo vento basata su velocità e direzione al suolo */
function estimateWindProfile(surfaceSpeed: number, surfaceDir: number): WindLevel[] {
  const altLevels = [10, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
  return altLevels.map(alt => {
    let speed: number, dir: number;
    if (alt === 10) {
      speed = surfaceSpeed;
      dir = surfaceDir;
    } else {
      const factor = 1 + (alt / 1000) * 0.35;
      speed = Math.round(Math.min(surfaceSpeed * factor, 60) * 10) / 10;
      dir = (surfaceDir + Math.round((alt / 1000) * 15)) % 360;
    }
    return { alt, speed, dir, dirName: getWindDirName(dir) };
  });
}

/** Estrae il profilo vento da currentData (reale o stimato) */
function extractWindProfile(currentData: any): WindLevel[] {
  // 1. Prova con dati reali da windProfile
  const rawWP = currentData?.windProfile;
  if (rawWP && Array.isArray(rawWP) && rawWP.length > 0) {
    return rawWP.map((l: any) => ({
      alt: l.height ?? l.alt ?? 0,
      speed: l.speed ?? 0,
      dir: l.dir ?? 0,
      dirName: getWindDirName(l.dir ?? 0),
    }));
  }

  // 2. Fallback: stima locale
  return estimateWindProfile(currentData?.windSpeed ?? 10, currentData?.windDir ?? 0);
}

/** Seleziona le 9 quote fisse per la visualizzazione verticale */
function getDisplayProfile(profile: WindLevel[]): WindLevel[] {
  const desiredAltitudes = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 10];
  return desiredAltitudes.map(alt => {
    const exact = profile.find(l => l.alt === alt);
    if (exact) return exact;
    // Trova il più vicino entro 250m
    const sorted = [...profile].sort((a, b) => Math.abs(a.alt - alt) - Math.abs(b.alt - alt));
    const nearest = sorted[0];
    if (nearest && Math.abs(nearest.alt - alt) <= 250) {
      return { ...nearest, alt };
    }
    // Stima per interpolazione
    const below = [...profile].filter(l => l.alt < alt).sort((a, b) => b.alt - a.alt)[0];
    const above = [...profile].filter(l => l.alt > alt).sort((a, b) => a.alt - b.alt)[0];
    if (below && above) {
      const ratio = (alt - below.alt) / (above.alt - below.alt);
      const speed = Math.round((below.speed + (above.speed - below.speed) * ratio) * 10) / 10;
      const dir = Math.round((below.dir + (above.dir - below.dir) * ratio)) % 360;
      return { alt, speed, dir, dirName: getWindDirName(dir) };
    }
    return { alt, speed: 0, dir: 0, dirName: "-" };
  });
}

export default function VentiTab({ currentData, dayData, hourlyData, targetHour = 12 }: VentiTabProps) {
  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento</p>
      </div>
    );
  }

  const windProfile = useMemo(() => extractWindProfile(currentData), [currentData]);
  const displayProfile = useMemo(() => getDisplayProfile(windProfile), [windProfile]);

  // Carte riassuntive per le 5 quote principali
  const summaryLevels = useMemo(() => {
    const findLevel = (alt: number) =>
      windProfile.find(l => l.alt === alt) ||
      extractWindProfile({
        windSpeed: currentData.windSpeed,
        windDir: currentData.windDir,
      }).find(l => l.alt === alt);
    
    return [
      { label: "Superficie (10m)", level: findLevel(10), gust: currentData.windGusts },
      { label: "Bassa (500m)", level: findLevel(500) },
      { label: "Media (1000m)", level: findLevel(1000) },
      { label: "Alta (2000m)", level: findLevel(2000) },
      { label: "Molto alta (4000m)", level: findLevel(4000) },
    ];
  }, [windProfile, currentData]);

  return (
    <div className="space-y-4">
      {/* Carte riassuntive vento in quota */}
      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
          <Wind className="w-5 h-5" /> Vento a diverse quote
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {summaryLevels.map((w, i) => w.level ? (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-sm text-slate-400 font-bold mb-2">{w.label}</div>
              <div className="text-xl font-bold text-white">{getWindArrow(w.level.dir)} {Math.round(w.level.speed)}</div>
              <div className="text-sm text-slate-400">{w.level.dirName} ({w.level.dir}°)</div>
              {(w as any).gust && <div className="text-sm text-red-300 mt-1">Raff. {Math.round((w as any).gust)}</div>}
            </div>
          ) : (
            <div key={i} className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 text-center">
              <div className="text-sm text-slate-400 font-bold mb-2">{w.label}</div>
              <div className="text-xl font-bold text-slate-500">—</div>
              <div className="text-sm text-slate-500">N/D</div>
            </div>
          ))}
        </div>
      </div>

      {/* Profilo verticale */}
      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Profilo vento verticale
        </h4>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-1">
          {displayProfile.map((level, idx) => {
            const maxSpeed = Math.max(...displayProfile.map(l => l.speed || 0), 1);
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
