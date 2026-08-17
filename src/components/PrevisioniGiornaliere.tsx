"use client";

import React, { useMemo } from "react";
import {
  Sun, CloudSun, Cloud, CloudRain,
  CloudLightning, CloudFog, Thermometer, Wind, Droplets,
  ArrowUp, Gauge, Umbrella, Mountain, TrendingUp, CheckCircle
} from "lucide-react";
import { degreesToCardinal, windArrow } from "@/utils/windDirections";
import { calcolaTermiche } from "@/utils/termiche";

interface PrevisioniGiornaliereProps {
  enrichedDaily: any[];
  dateLabels: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure?: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

function getWeatherInfo(code: number | undefined | null) {
  if (code === undefined || code === null || isNaN(code)) return { icon: <Sun className="w-8 h-8 text-amber-300" />, desc: "N/D" };
  if (code === 0 || code === 1) return { icon: <Sun className="w-8 h-8 text-amber-300" />, desc: "Sereno" };
  if (code === 2) return { icon: <CloudSun className="w-8 h-8 text-amber-200" />, desc: "Poco nuvoloso" };
  if (code === 3) return { icon: <Cloud className="w-8 h-8 text-slate-300" />, desc: "Nuvoloso" };
  if (code >= 45 && code <= 48) return { icon: <CloudFog className="w-8 h-8 text-slate-400" />, desc: "Nebbia" };
  if (code >= 51 && code <= 57) return { icon: <CloudRain className="w-8 h-8 text-blue-300" />, desc: "Pioggerella" };
  if (code >= 61 && code <= 67) return { icon: <CloudRain className="w-8 h-8 text-blue-400" />, desc: "Pioggia" };
  if (code >= 80 && code <= 84) return { icon: <CloudRain className="w-8 h-8 text-blue-300" />, desc: "Rovesci" };
  if (code >= 95 && code <= 99) return { icon: <CloudLightning className="w-8 h-8 text-yellow-300" />, desc: "Temporali" };
  return { icon: <Sun className="w-8 h-8 text-amber-300" />, desc: "Sereno" };
}

function getDominantWeatherCode(hourlyCodes: (number | undefined | null)[]): number {
  const valid = hourlyCodes.filter((c): c is number => c != null && !isNaN(c));
  if (valid.length === 0) return 0;
  const freq: Record<number, number> = {};
  for (const c of valid) freq[c] = (freq[c] || 0) + 1;
  let maxCode = 0, maxCount = 0;
  for (const [code, count] of Object.entries(freq)) {
    if (count > maxCount) { maxCount = count; maxCode = parseInt(code); }
  }
  return maxCode;
}

function formatDate(date: any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function PrevisioniGiornaliere({
  enrichedDaily, dateLabels, currentData, dayData, site, selectedDay, onSelectDay
}: PrevisioniGiornaliereProps) {
  const alt = site.altitude;

  const dominanteCodice = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    return getDominantWeatherCode(dayData.map((h: any) => h.weatherCode));
  }, [dayData]);

