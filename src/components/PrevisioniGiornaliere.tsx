"use client";

import React, { useMemo } from "react";
import {
  Sun, Cloud, CloudRain, CloudLightning, CloudFog, Snowflake,
  Wind, Thermometer, Droplets, Umbrella, Gauge, ArrowUp,
  Mountain, TrendingUp, CheckCircle, Clock
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
  if (code === undefined || code === null || isNaN(code)) return { icon: <Sun className="w-6 h-6 text-amber-400" />, desc: "N/D" };
  if (code === 0 || code === 1) return { icon: <Sun className="w-6 h-6 text-amber-400" />, desc: "Sereno" };
  if (code === 2) return { icon: <Sun className="w-6 h-6 text-amber-300" />, desc: "Poco nuvoloso" };
  if (code === 3) return { icon: <Cloud className="w-6 h-6 text-slate-400" />, desc: "Nuvoloso" };
  if (code >= 45 && code <= 48) return { icon: <CloudFog className="w-6 h-6 text-slate-500" />, desc: "Nebbia" };
  if (code >= 51 && code <= 57) return { icon: <CloudRain className="w-6 h-6 text-sky-400" />, desc: "Pioggerella" };
  if (code >= 61 && code <= 67) return { icon: <CloudRain className="w-6 h-6 text-blue-400" />, desc: "Pioggia" };
  if (code >= 71 && code <= 77) return { icon: <Snowflake className="w-6 h-6 text-blue-200" />, desc: "Neve" };
  if (code >= 80 && code <= 84) return { icon: <CloudRain className="w-6 h-6 text-sky-400" />, desc: "Rovesci" };
  if (code >= 95 && code <= 99) return { icon: <CloudLightning className="w-6 h-6 text-yellow-400" />, desc: "Temporali" };
  return { icon: <Sun className="w-6 h-6 text-amber-400" />, desc: "Sereno" };
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
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PrevisioniGiornaliere({
  enrichedDaily, currentData, dayData, site, selectedDay, onSelectDay
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

    const calcola = (ore: any[], label: string) => {
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
      let termicheLabel = "Assenti", termicheColore = "text-slate-500";
      if (salita >= 4) { termicheLabel = "Forti"; termicheColore = "text-red-400"; }
      else if (salita >= 3) { termicheLabel = "Buone"; termicheColore = "text-orange-400"; }
      else if (salita >= 2) { termicheLabel = "Moderate"; termicheColore = "text-amber-400"; }
      else if (salita >= 1) { termicheLabel = "Deboli"; termicheColore = "text-amber-300"; }
      else if (salita >= 0.3) { termicheLabel = "Molto deboli"; termicheColore = "text-yellow-300"; }
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
        label, weatherDesc: weatherInfo.desc,
        tempMedia, tempMax, windMedia, windMax, windDirMedia,
        cloudMedia, precipTot, humMedia, pressMedia,
        base: baseMedia, top: topMedia, salita, termicheLabel, termicheColore, score, nOre: ore.length,
      };
    };

    return [
      calcola(mattina, "Mattina"),
      calcola(pomeriggio, "Pomeriggio"),
      calcola(sera, "Sera"),
    ].filter(Boolean);
  }, [dayData, alt]);

  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-6 text-slate-500 text-sm">Caricamento previsioni...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Cards giorni */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {enrichedDaily.slice(0, 3).map((day: any, idx: number) => {
          const isActive = idx === selectedDay;
          const weatherCode = dailyWeatherCodes[idx] ?? dominanteCodice ?? 0;
          const weatherInfo = getWeatherInfo(weatherCode);
          const precipGiorno = dailyPrecipTotals[idx] ?? day.precipSum ?? 0;
          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`rounded-lg p-3 border text-left transition-all ${
                isActive
                  ? "border-emerald-500/40 bg-emerald-900/20 shadow-sm"
                  : "border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-200">
                  {idx === 0 ? "Oggi" : idx === 1 ? "Domani" : "Dopodomani"}
                </span>
                <span className="text-[11px] text-slate-500">{formatDate(day.date)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {weatherInfo.icon}
                  <div>
                    <div className="text-xs font-medium text-slate-300">{weatherInfo.desc}</div>
                    <div className="text-[11px] text-slate-500">{precipGiorno > 0 ? `${precipGiorno.toFixed(1)} mm` : "0 mm"}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-100">{Math.round(day.tempMax)}°</div>
                  <div className="text-[11px] text-slate-500">min {Math.round(day.tempMin)}°</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-slate-900/60 rounded px-2 py-1.5 flex items-center gap-1">
                  <Wind className="w-3 h-3 text-sky-500/70" />
                  <span className="text-slate-400">{Math.round(day.avgWind || 0)} km/h</span>
                </div>
                <div className="bg-slate-900/60 rounded px-2 py-1.5 flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-slate-500/70" />
                  <span className="text-slate-400">{Math.round(day.avgCloud || 0)}%</span>
                </div>
                <div className="bg-slate-900/60 rounded px-2 py-1.5 flex items-center gap-1">
                  <Umbrella className="w-3 h-3 text-sky-500/70" />
                  <span className={precipGiorno === 0 ? "text-emerald-400/70" : "text-amber-400/70"}>
                    {precipGiorno === 0 ? "Assente" : `${precipGiorno.toFixed(1)}mm`}
                  </span>
                </div>
                <div className="bg-slate-900/60 rounded px-2 py-1.5 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-500/70" />
                  <span className="text-slate-400">{Math.round((day.tempMin + day.tempMax) / 2)}°C</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Fasce orarie */}
      {fasce && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {fasce.map((fascia: any, idx: number) => {
            if (!fascia) return null;
            const scoreColor = fascia.score >= 7 ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
              : fascia.score >= 4 ? "bg-amber-500/15 border-amber-500/20 text-amber-400"
              : "bg-red-500/15 border-red-500/20 text-red-400";
            const dirCardinal = degreesToCardinal(fascia.windDirMedia);
            const dirArr = windArrow(fascia.windDirMedia);
            const borderKey = idx === 0 ? "border-amber-500/20" : idx === 1 ? "border-sky-500/20" : "border-indigo-500/20";
            return (
              <div key={idx} className={`rounded-lg border ${borderKey} bg-slate-900/40 p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-200">{fascia.label}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${scoreColor}`}>{fascia.score}/10</span>
                </div>
                
                <div className="text-base font-bold text-amber-400 mb-2">
                  {fascia.tempMedia}°C <span className="text-xs text-slate-500 font-normal">max {fascia.tempMax}°</span>
                </div>

                {/* Vento */}
                <div className="bg-slate-900/60 rounded-lg p-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs mb-0.5">
                    <Wind className="w-3.5 h-3.5 text-sky-500/70" />
                    <span className="font-semibold text-sky-300">{fascia.windMedia} km/h</span>
                    <span className="text-slate-500">raffiche {fascia.windMax}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{dirArr} {dirCardinal} ({fascia.windDirMedia}°)</div>
                </div>

                {/* Termiche */}
                <div className="bg-slate-900/60 rounded-lg p-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs mb-1">
                    <ArrowUp className="w-3.5 h-3.5 text-orange-500/70" />
                    <span className={`font-semibold ${fascia.termicheColore}`}>{fascia.termicheLabel}</span>
                    <span className="text-slate-500 ml-auto">{fascia.salita.toFixed(1)} m/s</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                    <span>Base: <span className="text-emerald-400 font-semibold">{fascia.base} m</span></span>
                    <span>Top: <span className="text-orange-400 font-semibold">{fascia.top} m</span></span>
                    <span>Spessore: <span className="text-amber-400 font-semibold">{fascia.top - fascia.base} m</span></span>
                  </div>
                </div>

                {/* Altri dati */}
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div className="bg-slate-900/60 rounded px-2 py-1.5 flex items-center justify-between">
                    <Cloud className="w-3 h-3 text-slate-500/70" />
                    <span className="font-medium text-slate-400">{fascia.cloudMedia}%</span>
                  </div>
                  <div className="bg-slate-900/60 rounded px-2 py-1.5 flex items-center justify-between">
                    <Droplets className="w-3 h-3 text-sky-500/70" />
                    <span className="font-medium text-sky-300">{fascia.humMedia}%</span>
                  </div>
                  <div className="bg-slate-900/60 rounded px-2 py-1.5 flex items-center justify-between">
                    <Gauge className="w-3 h-3 text-violet-500/70" />
                    <span className="font-medium text-violet-300">{fascia.pressMedia} hPa</span>
                  </div>
                  <div className="bg-slate-900/60 rounded px-2 py-1.5 flex items-center justify-between">
                    {fascia.precipTot === 0 ? (
                      <CheckCircle className="w-3 h-3 text-emerald-500/70" />
                    ) : (
                      <Umbrella className="w-3 h-3 text-sky-500/70" />
                    )}
                    <span className="font-medium text-slate-400">
                      {fascia.precipTot === 0 ? "Secco" : `${fascia.precipTot}mm`}
                    </span>
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
