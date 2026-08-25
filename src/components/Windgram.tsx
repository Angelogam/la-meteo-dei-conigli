"use client";

import React, { useMemo } from "react";
import { Wind, Clock, Mountain, MapPin, Calendar, TrendingUp, Gauge, Compass } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface WindgramProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
  selectedHour?: number;
}

function getWindDirName(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getWindArrow(deg: number): string {
  if (deg == null) return "\u2192";
  const arrows = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWindColor(speed: number): string {
  if (speed < 5) return "#22c55e";
  if (speed < 12) return "#84cc16";
  if (speed < 20) return "#eab308";
  if (speed < 28) return "#f97316";
  return "#ef4444";
}

function getWindLabel(speed: number): string {
  if (speed < 3) return "Calma";
  if (speed < 8) return "Leggero";
  if (speed < 15) return "Moderato";
  if (speed < 22) return "Fresco";
  if (speed < 30) return "Forte";
  return "Molto forte";
}

export default function Windgram({ dayData, siteName, altitude, selectedHour }: WindgramProps) {
  const oreVolo = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    
    return dayData
      .filter((h) => {
        const ora = new Date(h.time).getHours();
        return ora >= 8 && ora <= 19;
      })
      .map((h) => {
        const ora = new Date(h.time).getHours();
        const speed = h.windSpeed ?? 0;
        const dir = h.windDir ?? 0;
        const gust = h.windGusts ?? speed;
        const cloud = h.cloudCover ?? 0;
        const temp = h.temperature ?? 0;
        const hum = h.humidity ?? 50;
        const spread = Math.max(0.5, temp - (h.dewPoint ?? temp - 8));
        const cloudBase = Math.round(altitude + spread * 125);
        
        return {
          ora,
          speed,
          dir,
          gust,
          cloud,
          temp,
          hum,
          cloudBase,
          dirName: getWindDirName(dir),
          arrow: getWindArrow(dir),
          color: getWindColor(speed),
          label: getWindLabel(speed),
        };
      })
      .sort((a, b) => a.ora - b.ora);
  }, [dayData, altitude]);

  const stats = useMemo(() => {
    if (oreVolo.length === 0) return null;
    const speeds = oreVolo.map((o) => o.speed);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);
    const minSpeed = Math.min(...speeds);
    const dominantDir = oreVolo
      .map((o) => o.dirName)
      .reduce((acc, dir) => {
        acc[dir] = (acc[dir] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    const dirDom = Object.entries(dominantDir).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/D";
    
    return { avgSpeed: Math.round(avgSpeed), maxSpeed: Math.round(maxSpeed), minSpeed: Math.round(minSpeed), dirDom };
  }, [oreVolo]);

  if (oreVolo.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Wind className="w-6 h-6 text-emerald-400" />
          <h3 className="text-white font-bold text-lg">Windgram &mdash; {siteName}</h3>
        </div>
        <div className="text-center py-8">
          <Mountain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nessun dato disponibile per questo decollo</p>
          <p className="text-slate-500 text-xs mt-1">Verifica la connessione o seleziona un altro giorno</p>
        </div>
      </div>
    );
  }

  const maxSpeed = Math.max(...oreVolo.map((o) => o.speed), 1);
  const maxGust = Math.max(...oreVolo.map((o) => o.gust), 1);

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/20 border border-cyan-400/40 flex items-center justify-center">
            <Wind className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Windgram &mdash; {siteName}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              <span>{altitude}m slm</span>
              <span className="text-slate-600">&middot;</span>
              <Calendar className="w-3 h-3" />
              <span>Ore 8:00&ndash;19:00</span>
            </div>
          </div>
        </div>
        
        {/* Stats rapidi */}
        {stats && (
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/60 rounded-lg px-3 py-1.5 border border-slate-700/50">
              <span className="text-slate-400">Vento medio</span>
              <span className="ml-2 font-bold text-cyan-300">{stats.avgSpeed} km/h</span>
            </div>
            <div className="bg-slate-800/60 rounded-lg px-3 py-1.5 border border-slate-700/50">
              <span className="text-slate-400">Max</span>
              <span className="ml-2 font-bold text-orange-300">{stats.maxSpeed} km/h</span>
            </div>
            <div className="bg-slate-800/60 rounded-lg px-3 py-1.5 border border-slate-700/50">
              <span className="text-slate-400">Direzione</span>
              <span className="ml-2 font-bold text-blue-300">{stats.dirDom}</span>
            </div>
          </div>
        )}
      </div>

      {/* Grafico vento */}
      <div className="relative">
        {/* Linea di riferimento base */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-700/30" />
        
        <div className="flex items-end justify-between gap-1 sm:gap-2 h-48 sm:h-56">
          {oreVolo.map((o, i) => {
            const barHeight = (o.speed / maxSpeed) * 100;
            const gustHeight = (o.gust / maxGust) * 100;
            const isPeak = o.speed === maxSpeed;
            
            return (
              <div key={o.ora} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                {/* Tooltip */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                  <div className="text-xs font-bold text-white">{String(o.ora).padStart(2, "0")}:00</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-cyan-300">{o.speed} km/h</span>
                    <span className="text-slate-500">&middot;</span>
                    <span className="text-orange-300">raf. {o.gust}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-blue-300">{o.arrow} {o.dirName}</span>
                    <span className="text-slate-500">&middot;</span>
                    <span className="text-amber-300">{o.temp}&deg;C</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Nuvole {o.cloud}% &middot; Base {o.cloudBase}m
                  </div>
                </div>

                {/* Barra vento */}
                <div 
                  className="w-full max-w-[28px] sm:max-w-[36px] rounded-t-lg transition-all duration-300 relative overflow-hidden"
                  style={{ 
                    height: `${Math.max(barHeight, 4)}%`,
                    background: `linear-gradient(180deg, ${o.color}cc, ${o.color}66)`,
                    boxShadow: isPeak ? `0 0 12px ${o.color}66` : "none"
                  }}
                >
                  {/* Barra raffiche */}
                  {o.gust > o.speed && (
                    <div 
                      className="absolute left-0 right-0 bottom-0 rounded-t-lg border-t-2 border-dashed"
                      style={{ 
                        height: `${Math.max(gustHeight - barHeight, 2)}%`,
                        borderColor: o.color,
                        opacity: 0.6
                      }}
                    />
                  )}
                </div>

                {/* Valore speed */}
                <div 
                  className="text-[10px] sm:text-xs font-bold mt-1 tabular-nums"
                  style={{ color: o.color }}
                >
                  {o.speed}
                </div>

                {/* Icona direzione */}
                <div className="text-sm mt-0.5" style={{ color: o.color }}>
                  {o.arrow}
                </div>

                {/* Ora */}
                <div className="text-[9px] sm:text-[10px] text-slate-500 mt-1 font-mono">
                  {String(o.ora).padStart(2, "0")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda colori - using < and > entities for JSX safety */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-3 border-t border-slate-700/30">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
            <span>< 5 km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#84cc16" }} />
            <span>5&ndash;12</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#eab308" }} />
            <span>12&ndash;20</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#f97316" }} />
            <span>20&ndash;28</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ef4444" }} />
            <span>> 28</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 ml-auto">
            <span className="w-3 h-1 rounded-sm border-t-2 border-dashed" style={{ borderColor: "#f97316" }} />
            <span>Raffiche</span>
          </div>
        </div>
      </div>

      {/* Tabella dettagli oraria */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/50 text-slate-500">
              <th className="text-left py-2 pr-3 font-medium">Ora</th>
              <th className="text-left py-2 px-3 font-medium">Vento</th>
              <th className="text-left py-2 px-3 font-medium">Raffiche</th>
              <th className="text-left py-2 px-3 font-medium">Direzione</th>
              <th className="text-left py-2 px-3 font-medium">Nuvole</th>
              <th className="text-left py-2 px-3 font-medium">Temp</th>
              <th className="text-left py-2 pl-3 font-medium">Base nubi</th>
              <th className="text-left py-2 pl-3 font-medium">Giudizio</th>
            </tr>
          </thead>
          <tbody>
            {oreVolo.map((o) => (
              <tr 
                key={o.ora} 
                className={`border-b border-slate-700/20 hover:bg-slate-800/40 transition-colors ${
                  o.ora === selectedHour ? "bg-cyan-900/20" : ""
                }`}
              >
                <td className="py-2 pr-3 font-bold text-white tabular-nums">
                  {String(o.ora).padStart(2, "0")}:00
                </td>
                <td className="py-2 px-3">
                  <span className="font-bold" style={{ color: o.color }}>{o.speed} km/h</span>
                </td>
                <td className="py-2 px-3 text-orange-300">
                  {o.gust > o.speed ? `${o.gust} km/h` : "\u2014"}
                </td>
                <td className="py-2 px-3 text-blue-300">
                  {o.arrow} {o.dirName} ({Math.round(o.dir)}&deg;)
                </td>
                <td className="py-2 px-3 text-slate-300">{o.cloud}%</td>
                <td className="py-2 px-3 text-amber-300">{Math.round(o.temp)}&deg;C</td>
                <td className="py-2 pl-3 text-purple-300">{o.cloudBase}m</td>
                <td className="py-2 pl-3">
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ 
                      color: o.color, 
                      borderColor: o.color + "40",
                      backgroundColor: o.color + "15"
                    }}
                  >
                    {o.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}