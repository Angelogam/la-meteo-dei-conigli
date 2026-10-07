"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { HourData, DailyData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { fetchPrevisioniGiornaliere, type MeteoCurrent, type MeteoHourly, type MeteoDaily } from "@/services/openMeteoService";
import { calcolaStatoMeteo, calcolaPrecipProssimeOre, type StatoMeteo, type StatoMeteoResult } from "@/utils/statoMeteo";
import { calcolaIndiceVolabilita, type RisultatoVolabilita } from "@/utils/indiceVolabilita";
import { generateRealisticHourly, generateRealisticDaily, generateRealisticCurrent } from "@/services/fallbackWeatherData";

const STORAGE_KEY_SITE = "meteo_selected_decollo";
const REFRESH_INTERVAL = 900000; // 15 minuti

// Fallback realistico basato su fisica atmosferica quando l'API non risponde
function getFallbackData(lat: number, lon: number, altitude: number): { hourly: MeteoHourly[]; daily: MeteoDaily[]; current: MeteoCurrent | null } {
  const hourly = generateRealisticHourly(lat, lon, altitude, 0);
  const daily = generateRealisticDaily(lat, lon, altitude, new Date());
  const current = generateRealisticCurrent(lat, lon, altitude, hourly);
  return { hourly, daily, current };
}

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(STORAGE_KEY_SITE) || DECOLLI[0].id;
    return DECOLLI[0].id;
  });

  const site = DECOLLI.find(d => d.id === selectedId) || DECOLLI[0];
  
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<"meteo" | "venti" | "termiche" | "analisi">("meteo");

  const [hourlyData, setHourlyData] = useState<MeteoHourly[]>([]);
  const [dailyData, setDailyData] = useState<MeteoDaily[]>([]);
  const [currentData, setCurrentData] = useState<MeteoCurrent | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  // Raw JSON response — condiviso da tutti i componenti per evitare chiamate duplicate
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Dati derivati per giorno selezionato
  const dayData = useMemo(() => {
    const oggi = new Date();
    const target = new Date(oggi); target.setDate(oggi.getDate() + selectedDay);
    const targetStr = target.toDateString();
    return hourlyData.filter(h => {
      const d = new Date(h.time);
      return d.toDateString() === targetStr;
    });
  }, [hourlyData, selectedDay]);

  const currentHourData = dayData.find(h => new Date(h.time).getHours() === selectedHour) || dayData[0] || null;

  // Funzione per caricare dati con fallback offline
  const loadWeather = useCallback(async (forceRefresh = false) => {
    if (!site) return;
    
    setUpdating(true);
    setLoadingError(null);
    
    try {
      const result = await fetchPrevisioniGiornaliere(site.lat, site.lon);
      
      if (result.hourly.length > 0 && result.daily.length > 0) {
        setHourlyData(result.hourly);
        setDailyData(result.daily);
        setCurrentData(result.current);
        setRawApiResponse(result.rawJson ?? null);
        setLastUpdate(new Date());
        setIsOfflineMode(false);
        setLoading(false);
      } else {
        throw new Error("Dati vuoti");
      }
    } catch (error) {
      console.warn("API non disponibile, uso fallback offline:", error);
      setLoadingError("Dati offline (API non raggiungibile)");

      // Usa fallback realistico basato su fisica atmosferica
      const fallback = getFallbackData(site.lat, site.lon, site.elevation_m);
      setHourlyData(fallback.hourly);
      setDailyData(fallback.daily);
      setCurrentData(fallback.current);
      setRawApiResponse(null);
      setLastUpdate(new Date());
      setIsOfflineMode(true);
      setLoading(false);
    }
    
    setUpdating(false);
    setCountdown(REFRESH_INTERVAL);
  }, [site]);

  // Selezione sito - salva e ricarica
  const handleSetSelectedId = useCallback((newId: string) => {
    setSelectedId(newId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SITE, newId);
    }
  }, []);

  // Carica iniziale
  useEffect(() => {
    loadWeather();
  }, [selectedId, loadWeather]);

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
      setCountdown(prev => {
        if (prev <= 1000) return REFRESH_INTERVAL;
        return prev - 1000;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Stato meteo
  const statoMeteo = useMemo((): StatoMeteoResult | null => {
    if (!currentData) return null;
    const precipNext = calcolaPrecipProssimeOre(hourlyData, 6);
    return calcolaStatoMeteo({
      precipNow: currentData.precipitation,
      precipNextHours: precipNext,
      cloudNow: currentData.cloudCover,
      windSpeed: currentData.windSpeed,
      windDir: currentData.windDir,
      temperature: currentData.temperature,
      cape: currentData.cape,
    });
  }, [currentData, hourlyData]);

  // Indice volabilità
  const volabilita = useMemo((): RisultatoVolabilita | null => {
    if (!currentData) return null;
    return calcolaIndiceVolabilita({
      windSpeed: currentData.windSpeed,
      windDir: currentData.windDir,
      windGusts: currentData.windGusts,
      esposizione: site?.exposure ?? site?.orientation ?? "S",
      temperature: currentData.temperature,
      dewPoint: currentData.dewPoint ?? currentData.temperature - 5,
      cloudCover: currentData.cloudCover,
      precipitation: currentData.precipitation ?? 0,
      weatherCode: currentData.weatherCode,
      cape: currentData.cape,
      liftedIndex: currentData.liftedIndex ?? undefined,
      quota: site?.elevation_m ?? 1000,
    });
  }, [currentData, site]);

  // Dati giornalieri arricchiti
  const enrichedDaily = useMemo(() => {
    return dailyData.map((d, i) => {
      const base = {
        ...d,
        weatherCode: d.weatherCode ?? 0,
        tempMax: d.tempMax ?? d.temperatureMax ?? 20,
        tempMin: d.tempMin ?? d.temperatureMin ?? 10,
        precipitationSum: d.precipitationSum ?? 0,
        precipitationProbabilityMax: d.precipitationProbabilityMax ?? 0,
        windSpeedMax: d.windSpeedMax ?? 10,
        windGustsMax: d.windGustsMax ?? 15,
        windDirDominant: d.windDirDominant ?? 180,
        uvIndexMax: d.uvIndexMax ?? 5,
        sunrise: d.sunrise ?? "06:30",
        sunset: d.sunset ?? "19:30",
        temperatureMax: d.temperatureMax ?? d.tempMax ?? 20,
        temperatureMin: d.temperatureMin ?? d.tempMin ?? 10,
        temperatureMean: d.temperatureMean ?? ((d.tempMax ?? 20) + (d.tempMin ?? 10)) / 2,
        apparentTempMax: d.apparentTempMax ?? (d.tempMax ?? 20),
        apparentTempMin: d.apparentTempMin ?? (d.tempMin ?? 10),
        daylightDuration: d.daylightDuration ?? 13,
        sunshineDuration: d.sunshineDuration ?? 8,
        rainSum: d.rainSum ?? d.precipitationSum ?? 0,
        snowfallSum: d.snowfallSum ?? 0,
        precipitationHours: d.precipitationHours ?? 0,
        shortwaveRadiationSum: d.shortwaveRadiationSum ?? 5000,
      };
      // Freezing level: usa dato API quando disponibile, altrimenti stima conservativa
      const freezingLevel = d.freezingLevel !== null && d.freezingLevel !== undefined
        ? d.freezingLevel
        : base.temperatureMean !== null && base.temperatureMean !== undefined
          ? Math.max(500, Math.round(5500 - base.temperatureMean * 155))
          : null;
      // Trend: compare with next day's predicted temp
      let trend: "↑" | "↓" | "→" | null = null;
      if (i < dailyData.length - 1) {
        const nextTempMax = dailyData[i + 1]?.temperatureMax ?? dailyData[i + 1]?.tempMax ?? 0;
        const thisTempMax = base.temperatureMax;
        const diff = nextTempMax - thisTempMax;
        if (diff > 2) trend = "↑";
        else if (diff < -2) trend = "↓";
        else trend = "→";
      }
      return { ...base, freezingLevel: Math.max(500, freezingLevel), trend };
    });
  }, [dailyData]);

  const dateLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
      const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
      labels.push(`${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`);
    }
    return labels;
  }, []);

  // Calcolo delta termico approssimativo
  const thermalDelta = useMemo(() => {
    if (!currentData) return 5;
    const delta = currentData.temperature - (currentData.dewPoint ?? currentData.temperature - 5);
    return Math.max(2, Math.min(12, delta));
  }, [currentData]);

  return {
    selectedId,
    setSelectedId: handleSetSelectedId,
    loading,
    loadingError,
    updating,
    selectedDay,
    setSelectedDay,
    selectedHour,
    setSelectedHour,
    activeTab,
    setActiveTab,
    lastUpdate,
    countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    isOfflineMode,
    currentHourData,
    hourlyData,
    dailyData,
    statoMeteo,
    volabilita,
    activeModel: "Open-Meteo" as const,
    currentCape: currentData ? {
      cape: currentData.cape ?? null,
      liftedIndex: currentData.liftedIndex ?? null,
      cin: currentData.cin ?? null,
    } : null,
    rawApiResponse,
  };
}
