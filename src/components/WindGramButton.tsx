"use client";

import React, { useState, useMemo } from "react";
import { Wind, X, Cloud, CloudSun, CloudRain, CloudLightning, Thermometer, Eye, TrendingUp } from "lucide-react";
import type { HourData } from "@/types/meteo";

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

function getCloudIcon(cover: number, code: number): React.ReactNode {
  if (code >= 95) return <CloudLightning className="w-4 h-4 text-yellow-400" />;
  if (code >= 61) return <CloudRain className="w-4 h-4 text-blue-400" />;
  if (code >= 51) return <CloudRain className="w-4 h-4 text-blue-300" />;
  if (cover < 15) return <CloudSun className="w-4 h-4 text-amber-300" />;
  if (cover < 45) return <CloudSun className="w-4 h-4 text-slate-300" />;
  if (cover < 75) return <Cloud className="w-4 h-4 text-slate-400" />;
  return <Cloud className="w-4 h-4 text-slate-500" />;
}

function getThermalDescription(rateo: number): { label: string; color: string; symbol: string } {
  if (rateo >= 4) return { label: "Forti", color: "#ef4444", symbol: "🔥" };
  if (rateo >= 3) return { label: "Buone", color: "#f97316", symbol: "🪂" };
  if (rateo >= 2) return { label: "Moderate", color: "#eab308", symbol: "👍" };
  if (rateo >= 1) return { label: "Deboli", color: "#84cc16", symbol: "🌤️" };
  if (rateo >= 0.3) return { label: "M. deboli", color: "#6b7280", symbol: "☁️" };
  return { label: "Assenti", color: "#475569", symbol: "❌" };
}

function calcThermalRatio(h: HourData, alt: number): number {
  const spread = h.temperature - h.dewPoint;
  let gradiente = 0.98;
  if (h.temp80m != null) gradiente = ((h.temperature - h.temp80m) / 78) * 100;
  else if (h.temp120m != null) gradiente = ((h.temperature - h.temp120m) / 118) * 100;

  let forza = 0;
  if (gradiente >= 1.2) forza += 3;
  else if (gradiente >= 0.98) forza += 2;
  else if (gradiente >= 0.7) forza += 1;
  if (h.windSpeed >= 5 && h.windSpeed <= 15) forza += 2;
  else if (h.windSpeed >= 3 && h.windSpeed < 5) forza += 1.5;
  else if (h.windSpeed > 15 && h.windSpeed <= 22) forza += 1;
  if (h.cloudCover >= 15 && h.cloudCover <= 45) forza += 2;
  else if (h.cloudCover >= 5 && h.cloudCover < 15) forza += 1.5;
  if (h.humidity >= 30 && h.humidity <= 50) forza += 1.5;
  else if (h.humidity > 50 && h.humidity <= 65) forza += 1;
  if (spread >= 10) forza += 1.5;
  else if (spread >= 6) forza += 1;
  else if (spread >= 3) forza += 0.5;
  if (h.precipitation > 1) forza = 0;
  forza = Math.max(0, Math.min(10, Math.round(forza * 10) / 10));
  return (forza / 10) * 4;
}

