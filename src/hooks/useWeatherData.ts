"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { weatherService, MeteoHourly, MeteoDaily } from "@/services/weatherService";
import type { HourData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";

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
    pressure: 1013,
    surfacePressure: 1013,
    cloudCover: mh.cloudCover,
    cloudCoverLow: 0,
    cloudCoverMid: 0,
    cloudCoverHigh: 0,
    evapotranspiration: mh.shortwaveRadiation * 0.02,
    et0: 0,
    vapourPressureDeficit: mh.dewPoint > 0 ? mh.temperature - mh.dewPoint : 0,
    windSpeed: mh.windSpeed,
    windDir: mh.windDir,
    windGusts: mh.windGusts,
    soilTemp: mh.temperature - 3,
    soilMoisture: mh.humidity > 70 ? 0.5 : 0.3,
    uvIndex: mh.uvIndex,
    temp80m: null,
    temp120m: null,
    shortwaveRadiation: mh.shortwaveRadiation,
    directRadiation: 0,
    diffuseRadiation: 0,
    directNormalIrradiance: 0,
    terrestrialRadiation: 0,
    sunshineDuration: 0,
    windProfile: mh.windProfile,
  };
}

async function loadSingleSite(id: string, lat: number, lon: number, retries = 2): Promise<{
  id: string;
  daily: MeteoDaily[];
  hourly: MeteoHourly[];
  model: string;
} | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, attempt * 3000));
      const { data } = await weatherService.fetchWithFallback(lat, lon);
      if (data) return { id, daily: data.daily || [], hourly: data.hourly || [], model: data.model };
    } catch (err) {
      if (attempt === retries) return null;
    }
  }
  return null;
}

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState(DECOLLI[0]?.id || "malanotte");
  const [hourlyData, setHourlyData] = useState<MeteoHourly[]>([]);
  const [dailyData, setDailyData] = useState<MeteoDaily[]>([]);
  const [allDailyData, setAllDailyData] = useState<Record<string, MeteoDaily[]>>({});
  const [allHourlyData, setAllHourlyData] = useState<Record<string, MeteoHourly[]>>({});
  const [activeModel, setActiveModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<'meteo' | 'venti' | 'termiche' | 'analisi'>('meteo');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(30);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const site = DECOLLI.find(d => d.id === selectedId) || DECOLLI[0];

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setUpdating(true);
    setError(null);

    const currentId = selectedIdRef.current;
    const currentSite = DECOLLI.find(d => d.id === currentId) || DECOLLI[0];

    try {
      // Carica SOLO il sito selezionato
      const primaryResult = await loadSingleSite(currentSite.id, currentSite.lat, currentSite.lon);

      const dailyMap: Record<string, MeteoDaily[]> = { ...allDailyData };
      const hourlyMap: Record<string, MeteoHourly[]> = { ...allHourlyData };

      if (primaryResult) {
        dailyMap[currentSite.id] = primaryResult.daily;
        hourlyMap[currentSite.id] = primaryResult.hourly;
        setDailyData(primaryResult.daily);
        setHourlyData(primaryResult.hourly);
        setActiveModel(primaryResult.model);
      }

      setAllDailyData(dailyMap);
      setAllHourlyData(hourlyMap);
      setLoading(false);
      setUpdating(false);
      setLastUpdate(new Date());
      setCountdown(30);

      // Carica altri siti in background UNO ALLA VOLTA con delay di 3s
      const remainingSites = DECOLLI.filter(d => !dailyMap[d.id] || dailyMap[d.id].length === 0);
      for (const decollo of remainingSites) {
        if (decollo.id === currentSite.id) continue;
        const result = await loadSingleSite(decollo.id, decollo.lat, decollo.lon);
        if (result) {
          dailyMap[decollo.id] = result.daily;
          hourlyMap[decollo.id] = result.hourly;
          setAllDailyData({ ...dailyMap });
          setAllHourlyData({ ...hourlyMap });
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setLoading(false);
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
    setSelectedHour(new Date().getHours());
  }, []);

  useEffect(() => {
    const interval = setInterval(loadWeather, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadWeather]);

  useEffect(() => {
    const minuteInterval = setInterval(() => {
      setCountdown(prev => prev <= 1 ? 30 : prev - 1);
    }, 60 * 1000);
    return () => clearInterval(minuteInterval);
  }, []);

  useEffect(() => {
    if (allDailyData[selectedId]) setDailyData(allDailyData[selectedId]);
    if (allHourlyData[selectedId]) setHourlyData(allHourlyData[selectedId]);
    setSelectedHour(Math.min(selectedHour, 23));
  }, [selectedId, allDailyData, allHourlyData]);

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

  const currentData = useMemo((): HourData | null => {
    if (!dayData.length) return null;
    return dayData.reduce((best, curr) => {
      const diffBest = Math.abs(best.time.getHours() - selectedHour);
      const diffCurr = Math.abs(curr.time.getHours() - selectedHour);
      return diffCurr < diffBest ? curr : best;
    }, dayData[0]);
  }, [dayData, selectedHour]);

  /** CAPE attuale dal modello */
  const currentCape = useMemo(() => {
    if (!currentData || !hourlyData.length) return null;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + selectedDay);
    const h = hourlyData.find(h =>
      h.time.getHours() === selectedHour &&
      h.time.getFullYear() === targetDate.getFullYear() &&
      h.time.getMonth() === targetDate.getMonth() &&
      h.time.getDate() === targetDate.getDate()
    );
    return h ? { cape: h.cape, cin: h.cin, liftedIndex: h.liftedIndex } : null;
  }, [currentData, hourlyData, selectedHour, selectedDay]);

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
      return { ...day, date: d, thermalDelta: delta, avgWind, maxWind, avgCloud };
    });
  }, [dailyData, hourlyData]);

  const dateLabels = enrichedDaily.map((d: any) => {
    if (!d?.date) return "Giorno";
    const date = new Date(d.date);
    const oggi = new Date();
    const domani = new Date(oggi); domani.setDate(oggi.getDate() + 1);
    const dopodomani = new Date(oggi); dopodomani.setDate(oggi.getDate() + 2);
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
    site: site!,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    hourlyData,
    dailyData,
    allDailyData,
    allHourlyData,
    activeModel,
    currentCape,
  };
}
