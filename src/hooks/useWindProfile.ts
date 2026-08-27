"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

interface WindLevel {
  hpa: string;
  alt: number;
  speed: number;
  dir: number;
  gust?: number;
}

interface WindProfileData {
  hour: number;
  temp: number;
  dew: number;
  cloud: number;
  freeze: number;
  cape: number;
  levels: WindLevel[];
  cloudBase: number;
}

interface UseWindProfileProps {
  lat: number;
  lon: number;
  siteAlt: number;
  selectedHour: number;
}

export function useWindProfile({ lat, lon, siteAlt, selectedHour }: UseWindProfileProps) {
  const [data, setData] = useState<WindProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchWindProfile = async () => {
      try {
        // Stessi parametri di ProfiloVentoVerticale - dati REALI Open-Meteo
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,wind_speed_925hPa,wind_direction_925hPa,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_600hPa,wind_direction_600hPa,wind_speed_500hPa,wind_direction_500hPa,temperature_2m,temperature_80m,temperature_120m,cloud_cover,precipitation,freezing_level_height,cape,lifted_index,convective_inhibition&timezone=Europe/Rome&forecast_days=2`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (mounted) {
          const times: string[] = json.hourly.time;
          const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === selectedHour);
          
          if (idx === -1) {
            setError("Ora non trovata nei dati");
            setLoading(false);
            return;
          }

          const h = json.hourly;
          const t = h.temperature_2m[idx] ?? 15;
          const dew = h.dew_point_2m?.[idx] ?? (t - 8);
          const cloud = h.cloud_cover?.[idx] ?? 30;
          const freeze = h.freezing_level_height?.[idx] ?? (siteAlt + (t / 0.0098) * 100);
          const cape = h.cape?.[idx] ?? 0;

          // Stessi livelli di ProfiloVentoVerticale - DATI REALI
          const levels: WindLevel[] = [
            { hpa: "surface", alt: siteAlt, speed: h.wind_speed_10m[idx], dir: h.wind_direction_10m[idx], gust: h.wind_gusts_10m[idx] },
            { hpa: "80m", alt: siteAlt + 80, speed: h.wind_speed_80m[idx], dir: h.wind_direction_80m[idx] },
            { hpa: "120m", alt: siteAlt + 120, speed: h.wind_speed_120m[idx], dir: h.wind_direction_120m[idx] },
            { hpa: "180m", alt: siteAlt + 180, speed: h.wind_speed_180m[idx], dir: h.wind_direction_180m[idx] },
            { hpa: "925hPa", alt: 760, speed: h.wind_speed_925hPa[idx], dir: h.wind_direction_925hPa[idx] },
            { hpa: "850hPa", alt: 1450, speed: h.wind_speed_850hPa[idx], dir: h.wind_direction_850hPa[idx] },
            { hpa: "700hPa", alt: 3100, speed: h.wind_speed_700hPa[idx], dir: h.wind_direction_700hPa[idx] },
            { hpa: "600hPa", alt: 4400, speed: h.wind_speed_600hPa[idx], dir: h.wind_direction_600hPa[idx] },
            { hpa: "500hPa", alt: 5800, speed: h.wind_speed_500hPa[idx], dir: h.wind_direction_500hPa[idx] },
          ].filter(l => l.speed != null && !isNaN(l.speed) && l.dir != null && !isNaN(l.dir));

          const spread = Math.max(1, t - dew);
          const cloudBase = Math.round(siteAlt + spread * 125);

          setData({
            hour: selectedHour,
            temp: t,
            dew: dew,
            cloud: cloud,
            freeze: Math.round(freeze),
            cape: cape,
            levels,
            cloudBase,
          });
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Errore caricamento profilo vento");
          setLoading(false);
        }
      }
    };

    fetchWindProfile();
    return () => { mounted = false; };
  }, [lat, lon, siteAlt, selectedHour]);

  // Funzione di interpolazione lineare tra livelli reali (stessa logica di WindgramMatrix)
  const interpolateAtAltitude = useCallback((targetAlt: number) => {
    if (!data?.levels || data.levels.length === 0) return null;
    if (data.levels.length === 1) {
      return { speed: Math.round(data.levels[0].speed), dir: Math.round(data.levels[0].dir) };
    }

    const sorted = [...data.levels].sort((a, b) => a.alt - b.alt);

    if (targetAlt <= sorted[0].alt) {
      return { speed: Math.round(sorted[0].speed), dir: Math.round(sorted[0].dir) };
    }
    if (targetAlt >= sorted[sorted.length - 1].alt) {
      const top = sorted[sorted.length - 1];
      return { speed: Math.round(top.speed), dir: Math.round(top.dir) };
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
  }, [data]);

  return { data, loading, error, interpolateAtAltitude };
}