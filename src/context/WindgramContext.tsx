"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

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

const HOURS_DISPLAY = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export function WindgramProvider({ children }: { children: ReactNode }) {
  const [windData, setWindData] = useState<Map<number, HourWindData> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refreshWindData = useCallback(async (lat: number, lon: number, altitude: number, selectedDay: number) => {
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + (selectedDay || 0));
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const times: string[] = json.hourly?.time || [];
      const h = json.hourly;

      if (times.length === 0) {
        throw new Error("Nessun dato orario ricevuto");
      }

      const hourDataMap = new Map<number, HourWindData>();

      HOURS_DISPLAY.forEach((targetHour) => {
        const idx = times.findIndex((t) => {
          const parts = t.split("T");
          if (parts.length < 2) return false;
          return parseInt(parts[1].split(":")[0], 10) === targetHour;
        });
        if (idx === -1) return;

        const t = h.temperature_2m?.[idx] ?? 15;
        const dew = h.dew_point_2m?.[idx] ?? (t - 8);
        const cloud = h.cloud_cover?.[idx] ?? 30;
        const freeze = h.freezing_level_height?.[idx] ?? (altitude + (t / 0.0098) * 100);
        const cape = h.cape?.[idx] ?? 0;

        const pressureLevels: WindLevel[] = [];

        const addLevel = (hpa: string, alt: number, speed: any, dir: any) => {
          if (speed != null && dir != null && !isNaN(Number(speed)) && !isNaN(Number(dir))) {
            pressureLevels.push({
              hpa,
              alt,
              speed: Number(speed),
              dir: Number(dir),
            });
          }
        };

        addLevel("10m", altitude, h.wind_speed_10m?.[idx], h.wind_direction_10m?.[idx]);
        addLevel("80m", altitude + 80, h.wind_speed_80m?.[idx], h.wind_direction_80m?.[idx]);
        addLevel("120m", altitude + 120, h.wind_speed_120m?.[idx], h.wind_direction_120m?.[idx]);
        addLevel("180m", altitude + 180, h.wind_speed_180m?.[idx], h.wind_direction_180m?.[idx]);
        addLevel("925hPa", 760, h.wind_speed_925hPa?.[idx], h.wind_direction_925hPa?.[idx]);
        addLevel("850hPa", 1450, h.wind_speed_850hPa?.[idx], h.wind_direction_850hPa?.[idx]);
        addLevel("700hPa", 3100, h.wind_speed_700hPa?.[idx], h.wind_direction_700hPa?.[idx]);
        addLevel("600hPa", 4400, h.wind_speed_600hPa?.[idx], h.wind_direction_600hPa?.[idx]);
        addLevel("500hPa", 5800, h.wind_speed_500hPa?.[idx], h.wind_direction_500hPa?.[idx]);

        const maxRealAltitude = pressureLevels.length > 0
          ? Math.max(...pressureLevels.map((l) => l.alt))
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
          levels: pressureLevels,
          cloudBase,
          maxRealAltitude,
        });
      });

      setWindData(hourDataMap);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore caricamento profilo vento");
    } finally {
      setLoading(false);
    }
  }, []);

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