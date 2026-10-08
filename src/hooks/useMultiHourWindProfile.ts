"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchHourly } from "@/lib/openMeteoClient";
import type { HourData } from "@/types/meteo";
import { calcCloudBase } from "@/utils/calcCloudBase";

interface WindLevel {
  hpa: string;
  alt: number;
  speed: number;
  dir: number;
  gust?: number;
}

interface HourWindData {
  hour: number;
  temp: number;
  dew: number | null;
  cloud: number | null;
  freeze: number | null;
  cape: number | null;
  levels: WindLevel[];
  cloudBase: number | null;
  maxRealAltitude: number;
}

const DEFAULT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

function interpolateWindAtAltitude(
  levels: WindLevel[] | undefined,
  targetAlt: number
): { speed: number; dir: number } | null {
  if (!levels || levels.length === 0) return null;

  const sorted = [...levels].sort((a, b) => a.alt - b.alt);

  if (sorted.length === 1) {
    return { speed: Math.round(sorted[0].speed), dir: Math.round(sorted[0].dir) };
  }

  // NON extrapolare al di sopra/sotto dei livelli disponibili
  if (targetAlt < sorted[0].alt) return null;
  if (targetAlt > sorted[sorted.length - 1].alt) return null;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].alt <= targetAlt && sorted[i + 1].alt >= targetAlt) {
      const lower = sorted[i];
      const upper = sorted[i + 1];
      const ratio = (targetAlt - lower.alt) / (upper.alt - lower.alt);
      const speed = lower.speed + ratio * (upper.speed - lower.speed);
      let diffDir = upper.dir - lower.dir;
      if (diffDir > 180) diffDir -= 360;
      if (diffDir < -180) diffDir += 360;
      let dir = lower.dir + diffDir * ratio;
      dir = ((dir % 360) + 360) % 360;
      return { speed: Math.round(speed), dir: Math.round(dir) };
    }
  }
  // Should not reach here, but safety fallback
  return null;
}

interface UseMultiHourWindProfileProps {
  lat: number;
  lon: number;
  siteAlt: number;
  selectedDay: number;
  fallbackData?: HourData[];
  rawData?: any; // JSON grezzo Open-Meteo — condiviso per evitare chiamate duplicate
}

/**
 * Costruisce la mappa vento-oraria dai dati orari già disponibili (fallback).
 * MATCHING: usa la DATA COMPLETA, non solo l'ora, per evitare coincidenze tra giorni diversi.
 */
function buildFromFallback(hourly: HourData[], siteAlt: number, selectedDay: number): Map<number, HourWindData> {
  const map = new Map<number, HourWindData>();
  DEFAULT_HOURS.forEach((targetHour) => {
    // Match by full date+time, not just hour, to avoid 10:00 today matching 10:00 tomorrow
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + selectedDay);
    targetDate.setHours(targetHour, 0, 0, 0);

    const h = hourly.find(d => {
      const dDate = new Date(d.time);
      return dDate.toDateString() === targetDate.toDateString() && dDate.getHours() === targetHour;
    });
    if (!h) return;

    const t = h.temperature ?? null;
    if (t === null) return; // Skip hours without temperature data
    const dew = h.dewPoint ?? null;
    const cloud = h.cloudCover ?? null;
    const freeze = h.freezingLevel ?? null;
    const cape = h.cape ?? null;

    const levels: WindLevel[] = [];
    const addLevel = (hpa: string, alt: number, speed: number | undefined, dir: number | undefined) => {
      // Usa != null invece di ?? per distinguere 0 (valore valido) da undefined (dato mancante)
      if (speed != null && dir != null && !isNaN(Number(speed)) && !isNaN(Number(dir)) && Number(speed) >= 0 && Number(dir) >= 0) {
        levels.push({ hpa, alt, speed: Math.round(Number(speed)), dir: Math.round(Number(dir)) });
      }
    };

    addLevel("10m", siteAlt + 10, h.windSpeed, h.windDir);
    addLevel("80m", siteAlt + 70, h.windSpeed80m, h.windDir80m);
    addLevel("120m", siteAlt + 110, h.windSpeed120m, h.windDir120m);
    addLevel("180m", siteAlt + 170, undefined, undefined);
    addLevel("925hPa", 760, h.windSpeed925hPa ?? h.windSpeed925, h.windDir925hPa ?? h.windDir925);
    addLevel("850hPa", 1450, h.windSpeed850hPa ?? h.windSpeed850, h.windDir850hPa ?? h.windDir850);
    addLevel("700hPa", 3000, h.windSpeed700hPa ?? h.windSpeed700, h.windDir700hPa ?? h.windDir700);
    addLevel("600hPa", 4200, h.windSpeed600hPa ?? h.windSpeed600, h.windDir600hPa ?? h.windDir600);
    addLevel("500hPa", 5500, h.windSpeed500hPa ?? h.windSpeed500, h.windDir500hPa ?? h.windDir500);

    const sortedLevels = levels.sort((a, b) => a.alt - b.alt);
    const maxRealAltitude = sortedLevels.length > 0 ? Math.max(...sortedLevels.map(l => l.alt)) : siteAlt;
    // Spread: differenza reale T-Td, senza minimi artificiali
    const spread = dew != null ? t - dew : 0;
    const cloudBase = dew != null ? calcCloudBase(siteAlt, t, dew) : null;

    map.set(targetHour, {
      hour: targetHour,
      temp: t,
      dew,
      cloud,
      freeze: freeze ?? null,
      cape,
      levels: sortedLevels,
      cloudBase: cloudBase ?? null,
      maxRealAltitude,
    });
  });
  return map;
}

