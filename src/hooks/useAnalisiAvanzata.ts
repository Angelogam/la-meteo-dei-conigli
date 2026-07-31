"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { analisiAvanzataCompleta, type AnalisiCompleta } from "@/services/analisiAvanzata";
import { weatherService, type MeteoHourly, type MeteoCurrent } from "@/services/weatherService";

export interface AnalisiCompletaConMargine extends Omit<AnalisiCompleta, 'confidenza'> {
  confidenza: number;
  errore: number;
  erroreTemperatura: number;
  erroreVento: number;
  erroreTermiche: number;
  oreValide: number;
  ultimoAggiornamento: Date;
}

const REFRESH_INTERVAL = 300000;

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
    
    // Convert MeteoHourly[] to HourData[]
    const hourlyDataConverted = hourlyData.map(h => ({
      time: h.time,
      temperature: h.temperature,
      feelsLike: h.apparentTemp, // MeteoHourly has apparentTemp
      humidity: h.humidity,
      dewPoint: h.dewPoint,
      pressure: h.pressure,
      surfacePressure: h.pressure, // approximation
      precipitation: h.precipitation,
      rain: 0, // not available in MeteoHourly
      snowfall: 0, // not available
      weatherCode: h.weatherCode,
      cloudCover: h.cloudCover,
      cloudCoverLow: 0, // not available
      cloudCoverMid: 0, // not available
      cloudCoverHigh: 0, // not available
      windSpeed: h.windSpeed,
      windDir: h.windDir,
      windGusts: h.windGusts,
      radiation: h.shortwaveRadiation,
      directRadiation: h.shortwaveRadiation, // approximation
      uvIndex: h.uvIndex,
      visibility: 10000, // default
      vapourPressureDeficit: 0, // default
      isDay: true, // we don't have it, set to true (not used in analisiAvanzataCompleta)
      freezingLevel: 3000, // default
      sunshineDuration: 0, // default
      cape: h.cape,
      cin: h.cin,
      liftedIndex: h.liftedIndex,
      mixingRatio: 0, // default
      virtualTemp: 298, // default
      temp80m: h.temp80m ?? null, // from MeteoHourly
      temp120m: h.temp120m ?? null, // from MeteoHourly
    }));
    
    // Convert MeteoCurrent to the expected current object for analisiAvanzataCompleta
    const currentDataConverted = {
      temperature: currentData?.temperature ?? 0,
      humidity: currentData?.humidity ?? 0,
      windSpeed: currentData?.windSpeed ?? 0,
      windDir: currentData?.windDir ?? 0,
      windGusts: currentData?.windGusts ?? 0,
      cloudCover: currentData?.cloudCover ?? 0,
      precipitation: currentData?.precipitation ?? 0,
      pressure: currentData?.pressure ?? 0,
      uvIndex: currentData?.uvIndex ?? 0,
      dewPoint: currentData ? (currentData.temperature - ((100 - currentData.humidity) / 5)) : 0, // approximate dewPoint
      temp80m: null, // not available in MeteoCurrent
      temp120m: null, // not available in MeteoCurrent
    };

    const analisiBase = analisiAvanzataCompleta(hourlyDataConverted, currentDataConverted, altitude);
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