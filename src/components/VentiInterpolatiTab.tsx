"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, Calendar, TrendingUp, Gauge } from "lucide-react";
import { weatherService, type WindProfileResult } from "@/services/weatherService";

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const QUOTES = [500, 1000, 1500, 2000, 2500, 3000];

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];

function dirAbbrev(deg: number): string {
  return DIRS[Math.round(deg / 22.5) % 16] || "N";
}
function dirArrow(deg: number): string {
  return ARROWS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}
function formatShort(d: Date): string {
  if (!d || isNaN(d.getTime())) return "";
  const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function interpolate(quote: Record<number, { speed: number; dir: number }>, target: number) {
  const keys = Object.keys(quote).map(Number).sort((a, b) => a - b);
  if (!keys.length) return null;
  if (keys.length === 1) return quote[keys[0]];
  const lo = keys.filter(k => k <= target).pop();
  const hi = keys.filter(k => k >= target).shift();
  if (!lo && hi) return quote[hi];
  if (lo && !hi) return quote[lo];
  if (lo === hi) return quote[lo];
  const r = (target - lo) / (hi - lo);
  const speed = Math.round(quote[lo].speed + (quote[hi].speed - quote[lo].speed) * r);
  let dd = quote[hi].dir - quote[lo].dir;
  if (dd > 180) dd -= 360;
  if (dd < -180) dd += 360;
  const dir = ((quote[lo].dir + dd * r) % 360 + 360) % 360;
  return { speed, dir: Math.round(dir) };
}
function barColor(s: number) {
  if (s <= 8) return "bg-emerald-400";
  if (s <= 15) return "bg-lime-400";
  if (s <= 22) return "bg-amber-400";
  if (s <= 30) return "bg-orange-400";
  return "bg-red-400";
}
function textColor(s: number) {
  if (s <= 8) return "text-emerald-300";
  if (s <= 15) return "text-lime-300";
  if (s <= 22) return "text-amber-300";
  if (s <= 30) return "text-orange-300";
  return "text-red-300";
}

interface Props {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  oraCorrente?: number;
  onOraChange?: (ora: number) => void;
  siteName?: string;
}

export default function VentiInterpolatiTab({
  lat, lon, quotaDecollo, selectedDay,
  oraCorrente = 12, onOraChange, siteName
}: Props) {
  const [windData, setWindData] = useState<WindProfileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOra, setSelectedOra] = useState(oraCorrente);

  useEffect(() => {
    if (!lat || !lon || !quotaDecollo) return;
    const t = new Date();
    t.setDate(t.getDate() + selectedDay);
    const ds = t.toISOString().split("T")[0];
    setLoading(true);
    setError(null);
    weatherService.fetchWindProfile(lat, lon, ds)
      .then(result => {
        setWindData(result);
        setLoading(false);
        if (result?.ventoOrario?.length) {
          const c = result.ventoOrario.reduce((p, v) =>
            Math.abs(v.ora - oraCorrente) < Math.abs(p.ora - oraCorrente) ? v : p
          );
          setSelectedOra(c.ora);
        }
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : "Errore");
        setLoading(false);
      });
  }, [lat, lon, quotaDecollo, selectedDay, oraCorrente]);

  const dayLabel = formatShort(new Date(Date.now() + selectedDay * 86400000));

  const detail = useMemo(() => {
    if (!windData) return null;
    return windData.ventoOrario.find(v => v.ora === selectedOra) || windData.ventoOrario[0] || null;
  }, [windData, selectedOra]);

  const levels = useMemo(() => {
    if (!detail) return [];
    const items: { q: number; s: number; d: number }[] = [];
    for (const q of QUOTES) {
      if (detail.quote[q]) items.push({ q, s: detail.quote[q].speed, d: detail.quote[q].dir });
    }
    const interp = interpolate(detail.quote, quotaDecollo);
    if (interp && !items.find(x => Math.abs(x.q - quotaDecollo) < 50)) {
      items.push({ q: quotaDecollo, s: interp.speed, d: interp.dir });
    }
    return items.sort((a, b) => a.q - b.q);
  }, [detail, quotaDecollo]);

  const maxSpeed = useMemo(() => Math.max(...levels.map(x => x.s), 1), [levels]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
      <span>Caricamento venti per {siteName || "decollo"}...</span>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Wind className="w-16 h-16 text-slate-600 mb-4" />
      <p className="text-lg font-bold">Errore venti</p>
      <p className="text-sm text-slate-500 mt-1">{error}</p>
    </div>
  );
  if (!windData || !windData.ventoOrario.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Wind className="w-16 h-16 text-slate-600 mb-4" />
      <p className="text-lg font-bold">Nessun dato vento per {siteName || "decollo"}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/50 border border-cyan-500/30 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-800/60 to-cyan-700/30 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <Wind className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <div className="text-base font-bold text-white">{siteName || "Decollo"} — Venti in quota</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <Calendar className="w-3.5 h-3.5" /><span>{dayLabel}</span>
            <span className="text-slate-600">·</span><span>{quotaDecollo}m slm</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {windData.ventoOrario.filter(v => HOURS.includes(v.ora)).map(v => (
          <button key={v.ora} onClick={() => { setSelectedOra(v.ora); onOraChange?.(v.ora); }}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              v.ora === selectedOra
                ? "bg-cyan-600/30 border-cyan-400/50 text-cyan-200 shadow-sm"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/40"
            }`}>
            {String(v.ora).padStart(2, "0")}:00
          </button>
        ))}
      </div>

      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Profilo verticale — {String(selectedOra).padStart(2, "0")}:00</h4>
          </div>
          <span className="text-[10px] text-slate-500">{quotaDecollo}m → 3000m</span>
        </div>
        <div className="space-y-2">
          {levels.map(l => {
            const pct = Math.max(6, (l.s / maxSpeed) * 100);
            const isDecollo = Math.abs(l.q - quotaDecollo) < 150;
            return (
              <div key={l.q} className="grid grid-cols-[3.5rem_1fr_5rem] gap-2 items-center">
                <span className={`text-xs font-mono text-right ${isDecollo ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                  {l.q}m{isDecollo && <span className="ml-0.5">🪂</span>}
                </span>
                <div className="h-6 bg-slate-800/60 rounded-full overflow-hidden relative">
                  <div className={`h-full rounded-full transition-all ${barColor(l.s)}`} style={{ width: `${pct}%` }}>
                    <span className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] text-white font-bold">
                      {l.s >= 12 && Math.round(l.s)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono">
                  <span className={`font-bold ${textColor(l.s)}`}>{Math.round(l.s)}</span>
                  <span className="text-slate-500">km/h</span>
                  <span className="text-sky-300 ml-1">{dirArrow(l.d)}{dirAbbrev(l.d)}</span>
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
            const vd = interpolate(v.quote, quotaDecollo) || { speed: 0, dir: 0 };
            const isSel = v.ora === selectedOra;
            return (
              <button key={v.ora} onClick={() => { setSelectedOra(v.ora); onOraChange?.(v.ora); }}
                className={`w-full grid grid-cols-[3rem_1fr_3.5rem_3rem] gap-2 px-5 py-3 text-xs transition-all text-left ${
                  isSel ? "bg-cyan-900/20 border-l-2 border-l-cyan-400" : "hover:bg-slate-700/30"
                }`}>
                <span className={`font-bold font-mono ${isSel ? "text-cyan-300" : "text-slate-300"}`}>
                  {String(v.ora).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor(vd.speed)}`}
                      style={{ width: `${Math.min(100, (vd.speed / 40) * 100)}%` }} />
                  </div>
                  <span className={`font-bold font-mono tabular-nums w-8 text-right ${textColor(vd.speed)}`}>
                    {Math.round(vd.speed)}
                  </span>
                </div>
                <span className="text-sky-300 text-center font-mono">{dirArrow(vd.dir)} {dirAbbrev(vd.dir)}</span>
                <span className="text-red-300 text-right font-mono">{Math.round(v.gust)}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[3rem_1fr_3.5rem_3rem] gap-2 px-5 py-2 border-t border-slate-700/30 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
          <span>Ora</span><span>Vento</span><span className="text-center">Dir</span><span className="text-right">Raff.</span>
        </div>
      </div>
    </div>
  );
}