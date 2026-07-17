"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAnalisiAvanzata, type AnalisiCompletaConMargine } from "./useAnalisiAvanzata";
import { weatherService, type MeteoHourly, type MeteoCurrent, type MeteoDaily } from "@/services/weatherService";

/**
 * Hook unico che combina tutti i dati meteo:
 * - Analisi avanzata (ogni 5 minuti, senza doppie richieste)
 * - Dati raw Open-Meteo (stessa chiamata di useAnalisiAvanzata)
 * - Previsioni giornaliere
 * - Calcoli di margine d'errore su TUTTI i parametri
 */

export interface DatiCompleti {
  analisi: AnalisiCompletaConMargine[];
  riepilogo: {
    oreValide: number; oreTotali: number; mediaRateo: number;
    maxRateo: number; oreAttive: number; mediaForza: number;
    mediaConfidenza: number; medioErrore: number; medioCape: number;
    medioGradiente: number; ultimoAggiornamento: Date;
  } | null;
  hourlyData: MeteoHourly[];
  currentData: MeteoCurrent | null;
  dailyData: MeteoDaily[];
  loading: boolean;
  error: string | null;
  tempoTrascorso: number;
  ultimoAggiornamento: Date;
  marginiErrore: {
    temperatura: number; vento: number; termiche: number;
    baseNuvole: number; topTermico: number; pressione: number;
    umidita: number; pioggia: number;
  };
}

export function useMeteoCompleto(lat: number, lon: number, altitude: number): DatiCompleti {
  const { analisi, riepilogo, loading: analisiLoading, error: analisiError, hourlyData, currentData, tempoTrascorso } = useAnalisiAvanzata(lat, lon, altitude);
  const [dailyData, setDailyData] = useState<MeteoDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimoAggiornamento, setUltimoAggiornamento] = useState(new Date());

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
    return () => { attivo = false; };
  }, [lat, lon]);

  const marginiErrore = useMemo(() => {
    if (!analisi.length) {
      return { temperatura: 2, vento: 5, termiche: 0.5, baseNuvole: 200, topTermico: 300, pressione: 3, umidita: 10, pioggia: 0.5 };
    }
    const mediaErrore = analisi.reduce((s, a) => s + a.errore, 0) / analisi.length;
    return {
      temperatura: Math.round((mediaErrore / 100) * 3 * 10) / 10,
      vento: Math.round((mediaErrore / 100) * 8 * 10) / 10,
      termiche: Math.round((mediaErrore / 100) * 1.5 * 10) / 10,
      baseNuvole: Math.round((mediaErrore / 100) * 300),
      topTermico: Math.round((mediaErrore / 100) * 500),
      pressione: Math.round((mediaErrore / 100) * 5 * 10) / 10,
      umidita: Math.round((mediaErrore / 100) * 15 * 10) / 10,
      pioggia: Math.round((mediaErrore / 100) * 1 * 10) / 10,
    };
  }, [analisi]);

  return {
    analisi, riepilogo, hourlyData, currentData, dailyData,
    loading: loading || analisiLoading,
    error: error || analisiError,
    tempoTrascorso, ultimoAggiornamento, marginiErrore,
  };
}