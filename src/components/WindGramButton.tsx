"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, X, Layers, Wind, Gauge, TrendingUp, Mountain } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface WindGramButtonProps {
  dayData: HourData[];
  siteAltitude: number;
  siteName?: string;
}

function getWindColor(speed: number): string {
  if (speed <= 5) return "#4ade80";
  if (speed <= 10) return "#22d3ee";
  if (speed <= 18) return "#fbbf24";
  if (speed <= 25) return "#fb923c";
  return "#f87171";
}

function getWindDirIcon(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

function getCloudDesc(c: number): string {
  if (c < 15) return "☀️";
  if (c < 35) return "🌤️";
  if (c < 55) return "⛅";
  if (c < 75) return "☁️";
  return "☁️";
}

function getDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
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

    const dataStr = ore[0].time.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const maxWind = Math.max(...ore.map((h) => h.windSpeed), 1);
    const maxCloudBase = Math.max(...ore.map((h) => {
      const spread = h.temperature - h.dewPoint;
      return Math.max(200, Math.min(4000, Math.round(spread * 125))) + siteAltitude;
    }), 1500);

    return {
      hours: ore.map((h) => h.time.getHours()),
      date: dataStr,
      location: siteName || "",
      maxWind,
      maxCloudBase,
      ore,
    };
  }, [dayData, siteAltitude, siteName]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 shadow-lg shadow-orange-500/20 transition-all"
      >
        <BarChart3 className="w-4 h-4" />
        WindGram
      </button>

      {isOpen && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-2 sm:p-6 overflow-auto">
          <div className="relative w-full max-w-5xl bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-800/40 to-rose-700/20 border border-orange-500/30 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">WindGram · {data.location}</h3>
                  <p className="text-sm text-slate-400">{data.date}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 overflow-auto max-h-[80vh]">
              <PanelWind ore={data.ore} maxWind={data.maxWind} />
              <PanelPressure ore={data.ore} />
              <PanelThermic ore={data.ore} alt={siteAltitude} />
              <PanelCloudBase ore={data.ore} alt={siteAltitude} maxCloudBase={data.maxCloudBase} />

              <div className="flex flex-wrap gap-4 text-sm text-slate-400 bg-slate-800/50 rounded-xl px-4 py-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-400"></span> ≤5
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-400"></span> 6-10
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span> 11-18
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-orange-400"></span> 19-25
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400"></span> >25 km/h
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && !data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center">
            <p className="text-slate-400 text-lg">Dati insufficienti per il WindGram</p>
            <p className="text-slate-500 text-sm mt-2">Sono necessarie almeno 4 ore di dati orari</p>
            <button onClick={() => setIsOpen(false)} className="mt-4 px-4 py-2 bg-slate-700 rounded-lg text-white text-sm">Chiudi</button>
          </div>
        </div>
      )}
    </>
  );
};

