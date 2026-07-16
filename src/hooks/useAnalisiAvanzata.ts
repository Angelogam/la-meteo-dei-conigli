"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { analisiAvanzataCompleta, type AnalisiCompleta } from "@/services/analisiAvanzata";
import { weatherService, type MeteoHourly, type MeteoCurrent } from "@/services/weatherService";

/**
 * Hook che esegue l'analisi avanzata in tempo reale su TUTTE le ore
 * e su TUTTI i tab contemporaneamente.
 * 
 * Fa refresh ogni 4 secondi con i dati ufficiali Open-Meteo.
 * Calcola il margine d'errore per ogni previsione.
 */

export interface AnalisiCompletaConMargine extends Omit<AnalisiCompleta, 'confidenza'> {
  confidenza: number;
  errore: number; // margine d'errore (0-100%)
  erroreTemperatura: number; // °C
  erroreVento: number; // km/h
  erroreTermiche: number; // m/s
  oreValide: number;
  ultimoAggiornamento: Date;
}

const REFRESH_INTERVAL = 4000; // 4 secondi

export function useAnalisiAvanzata(lat: number, lon: number, altitude: number) {
  const [hourlyData, setHourlyData] = useState<MeteoHourly[]>([]);
  const [currentData, setCurrentData] = useState<MeteoCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempoTrascorso, setTempoTrascorso] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carica dati all'inizio
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

    // Refresh ogni 4 secondi
    intervalRef.current = setInterval(carica, REFRESH_INTERVAL);

    return () => {
      attivo = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lat, lon]);

  // Timer per il contatore
  useEffect(() => {
    const timer = setInterval(() => {
      setTempoTrascorso(prev => prev + 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Calcola l'analisi avanzata per TUTTE le ore con margine d'errore
  const analisi = useMemo((): AnalisiCompletaConMargine[] => {
    if (!hourlyData.length || !currentData) return [];

    const analisiBase = analisiAvanzataCompleta(hourlyData, currentData, altitude);
    
    return analisiBase.map(a => {
      // Calcola margine d'errore basato sulla confidenza e sulla variabilità dei dati
      const oreDisponibili = hourlyData.filter(h => {
        const hh = new Date(h.time).getHours();
        return hh === a.ora;
      }).length;
      
      // Più ore di dati = minore margine d'errore
      const erroreBase = Math.max(5, 100 - a.confidenza * 100);
      const erroreOre = Math.max(0, 30 - oreDisponibili * 5);
      const erroreFinale = Math.min(100, erroreBase + erroreOre);
      
      // Errori specifici per parametro
      const erroreTemperatura = Math.round((erroreFinale / 100) * 3 * 10) / 10; // max ±3°C
      const erroreVento = Math.round((erroreFinale / 100) * 8 * 10) / 10; // max ±8 km/h
      const erroreTermiche = Math.round((erroreFinale / 100) * 1.5 * 10) / 10; // max ±1.5 m/s

      return {
        ...a,
        errore: Math.round(erroreFinale * 10) / 10,
        erroreTemperatura,
        erroreVento,
        erroreTermiche,
        oreValide: oreDisponibili,
        ultimoAggiornamento: new Date(),
      };
    });
  }, [hourlyData, currentData, altitude]);

  // Riepilogo generale per il giorno
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
      oreValide,
      oreTotali: analisi.length,
      mediaRateo: Math.round(mediaRateo * 10) / 10,
      maxRateo: Math.round(maxRateo * 10) / 10,
      oreAttive,
      mediaForza: Math.round(mediaForza * 10) / 10,
      mediaConfidenza: Math.round(mediaConfidenza * 100) / 100,
      medioErrore: Math.round(medioErrore * 10) / 10,
      medioCape,
      medioGradiente,
      ultimoAggiornamento: new Date(),
    };
  }, [analisi]);

  return {
    analisi,
    riepilogo,
    loading,
    error,
    hourlyData,
    currentData,
    tempoTrascorso,
  };
}