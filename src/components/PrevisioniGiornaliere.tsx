"use client";

import React, { useMemo } from "react";
import {
  Sun, Moon, CloudSun, Cloud, CloudRain, Snowflake,
  CloudLightning, CloudFog, Thermometer, Wind, Droplets,
  ArrowUp, ArrowDown, Clock, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Gauge, Umbrella, Sparkles
} from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: any[];
  dateLabels: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure?: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

function getWeatherIcon(code: number, size: number = 32) {
  if (code === 0) return <Sun size={size} className="text-amber-300 drop-shadow-lg" />;
  if (code <= 2) return <CloudSun size={size} className="text-amber-200 drop-shadow-lg" />;
  if (code <= 3) return <CloudSun size={size} className="text-slate-300 drop-shadow-lg" />;
  if (code <= 48) return <CloudFog size={size} className="text-slate-400 drop-shadow-lg" />;
  if (code <= 57) return <CloudRain size={size} className="text-blue-300 drop-shadow-lg" />;
  if (code <= 67) return <CloudRain size={size} className="text-blue-400 drop-shadow-lg" />;
  if (code <= 77) return <Snowflake size={size} className="text-blue-200 drop-shadow-lg" />;
  if (code <= 82) return <CloudRain size={size} className="text-blue-300 drop-shadow-lg" />;
  return <CloudLightning size={size} className="text-yellow-300 drop-shadow-lg" />;
}

function getWindDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  currentData,
  dayData,
  site,
  selectedDay,
  onSelectDay,
}: PrevisioniGiornaliereProps) {
  const fasciaMattina = useMemo(() => {
    const ore = dayData.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 6 && hh <= 11;
    });
    if (!ore.length) return null;
    const stats = calcolaStats(ore);
    return { ...stats, label: "Mattina", icon: <Sun className="w-5 h-5 text-amber-300" /> };
  }, [dayData]);

  const fasciaPomeriggio = useMemo(() => {
    const ore = dayData.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 12 && hh <= 17;
    });
    if (!ore.length) return null;
    const stats = calcolaStats(ore);
    return { ...stats, label: "Pomeriggio", icon: <CloudSun className="w-5 h-5 text-yellow-300" /> };
  }, [dayData]);

  const fasciaSera = useMemo(() => {
    const ore = dayData.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 18 && hh <= 23;
    });
    if (!ore.length) return null;
    const stats = calcolaStats(ore);
    return { ...stats, label: "Sera", icon: <Moon className="w-5 h-5 text-indigo-300" /> };
  }, [dayData]);

  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-6 text-slate-400 text-xs">Caricamento previsioni...</div>;
  }

  const day = enrichedDaily[selectedDay];
  if (!day) return null;

  // Calcola LCL (base nuvole) dal dew point reale
  const spread = (currentData?.temperature || 20) - (currentData?.dewPoint || 10);
  const lcl = Math.max(200, Math.min(3000, Math.round(spread * 125)));

  return (
    <div className="space-y-4">
      {/* Giorni: OGGI DOMANI DOPODOMANI */}
      <div className="grid grid-cols-3 gap-2">
        {enrichedDaily.slice(0, 3).map((d: any, idx: number) => {
          const isActive = idx === selectedDay;
          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`rounded-xl p-3 border-2 transition-all text-left ${
                isActive
                  ? "bg-emerald-800/40 border-emerald-400/50 shadow-lg shadow-emerald-400/20"
                  : "bg-slate-800/30 border-slate-700/40 hover:border-emerald-400/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${isActive ? "text-emerald-200" : "text-slate-200"}`}>
                  {dateLabels[idx] || "Giorno"}
                </span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <div className="drop-shadow-xl">{getWeatherIcon(d.weatherCode || 0, 32)}</div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white tabular-nums">{Math.round(d.tempMax)}°</div>
                  <div className="text-xs text-slate-400 tabular-nums">{Math.round(d.tempMin)}°</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-700/30 pt-1.5">
                <span>💨 {Math.round(d.avgWind || 0)} km/h</span>
                <span className="text-amber-400">Δ {(d.thermalDelta || 0).toFixed(1)}°</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Fasce orarie: MATTINA / POMERIGGIO / SERA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {[fasciaMattina, fasciaPomeriggio, fasciaSera].filter(Boolean).map((fascia: any, idx: number) => {
          if (!fascia) return null;
          const borderColors = ["border-amber-500/30", "border-sky-500/30", "border-indigo-500/30"];
          
          return (
            <div key={idx} className={`rounded-xl p-3 border-2 ${borderColors[idx]} bg-slate-800/40`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {fascia.icon}
                  <span className="text-xs font-bold text-white">{fascia.label}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                  fascia.score >= 7 
                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                    : fascia.score >= 4
                    ? "bg-amber-500/20 border-amber-400/30 text-amber-300"
                    : "bg-red-500/20 border-red-400/30 text-red-300"
                }`}>
                  {fascia.score}/10
                </span>
              </div>

              {/* Temperatura */}
              <div className="text-2xl font-bold text-amber-300 mb-2">{fascia.tempMedia}°C</div>

              {/* Vento */}
              <div className="bg-slate-900/60 rounded-xl p-2.5 mb-2 border border-slate-700/30">
                <div className="flex items-center gap-1.5 text-xs mb-1">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-sky-300 font-bold">{fascia.windMedia} km/h</span>
                  <span className="text-slate-500">(max {fascia.windMax})</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>Direzione: {getWindDir(fascia.windDirMedia)}</span>
                </div>
              </div>

              {/* Termiche */}
              <div className="bg-slate-900/60 rounded-xl p-2.5 mb-2 border border-slate-700/30">
                <div className="flex items-center gap-1.5 text-xs mb-1">
                  <ArrowUp className="w-3.5 h-3.5 text-orange-400" />
                  <span className={fascia.termicheColore + " font-bold"}>{fascia.termicheLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                  <span>Salita: <span className="text-emerald-300 font-bold">{fascia.salita.toFixed(1)} m/s</span></span>
                  <span>Base: <span className="text-green-300 font-bold">{fascia.lcl} m</span></span>
                  <span>Top: <span className="text-red-300 font-bold">{fascia.top} m</span></span>
                  <span>Spessore: <span className="text-amber-300 font-bold">{fascia.top - fascia.lcl} m</span></span>
                </div>
              </div>

              {/* Dati extra */}
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-slate-900/50 rounded-xl px-2.5 py-1.5 border border-slate-700/20 flex items-center justify-between">
                  <Cloud className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-300">{fascia.cloudMedia}%</span>
                </div>
                <div className="bg-slate-900/50 rounded-xl px-2.5 py-1.5 border border-slate-700/20 flex items-center justify-between">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-300">{fascia.umiditaMedia}%</span>
                </div>
                <div className="bg-slate-900/50 rounded-xl px-2.5 py-1.5 border border-slate-700/20 flex items-center justify-between">
                  <Gauge className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-300">{fascia.pressMedia} hPa</span>
                </div>
                <div className="bg-slate-900/50 rounded-xl px-2.5 py-1.5 border border-slate-700/20 flex items-center justify-between">
                  {fascia.precipTot === 0 
                    ? <CheckCircle className="w-3 h-3 text-green-400" />
                    : <Umbrella className="w-3 h-3 text-blue-400" />
                  }
                  <span className="text-[10px] font-bold text-blue-300">
                    {fascia.precipTot === 0 ? "Secco" : `${fascia.precipTot}mm`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper per calcolare statistiche reali da un array di dati orari
function calcolaStats(ore: any[]) {
  const media = (arr: number[]) => 
    arr.filter(v => v != null).reduce((s: number, v: number) => s + v, 0) / Math.max(1, arr.filter(v => v != null).length);
  const max = (arr: number[]) => Math.max(...arr.filter(v => v != null), 0);

  const tempMedia = Math.round(media(ore.map((h: any) => h.temperature)));
  const windMedia = Math.round(media(ore.map((h: any) => h.windSpeed)));
  const windMax = Math.round(max(ore.map((h: any) => h.windSpeed)));
  const windDirMedia = Math.round(media(ore.map((h: any) => h.windDir)));
  const cloudMedia = Math.round(media(ore.map((h: any) => h.cloudCover)));
  const precipTot = Math.round(ore.reduce((s: number, h: any) => s + (h.precipitation || 0), 0) * 10) / 10;
  const umiditaMedia = Math.round(media(ore.map((h: any) => h.humidity)));
  const pressMedia = Math.round(media(ore.map((h: any) => h.pressure || 1013)));

  // Base termica (LCL) da dati reali
  const dewMedia = media(ore.map((h: any) => h.dewPoint || h.temperature - (100 - h.humidity) / 5));
  const spread = tempMedia - dewMedia;
  const lcl = Math.max(200, Math.min(3000, Math.round(spread * 125)));

  // Velocità di salita da gradiente reale (temp80m disponibile?)
  let salita = 0;
  const ore10_15 = ore.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 10 && hh <= 15; });
  const temps80m = ore10_15.map((h: any) => h.temp80m).filter(Boolean);
  
  if (temps80m.length > 0) {
    const t80mMedia = media(temps80m);
    const gradiente = (tempMedia - t80mMedia) / 0.78;
    salita = Math.max(0, Math.min(5, (gradiente - 0.5) * 3));
  } else {
    const delta = Math.round(tempMedia - dewMedia);
    salita = Math.max(0, Math.min(5, (delta * 0.08) + (cloudMedia < 50 ? 0.8 : 0) + (windMedia >= 5 && windMedia <= 18 ? 1.2 : 0) - (precipTot > 0.5 ? 3 : 0)));
  }
  salita = Math.round(salita * 10) / 10;

  const top = Math.min(5000, lcl + Math.round(salita * 350));

  // Label termiche
  let termicheLabel = "Assenti ❌";
  let termicheColore = "text-slate-400";
  if (salita >= 4) { termicheLabel = "Forti 🔥"; termicheColore = "text-red-400"; }
  else if (salita >= 3) { termicheLabel = "Buone 🪂"; termicheColore = "text-orange-400"; }
  else if (salita >= 2) { termicheLabel = "Moderate 👍"; termicheColore = "text-amber-400"; }
  else if (salita >= 1) { termicheLabel = "Deboli 👎"; termicheColore = "text-amber-300"; }
  else if (salita >= 0.3) { termicheLabel = "Molto deboli ☁️"; termicheColore = "text-yellow-300"; }

  // Flight score
  let score = 5;
  if (windMedia >= 5 && windMedia <= 18) score += 2;
  else score -= 2;
  if (precipTot < 0.1) score += 2;
  else score -= 3;
  if (cloudMedia >= 10 && cloudMedia <= 60) score += 1.5;
  if (salita >= 2) score += 2;
  else if (salita >= 1) score += 1;
  score = Math.max(0, Math.min(10, Math.round(score)));

  return {
    tempMedia, windMedia, windMax, windDirMedia,
    cloudMedia, precipTot, umiditaMedia, pressMedia,
    lcl, salita, top, termicheLabel, termicheColore, score,
  };
}