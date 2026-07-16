"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAnalisiAvanzata, type AnalisiCompletaConMargine } from "./useAnalisiAvanzata";
import { weatherService, type MeteoHourly, type MeteoCurrent, type MeteoDaily } from "@/services/weatherService";

/**
 * Hook unico che combina tutti i dati meteo:
 * - Analisi avanzata (ogni 4s)
 * - Dati raw Open-Meteo
 * - Previsioni giornaliere
 * - Calcoli di margine d'errore su TUTTI i parametri
 */

export interface DatiCompleti {
  // Dati analisi
  analisi: AnalisiCompletaConMargine[];
  riepilogo: {
    oreValide: number;
    oreTotali: number;
    mediaRateo: number;
    maxRateo: number;
    oreAttive: number;
    mediaForza: number;
    mediaConfidenza: number;
    medioErrore: number;
    medioCape: number;
    medioGradiente: number;
    ultimoAggiornamento: Date;
  } | null;
  
  // Dati raw
  hourlyData: MeteoHourly[];
  currentData: MeteoCurrent | null;
  dailyData: MeteoDaily[];
  
  // Stato
  loading: boolean;
  error: string | null;
  tempoTrascorso: number;
  ultimoAggiornamento: Date;
  
  // Margini d'errore per ogni parametro
  marginiErrore: {
    temperatura: number; // °C
    vento: number; // km/h
    termiche: number; // m/s
    baseNuvole: number; // m
    topTermico: number; // m
    pressione: number; // hPa
    umidita: number; // %
    pioggia: number; // mm
  };
}

export function useMeteoCompleto(lat: number, lon: number, altitude: number): DatiCompleti {
  const { analisi, riepilogo, loading: analisiLoading, error: analisiError, hourlyData, currentData, tempoTrascorso } = useAnalisiAvanzata(lat, lon, altitude);
  const [dailyData, setDailyData] = useState<MeteoDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimoAggiornamento, setUltimoAggiornamento] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carica dati giornalieri ogni 4s
  useEffect(() => {
    let attivo = true;
    
    const caricaDaily = async () => {
      try {
        const { data } = await weatherService.fetchWithFallback(lat, lon);
        if (!attivo || !data) return;
        setDailyData(data.daily);
        setUltimoAggiornamento(new Date());
        setLoading(false);
        setError(null);
      } catch (err) {
        if (!attivo) return;
        setError(err instanceof Error ? err.message : "Errore");
        setLoading(false);
      }
    };

    caricaDaily();
    intervalRef.current = setInterval(caricaDaily, 4000);

    return () => {
      attivo = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lat, lon]);

  // Calcola margini d'errore per ogni parametro
  const marginiErrore = useMemo(() => {
    if (!analisi.length) {
      return {
        temperatura: 2,
        vento: 5,
        termiche: 0.5,
        baseNuvole: 200,
        topTermico: 300,
        pressione: 3,
        umidita: 10,
        pioggia: 0.5,
      };
    }

    // Media degli errori su tutte le ore
    const mediaErrore = analisi.reduce((s, a) => s + a.errore, 0) / analisi.length;

    return {
      temperatura: Math.round((mediaErrore / 100) * 3 * 10) / 10, // max ±3°C
      vento: Math.round((mediaErrore / 100) * 8 * 10) / 10, // max ±8 km/h
      termiche: Math.round((mediaErrore / 100) * 1.5 * 10) / 10, // max ±1.5 m/s
      baseNuvole: Math.round((mediaErrore / 100) * 300), // max ±300m
      topTermico: Math.round((mediaErrore / 100) * 500), // max ±500m
      pressione: Math.round((mediaErrore / 100) * 5 * 10) / 10, // max ±5 hPa
      umidita: Math.round((mediaErrore / 100) * 15 * 10) / 10, // max ±15%
      pioggia: Math.round((mediaErrore / 100) * 1 * 10) / 10, // max ±1mm
    };
  }, [analisi]);

  return {
    analisi,
    riepilogo,
    hourlyData,
    currentData,
    dailyData,
    loading: loading || analisiLoading,
    error: error || analisiError,
    tempoTrascorso,
    ultimoAggiornamento,
    marginiErrore,
  };
}