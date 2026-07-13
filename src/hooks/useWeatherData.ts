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
  const [selectedHour, setSelectedHour] = useState(12);
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

  const dayData = useMemo(() => {
    if (!meteoData) return [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + selectedDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return meteoData.hourly.filter((h: any) => h.time >= start && h.time < end);
  }, [meteoData, selectedDay]);

  const currentData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    const idx = Math.min(selectedHour, dayData.length - 1);
    return dayData[idx];
  }, [dayData, selectedHour]);

  const thermalDelta = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    const temps = dayData.map((h: any) => h.temperature).filter((t: any) => t != null);
    if (temps.length === 0) return 0;
    return Math.round(Math.max(...temps) - Math.min(...temps));
  }, [dayData]);

  const enrichedDaily = useMemo(() => {
    if (!meteoData || !meteoData.daily) return [];
    return meteoData.daily.map((day: any) => {
      const d = new Date(day.date);
      const hours = meteoData.hourly.filter((h: any) =>
        h.time.getDate() === d.getDate() && h.time.getMonth() === d.getMonth()
      );
      const temps = hours.map((h: any) => h.temperature).filter((t: any) => t != null);
      const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0;
      return { ...day, thermalDelta: delta };
    });
  }, [meteoData]);

  const dateLabels = enrichedDaily.map((d: any) =>
    d.date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  );

  const windProfile = useMemo(() => {
    if (!currentData) return [];
    return getWindProfile(currentData.windSpeed, currentData.windDir);
  }, [currentData]);

  const weatherAlert = useMemo(() => getWeatherAlert(currentData, thermalDelta), [currentData, thermalDelta]);
  const stabilityIndex = useMemo(() => currentData ? getStabilityIndex(currentData.temperature, currentData.humidity, currentData.cloudCover) : { label: '--', color: '#888' }, [currentData]);
  const thermalStrength = useMemo(() => currentData ? getThermalStrength(currentData.temperature, currentData.cloudCover, currentData.humidity, thermalDelta) : { label: '--', color: '#888' }, [currentData, thermalDelta]);

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