"use client";

import React, { useMemo } from "react";
import { Wind, TrendingUp, Server } from "lucide-react";

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

/** Estrae il profilo vento dai dati reali del server (weatherService) */
function extractWindProfileFromHourly(hourlyData: any[], targetHour: number): WindLevel[] {
  if (!hourlyData || hourlyData.length === 0) return [];

  // Trova l'ora target
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setHours(targetHour, 0, 0, 0);

  const targetEntry = hourlyData.find((h: any) => {
    const t = h.time instanceof Date ? h.time : new Date(h.time);
    return t.getHours() === targetHour &&
           t.getFullYear() === targetDate.getFullYear() &&
           t.getMonth() === targetDate.getMonth() &&
           t.getDate() === targetDate.getDate();
  }) || hourlyData.find((h: any) => {
    // fallback: qualsiasi ora dello stesso giorno
    const t = h.time instanceof Date ? h.time : new Date(h.time);
    return t.getFullYear() === targetDate.getFullYear() &&
           t.getMonth() === targetDate.getMonth() &&
           t.getDate() === targetDate.getDate();
  });

  if (!targetEntry) return [];

  // windProfile dal server
  const wp = targetEntry.windProfile;
  if (wp && Array.isArray(wp) && wp.length > 0) {
    return wp.map((l: any) => ({
      alt: l.height ?? l.alt ?? 0,
      speed: l.speed ?? 0,
      dir: l.dir ?? 0,
      dirName: getWindDirName(l.dir ?? 0),
    })).filter((l: WindLevel) => l.alt > 0);
  }

  return [];
}

/** Seleziona le quote per la visualizzazione verticale */
function getDisplayProfile(profile: WindLevel[]): WindLevel[] {
  const desiredAltitudes = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 10];
  return desiredAltitudes.map(alt => {
    const exact = profile.find(l => l.alt === alt);
    if (exact) return exact;
    const sorted = [...profile].sort((a, b) => Math.abs(a.alt - alt) - Math.abs(b.alt - alt));
    const nearest = sorted[0];
    if (nearest && Math.abs(nearest.alt - alt) <= 250) {
      return { ...nearest, alt };
    }
    return { alt, speed: 0, dir: 0, dirName: "-" };
  });
}

export default function VentiTab({ currentData, dayData, hourlyData, targetHour = 12 }: VentiTabProps) {
  // Estrai profilo vento REALE dai dati hourly (che arrivano da weatherService)
  const windProfile = useMemo(() => {
    if (hourlyData && hourlyData.length > 0) {
      return extractWindProfileFromHourly(hourlyData, targetHour);
    }
    return [];
  }, [hourlyData, targetHour]);

  const hasRealData = windProfile.length > 0;

  // Se non ci sono dati reali, usa una stima
  const displayProfile = useMemo(() => {
    if (hasRealData) return getDisplayProfile(windProfile);
    // Stima di fallback solo se non ci sono dati
    const surfaceSpeed = currentData?.windSpeed ?? 10;
    const surfaceDir = currentData?.windDir ?? 0;
    const estimated: WindLevel[] = [];
    const altLevels = [10, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
    for (const alt of altLevels) {
      if (alt === 10) {
        estimated.push({ alt, speed: surfaceSpeed, dir: surfaceDir, dirName: getWindDirName(surfaceDir) });
      } else {
        const factor = 1 + (alt / 1000) * 0.35;
        const speed = Math.round(Math.min(surfaceSpeed * factor, 60) * 10) / 10;
        const dir = (surfaceDir + Math.round((alt / 1000) * 15)) % 360;
        estimated.push({ alt, speed, dir, dirName: getWindDirName(dir) });
      }
    }
    return estimated;
  }, [windProfile, hasRealData, currentData]);

  // Carte riassuntive per le 5 quote principali
  const summaryLevels = useMemo(() => {
    const findLevel = (alt: number) =>
      windProfile.find(l => l.alt === alt);
    
    return [
      { label: "Superficie (10m)", level: findLevel(10) || displayProfile.find(l => l.alt === 10), gust: currentData?.windGusts },
      { label: "Bassa (500m)", level: findLevel(500) || displayProfile.find(l => l.alt === 500) },
      { label: "Media (1000m)", level: findLevel(1000) || displayProfile.find(l => l.alt === 1000) },
      { label: "Alta (2000m)", level: findLevel(2000) || displayProfile.find(l => l.alt === 2000) },
      { label: "Molto alta (4000m)", level: findLevel(4000) || displayProfile.find(l => l.alt === 4000) },
    ];
  }, [windProfile, displayProfile, currentData]);

  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento</p>
      </div>
    );
  }

  // Calcola velocità e direzione al suolo per fallback
  const surfaceSpeed = currentData?.windSpeed ?? 0;
  const surfaceDir = currentData?.windDir ?? 0;
  const surfaceGust = currentData?.windGusts ?? 0;

  return (
    <div className="space-y-4">
      {/* Badge dati reali / stimati */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold"
        style={{
          backgroundColor: hasRealData ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          borderColor: hasRealData ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
          color: hasRealData ? '#6ee7b7' : '#fcd34d',
        }}
      >
        <Server className="w-4 h-4" />
        {hasRealData
          ? `Dati reali da Open-Meteo (${windProfile.length} quote)`
          : `Dati stimati — profilo vento da server non disponibile (venti al suolo reale: ${surfaceSpeed} km/h da ${getWindDirName(surfaceDir)})`}
      </div>

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
          <TrendingUp className="w-5 h-5" /> Profilo vento verticale {hasRealData ? '(reale)' : '(stimato)'}
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

      {/* Dati del vento al suolo */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-center text-sm text-slate-400">
        <span>Vento al suolo: {surfaceSpeed} km/h da {getWindDirName(surfaceDir)} ({Math.round(surfaceDir)}°) · Raffiche: {surfaceGust} km/h · Ora: {String(targetHour).padStart(2, "0")}:00</span>
      </div>
    </div>
  );
}