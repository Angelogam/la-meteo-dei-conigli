"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchHourly } from "@/lib/openMeteoClient";

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
  dew: number;
  cloud: number;
  freeze: number;
  cape: number;
  levels: WindLevel[];
  cloudBase: number;
  maxRealAltitude: number;
}

const DEFAULT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

// Mappa hPa -> quota standard ISA
const HPA_ALT_MAP: Record<string, number> = {
  "10m": 0,
  "80m": 80,
  "120m": 120,
  "180m": 180,
  "925hPa": 760,
  "850hPa": 1450,
  "700hPa": 3000,
  "600hPa": 4200,
  "500hPa": 5500,
};

function interpolateWindAtAltitude(
  levels: WindLevel[] | undefined,
  targetAlt: number
): { speed: number; dir: number } | null {
  if (!levels || levels.length === 0) return null;
  if (levels.length === 1) {
    return { speed: Math.round(levels[0].speed), dir: Math.round(levels[0].dir) };
  }

  const sorted = [...levels].sort((a, b) => a.alt - b.alt);

  if (targetAlt <= sorted[0].alt) {
    return { speed: Math.round(sorted[0].speed), dir: Math.round(sorted[0].dir) };
  }
  if (targetAlt >= sorted[sorted.length - 1].alt) {
    return null;
  }

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
  return { speed: Math.round(sorted[0].speed), dir: Math.round(sorted[0].dir) };
}

interface UseMultiHourWindProfileProps {
  lat: number;
  lon: number;
  siteAlt: number;
  selectedDay: number;
}

export function useMultiHourWindProfile({
  lat, lon, siteAlt, selectedDay
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

    const fetchAllHours = async () => {
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
        const times: string[] = json.hourly.time;
        const h = json.hourly;

        const hourDataMap = new Map<number, HourWindData>();

        DEFAULT_HOURS.forEach((targetHour) => {
          const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
          if (idx === -1) return;

          const t = Number(h.temperature_2m[idx]) ?? 15;
          const dew = Number(h.dew_point_2m?.[idx]) ?? (t - 8);
          const cloud = Number(h.cloud_cover?.[idx]) ?? 30;
          const freeze = Number(h.freezing_level_height?.[idx]) ?? (siteAlt + (t / 0.0098) * 100);
          const cape = Number(h.cape?.[idx]) ?? 0;

          const pressureLevels: { hpa: string; alt: number; speed?: number; dir?: number; gust?: number }[] = [
            { hpa: "10m", alt: siteAlt, speed: h.wind_speed_10m[idx], dir: h.wind_direction_10m[idx], gust: h.wind_gusts_10m[idx] },
            { hpa: "80m", alt: siteAlt + 70, speed: h.wind_speed_80m[idx], dir: h.wind_direction_80m[idx] },
            { hpa: "120m", alt: siteAlt + 110, speed: h.wind_speed_120m[idx], dir: h.wind_direction_120m[idx] },
            { hpa: "180m", alt: siteAlt + 170, speed: h.wind_speed_180m[idx], dir: h.wind_direction_180m[idx] },
            { hpa: "925hPa", alt: 760, speed: h.wind_speed_925hPa[idx], dir: h.wind_direction_925hPa[idx] },
            { hpa: "850hPa", alt: 1450, speed: h.wind_speed_850hPa[idx], dir: h.wind_direction_850hPa[idx] },
            { hpa: "700hPa", alt: 3000, speed: h.wind_speed_700hPa[idx], dir: h.wind_direction_700hPa[idx] },
            { hpa: "600hPa", alt: 4200, speed: h.wind_speed_600hPa[idx], dir: h.wind_direction_600hPa[idx] },
            { hpa: "500hPa", alt: 5500, speed: h.wind_speed_500hPa[idx], dir: h.wind_direction_500hPa[idx] },
          ];

          const realLevels: WindLevel[] = pressureLevels
            .filter((l) => l.speed != null && !isNaN(l.speed) && l.dir != null && !isNaN(l.dir))
            .map((l) => ({ hpa: l.hpa, alt: l.alt, speed: Number(l.speed), dir: Number(l.dir), gust: l.gust ? Number(l.gust) : undefined }));

          const maxRealAltitude = realLevels.length > 0
            ? Math.max(...realLevels.map((l) => l.alt))
            : siteAlt;

          const spread = Math.max(1, t - dew);
          const cloudBase = Math.round(siteAlt + spread * 125);

          hourDataMap.set(targetHour, {
            hour: targetHour,
            temp: t,
            dew,
            cloud,
            freeze: Math.round(freeze),
            cape,
            levels: realLevels,
            cloudBase,
            maxRealAltitude,
          });
        });

        if (mountedRef.current) {
          setData(hourDataMap);
          setLoading(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "Errore caricamento profilo vento multi-ora");
          setLoading(false);
        }
      }
    };

    fetchAllHours();
    return () => { mountedRef.current = false; };
  }, [lat, lon, siteAlt, selectedDay]);

  const interpolateAtAltitude = useCallback((hour: number, targetAlt: number) => {
    const hourData = dataRef.current.get(hour);
    return interpolateWindAtAltitude(hourData?.levels, targetAlt);
  }, []);

  return { data, loading, error, interpolateAtAltitude };
}
