"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { HourData, DailyData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";

const STORAGE_KEY_SITE = "meteo_selected_decollo";
const REFRESH_INTERVAL = 600000; // 10 minuti

function getWeatherDescription(code: number): string {
  if (code === 0) return "Sereno";
  if (code <= 2) return "Poco nuvoloso";
  if (code <= 3) return "Nuvoloso";
  if (code <= 48) return "Nebbia";
  if (code <= 57) return "Pioggerella";
  if (code <= 67) return "Pioggia";
  if (code <= 77) return "Neve";
  if (code <= 82) return "Rovesci";
  if (code >= 95) return "Temporali";
  return "N/D";
}

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_SITE) || DECOLLI[0].id;
    }
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
  const [activeModel, setActiveModel] = useState("gfs");

  // Dati grezzi da Open-Meteo
  const [hourlyData, setHourlyData] = useState<HourData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [allHourlyData, setAllHourlyData] = useState<Record<string, HourData[]>>({});

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Dati derivati - CORRETTO: usa la data locale per filtrare
  const dayData = useMemo(() => {
    if (!hourlyData.length) return [];
    
    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    
    // Normalizza a mezzanotte per confronto corretto
    const targetDay = targetDate.getDate();
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    return hourlyData.filter(h => {
      const hDate = new Date(h.time);
      return (
        hDate.getDate() === targetDay &&
        hDate.getMonth() === targetMonth &&
        hDate.getFullYear() === targetYear
      );
    });
  }, [hourlyData, selectedDay]);

  const currentData = useMemo(() => {
    if (!dayData.length) return hourlyData[0] || null;
    return dayData.find(h => new Date(h.time).getHours() === selectedHour) || dayData[0] || null;
  }, [dayData, selectedHour, hourlyData]);

  // Dati arrotondati per visualizzazione
  const currentDataRounded = useMemo(() => {
    if (!currentData) return null;
    return {
      ...currentData,
      temperature: Math.round(currentData.temperature),
      windSpeed: Math.round(currentData.windSpeed),
      windGusts: currentData.windGusts ? Math.round(currentData.windGusts) : 0,
      humidity: Math.round(currentData.humidity),
      pressure: Math.round(currentData.pressure),
      precipitation: Math.round(currentData.precipitation * 10) / 10,
      cloudCover: Math.round(currentData.cloudCover),
      uvIndex: Math.round(currentData.uvIndex),
      visibility: currentData.visibility ? Math.round(currentData.visibility / 100) * 100 : 10000,
    };
  }, [currentData]);

  const enrichedDaily = useMemo(() => {
    if (!dailyData.length) return [];
    return dailyData.map((d, i) => {
      // Filtra ore per questo giorno specifico
      const dayHours = hourlyData.filter(h => {
        const hDate = new Date(h.time);
        const dDate = new Date(d.date);
        return (
          hDate.getDate() === dDate.getDate() &&
          hDate.getMonth() === dDate.getMonth() &&
          hDate.getFullYear() === dDate.getFullYear()
        );
      });

      const temps = dayHours.map(h => h.temperature).filter(t => t != null);
      const winds = dayHours.map(h => h.windSpeed).filter(w => w != null);
      const clouds = dayHours.map(h => h.cloudCover).filter(c => c != null);

      return {
        ...d,
        temperatureMax: temps.length ? Math.round(Math.max(...temps)) : Math.round(d.tempMax),
        temperatureMin: temps.length ? Math.round(Math.min(...temps)) : Math.round(d.tempMin),
        windSpeedMax: winds.length ? Math.round(Math.max(...winds)) : Math.round(d.windSpeedMax),
        windSpeed: winds.length ? Math.round(winds.reduce((s, w) => s + w, 0) / winds.length) : 0,
        cloudCover: clouds.length ? Math.round(clouds.reduce((s, c) => s + c, 0) / clouds.length) : 0,
        weatherDescription: getWeatherDescription(d.weatherCode),
      };
    });
  }, [dailyData, hourlyData]);

  const thermalDelta = useMemo(() => {
    if (!currentData) return 0;
    return Math.round((currentData.temperature - (currentData.dewPoint || 0)) * 10) / 10;
  }, [currentData]);

  const currentCape = useMemo(() => {
    if (!currentData) return null;
    return {
      cape: Math.round(currentData.cape || 0),
      cin: Math.round(currentData.cin || 0),
      liftedIndex: currentData.liftedIndex !== undefined ? Math.round(currentData.liftedIndex * 10) / 10 : 0,
    };
  }, [currentData]);

  const dateLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
      const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
      labels.push(`${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`);
    }
    return labels;
  }, []);

  const loadWeather = useCallback(async () => {
    if (!site) return;

    try {
      setUpdating(true);
      setLoading(true);

      const result = await weatherService.fetchWeather(site.lat, site.lon);
      
      setHourlyData(result.hourly);
      setDailyData(result.daily);

      setAllHourlyData(prev => ({
        ...prev,
        [site.id]: result.hourly,
      }));

      setLastUpdate(new Date());
      setCountdown(REFRESH_INTERVAL);
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, [site]);

  // Carica appena il sito cambia
  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      loadWeather();
    }, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadWeather]);

  // Countdown
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Salva selezione
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SITE, selectedId);
  }, [selectedId]);

  return {
    // State
    selectedId,
    setSelectedId,
    loading,
    updating,
    selectedDay,
    setSelectedDay,
    selectedHour,
    setSelectedHour,
    activeTab,
    setActiveTab,
    lastUpdate,
    countdown,
    activeModel,
    setActiveModel,

    // Sito
    site,

    // Dati
    dayData,
    currentData: currentDataRounded,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    hourlyData,
    allHourlyData,
    allDailyData: dailyData,
    currentCape,

    // Azioni
    loadWeather,
  };
}