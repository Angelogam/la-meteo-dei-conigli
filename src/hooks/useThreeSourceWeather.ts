"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAllMeteoDecolliAggressivo } from "@/services/threeSourceWeather";
import type { MeteoDecollo } from "@/services/threeSourceWeather";
import { DECOLLI } from "@/data/decolli";

export type { MeteoDecollo };

const REFRESH_INTERVAL = 15 * 60 * 1000;

export function useThreeSourceWeather() {
  const [weatherData, setWeatherData] = useState<Map<string, MeteoDecollo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mergedDecolli = useMemo(() => {
    return DECOLLI.map(d => {
      const aggressive = weatherData.get(d.name);
      return {
        ...d,
        aggressiveWeather: aggressive
      };
    });
  }, [weatherData]);

  const loadWeather = useCallback(async () => {
    setUpdating(true);
    setError(null);
    try {
      const data = await getAllMeteoDecolliAggressivo();
      setWeatherData(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore caricamento meteo 3-fonti");
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadWeather]);

  const getSelectedDecollo = useCallback((selectedId: string) => {
    return mergedDecolli.find(d => d.id === selectedId);
  }, [mergedDecolli]);

  return {
    weatherData,
    mergedDecolli,
    loading,
    updating,
    lastUpdate,
    error,
    loadWeather,
    getSelectedDecollo
  };
}