"use client";

import React, { useMemo } from "react";
import {
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, CloudFog,
  Calendar
} from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: any[];
  dateLabels: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure?: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
  nomeDecollo?: string;
}

function getWeatherInfo(code: number | undefined | null) {
  if (code == null || (typeof code === "number" && isNaN(code))) {
    return { icon: <Sun className="w-6 h-6 text-amber-300" />, desc: "N/D" };
  }
  if (code === 0 || code === 1) return { icon: <Sun className="w-6 h-6 text-amber-300" />, desc: "Sereno" };
  if (code === 2) return { icon: <CloudSun className="w-6 h-6 text-amber-200" />, desc: "Poco nuvoloso" };
  if (code === 3) return { icon: <Cloud className="w-6 h-6 text-slate-300" />, desc: "Nuvoloso" };
  if (code >= 45 && code <= 48) return { icon: <CloudFog className="w-6 h-6 text-slate-400" />, desc: "Nebbia" };
  if (code >= 51 && code <= 57) return { icon: <CloudRain className="w-6 h-6 text-blue-300" />, desc: "Pioggerella" };
  if (code >= 61 && code <= 67) return { icon: <CloudRain className="w-6 h-6 text-blue-400" />, desc: "Pioggia" };
  if (code >= 80 && code <= 84) return { icon: <CloudRain className="w-6 h-6 text-blue-300" />, desc: "Rovesci" };
  if (code >= 95 && code <= 99) return { icon: <CloudLightning className="w-6 h-6 text-yellow-300" />, desc: "Temporali" };
  return { icon: <Sun className="w-6 h-6 text-amber-300" />, desc: "Sereno" };
}

function getDominantWeatherCode(hourlyCodes: (number | undefined | null)[]): number {
  const valid = hourlyCodes.filter((c): c is number => c != null && !isNaN(c));
  if (valid.length === 0) return 0;
  const freq: Record<string, number> = {};
  for (const c of valid) {
    freq[String(c)] = (freq[String(c)] || 0) + 1;
  }
  let maxCode = 0;
  let maxCount = 0;
  const entries = Object.entries(freq);
  for (let i = 0; i < entries.length; i++) {
    const [ck, count] = entries[i];
    if (count > maxCount) {
      maxCount = count;
      maxCode = parseInt(ck, 10);
    }
  }
  return maxCode;
}

function formatDateShort(date: any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
}

function getCurrentDateTime(): string {
  const now = new Date();
  const date = now.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  const time = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  currentData,
  dayData,
  site,
  selectedDay,
  onSelectDay,
}: PrevisioniGiornaliereProps) {
  const alt = site.altitude;

  const dailyWeatherCodes = useMemo(() => {
    const result: number[] = [];
    for (let di = 0; di < enrichedDaily.length; di++) {
      const day = enrichedDaily[di];
      if (!day?.date) { result.push(0); continue; }
      const d = day.date instanceof Date ? day.date : new Date(day.date);
      const codes: number[] = [];
      if (dayData && dayData.length > 0) {
        for (let hi = 0; hi < dayData.length; hi++) {
          const t = new Date(dayData[hi].time);
          if (t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate()) {
            codes.push(dayData[hi].weatherCode);
          }
        }
      }
      if (codes.length === 0) codes.push(day.weatherCode);
      result.push(getDominantWeatherCode(codes));
    }
    return result;
  }, [enrichedDaily, dayData]);

  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-base">Caricamento previsioni...</div>;
  }

  const now = getCurrentDateTime();
  const days = enrichedDaily.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Data e ora aggiornamento */}
      <div className="text-center text-[10px] text-slate-500 tracking-wider">
        {now}
      </div>

      {/* Card giorni centrate */}
      <div className="flex flex-wrap justify-center gap-3">
        {days.map((day, idx) => {
          const isActive = idx === selectedDay;
          const weatherCode = dailyWeatherCodes[idx] ?? 0;
          const weatherInfo = getWeatherInfo(weatherCode);

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={
                "text-center transition-all border-2 cursor-pointer p-4 rounded-xl flex-1 min-w-[120px] max-w-[180px] " +
                (isActive
                  ? "border-emerald-400 bg-emerald-900/40 shadow-lg shadow-emerald-500/10"
                  : "border-slate-700/50 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60")
              }
            >
              {/* Nome giorno */}
              <div className="text-sm font-bold text-white mb-1">
                {idx === 0 ? "Oggi" : idx === 1 ? "Domani" : "Dopodomani"}
              </div>

              {/* Data */}
              <div className="text-[10px] text-slate-500 mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                {day.date ? formatDateShort(day.date) : ""}
              </div>

              {/* Icona meteo */}
              <div className="flex justify-center my-2">{weatherInfo.icon}</div>

              {/* Descrizione meteo */}
              <div className="text-xs text-slate-300 font-bold mb-1">{weatherInfo.desc}</div>

              {/* Temperature */}
              <div className="text-lg font-bold text-white">{Math.round(day.tempMax)}°</div>
              <div className="text-[10px] text-slate-400">min {Math.round(day.tempMin)}°</div>

              {/* Pioggia */}
              <div className="text-[10px] text-slate-500 mt-1">
                {(day.precipSum ?? 0) > 0
                  ? `${(day.precipSum ?? 0).toFixed(1)} mm`
                  : "0 mm"}
              </div>

              {/* Ora ultimo aggiornamento */}
              <div className="text-[8px] text-slate-600 mt-2">
                {now}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}