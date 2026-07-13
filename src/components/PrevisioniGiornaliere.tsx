"use client";

import React, { useMemo } from "react";
import {
  Sun, Moon, CloudSun, Cloud, CloudRain, Snowflake,
  CloudLightning, CloudFog, Thermometer, Wind, Droplets,
  ArrowUp, CheckCircle, Gauge, Umbrella, Sparkles, ChevronUp
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

function getWeatherIcon(code: number | undefined | null, size: number = 40) {
  if (code === undefined || code === null || isNaN(code)) {
    return { icon: <Sun size={size} className="text-amber-300" />, desc: "N/D" };
  }
  if (code === 0 || code === 1) return { icon: <Sun size={size} className="text-amber-300" />, desc: "Sereno" };
  if (code === 2) return { icon: <CloudSun size={size} className="text-amber-200" />, desc: "Poco nuvoloso" };
  if (code === 3) return { icon: <Cloud size={size} className="text-slate-300" />, desc: "Nuvoloso" };
  if (code >= 45 && code <= 48) return { icon: <CloudFog size={size} className="text-slate-400" />, desc: "Nebbia" };
  if (code >= 51 && code <= 57) return { icon: <CloudRain size={size} className="text-blue-300" />, desc: "Pioggerella" };
  if (code >= 61 && code <= 67) return { icon: <CloudRain size={size} className="text-blue-400" />, desc: "Pioggia" };
  if (code >= 71 && code <= 77) return { icon: <Snowflake size={size} className="text-sky-200" />, desc: "Neve" };
  if (code >= 80 && code <= 84) return { icon: <CloudRain size={size} className="text-blue-300" />, desc: "Rovesci" };
  if (code >= 95 && code <= 99) return { icon: <CloudLightning size={size} className="text-yellow-300" />, desc: "Temporali" };
  return { icon: <Sun size={size} className="text-amber-300" />, desc: "Sereno" };
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
  if (typeof date === 'string' && date.includes('-')) {
    const [y, m, d] = date.split('-');
    return `${d}/${m}`;
  }
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PrevisioniGiornaliere({
  enrichedDaily, dateLabels, currentData, dayData, site,
  selectedDay, onSelectDay,
}: PrevisioniGiornaliereProps) {

  const dominanteCodice = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    return getDominantWeatherCode(dayData.map((h: any) => h.weatherCode));
  }, [dayData]);

  const precipTotaleReale = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    return Math.round(dayData.reduce((s: number, h: any) => s + (h.precipitation || 0), 0) * 10) / 10;
  }, [dayData]);

  const weatherIcon = getWeatherIcon(dominanteCodice, 52);

  const hasLatePrecip = useMemo(() => {
    if (!dayData || dayData.length === 0) return false;
    const evening = dayData.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 18; });
    const morning = dayData.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 6 && hh <= 17; });
    const ePrecip = evening.reduce((s: number, h: any) => s + (h.precipitation || 0), 0);
    const mPrecip = morning.reduce((s: number, h: any) => s + (h.precipitation || 0), 0);
    return ePrecip > 0.1 && mPrecip === 0;
  }, [dayData]);

  const dailyWeatherCodes = useMemo(() => {
    return enrichedDaily.map((day: any) => {
      if (!day?.date) return 0;
      const d = typeof day.date === 'string' ? day.date : (day.date instanceof Date ? day.date : new Date(day.date));
      const hours = dayData?.filter((h: any) => {
        const t = new Date(h.time);
        if (typeof d === 'string') return t.toISOString().split('T')[0] === d.split('T')[0];
        return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate();
      }) || [];
      return getDominantWeatherCode(hours.map((h: any) => h.weatherCode));
    });
  }, [enrichedDaily, dayData]);

  const dailyPrecipTotals = useMemo(() => {
    return enrichedDaily.map((day: any, idx: number) => {
      if (idx === selectedDay && precipTotaleReale > 0) return precipTotaleReale;
      return Math.round(day.precipSum * 10) / 10;
    });
  }, [enrichedDaily, selectedDay, precipTotaleReale]);

  const dailyLatePrecip = useMemo(() => {
    return enrichedDaily.map((day: any, idx: number) => idx === selectedDay ? hasLatePrecip : false);
  }, [enrichedDaily, selectedDay, hasLatePrecip]);

  const fasce = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    const filtra = (min: number, max: number) => dayData.filter((h: any) => {
      const hh = new Date(h.time).getHours(); return hh >= min && hh <= max;
    });
    const media = (arr: number[]) => arr.filter(v => v != null).reduce((s: number, v: number) => s + v, 0) / Math.max(1, arr.filter(v => v != null).length);
    const max = (arr: number[]) => Math.max(...arr.filter(v => v != null), 0);
    
    const calcola = (ore: any[], label: string, borderColor: string) => {
      if (!ore.length) return null;
      const tempMedia = Math.round(media(ore.map((h: any) => h.temperature)));
      const tempMax = Math.round(max(ore.map((h: any) => h.temperature)));
      const windMedia = Math.round(media(ore.map((h: any) => h.windSpeed)));
      const windMax = Math.round(max(ore.map((h: any) => h.windSpeed)));
      const windDirMedia = Math.round(media(ore.map((h: any) => h.windDir)));
      const cloudMedia = Math.round(media(ore.map((h: any) => h.cloudCover)));
      const precipTot = Math.round(ore.reduce((s: number, h: any) => s + (h.precipitation || 0), 0) * 10) / 10;
      const humMedia = Math.round(media(ore.map((h: any) => h.humidity)));
      const weatherCodes = ore.map((h: any) => h.weatherCode).filter((c: any) => c != null && !isNaN(c));
      const weatherCode = weatherCodes.length > 0 ? getDominantWeatherCode(weatherCodes) : 0;
      const wi = getWeatherIcon(weatherCode, 24);
      
      const dewMedia = media(ore.map((h: any) => h.dewPoint || h.temperature - (100 - h.humidity) / 5));
      const spread = Math.max(0, tempMedia - dewMedia);
      const lcl = Math.max(200, Math.min(3000, Math.round(spread * 125)));
      
      const ore10_15 = ore.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 10 && hh <= 15; });
      let salita = 0;
      if (ore10_15.length > 0) {
        const t80m = ore10_15.map((h: any) => h.temp80m).filter((v: any) => v != null);
        const t120m = ore10_15.map((h: any) => h.temp120m).filter((v: any) => v != null);
        if (t80m.length > 0) {
          const gradiente = (media(ore10_15.map((h: any) => h.temperature)) - media(t80m)) / 0.78;
          salita = Math.max(0, Math.min(8, (gradiente - 0.5) * 3.5));
        } else if (t120m.length > 0) {
          const gradiente = (media(ore10_15.map((h: any) => h.temperature)) - media(t120m)) / 1.18;
          salita = Math.max(0, Math.min(8, (gradiente - 0.5) * 3.5));
        }
      }
      if (salita === 0) {
        const delta = tempMedia - dewMedia;
        salita = Math.max(0, Math.min(8, delta * 0.1 + (windMedia >= 5 && windMedia <= 18 ? 1.2 : 0) + (cloudMedia >= 10 && cloudMedia <= 45 ? 0.8 : 0) + (precipTot > 0.5 ? -3 : 0) + (label === "Pomeriggio" ? 0.5 : 0)));
      }
      salita = Math.round(salita * 10) / 10;
      
      let termicheLabel = "Assenti", termicheColore = "text-slate-400";
      if (salita >= 4) { termicheLabel = "Forti"; termicheColore = "text-red-400"; }
      else if (salita >= 3) { termicheLabel = "Buone"; termicheColore = "text-orange-400"; }
      else if (salita >= 2) { termicheLabel = "Moderate"; termicheColore = "text-amber-400"; }
      else if (salita >= 1) { termicheLabel = "Deboli"; termicheColore = "text-amber-300"; }
      
      const dirCardinal = degreesToCardinal(windDirMedia);
      const dirArrow = windArrow(windDirMedia);
      
      return { label, tempMedia, tempMax, windMedia, windMax, windDirMedia, cloudMedia, precipTot, humMedia, lcl, salita, top: Math.min(5000, lcl + Math.round(salita * 350)), termicheLabel, termicheColore, weatherIcon: wi, dirCardinal, dirArrow, borderColor };
    };
    
    return [
      calcola(filtra(6, 11), "Mattina", "border-amber-500/30"),
      calcola(filtra(12, 17), "Pomeriggio", "border-sky-500/30"),
      calcola(filtra(18, 23), "Sera", "border-indigo-500/30"),
    ].filter(Boolean);
  }, [dayData]);

  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-6 text-slate-400 text-sm">Caricamento previsioni...</div>;
  }

  return (
    <div className="space-y-4">
      {/* SELEZIONE GIORNI - più compatta con icone enormi */}
      <div className="grid grid-cols-1 gap-3">
        {enrichedDaily.slice(0, 3).map((day: any, idx: number) => {
          const isActive = idx === selectedDay;
          const dateStr = formatDate(day.date);
          const wc = dailyWeatherCodes[idx] ?? dominanteCodice ?? 0;
          const wi = getWeatherIcon(wc, 56);
          const pg = dailyPrecipTotals[idx] ?? day.precipSum ?? 0;
          const lp = dailyLatePrecip[idx] ?? false;
          const tempMedia = Math.round((day.tempMin + day.tempMax) / 2);
          
          const windDesc = `${Math.round(day.avgWind || 0)} km/h ` + degreesToCardinal(day.avgWindDir || 0);
          
          return (
            <button key={idx} onClick={() => onSelectDay(idx)}
              className={`relative rounded-2xl p-4 border-2 transition-all duration-300 text-left ${
                isActive ? "border-emerald-400/60 bg-gradient-to-br from-emerald-900/40 to-slate-800/60 shadow-lg shadow-emerald-500/20" : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600/60"
              }`}
            >
              {isActive && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />}
              
              {/* RIGA SUPERIORE: icona enorme + nome giorno */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="-ml-1">{wi.icon}</div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {idx === 0 ? "Oggi" : idx === 1 ? "Domani" : "Dopodomani"}
                    </div>
                    <div className="text-sm text-slate-400">{dateStr}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{Math.round(day.tempMax)}°</div>
                  <div className="text-xs text-slate-400">min {Math.round(day.tempMin)}°</div>
                </div>
              </div>
              
              {/* RIGA METADATI: compatta, 4 colonne */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                  <Wind className="w-5 h-5 text-sky-400 mx-auto mb-0.5" />
                  <div className="text-xs font-bold text-sky-300">{Math.round(day.avgWind || 0)} <span className="text-[10px] text-slate-500">km/h</span></div>
                </div>
                <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                  <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-0.5" />
                  <div className="text-xs font-bold text-blue-300">{Math.round(day.avgHum || 0)}%</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                  <Cloud className="w-5 h-5 text-slate-400 mx-auto mb-0.5" />
                  <div className="text-xs font-bold text-slate-200">{Math.round(day.avgCloud || 0)}%</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                  <Umbrella className="w-5 h-5 text-amber-400 mx-auto mb-0.5" />
                  <div className="text-xs font-bold text-amber-300">{lp ? "Serata" : pg > 0 ? `${pg}mm` : "No"}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* FASCE ORARIE - font grandi, frecce vento enormi */}
      {fasce && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {fasce.map((fascia: any, idx: number) => {
            if (!fascia) return null;
            return (
              <div key={idx} className={`rounded-2xl p-4 border-2 ${fascia.borderColor} bg-slate-800/40`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {fascia.weatherIcon.icon}
                    <div>
                      <div className="text-lg font-bold text-white">{fascia.label}</div>
                      <div className="text-xs text-slate-400">{fascia.weatherIcon.desc}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-300">{fascia.tempMedia}°</div>
                </div>

                {/* VENTO con freccia grande */}
                <div className="bg-slate-900/60 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind className="w-6 h-6 text-sky-400" />
                      <div>
                        <div className="text-lg font-bold text-sky-300">{fascia.windMedia} <span className="text-xs text-slate-400">km/h</span></div>
                        <div className="text-xs text-slate-400">Raffiche {fascia.windMax}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-200">{fascia.dirArrow}</div>
                      <div className="text-xs text-slate-400">{fascia.dirCardinal} ({fascia.windDirMedia}°)</div>
                    </div>
                  </div>
                </div>

                {/* TERMICHE */}
                <div className="bg-slate-900/60 rounded-xl p-3 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <ChevronUp className={`w-5 h-5 ${fascia.termicheColore}`} />
                    <span className={`text-sm font-bold ${fascia.termicheColore}`}>{fascia.termicheLabel}</span>
                    <span className="text-sm font-bold text-emerald-300 ml-auto">{fascia.salita.toFixed(1)} m/s</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-950/40 rounded-lg p-1.5 text-center">
                      <span className="text-slate-500">Base</span><br />
                      <span className="text-green-300 font-bold text-sm">{fascia.lcl}m</span>
                    </div>
                    <div className="bg-slate-950/40 rounded-lg p-1.5 text-center">
                      <span className="text-slate-500">Top</span><br />
                      <span className="text-red-300 font-bold text-sm">{fascia.top}m</span>
                    </div>
                    <div className="bg-slate-950/40 rounded-lg p-1.5 text-center">
                      <span className="text-slate-500">Spess.</span><br />
                      <span className="text-amber-300 font-bold text-sm">{fascia.top - fascia.lcl}m</span>
                    </div>
                  </div>
                </div>

                {/* RIGA dati extra - compatta */}
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="bg-slate-900/50 rounded-lg p-1.5 text-center">
                    <Cloud className="w-4 h-4 text-slate-400 mx-auto" />
                    <span className="text-xs font-bold text-slate-200">{fascia.cloudMedia}%</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-1.5 text-center">
                    <Droplets className="w-4 h-4 text-blue-400 mx-auto" />
                    <span className="text-xs font-bold text-blue-300">{fascia.humMedia}%</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-1.5 text-center">
                    <Gauge className="w-4 h-4 text-purple-400 mx-auto" />
                    <span className="text-xs font-bold text-purple-300">{fascia.precipTot === 0 ? "Secco" : `${fascia.precipTot}mm`}</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-1.5 text-center">
                    <Thermometer className="w-4 h-4 text-orange-400 mx-auto" />
                    <span className="text-xs font-bold text-orange-300">{fascia.tempMax}°</span>
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