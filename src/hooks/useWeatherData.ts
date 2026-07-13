"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { weatherService, MeteoHourly, MeteoDaily } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minuti

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState(DECOLLI[0].id);
  const [hourlyData, setHourlyData] = useState<MeteoHourly[]>([]);
  const [dailyData, setDailyData] = useState<MeteoDaily[]>([]);
  const [allDailyData, setAllDailyData] = useState<Record<string, MeteoDaily[]>>({});
  const [allHourlyData, setAllHourlyData] = useState<Record<string, MeteoHourly[]>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<'meteo' | 'venti' | 'termiche' | 'analisi'>('meteo');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(30);

  const site = DECOLLI.find(d => d.id === selectedId)!;

  // Carica dati per TUTTI i decolli in parallelo
  const loadAllWeather = useCallback(async () => {
    setLoading(true);
    setUpdating(true);
    setError(null);
    
    try {
      const promises = DECOLLI.map(async (decollo) => {
        try {
          const data = await weatherService.fetchWithFallback(decollo.lat, decollo.lon);
          return { id: decollo.id, ...data };
        } catch {
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      
      const dailyMap: Record<string, MeteoDaily[]> = {};
      const hourlyMap: Record<string, MeteoHourly[]> = {};
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { id, daily, hourly } = result.value;
          dailyMap[id] = daily;
          hourlyMap[id] = hourly;
        }
      }

      setAllDailyData(dailyMap);
      setAllHourlyData(hourlyMap);

      // Aggiorna dati per il selezionato
      if (dailyMap[selectedId]) setDailyData(dailyMap[selectedId]);
      if (hourlyMap[selectedId]) setHourlyData(hourlyMap[selectedId]);

      // Se non ci sono dati per il selezionato, prova a prendere i primi
      if (!dailyMap[selectedId] && Object.keys(dailyMap).length > 0) {
        const firstId = Object.keys(dailyMap)[0];
        setDailyData(dailyMap[firstId]);
        setHourlyData(hourlyMap[firstId]);
      }

      setLastUpdate(new Date());
      setCountdown(30);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, [selectedId]);

  // Carica inizialmente
  useEffect(() => {
    loadAllWeather();
    setSelectedHour(new Date().getHours());
  }, [loadAllWeather]);

  // Ricarica ogni 30 minuti
  useEffect(() => {
    const interval = setInterval(loadAllWeather, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadAllWeather]);

  // Countdown
  useEffect(() => {
    const minuteInterval = setInterval(() => {
      setCountdown(prev => prev <= 1 ? 30 : prev - 1);
    }, 60 * 1000);
    return () => clearInterval(minuteInterval);
  }, []);

  // Quando cambia il decollo selezionato, usa i dati già caricati
  useEffect(() => {
    if (allDailyData[selectedId]) setDailyData(allDailyData[selectedId]);
    if (allHourlyData[selectedId]) setHourlyData(allHourlyData[selectedId]);
    setSelectedHour(new Date().getHours() % 24);
  }, [selectedId, allDailyData, allHourlyData]);

  // Filtra i dati orari per il giorno selezionato
  const dayData = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];

    // I dati da Open-Meteo con timezone=Europe/Rome hanno già l'ora locale
    // Confronto usando la data locale (ignoro fuso)
    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);

    return hourlyData.filter(h => {
      const t = h.time;
      return t.getFullYear() === targetDate.getFullYear() &&
             t.getMonth() === targetDate.getMonth() &&
             t.getDate() === targetDate.getDate();
    }).sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [hourlyData, selectedDay]);

  // Dati correnti — ora più vicina a selectedHour
  const currentData = useMemo(() => {
    if (!dayData.length) return null;
    return dayData.reduce((best, curr) => {
      const diffBest = Math.abs(best.time.getHours() - selectedHour);
      const diffCurr = Math.abs(curr.time.getHours() - selectedHour);
      return diffCurr < diffBest ? curr : best;
    }, dayData[0]);
  }, [dayData, selectedHour]);

  // Delta termico
  const thermalDelta = useMemo(() => {
    if (!dayData.length) return 0;
    const temps = dayData.map(h => h.temperature).filter(t => t != null);
    if (temps.length === 0) return 0;
    return Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10;
  }, [dayData]);

  // Dati giornalieri arricchiti
  const enrichedDaily = useMemo(() => {
    if (!dailyData.length) return [];
    
    return dailyData.map(day => {
      const d = day.date;
      
      const hours = hourlyData.filter(h => {
        return h.time.getFullYear() === d.getFullYear() &&
               h.time.getMonth() === d.getMonth() &&
               h.time.getDate() === d.getDate();
      });

      const temps = hours.map(h => h.temperature).filter(t => t != null);
      const delta = temps.length > 0 
        ? Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10 
        : 0;
      
      const avgWind = hours.length > 0
        ? Math.round(hours.reduce((s, h) => s + (h.windSpeed || 0), 0) / hours.length * 10) / 10
        : 0;
      
      const maxWind = hours.length > 0
        ? Math.max(...hours.map(h => h.windSpeed || 0))
        : 0;
      
      const avgCloud = hours.length > 0
        ? Math.round(hours.reduce((s, h) => s + (h.cloudCover || 0), 0) / hours.length)
        : 0;

      return { 
        ...day, 
        date: d,
        thermalDelta: delta, 
        avgWind, 
        maxWind, 
        avgCloud 
      };
    });
  }, [dailyData, hourlyData]);

  // Etichette date
  const dateLabels = enrichedDaily.map((d: any) => {
    if (!d?.date) return "Giorno";
    const date = new Date(d.date);
    const oggi = new Date();
    const domani = new Date(oggi);
    domani.setDate(oggi.getDate() + 1);
    const dopodomani = new Date(oggi);
    dopodomani.setDate(oggi.getDate() + 2);

    if (date.toDateString() === oggi.toDateString()) return "Oggi";
    if (date.toDateString() === domani.toDateString()) return "Domani";
    if (date.toDateString() === dopodomani.toDateString()) return "Dopodomani";
    
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  });

  return {
    selectedId, setSelectedId,
    loading, updating, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather: loadAllWeather,
    hourlyData,
    dailyData,
  };
}