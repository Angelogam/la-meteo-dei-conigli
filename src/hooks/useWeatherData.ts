"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

function convertHourlyToHourData(raw: any[]): HourData[] {
  return raw.map(h => ({
    time: h.time instanceof Date ? h.time : new Date(h.time),
    temperature: h.temperature ?? h.temperature_2m ?? 0,
    humidity: h.humidity ?? h.relative_humidity_2m ?? 50,
    dewPoint: h.dewPoint ?? h.dew_point_2m ?? 10,
    pressure: h.pressure ?? h.pressure_msl ?? 1013,
    surfacePressure: h.surfacePressure ?? h.surface_pressure ?? 1013,
    precipitation: h.precipitation ?? 0,
    rain: h.rain ?? 0,
    snowfall: h.snowfall ?? 0,
    weatherCode: h.weatherCode ?? h.weather_code ?? 0,
    cloudCover: h.cloudCover ?? h.cloud_cover ?? 30,
    cloudCoverLow: h.cloudCoverLow ?? h.cloud_cover_low ?? 0,
    cloudCoverMid: h.cloudCoverMid ?? h.cloud_cover_mid ?? 0,
    cloudCoverHigh: h.cloudCoverHigh ?? h.cloud_cover_high ?? 0,
    windSpeed: h.windSpeed ?? h.wind_speed_10m ?? 0,
    windDir: h.windDir ?? h.wind_direction_10m ?? 0,
    windGusts: h.windGusts ?? h.wind_gusts_10m ?? 0,
    uvIndex: h.uvIndex ?? h.uv_index ?? 0,
    feelsLike: h.apparentTemp ?? h.apparent_temperature ?? h.temperature ?? 0,
    radiation: h.shortwaveRadiation ?? h.shortwave_radiation ?? 0,
    directRadiation: h.directRadiation ?? h.direct_radiation ?? 0,
    visibility: h.visibility ?? 10000,
    vapourPressureDeficit: h.vapourPressureDeficit ?? 0,
    isDay: h.isDay ?? (h.time ? new Date(h.time).getHours() >= 6 && new Date(h.time).getHours() <= 20 : true),
    freezingLevel: h.freezingLevel ?? 3000,
    sunshineDuration: h.sunshineDuration ?? 0,
    cape: h.cape ?? 0,
    cin: h.cin ?? 0,
    liftedIndex: h.liftedIndex ?? 0,
    mixingRatio: 0,
    virtualTemp: 298,
  }));
}

