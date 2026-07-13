"use client";

import React from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  Snowflake,
  CloudLightning,
  CloudFog,
  Thermometer,
  Wind,
  Droplets,
  ArrowUp,
  ArrowDown,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Navigation,
  CalendarDays,
  Umbrella,
  Eye,
  Gauge,
  Sparkles,
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

// Icona meteo con lucide-react in base al weather code WMO
function getWeatherIcon(code: number, size: number = 32) {
  const props = { size, strokeWidth: 1.5 };
  if (code === 0) return <Sun {...props} className="text-amber-300" />;
  if (code === 1) return <CloudSun {...props} className="text-amber-200" />;
  if (code === 2) return <CloudSun {...props} className="text-amber-100" />;
  if (code === 3) return <Cloud {...props} className="text-slate-300" />;
  if (code >= 45 && code <= 48) return <CloudFog {...props} className="text-slate-400" />;
  if (code >= 51 && code <= 57) return <CloudRain {...props} className="text-blue-300" />;
  if (code >= 61 && code <= 67) return <CloudRain {...props} className="text-blue-400" />;
  if (code >= 71 && code <= 77) return <Snowflake {...props} className="text-blue-200" />;
  if (code >= 80 && code <= 82) return <CloudRain {...props} className="text-blue-300" />;
  if (code >= 95) return <CloudLightning {...props} className="text-yellow-300" />;
  return <Cloud {...props} className="text-slate-400" />;
}

