"use client";

import React from "react";
import { Sparkles, ArrowUp, ArrowDown, Wind, Thermometer, Waves, AlertTriangle } from "lucide-react";

interface DaySelectorProps {
  enrichedDaily: any[];
  dateLabels: string[];
  selectedDay: number;
  onSelect: (idx: number) => void;
}

// Icone meteo SVG professionali
const IconeMeteo: Record<number, { svg: React.ReactNode; label: string }> = {
  0: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <circle cx="40" cy="40" r="16" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a, i) => (
          <line key={i} x1="40" y1="14" x2="40" y2="20" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a} 40 40)`} />
        ))}
        <circle cx="40" cy="40" r="18" stroke="#FBBF24" strokeWidth="1" opacity="0.3" strokeDasharray="3 4" />
      </svg>
    ),
    label: "Sereno",
  },
  1: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <circle cx="34" cy="32" r="13" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" opacity="0.85" />
        <path d="M42 42c5 0 9 2 11 5" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="50" cy="52" rx="13" ry="7" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
        <path d="M30 40c0-6 4-10 10-12" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />
      </svg>
    ),
    label: "Poco nuvoloso",
  },
  2: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <circle cx="28" cy="26" r="11" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" opacity="0.5" />
        <ellipse cx="46" cy="44" rx="17" ry="9" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
        <ellipse cx="52" cy="50" rx="15" ry="7" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
      </svg>
    ),
    label: "Parz. nuvoloso",
  },
  3: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <ellipse cx="40" cy="42" rx="22" ry="12" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
        <ellipse cx="46" cy="48" rx="20" ry="10" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
        <ellipse cx="34" cy="36" rx="16" ry="10" fill="#94A3B8" stroke="#64748B" strokeWidth="2" />
        <rect x="30" y="24" width="20" height="4" rx="2" fill="#64748B" opacity="0.3" />
      </svg>
    ),
    label: "Nuvoloso",
  },
  10: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <ellipse cx="40" cy="42" rx="22" ry="12" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
        <ellipse cx="46" cy="48" rx="20" ry="10" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
        <ellipse cx="34" cy="36" rx="16" ry="10" fill="#94A3B8" stroke="#64748B" strokeWidth="2" />
        <line x1="18" y1="20" x2="62" y2="20" stroke="#94A3B8" strokeWidth="3" strokeDasharray="4 4" opacity="0.5" strokeLinecap="round" />
        <line x1="22" y1="16" x2="58" y2="16" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 5" opacity="0.3" strokeLinecap="round" />
      </svg>
    ),
    label: "Nebbia",
  },
  30: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <ellipse cx="40" cy="34" rx="16" ry="9" fill="#94A3B8" stroke="#64748B" strokeWidth="2" />
        <ellipse cx="46" cy="42" rx="18" ry="10" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
        <ellipse cx="40" cy="50" rx="22" ry="10" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
        <line x1="20" y1="60" x2="28" y2="52" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
        <line x1="36" y1="62" x2="44" y2="52" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
        <line x1="52" y1="60" x2="60" y2="52" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="32" r="3" fill="#60A5FA" opacity="0.4" />
      </svg>
    ),
    label: "Pioggia",
  },
  50: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <ellipse cx="40" cy="34" rx="16" ry="9" fill="#94A3B8" stroke="#64748B" strokeWidth="2" />
        <ellipse cx="46" cy="42" rx="18" ry="10" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
        <ellipse cx="40" cy="50" rx="22" ry="10" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
        <circle cx="26" cy="60" r="3" fill="#BAE6FD" opacity="0.8" />
        <circle cx="40" cy="64" r="3" fill="#BAE6FD" opacity="0.8" />
        <circle cx="54" cy="60" r="3" fill="#BAE6FD" opacity="0.8" />
      </svg>
    ),
    label: "Neve",
  },
  60: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <ellipse cx="40" cy="34" rx="16" ry="9" fill="#64748B" stroke="#475569" strokeWidth="2" />
        <ellipse cx="46" cy="42" rx="18" ry="10" fill="#94A3B8" stroke="#64748B" strokeWidth="2" />
        <ellipse cx="40" cy="50" rx="22" ry="10" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
        <line x1="22" y1="58" x2="30" y2="58" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
        <line x1="42" y1="58" x2="52" y2="58" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
        <polygon points="40,46 43,54 37,54" fill="#FBBF24" />
        <line x1="40" y1="46" x2="40" y2="42" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    label: "Temporale",
  },
};

function getIcona(code: number): React.ReactNode {
  const keys = Object.keys(IconeMeteo).map(Number).sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (code >= keys[i]) return IconeMeteo[keys[i]].svg;
  }
  return IconeMeteo[0].svg;
}

function getEtichetta(code: number): string {
  const keys = Object.keys(IconeMeteo).map(Number).sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (code >= keys[i]) return IconeMeteo[keys[i]].label;
  }
  return IconeMeteo[0].label;
}

function getVentoColore(vel: number): string {
  if (vel < 10) return "text-emerald-300";
  if (vel < 18) return "text-green-300";
  if (vel < 25) return "text-amber-300";
  if (vel < 35) return "text-orange-400";
  return "text-red-400";
}

function getVentoBg(vel: number): string {
  if (vel < 10) return "bg-emerald-500/10 border-emerald-500/20";
  if (vel < 18) return "bg-green-500/10 border-green-500/20";
  if (vel < 25) return "bg-amber-500/10 border-amber-500/20";
  if (vel < 35) return "bg-orange-500/10 border-orange-500/20";
  return "bg-red-500/10 border-red-500/20";
}

export default function DaySelector({
  enrichedDaily,
  dateLabels,
  selectedDay,
  onSelect,
}: DaySelectorProps) {
  if (!enrichedDaily || enrichedDaily.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {enrichedDaily.map((day: any, idx: number) => {
        const isActive = idx === selectedDay;
        const weatherCode = day.weatherCode ?? 0;
        const etichetta = getEtichetta(weatherCode);
        const icona = getIcona(weatherCode);
        const vento = Math.round(day.windSpeed10m ?? day.windSpeed ?? 0);
        const raffica = Math.round(day.windGusts10m ?? day.windGusts ?? 0);
        const copertura = Math.round(day.cloudCover ?? 0);
        const pioggia = day.precipitationProbability ?? day.precipitationSum ?? 0;
        const visibilita = day.visibility ?? "--";

        // Dati volo parapendio
        const termicaBase = day.thermalBase ?? "--";
        const ventoQuota = day.windSpeed2000m ?? day.windSpeed1500m ?? "--";
        const ventoAltaQuota = day.windSpeed3000m ?? "--";
        const windShear = day.windShear20km ?? day.windShear ?? "--";
        const turbolenza = day.turbulence ?? day.gustFactor ?? 0;
        const termicaMedia = day.thermalUpdraft ?? day.convectionIndex ?? "--";
        const inversione = day.inversionStrength ?? "--";
        const taux = day.thermalStrength ?? "--";
        const windDirection = day.windDirection ?? "--";
        const umidita = day.humidity ?? "--";
        const pressione = day.pressureSeaLevel ?? "--";

        // Valutazione volo
        let voloRating = "BUONO";
        let voloColor = "text-emerald-400 bg-emerald-500/10";
        if (vento > 25 || raffica > 35 || turbolenza > 4) {
          voloRating = "PERICOLOSO";
          voloColor = "text-red-400 bg-red-500/10";
        } else if (vento > 18 || copertura > 70 || pioggia > 30) {
          voloRating = "DIFFICILE";
          voloColor = "text-amber-400 bg-amber-500/10";
        } else if (vento < 5) {
          voloRating = "DEBOLE";
          voloColor = "text-sky-300 bg-sky-500/10";
        }

        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`rounded-2xl px-3 py-4 transition-all duration-300 border-2 text-left ${
              isActive
                ? "bg-gradient-to-br from-sky-900/20 to-indigo-900/10 border-sky-400/50 shadow-lg shadow-sky-500/15 scale-[1.02]"
                : "bg-slate-800/40 border-slate-600/30 hover:border-sky-500/30 hover:bg-slate-700/40"
            }`}
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            {/* Giorno + valutazione */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-100">
                {dateLabels[idx]}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${voloColor}`}>
                {voloRating}
              </span>
            </div>

            {/* Icona + condizione */}
            <div className="flex flex-col items-center mb-3">
              <div className="mb-1">{icona}</div>
              <span className="text-xs font-bold text-white tracking-wide">
                {etichetta}
              </span>
            </div>

            {/* Temperature */}
            <div className="text-center mb-3 border-b border-slate-700/30 pb-2">
              <span className="text-lg font-black text-white tabular-nums">
                {Math.round(day.tempMax)}°
              </span>
              <span className="text-sm font-semibold text-slate-400 mx-1">/</span>
              <span className="text-sm font-semibold text-slate-400 tabular-nums">
                {Math.round(day.tempMin)}°
              </span>
            </div>

            {/* Dati meteo volo parapendio */}
            <div className="space-y-1.5">
              {/* Wind shear + turbolenza */}
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${getVentoBg(raffica)}`}>
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-300">Wind shear</span>
                </div>
                <span className="text-xs font-bold tabular-nums text-slate-100">
                  {windShear !== "--" ? `${windShear} km` : "--"}
                </span>
              </div>
              {/* Turbolenza */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-medium text-slate-300">Turbolenza</span>
                </div>
                <span className={`text-xs font-bold tabular-nums ${turbolenza > 3 ? "text-red-300" : turbolenza > 2 ? "text-amber-300" : "text-emerald-300"}`}>
                  {turbolenza !== 0 ? `${turbolenza}/5` : "--"}
                </span>
              </div>

              {/* Vento in quota + direzione */}
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${getVentoBg(vento)}`}>
                <div className="flex items-center gap-1.5">
                  <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-medium text-slate-300">Vento 2000m</span>
                </div>
                <span className="text-xs font-bold tabular-nums text-cyan-300">
                  {ventoQuota !== "--" ? `${ventoQuota} km/h` : "--"}
                </span>
              </div>
              {/* Vento alta quota */}
              {ventoAltaQuota !== "--" && (
                <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${getVentoBg(Number(ventoAltaQuota))}`}>
                  <div className="flex items-center gap-1.5">
                    <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-medium text-slate-300">Vento 3000m</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-indigo-300">
                    {ventoAltaQuota} km/h
                  </span>
                </div>
              )}
              {/* Direzione vento */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[10px] font-medium text-slate-300">Direzione</span>
                </div>
                <span className="text-xs font-bold text-sky-300 tabular-nums">
                  {windDirection !== "--" ? `${windDirection}°` : "--"}
                </span>
              </div>

              {/* Termiche */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10">
                <div className="flex items-center gap-1.5">
                  <ArrowUp className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[10px] font-medium text-slate-300">Termica media</span>
                </div>
                <span className={`text-xs font-bold tabular-nums ${termicaMedia !== "--" && termicaMedia > 2 ? "text-orange-300" : "text-orange-400/70"}`}>
                  {termicaMedia !== "--" ? `${termicaMedia} m/s` : "--"}
                </span>
              </div>
              {/* Base termica */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-medium text-slate-300">Base termica</span>
                </div>
                <span className="text-xs font-bold tabular-nums text-amber-300">
                  {termicaBase !== "--" ? `${termicaBase} m` : "--"}
                </span>
              </div>
              {/* Forza termica (taux) */}
              {taux !== "--" && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/10">
                  <div className="flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] font-medium text-slate-300">Taux</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-yellow-300">
                    {taux} m/s
                  </span>
                </div>
              )}

              {/* Inversione termica */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                <div className="flex items-center gap-1.5">
                  <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-300">Inversione</span>
                </div>
                <span className="text-xs font-bold text-slate-100 tabular-nums">
                  {inversione !== "--" ? `${inversione}°C` : "--"}
                </span>
              </div>

              {/* Dati standard */}
              {/* Copertura */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-sky-400" fill="none">
                    <ellipse cx="10" cy="12" rx="7" ry="4" stroke="currentColor" strokeWidth="1.5" />
                    <ellipse cx="10" cy="9" rx="5" ry="3" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                  </svg>
                  <span className="text-[10px] font-medium text-slate-300">Nuvole</span>
                </div>
                <span className="text-xs font-bold text-sky-300 tabular-nums">{copertura}%</span>
              </div>
              {/* Pioggia */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-blue-400" fill="none">
                    <path d="M6 14V8a4 4 0 118 0v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="8" y1="16" x2="8" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="12" y1="16" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-[10px] font-medium text-slate-300">Pioggia</span>
                </div>
                <span className="text-xs font-bold text-blue-300 tabular-nums">
                  {typeof day.precipitationProbability === "number" ? `${Math.round(day.precipitationProbability)}%` : `${Math.round(day.precipitationSum)}mm`}
                </span>
              </div>
              {/* Umidità */}
              {umidita !== "--" && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-medium text-slate-300">Umidità</span>
                  </div>
                  <span className="text-xs font-bold text-blue-300 tabular-nums">{umidita}%</span>
                </div>
              )}
              {/* Visibilità */}
              {visibilita !== "--" && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                  <div className="flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-emerald-400" fill="none">
                      <path d="M10 4C5 4 1 10 1 10s4 6 9 6 9-6 9-6-4-6-9-6z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span className="text-[10px] font-medium text-slate-300">Visibilità</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-300 tabular-nums">{visibilita} km</span>
                </div>
              )}
              {/* Pressione */}
              {pressione !== "--" && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                  <div className="flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-violet-400" fill="none">
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="10" y1="4" x2="10" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="10" y1="8" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-[10px] font-medium text-slate-300">Pressione</span>
                  </div>
                  <span className="text-xs font-bold text-violet-300 tabular-nums">{pressione} hPa</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Droplets({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none">
      <path d="M10 2C10 2 6 8 6 12a4 4 0 008 0c0-4-4-10-4-10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}