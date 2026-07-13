"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { weatherService } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";
import { getWeatherAlert, getStabilityIndex, getThermalStrength, getWindProfile } from "@/utils/weatherHelpers";

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<'meteo' | 'venti' | 'termiche' | 'analisi'>('meteo');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const site = DECOLLI.find(d => d.id === selectedId)!;

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await weatherService.fetchWithFallback(site.lat, site.lon);
      setMeteoData(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [site.lat, site.lon]);

  useEffect(() => {
    loadWeather();
    setSelectedHour(new Date().getHours());
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeather]);

  // Filtra i dati orari per il giorno selezionato
  const dayData = useMemo(() => {
    if (!meteoData?.hourly) return [];
    
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + selectedDay);

    return (meteoData.hourly || []).filter((h: any) => {
      if (!h?.time) return false;
      const d = new Date(h.time);
      return d.getFullYear() === targetDate.getFullYear() &&
             d.getMonth() === targetDate.getMonth() &&
             d.getDate() === targetDate.getDate();
    }).sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [meteoData, selectedDay]);

  const currentData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    
    let closest = dayData[0];
    let minDiff = Math.abs(new Date(closest.time).getHours() - selectedHour);
    
    for (const h of dayData) {
      const diff = Math.abs(new Date(h.time).getHours() - selectedHour);
      if (diff < minDiff) {
        minDiff = diff;
        closest = h;
      }
    }
    return closest;
  }, [dayData, selectedHour]);

  const thermalDelta = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    const temps = dayData.map((h: any) => h.temperature).filter((t: any) => t != null);
    if (temps.length === 0) return 0;
    return Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10;
  }, [dayData]);

  // Stabilità atmosferica
  const stabilityIndex = useMemo(() => {
    if (!currentData) return { label: "N/D", color: "#64748b" };
    return getStabilityIndex(currentData.temperature || 20, currentData.humidity || 50, currentData.cloudCover || 30);
  }, [currentData]);

  // Forza termiche
  const thermalStrength = useMemo(() => {
    if (!currentData) return { label: "N/D", color: "#64748b" };
    return getThermalStrength(currentData.temperature || 20, currentData.cloudCover || 30, currentData.humidity || 50, thermalDelta);
  }, [currentData, thermalDelta]);

  // Allerta meteo
  const weatherAlert = useMemo(() => {
    if (!currentData) return { level: 'info' as const, message: 'Caricamento...', icon: 'ℹ️' };
    return getWeatherAlert(currentData, thermalDelta);
  }, [currentData, thermalDelta]);

  // Profilo vento
  const windProfile = useMemo(() => {
    if (!currentData) return [];
    return getWindProfile(currentData.windSpeed || 0, currentData.windDir || 0, currentData.windProfile);
  }, [currentData]);

  const enrichedDaily = useMemo(() => {
    if (!meteoData?.daily) return [];
    
    return meteoData.daily.map((day: any) => {
      const d = new Date(day.date);
      const hours = (meteoData.hourly || []).filter((h: any) => {
        if (!h?.time) return false;
        const t = new Date(h.time);
        return t.getFullYear() === d.getFullYear() &&
               t.getMonth() === d.getMonth() &&
               t.getDate() === d.getDate();
      });

      const temps = hours.map((h: any) => h.temperature).filter((t: any) => t != null);
      const delta = temps.length > 0 
        ? Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10 
        : 0;
      
      const avgWind = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: any) => s + (h.windSpeed || 0), 0) / hours.length * 10) / 10
        : 0;
      
      const maxWind = hours.length > 0
        ? Math.max(...hours.map((h: any) => h.windSpeed || 0))
        : 0;
      
      const avgCloud = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: any) => s + (h.cloudCover || 0), 0) / hours.length)
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
  }, [meteoData]);

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
    meteoData, loading, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    stabilityIndex,
    thermalStrength,
    weatherAlert,
    windProfile,
  };
}