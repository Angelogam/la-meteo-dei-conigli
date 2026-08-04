import { useState, useEffect, useCallback, useRef } from "react";
import type { HourData, DailyData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState<string>("pian-mune-bric-lombatera");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState<"meteo" | "venti" | "termiche" | "analisi">("meteo");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(0);
  const [dayData, setDayData] = useState<DailyData[]>([]);
  const [currentData, setCurrentData] = useState<HourData | null>(null);
  const [thermalDelta, setThermalDelta] = useState(0);
  const [enrichedDaily, setEnrichedDaily] = useState<any[]>([]);
  const [dateLabels, setDateLabels] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string>("auto");
  const [currentCape, setCurrentCape] = useState<{ cape: number; liftedIndex: number; cin: number } | null>(null);

  const site = DECOLLI.find((d) => d.id === selectedId);

  const loadWeather = useCallback(async () => {
    setUpdating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLastUpdate(new Date());
      setCountdown(4000);
    } finally {
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 100), 100);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return {
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
    dayData,
    setDayData,
    currentData,
    setCurrentData,
    thermalDelta,
    setThermalDelta,
    enrichedDaily,
    setEnrichedDaily,
    dateLabels,
    setDateLabels,
    site,
    loadWeather,
    activeModel,
    setActiveModel,
    currentCape,
    setCurrentCape,
  };
}