const PanelWind = ({ ore, maxWind }: { ore: HourData[]; maxWind: number }) => {
  return (
    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
      <div className="flex items-center gap-2 mb-3">
        <Wind className="w-5 h-5 text-sky-400" />
        <h4 className="text-sm font-bold text-sky-300 uppercase tracking-wide">Vento · km/h</h4>
      </div>
      <div className="space-y-1.5">
        {ore.map((h) => {
          const hh = h.time.getHours();
          const w = h.windSpeed;
          const d = h.windDir;
          const g = h.windGusts || 0;
          const pct = maxWind > 0 ? (w / maxWind) * 100 : 10;
          return (
            <div key={hh} className="grid grid-cols-[60px_1fr_70px_120px] gap-2 items-center text-sm">
              <span className="text-slate-400 font-mono font-bold">{String(hh).padStart(2, "0")}:00</span>
              <div className="h-5 bg-slate-700/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: getWindColor(w) }} />
              </div>
              <span className="font-bold text-white tabular-nums text-right">{Math.round(w)}</span>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-base">{getWindDirIcon(d)}</span>
                <span>{getDirLabel(d)} ({Math.round(d)}°)</span>
                {g > 0 && g > w * 1.3 && (
                  <span className="text-red-300 text-xs ml-auto">⛵{Math.round(g)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PanelPressure = ({ ore }: { ore: HourData[] }) => {
  const dayHours = ore.filter((h) => {
    const hh = h.time.getHours();
    return hh >= 8 && hh <= 19;
  });
  if (dayHours.length < 3) return null;

  const pressures = dayHours.map((h) => h.pressure);
  const minP = Math.min(...pressures);
  const maxP = Math.max(...pressures);
  const range = Math.max(maxP - minP, 1);

  return (
    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-5 h-5 text-emerald-400" />
        <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wide">Pressione · hPa</h4>
      </div>
      <div className="space-y-1.5">
        {dayHours.map((h) => {
          const hh = h.time.getHours();
          const p = h.pressure;
          const pct = range > 0 ? ((p - minP) / range) * 100 : 50;
          return (
            <div key={hh} className="grid grid-cols-[60px_1fr_80px] gap-2 items-center text-sm">
              <span className="text-slate-400 font-mono font-bold">{String(hh).padStart(2, "0")}:00</span>
              <div className="h-4 bg-slate-700/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 to-yellow-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="font-bold text-white tabular-nums text-right">{Math.round(p)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PanelThermic = ({ ore, alt }: { ore: HourData[]; alt: number }) => {
  const dayHours = ore.filter((h) => {
    const hh = h.time.getHours();
    return hh >= 8 && hh <= 19;
  });
  if (dayHours.length < 3) return null;

  const maxGrad = Math.max(...dayHours.map((h) => {
    let grad = 0.98;
    if (h.temp80m != null) grad = ((h.temperature - h.temp80m) / 78) * 100;
    else if (h.temp120m != null) grad = ((h.temperature - h.temp120m) / 118) * 100;
    return grad;
  }), 1);

  return (
    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-orange-400" />
        <h4 className="text-sm font-bold text-orange-300 uppercase tracking-wide">Gradiente termico · °C/100m</h4>
      </div>
      <div className="space-y-1.5">
        {dayHours.map((h) => {
          const hh = h.time.getHours();
          let grad = 0.98;
          if (h.temp80m != null) grad = ((h.temperature - h.temp80m) / 78) * 100;
          else if (h.temp120m != null) grad = ((h.temperature - h.temp120m) / 118) * 100;

          const pct = (grad / maxGrad) * 100;
          const gradColor = grad > 1.2 ? "#ef4444" : grad > 0.98 ? "#f97316" : grad > 0.7 ? "#22c55e" : "#3b82f6";
          return (
            <div key={hh} className="grid grid-cols-[60px_1fr_100px_40px] gap-2 items-center text-sm">
              <span className="text-slate-400 font-mono font-bold">{String(hh).padStart(2, "0")}:00</span>
              <div className="h-4 bg-slate-700/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: gradColor }} />
              </div>
              <span className="font-bold tabular-nums text-right" style={{ color: gradColor }}>{grad.toFixed(2)}</span>
              <span className="text-lg">{getCloudDesc(h.cloudCover)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Instabile</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Neutro</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Stabile</span>
      </div>
    </div>
  );
};

const PanelCloudBase = ({ ore, alt, maxCloudBase }: { ore: HourData[]; alt: number; maxCloudBase: number }) => {
  const dayHours = ore.filter((h) => {
    const hh = h.time.getHours();
    return hh >= 8 && hh <= 19;
  });
  if (dayHours.length < 3) return null;

  return (
    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
      <div className="flex items-center gap-2 mb-3">
        <Mountain className="w-5 h-5 text-green-400" />
        <h4 className="text-sm font-bold text-green-300 uppercase tracking-wide">Quota base cumulo & zero termico · m slm</h4>
      </div>
      <div className="space-y-1.5">
        {dayHours.map((h) => {
          const hh = h.time.getHours();
          const spread = h.temperature - h.dewPoint;
          const base = Math.max(200, Math.min(4000, Math.round(spread * 125))) + alt;
          const zero = Math.max(0, Math.round(alt + h.temperature / 0.0098));
          const termiche = calcolaTermiche(h, alt);
          const top = termiche.top;
          const basePct = (base / Math.max(maxCloudBase, 1)) * 100;

          return (
            <div key={hh} className="grid grid-cols-[60px_1fr_80px_80px_80px] gap-1 items-center text-sm">
              <span className="text-slate-400 font-mono font-bold">{String(hh).padStart(2, "0")}:00</span>
              <div className="h-5 bg-slate-700/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-green-500/60 via-cyan-500/50 to-blue-500/40" style={{ width: `${basePct}%` }} />
              </div>
              <span className="text-green-300 font-bold tabular-nums text-right text-xs">{base}m</span>
              <span className="text-cyan-300 font-bold tabular-nums text-right text-xs">{zero}m</span>
              <span className="text-amber-300 font-bold tabular-nums text-right text-xs">{top}m</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 border-t border-slate-700/30 pt-2">
        <span>🟢 Base cumulo</span>
        <span>🔵 Zero termico</span>
        <span>🟡 Top termico</span>
      </div>
    </div>
  );
};

export default WindGramButton;