const WindGramButton = ({ dayData, siteAltitude, siteName }: WindGramButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const data = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    const ore = dayData
      .filter((h) => {
        const hh = h.time.getHours();
        return hh >= 8 && hh <= 19;
      })
      .sort((a, b) => a.time.getHours() - b.time.getHours());
    if (ore.length < 3) return null;

    const dateLabel = ore[0].time.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const maxWind = Math.max(...ore.map((h) => h.windSpeed), 1);

    const venti = ore.map((h) => ({
      ora: h.time.getHours(),
      speed: Math.round(h.windSpeed),
      dir: Math.round(h.windDir),
      gust: Math.round(h.windGusts || 0),
      cloud: Math.round(h.cloudCover),
      code: h.weatherCode,
      temp: Math.round(h.temperature),
      hum: Math.round(h.humidity),
      precip: Math.round(h.precipitation * 10) / 10,
      pressure: Math.round(h.pressure),
      rateo: Math.round(calcThermalRatio(h, siteAltitude) * 10) / 10,
      spread: Math.round((h.temperature - h.dewPoint) * 10) / 10,
      base: Math.round(Math.max(200, Math.min(4000, Math.round((h.temperature - h.dewPoint) * 125))) + siteAltitude),
      zero: Math.round(Math.max(0, Math.round(siteAltitude + h.temperature / 0.0098))),
    }));

    return { ore: venti, date: dateLabel };
  }, [dayData, siteAltitude]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-500/20 transition-all"
      >
        <CloudSun className="w-5 h-5" />
        WindGram · {siteName}
      </button>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center max-w-sm">
          <Cloud className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 text-base">Nessun dato disponibile</p>
          <p className="text-slate-500 text-sm mt-1">Servono almeno 3 ore di dati orari</p>
          <button onClick={() => setIsOpen(false)} className="mt-4 px-5 py-2 bg-slate-700 rounded-xl text-white text-sm font-bold hover:bg-slate-600">
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  const maxWind = Math.max(...data.ore.map((o) => o.speed), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-400/30 flex items-center justify-center">
              <CloudSun className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">WindGram · {siteName}</h3>
              <p className="text-sm text-slate-400">{data.date}</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-6">
          {/* Vento orario */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Wind className="w-5 h-5 text-sky-400" />
              <h4 className="text-sm font-bold text-sky-300 uppercase tracking-wider">Vento orario</h4>
            </div>
            <div className="space-y-1.5">
              {data.ore.map((o) => {
                const pct = (o.speed / maxWind) * 100;
                return (
                  <div key={o.ora} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-slate-800/60 transition-colors">
                    <span className="w-12 text-slate-400 font-mono font-bold">{String(o.ora).padStart(2, "0")}:00</span>
                    <div className="flex-1 h-5 bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: getWindColor(o.speed) }}
                      >
                        {pct > 30 && <span className="text-[10px] text-white font-bold">{o.speed}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 w-16 shrink-0">
                      <span className="text-base">{getWindDirIcon(o.dir)}</span>
                      <span className="text-slate-300 text-xs">{getDirLabel(o.dir)}</span>
                    </div>
                    {o.gust > o.speed * 1.4 && (
                      <span className="text-red-400 text-xs font-bold w-10 text-right">{o.gust}</span>
                    )}
                    <div className="w-5 shrink-0">{getCloudIcon(o.cloud, o.code)}</div>
                    <span className="text-slate-400 text-xs w-8 text-right">{o.temp}°</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> ≤5</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> 6-10</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 11-18</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 19-25</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> over 25 km/h</span>
            </div>
          </section>

          {/* Termiche */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <h4 className="text-sm font-bold text-orange-300 uppercase tracking-wider">Termiche orarie · m/s</h4>
            </div>
            <div className="space-y-1.5">
              {data.ore.map((o) => {
                const t = getThermalDescription(o.rateo);
                const maxRateo = Math.max(...data.ore.map((x) => x.rateo), 0.5);
                const pct = (o.rateo / maxRateo) * 100;
                return (
                  <div key={o.ora} className="flex items-center gap-2 text-sm py-1 px-2 rounded-lg hover:bg-slate-800/60 transition-colors">
                    <span className="w-12 text-slate-400 font-mono font-bold">{String(o.ora).padStart(2, "0")}:00</span>
                    <div className="flex-1 h-4 bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: t.color }}
                      />
                    </div>
                    <span className="w-10 text-right font-bold" style={{ color: t.color }}>{o.rateo.toFixed(1)}</span>
                    <span className="text-xs text-slate-400 w-20">{t.symbol} {t.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Base cumulo + zero termico */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">Base cumulo & zero termico · m</h4>
            </div>
            <div className="space-y-1.5">
              {data.ore.map((o) => {
                const maxBase = Math.max(...data.ore.map((x) => x.base), 2000);
                const pct = (o.base / maxBase) * 100;
                return (
                  <div key={o.ora} className="flex items-center gap-2 text-sm py-1 px-2 rounded-lg hover:bg-slate-800/60 transition-colors">
                    <span className="w-12 text-slate-400 font-mono font-bold">{String(o.ora).padStart(2, "0")}:00</span>
                    <div className="flex-1 h-4 bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 via-teal-500/50 to-cyan-500/40"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                    <span className="w-14 text-right text-emerald-300 font-bold text-xs">{o.base}m</span>
                    <span className="w-14 text-right text-cyan-300 font-bold text-xs">{o.zero}m</span>
                    <span className="text-xs text-slate-500 w-16">spread {o.spread}°</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
              <span>🟢 Base cumulo</span>
              <span>🔵 Zero termico</span>
            </div>
          </section>

          {/* Pressione */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Pressione · hPa</h4>
            </div>
            <div className="space-y-1.5">
              {data.ore.map((o) => {
                const pressures = data.ore.map((x) => x.pressure);
                const minP = Math.min(...pressures);
                const maxP = Math.max(...pressures);
                const range = Math.max(maxP - minP, 1);
                const pct = ((o.pressure - minP) / range) * 100;
                return (
                  <div key={o.ora} className="flex items-center gap-2 text-sm py-1 px-2 rounded-lg hover:bg-slate-800/60 transition-colors">
                    <span className="w-12 text-slate-400 font-mono font-bold">{String(o.ora).padStart(2, "0")}:00</span>
                    <div className="flex-1 h-4 bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-bold text-white text-xs">{o.pressure}</span>
                    <span className="text-xs text-slate-500 w-12">
                      {o.precip > 0 ? `${o.precip}mm` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default WindGramButton;