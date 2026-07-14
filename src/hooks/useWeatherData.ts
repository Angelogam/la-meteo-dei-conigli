"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { weatherService, MeteoHourly, MeteoDaily } from "@/services/weatherService";
import type { HourData } from "@/types/meteo";
import { decolli } from "@/data/decolli";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

function toHourData(mh: MeteoHourly): HourData {
  return {
    time: mh.time,
    temperature: mh.temperature,
    humidity: mh.humidity,
    dewPoint: mh.dewPoint,
    apparentTemp: mh.apparentTemp,
    precipitationProba: mh.precipitationProbability,
    precipitation: mh.precipitation,
    rain: mh.precipitation > 0 && mh.weatherCode >= 61 && mh.weatherCode <= 67 ? mh.precipitation : 0,
    showers: mh.precipitation > 0 && mh.weatherCode >= 80 && mh.weatherCode <= 82 ? mh.precipitation : 0,
    snowfall: mh.precipitation > 0 && mh.weatherCode >= 71 && mh.weatherCode <= 77 ? mh.precipitation : 0,
    weatherCode: mh.weatherCode,
    pressure: mh.pressure,
    surfacePressure: mh.surfacePressure,
    cloudCover: mh.cloudCover,
    cloudCoverLow: 0,
    cloudCoverMid: 0,
    cloudCoverHigh: 0,
    evapotranspiration: mh.shortwaveRadiation * 0.02,
    et0: mh.sunshineDuration * 0.01,
    vapourPressureDeficit: mh.dewPoint > 0 ? mh.temperature - mh.dewPoint : 0,
    windSpeed: mh.windSpeed,
    windDir: mh.windDir,
    windGusts: mh.windGusts,
    soilTemp: mh.temperature - 3,
    soilMoisture: mh.humidity > 70 ? 0.5 : 0.3,
    uvIndex: mh.uvIndex,
    temp80m: mh.temp80m,
    temp120m: mh.temp120m,
    shortwaveRadiation: mh.shortwaveRadiation,
    directRadiation: mh.directRadiation,
    diffuseRadiation: 0,
    directNormalIrradiance: 0,
    terrestrialRadiation: 0,
    sunshineDuration: mh.sunshineDuration,
  };
}

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState(decolli[0]?.id || "malanotte");
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

  // Restituisce sempre un sito valido (primo decollo come fallback)
  const site = decolli.find(d => d.id === selectedId) || decolli[0];

  const loadAllWeather = useCallback(async () => {
    setLoading(true);
    setUpdating(true);
    setError(null);
    
    try {
      const promises = decolli.map(async (decollo) => {
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
          dailyMap[id] = daily || [];
          hourlyMap[id] = hourly || [];
        }
      }

      setAllDailyData(dailyMap);
      setAllHourlyData(hourlyMap);

      if (dailyMap[selectedId]) setDailyData(dailyMap[selectedId]);
      else if (Object.keys(dailyMap).length > 0) {
        const firstId = Object.keys(dailyMap)[0];
        setDailyData(dailyMap[firstId]);
        setHourlyData(hourlyMap[firstId] || []);
      }

      if (hourlyMap[selectedId]) setHourlyData(hourlyMap[selectedId]);
      else if (Object.keys(hourlyMap).length > 0) {
        const firstId = Object.keys(hourlyMap)[0];
        setHourlyData(hourlyMap[firstId] || []);
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

  useEffect(() => {
    loadAllWeather();
    setSelectedHour(new Date().getHours());
  }, [loadAllWeather]);

  useEffect(() => {
    const interval = setInterval(loadAllWeather, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadAllWeather]);

  useEffect(() => {
    const minuteInterval = setInterval(() => {
      setCountdown(prev => prev <= 1 ? 30 : prev - 1);
    }, 60 * 1000);
    return () => clearInterval(minuteInterval);
  }, []);

  useEffect(() => {
    if (allDailyData[selectedId]) setDailyData(allDailyData[selectedId]);
    if (allHourlyData[selectedId]) setHourlyData(allHourlyData[selectedId]);
    setSelectedHour(Math.min(selectedHour, new Date().getHours() <= 23 ? new Date().getHours() : 12));
  }, [selectedId, allDailyData, allHourlyData]);

  // dayData CONVERTITO in HourData[]
  const dayData: HourData[] = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];
    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    return hourlyData
      .filter(h => {
        const t = h.time;
        return t.getFullYear() === targetDate.getFullYear() &&
               t.getMonth() === targetDate.getMonth() &&
               t.getDate() === targetDate.getDate();
      })
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .map(toHourData);
  }, [hourlyData, selectedDay]);

  // currentData convertito
  const currentData = useMemo((): HourData | null => {
    if (!dayData.length) return null;
    return dayData.reduce((best, curr) => {
      const diffBest = Math.abs(best.time.getHours() - selectedHour);
      const diffCurr = Math.abs(curr.time.getHours() - selectedHour);
      return diffCurr < diffBest ? curr : best;
    }, dayData[0]);
  }, [dayData, selectedHour]);

  const thermalDelta = useMemo(() => {
    if (!dayData.length) return 0;
    const temps = dayData.map(h => h.temperature).filter(t => t != null);
    if (temps.length === 0) return 0;
    return Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10;
  }, [dayData]);

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
        avgCloud,
      };
    });
  }, [dailyData, hourlyData]);

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
    site: site!,  // Sempre definito
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather: loadAllWeather,
    hourlyData,
    dailyData,
    allDailyData,
    allHourlyData,
  };
}