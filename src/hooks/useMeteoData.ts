"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchMeteo, fetchWindProfiles, filterFlightHours, enrDaily, calcThermal } from "@/utils/meteo";
import { generaAnalisiReale } from "@/utils/analisi";
import { generateAiAnalysis } from "@/utils/meteoAI";
import { generaTermicheOrarie } from "@/utils/termiche";
import { DECOLLI, type Decollo } from "@/data/decolli";
import type { MeteoData, HourData, AiAnalysis, WindProfile } from "@/types/meteo";
import type { TermicheData } from "@/utils/termiche";

interface DecolloMeteo {
  site: Decollo;
  data: MeteoData | null;
  loading: boolean;
  error: string | null;
  windProfiles: WindProfile[];
  windProfilesLoading: boolean;
}

interface GiornoPrevisione {
  giorno: number;
  label: string;
  data: MeteoData | null;
  loading: boolean;
  error: string | null;
}

const nomiGiorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

function generaGiorniPrevisioni(): GiornoPrevisione[] {
  const giorni: GiornoPrevisione[] = [];
  for (let g = 1; g <= 5; g++) {
    const data = new Date();
    data.setDate(data.getDate() + g);
    const nomeGiorno = nomiGiorni[data.getDay()];
    const label = `${nomeGiorno} ${data.getDate()} ${data.toLocaleDateString("it-IT", { month: "short" })}`;
    giorni.push({ giorno: g, label, data: null, loading: false, error: null });
  }
  return giorni;
}

export function useRealTimeHour(): number {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const tick = () => setH(new Date().getHours());
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);
  return h;
}