  const precipTotaleReale = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    return Math.round(dayData.reduce((sum: number, h: any) => sum + (h.precipitation || 0), 0) * 10) / 10;
  }, [dayData]);

  const dailyWeatherCodes = useMemo(() => {
    return enrichedDaily.map((day: any) => {
      if (!day?.date) return 0;
      const d = day.date instanceof Date ? day.date : new Date(day.date);
      const hours = dayData?.filter((h: any) => {
        const t = new Date(h.time);
        return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate();
      }) || [];
      return getDominantWeatherCode(hours.map((h: any) => h.weatherCode));
    });
  }, [enrichedDaily, dayData]);

  const dailyPrecipTotals = useMemo(() => {
    return enrichedDaily.map((day: any, idx: number) => {
      if (!day?.date) return 0;
      if (idx === selectedDay && precipTotaleReale > 0) return precipTotaleReale;
      return Math.round(day.precipSum * 10) / 10;
    });
  }, [enrichedDaily, selectedDay, precipTotaleReale]);

  const fasce = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    const mattina = dayData.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 6 && hh <= 11; });
    const pomeriggio = dayData.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 12 && hh <= 17; });
    const sera = dayData.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 18 && hh <= 23; });

    const calcola = (ore: any[], label: string, borderColor: string) => {
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
      const termicheOrarie = ore.map((h: any) => calcolaTermiche(h, alt));
      const salitaMedia = media(termicheOrarie.map(t => t.rateo));
      const salita = Math.round(salitaMedia * 10) / 10;
      const baseMedia = Math.round(media(termicheOrarie.map(t => t.base)));
      const topMedia = Math.round(media(termicheOrarie.map(t => t.top)));
      let termicheLabel = "Assenti ❌", termicheColore = "text-slate-400";
      if (salita >= 4) { termicheLabel = "Forti 🔥"; termicheColore = "text-red-400"; }
      else if (salita >= 3) { termicheLabel = "Buone 🪂"; termicheColore = "text-orange-400"; }
      else if (salita >= 2) { termicheLabel = "Moderate 👍"; termicheColore = "text-amber-400"; }
      else if (salita >= 1) { termicheLabel = "Deboli 👎"; termicheColore = "text-amber-300"; }
      else if (salita >= 0.3) { termicheLabel = "M. deboli ☁️"; termicheColore = "text-yellow-300"; }
      const weatherCodes = ore.map((h: any) => h.weatherCode).filter((c: any) => c != null && !isNaN(c));
      const weatherCode = weatherCodes.length > 0 ? getDominantWeatherCode(weatherCodes) : 0;
      const weatherInfo = getWeatherInfo(weatherCode);
      let score = 5;
      if (windMedia >= 5 && windMedia <= 18) score += 2; else if (windMedia > 25) score -= 2; else score -= 1;
      if (precipTot < 0.1) score += 2; else if (precipTot < 0.5) score += 1; else score -= 3;
      if (cloudMedia >= 10 && cloudMedia <= 60) score += 1.5;
      if (salita >= 2) score += 2; else if (salita >= 1) score += 1;
      if (windMax > 30) score -= 2;
      score = Math.max(0, Math.min(10, Math.round(score)));
      return {
        label, borderColor, weatherDesc: weatherInfo.desc,
        tempMedia, tempMax, windMedia, windMax, windDirMedia,
        cloudMedia, precipTot, humMedia, pressMedia,
        base: baseMedia, top: topMedia, salita, termicheLabel, termicheColore, score, nOre: ore.length,
      };
    };

    return [
      calcola(mattina, "Mattina", "border-amber-500/40"),
      calcola(pomeriggio, "Pomeriggio", "border-sky-500/40"),
      calcola(sera, "Sera", "border-indigo-500/40"),
    ].filter(Boolean);
  }, [dayData, alt]);

  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-base">Caricamento previsioni...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Giorni */}
      <div className="giorni-container">
        {enrichedDaily.slice(0, 3).map((day: any, idx: number) => {
          const isActive = idx === selectedDay;
          const weatherCode = dailyWeatherCodes[idx] ?? dominanteCodice ?? 0;
          const weatherInfo = getWeatherInfo(weatherCode);
          const precipGiorno = dailyPrecipTotals[idx] ?? day.precipSum ?? 0;
          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`card p-4 text-left transition-all border-2 cursor-pointer ${
                isActive
                  ? "border-emerald-400 bg-emerald-900/40 shadow-lg"
                  : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-bold text-white">
                  {idx === 0 ? "Oggi" : idx === 1 ? "Domani" : "Dopodomani"}
                </span>
                <span className="text-sm text-slate-400">{formatDate(day.date)}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {weatherInfo.icon}
                  <div>
                    <div className="text-sm font-bold text-slate-200">{weatherInfo.desc}</div>
                    <div className="text-sm text-slate-400">{precipGiorno > 0 ? `${precipGiorno.toFixed(1)} mm` : "0 mm"}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{Math.round(day.tempMax)}°</div>
                  <div className="text-sm text-slate-400">min {Math.round(day.tempMin)}°</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-900/60 rounded-lg px-3 py-2"><Wind className="w-4 h-4 text-sky-400 inline mr-1" />{Math.round(day.avgWind || 0)} km/h</div>
                <div className="bg-slate-900/60 rounded-lg px-3 py-2"><Cloud className="w-4 h-4 text-slate-400 inline mr-1" />{Math.round(day.avgCloud || 0)}%</div>
                <div className="bg-slate-900/60 rounded-lg px-3 py-2">
                  <Umbrella className="w-4 h-4 text-blue-400 inline mr-1" />
                  <span className={precipGiorno === 0 ? "text-emerald-300" : "text-amber-300"}>
                    {precipGiorno === 0 ? "Assente" : `${precipGiorno.toFixed(1)}mm`}
                  </span>
                </div>
                <div className="bg-slate-900/60 rounded-lg px-3 py-2"><Thermometer className="w-4 h-4 text-orange-400 inline mr-1" />{Math.round((day.tempMin + day.tempMax) / 2)}°C</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Fasce orarie: mattina, pomeriggio, sera */}
      {fasce && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white px-1">Andamento orario</h3>
          {fasce.map((fascia: any, idx: number) => {
            if (!fascia) return null;
            const scoreColor = fascia.score >= 7 ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
              : fascia.score >= 4 ? "bg-amber-500/20 border-amber-400/30 text-amber-300"
              : "bg-red-500/20 border-red-400/30 text-red-300";
            const dirCardinal = degreesToCardinal(fascia.windDirMedia);
            const dirArr = windArrow(fascia.windDirMedia);
            return (
              <div key={idx} className={`card p-4 border-2 ${fascia.borderColor} bg-slate-800/40`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-bold text-white">{fascia.label}</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full border ${scoreColor}`}>{fascia.score}/10</span>
                </div>
                <div className="text-xl font-bold text-amber-300 mb-3">{fascia.tempMedia}°C <span className="text-sm text-slate-400 font-normal">max {fascia.tempMax}°</span></div>
                <div className="bg-slate-900/60 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <Wind className="w-5 h-5 text-sky-400" />
                    <span className="font-bold text-sky-300">{fascia.windMedia} km/h</span>
                    <span className="text-slate-400">raffiche {fascia.windMax}</span>
                  </div>
                  <div className="text-sm text-slate-400">{dirArr} {dirCardinal} ({fascia.windDirMedia}°)</div>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <ArrowUp className="w-5 h-5 text-orange-400" />
                    <span className={fascia.termicheColore + " font-bold"}>{fascia.termicheLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span>Salita: <span className="text-emerald-300 font-bold">{fascia.salita.toFixed(1)} m/s</span></span>
                    <span>Base: <Mountain className="w-4 h-4 text-green-400 inline" /> <span className="text-green-300 font-bold">{fascia.base} m</span></span>
                    <span>Top: <TrendingUp className="w-4 h-4 text-red-400 inline" /> <span className="text-red-300 font-bold">{fascia.top} m</span></span>
                    <span>Spessore: <span className="text-amber-300 font-bold">{fascia.top - fascia.base} m</span></span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-between">
                    <Cloud className="w-4 h-4 text-slate-400" /> <span className="font-bold text-slate-200">{fascia.cloudMedia}%</span>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-between">
                    <Droplets className="w-4 h-4 text-blue-400" /> <span className="font-bold text-blue-200">{fascia.humMedia}%</span>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-between">
                    <Gauge className="w-4 h-4 text-purple-400" /> <span className="font-bold text-purple-200">{fascia.pressMedia} hPa</span>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-between">
                    {fascia.precipTot === 0 ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Umbrella className="w-4 h-4 text-blue-400" />}
                    <span className="font-bold">{fascia.precipTot === 0 ? "Secco" : `${fascia.precipTot}mm`}</span>
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