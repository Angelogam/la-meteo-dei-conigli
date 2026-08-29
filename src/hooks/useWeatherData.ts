import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { fetchPrevisioniGiornaliere } from "@/services/openMeteoService";
import { DECOLLI } from "@/data/decolli";

export function useWeatherData() {
  const [selectedId, setSelectedId] = useState(DECOLLI[0].id);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [site, setSite] = useState<any>(null);
  const [dayData, setDayData] = useState<any[]>([]);
  const [allHourlyData, setAllHourlyData] = useState<Record<number, any[]>>({});
  const [activeModel, setActiveModel] = useState("Open-Meteo Best Match");
  const [currentCape, setCurrentCape] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [activeTab, setActiveTab] = useState("meteo");
  const [countdown, setCountdown] = useState(900);
  const loadingRef = useRef(false);
  const lastFetchRef = useRef<string>("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(false);

  const loadWeather = useCallback(async (id?: string, force = false) => {
    const targetId = id ?? selectedId;
    if (!targetId) return;
    if (loadingRef.current) return;

    const cacheKey = `${targetId}_${new Date().toDateString()}`;
    if (!force && lastFetchRef.current === cacheKey && dayData.length > 0) {
      return;
    }

    loadingRef.current = true;
    if (dayData.length > 0) {
      setUpdating(true);
    } else {
      setLoading(true);
    }

    try {
      const decollo = DECOLLI.find((d) => d.id === targetId) ?? DECOLLI[0];
      setSite(decollo);

      const data = await fetchPrevisioniGiornaliere(
        decollo.lat,
        decollo.lon,
        decollo.elevation_m
      );

      if (data && data.hourly) {
        const times: string[] = data.hourly.time || [];
        const hourlyData = times.map((t, i) => ({
          time: t,
          temperature: data.hourly.temperature_2m?.[i],
          humidity: data.hourly.relative_humidity_2m?.[i],
          dewPoint: data.hourly.dew_point_2m?.[i],
          cloudCover: data.hourly.cloud_cover?.[i],
          precipitation: data.hourly.precipitation?.[i],
          windSpeed10m: data.hourly.wind_speed_10m?.[i],
          windDirection10m: data.hourly.wind_direction_10m?.[i],
          windSpeed80m: data.hourly.wind_speed_80m?.[i],
          windDirection80m: data.hourly.wind_direction_80m?.[i],
          windGusts10m: data.hourly.wind_gusts_10m?.[i],
          pressure: data.hourly.surface_pressure?.[i],
          cape: data.hourly.cape?.[i],
          liftedIndex: data.hourly.lifted_index?.[i],
          cin: data.hourly.convective_inhibition?.[i],
          freezingLevel: data.hourly.freezing_level_height?.[i],
          shortwaveRadiation: data.hourly.shortwave_radiation?.[i],
        }));

        setAllHourlyData({ 0: hourlyData });

        const oggi = new Date();
        const todayKey = `${oggi.getFullYear()}-${oggi.getMonth()}-${oggi.getDate()}`;
        const filtered = hourlyData.filter((h) => {
          const d = new Date(h.time);
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          return key === todayKey;
        });
        setDayData(filtered.length > 0 ? filtered : hourlyData.slice(0, 24));
        setLastUpdate(new Date());
        lastFetchRef.current = cacheKey;
        setCountdown(900);
      }
    } catch (err) {
      console.error("[useWeatherData] fetch error:", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setUpdating(false);
    }
  }, [selectedId, dayData.length]);

  // Auto-load on mount
  useEffect(() => {
    mountedRef.current = true;
    loadWeather();
  }, []);

  // Also load when selectedId changes
  useEffect(() => {
    if (mountedRef.current) {
      loadWeather();
    }
  }, [selectedId]);

  // Countdown timer
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 900));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Reset countdown when lastUpdate changes
  useEffect(() => {
    if (lastUpdate) setCountdown(900);
  }, [lastUpdate]);

  const currentData = useMemo(() => {
    if (!dayData.length) return null;
    const now = new Date();
    const currentHour = now.getHours();
    return dayData.find((h) => {
      const d = new Date(h.time);
      return d.getHours() === currentHour;
    }) ?? dayData[Math.min(currentHour, dayData.length - 1)];
  }, [dayData]);

  const thermalDelta = useMemo(() => {
    if (!dayData.length) return 0;
    const temps = dayData
      .map((h) => h.temperature)
      .filter((t): t is number => typeof t === "number" && !isNaN(t));
    if (temps.length < 2) return 0;
    return Math.max(...temps) - Math.min(...temps);
  }, [dayData]);

  const enrichedDaily = useMemo(() => {
    if (!Object.keys(allHourlyData).length) return [];
    const allData = Object.values(allHourlyData).flat();
    if (!allData.length) return [];

    const byDay = new Map<string, any[]>();
    allData.forEach((h) => {
      const d = new Date(h.time);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(h);
    });

    return Array.from(byDay.entries()).slice(0, 5).map(([key, hours]) => {
      const temps = hours.map((h) => h.temperature).filter((t): t is number => typeof t === "number");
      const winds = hours.map((h) => h.windSpeed10m).filter((w): w is number => typeof w === "number");
      const rains = hours.map((h) => h.precipitation).filter((r): r is number => typeof r === "number");
      return {
        key,
        date: hours[0]?.time,
        tempMax: temps.length ? Math.max(...temps) : null,
        tempMin: temps.length ? Math.min(...temps) : null,
        windMax: winds.length ? Math.max(...winds) : null,
        rainSum: rains.length ? rains.reduce((a, b) => a + b, 0) : 0,
        hours,
      };
    });
  }, [allHourlyData]);

  const dateLabels = useMemo(() => {
    const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    return enrichedDaily.map((d) => {
      const dt = new Date(d.date);
      return `${giorni[dt.getDay()]} ${dt.getDate()}`;
    });
  }, [enrichedDaily]);

  return {
    selectedId,
    setSelectedId,
    loading,
    updating,
    lastUpdate,
    countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather: (id?: string) => loadWeather(id, true),
    activeModel,
    currentCape,
    allHourlyData,
    selectedDay,
    setSelectedDay,
    selectedHour,
    setSelectedHour,
    activeTab,
    setActiveTab,
  };
}