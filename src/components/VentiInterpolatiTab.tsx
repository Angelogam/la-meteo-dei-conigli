30 escaping in VentiInterpolatiTab">
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, Calendar, MapPin, TrendingUp, Info } from "lucide-react";
import { getVentiInterpolati, type VentiInterpolatiData } from "@/utils/getVentiInterpolati";

function getSpeedColor(speed: number): string {
  if (speed <= 8) return "text-emerald-300";
  if (speed <= 15) return "text-lime-300";
  if (speed <= 22) return "text-amber-300";
  if (speed <= 30) return "text-orange-300";
  return "text-red-400";
}

function getSpeedBarColor(speed: number): string {
  if (speed <= 8) return "bg-emerald-400";
  if (speed <= 15) return "bg-lime-400";
  if (speed <= 22) return "bg-amber-400";
  if (speed <= 30) return "bg-orange-400";
  return "bg-red-400";
}

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16] || "N";
}

function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return `${giorni[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface VentiInterpolatiTabProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  oraCorrente?: number;
  onOraChange?: (ora: number) => void;
  siteName?: string;
}

const QUOTE_GRAFICO = [500, 1000, 1500, 2000, 2500, 3000];

export default function VentiInterpolatiTab({ lat, lon, quotaDecollo, selectedDay, oraCorrente = 12, onOraChange, siteName }: VentiInterpolatiTabProps) {
  const [data, setData] = useState<VentiInterpolatiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oraSelezionata, setOraSelezionata] = useState(oraCorrente);

  useEffect(() => {
    if (!lat || !lon || !quotaDecollo) return;
    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    const dayStr = targetDate.toISOString().split("T")[0];

    setLoading(true);
    setError(null);

    getVentiInterpolati(lat, lon, quotaDecollo, dayStr)
      .then(result => {
        setData(result);
        setLoading(false);
        if (result.ventoOrario.length > 0) {
          const closest = result.ventoOrario.reduce((prev, curr) =>
            Math.abs(curr.ora - oraCorrente) < Math.abs(prev.ora - oraCorrente) ? curr : prev
          );
          setOraSelezionata(closest.ora);
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "Errore");
        setLoading(false);
      });
  }, [lat, lon, quotaDecollo, selectedDay, oraCorrente]);

  const oggi = new Date();
  const targetDate = new Date(oggi);
  targetDate.setDate(oggi.getDate() + selectedDay);
  const dataGiorno = formatDateShort(targetDate);

  // Dati per il grafico verticale
  const oraData = useMemo(() => {
    if (!data) return null;
    return data.ventoOrario.find(v => v.ora === oraSelezionata) || data.ventoOrario[0] || null;
  }, [data, oraSelezionata]);

  const quoteVisibili = useMemo(() => {
    if (!oraData) return [];
    const quote: { quota: number; speed: number; dir: number }[] = [];
    for (const q of QUOTE_GRAFICO) {
      if (oraData.quote[q]) {
        quote.push({ quota: q, speed: oraData.quote[q].speed, dir: oraData.quote[q].dir });
      }
    }
    if (!quote.find(q => Math.abs(q.quota - quotaDecollo) < 100)) {
      const closest = Object.entries(oraData.quote)
        .map(([q, v]) => ({ quota: parseInt(q), ...v }))
        .sort((a, b) => Math.abs(a.quota - quotaDecollo) - Math.abs(b.quota - quotaDecollo))[0];
      if (closest) quote.push(closest);
    }
    return quote.sort((a, b) => a.quota - b.quota);
  }, [oraData, quotaDecollo]);

  const maxSpeed = useMemo(() => Math.max(...quoteVisibili.map(q => q.speed), 1), [quoteVisibili]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Calcolo venti per {siteName || "decollo"}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Errore venti</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || data.ventoOrario.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento per {siteName || "decollo"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-slate-800/60 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{siteName || "Decollo"} — Venti in quota</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>Decollo {quotaDecollo}m</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {data.ventoOrario.map(v => (
          <button
            key={v.ora}
            onClick={() => {
              setOraSelezionata(v.ora);
              onOraChange?.(v.ora);
            }}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              v.ora === oraSelezionata
                ? "bg-blue-600/30 border-blue-400/50 text-blue-200"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/40"
            }`}
          >
            {String(v.ora).padStart(2, "0")}:00
          </button>
        ))}
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            Profilo verticale · {String(oraSelezionata).padStart(2, "0")}:00
          </h4>
          <span className="text-[10px] text-slate-500 ml-auto">{quotaDecollo}m → 3000m</span>
        </div>

        <div className="space-y-2">
          {quoteVisibili.map((q) => {
            const pct = Math.max(6, (q.speed / maxSpeed) * 100);
            const isDecollo = Math.abs(q.quota - quotaDecollo) < 150;
            return (
              <div key={q.quota} className="grid grid-cols-[3.5rem_1fr_4.5rem] gap-2 items-center">
                <span className="text-[10px] md:text-xs font-mono text-slate-500 text-right">
                  {q.quota}m
                  {isDecollo && <span className="text-emerald-400 ml-0.5">🪂</span>}
                </span>
                <div className="h-5 md:h-6 bg-slate-800/60 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${getSpeedBarColor(q.speed)} transition-all`}
                    style={{ width: `${pct}%` }}
                  >
                    <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] md:text-[10px] text-white font-bold">
                      {q.speed >= 15 && Math.round(q.speed)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] md:text-xs font-mono">
                  <span className={getSpeedColor(q.speed)}>{Math.round(q.speed)}</span>
                  <span className="text-slate-500">km/h</span>
                  <span className="text-slate-400">{getDirArrow(q.dir)}{getDirAbbrev(q.dir)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-700/30">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> ≤8</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-lime-400" /> 9–15</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> 16–22</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> 23–30</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> oltre 30</span>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-700/30 text-xs font-bold text-slate-400 uppercase tracking-wider">
          Riepilogo orario vento al decollo ({quotaDecollo}m)
        </div>
        <div className="divide-y divide-slate-700/20">
          {data.ventoOrario.map(v => {
            const ventoDecollo = v.quote[quotaDecollo] || v.quote[Object.keys(v.quote)[0]] || { speed: 0, dir: 0 };
            const isSelected = v.ora === oraSelezionata;
            return (
              <button
                key={v.ora}
                onClick={() => {
                  setOraSelezionata(v.ora);
                  onOraChange?.(v.ora);
                }}
                className={`w-full grid grid-cols-[3rem_1fr_3rem_3rem] gap-2 px-4 py-2 text-xs transition-all text-left ${
                  isSelected ? "bg-blue-900/20" : "hover:bg-slate-700/30"
                }`}
              >
                <span className={`font-bold font-mono ${isSelected ? "text-blue-300" : "text-slate-300"}`}>
                  {String(v.ora).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getSpeedBarColor(ventoDecollo.speed)}`}
                      style={{ width: `${Math.min(100, (ventoDecollo.speed / 40) * 100)}%` }}
                    />
                  </div>
                  <span className={`font-mono tabular-nums ${getSpeedColor(ventoDecollo.speed)}`}>
                    {Math.round(ventoDecollo.speed)}
                  </span>
                </div>
                <span className="text-slate-400 text-center font-mono">
                  {getDirArrow(ventoDecollo.dir)}
                </span>
                <span className="text-slate-500 text-right font-mono">
                  {Math.round(v.gust)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-1.5 border-t border-slate-700/30 text-[9px] text-slate-500 flex justify-between">
          <span>Ora</span>
          <span>Vento</span>
          <span>Dir</span>
          <span>Raff.</span>
        </div>
      </div>
    </div>
  );
}