export function useMeteoData(siteId: string, dayIdx: number, hour: number) {
  const [decolliMeteo, setDecolliMeteo] = useState<Record<string, DecolloMeteo>>(() => {
    const map: Record<string, DecolloMeteo> = {};
    for (const site of DECOLLI) {
      map[site.id] = { site, data: null, loading: true, error: null, windProfiles: [], windProfilesLoading: false };
    }
    return map;
  });
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [giorniPrevisioni, setGiorniPrevisioni] = useState<GiornoPrevisione[]>(generaGiorniPrevisioni);

  const fetchGiorno = useCallback(async (giorno: number) => {
    setGiorniPrevisioni((prev) =>
      prev.map((g) => (g.giorno === giorno ? { ...g, loading: true, error: null } : g))
    );

    const site = DECOLLI.find((s) => s.id === siteId) || DECOLLI[0];
    try {
      const data = await fetchMeteo(site.lat, site.lon);
      setGiorniPrevisioni((prev) =>
        prev.map((g) => (g.giorno === giorno ? { ...g, data, loading: false } : g))
      );
    } catch {
      setGiorniPrevisioni((prev) =>
        prev.map((g) =>
          g.giorno === giorno ? { ...g, loading: false, error: "Errore caricamento" } : g
        )
      );
    }
  }, [siteId]);

  const fetchAllDecolli = useCallback(async () => {
    const results = await Promise.allSettled(
      DECOLLI.map(async (site) => {
        const data = await fetchMeteo(site.lat, site.lon);
        return { id: site.id, data };
      })
    );

    setDecolliMeteo((prev) => {
      const next = { ...prev };
      for (const result of results) {
        if (result.status === "fulfilled") {
          next[result.value.id] = {
            ...next[result.value.id],
            data: result.value.data,
            loading: false,
            error: null,
          };
        } else {
          const failedId = DECOLLI.find((s) =>
            result.reason?.message?.includes(s.id)
          )?.id;
          if (failedId) {
            next[failedId] = {
              ...next[failedId],
              loading: false,
              error: result.reason?.message || "Errore sconosciuto",
            };
          }
        }
      }
      return next;
    });
    setGlobalLoading(false);
    setGlobalError(null);
  }, []);

  useEffect(() => {
    fetchAllDecolli();
    const interval = setInterval(fetchAllDecolli, 60000);
    return () => clearInterval(interval);
  }, [fetchAllDecolli]);

  const selectedDecollo = decolliMeteo[siteId];
  const meteoData = selectedDecollo?.data;
  const hourlyRaw = meteoData?.hourly || [];
  const daily = meteoData?.daily || [];

  const hourly = useMemo(() => filterFlightHours(hourlyRaw), [hourlyRaw]);

  const weatherMap = useMemo(() => {
    const map: Record<string, HourData> = {};
    for (const [id, dm] of Object.entries(decolliMeteo)) {
      if (dm?.data?.hourly) {
        const hh = dm.data.hourly.find((h) => {
          const hhh = h.time.getHours();
          return hhh >= 9 && hhh <= 19 && hhh === hour;
        });
        if (hh) map[id] = hh;
      }
    }
    return map;
  }, [decolliMeteo, hour]);

  const enrichedDaily = useMemo(() => enrDaily(daily, hourly), [daily, hourly]);

  const dateLabels = useMemo(() => {
    return daily.map((d) =>
      d.date.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    );
  }, [daily]);

  const dateLabelsObj = useMemo(() => {
    return daily.map((d, i) => ({
      value: i,
      label: dateLabels[i],
    }));
  }, [daily, dateLabels]);

  const currentSite = useMemo(
    () => DECOLLI.find((s) => s.id === siteId) || DECOLLI[0],
    [siteId]
  );

  const getDayData = useCallback(
    (idx: number): HourData[] => {
      if (!hourly.length) return [];
      const targetDate = daily[idx]?.date;
      if (!targetDate) return [];
      return hourly.filter((h) => {
        const hd = h.time;
        return (
          hd.getDate() === targetDate.getDate() &&
          hd.getMonth() === targetDate.getMonth() &&
          hd.getFullYear() === targetDate.getFullYear()
        );
      });
    },
    [hourly, daily]
  );

  const dayData = useMemo(() => getDayData(dayIdx), [getDayData, dayIdx]);

  const currentHourData = useMemo(() => {
    const found = hourly.find((h) => h.time.getHours() === hour);
    return found || hourly[0];
  }, [hourly, hour]);

  const thermalAI = useMemo(() => {
    if (!dayData.length) return null;
    return calcThermal(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const aiData = useMemo(() => {
    if (!dayData.length) return null;
    return generaAnalisiReale(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const aiMeteoAnalysis = useMemo(() => {
    return generateAiAnalysis(dayData, dayIdx);
  }, [dayData, dayIdx]);

  const termicheHourly = useMemo(() => {
    if (!dayData.length) return [];
    return generaTermicheOrarie(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const previsioneSelezionata = giorniPrevisioni.find((g) => g.giorno === dayIdx);
  const previsioneData = previsioneSelezionata?.data;
  const previsioneDailyArr = previsioneData?.daily || [];
  const previsioneHourlyRawArr = previsioneData?.hourly || [];
  const previsioneHourly = useMemo(() => filterFlightHours(previsioneHourlyRawArr), [previsioneHourlyRawArr]);

  const previsioneDayData = useMemo(() => {
    if (!previsioneHourly.length) return [];
    const targetDate = previsioneDailyArr[dayIdx]?.date;
    if (!targetDate) return previsioneHourly;
    return previsioneHourly.filter((h) => {
      const hd = h.time;
      return (
        hd.getDate() === targetDate.getDate() &&
        hd.getMonth() === targetDate.getMonth() &&
        hd.getFullYear() === targetDate.getFullYear()
      );
    });
  }, [previsioneHourly, previsioneDailyArr, dayIdx]);

  const previsioneEnriched = useMemo(() => enrDaily(previsioneDailyArr, previsioneHourly), [previsioneDailyArr, previsioneHourly]);

  return {
    globalLoading,
    globalError,
    weatherMap,
    enrichedDaily,
    dateLabels,
    dateLabelsObj,
    dayData,
    currentHourData,
    currentSite,
    thermalAI,
    aiData,
    aiMeteoAnalysis,
    termicheHourly,
    previsioneSelezionata,
    previsioneDayData,
    previsioneEnriched,
    fetchGiorno,
    fetchAllDecolli: fetchAllDecolli,
  };
}