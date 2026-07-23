"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, Calendar, TrendingUp, Gauge } from "lucide-react";
import { weatherService, type WindProfileResult } from "@/services/weatherService";

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

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const QUOTE_LABELS = [500, 1000, 1500, 2000, 2500, 3000];

function interpolateWind(quote: Record<number, { speed: number; dir: number }>, targetQuota: number): { speed: number; dir: number } | null {
  const keys = Object.keys(quote).map(Number).sort((a, b) => a - b);
  if (keys.length === 0) return null;
  if (keys.length === 1) return quote[keys[0]];
  const lower = keys.filter(k => k <= targetQuota).pop();
  const upper = keys.filter(k => k >= targetQuota).shift();
  if (!lower && !upper) return null;
  if (!lower && upper) return quote[upper];
  if (lower && !upper) return quote[lower];
  if (lower === upper) return quote[lower];
  const ratio = (targetQuota - lower) / (upper - lower);
  const speed = Math.round(quote[lower].speed + (quote[upper].speed - quote[lower].speed) * ratio);
  let dDiff = quote[upper].dir - quote[lower].dir;
  if (dDiff > 180) dDiff -= 360;
  if (dDiff < -180) dDiff += 360;
  const dir = ((quote[lower].dir + dDiff * ratio) % 360 + 360) % 360;
  return { speed: Math.round(speed), dir: Math.round(dir) };
}

