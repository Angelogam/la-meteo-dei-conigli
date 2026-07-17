"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface WindgramProps {
  hourlyData: HourData[];
  site: { name: string; alt: number; lat: number; lon: number };
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function getDir(deg: number): string {
  const d = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return d[Math.round(deg / 45) % 8];
}

function getDirArrow(deg: number): string {
  const a = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return a[Math.round(deg / 45) % 8];
}

// Quote: da 1000 a 4000 ogni 500m (come nell'immagine)
const QUOTE = [1000, 1500, 2000, 2500, 3000, 3500, 4000];

// Direzioni cardinali con angoli
const DIR_NAMES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const DIR_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export default function Windgram({ hourlyData, site, selectedHour, onHourSelect }: WindgramProps) {
  const oggi = new Date();
  const g = oggi.getDate(), m = oggi.getMonth(), y = oggi.getFullYear();

  const { righe } = useMemo(() => {
    const items: { q: number; speed: number; dir: number }[] = [];
    let maxSp = 0;

    const hd = hourlyData.find(h => {
      const t = new Date(h.time);
      return t.getHours() === selectedHour && t.getDate() === g && t.getMonth() === m && t.getFullYear() === y;
    });

    if (hd) {
      for (const q of QUOTE) {
        const fattore = 1 + (q - site.alt) / 3000;
        const speed = Math.round(hd.windSpeed * fattore);
        const dir = hd.windDir;
        if (speed > maxSp) maxSp = speed;
        items.push({ q, speed, dir });
      }
    }

    return { righe: items, maxSpeed: Math.max(maxSp, 10) };
  }, [hourlyData, selectedHour, site.alt, g, m, y]);

  const hd = hourlyData.find(h => {
    const t = new Date(h.time);
    return t.getHours() === selectedHour && t.getDate() === g && t.getMonth() === m && t.getFullYear() === y;
  });
  const termiche = hd ? calcolaTermiche(hd, site.alt) : null;

  if (righe.length === 0) {
    return <div className="text-center py-12 text-slate-400">Nessun dato per quest'ora.</div>;
  }

  const maxSpeed = Math.max(...righe.map(r => r.speed), 10);

  // Scala per le barre: da 0 a maxSpeed+10, larghezza max 200px
  const scala = (s: number) => Math.max(4, (s / (maxSpeed + 10)) * 200);

  return (
    <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl overflow-hidden">
      {/* Selettore ore */}
      <div className="flex gap-1 overflow-x-auto p-3 bg-slate-800/30 border-b border-slate-700/30">
        {ORE.map(ora => (
          <button
            key={ora}
            onClick={() => onHourSelect(ora)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
              ora === selectedHour
                ? "bg-emerald-600/30 border-emerald-400/50 text-emerald-200"
                : "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:text-slate-200"
            }`}
          >
            {String(ora).padStart(2, "0")}:00
          </button>
        ))}
      </div>

      {/* Info ora + termiche */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/20 text-xs text-slate-300 border-b border-slate-700/20">
        <span className="font-bold text-white">{site.name}</span>
        <span className="text-slate-500">·</span>
        <span>{String(selectedHour).padStart(2, "0")}:00</span>
        <span className="text-slate-500">·</span>
        <span>Decollo {site.alt}m</span>
        {termiche && termiche.rateo > 0 && (
          <>
            <span className="text-slate-500">·</span>
            <span className="text-amber-300">↑ {termiche.rateo.toFixed(1)} m/s</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-300">Base {termiche.base}m</span>
            <span className="text-slate-500">·</span>
            <span className="text-orange-300">Top {termiche.top}m</span>
          </>
        )}
      </div>

      {/* GRAFICO VERO — due colonne: velocità (sinistra) + direzione (destra) */}
      <div className="p-4">
        {/* Intestazione colonne */}
        <div className="grid grid-cols-[4rem_1fr_1rem_1.5fr] gap-2 mb-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <span>Quota</span>
          <span className="text-center">Velocità (km/h)</span>
          <span></span>
          <span className="text-center">Direzione</span>
        </div>

        {/* Righe del windgram */}
        <div className="space-y-1.5">
          {[...QUOTE].reverse().map(q => {
            const r = righe.find(x => x.q === q);
            if (!r) return null;
            const w = scala(r.speed);
            const isDecollo = q === site.alt;

            return (
              <div key={q} className={`grid grid-cols-[4rem_1fr_1rem_1.5fr] gap-2 items-center ${
                isDecollo ? "bg-amber-900/20 rounded-lg -mx-2 px-2" : ""
              }`}>
                {/* Quota */}
                <span className={`text-xs font-mono font-bold ${
                  isDecollo ? "text-amber-400" : "text-slate-400"
                }`}>
                  {q}m
                </span>

                {/* Barra velocità */}
                <div className="h-6 bg-slate-800/60 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${w}px`,
                      background: r.speed <= 8 ? "#10b981" : r.speed <= 15 ? "#84cc16" : r.speed <= 22 ? "#f59e0b" : r.speed <= 30 ? "#f97316" : "#ef4444",
                    }}
                  />
                  {isDecollo && (
                    <div className="absolute inset-0 border-2 border-amber-400/50 rounded pointer-events-none" />
                  )}
                </div>

                {/* Separatore */}
                <div className="w-px h-6 bg-slate-600/50 mx-auto" />

                {/* Direzione — barra orizzontale con freccia */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-5 bg-slate-800/60 rounded overflow-hidden relative">
                    {/* Sfondo linee cardinali */}
                    <div className="absolute inset-0 flex">
                      {DIR_ANGLES.map((a, i) => (
                        <div
                          key={a}
                          className="flex-1 border-r border-slate-700/30 last:border-r-0 flex items-center justify-center text-[8px] text-slate-600"
                        >
                          {DIR_NAMES[i]}
                        </div>
                      ))}
                    </div>
                    {/* Marker direzione */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-sky-400"
                      style={{ left: `${((r.dir % 360) / 360) * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-sky-400/30 border-2 border-sky-400 flex items-center justify-center"
                      style={{ left: `calc(${((r.dir % 360) / 360) * 100}% - 8px)` }}
                    >
                      <span className="text-[8px] font-bold text-sky-200">{getDirArrow(r.dir)}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-sky-300 shrink-0 w-10 text-right">
                    {r.speed} {getDir(r.dir)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda velocità */}
      <div className="flex flex-wrap gap-3 px-4 py-2.5 border-t border-slate-700/30 bg-slate-800/20 text-[10px] text-slate-500">
        <span className="text-slate-400 font-bold">Vento:</span>
        {[
          { label: "≤8", color: "#10b981" },
          { label: "9-15", color: "#84cc16" },
          { label: "16-22", color: "#f59e0b" },
          { label: "23-30", color: "#f97316" },
          { label: ">30", color: "#ef4444" },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
        <span className="text-slate-500 ml-auto">km/h · {site.alt}m</span>
      </div>
    </div>
  );
}