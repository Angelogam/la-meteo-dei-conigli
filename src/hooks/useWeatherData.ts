"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { weatherService } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minuti

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<any>(null);
  const [allWeatherData, setAllWeatherData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<'meteo' | 'venti' | 'termiche' | 'analisi'>('meteo');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(30);
  const [refreshProgress, setRefreshProgress] = useState(0);

  const site = DECOLLI.find(d => d.id === selectedId)!;

  // Carica dati per TUTTI i decolli in parallelo
  const loadAllWeather = useCallback(async () => {
    setLoading(true);
    setUpdating(true);
    setError(null);
    
    try {
      // Carica tutti i decolli in parallelo
      const promises = DECOLLI.map(async (decollo) => {
        try {
          const data = await weatherService.fetchWithFallback(decollo.lat, decollo.lon);
          return { id: decollo.id, data };
        } catch {
          return { id: decollo.id, data: null };
        }
      });

      const results = await Promise.allSettled(promises);
      
      // Costruisce la mappa id -> dati
      const weatherMap: Record<string, any> = {};
      let selectedData: any = null;
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.data) {
          const { id, data } = result.value;
          weatherMap[id] = data;
          
          // Trova il dato orario corrente (ora più vicina)
          if (data.hourly && data.hourly.length > 0) {
            const now = new Date();
            const currentHour = now.getHours();
            
            // Crea un "currentData" sintetico dal dato orario più vicino
            const closestHour = data.hourly.reduce((best: any, h: any) => {
              const hh = h.time.getHours();
              return Math.abs(hh - currentHour) < Math.abs(best.time.getHours() - currentHour) ? h : best;
            }, data.hourly[0]);
            
            weatherMap[id] = {
              ...weatherMap[id],
              currentData: closestHour,
              temperature: closestHour.temperature,
              humidity: closestHour.humidity,
              dewPoint: closestHour.dewPoint,
              windSpeed: closestHour.windSpeed,
              windDir: closestHour.windDir,
              windGusts: closestHour.windGusts,
              cloudCover: closestHour.cloudCover,
              precipitation: closestHour.precipitation,
              weatherCode: closestHour.weatherCode,
              pressure: closestHour.pressure,
              uvIndex: closestHour.uvIndex,
              temp80m: closestHour.temp80m,
              temp120m: closestHour.temp120m,
              isDay: new Date().getHours() >= 6 && new Date().getHours() <= 20 ? 1 : 0,
            };
          }

          // Salva anche i dati completi per il decollo selezionato
          if (id === selectedId) {
            selectedData = data;
          }
        }
      }

      setAllWeatherData(weatherMap);
      
      // Se abbiamo dati per il selezionato, aggiorna meteoData
      if (selectedData) {
        setMeteoData(selectedData);
      } else if (weatherMap[selectedId]) {
        setMeteoData(weatherMap[selectedId]);
      }

      const now = new Date();
      setLastUpdate(now);
      setCountdown(30);
      setRefreshProgress(0);

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

  // Countdown minuto per minuto
  useEffect(() => {
    const minuteInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 30;
        return prev - 1;
      });
      setRefreshProgress(prev => Math.min(100, prev + (100 / 30)));
    }, 60 * 1000);
    return () => clearInterval(minuteInterval);
  }, []);

  // Quando cambia il decollo selezionato, usa i dati già caricati
  useEffect(() => {
    if (allWeatherData[selectedId]) {
      setMeteoData(allWeatherData[selectedId]);
      setSelectedHour(new Date().getHours());
    }
  }, [selectedId, allWeatherData]);

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

  // Dati correnti — usa il decorrente sintetico se disponibile
  const currentData = useMemo(() => {
    // Se abbiamo il currentData sintetico dalla mappa, usalo
    if (allWeatherData[selectedId]?.currentData) {
      return allWeatherData[selectedId].currentData;
    }
    
    // Altrimenti cerca nell'hourly
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
  }, [dayData, selectedHour, allWeatherData, selectedId]);

  // Delta termico
  const thermalDelta = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    const temps = dayData.map((h: any) => h.temperature).filter((t: any) => t != null);
    if (temps.length === 0) return 0;
    return Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10;
  }, [dayData]);

  // Dati giornalieri arricchiti
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
    meteoData, loading, updating, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown, refreshProgress,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather: loadAllWeather,
    allWeatherData,
  };
}