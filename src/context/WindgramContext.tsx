"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface WindLevel {
  hpa: string;
  alt: number;
  speed: number;
  dir: number;
}

interface HourWindData {
  hour: number;
  temp: number;
  dew: number;
  cloud: number;
  freeze: number;
  cape: number;
  levels: WindLevel[];
  cloudBase: number;
  maxRealAltitude: number;
}

interface WindgramContextType {
  windData: Map<number, HourWindData> | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refreshWindData: (lat: number, lon: number, altitude: number, selectedDay: number) => Promise<void>;
}

const WindgramContext = createContext<WindgramContextType | null>(null);

export function WindgramProvider({ children }: { children: ReactNode }) {
  const [windData, setWindData] = useState<Map<number, HourWindData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchWindData = async (lat: number, lon: number, altitude: number, selectedDay: number) => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + selectedDay);
      const dayStr = targetDate.toISOString().split("T")[0];

      const hourlyParams = [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "precipitation",
        "cloud_cover",
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "wind_speed_80m",
        "wind_direction_80m",
        "wind_speed_120m",
        "wind_direction_120m",
        "wind_speed_180m",
        "wind_direction_180m",
        "wind_speed_925hPa",
        "wind_direction_925hPa",
        "wind_speed_850hPa",
        "wind_direction_850hPa",
        "wind_speed_700hPa",
        "wind_direction_700hPa",
        "wind_speed_600hPa",
        "wind_direction_600hPa",
        "wind_speed_500hPa",
        "wind_direction_500hPa",
        "temperature_80m",
        "temperature_120m",
        "surface_pressure",
        "shortwave_radiation",
        "freezing_level_height",
        "cape",
        "lifted_index",
        "convective_inhibition",
      ].join(",");

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourlyParams}&timezone=Europe/Rome&start_date=${dayStr}&end_date=${dayStr}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const times: string[] = json.hourly.time;
      const h = json.hourly;

      const hourDataMap = new Map<number, HourWindData>();
      const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

      HOURS.forEach((targetHour) => {
        const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
        if (idx === -1) return;

        const t = h.temperature_2m[idx] ?? 15;
        const dew = h.dew_point_2m?.[idx] ?? (t - 8);
        const cloud = h.cloud_cover?.[idx] ?? 30;
        const freeze = h.freezing_level_height?.[idx] ?? (altitude + (t / 0.0098) * 100);
        const cape = h.cape?.[idx] ?? 0;

        const pressureLevels = [
          { hpa: "10m", alt: altitude, speed: h.wind_speed_10m[idx], dir: h.wind_direction_10m[idx], gust: h.wind_gusts_10m[idx] },
          { hpa: "80m", alt: altitude + 80, speed: h.wind_speed_80m[idx], dir: h.wind_direction_80m[idx] },
          { hpa: "120m", alt: altitude + 120, speed: h.wind_speed_120m[idx], dir: h.wind_direction_120m[idx] },
          { hpa: "180m", alt: altitude + 180, speed: h.wind_speed_180m[idx], dir: h.wind_direction_180m[idx] },
          { hpa: "925hPa", alt: 760, speed: h.wind_speed_925hPa[idx], dir: h.wind_direction_925hPa[idx] },
          { hpa: "850hPa", alt: 1450, speed: h.wind_speed_850hPa[idx], dir: h.wind_direction_850hPa[idx] },
          { hpa: "700hPa", alt: 3100, speed: h.wind_speed_700hPa[idx], dir: h.wind_direction_700hPa[idx] },
          { hpa: "600hPa", alt: 4400, speed: h.wind_speed_600hPa[idx], dir: h.wind_direction_600hPa[idx] },
          { hpa: "500hPa", alt: 5800, speed: h.wind_speed_500hPa[idx], dir: h.wind_direction_500hPa[idx] },
        ];

        const realLevels = pressureLevels.filter(l => 
          l.speed != null && !isNaN(l.speed) && l.dir != null && !isNaN(l.dir)
        );

        const maxRealAltitude = realLevels.length > 0 
          ? Math.max(...realLevels.map(l => l.alt)) 
          : altitude;

        const spread = Math.max(1, t - dew);
        const cloudBase = Math.round(altitude + spread * 125);

        hourDataMap.set(targetHour, {
          hour: targetHour,
          temp: t,
          dew: dew,
          cloud: cloud,
          freeze: Math.round(freeze),
          cape: cape,
          levels: realLevels,
          cloudBase,
          maxRealAltitude,
        });
      });

      setWindData(hourDataMap);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore caricamento profilo vento");
    } finally {
      setLoading(false);
    }
  };

  const refreshWindData = async (lat: number, lon: number, altitude: number, selectedDay: number) => {
    await fetchWindData(lat, lon, altitude, selectedDay);
  };

  return (
    <WindgramContext.Provider value={{ windData, loading, error, lastUpdate, refreshWindData }}>
      {children}
    </WindgramContext.Provider>
  );
}

export function useWindgramContext() {
  const context = useContext(WindgramContext);
  if (!context) {
    throw new Error("useWindgramContext must be used within a WindgramProvider");
  }
  return context;
}