/**
 * Elabora il JSON grezzo di Open-Meteo e restituisce la mappa vento-oraria.
 * MATCHING: usa la DATA COMPLETA per identificare l'ora corretta.
 */
function processRawJson(json: any, siteAlt: number, selectedDay: number): Map<number, HourWindData> {
  const times: string[] = json.hourly.time;
  const h = json.hourly;
  const hourDataMap = new Map<number, HourWindData>();

  // Calcola la data target per il matching corretto
  const targetDayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d.toISOString().split("T")[0];
  })();

  DEFAULT_HOURS.forEach((targetHour) => {
    // Match per data COMPLETA + ora, non solo ora
    const idx = times.findIndex((t) => {
      const datePart = t.split("T")[0];
      const hourPart = parseInt(t.split("T")[1].split(":")[0], 10);
      return datePart === targetDayStr && hourPart === targetHour;
    });
    if (idx === -1) return;

    const t = h.temperature_2m?.[idx] != null ? Number(h.temperature_2m[idx]) : NaN;
    if (isNaN(t)) return; // Skip hours without valid temperature data
    const dew = h.dew_point_2m?.[idx] != null ? Number(h.dew_point_2m[idx]) : null;
    const cloud = h.cloud_cover?.[idx] != null ? Number(h.cloud_cover[idx]) : null;
    const freeze = h.freezing_level_height?.[idx] != null ? Number(h.freezing_level_height[idx]) : null;
    const cape = h.cape?.[idx] != null ? Number(h.cape[idx]) : null;

    const pressureLevels: { hpa: string; alt: number; speed?: number; dir?: number; gust?: number }[] = [
      { hpa: "10m", alt: siteAlt + 10, speed: h.wind_speed_10m?.[idx], dir: h.wind_direction_10m?.[idx], gust: h.wind_gusts_10m?.[idx] },
      { hpa: "80m", alt: siteAlt + 70, speed: h.wind_speed_80m?.[idx], dir: h.wind_direction_80m?.[idx] },
      { hpa: "120m", alt: siteAlt + 110, speed: h.wind_speed_120m?.[idx], dir: h.wind_direction_120m?.[idx] },
      { hpa: "180m", alt: siteAlt + 170, speed: h.wind_speed_180m?.[idx], dir: h.wind_direction_180m?.[idx] },
      { hpa: "925hPa", alt: 760, speed: h.wind_speed_925hPa?.[idx], dir: h.wind_direction_925hPa?.[idx] },
      { hpa: "850hPa", alt: 1450, speed: h.wind_speed_850hPa?.[idx], dir: h.wind_direction_850hPa?.[idx] },
      { hpa: "700hPa", alt: 3000, speed: h.wind_speed_700hPa?.[idx], dir: h.wind_direction_700hPa?.[idx] },
      { hpa: "600hPa", alt: 4200, speed: h.wind_speed_600hPa?.[idx], dir: h.wind_direction_600hPa?.[idx] },
      { hpa: "500hPa", alt: 5500, speed: h.wind_speed_500hPa?.[idx], dir: h.wind_direction_500hPa?.[idx] },
    ];

    const realLevels: WindLevel[] = pressureLevels
      .filter((l) => {
        // Usa != null per distinguere 0 (valore valido) da undefined/null (dato mancante)
        const s = l.speed;
        const d = l.dir;
        return s != null && !isNaN(Number(s)) && d != null && !isNaN(Number(d)) && Number(s) >= 0 && Number(d) >= 0;
      })
      .map((l) => ({
        hpa: l.hpa,
        alt: l.alt,
        speed: Number(l.speed),
        dir: Number(l.dir),
        gust: l.gust != null ? Number(l.gust) : undefined,
      }))
      .sort((a, b) => a.alt - b.alt);

    const maxRealAltitude = realLevels.length > 0
      ? Math.max(...realLevels.map((l) => l.alt))
      : siteAlt;

    // Spread: differenza reale T-Td, senza minimi artificiali
    const spread = dew != null ? t - dew : 0;
    const cloudBase = dew != null ? calcCloudBase(siteAlt, t, dew) : null;

    hourDataMap.set(targetHour, {
      hour: targetHour,
      temp: t,
      dew,
      cloud,
      freeze: freeze != null ? Math.round(freeze) : null,
      cape,
      levels: realLevels,
      cloudBase,
      maxRealAltitude,
    });
  });

  return hourDataMap;
}

