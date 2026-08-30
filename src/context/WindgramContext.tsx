"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchWindProfile, WindProfileHour } from "@/services/openMeteoService";

interface WindgramContextValue {
  windData: Map<number, WindProfileHour> | null;
  loading: boolean;
  error: string | null;
  refreshWindData: (lat: number, lon: number, altitude: number, selectedDay: number) => void;
}

const WindgramContext = createContext<WindgramContextValue>({
  windData: null,
  loading: false,
  error: null,
  refreshWindData: () => {},
});

export function useWindgramContext() {
  return useContext(WindgramContext);
}

export function WindgramProvider({ children }: { children: React.ReactNode }) {
  const [windData, setWindData] = useState<Map<number, WindProfileHour> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWindData = useCallback(async (lat: number, lon: number, altitude: number, selectedDay: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchWindProfile(lat, lon, altitude, selectedDay);
      setWindData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento dei dati vento");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <WindgramContext.Provider value={{ windData, loading, error, refreshWindData }}>
      {children}
    </WindgramContext.Provider>
  );
}