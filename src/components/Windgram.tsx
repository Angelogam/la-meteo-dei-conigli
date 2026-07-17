"use client";

import React, { useMemo } from "react";
import type { MeteoHourly } from "@/services/weatherService";
import { calcolaTermiche } from "@/utils/termiche";

interface WindgramProps {
  hourlyData: MeteoHourly[];
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

function speedBg(speed: number): string {
  if (speed <= 8) return "bg-emerald-500";
  if (speed <= 15) return "bg-lime-500";
  if (speed <= 22) return "bg-amber-500";
  if (speed <= 30) return "bg-orange-500";
  return "bg-red-500";
}

export default function Windgram({ hourlyData, site, selectedHour, onHourSelect }: WindgramProps) {
  const oggi = useMemo(() => new Date(), []);
  const g = oggi.getDate(), m = oggi.getMonth(), y = oggi.getFullYear();

  const quote = useMemo(() => {
    const q: number[] = [];
    for (let h = site.alt; h <= 4000; h += 200) q.push(h);
    return q;
  }, [site.alt]);

  const { matrix, maxSpeed, termiche } = useMemo(() => {
    const mat: Record<number, Record<number, { speed: number; dir: number }>> = {};
    const term: Record<number, any> = {};
    let mx = 1;

    for (const ora of ORE) {
      mat[ora] = {};
      const hd = hourlyData.find(h => {
        const t = new Date(h.time);
        return t.getHours() === ora && t.getDate() === g && t.getMonth() === m && t.getFullYear() === y;
      });

      if (hd) {
        term[ora] = calcolaTermiche({
          time: hd.time,
          temperature: hd.temperature,
          humidity: hd.humidity,
          dewPoint: hd.dewPoint,
          precipitation: hd.precipitation,
          weatherCode: hd.weatherCode,
          cloudCover: hd.cloudCover,
          windSpeed: hd.windSpeed,
          windDir: hd.windDir,
          windGusts: hd.windGusts,
          temp80m: hd.temp80m,
          temp120m: hd.temp120m,
        } as any, site.alt);

        const groundSpeed = hd.windSpeed;
        const groundDir = hd.windDir;

        for (const q of quote) {
          const fattore = 1 + (q - site.alt) / 4000;
          const speed = Math.round(groundSpeed * fattore);
          if (speed > mx) mx = speed;
          mat[ora][q] = { speed, dir: Math.round(groundDir) };
        }
      } else {
        for (const q of quote) mat[ora][q] = { speed: 0, dir: 0 };
      }
    }
    return { matrix: mat, maxSpeed: mx, termiche: term };
  }, [hourlyData, quote, site.alt, g, m, y]);

  const hourData = matrix[selectedHour];
  const t = termiche[selectedHour];

  if (!hourData || Object.values(hourData).every((v: any) => v.speed === 0)) {
    return <div className="text-center py-12 text-slate-400">Nessun dato vento per quest'ora.</div>;
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700/40 rounded-2xl overflow-hidden">
      {/* Selettore ore */}
      <div className="flex gap-1 overflow-x-auto p-3 border-b border-slate-700/30">
        {ORE.map(ora => {
          const hasData = Object.values(matrix[ora] || {}).some(v => v.speed > 0);
          return (
            <button
              key={ora}
              onClick={() => onHourSelect(ora)}
              disabled={!hasData}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                ora === selectedHour
                  ? "bg-emerald-600/30 border-emerald-400/50 text-emerald-200"
                  : hasData
                    ? "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:text-slate-200"
                    : "bg-slate-800/20 border-slate-800/30 text-slate-600 cursor-not-allowed"
              }`}
            >
              {String(ora).padStart(2, "0")}:00
            </button>
          );
        })}
      </div>

      {/* Intestazione tabella */}
      <div className="grid grid-cols-[4rem_1fr_6rem_3rem] gap-2 px-4 py-2 bg-slate-800/40 border-b border-slate-700/20 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
        <span>Quota</span>
        <span>Velocità (km/h)</span>
        <span className="text-center">Direzione</span>
        <span className="text-right"></span>
      </div>

      {/* Righe vento */}
      <div className="divide-y divide-slate-800/40">
        {[...quote].reverse().map(q => {
          const v = hourData[q];
          if (!v || v.speed === 0) return null;
          const w = maxSpeed > 0 ? Math.round((v.speed / maxSpeed) * 100) : 0;
          const isDecollo = q === site.alt;

          return (
            <div
              key={q}
              className={`grid grid-cols-[4rem_1fr_6rem_3rem] gap-2 px-4 py-1.5 items-center ${
                isDecollo ? "bg-amber-900/15" : "hover:bg-slate-800/30"
              }`}
            >
              {/* Quota */}
              <div className="flex items-center gap-1">
                <span className={`text-xs font-mono font-bold ${isDecollo ? "text-amber-400" : "text-slate-400"}`}>
                  {q}m
                </span>
                {isDecollo && (
                  <span className="text-[10px] text-amber-500 font-bold">🪂</span>
                )}
              </div>

              {/* Barra */}
              <div className="h-5 bg-slate-800/60 rounded overflow-hidden">
                <div
                  className={`h-full rounded ${speedBg(v.speed)}`}
                  style={{ width: `${Math.max(w, 4)}%` }}
                />
              </div>

              {/* Velocità + direzione */}
              <div className="text-xs font-bold text-slate-200 text-center">
                {v.speed} km/h <span className="text-slate-500">{getDirArrow(v.dir)}{getDir(v.dir)}</span>
              </div>

              {/* Gradi */}
              <div className="text-xs text-slate-500 text-right font-mono">{v.dir}°</div>
            </div>
          );
        })}
      </div>

      {/* Info termiche */}
      {t && t.rateo > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400 bg-slate-800/50 px-4 py-3 border-t border-slate-700/30">
          <span className="text-slate-400 font-semibold">{String(selectedHour).padStart(2, "0")}:00</span>
          <span>Base <span className="text-emerald-300 font-bold">{t.base}m</span></span>
          <span>Top <span className="text-orange-300 font-bold">{t.top}m</span></span>
          <span>Salita <span className="text-amber-300 font-bold">{t.rateo.toFixed(1)} m/s</span></span>
          <span>Spessore <span className="text-cyan-300 font-bold">{t.top - t.base}m</span></span>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-slate-700/20 bg-slate-800/20 text-xs text-slate-500">
        <span className="text-slate-400 font-bold mr-1">Vento:</span>
        {[
          { label: "≤8", c: "bg-emerald-500" },
          { label: "9-15", c: "bg-lime-500" },
          { label: "16-22", c: "bg-amber-500" },
          { label: "23-30", c: "bg-orange-500" },
          { label: ">30", c: "bg-red-500" },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${l.c}`} />
            {l.label}
          </span>
        ))}
        <span className="ml-auto text-slate-600">{site.name} · {site.alt}m</span>
      </div>
    </div>
  );
}