function convertDailyData(raw: any[]): DailyData[] {
  if (!raw || raw.length === 0) return [];
  return raw.map(d => {
    const date = d.date instanceof Date ? d.date : new Date(d.date);
    return {
      date,
      weatherCode: d.weatherCode ?? d.weather_code ?? 0,
      temperatureMax: d.tempMax ?? d.temperature_2m_max ?? 0,
      temperatureMin: d.tempMin ?? d.temperature_2m_min ?? 0,
      temperatureMean: d.tempMean ?? ((d.tempMax ?? 0) + (d.tempMin ?? 0)) / 2,
      apparentTempMax: d.apparentTempMax ?? d.tempMax ?? 0,
      apparentTempMin: d.apparentTempMin ?? d.tempMin ?? 0,
      sunrise: d.sunrise ?? "",
      sunset: d.sunset ?? "",
      daylightDuration: d.daylightDuration ?? 0,
      sunshineDuration: d.sunshineDuration ?? 0,
      precipitationSum: d.precipitationSum ?? 0,
      rainSum: d.rainSum ?? 0,
      snowfallSum: d.snowfallSum ?? 0,
      precipitationHours: d.precipitationHours ?? 0,
      precipitationProbabilityMax: d.precipitationProbaMax ?? 0,
      windSpeedMax: d.windSpeedMax ?? d.wind_speed_10m_max ?? 0,
      windGustsMax: d.windGustsMax ?? d.wind_gusts_10m_max ?? 0,
      windDirDominant: d.windDirDominant ?? d.wind_direction_10m_dominant ?? 0,
      shortwaveRadiationSum: d.shortwaveRadiationSum ?? 0,
      uvIndexMax: d.uvIndexMax ?? d.uv_index_max ?? 0,
      windSpeed: d.windSpeed ?? 0,
      cloudCover: d.cloudCover ?? 0,
      weatherDescription: d.weatherDescription ?? getWeatherDescription(d.weatherCode ?? d.weather_code ?? 0),
    };
  });
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

  const [hourlyData, setHourlyData] = useState<HourData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [allHourlyData, setAllHourlyData] = useState<Record<string, HourData[]>>({});

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const dayData = hourlyData.filter(h => {
    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    const hDate = new Date(h.time);
    return (
      hDate.getDate() === targetDate.getDate() &&
      hDate.getMonth() === targetDate.getMonth() &&
      hDate.getFullYear() === targetDate.getFullYear()
    );
  });

  const currentData = dayData.find(h => new Date(h.time).getHours() === selectedHour) ||
    dayData[0] || hourlyData[0] || null;

  const currentDataRounded = currentData ? {
    ...currentData,
    temperature: Math.round(currentData.temperature * 10) / 10,
    windSpeed: Math.round(currentData.windSpeed * 10) / 10,
    windGusts: currentData.windGusts ? Math.round(currentData.windGusts) : 0,
    humidity: Math.round(currentData.humidity),
    pressure: Math.round(currentData.pressure),
    precipitation: Math.round(currentData.precipitation * 100) / 100,
    cloudCover: Math.round(currentData.cloudCover),
    uvIndex: Math.round(currentData.uvIndex * 10) / 10,
    visibility: currentData.visibility ? Math.round(currentData.visibility / 100) * 100 : 10000,
  } : null;

  const enrichedDaily = dailyData.map((d, i) => {
    const dayHours = hourlyData.filter(h => {
      const hDate = new Date(h.time);
      const dDate = new Date(d.date);
      return (
        hDate.getDate() === dDate.getDate() &&
        hDate.getMonth() === dDate.getMonth()
      );
    });

    const temps = dayHours.map(h => h.temperature).filter(t => t != null);
    const winds = dayHours.map(h => h.windSpeed).filter(w => w != null);
    const clouds = dayHours.map(h => h.cloudCover).filter(c => c != null);

    return {
      ...d,
      temperatureMax: temps.length > 0 ? Math.round(Math.max(...temps)) : d.temperatureMax,
      temperatureMin: temps.length > 0 ? Math.round(Math.min(...temps)) : d.temperatureMin,
      windSpeedMax: winds.length > 0 ? Math.round(Math.max(...winds)) : d.windSpeedMax,
      windSpeed: winds.length > 0 ? Math.round(winds.reduce((s, w) => s + w, 0) / winds.length) : d.windSpeed,
      cloudCover: clouds.length > 0 ? Math.round(clouds.reduce((s, c) => s + c, 0) / clouds.length) : d.cloudCover,
      weatherDescription: getWeatherDescription(d.weatherCode),
    };
  });

  const thermalDelta = currentData ? Math.round((currentData.temperature - (currentData.dewPoint || currentData.temperature - 8)) * 10) / 10 : 0;

  const currentCape = currentData ? {
    cape: Math.round(currentData.cape || 0),
    cin: Math.round(currentData.cin || 0),
    liftedIndex: currentData.liftedIndex !== undefined ? Math.round(currentData.liftedIndex * 10) / 10 : 0,
  } : null;

  const dateLabels = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  });

  const loadWeather = useCallback(async () => {
    if (!site) return;

    try {
      setUpdating(true);
      setLoading(true);

      const { data } = await weatherService.fetchWithFallback(site.lat, site.lon);

      if (data) {
        // Converti MeteoHourly in HourData
        const converted = convertHourlyToHourData(data.hourly);
        setHourlyData(converted);
        setDailyData(convertDailyData(data.daily));

        setAllHourlyData(prev => ({
          ...prev,
          [site.id]: converted,
        }));

        setLastUpdate(new Date());
        setCountdown(REFRESH_INTERVAL);
      }
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, [site]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      loadWeather();
    }, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadWeather]);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SITE, selectedId);
  }, [selectedId]);

  useEffect(() => {
    const ora = new Date().getHours();
    if (selectedHour < 0 || selectedHour > 23) {
      setSelectedHour(ora);
    }
  }, [selectedDay, selectedHour]);

  return {
    selectedId, setSelectedId,
    loading, updating,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown,
    activeModel, setActiveModel,
    site,
    dayData,
    currentData: currentDataRounded,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    hourlyData,
    allHourlyData,
    allDailyData: dailyData,
    currentCape,
    loadWeather,
  };
}