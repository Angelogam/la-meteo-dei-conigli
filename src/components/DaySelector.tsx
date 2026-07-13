"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface DaySelectorProps {
  enrichedDaily: any[];
  dateLabels: string[];
  selectedDay: number;
  onSelect: (idx: number) => void;
}

// Icone meteo SVG personalizzate
const IconeMeteo: Record<number, { svg: React.ReactNode; label: string }> = {
  0: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <circle cx="40" cy="40" r="16" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a, i) => (
          <line key={i} x1="40" y1="14" x2="40" y2="20" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a} 40 40)`} />
        ))}
      </svg>
    ),
    label: "Sereno",
  },
  1: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <circle cx="36" cy="34" r="14" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" opacity="0.85" />
        <path d="M44 44c6 0 10 2 12 6" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="52" cy="54" rx="14" ry="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
      </svg>
    ),
    label: "Poco nuvoloso",
  },
  2: {
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        <circle cx="30" cy="28" r="12" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" opacity="0.5" />
        <ellipse cx="48" cy="46" rx="18" ry="10" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
        <ellipse cx="54" cy="52" rx="16" ry="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
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
  return "text-red-300";
}

function getVentoBg(vel: number): string {
  if (vel < 10) return "bg-emerald-500/10 border-emerald-500/20";
  if (vel < 18) return "bg-green-500/10 border-green-500/20";
  if (vel < 25) return "bg-amber-500/10 border-amber-500/20";
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

        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`rounded-2xl px-3 py-4 transition-all duration-300 border-2 text-left ${
              isActive
                ? "bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-green-400/50 shadow-lg shadow-green-500/15 scale-[1.02]"
                : "bg-slate-800/40 border-slate-600/30 hover:border-green-500/30 hover:bg-slate-700/40"
            }`}
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            {/* Giorno */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-100">
                {dateLabels[idx]}
              </span>
              {isActive && (
                <Sparkles className="w-4 h-4 text-green-400 animate-pulse" />
              )}
            </div>

            {/* Icona + condizione */}
            <div className="flex flex-col items-center mb-3">
              <div className="mb-1.5">{icona}</div>
              <span className="text-sm font-semibold text-white">
                {etichetta}
              </span>
            </div>

            {/* Temperature */}
            <div className="text-center mb-3">
              <span className="text-xl font-black text-white tabular-nums">
                {Math.round(day.tempMax)}°
              </span>
              <span className="text-base font-semibold text-slate-400 mx-1">/</span>
              <span className="text-base font-semibold text-slate-400 tabular-nums">
                {Math.round(day.tempMin)}°
              </span>
            </div>

            {/* Dati meteo */}
            <div className="space-y-1.5">
              {/* Vento + raffica */}
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${getVentoBg(vento)}`}>
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 text-slate-400" fill="none">
                    <path d="M2 10h16M6 6l4 4-4 4M14 6l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-medium text-slate-300">Vento</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${getVentoColore(vento)}`}>
                  {vento} <span className="text-[10px] font-medium opacity-70">km/h</span>
                </span>
              </div>
              {raffica > 0 && (
                <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${getVentoBg(raffica)}`}>
                  <div className="flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" className="w-4 h-4 text-slate-400" fill="none">
                      <path d="M2 10h16M6 6l4 4-4 4M14 6l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-xs font-medium text-slate-300">Raffiche</span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${getVentoColore(raffica)}`}>
                    {raffica} <span className="text-[10px] font-medium opacity-70">km/h</span>
                  </span>
                </div>
              )}
              {/* Copertura */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 text-sky-400" fill="none">
                    <ellipse cx="10" cy="12" rx="7" ry="4" stroke="currentColor" strokeWidth="1.5" />
                    <ellipse cx="10" cy="9" rx="5" ry="3" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                  </svg>
                  <span className="text-xs font-medium text-slate-300">Nuvole</span>
                </div>
                <span className="text-sm font-bold text-sky-300 tabular-nums">{copertura}%</span>
              </div>
              {/* Pioggia */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 text-blue-400" fill="none">
                    <path d="M6 14V8a4 4 0 118 0v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="8" y1="16" x2="8" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="12" y1="16" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-xs font-medium text-slate-300">Pioggia</span>
                </div>
                <span className="text-sm font-bold text-blue-300 tabular-nums">
                  {typeof day.precipitationProbability === "number" ? `${Math.round(day.precipitationProbability)}%` : `${Math.round(day.precipitationSum)}mm`}
                </span>
              </div>
              {/* Visibilità */}
              {visibilita !== "--" && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/30">
                  <div className="flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" className="w-4 h-4 text-emerald-400" fill="none">
                      <path d="M10 4C5 4 1 10 1 10s4 6 9 6 9-6 9-6-4-6-9-6z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span className="text-xs font-medium text-slate-300">Visibilità</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-300 tabular-nums">{visibilita} km</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}