"use client";

import { useState, useEffect } from "react";
import { fetchHourly } from "@/lib/openMeteoClient";

interface HourData {
  hour: number;
  temp: number;
  dew: number;
  cloud: number;
  freeze: number;
  cape: number;
  levels: any[];
  cloudBase: number;
  maxRealAltitude: number;
}

interface MasseAriaData {
  hourly: any;
  loading: boolean;
  error: string | null;
}

export function useStabilitaMasseAria(
  lat: number,
  lon: number,
  selectedDay: number
): MasseAriaData {
  const [hourly, setHourly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const today = new Date();
    const target = new Date(today);
    target.setDate(today.getDate() + selectedDay);
    const dayStr = target.toISOString().split("T")[0];

    // Temperature a tutti i livelli di pressione per il calcolo del lapse rate
    const tempFields = [
      "temperature_2m",
      "temperature_80m",
      "temperature_120m",
      "temperature_180m",
      "temperature_925hPa",
      "temperature_850hPa",
      "temperature_800hPa",
      "temperature_750hPa",
      "temperature_700hPa",
      "temperature_650hPa",
      "temperature_600hPa",
      "temperature_550hPa",
      "temperature_500hPa",
      "dew_point_2m",
      "cloud_cover",
      "precipitation",
      "cape",
      "lifted_index",
    ].join(",");

    fetchHourly(lat, lon, tempFields, dayStr, dayStr)
      .then((j) => {
        if (!mounted) return;
        setHourly(j.hourly);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Errore");
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [lat, lon, selectedDay]);

  return { hourly, loading, error };
}