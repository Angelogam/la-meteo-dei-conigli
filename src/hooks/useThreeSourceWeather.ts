"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getAllMeteoDecolliAggressivo } from "@/services/threeSourceWeather";
import type { MeteoDecollo } from "@/services/threeSourceWeather";
import { DECOLLI } from "@/data/decolli";

export type { MeteoDecollo };

const REFRESH_INTERVAL = 15 * 60 * 1000;
const LOAD_TIMEOUT = 30000; // 30 secondi max - aumentato per dare tempo a tutte le fonti

// Fallback offline con dati stimati
function offlineFallback(name: string): MeteoDecollo {
  return {
    temp: "18.0",
    rain: "0.0",
    cloud: "40.0",
    wind: "8.0",
    dir: "S",
    stato: "Sereno",
    baseNubi: "Media (1800-2500 m)",
    termiche: "Termiche moderate",
    indice: 4,
    indiceLabel: "Buono",
    fonte: `Stima offline (${name})`
  };
}

export function useThreeSourceWeather() {
  const [weatherData, setWeatherData] = useState<Map<string, MeteoDecollo>>(() => {
    // Inizializza con dati stimati per evitare "N/D"
    const m = new Map<string, MeteoDecollo>();
    DECOLLI.forEach(d => m.set(d.name, offlineFallback(d.name)));
    return m;
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCompletedOnce = useRef(false);

  const mergedDecolli = useMemo(() => {
    return DECOLLI.map(d => {
      let aggressive = weatherData.get(d.name);
      if (!aggressive) {
        aggressive = offlineFallback(d.name);
      }
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
      hasCompletedOnce.current = true;
    } catch (err) {
      console.warn("[3-fonti] Errore caricamento, mantengo dati precedenti:", err);
      setError(err instanceof Error ? err.message : "Errore 3-fonti");
      // Non resettare weatherData - mantieni i dati precedenti o i fallback
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
