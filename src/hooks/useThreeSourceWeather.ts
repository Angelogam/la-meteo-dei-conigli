"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getAllMeteoDecolliAggressivo, getAllMeteoDecolliBatch, getAllMeteoDecolliDiretto,
  cachedBatchSites, shapeCachedBatchSites,
} from "@/services/threeSourceWeather";
import type { MeteoDecollo } from "@/services/threeSourceWeather";
import { DECOLLI } from "@/data/decolli";

export type { MeteoDecollo };

const REFRESH_INTERVAL = 15 * 60 * 1000;
const LOAD_TIMEOUT = 30000; // 30 secondi max - aumentato per dare tempo a tutte le fonti

// Fallback offline: mostra N/D invece di dati inventati
function offlineFallback(name: string): MeteoDecollo {
  return {
    temp: "N/D",
    rain: "N/D",
    cloud: "N/D",
    wind: "N/D",
    dir: "N/D",
    stato: "Offline",
    baseNubi: "N/D",
    termiche: "N/D",
    indice: null,
    indiceLabel: "N/D",
    freezingLevel: null,
    weatherCode: null,
    fonte: `Nessun dato disponibile (${name})`
  };
}

export function useThreeSourceWeather() {
  const [weatherData, setWeatherData] = useState<Map<string, MeteoDecollo>>(() => {
    // primo disegno immediato dalla cache della sessione: la pagina non aspetta
    // la rete per mostrare numeri, il refresh fresco parte in background
    const cached = cachedBatchSites();
    if (cached) {
      try {
        const m = shapeCachedBatchSites(cached);
        if (m.size) return m;
      } catch { /* cache corrotta: si ricomincia da zero */ }
    }
    const m = new Map<string, MeteoDecollo>();
    DECOLLI.forEach(d => m.set(d.id, offlineFallback(d.name)));
    return m;
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCompletedOnce = useRef(false);

  const mergedDecolli = useMemo(() => {
    return DECOLLI.map(d => {
      let aggressive = weatherData.get(d.id);
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
      // 1) BATCH via proxy same-origin (una chiamata Open-Meteo multi-location sul
      //    server, cache CDN 5 min); 2) se il proxy è in 429/502, la STESSA chiamata
      //    multi-location dritta dal browser (IP dell'utente, mai limitata); 3) per
      //    ultimo il ciclo per-decollo a 3 fonti.
      let data: Map<string, MeteoDecollo>;
      try {
        data = await getAllMeteoDecolliBatch();
      } catch {
        data = await getAllMeteoDecolliDiretto();
      }
      setWeatherData(data);
      setLastUpdate(new Date());
      hasCompletedOnce.current = true;
    } catch {
      try {
        const data = await getAllMeteoDecolliAggressivo();
        setWeatherData(data);
        setLastUpdate(new Date());
      } catch (err) {
        console.warn("[3-fonti] Errore caricamento, mantengo dati precedenti:", err);
        setError(err instanceof Error ? err.message : "Errore 3-fonti");
      }
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
