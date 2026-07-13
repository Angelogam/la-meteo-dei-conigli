"use client";

import React, { useMemo } from "react";
import {
  Sun, Moon, CloudSun, Cloud, CloudRain, Snowflake,
  CloudLightning, CloudFog, Thermometer, Wind, Droplets,
  ArrowUp, CheckCircle, Gauge, Umbrella, Sparkles
} from "lucide-react";
import { degreesToCardinal, windArrow } from "@/utils/windDirections";

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

function formatDate(date: any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getDayLabel(idx: number, dateStr: string): string {
  if (idx === 0) return `Oggi ${dateStr}`;
  if (idx === 1) return `Domani ${dateStr}`;
  if (idx === 2) return `Dopodomani ${dateStr}`;
  return `Giorno ${dateStr}`;
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
  // Calcola statistiche per fasce orarie REALI con dati Open-Meteo
  const fasce = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    // Filtra ore per fascia
    const mattina = dayData.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 6 && hh <= 11;
    });
    const pomeriggio = dayData.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 12 && hh <= 17;
    });
    const sera = dayData.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 18 && hh <= 23;
    });

    const calcola = (ore: any[], label: string, icon: React.ReactNode, borderColor: string) => {
      if (!ore.length) return null;

      const media = (arr: number[]) => arr.filter(v => v != null).reduce((s: number, v: number) => s + v, 0) / Math.max(1, arr.filter(v => v != null).length);
      const max = (arr: number[]) => Math.max(...arr.filter(v => v != null), 0);

      const tempMedia = Math.round(media(ore.map((h: any) => h.temperature)));
      const tempMax = Math.round(max(ore.map((h: any) => h.temperature)));
      const windMedia = Math.round(media(ore.map((h: any) => h.windSpeed)));
      const windMax = Math.round(max(ore.map((h: any) => h.windSpeed)));
      const windDirMedia = Math.round(media(ore.map((h: any) => h.windDir)));
      const cloudMedia = Math.round(media(ore.map((h: any) => h.cloudCover)));
      const precipTot = Math.round(ore.reduce((s: number, h: any) => s + (h.precipitation || 0), 0) * 10) / 10;
      const humMedia = Math.round(media(ore.map((h: any) => h.humidity)));
      const pressMedia = Math.round(media(ore.map((h: any) => h.pressure || 1013)));
      
      const dewMedia = media(ore.map((h: any) => h.dewPoint || h.temperature - (100 - h.humidity) / 5));
      const spread = Math.max(0, tempMedia - dewMedia);
      const lcl = Math.max(200, Math.min(3000, Math.round(spread * 125)));

      let salita = 0;
      const ore10_15 = ore.filter((h: any) => { 
        const hh = new Date(h.time).getHours(); 
        return hh >= 10 && hh <= 15; 
      });
      
      if (ore10_15.length > 0) {
        const t80mValues = ore10_15.map((h: any) => h.temp80m).filter((v: any) => v != null);
        const t120mValues = ore10_15.map((h: any) => h.temp120m).filter((v: any) => v != null);
        
        if (t80mValues.length > 0) {
          const t80mMedia = media(t80mValues);
          const t2mMedia = media(ore10_15.map((h: any) => h.temperature));
          const gradienteReale = (t2mMedia - t80mMedia) / 0.78;
          salita = Math.max(0, Math.min(8, (gradienteReale - 0.5) * 3.5));
        } else if (t120mValues.length > 0) {
          const t120mMedia = media(t120mValues);
          const t2mMedia = media(ore10_15.map((h: any) => h.temperature));
          const gradienteReale = (t2mMedia - t120mMedia) / 1.18;
          salita = Math.max(0, Math.min(8, (gradienteReale - 0.5) * 3.5));
        }
      }

      if (salita === 0) {
        const delta = tempMedia - dewMedia;
        const salitaBase = delta * 0.1;
        const bonusVento = windMedia >= 5 && windMedia <= 18 ? 1.2 : 0;
        const malusVento = windMedia > 25 ? -1 : 0;
        const bonusNuvole = cloudMedia >= 10 && cloudMedia <= 45 ? 0.8 : 0;
        const malusPioggia = precipTot > 0.5 ? -3 : 0;
        const bonusOrario = label === "Pomeriggio" ? 0.5 : label === "Mattina" ? 0.3 : 0;
        salita = Math.max(0, salitaBase + bonusVento + malusVento + bonusNuvole + malusPioggia + bonusOrario);
      }

      salita = Math.round(salita * 10) / 10;
      const top = Math.min(5000, lcl + Math.round(salita * 350));

      let termicheLabel = "Assenti ❌";
      let termicheColore = "text-slate-400";
      if (salita >= 4) { termicheLabel = "Forti 🔥"; termicheColore = "text-red-400"; }
      else if (salita >= 3) { termicheLabel = "Buone 🪂"; termicheColore = "text-orange-400"; }
      else if (salita >= 2) { termicheLabel = "Moderate 👍"; termicheColore = "text-amber-400"; }
      else if (salita >= 1) { termicheLabel = "Deboli 👎"; termicheColore = "text-amber-300"; }
      else if (salita >= 0.3) { termicheLabel = "Molto deboli ☁️"; termicheColore = "text-yellow-300"; }

      let score = 5;
      if (windMedia >= 5 && windMedia <= 18) score += 2;
      else if (windMedia > 18 && windMedia <= 25) score += 1;
      else if (windMedia > 25) score -= 2;
      else score -= 1;
      
      if (precipTot < 0.1) score += 2;
      else if (precipTot < 0.5) score += 1;
      else score -= 3;
      
      if (cloudMedia >= 10 && cloudMedia <= 60) score += 1.5;
      if (salita >= 2) score += 2;
      else if (salita >= 1) score += 1;
      if (windMax > 30) score -= 2;
      
      score = Math.max(0, Math.min(10, Math.round(score)));

      return {
        label, icon, borderColor,
        tempMedia, tempMax, windMedia, windMax, windDirMedia,
        cloudMedia, precipTot, humMedia, pressMedia,
        lcl, salita, top, termicheLabel, termicheColore, score, nOre: ore.length,
      };
    };

    return [
      calcola(mattina, "Mattina", <Sun className="w-5 h-5 text-amber-300" />, "border-amber-500/30"),
      calcola(pomeriggio, "Pomeriggio", <CloudSun className="w-5 h-5 text-yellow-300" />, "border-sky-500/30"),
      calcola(sera, "Sera", <Moon className="w-5 h-5 text-indigo-300" />, "border-indigo-500/30"),
    ].filter(Boolean);
  }, [dayData]);

  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-6 text-slate-400 text-sm">Caricamento previsioni...</div>;
  }

  const giornoSelezionato = enrichedDaily[selectedDay];
  const dataCompleta = giornoSelezionato ? formatDate(giornoSelezionato.date) : "";

  return (
    <div className="space-y-4">
      {/* SELEZIONE GIORNI con data completa */}
      <div className="grid grid-cols-3 gap-2">
        {enrichedDaily.slice(0, 3).map((day: any, idx: number) => {
          const isActive = idx === selectedDay;
          const dateStr = formatDate(day.date);

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`rounded-xl p-3 border-2 transition-all text-left ${
                isActive
                  ? "bg-emerald-800/30 border-emerald-400/50 shadow-md"
                  : "bg-slate-800/30 border-slate-700/40 hover:border-emerald-400/30"
              }`}
            >
              <div className="text-xs font-bold text-white mb-2">{getDayLabel(idx, dateStr)}</div>
              <div className="flex items-end justify-between">
                <div>{getWeatherIcon(day.weatherCode || 0, 28)}</div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{Math.round(day.tempMax)}°</div>
                  <div className="text-xs text-slate-400">{Math.round(day.tempMin)}°</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-700/30 text-[10px] text-slate-400">
                <span>{Math.round(day.avgWind || 0)} km/h</span>
                <span className="text-amber-400">Δ{(day.thermalDelta || 0).toFixed(1)}°</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* FASCE ORARIE con dati REALI */}
      {fasce && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {fasce.map((fascia: any, idx: number) => {
            if (!fascia) return null;

            const scoreColor = fascia.score >= 7
              ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
              : fascia.score >= 4
              ? "bg-amber-500/20 border-amber-400/30 text-amber-300"
              : "bg-red-500/20 border-red-400/30 text-red-300";

            const dirCardinal = degreesToCardinal(fascia.windDirMedia);
            const dirArrow = windArrow(fascia.windDirMedia);

            return (
              <div key={idx} className={`rounded-xl p-3 border-2 ${fascia.borderColor} bg-slate-800/40`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {fascia.icon}
                    <span className="text-xs font-bold text-white">{fascia.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${scoreColor}`}>
                    {fascia.score}/10
                  </span>
                </div>

                <div className="text-2xl font-bold text-amber-300 mb-2">
                  {fascia.tempMedia}°C <span className="text-xs text-slate-400 font-normal">max {fascia.tempMax}°</span>
                </div>

                <div className="bg-slate-900/60 rounded-lg p-2 mb-2">
                  <div className="flex items-center gap-1 text-xs mb-1">
                    <Wind className="w-3 h-3 text-sky-400" />
                    <span className="text-sky-300 font-bold">{fascia.windMedia} km/h</span>
                    <span className="text-slate-500">(raffiche {fascia.windMax})</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Direzione: {dirArrow} {dirCardinal} ({fascia.windDirMedia}°)
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-lg p-2 mb-2">
                  <div className="flex items-center gap-1 text-xs mb-1">
                    <ArrowUp className="w-3 h-3 text-orange-400" />
                    <span className={fascia.termicheColore + " font-bold"}>{fascia.termicheLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                    <span>Salita: <span className="text-emerald-300 font-bold">{fascia.salita.toFixed(1)} m/s</span></span>
                    <span>Base: <span className="text-green-300 font-bold">{fascia.lcl} m</span></span>
                    <span>Top: <span className="text-red-300 font-bold">{fascia.top} m</span></span>
                    <span>Spessore: <span className="text-amber-300 font-bold">{fascia.top - fascia.lcl} m</span></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <div className="bg-slate-900/50 rounded px-2 py-1 flex items-center justify-between">
                    <Cloud className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-300">{fascia.cloudMedia}%</span>
                  </div>
                  <div className="bg-slate-900/50 rounded px-2 py-1 flex items-center justify-between">
                    <Droplets className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-300">{fascia.humMedia}%</span>
                  </div>
                  <div className="bg-slate-900/50 rounded px-2 py-1 flex items-center justify-between">
                    <Gauge className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] font-bold text-purple-300">{fascia.pressMedia} hPa</span>
                  </div>
                  <div className="bg-slate-900/50 rounded px-2 py-1 flex items-center justify-between">
                    {fascia.precipTot === 0
                      ? <CheckCircle className="w-3 h-3 text-green-400" />
                      : <Umbrella className="w-3 h-3 text-blue-400" />
                    }
                    <span className="text-[10px] font-bold">{fascia.precipTot === 0 ? "Secco" : `${fascia.precipTot}mm`}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}