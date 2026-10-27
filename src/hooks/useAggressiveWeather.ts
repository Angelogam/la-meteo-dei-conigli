"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAllAggressiveWeather, DECOLLI_AGGRESSIVI } from "@/services/aggressiveWeather";
import { DECOLLI } from "@/data/decolli";

interface AggressiveWeatherResult {
  temp: string;
  rain: string;
  cloud: string;
  wind: string;
  stato: string;
  baseNubi: string;
  termiche: string;
  indice: number;
  indiceLabel: string;
  fonte: string;
}

const REFRESH_INTERVAL = 15 * 60 * 1000;

export function useAggressiveWeather() {
  const [weatherData, setWeatherData] = useState<Map<string, AggressiveWeatherResult>>(new Map());
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
      const data = await getAllAggressiveWeather();
      setWeatherData(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore caricamento meteo aggressivo");
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
    getSelectedDecollo,
    DECOLLI_AGGRESSIVI
  };
}