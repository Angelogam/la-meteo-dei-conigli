"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, X, Wind, Gauge, TrendingUp, Mountain } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface WindGramButtonProps {
  dayData: HourData[];
  siteAltitude: number;
  siteName?: string;
}

function getWindColor(speed: number): string {
  if (speed <= 5) return "#22c55e";
  if (speed <= 10) return "#06b6d4";
  if (speed <= 18) return "#eab308";
  if (speed <= 25) return "#f97316";
  return "#ef4444";
}

function getWindDirIcon(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

function getDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function getCloudEmoji(c: number): string {
  if (c < 15) return "☀️";
  if (c < 35) return "🌤️";
  if (c < 55) return "⛅";
  return "☁️";
}

function WindBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 6) : 6;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-right font-mono text-slate-300">{label}</span>
      <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const WindGramButton = ({ dayData, siteAltitude, siteName }: WindGramButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const data = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    const ore = dayData
      .filter((h) => {
        const hh = h.time.getHours();
        return hh >= 6 && hh <= 21;
      })
      .sort((a, b) => a.time.getHours() - b.time.getHours());
    if (ore.length < 4) return null;

    const date = ore[0].time.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const maxWind = Math.max(...ore.map((h) => h.windSpeed), 1);
    const maxGust = Math.max(...ore.map((h) => h.windGusts || 0), 1);
    const maxPress = Math.max(...ore.filter((h) => h.pressure).map((h) => h.pressure));
    const minPress = Math.min(...ore.filter((h) => h.pressure).map((h) => h.pressure));
    const pressRange = Math.max(maxPress - minPress, 1);

    return { ore, date, location: siteName || "", maxWind, maxGust, maxPress, minPress, pressRange };
  }, [dayData, siteAltitude, siteName]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition-all"
      >
        <BarChart3 className="w-4 h-4" />
        WindGram · {siteName}
      </button>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center max-w-sm">
          <p className="text-slate-400 text-base">Dati insufficienti</p>
          <p className="text-slate-500 text-sm mt-1">Servono almeno 4 ore di dati orari</p>
          <button onClick={() => setIsOpen(false)} className="mt-4 px-5 py-2 bg-slate-700 rounded-xl text-white text-sm font-bold hover:bg-slate-600">
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30">
          <div>
            <h3 className="text-lg font-bold text-white">WindGram · {data.location}</h3>
            <p className="text-sm text-slate-400">{data.date}</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-6">
          {/* Vento */}
          <section>
            <h4 className="text-sm font-bold text-sky-300 mb-3 flex items-center gap-2">
              <Wind className="w-4 h-4" /> Vento orario
            </h4>
            <div className="space-y-2">
              {data.ore.map((h) => {
                const hh = h.time.getHours();
                const w = h.windSpeed;
                const g = h.windGusts || 0;
                const d = h.windDir;
                const isStrong = g > w * 1.4;
                return (
                  <div key={hh} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-slate-400 font-mono font-bold">{String(hh).padStart(2, "0")}:00</span>
                    <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max((w / data.maxWind) * 100, 8)}%`, backgroundColor: getWindColor(w) }}
                      />
                    </div>
                    <span className="w-10 text-right font-bold text-white tabular-nums">{Math.round(w)}</span>
                    <span className="w-16 text-slate-400 text-center">{getWindDirIcon(d)}{getDirLabel(d)}</span>
                    {isStrong && <span className="w-10 text-right text-red-400 font-bold">{Math.round(g)}</span>}
                    <span className="text-base">{getCloudEmoji(h.cloudCover)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> ≤5</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> 6-10</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 11-18</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 19-25</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> over 25</span>
            </div>
          </section>

          {/* Pressione */}
          {data.pressRange > 1 && (
            <section>
              <h4 className="text-sm font-bold text-emerald-300 mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" /> Pressione atmosferica
              </h4>
              <div className="space-y-1.5">
                {data.ore.filter((h) => {
                  const hh = h.time.getHours();
                  return hh >= 8 && hh <= 19;
                }).map((h) => {
                  const hh = h.time.getHours();
                  const p = h.pressure;
                  const pct = ((p - data.minPress) / data.pressRange) * 100;
                  return (
                    <div key={hh} className="flex items-center gap-3 text-xs">
                      <span className="w-10 text-slate-400 font-mono text-right">{String(hh).padStart(2, "0")}:00</span>
                      <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right font-bold text-white">{Math.round(p)} hPa</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Gradiente termico */}
          <section>
            <h4 className="text-sm font-bold text-orange-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Gradiente termico
            </h4>
            <div className="space-y-1.5">
              {data.ore.filter((h) => {
                const hh = h.time.getHours();
                return hh >= 8 && hh <= 19;
              }).map((h) => {
                const hh = h.time.getHours();
                let grad = 0.98;
                if (h.temp80m != null) grad = ((h.temperature - h.temp80m) / 78) * 100;
                else if (h.temp120m != null) grad = ((h.temperature - h.temp120m) / 118) * 100;
                const gradColor = grad > 1.2 ? "#ef4444" : grad > 0.98 ? "#f97316" : "#22c55e";
                return (
                  <WindBar key={hh} value={grad * 5} max={8} label={`${String(hh).padStart(2, "0")}:00`} color={gradColor} />
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Instabile</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Neutro</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Stabile</span>
            </div>
          </section>

          {/* Base cumulo */}
          <section>
            <h4 className="text-sm font-bold text-green-300 mb-3 flex items-center gap-2">
              <Mountain className="w-4 h-4" /> Base cumulo & zero termico
            </h4>
            <div className="space-y-1.5">
              {data.ore.filter((h) => {
                const hh = h.time.getHours();
                return hh >= 8 && hh <= 19;
              }).map((h) => {
                const hh = h.time.getHours();
                const spread = h.temperature - h.dewPoint;
                const base = Math.max(200, Math.min(4000, Math.round(spread * 125))) + siteAltitude;
                const zero = Math.max(0, Math.round(siteAltitude + h.temperature / 0.0098));
                const termiche = calcolaTermiche(h, siteAltitude);
                const top = termiche.top;
                return (
                  <div key={hh} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-slate-400 font-mono text-right">{String(hh).padStart(2, "0")}:00</span>
                    <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-green-500/60 via-cyan-500/50 to-amber-500/40" style={{ width: `${(base / 5000) * 100}%` }} />
                    </div>
                    <span className="w-16 text-right text-green-300 font-bold">{base}m</span>
                    <span className="w-14 text-right text-cyan-300 tabular-nums">{zero}m</span>
                    <span className="w-14 text-right text-amber-300 tabular-nums">{top}m</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
              <span>🟢 Base</span>
              <span>🔵 Zero termico</span>
              <span>🟡 Top</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default WindGramButton;