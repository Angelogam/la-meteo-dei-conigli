"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { analisiAvanzataCompleta, type AnalisiCompleta } from "@/services/analisiAvanzata";
import { weatherService, type MeteoHourly, type MeteoCurrent } from "@/services/weatherService";

/**
 * Hook che esegue l'analisi avanzata in tempo reale su TUTTE le ore.
 * Usa SOLO weatherService, nessuna altra fonte.
 */

export interface AnalisiCompletaConMargine extends Omit<AnalisiCompleta, 'confidenza'> {
  confidenza: number;
  errore: number;
  erroreTemperatura: number;
  erroreVento: number;
  erroreTermiche: number;
  oreValide: number;
  ultimoAggiornamento: Date;
}

const REFRESH_INTERVAL = 300000; // 5 minuti

export function useAnalisiAvanzata(lat: number, lon: number, altitude: number) {
  const [hourlyData, setHourlyData] = useState<MeteoHourly[]>([]);
  const [currentData, setCurrentData] = useState<MeteoCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempoTrascorso, setTempoTrascorso] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let attivo = true;
    
    const carica = async () => {
      try {
        const { data } = await weatherService.fetchWithFallback(lat, lon);
        if (!attivo) return;
        if (!data) {
          setError("Nessun dato ricevuto da Open-Meteo");
          setLoading(false);
          return;
        }
        setHourlyData(data.hourly);
        setCurrentData(data.current);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (!attivo) return;
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
        setLoading(false);
      }
    };

    carica();

    intervalRef.current = setInterval(carica, REFRESH_INTERVAL);

    return () => {
      attivo = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lat, lon]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTempoTrascorso(prev => prev + 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const analisi = useMemo((): AnalisiCompletaConMargine[] => {
    if (!hourlyData.length || !currentData) return [];
    const analisiBase = analisiAvanzataCompleta(hourlyData, currentData, altitude);
    return analisiBase.map(a => {
      const erroreBase = Math.max(5, 100 - a.confidenza * 100);
      const oreDisponibili = hourlyData.filter(h => {
        const hh = new Date(h.time).getHours();
        return hh === a.ora;
      }).length;
      const erroreOre = Math.max(0, 30 - oreDisponibili * 5);
      const erroreFinale = Math.min(100, erroreBase + erroreOre);
      return {
        ...a,
        errore: Math.round(erroreFinale * 10) / 10,
        erroreTemperatura: Math.round((erroreFinale / 100) * 3 * 10) / 10,
        erroreVento: Math.round((erroreFinale / 100) * 8 * 10) / 10,
        erroreTermiche: Math.round((erroreFinale / 100) * 1.5 * 10) / 10,
        oreValide: oreDisponibili,
        ultimoAggiornamento: new Date(),
      };
    });
  }, [hourlyData, currentData, altitude]);

  const riepilogo = useMemo(() => {
    if (!analisi.length) return null;
    const oreValide = analisi.filter(a => a.oreValide > 0).length;
    const mediaRateo = analisi.reduce((s, a) => s + a.rateoSalita, 0) / Math.max(1, analisi.length);
    const maxRateo = Math.max(...analisi.map(a => a.rateoSalita));
    const oreAttive = analisi.filter(a => a.rateoSalita >= 0.3).length;
    const mediaForza = analisi.reduce((s, a) => s + a.forzaTermica, 0) / Math.max(1, analisi.length);
    const mediaConfidenza = analisi.reduce((s, a) => s + a.confidenza, 0) / Math.max(1, analisi.length);
    const medioErrore = analisi.reduce((s, a) => s + a.errore, 0) / Math.max(1, analisi.length);
    const medioCape = Math.round(analisi.reduce((s, a) => s + a.cape, 0) / Math.max(1, analisi.length));
    const medioGradiente = Math.round(analisi.reduce((s, a) => s + a.gradienteReale, 0) / Math.max(1, analisi.length) * 100) / 100;
    return {
      oreValide, oreTotali: analisi.length,
      mediaRateo: Math.round(mediaRateo * 10) / 10,
      maxRateo: Math.round(maxRateo * 10) / 10, oreAttive,
      mediaForza: Math.round(mediaForza * 10) / 10,
      mediaConfidenza: Math.round(mediaConfidenza * 100) / 100,
      medioErrore: Math.round(medioErrore * 10) / 10,
      medioCape, medioGradiente, ultimoAggiornamento: new Date(),
    };
  }, [analisi]);

  return { analisi, riepilogo, loading, error, hourlyData, currentData, tempoTrascorso };
}