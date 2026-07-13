"use client";

import React, { useState, useMemo } from "react";
import { useMeteoStore } from "@/store/meteoStore";
import MeteoTab from "./MeteoTab";
import AnalisiTab from "./AnalisiTab";
import VentiTab from "./VentiTab";

interface SezioneMeteoProps {
  siteId: string;
  siteName: string;
  siteAltitude: number;
  lat: number;
  lon: number;
}

export function useCurrentData(hourlyData?: any[]) {
  return useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return null;
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Cerca l'ora più vicina all'ora corrente di oggi
    const today = hourlyData.filter(
      (h) =>
        h.time.getDate() === currentDay &&
        h.time.getMonth() === currentMonth &&
        h.time.getFullYear() === currentYear
    );

    // Se oggi non ha dati, usa il primo giorno disponibile
    const targetData = today.length > 0 ? today : hourlyData;

    const closest = targetData.reduce((prev, curr) => {
      const diffPrev = Math.abs(prev.time.getHours() - currentHour);
      const diffCurr = Math.abs(curr.time.getHours() - currentHour);
      return diffCurr < diffPrev ? curr : prev;
    });

    return closest;
  }, [hourlyData]);
}

/** Restituisce i dati orari per un giorno specifico */
function useDayData(hourlyData?: any[], dayIndex: number = 0) {
  return useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];

    const today = new Date();
    today.setDate(today.getDate() + dayIndex);
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();

    return hourlyData.filter(
      (h) =>
        h.time.getDate() === day &&
        h.time.getMonth() === month &&
        h.time.getFullYear() === year
    );
  }, [hourlyData, dayIndex]);
}

/** Trova il primo dato non-nullo per ogni campo (per riassunto giornaliero) */
function aggregateDayData(dayHours: any[]): any {
  if (dayHours.length === 0) return {};

  const noon = dayHours.find(h => h.time.getHours() === 12) || dayHours[0];
  
  // Media per campi principali
  const avg = (field: string) => {
    const vals = dayHours.map(h => h[field]).filter((v: any) => v != null);
    if (vals.length === 0) return 0;
    return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
  };

  // Max
  const max = (field: string) => {
    const vals = dayHours.map(h => h[field]).filter((v: any) => v != null);
    if (vals.length === 0) return 0;
    return Math.max(...vals);
  };

  // Min
  const min = (field: string) => {
    const vals = dayHours.map(h => h[field]).filter((v: any) => v != null);
    if (vals.length === 0) return 0;
    return Math.min(...vals);
  };

  return {
    temperature: avg("temperature"),
    tempMax: max("temperature"),
    tempMin: min("temperature"),
    windSpeed: avg("windSpeed"),
    windDir: noon.windDir ?? 0,
    windGust: max("windGusts"),
    precipitation: avg("precipitation"),
    humidity: avg("humidity"),
    cloudCover: avg("cloudCover"),
    pressure: avg("pressure"),
    uvIndex: max("uvIndex"),
    weatherCode: noon.weatherCode ?? 0,
    windProfile: [],
  };
}

export default function SezioneMeteo({ siteId, siteName, siteAltitude, lat, lon }: SezioneMeteoProps) {
  const { meteoData } = useMeteoStore();
  const [activeTab, setActiveTab] = useState<"oggi" | "domani">("oggi");
  const [subTab, setSubTab] = useState<"meteo" | "analisi" | "venti">("meteo");

  const hourlyData = meteoData?.hourly;
  const dailyData = meteoData?.daily?.slice(0, 3) ?? [];

  // Dati per "oggi" (dayIndex=0) e "domani" (dayIndex=1)
  const todayHours = useDayData(hourlyData, 0);
  const tomorrowHours = useDayData(hourlyData, 1);

  const currentData = activeTab === "oggi" ? useCurrentData(todayHours) : useCurrentData(tomorrowHours);
  const dayHours = activeTab === "oggi" ? todayHours : tomorrowHours;
  const dayDataForAgg = aggregateDayData(dayHours);

  if (!meteoData) return null;

  const tabs = [
    { id: "meteo" as const, label: "Meteo" },
    { id: "analisi" as const, label: "Analisi" },
    { id: "venti" as const, label: "Venti" },
  ];

  return (
    <div className="space-y-3">
      {/* Tabs giorno */}
      <div className="flex items-center gap-2 bg-slate-800/40 rounded-2xl p-1 border border-slate-700/30">
        <button
          onClick={() => setActiveTab("oggi")}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "oggi"
              ? "bg-gradient-to-r from-emerald-600/60 to-emerald-500/40 text-white shadow-sm border border-emerald-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Oggi
        </button>
        <button
          onClick={() => setActiveTab("domani")}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "domani"
              ? "bg-gradient-to-r from-emerald-600/60 to-emerald-500/40 text-white shadow-sm border border-emerald-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Domani
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              subTab === tab.id
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenuto */}
      {subTab === "meteo" && (
        <MeteoTab 
          currentData={currentData} 
          dayData={dayHours} 
          dailyData={dailyData}
          siteName={siteName}
          hourlyData={hourlyData}
        />
      )}
      {subTab === "analisi" && (
        <AnalisiTab 
          currentData={currentData || dayDataForAgg} 
          dayData={dayHours}
          windProfile={currentData?.windProfile || []}
          hourlyData={hourlyData}
          targetHour={12}
        />
      )}
      {subTab === "venti" && (
        <VentiTab 
          currentData={currentData || dayDataForAgg} 
          dayData={dayHours}
          windProfile={currentData?.windProfile || []}
          hourlyData={hourlyData}
          targetHour={12}
        />
      )}
    </div>
  );
}