"use client";

import React, { useMemo, useState } from "react";
import { Wind, TrendingUp, Calendar, MapPin, ChevronDown, ChevronUp } from "lucide-react";

interface LivelloVento {
  quota: number;
  speed: number;
  dir: number;
  gust: number;
}

interface WindgramProfessionaleProps {
  dati: {
    ora: number;
    quote: Record<number, { speed: number; dir: number }>;
    gust: number;
    temp: number;
  }[];
  quotaDecollo: number;
  siteName?: string;
  dataGiorno?: string;
  oraSelezionata?: number;
  onOraChange?: (ora: number) => void;
}

function getDirAbbrev(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWindColor(speed: number): { bg: string; text: string } {
  if (speed <= 8) return { bg: "bg-emerald-900/30", text: "text-emerald-300" };
  if (speed <= 15) return { bg: "bg-lime-900/30", text: "text-lime-300" };
  if (speed <= 22) return { bg: "bg-amber-900/30", text: "text-amber-300" };
  if (speed <= 30) return { bg: "bg-orange-900/40", text: "text-orange-300" };
  return { bg: "bg-red-900/40", text: "text-red-300" };
}

function getGustColor(speed: number): string {
  if (speed <= 12) return "text-emerald-300";
  if (speed <= 20) return "text-lime-300";
  if (speed <= 28) return "text-amber-300";
  if (speed <= 35) return "text-orange-300";
  return "text-red-300";
}

export default function WindgramProfessionale({
  dati,
  quotaDecollo,
  siteName,
  dataGiorno,
  oraSelezionata,
  onOraChange,
}: WindgramProfessionaleProps) {
  const [mostraTemp, setMostraTemp] = useState(true);

  // Genera tutte le quote dal decollo arrotondato al 250m fino a 4000m
  const quoteVisibili = useMemo(() => {
    if (!dati || dati.length === 0) return [];
    
    const partenza = Math.floor(quotaDecollo / 250) * 250;
    const quote: number[] = [];
    for (let q = partenza; q <= 4000; q += 250) {
      quote.push(q);
    }
    // Assicura che il decollo sia incluso
    if (!quote.includes(quotaDecollo)) {
      quote.push(quotaDecollo);
      quote.sort((a, b) => a - b);
    }
    return quote;
  }, [quotaDecollo, dati]);

  // Trova l'ora selezionata
  const oraData = useMemo(() => {
    if (!dati || dati.length === 0) return null;
    const target = dati.find(d => d.ora === oraSelezionata) || dati[0];
    return target;
  }, [dati, oraSelezionata]);

  if (!oraData || quoteVisibili.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-8 text-center">
        <Wind className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Nessun dato vento disponibile</p>
      </div>
    );
  }

  const maxSpeed = Math.max(
    ...quoteVisibili.map(q => oraData.quote[q]?.speed || 0),
    ...dati.map(d => d.gust || 0),
    1
  );

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-800/40 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Windgram</h3>
          {siteName && (
            <span className="text-xs text-slate-400 hidden md:inline">{siteName}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {dataGiorno && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dataGiorno}
            </span>
          )}
          <button
            onClick={() => setMostraTemp(!mostraTemp)}
            className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
              mostraTemp 
                ? "bg-amber-900/30 border-amber-500/40 text-amber-300" 
                : "bg-slate-800 border-slate-600 text-slate-400"
            }`}
          >
            {mostraTemp ? "T° ON" : "T° OFF"}
          </button>
        </div>
      </div>

      {/* Selettore ora */}
      <div className="flex gap-1 overflow-x-auto px-3 py-2 bg-slate-800/20 border-b border-slate-700/30">
        {dati.map(d => (
          <button
            key={d.ora}
            onClick={() => onOraChange?.(d.ora)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              d.ora === oraSelezionata
                ? "bg-cyan-600/40 border border-cyan-400/50 text-cyan-200"
                : "bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:bg-slate-700/40"
            }`}
          >
            {String(d.ora).padStart(2, "0")}:00
          </button>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-[9px] text-slate-500 bg-slate-800/20 border-b border-slate-700/30">
        <span className="font-semibold text-slate-400">Velocità vento:</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/50" /> ≤8</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-lime-500/50" /> 9–15</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/50" /> 16–22</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500/50" /> 23–30</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/50" /> >30</span>
        <span className="mx-1 text-slate-700">|</span>
        <span>🪂 = quota decollo</span>
      </div>

      {/* Tabella windgram */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/30">
              <th className="px-3 py-2 text-left font-semibold w-20">Quota</th>
              <th className="px-2 py-2 text-left font-semibold">Vento</th>
              <th className="px-2 py-2 text-center font-semibold w-16">Raffiche</th>
              <th className="px-2 py-2 text-center font-semibold w-16">Dir</th>
              {mostraTemp && <th className="px-2 py-2 text-center font-semibold w-14">T°</th>}
            </tr>
          </thead>
          <tbody>
            {quoteVisibili.map(q => {
              const v = oraData.quote[q];
              const isDecollo = Math.abs(q - quotaDecollo) < 100;
              const speed = v?.speed || 0;
              const dir = v?.dir || 0;
              const gust = oraData.gust;
              const temp = oraData.temp;
              const color = getWindColor(speed);
              const pct = Math.max(8, (speed / maxSpeed) * 100);

              return (
                <tr 
                  key={q} 
                  className={`border-b border-slate-800/50 transition-colors ${
                    isDecollo 
                      ? "bg-emerald-900/20 hover:bg-emerald-900/30" 
                      : "hover:bg-slate-700/20"
                  }`}
                >
                  {/* Quota */}
                  <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {isDecollo && <span className="text-emerald-400">🪂</span>}
                      {q}m
                    </span>
                  </td>

                  {/* Barra vento */}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 h-5 bg-slate-800/60 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${color.bg} transition-all`}
                          style={{ width: `${pct}%` }}
                        >
                          <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-white z-10">
                            {speed >= 15 && Math.round(speed)}
                          </span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold tabular-nums ${color.text} shrink-0 w-10 text-right`}>
                        {Math.round(speed)}
                      </span>
                    </div>
                  </td>

                  {/* Raffiche */}
                  <td className="px-2 py-2 text-center">
                    <span className={`font-mono font-bold ${getGustColor(gust)}`}>
                      {Math.round(gust)}
                    </span>
                  </td>

                  {/* Direzione */}
                  <td className="px-2 py-2 text-center">
                    <span className="font-mono text-slate-300 whitespace-nowrap">
                      <span className="text-base mr-1">{getDirArrow(dir)}</span>
                      <span className="font-bold">{getDirAbbrev(dir)}</span>
                      <span className="text-[9px] text-slate-500 ml-0.5">({Math.round(dir)}°)</span>
                    </span>
                  </td>

                  {/* Temperatura */}
                  {mostraTemp && (
                    <td className="px-2 py-2 text-center">
                      <span className="font-mono text-amber-300 font-bold">
                        {Math.round(temp)}°
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 bg-slate-800/20 border-t border-slate-700/30 text-[10px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-cyan-400" />
          Max {Math.round(maxSpeed)} km/h · Decollo {quotaDecollo}m
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {siteName || "Windgram"}
        </span>
      </div>
    </div>
  );
}