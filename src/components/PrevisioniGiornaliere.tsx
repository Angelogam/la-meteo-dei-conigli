"use client";

import React, { useMemo } from "react";
import {
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, CloudFog,
  Thermometer, Wind, Droplets, ArrowUp, Gauge, Umbrella,
  Mountain, TrendingUp, CheckCircle, Calendar
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
  if (code == null || (typeof code === "number" && isNaN(code))) {
    return { icon: <Sun className="w-5 h-5 text-amber-300" />, desc: "N/D" };
  }
  if (code === 0 || code === 1) return { icon: <Sun className="w-5 h-5 text-amber-300" />, desc: "Sereno" };
  if (code === 2) return { icon: <CloudSun className="w-5 h-5 text-amber-200" />, desc: "Poco nuvoloso" };
  if (code === 3) return { icon: <Cloud className="w-5 h-5 text-slate-300" />, desc: "Nuvoloso" };
  if (code >= 45 && code <= 48) return { icon: <CloudFog className="w-5 h-5 text-slate-400" />, desc: "Nebbia" };
  if (code >= 51 && code <= 57) return { icon: <CloudRain className="w-5 h-5 text-blue-300" />, desc: "Pioggerella" };
  if (code >= 61 && code <= 67) return { icon: <CloudRain className="w-5 h-5 text-blue-400" />, desc: "Pioggia" };
  if (code >= 80 && code <= 84) return { icon: <CloudRain className="w-5 h-5 text-blue-300" />, desc: "Rovesci" };
  if (code >= 95 && code <= 99) return { icon: <CloudLightning className="w-5 h-5 text-yellow-300" />, desc: "Temporali" };
  return { icon: <Sun className="w-5 h-5 text-amber-300" />, desc: "Sereno" };
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
  dateLabels,
  currentData,
  dayData,
  site,
  selectedDay,
  onSelectDay
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

  const fasce = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];
    for (let i = 0; i < dayData.length; i++) {
      const hh = new Date(dayData[i].time).getHours();
      if (hh >= 6 && hh <= 11) morning.push(dayData[i]);
      else if (hh >= 12 && hh <= 17) afternoon.push(dayData[i]);
      else if (hh >= 18 && hh <= 23) evening.push(dayData[i]);
    }

    const compute = (hours: any[], label: string, borderColor: string) => {
      if (hours.length === 0) return null;

      const filterValid = (arr: (number | null | undefined)[]): number[] => {
        const result: number[] = [];
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] != null) result.push(arr[i] as number);
        }
        return result;
      };

      const mean = (arr: number[]): number => {
        if (arr.length === 0) return 0;
        let sum = 0;
        for (let i = 0; i < arr.length; i++) sum += arr[i];
        return sum / arr.length;
      };

      const maxVal = (arr: number[]): number => {
        if (arr.length === 0) return 0;
        let m = -Infinity;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] > m) m = arr[i];
        }
        return m;
      };

      const temps = filterValid(hours.map((h: any) => h.temperature));
      const winds = filterValid(hours.map((h: any) => h.windSpeed));
      const dirs = filterValid(hours.map((h: any) => h.windDir));
      const clouds = filterValid(hours.map((h: any) => h.cloudCover));
      const hums = filterValid(hours.map((h: any) => h.humidity));
      const pressures = filterValid(hours.map((h: any) => h.pressure || 1013));
      const codes = filterValid(hours.map((h: any) => h.weatherCode));

      const tempMedia = Math.round(mean(temps));
      const tempMax = Math.round(maxVal(temps));
      const windMedia = Math.round(mean(winds));
      const windMax = Math.round(maxVal(winds));
      const windDirMedia = dirs.length > 0 ? Math.round(mean(dirs)) : 0;
      const cloudMedia = Math.round(mean(clouds));
      const humMedia = Math.round(mean(hums));
      const pressMedia = Math.round(mean(pressures));

      let precipTot = 0;
      for (let i = 0; i < hours.length; i++) {
        precipTot += hours[i].precipitation || 0;
      }
      precipTot = Math.round(precipTot * 10) / 10;

      const thermicHours = hours.map((h: any) => calcolaTermiche(h, alt));
      const rates = thermicHours.map((t: any) => t.rateo);
      const salitaMedia = mean(rates);
      const salita = Math.round(salitaMedia * 10) / 10;
      const bases = thermicHours.map((t: any) => t.base);
      const tops = thermicHours.map((t: any) => t.top);
      const baseMedia = Math.round(mean(bases));
      const topMedia = Math.round(mean(tops));

      let termicheLabel = "Assenti ❌";
      let termicheColore = "text-slate-400";
      if (salita >= 4) { termicheLabel = "Forti 🔥"; termicheColore = "text-red-400"; }
      else if (salita >= 3) { termicheLabel = "Buone 🪂"; termicheColore = "text-orange-400"; }
      else if (salita >= 2) { termicheLabel = "Moderate 👍"; termicheColore = "text-amber-400"; }
      else if (salita >= 1) { termicheLabel = "Deboli 👎"; termicheColore = "text-amber-300"; }
      else if (salita >= 0.3) { termicheLabel = "M. deboli ☁️"; termicheColore = "text-yellow-300"; }

      const weatherCode = codes.length > 0 ? getDominantWeatherCode(codes) : 0;
      const weatherInfo = getWeatherInfo(weatherCode);

      let score = 5;
      if (windMedia >= 5 && windMedia <= 18) score += 2;
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
        label, borderColor, weatherDesc: weatherInfo.desc,
        tempMedia, tempMax, windMedia, windMax, windDirMedia,
        cloudMedia, precipTot, humMedia, pressMedia,
        base: baseMedia, top: topMedia, salita, termicheLabel, termicheColore, score, nOre: hours.length,
      };
    };

    const results: any[] = [];
    const m = compute(morning, "Mattina", "border-amber-500/40");
    if (m) results.push(m);
    const a = compute(afternoon, "Pomeriggio", "border-sky-500/40");
    if (a) results.push(a);
    const e = compute(evening, "Sera", "border-indigo-500/40");
    if (e) results.push(e);
    return results.length > 0 ? results : null;
  }, [dayData, alt]);

  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-base">Caricamento previsioni...</div>;
  }

  const selectedDayData = enrichedDaily[selectedDay];
  const dayDateShort = selectedDayData?.date ? formatDateShort(selectedDayData.date) : "";

  const days = enrichedDaily.slice(0, 3);
  const dayButtons: React.ReactNode[] = [];
  for (let idx = 0; idx < days.length; idx++) {
    const day = days[idx];
    const isActive = idx === selectedDay;
    const weatherCode = dailyWeatherCodes[idx] ?? 0;
    const weatherInfo = getWeatherInfo(weatherCode);
    const precipGiorno = dailyPrecipTotals[idx] ?? day.precipSum ?? 0;
    dayButtons.push(
      <button
        key={idx}
        onClick={() => onSelectDay(idx)}
        className={"text-center transition-all border-2 cursor-pointer p-3 rounded-xl " + (
          isActive
            ? "border-emerald-400 bg-emerald-900/40 shadow-lg"
            : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
        ) + " " + (idx === 0 ? "w-28" : "w-36")}
      >
        <div className="text-sm font-bold text-white">
          {idx === 0 ? "Oggi" : idx === 1 ? "Domani" : "Dopodomani"}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          <Calendar className="w-3 h-3 inline mr-1" />
          {day.date ? formatDateShort(day.date) : ""}
        </div>
        <div className="flex justify-center my-1">{weatherInfo.icon}</div>
        <div className="text-xs text-slate-300 font-bold">{weatherInfo.desc}</div>
        <div className="text-lg font-bold text-white my-0.5">{Math.round(day.tempMax)}°</div>
        <div className="text-[11px] text-slate-400">min {Math.round(day.tempMin)}°</div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {precipGiorno > 0 ? String(precipGiorno.toFixed(1)) + " mm" : "0 mm"}
        </div>
      </button>
    );
  }

  const fasciaCards: React.ReactNode[] = [];
  if (fasce) {
    for (let fi = 0; fi < fasce.length; fi++) {
      const fascia = fasce[fi];
      if (!fascia) continue;
      const scoreColor = fascia.score >= 7
        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
        : fascia.score >= 4
          ? "bg-amber-500/20 border-amber-400/30 text-amber-300"
          : "bg-red-500/20 border-red-400/30 text-red-300";
      const dirCardinal = degreesToCardinal(fascia.windDirMedia);
      const dirArr = windArrow(fascia.windDirMedia);
      fasciaCards.push(
        <div key={fi} className={"card p-4 border-2 " + fascia.borderColor + " bg-slate-800/40"}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-bold text-white">{fascia.label}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />{dayDateShort}
            </span>
            <span className={"text-sm font-bold px-2 py-0.5 rounded-full border " + scoreColor}>
              {fascia.score}/10
            </span>
          </div>
          <div className="text-center text-xl font-bold text-amber-300 mb-3">
            {fascia.tempMedia}°C <span className="text-sm text-slate-400 font-normal">max {fascia.tempMax}°</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3 mb-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm mb-1">
              <Wind className="w-5 h-5 text-sky-400" />
              <span className="font-bold text-sky-300">{fascia.windMedia} km/h</span>
              <span className="text-slate-400">raffiche {fascia.windMax}</span>
            </div>
            <div className="text-sm text-slate-400">{dirArr} {dirCardinal} ({fascia.windDirMedia}°)</div>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3 mb-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm mb-2">
              <ArrowUp className="w-5 h-5 text-orange-400" />
              <span className={fascia.termicheColore + " font-bold"}>{fascia.termicheLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm max-w-xs mx-auto">
              <span className="text-right">Salita: <span className="text-emerald-300 font-bold">{fascia.salita.toFixed(1)} m/s</span></span>
              <span className="text-left">Base: <Mountain className="w-4 h-4 text-green-400 inline" /> <span className="text-green-300 font-bold">{fascia.base} m</span></span>
              <span className="text-right">Top: <TrendingUp className="w-4 h-4 text-red-400 inline" /> <span className="text-red-300 font-bold">{fascia.top} m</span></span>
              <span className="text-left">Spessore: <span className="text-amber-300 font-bold">{fascia.top - fascia.base} m</span></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm max-w-xs mx-auto">
            <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-center gap-1">
              <Cloud className="w-4 h-4 text-slate-400" /> <span className="font-bold text-slate-200">{fascia.cloudMedia}%</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-center gap-1">
              <Droplets className="w-4 h-4 text-blue-400" /> <span className="font-bold text-blue-200">{fascia.humMedia}%</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-center gap-1">
              <Gauge className="w-4 h-4 text-purple-400" /> <span className="font-bold text-purple-200">{fascia.pressMedia} hPa</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-center gap-1">
              {fascia.precipTot === 0
                ? <CheckCircle className="w-4 h-4 text-green-400" />
                : <Umbrella className="w-4 h-4 text-blue-400" />
              }
              <span className="font-bold">{fascia.precipTot === 0 ? "Secco" : fascia.precipTot + "mm"}</span>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">
        {dayButtons}
      </div>
      {fasce && fasciaCards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white px-1">Andamento orario</h3>
          {fasciaCards}
        </div>
      )}
    </div>
  );
}