function getWindArrow(deg: number): string {
  if (deg == null) return "→";
  const arrows = ["↑ N", "↗ NE", "→ E", "↘ SE", "↓ S", "↙ SW", "← W", "↖ NW"];
  return arrows[Math.round(deg / 45) % 8];
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
  if (!enrichedDaily || enrichedDaily.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Caricamento previsioni...
      </div>
    );
  }

  // Dati orari per il giorno selezionato (ore 6-23)
  const hoursForDay = (dayData || []).filter((h: any) => h?.time && enrichedDaily[selectedDay]?.date) as any[];
  const targetDate = enrichedDaily[selectedDay]?.date;
  const filteredHours = hoursForDay.filter((h: any) => {
    const t = new Date(h.time);
    return t.getDate() === targetDate?.getDate() && 
           t.getMonth() === targetDate?.getMonth() &&
           t.getFullYear() === targetDate?.getFullYear();
  });

  // Metriche reali per ogni fascia: MATTINA (6-11), POMERIGGIO (12-17), SERA (18-23)
  const calcolaFascia = (ore: any[], fasciaLabel: string, icon: React.ReactNode) => {
    if (!ore.length) return null;

    const media = (arr: number[]) => arr.filter(v => v != null).reduce((s: number, v: number) => s + v, 0) / Math.max(1, arr.filter(v => v != null).length);
    const max = (arr: number[]) => Math.max(...arr.filter(v => v != null), 0);
    
    const tempMedia = Math.round(media(ore.map((h: any) => h.temperature || 0)));
    const tempMax = Math.round(max(ore.map((h: any) => h.temperature || 0)));
    const tempMin = Math.round(Math.min(...ore.map((h: any) => h.temperature || 50)));
    
    const windMedia = Math.round(media(ore.map((h: any) => h.windSpeed || 0)));
    const windMax = Math.round(max(ore.map((h: any) => h.windSpeed || 0)));
    const windDirMedia = Math.round(media(ore.map((h: any) => h.windDir || 0)));
    
    const cloudMedia = Math.round(media(ore.map((h: any) => h.cloudCover || 0)));
    const precipTot = Math.round(ore.reduce((s: number, h: any) => s + (h.precipitation || 0), 0) * 10) / 10;
    const humMedia = Math.round(media(ore.map((h: any) => h.humidity || 50)));
    const pressMedia = Math.round(media(ore.map((h: any) => h.pressure || 1013)));
    
    // Lifting Condensation Level (base nuvole)
    const spread = tempMedia - Math.round(media(ore.map((h: any) => h.dewPoint || (h.temperature - (100 - h.humidity) / 5))));
    const lcl = Math.max(200, Math.min(3000, spread * 125));
    
    // Velocità di salita termica da gradiente reale
    let salita = 0;
    const hour10_15 = ore.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 10 && hh <= 15;
    });
    
    if (hour10_15.length > 0) {
      // Usa gradiente reale se temp80m/120m disponibile
      const temps80m = hour10_15.map((h: any) => h.temp80m).filter(Boolean);
      if (temps80m.length > 0) {
        const t80mMedia = media(temps80m);
        const gradiente = (tempMedia - t80mMedia) / 0.78;
        salita = Math.max(0, Math.min(8, (gradiente - 0.5) * 3));
      }
    }
    
    // Fallback: stima da delta T
    if (salita === 0) {
      const dayDelta = enrichedDaily[selectedDay]?.thermalDelta || 0;
      salita = Math.max(0, Math.min(5, 
        (dayDelta * 0.4) + 
        (cloudMedia < 50 ? 1 : 0) + 
        (windMedia >= 5 && windMedia <= 18 ? 1.5 : 0) -
        (precipTot > 0.5 ? 3 : 0)
      ));
    }
    salita = Math.round(salita * 10) / 10;

    // Termiche label
    let termicheLabel = "Assenti ❌";
    let termicheColore = "text-slate-400";
    if (salita >= 4) { termicheLabel = "Forti 🔥"; termicheColore = "text-red-400"; }
    else if (salita >= 3) { termicheLabel = "Buone 🪂"; termicheColore = "text-orange-400"; }
    else if (salita >= 2) { termicheLabel = "Moderate 👍"; termicheColore = "text-amber-400"; }
    else if (salita >= 1) { termicheLabel = "Deboli 👎"; termicheColore = "text-amber-300"; }
    else if (salita >= 0.3) { termicheLabel = "Molto deboli ☁️"; termicheColore = "text-yellow-300"; }

    // Top termico (LCL + spessore)
    const top = Math.min(5000, lcl + Math.round(salita * 400));

    // Score volo (0-10)
    let score = 5;
    if (windMedia >= 5 && windMedia <= 18) score += 2;
    else if (windMedia > 18 && windMedia <= 25) score += 0;
    else score -= 2;
    if (precipTot < 0.1) score += 2;
    else if (precipTot < 0.5) score += 0;
    else score -= 3;
    if (cloudMedia >= 10 && cloudMedia <= 60) score += 1.5;
    if (salita >= 2) score += 2;
    else if (salita >= 1) score += 1;
    if (windMax > 30) score -= 2;
    score = Math.max(0, Math.min(10, Math.round(score)));

    return {
      fasciaLabel,
      icon,
      tempMedia, tempMax, tempMin,
      windMedia, windMax, windDirMedia,
      cloudMedia, precipTot, humMedia, pressMedia,
      lcl, salita, top, termicheLabel, termicheColore, score,
    };
  };

  const mattina = calcolaFascia(
    filteredHours.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 6 && hh <= 11; }),
    "Mattina", <Sun className="w-5 h-5 text-amber-300" />
  );
  const pomeriggio = calcolaFascia(
    filteredHours.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 12 && hh <= 17; }),
    "Pomeriggio", <CloudSun className="w-5 h-5 text-yellow-300" />
  );
  const sera = calcolaFascia(
    filteredHours.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 18 && hh <= 23; }),
    "Sera", <Moon className="w-5 h-5 text-indigo-300" />
  );

  return (
    <div className="space-y-4">
      {/* GIORNI SELEZIONE */}
      <div className="grid grid-cols-3 gap-2">
        {enrichedDaily.slice(0, 3).map((day: any, idx: number) => {
          const isActive = idx === selectedDay;
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
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${isActive ? "text-emerald-200" : "text-white"}`}>
                  {dateLabels[idx] || "Giorno"}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div className="opacity-90">
                  {getWeatherIcon(day.weatherCode || 0, 28)}
                </div>
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

      {/* FASCE ORARIE */}
      <div className="grid grid-cols-3 gap-2">
        {[mattina, pomeriggio, sera].filter(Boolean).map((fascia: any, idx: number) => {
          if (!fascia) return null;
          
          let borderColor = "border-slate-600/30";
          if (idx === 0) borderColor = "border-amber-500/30";
          else if (idx === 1) borderColor = "border-sky-500/30";
          else borderColor = "border-indigo-500/30";

          const scoreColor = fascia.score >= 8 ? "text-emerald-300" : fascia.score >= 5 ? "text-amber-300" : "text-red-300";
          const scoreBg = fascia.score >= 8 ? "bg-emerald-500/15 border-emerald-400/30" : fascia.score >= 5 ? "bg-amber-500/15 border-amber-400/30" : "bg-red-500/15 border-red-400/30";

          return (
            <div key={idx} className={`rounded-xl p-3 border-2 ${borderColor} bg-slate-800/40`}>
              {/* Header fascia */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {fascia.icon}
                  <span className="text-xs font-bold text-white">{fascia.fasciaLabel}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${scoreBg} ${scoreColor}`}>
                  {fascia.score}/10
                </span>
              </div>

              {/* Temperatura */}
              <div className="text-2xl font-bold text-amber-300 mb-2">
                {fascia.tempMedia}°C
              </div>

              {/* Vento */}
              <div className="bg-slate-900/60 rounded-lg p-2 mb-1">
                <div className="flex items-center gap-1 text-xs mb-1">
                  <Wind className="w-3 h-3 text-sky-400" />
                  <span className="text-sky-300 font-bold">{fascia.windMedia} km/h</span>
                  <span className="text-slate-500">(max {fascia.windMax})</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {getWindArrow(fascia.windDirMedia)}
                </div>
              </div>

              {/* Termiche */}
              <div className="bg-slate-900/60 rounded-lg p-2 mb-1">
                <div className="flex items-center gap-1 text-xs mb-1">
                  <ArrowUp className="w-3 h-3 text-orange-400" />
                  <span className={fascia.termicheColore + " font-bold"}>{fascia.termicheLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                  <span>Salita: <span className="text-emerald-300 font-bold">{fascia.salita} m/s</span></span>
                  <span>Base: <span className="text-green-300 font-bold">{fascia.lcl} m</span></span>
                  <span>Top: <span className="text-red-300 font-bold">{fascia.top} m</span></span>
                  <span>Spessore: <span className="text-amber-300 font-bold">{fascia.top - fascia.lcl} m</span></span>
                </div>
              </div>

              {/* Altri dati */}
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-slate-900/50 rounded px-2 py-1 flex items-center justify-between">
                  <Cloud className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-300">{fascia.cloudMedia}%</span>
                </div>
                {fascia.precipTot > 0 && (
                  <div className="bg-slate-900/50 rounded px-2 py-1 flex items-center justify-between">
                    <Umbrella className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-300">{fascia.precipTot}mm</span>
                  </div>
                )}
                {fascia.precipTot === 0 && (
                  <div className="bg-slate-900/50 rounded px-2 py-1 flex items-center justify-between">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-bold text-green-300">Secco</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* RIEPILOGO GIORNATA */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
        <h4 className="text-xs font-bold text-orange-300 mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Riepilogo {dateLabels[selectedDay]}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <div className="text-[9px] text-slate-400 uppercase mb-0.5">Temp Max</div>
            <div className="text-base font-bold text-amber-300">
              {enrichedDaily[selectedDay] ? Math.round(enrichedDaily[selectedDay].tempMax) : "--"}°
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <div className="text-[9px] text-slate-400 uppercase mb-0.5">Temp Min</div>
            <div className="text-base font-bold text-blue-300">
              {enrichedDaily[selectedDay] ? Math.round(enrichedDaily[selectedDay].tempMin) : "--"}°
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <div className="text-[9px] text-slate-400 uppercase mb-0.5">Vento medio</div>
            <div className="text-base font-bold text-sky-300">
              {enrichedDaily[selectedDay] && enrichedDaily[selectedDay].avgWind != null ? Math.round(enrichedDaily[selectedDay].avgWind) : "--"}
            </div>
            <div className="text-[9px] text-slate-500">km/h</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <div className="text-[9px] text-slate-400 uppercase mb-0.5">Pioggia</div>
            <div className="text-base font-bold text-blue-300">
              {enrichedDaily[selectedDay] && enrichedDaily[selectedDay].precipitationSum != null ? enrichedDaily[selectedDay].precipitationSum.toFixed(1) : "0.0"}
            </div>
            <div className="text-[9px] text-slate-500">mm</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente Moon mancante (lucide-react ha Moon)
import { Moon } from "lucide-react";