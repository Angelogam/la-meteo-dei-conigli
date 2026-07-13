"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { weatherService } from "@/services/weatherService";
import { getWeatherAlert, getWindProfile, getThermalStrength, getStabilityIndex } from "@/utils/weatherHelpers";
import { DECOLLI } from "@/data/decolli";

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
    if (!meteoData) return [];
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + selectedDay);

    return (meteoData.hourly || []).filter((h: any) => {
      const d = new Date(h.time);
      return d.getFullYear() === targetDate.getFullYear() &&
             d.getMonth() === targetDate.getMonth() &&
             d.getDate() === targetDate.getDate();
    });
  }, [meteoData, selectedDay]);

  const currentData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    let closest = dayData[0];
    let minDiff = Math.abs(closest.time.getHours() - selectedHour);
    for (const h of dayData) {
      const diff = Math.abs(h.time.getHours() - selectedHour);
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

  const enrichedDaily = useMemo(() => {
    if (!meteoData || !meteoData.daily) return [];
    return meteoData.daily.map((day: any) => {
      const d = new Date(day.date);
      const hours = meteoData.hourly.filter((h: any) =>
        h.time.getDate() === d.getDate() && h.time.getMonth() === d.getMonth() && h.time.getFullYear() === d.getFullYear()
      );
      const temps = hours.map((h: any) => h.temperature).filter((t: any) => t != null);
      const delta = temps.length > 0 ? Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10 : 0;
      const avgWind = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: any) => s + (h.windSpeed || 0), 0) / hours.length * 10) / 10
        : 0;
      const maxWind = hours.length > 0
        ? Math.max(...hours.map((h: any) => h.windSpeed || 0))
        : 0;
      const avgCloud = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: any) => s + (h.cloudCover || 0), 0) / hours.length)
        : 0;
      return { ...day, thermalDelta: delta, avgWind, maxWind, avgCloud };
    });
  }, [meteoData]);

  const dateLabels = enrichedDaily.map((d: any) =>
    d.date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  );

  // WindProfile reale dai dati di vento in quota
  const windProfile = useMemo(() => {
    if (!currentData) return [];
    if (!currentData.windProfile) return getWindProfile(currentData.windSpeed || 0, currentData.windDir || 0);
    
    return currentData.windProfile.map((level: any) => ({
      alt: level.height,
      speed: level.speed != null ? Math.round(level.speed * 10) / 10 : 0,
      dir: level.dir != null ? Math.round(level.dir) : 0,
      dirName: getWindDirName(level.dir != null ? Math.round(level.dir) : 0),
    }));
  }, [currentData]);

  const weatherAlert = useMemo(() => 
    currentData ? getWeatherAlert(currentData, thermalDelta) : { level: 'info' as const, message: 'Caricamento...', icon: 'ℹ️' }, 
  [currentData, thermalDelta]);
  
  const stabilityIndex = useMemo(() => 
    currentData ? getStabilityIndex(currentData.temperature, currentData.humidity, currentData.cloudCover) : { label: '--', color: '#888' }, 
  [currentData]);
  
  const thermalStrength = useMemo(() => 
    currentData ? getThermalStrength(currentData.temperature, currentData.cloudCover, currentData.humidity, thermalDelta) : { label: '--', color: '#888' }, 
  [currentData, thermalDelta]);

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
    windProfile,
    weatherAlert,
    stabilityIndex,
    thermalStrength,
    loadWeather,
  };
}

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}