export default function VentiInterpolatiTab({
  lat, lon, quotaDecollo, selectedDay, oraCorrente = 12, onOraChange, siteName
}: VentiInterpolatiTabProps) {
  const [windData, setWindData] = useState<WindProfileResult | null>(null);
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

    weatherService.fetchWindProfile(lat, lon, dayStr)
      .then(result => {
        setWindData(result);
        setLoading(false);
        if (result?.ventoOrario?.length > 0) {
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

  const oraData = useMemo(() => {
    if (!windData) return null;
    return windData.ventoOrario.find(v => v.ora === oraSelezionata) || windData.ventoOrario[0] || null;
  }, [windData, oraSelezionata]);

  const quoteVisibili = useMemo(() => {
    if (!oraData) return [];
    const ris: { quota: number; speed: number; dir: number }[] = [];
    for (const q of QUOTE_LABELS) {
      if (oraData.quote[q]) {
        ris.push({ quota: q, speed: oraData.quote[q].speed, dir: oraData.quote[q].dir });
      }
    }
    // Aggiungi quota decollo interpolata se non è già presente
    const decolloInterpolato = interpolateWind(oraData.quote, quotaDecollo);
    if (decolloInterpolato && !ris.find(r => Math.abs(r.quota - quotaDecollo) < 50)) {
      ris.push({ quota: quotaDecollo, speed: decolloInterpolato.speed, dir: decolloInterpolato.dir });
    }
    return ris.sort((a, b) =><dyad-write path="src/components/VentiInterpolatiTab.tsx" description="Complete VentiInterpolatiTab using weatherService.fetchWindProfile">
    });
    return ris.sort((a, b) => a.quota - b.quota);
  }, [oraData, quotaDecollo]);

  const maxSpeed = useMemo(() => Math.max(...quoteVisibili.map(q => q.speed), 1), [quoteVisibili]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Caricamento venti per {siteName || "decollo"}...</span>
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

  if (!windData || windData.ventoOrario.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento per {siteName || "decollo"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/50 border border-cyan-500/30 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-800/60 to-cyan-700/30 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <Wind className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <div className="text-base font-bold text-white">{siteName || "Decollo"} — Venti in quota</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>{quotaDecollo}m slm</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {windData.ventoOrario.filter(v => HOURS.includes(v.ora)).map(v => (
          <button
            key={v.ora}
            onClick={() => { setOraSelezionata(v.ora); onOraChange?.(v.ora); }}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              v.ora === oraSelezionata
                ? "bg-cyan-600/30 border-cyan-400/50 text-cyan-200 shadow-sm"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/40"
            }`}
          >
            {String(v.ora).padStart(2, "0")}:00
          </button>
        ))}
      </div>

      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Profilo verticale — {String(oraSelezionata).padStart(2, "0")}:00
            </h4>
          </div>
          <span className="text-[10px] text-slate-500">{quotaDecollo}m → 3000m</span>
        </div>

        <div className="space-y-2">
          {quoteVisibili.map((q) => {
            const pct = Math.max(6, (q.speed / maxSpeed) * 100);
            const isDecollo = Math.abs(q.quota - quotaDecollo) < 150;
            return (
              <div key={q.quota} className="grid grid-cols-[3.5rem_1fr_5rem] gap-2 items-center">
                <span className={`text-xs font-mono text-right ${isDecollo ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                  {q.quota}m{isDecollo && <span className="ml-0.5">🪂</span>}
                </span>
                <div className="h-6 bg-slate-800/60 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      q.speed <= 8 ? "bg-emerald-400" :
                      q.speed <= 15 ? "bg-lime-400" :
                      q.speed <= 22 ? "bg-amber-400" :
                      q.speed <= 30 ? "bg-orange-400" :
                      "bg-red-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  >
                    <span className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] text-white font-bold">
                      {q.speed >= 12 && Math.round(q.speed)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono">
                  <span className={`font-bold ${
                    q.speed <= 8 ? "text-emerald-300" :
                    q.speed <= 15 ? "text-lime-300" :
                    q.speed <= 22 ? "text-amber-300" :
                    q.speed <= 30 ? "text-orange-300" :
                    "text-red-300"
                  }`}>{Math.round(q.speed)}</span>
                  <span className="text-slate-500">km/h</span>
                  <span className="text-sky-300 ml-1">{getDirArrow(q.dir)}{getDirAbbrev(q.dir)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-700/30">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400" /> {"<="}8</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-lime-400" /> 9–15</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400" /> 16–22</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400" /> 23–30</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400" /> {">"}30 km/h</span>
          <span className="ml-2 flex items-center gap-1"><span className="text-emerald-400">🪂</span> Decollo</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/30">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Vento al decollo ({quotaDecollo}m)</span>
        </div>
        <div className="divide-y divide-slate-700/20">
          {windData.ventoOrario.filter(v => HOURS.includes(v.ora)).map(v => {
            const ventoDecollo = interpolateWind(v.quote, quotaDecollo) || { speed: 0, dir: 0 };
            const isSelected = v.ora === oraSelezionata;
            return (
              <button
                key={v.ora}
                onClick={() => { setOraSelezionata(v.ora); onOraChange?.(v.ora); }}
                className={`w-full grid grid-cols-[3rem_1fr_3.5rem_3rem] gap-2 px-5 py-3 text-xs transition-all text-left ${
                  isSelected ? "bg-cyan-900/20 border-l-2 border-l-cyan-400" : "hover:bg-slate-700/30"
                }`}
              >
                <span className={`font-bold font-mono ${isSelected ? "text-cyan-300" : "text-slate-300"}`}>{String(v.ora).padStart(2, "0")}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      ventoDecollo.speed <= 8 ? "bg-emerald-400" :
                      ventoDecollo.speed <= 15 ? "bg-lime-400" :
                      ventoDecollo.speed <= 22 ? "bg-amber-400" :
                      ventoDecollo.speed <= 30 ? "bg-orange-400" :
                      "bg-red-400"
                    }`} style={{ width: `${Math.min(100, (ventoDecollo.speed / 40) * 100)}%` }} />
                  </div>
                  <span className={`font-bold font-mono tabular-nums w-8 text-right ${
                    ventoDecollo.speed <= 8 ? "text-emerald-300" :
                    ventoDecollo.speed <= 15 ? "text-lime-300" :
                    ventoDecollo.speed <= 22 ? "text-amber-300" :
                    ventoDecollo.speed <= 30 ? "text-orange-300" :
                    "text-red-300"
                  }`}>{Math.round(ventoDecollo.speed)}</span>
                </div>
                <span className="text-sky-300 text-center font-mono">{getDirArrow(ventoDecollo.dir)} {getDirAbbrev(ventoDecollo.dir)}</span>
                <span className="text-red-300 text-right font-mono">{Math.round(v.gust)}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[3rem_1fr_3.5rem_3rem] gap-2 px-5 py-2 border-t border-slate-700/30 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
          <span>Ora</span>
          <span>Vento</span>
          <span className="text-center">Dir</span>
          <span className="text-right">Raff.</span>
        </div>
      </div>
    </div>
  );
}