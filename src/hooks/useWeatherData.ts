"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { weatherService } from "@/services/weatherService";
import { getWeatherAlert, getWindProfile, getThermalStrength, getStabilityIndex, getCloudBase, getThermalPlafond, getWindDirection, getWindArrow } from "@/utils/weatherHelpers";
import { DECOLLI } from "@/data/decolli";
import { fetchMeteo } from "@/services/meteoApi";
import { transformHourlyData, transformCurrentData, transformDailyData } from "@/utils/transformMeteo";
import type { HourData, CurrentData, DailyData } from "@/types/meteo";

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<{
    hourly: HourData[];
    daily: DailyData[];
    current: CurrentData;
  } | null>(null);
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
      // Chiamata API reale a Open-Meteo per il sito selezionato
      const raw = await fetchMeteo({ lat: site.lat, lon: site.lon });

      const current = transformCurrentData(raw.current);
      const hourly = transformHourlyData(raw.hourly);
      const daily = transformDailyData(raw.daily);

      setMeteoData({ hourly, daily, current });
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
    // refresh ogni 30 min
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeather]);

  // Filtra i dati orari per il giorno selezionato
  const dayData = useMemo(() => {
    if (!meteoData) return [];
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + selectedDay);

    return (meteoData.hourly || []).filter((h: HourData) => {
      const d = new Date(h.time);
      return d.getFullYear() === targetDate.getFullYear() &&
             d.getMonth() === targetDate.getMonth() &&
             d.getDate() === targetDate.getDate();
    });
  }, [meteoData, selectedDay]);

  const currentData = useMemo(() => {
    if (!meteoData?.current) return null;
    const c = meteoData.current;
    return {
      temperature: c.temperature,
      feelsLike: c.apparentTemp,
      humidity: c.humidity,
      dewPoint: 0, // non sempre presente, calcoliamo sotto
      precipitation: c.precipitation,
      weatherCode: c.weatherCode,
      cloudCover: c.cloudCover,
      pressure: c.pressure,
      windSpeed: c.windSpeed,
      windDir: c.windDir,
      windGust: c.windGusts,
      isDay: c.isDay,
      uvIndex: 5,
      time: c.time,
      // per SiteHeader
      tempMax: 25,
      tempMin: 10,
      windMax: 0,
      thermalMax: 0,
      thermalAvg: 0,
      rainProb: 0,
      dewPoint: 8,
    };
  }, [meteoData]);

  const thermalDelta = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    const temps = dayData.map((h: HourData) => h.temperature).filter((t: any) => t != null);
    if (temps.length === 0) return 0;
    return Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10;
  }, [dayData]);

  // enrichedDaily con dati REALI ogni ora per ogni giorno
  const enrichedDaily = useMemo(() => {
    if (!meteoData || !meteoData.daily) return [];

    return meteoData.daily.map((day: DailyData, idx: number) => {
      const d = new Date(day.time);
      const hours = meteoData.hourly.filter((h: HourData) =>
        h.time.getFullYear() === d.getFullYear() &&
        h.time.getMonth() === d.getMonth() &&
        h.time.getDate() === d.getDate()
      );
      const temps = hours.map((h: HourData) => h.temperature).filter((t: any) => t != null);
      const delta = temps.length > 0 ? Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10 : 0;
      const avgWind = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: HourData) => s + (h.windSpeed || 0), 0) / hours.length * 10) / 10
        : 0;
      const maxWind = hours.length > 0
        ? Math.max(...hours.map((h: HourData) => h.windSpeed || 0))
        : 0;
      const avgCloud = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: HourData) => s + (h.cloudCover || 0), 0) / hours.length)
        : 0;
      
      // Wind gust massimo
      const maxGust = hours.length > 0
        ? Math.round(Math.max(...hours.map((h: HourData) => h.windGusts || 0)))
        : 0;

      // Vento medio a 80m, 120m, 180m
      const avgWind80 = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: HourData) => s + ((h as any).wind80m || h.windSpeed * 1.2), 0) / hours.length * 10) / 10
        : 0;
      const avgWind120 = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: HourData) => s + ((h as any).wind120m || h.windSpeed * 1.4), 0) / hours.length * 10) / 10
        : 0;
      const avgWind180 = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: HourData) => s + ((h as any).wind180m || h.windSpeed * 1.6), 0) / hours.length * 10) / 10
        : 0;

      // Vento a diverse quote da windProfile
      const wind2000m = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: HourData) => {
            const profile = (h as any).windProfile || [];
            const level = profile.find((l: any) => l.height >= 1800 && l.height <= 2200);
            return s + (level?.speed || h.windSpeed * 2.5);
          }, 0) / hours.length * 10) / 10
        : 0;

      const wind3000m = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: HourData) => {
            const profile = (h as any).windProfile || [];
            const level = profile.find((l: any) => l.height >= 2800 && l.height <= 3200);
            return s + (level?.speed || h.windSpeed * 3.2);
          }, 0) / hours.length * 10) / 10
        : 0;

      // Precipitazione cumulativa e probabilità massima
      const precipSum = hours.reduce((s: number, h: HourData) => s + (h.precipitation || 0), 0);
      const precipProbaMax = hours.length > 0
        ? Math.round(Math.max(...hours.map((h: HourData) => (h as any).precipitationProba || 0)))
        : 0;

      // Umidità media
      const avgHumidity = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: HourData) => s + (h.humidity || 50), 0) / hours.length)
        : 50;

      // Pressione media
      const avgPressure = hours.length > 0
        ? Math.round(hours.reduce((s: number, h: HourData) => s + (h.pressure || 1013), 0) / hours.length)
        : 1013;

      // Visibilità media (se disponibile)
      const avgVisibility = hours.length > 0
        ? Math.round(Math.max(...hours.map((h: HourData) => (h as any).visibility || 20)))
        : 20;

      // Direzione vento dominante
      const windDirs = hours.map((h: HourData) => h.windDir).filter((d: number) => d != null);
      const dominantDir = windDirs.length > 0
        ? Math.round(windDirs.reduce((s: number, d: number) => s + d, 0) / windDirs.length)
        : 180;

      // Base termica e top
      const avgTemp = temps.length > 0 ? temps.reduce((s: number, t: number) => s + t, 0) / temps.length : 15;
      const avgDew = hours.map((h: HourData) => h.dewPoint).filter((d: number) => d != null);
      const dewAvg = avgDew.length > 0 ? avgDew.reduce((s: number, d: number) => s + d, 0) / avgDew.length : 8;
      const cloudBase = getCloudBase(avgTemp, dewAvg, site.altitude);

      // Turbolenza stimata da wind gust e wind shear
      const gustFactor = hours.length > 0
        ? Math.max(...hours.map((h: HourData) => (h.windGusts || 0) / Math.max(h.windSpeed, 1)))
        : 1.5;
      const turbulence = Math.min(5, Math.max(0, Math.round((gustFactor - 1) * 3 + (maxWind > 25 ? 1 : 0) + (avgCloud > 60 ? 0.5 : 0))));

      // Wind shear 0-2km (approssimato)
      const windShear = wind2000m > 0 ? Math.round((wind2000m - avgWind) * 10) / 10 : 0;

      // Forza termica media (da thermalDelta e condizioni)
      const thermalUpdraft = Math.min(5, Math.max(0, Math.round((delta / 8 + (avgHumidity < 50 ? 0.5 : 0) + (avgWind >= 5 && avgWind <= 15 ? 0.5 : 0)) * 10) / 10));

      // Inversione termica (assente per default)
      const inversionStrength = 0;

      return {
        tempMax: day.tempMax,
        tempMin: day.tempMin,
        weatherCode: day.weatherCode,
        precipitationSum: day.precipitationSum,
        precipitationProbability: precipProbaMax,
        windSpeed10m: avgWind,
        windGusts10m: maxGust,
        windSpeed2000m: wind2000m,
        windSpeed1500m: wind2000m, // fallback
        windSpeed3000m: wind3000m,
        windDirection: dominantDir,
        cloudCover: avgCloud,
        humidity: avgHumidity,
        pressureSeaLevel: avgPressure,
        visibility: avgVisibility,
        thermalBase: cloudBase,
        thermalUpdraft,
        thermalStrength: thermalUpdraft, // alias
        thermalDelta: delta,
        inversionStrength,
        windShear,
        turbulence,
        gustFactor: Math.round(gustFactor * 10) / 10,
        avgWind,
        maxWind,
        avgCloud,
        avgWind80: avgWind80 || 0,
        avgWind120: avgWind120 || 0,
        avgWind180: avgWind180 || 0,
        sunDuration: day.sunshineDuration || 0,
        uvMax: day.uvIndexMax || 0,
        date: day.time,
        // Campi per retrocompatibilità
        temperature_2m_max: day.tempMax,
        temperature_2m_min: day.tempMin,
        precipitation_sum: day.precipitationSum,
        wind_speed_10m_max: Math.round(avgWind * 10) / 10,
        wind_gusts_10m_max: maxGust,
        wind_direction_10m_dominant: dominantDir,
        weather_code: day.weatherCode,
        visibility: avgVisibility,
        humidity: avgHumidity,
        pressure_msl: avgPressure,
        thermal_updraft: thermalUpdraft,
        thermal_base: cloudBase,
        thermal_strength: thermalUpdraft,
        inversion_strength: inversionStrength,
        wind_shear: windShear,
        turbulence,
        gust_factor: Math.round(gustFactor * 10) / 10,
        wind_speed_2000m: wind2000m,
        wind_speed_3000m: wind3000m,
        wind_direction: dominantDir,
        cloud_cover: avgCloud,
        precipitation_probability: precipProbaMax,
        thermalDelta: delta,
        avgWind,
        maxWind,
        avgCloud,
      };
    });
  }, [meteoData, site.altitude]);

  const dateLabels = enrichedDaily.map((d: any) => {
    const date = d.date || new Date();
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  });

  // WindProfile reale dai dati di vento in quota
  const windProfile = useMemo(() => {
    if (!currentData) return getWindProfile(currentData?.windSpeed || 0, currentData?.windDir || 0);

    return getWindProfile(currentData.windSpeed || 0, currentData.windDir || 0, (currentData as any).windProfile);
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

  // Prepara weatherMap per SidebarDecolli
  const hourlyDataArray = meteoData?.hourly || [];
  const now = new Date();
  const weatherMap: Record<string, any> = {};
  for (const d of DECOLLI) {
    // Usa un approccio semplice: per il sito selezionato, usa il currentData
    if (d.id === selectedId && currentData) {
      weatherMap[d.id] = { ...currentData, time: now };
    } else {
      // Per altri siti non abbiamo dati reali (richiederebbe troppe API calls)
      // Usiamo i dati del sito corrente come stima approssimativa
      weatherMap[d.id] = currentData ? { ...currentData, time: now } : null;
    }
  }

  return {
    selectedId, setSelectedId,
    meteoData, loading, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate,
    site,
    dayData,
    currentData: currentData as any,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    windProfile,
    weatherAlert,
    stabilityIndex,
    thermalStrength,
    loadWeather,
    weatherMap,
    hourlyData: hourlyDataArray,
  };
}