"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getAllMeteoDecolliAggressivo } from "@/services/threeSourceWeather";
import type { MeteoDecollo } from "@/services/threeSourceWeather";
import { DECOLLI } from "@/data/decolli";

export type { MeteoDecollo };

const REFRESH_INTERVAL = 15 * 60 * 1000;
const LOAD_TIMEOUT = 60000; // 60 secondi max per tutte le fonti

export function useThreeSourceWeather() {
  const [weatherData, setWeatherData] = useState<Map<string, MeteoDecollo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCompletedOnce = useRef(false);

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
      // Promise race con timeout per evitare blocchi
      const data = await Promise.race([
        getAllMeteoDecolliAggressivo(),
        new Promise<Map<string, MeteoDecollo>>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout caricamento 3-fonti")), LOAD_TIMEOUT)
        ),
      ]);
      
      setWeatherData(data);
      setLastUpdate(new Date());
      hasCompletedOnce.current = true;
    } catch (err) {
      // Non bloccare l'app: salva l'errore ma non mostrare loading
      console.warn("[3-fonti]", err);
      setError(err instanceof Error ? err.message : "Errore 3-fonti");
      hasCompletedOnce.current = true;
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

  // Safety: dopo 6 secondi forziamo loading=false
  useEffect(() => {
    const safety = setTimeout(() => {
      if (loading) {
        console.warn("[3-fonti] Forzo loading=false per evitare blocco");
        setLoading(false);
      }
    }, LOAD_TIMEOUT + 1000);
    return () => clearTimeout(safety);
  }, [loading]);

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
