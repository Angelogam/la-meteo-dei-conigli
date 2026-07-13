"use client";

import React from "react";
import { Sparkles, Gauge } from "lucide-react";

interface DaySelectorProps {
  enrichedDaily: any[];
  dateLabels: string[];
  selectedDay: number;
  onSelect: (idx: number) => void;
}

// Icone SVG personalizzate
const IconeMeteo: Record<number, { svg: React.ReactNode; label: string }> = {
  0: {
    svg: (
      <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
        <circle cx="32" cy="32" r="14" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <line
            key={i}
            x1="32"
            y1="10"
            x2="32"
            y2="16"
            stroke="#FBBF24"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${angle} 32 32)`}
          />
        ))}
      </svg>
    ),
    label: "Sereno",
  },
  1: {
    svg: (
      <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
        <circle cx="30" cy="28" r="12" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" />
        <path d="M36 34c4 0 8 2 10 6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="42" cy="42" rx="10" ry="6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      </svg>
    ),
    label: "Poco nuvoloso",
  },
  2: {
    svg: (
      <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
        <circle cx="26" cy="24" r="10" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" opacity="0.6" />
        <ellipse cx="38" cy="36" rx="14" ry="8" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
        <ellipse cx="42" cy="40" rx="12" ry="6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      </svg>
    ),
    label: "Parz. nuvoloso",
  },
  3: {
    svg: (
      <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
        <ellipse cx="32" cy="34" rx="18" ry="10" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
        <ellipse cx="36" cy="38" rx="16" ry="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
        <ellipse cx="28" cy="30" rx="14" ry="8" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
      </svg>
    ),
    label: "Nuvoloso",
  },
  10: {
    svg: (
      <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
        <ellipse cx="32" cy="34" rx="18" ry="10" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
        <ellipse cx="36" cy="38" rx="16" ry="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
        <ellipse cx="28" cy="30" rx="14" ry="8" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
        <line x1="20" y1="20" x2="44" y2="20" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
      </svg>
    ),
    label: "Nebbia",
  },
  30: {
    svg: (
      <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
        <ellipse cx="32" cy="28" rx="14" ry="8" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
        <ellipse cx="36" cy="34" rx="16" ry="8" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
        <ellipse cx="32" cy="40" rx="18" ry="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
        <line x1="18" y1="50" x2="24" y2="44" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
        <line x1="30" y1="50" x2="36" y2="44" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
        <line x1="42" y1="50" x2="48" y2="44" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    label: "Pioggia",
  },
  50: {
    svg: (
      <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
        <ellipse cx="32" cy="28" rx="14" ry="8" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
        <ellipse cx="36" cy="34" rx="16" ry="8" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
        <ellipse cx="32" cy="40" rx="18" ry="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
        <circle cx="22" cy="50" r="2" fill="#93C5FD" />
        <circle cx="34" cy="52" r="2" fill="#93C5FD" />
        <circle cx="46" cy="50" r="2" fill="#93C5FD" />
      </svg>
    ),
    label: "Neve",
  },
  60: {
    svg: (
      <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
        <ellipse cx="32" cy="28" rx="14" ry="8" fill="#64748B" stroke="#475569" strokeWidth="1.5" />
        <ellipse cx="36" cy="34" rx="16" ry="8" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
        <ellipse cx="32" cy="40" rx="18" ry="8" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
        <line x1="20" y1="48" x2="28" y2="48" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="48" x2="44" y2="48" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
        <polygon points="32,38 34,44 30,44" fill="#FBBF24" />
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

// Gradiente vento per colore
function coloreVento(vel: number): string {
  if (vel < 10) return "text-emerald-300";
  if (vel < 20) return "text-amber-300";
  if (vel < 30) return "text-orange-400";
  return "text-red-400";
}

function bordoVento(vel: number): string {
  if (vel < 10) return "border-emerald-400/30";
  if (vel < 20) return "border-amber-400/30";
  if (vel < 30) return "border-orange-400/30";
  return "border-red-400/30";
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
        const raffiche = Math.round(day.windGusts10m ?? day.windGusts ?? 0);
        const copertura = Math.round(day.cloudCover ?? 0);
        const probPioggia = day.precipitationProbability ?? null;
        const pioggiaMm = day.precipitationSum ?? null;
        const visibilita = day.visibility ?? null;

        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`rounded-2xl px-4 py-4 transition-all duration-300 border-2 text-left ${
              isActive
                ? "bg-gradient-to-br from-green-900/25 to-emerald-900/15 border-green-400/60 shadow-lg shadow-green-500/20 scale-[1.02]"
                : "bg-slate-800/50 border-slate-600/40 hover:border-green-400/40 hover:bg-slate-700/50"
            }`}
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            {/* Intestazione giorno */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-200 tracking-wide">
                {dateLabels[idx]}
              </span>
              {isActive && (
                <span className="w-5 h-5 rounded-full bg-green-400/20 border border-green-400/40 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-green-400" />
                </span>
              )}
            </div>

            {/* Icona + condizione */}
            <div className="flex flex-col items-center mb-3">
              <div className="mb-1.5">{icona}</div>
              <span className="text-xs font-bold text-white tracking-wide">
                {etichetta}
              </span>
            </div>

            {/* Temperature */}
            <div className="text-center mb-3">
              <span className="text-lg font-black text-white tabular-nums">
                {Math.round(day.tempMax)}°
              </span>
              <span className="text-base font-bold text-slate-400 mx-1">/</span>
              <span className="text-base font-semibold text-slate-400 tabular-nums">
                {Math.round(day.tempMin)}°
              </span>
            </div>

            {/* Dati meteo */}
            <div className="space-y-2">
              {/* Vento */}
              <div className={`flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-xl border ${bordoVento(vento)}`}>
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                    <path d="M2 10h16M6 6l4 4-4 4M14 6l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" />
                  </svg>
                  <span className="text-[11px] font-semibold text-slate-400 tracking-wide">Vento</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${coloreVento(vento)}`}>
                  {vento} <span className="text-[9px] font-normal opacity-70">km/h</span>
                </span>
              </div>

              {/* Raffiche */}
              {raffiche > 0 && (
                <div className={`flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-xl border ${bordoVento(raffiche)}`}>
                  <div className="flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                      <path d="M2 10h16M6 6l4 4-4 4M14 6l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" />
                    </svg>
                    <span className="text-[11px] font-semibold text-slate-400 tracking-wide">Raffiche</span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${coloreVento(raffiche)}`}>
                    {raffiche} <span className="text-[9px] font-normal opacity-70">km/h</span>
                  </span>
                </div>
              )}

              {/* Copertura */}
              <div className="flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700/30">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                    <ellipse cx="10" cy="12" rx="7" ry="4" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
                    <ellipse cx="10" cy="9" rx="5" ry="3" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" opacity="0.6" />
                  </svg>
                  <span className="text-[11px] font-semibold text-slate-400 tracking-wide">Nuvole</span>
                </div>
                <span className="text-sm font-bold text-sky-300 tabular-nums">{copertura}%</span>
              </div>

              {/* Pioggia */}
              <div className="flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700/30">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                    <path d="M6 14V8a4 4 0 118 0v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-blue-400" />
                    <line x1="8" y1="16" x2="8" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-blue-400" />
                    <line x1="12" y1="16" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-blue-400" />
                  </svg>
                  <span className="text-[11px] font-semibold text-slate-400 tracking-wide">Pioggia</span>
                </div>
                <span className="text-sm font-bold text-blue-300 tabular-nums">
                  {probPioggia !== null
                    ? `${probPioggia}%`
                    : pioggiaMm !== null
                    ? `${pioggiaMm.toFixed(1)}mm`
                    : "--"}
                </span>
              </div>

              {/* Visibilità */}
              {visibilita !== null && visibilita > 0 && (
                <div className="flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                      <path d="M10 4C5 4 1 10 1 10s4 6 9 6 9-6 9-6-4-6-9-6z" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
                      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
                    </svg>
                    <span className="text-[11px] font-semibold text-slate-400 tracking-wide">Visibilità</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-300 tabular-nums">{visibilita} km</span>
                </div>
              )}

              {/* Delta termico */}
              {day.thermalDelta !== undefined && (
                <div className="flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-xl border border-orange-400/20">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-[11px] font-semibold text-slate-400 tracking-wide">Δ termico</span>
                  </div>
                  <span className="text-sm font-bold text-orange-300 tabular-nums">{day.thermalDelta}°C</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}