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
    // NOTA: Open-Meteo non ha temperature_80m/120m separati, usa 2m, 180m e livelli hPa
    const tempFields = [
      "temperature_2m",
      "temperature_180m",
      "temperature_925hPa",
      "temperature_850hPa",
      "temperature_700hPa",
      "temperature_600hPa",
      "temperature_500hPa",
      "dew_point_2m",
      "cloud_cover",
      "precipitation",
      "cape",
      "lifted_index",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_speed_180m",
      "wind_direction_180m",
    ].join(",");

    fetchHourly(lat, lon, tempFields, dayStr, dayStr)
          .then((j) => {
            if (!mounted) return;
            // DEBUG: log available fields
            if (j.hourly) {
              const fields = Object.keys(j.hourly).filter(k => k.startsWith('temperature'));
              console.log('useStabilitaMasseAria fields:', fields);
              // Log first few values for key fields
              console.log('useStabilitaMasseAria samples:');
              console.log('  temperature_2m[0-2]:', j.hourly.temperature_2m?.slice(0,3));
              console.log('  temperature_180m[0-2]:', j.hourly.temperature_180m?.slice(0,3));
              console.log('  temperature_925hPa[0-2]:', j.hourly.temperature_925hPa?.slice(0,3));
              console.log('  temperature_850hPa[0-2]:', j.hourly.temperature_850hPa?.slice(0,3));
            }
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