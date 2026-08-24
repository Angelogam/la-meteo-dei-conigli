"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { HourData, DailyData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { fetchPrevisioniGiornaliere, type MeteoCurrent, type MeteoHourly, type MeteoDaily } from "@/services/openMeteoService";
import { calcolaStatoMeteo, calcolaPrecipProssimeOre, type StatoMeteo } from "@/utils/statoMeteo";
import { calcolaIndiceVolabilita, type RisultatoVolabilita } from "@/utils/indiceVolabilita";

const STORAGE_KEY_SITE = "meteo_selected_decollo";
const REFRESH_INTERVAL = 900000; // 15 minuti esatti

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(STORAGE_KEY_SITE) || DECOLLI[0].id;
    return DECOLLI[0].id;
  });

  const site = DECOLLI.find(d => d.id === selectedId) || DECOLLI[0];
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<"meteo" | "venti" | "termiche" | "analisi">("meteo");

  const [hourlyData, setHourlyData] = useState<MeteoHourly[]>([]);
  const [dailyData, setDailyData] = useState<MeteoDaily[]>([]);
  const [currentData, setCurrentData] = useState<MeteoCurrent | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Dati derivati per giorno selezionato
  const dayData = useMemo(() => {
    const oggi = new Date();
    const target = new Date(oggi); target.setDate(oggi.getDate() + selectedDay);
    return hourlyData.filter(h => {
      const d = new Date(h.time);
      return d.getDate() === target.getDate() && d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
    });
  }, [hourlyData, selectedDay]);

  const currentHourData = dayData.find(h => new Date(h.time).getHours() === selectedHour) || dayData[0] || null;

  // Stato meteo rigoroso per decollo selezionato (usa dati correnti)
  const statoMeteo = useMemo((): StatoMeteo => {
    if (!currentData) return "offline";
    const precipNext = calcolaPrecipProssimeOre(hourlyData, 6);
    return calcolaStatoMeteo({
      precipNow: currentData.precipitation,
      precipNextHours: precipNext,
      cloudNow: currentData.cloudCover,
      windSpeed: currentData.windSpeed,
      windDir: currentData.windDir,
      temperature: currentData.temperature,
      cape: currentData.cape,
      weatherCode: currentData.weatherCode,
    }).stato;
  }, [currentData, hourlyData]);

  // Indice volabilità per decollo selezionato
  const volabilita = useMemo((): RisultatoVolabilita | null => {
    if (!currentData || !site) return null;
    return calcolaIndiceVolabilita({
      windSpeed: currentData.windSpeed,
      windGusts: currentData.windGusts,
      windDir: currentData.windDir,
      esposizione: site.esposizione,
      temperature: currentData.temperature,
      dewPoint: currentData.dewPoint,
      cloudCover: currentData.cloudCover,
      precipitation: currentData.precipitation,
      weatherCode: currentData.weatherCode,
      cape: currentData.cape,
      quota: site.quota,
    });
  }, [currentData, site]);

  // Daily arricchite
  const enrichedDaily = useMemo(() => dailyData.map(d => {
    const dayH = hourlyData.filter(h => {
      const hd = new Date(h.time), dd = new Date(d.date);
      return hd.getDate() === dd.getDate() && hd.getMonth() === dd.getMonth();
    });
    const temps = dayH.map(h => h.temperature).filter(t => t != null);
    const winds = dayH.map(h => h.windSpeed).filter(w => w != null);
    const clouds = dayH.map(h => h.cloudCover).filter(c => c != null);
    return {
      ...d,
      tempMax: temps.length ? Math.round(Math.max(...temps)) : d.tempMax,
      tempMin: temps.length ? Math.round(Math.min(...temps)) : d.tempMin,
      windSpeedMax: winds.length ? Math.round(Math.max(...winds)) : d.windSpeedMax,
      windSpeed: winds.length ? Math.round(winds.reduce((a,b)=>a+b,0)/winds.length) : 0,
      cloudCover: clouds.length ? Math.round(clouds.reduce((a,b)=>a+b,0)/clouds.length) : 0,
    };
  }), [dailyData, hourlyData]);

  const dateLabels = useMemo(() => Array.from({length:3}, (_,i)=> {
    const d = new Date(); d.setDate(d.getDate()+i);
    const g = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
    const m = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
    return `${g[d.getDay()]} ${d.getDate()} ${m[d.getMonth()]}`;
  }), []);

  const loadWeather = useCallback(async () => {
    if (!site) return;
    setUpdating(true); setLoading(true);
    try {
      const { hourly, daily, current } = await fetchPrevisioniGiornaliere(site.lat, site.lon, site.quota);
      setHourlyData(hourly);
      setDailyData(daily);
      setCurrentData(current);
      setLastUpdate(new Date());
      setCountdown(REFRESH_INTERVAL);
    } catch (e) { console.error("Open-Meteo error:", e); }
    finally { setLoading(false); setUpdating(false); }
  }, [site]);

  useEffect(() => { loadWeather(); }, [loadWeather]);
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(loadWeather, REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadWeather]);
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => setCountdown(p => Math.max(0, p - 1000)), 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_SITE, selectedId); }, [selectedId]);

  return {
    selectedId, setSelectedId, loading, updating, lastUpdate, countdown,
    selectedDay, setSelectedDay, selectedHour, setSelectedHour,
    activeTab, setActiveTab, site,
    dayData, currentData: currentHourData, statoMeteo, volabilita,
    enrichedDaily, dateLabels, hourlyData, dailyData,
    loadWeather,
  };
}