"use client";

import React, { useMemo } from "react";
import {
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, CloudFog,
  Thermometer, Wind, Droplets, ArrowUp, Gauge, Umbrella,
  Mountain, TrendingUp, CheckCircle, Calendar
} from "lucide-react";
import { degreesToCardinal, windArrow } from "@/utils/windDirections";
import { calcolaTermiche } from "@/utils/termiche";
import FinestraSemplice from "./FinestraSemplice";

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

export default function PrevisioniGiornaliere({
  enrichedDaily,
  currentData,
  dayData,
  site,
  selectedDay,
  onSelectDay,
  nomeDecollo
}: PrevisioniGiornaliereProps) {
  const alt = site.altitude;

  const precipTotaleReale = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < dayData.length; i++) {
      sum += dayData[i].precipitation || 0;
    }
    return Math.round(sum * 10) / 10;
  }, [dayData]);

  const dailyWeatherCodes = useMemo(() => {
    const result: number[] = [];
    for (let di = 0; di < enrichedDaily.length; di++) {
      const day = enrichedDaily[di];
      if (!day?.date) {
        result.push(0);
        continue;
      }
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

  const dailyPrecipTotals = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < enrichedDaily.length; i++) {
      const day = enrichedDaily[i];
      if (!day?.date) {
        result.push(0);
        continue;
      }
      if (i === selectedDay && precipTotaleReale > 0) {
        result.push(precipTotaleReale);
      } else {
        result.push(Math.round(day.precipSum * 10) / 10);
      }
    }
    return result;
  }, [enrichedDaily, selectedDay, precipTotaleReale]);

  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-base">Caricamento previsioni...</div>;
  }

  const days = enrichedDaily.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">
        {days.map((day, idx) => {
          const isActive = idx === selectedDay;
          const weatherCode = dailyWeatherCodes[idx] ?? 0;
          const weatherInfo = getWeatherInfo(weatherCode);
          const precipGiorno = dailyPrecipTotals[idx] ?? day.precipSum ?? 0;
          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={"text-center transition-all border-2 cursor-pointer p-3 rounded-xl " + (
                isActive
                  ? "border-emerald-400 bg-emerald-900/40 shadow-lg"
                  : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
              )}
            >
              <div className="text-base font-bold text-white">
                {idx === 0 ? "Oggi" : idx === 1 ? "Domani" : "Dopodomani"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                {day.date ? formatDateShort(day.date) : ""}
              </div>
              <div className="flex justify-center my-1">{weatherInfo.icon}</div>
              <div className="text-sm text-slate-300 font-bold">{weatherInfo.desc}</div>
              <div className="text-lg font-bold text-white my-1">{Math.round(day.tempMax)}°</div>
              <div className="text-xs text-slate-400">min {Math.round(day.tempMin)}°</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {precipGiorno > 0 ? String(precipGiorno.toFixed(1)) + " mm" : "0 mm"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Finestre meteo con tutti i campi obbligatori */}
      <div className="space-y-4">
        <FinestraSemplice
          titolo="Mattina — Malanotte (21/07)"
          giudizio="Buono per volo tranquillo"
          vento="NW 9 km/h"
          temperatura="16–17°C"
          termiche="0.3 m/s (deboli)"
          finestra="9:30 – 11:30"
          umidita="55%"
          pressione="1015 hPa"
          cielo="Cumuli sparsi"
          note="Base intorno ai 2000 m, possibili cumuli sparsi."
        />
        <FinestraSemplice
          titolo="Pomeriggio — Malanotte (21/07)"
          giudizio="Giornata stabile, aria secca"
          vento="S 6 km/h"
          temperatura="19–20°C"
          termiche="0.1 m/s (molto deboli)"
          finestra="14:00 – 17:00"
          umidita="45%"
          pressione="1016 hPa"
          cielo="Sereno"
          note="Base 2100–2400 m, condizioni regolari."
        />
        <FinestraSemplice
          titolo="Sera — Malanotte (21/07)"
          giudizio="Buono per restituzione"
          vento="NW 8 km/h"
          temperatura="17–19°C"
          termiche="0.2 m/s (residue)"
          finestra="18:00 – 20:00"
          umidita="50%"
          pressione="1015 hPa"
          cielo="Poco nuvoloso"
          note="Base 2000–2300 m, aria più umida."
        />
      </div>
    </div>
  );
}