export function useMultiHourWindProfile({
  lat, lon, siteAlt, selectedDay, fallbackData, rawData
}: UseMultiHourWindProfileProps) {
  const [data, setData] = useState<Map<number, HourWindData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);

    // Se i dati grezzi sono già disponibili (condivisi da useWeatherData), usiamo quelli
    if (rawData && rawData.hourly && rawData.hourly.time) {
      const result = processRawJson(rawData, siteAlt, selectedDay);
      const rawLevelCount = Array.from(result.values()).reduce((sum, hour) => sum + hour.levels.length, 0);
      // Se il payload condiviso contiene solo vento al suolo, confrontalo con il profilo normalizzato:
      // preferiamo il set più completo, senza generare livelli o direzioni sintetiche.
      if (rawLevelCount > 0 && (!fallbackData || fallbackData.length === 0)) {
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
        return;
      }
      if (rawLevelCount > 0 && fallbackData && fallbackData.length > 0) {
        const fallbackResult = buildFromFallback(fallbackData, siteAlt, selectedDay);
        const fallbackLevelCount = Array.from(fallbackResult.values()).reduce((sum, hour) => sum + hour.levels.length, 0);
        const preferredResult = fallbackLevelCount > rawLevelCount ? fallbackResult : result;
        if (mountedRef.current) {
          setData(preferredResult);
          setLoading(false);
        }
        return;
      }
      // Nessun vento utilizzabile nel payload: prova i dati orari normalizzati.
    }

    // Fallback: usa i dati orari già disponibili (con matching basato sulla data completa)
    if (fallbackData && fallbackData.length > 0) {
      const result = buildFromFallback(fallbackData, siteAlt, selectedDay);
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
      return;
    }

    // Il profilo non è disponibile: lascia le celle vuote, senza simulare il vento.

    // Altrimenti fetchiamo (ultima spiaggia)
    (async () => {
      try {
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + selectedDay);
        const dayStr = targetDate.toISOString().split("T")[0];

        const windParams = [
          "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
          "wind_speed_80m", "wind_direction_80m",
          "wind_speed_120m", "wind_direction_120m",
          "wind_speed_180m", "wind_direction_180m",
          "wind_speed_925hPa", "wind_direction_925hPa",
          "wind_speed_850hPa", "wind_direction_850hPa",
          "wind_speed_700hPa", "wind_direction_700hPa",
          "wind_speed_600hPa", "wind_direction_600hPa",
          "wind_speed_500hPa", "wind_direction_500hPa",
          "temperature_2m", "temperature_80m", "temperature_120m",
          "dew_point_2m", "cloud_cover", "precipitation",
          "freezing_level_height", "cape", "lifted_index",
          "convective_inhibition",
        ].join(",");

        const json = await fetchHourly(lat, lon, windParams, dayStr, dayStr);
        const result = processRawJson(json, siteAlt, selectedDay);
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "Errore caricamento profilo vento");
          setLoading(false);
        }
      }
    })();

    return () => { mountedRef.current = false; };
  }, [lat, lon, siteAlt, selectedDay, fallbackData, rawData]);

  const interpolateAtAltitude = useCallback((hour: number, targetAlt: number) => {
    const hourData = dataRef.current.get(hour);
    return interpolateWindAtAltitude(hourData?.levels, targetAlt);
  }, []);

  return { data, loading, error, interpolateAtAltitude };
}
