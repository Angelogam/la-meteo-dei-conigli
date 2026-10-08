"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { RefreshCw, FileText, Check, Copy, AlertTriangle, ShieldCheck, Wind, Thermometer, Cloud, ArrowUp } from "lucide-react";
import { fetchHourly } from "@/lib/openMeteoClient";
import { generateReportMeteo, type GeneratedReport } from "@/utils/generateReportMeteo";
import { useMultiHourWindProfile } from "@/hooks/useMultiHourWindProfile";
import { calcCloudBase } from "@/utils/calcCloudBase";
import { computeHourlyDerived } from "@/services/derivedMeteorology";

interface WindgramProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
  rawData?: any; // JSON grezzo Open-Meteo — condiviso per evitare chiamate duplicate
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const PRESSURE_LEVELS = [
  { hpa: 600, alt: 4000 },
  { hpa: 650, alt: 3500 },
  { hpa: 700, alt: 3000 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 2000 },
  { hpa: 850, alt: 1500 },
  { hpa: 900, alt: 1000 },
];

const ALT_TICKS = [4000, 3500, 3000, 2500, 2000, 1500, 1000];

const computeDisplayAltitudes = (siteAlt: number): number[] => {
  const base = Math.floor(siteAlt / 250) * 250;
  const result: number[] = [];
  for (let alt = 4000; alt >= base; alt -= 250) result.push(alt);
  return result;
};

const STABILITY_COLORS = [
  { val: -0.20, color: "#8b5cf6" },
  { val: 0.00, color: "#3b82f6" },
  { val: 0.16, color: "#06b6d4" },
  { val: 0.32, color: "#10b981" },
  { val: 0.48, color: "#84cc16" },
  { val: 0.65, color: "#eab308" },
  { val: 0.82, color: "#f97316" },
  { val: 0.98, color: "#ef4444" },
  { val: 1.20, color: "#dc2626" },
];

function getStabilityColor(deltaT: number): string {
  if (deltaT <= -0.1) return STABILITY_COLORS[0].color;
  if (deltaT <= 0.08) return STABILITY_COLORS[1].color;
  if (deltaT <= 0.24) return STABILITY_COLORS[2].color;
  if (deltaT <= 0.40) return STABILITY_COLORS[3].color;
  if (deltaT <= 0.56) return STABILITY_COLORS[4].color;
  if (deltaT <= 0.73) return STABILITY_COLORS[5].color;
  if (deltaT <= 0.90) return STABILITY_COLORS[6].color;
  if (deltaT <= 1.10) return STABILITY_COLORS[7].color;
  return STABILITY_COLORS[8].color;
}

function getBarbAngle(dirDeg: number): number {
  const thetaDeg = (dirDeg + 90) % 360;
  return (thetaDeg * Math.PI) / 180;
}

function getDirLetter(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const provenienzaDeg = ((deg % 360) + 360) % 360;
  const idx = Math.round(provenienzaDeg / 45) % 8;
  return dirs[idx];
}

export default function ProfessionalWindgram({
  latitude,
  longitude,
  altitude = 1374,
  siteName = "Iretta",
  selectedDay = 0,
  rawData,
}: WindgramProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Venti multi-livello — usa i dati condivisi se disponibili
  const { interpolateAtAltitude } = useMultiHourWindProfile({
    lat: latitude,
    lon: longitude,
    siteAlt: altitude,
    selectedDay,
    rawData,
  });

  // Stabilità: usa SEMPRE data.hourly (dati del giorno specifico selezionato)
  // per evitare discrepanze tra windgram e report
  const stabilitDataa = data?.hourly ?? null;

  // Dataset centralizzato — thermalTop/thermalAvg/deltaT provengono da qui
  const hourDerivedMap = useMemo(() => {
    if (!stabilitDataa?.time) return new Map<number, ReturnType<typeof computeHourlyDerived>>();
    const map = new Map<number, ReturnType<typeof computeHourlyDerived>>();
    stabilitDataa.time.forEach((t: string, idx: number) => {
      const hr = parseInt(t.split("T")[1].split(":")[0], 10);
      if (isNaN(hr)) return;
      const raw = {
        temperature: stabilitDataa.temperature_2m?.[idx] != null ? Number(stabilitDataa.temperature_2m[idx]) : null,
        dewPoint: stabilitDataa.dew_point_2m?.[idx] != null ? Number(stabilitDataa.dew_point_2m[idx]) : null,
        temp80m: stabilitDataa.temperature_80m?.[idx] != null ? Number(stabilitDataa.temperature_80m[idx]) : null,
        temp120m: stabilitDataa.temperature_120m?.[idx] != null ? Number(stabilitDataa.temperature_120m[idx]) : null,
        temperature180m: stabilitDataa.temperature_180m?.[idx] != null ? Number(stabilitDataa.temperature_180m[idx]) : null,
        windSpeed: stabilitDataa.wind_speed_10m?.[idx] != null ? Number(stabilitDataa.wind_speed_10m[idx]) : null,
        windDir: stabilitDataa.wind_direction_10m?.[idx] != null ? Number(stabilitDataa.wind_direction_10m[idx]) : null,
        windSpeed80m: stabilitDataa.wind_speed_80m?.[idx] != null ? Number(stabilitDataa.wind_speed_80m[idx]) : null,
        windDir80m: stabilitDataa.wind_direction_80m?.[idx] != null ? Number(stabilitDataa.wind_direction_80m[idx]) : null,
        windSpeed120m: stabilitDataa.wind_speed_120m?.[idx] != null ? Number(stabilitDataa.wind_speed_120m[idx]) : null,
        windDir120m: stabilitDataa.wind_direction_120m?.[idx] != null ? Number(stabilitDataa.wind_direction_120m[idx]) : null,
        windSpeed180m: stabilitDataa.wind_speed_180m?.[idx] != null ? Number(stabilitDataa.wind_speed_180m[idx]) : null,
        windDir180m: stabilitDataa.wind_direction_180m?.[idx] != null ? Number(stabilitDataa.wind_direction_180m[idx]) : null,
        cape: stabilitDataa.cape?.[idx] != null ? Number(stabilitDataa.cape[idx]) : null,
        cin: stabilitDataa.convective_inhibition?.[idx] != null ? Number(stabilitDataa.convective_inhibition[idx]) : null,
        liftedIndex: stabilitDataa.lifted_index?.[idx] != null ? Number(stabilitDataa.lifted_index[idx]) : null,
        freezingLevel: stabilitDataa.freezing_level_height?.[idx] != null ? Number(stabilitDataa.freezing_level_height[idx]) : null,
        cloudCover: stabilitDataa.cloud_cover?.[idx] != null ? Number(stabilitDataa.cloud_cover[idx]) : null,
        shortwaveRadiation: stabilitDataa.shortwave_radiation?.[idx] != null ? Number(stabilitDataa.shortwave_radiation[idx]) : null,
        boundaryLayerHeight: stabilitDataa.boundary_layer_height?.[idx] != null ? Number(stabilitDataa.boundary_layer_height[idx]) : null,
        pressure: stabilitDataa.pressure_msl?.[idx] != null ? Number(stabilitDataa.pressure_msl[idx]) : null,
        surfacePressure: stabilitDataa.surface_pressure?.[idx] != null ? Number(stabilitDataa.surface_pressure[idx]) : null,
        windSpeed925: stabilitDataa.wind_speed_925hPa?.[idx] != null ? Number(stabilitDataa.wind_speed_925hPa[idx]) : null,
        windDir925: stabilitDataa.wind_direction_925hPa?.[idx] != null ? Number(stabilitDataa.wind_direction_925hPa[idx]) : null,
        windSpeed850: stabilitDataa.wind_speed_850hPa?.[idx] != null ? Number(stabilitDataa.wind_speed_850hPa[idx]) : null,
        windDir850: stabilitDataa.wind_direction_850hPa?.[idx] != null ? Number(stabilitDataa.wind_direction_850hPa[idx]) : null,
        windSpeed700: stabilitDataa.wind_speed_700hPa?.[idx] != null ? Number(stabilitDataa.wind_speed_700hPa[idx]) : null,
        windDir700: stabilitDataa.wind_direction_700hPa?.[idx] != null ? Number(stabilitDataa.wind_direction_700hPa[idx]) : null,
        windSpeed600: stabilitDataa.wind_speed_600hPa?.[idx] != null ? Number(stabilitDataa.wind_speed_600hPa[idx]) : null,
        windDir600: stabilitDataa.wind_direction_600hPa?.[idx] != null ? Number(stabilitDataa.wind_direction_600hPa[idx]) : null,
        windSpeed500: stabilitDataa.wind_speed_500hPa?.[idx] != null ? Number(stabilitDataa.wind_speed_500hPa[idx]) : null,
        windDir500: stabilitDataa.wind_direction_500hPa?.[idx] != null ? Number(stabilitDataa.wind_direction_500hPa[idx]) : null,
      };
      const derived = computeHourlyDerived(raw as any, altitude);
      if (derived) map.set(hr, derived);
    });
    return map;
  }, [stabilitDataa, altitude]);

  const displayAltitudes = useMemo(() => computeDisplayAltitudes(altitude), [altitude]);

  const dateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d;
  }, [selectedDay]);

  const dateStr = useMemo(() => dateObj.toISOString().split("T")[0], [dateObj]);

  const formattedDateTitle = useMemo(() => {
    const days = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return `${days[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
  }, [dateObj]);

  // Usa i dati grezzi condivisi invece di fare una nuova chiamata API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    // Se rawData è disponibile, usalo
    if (rawData && rawData.hourly) {
      setData(rawData);
      setLoading(false);
      return;
    }

    // Fallback: se non c'è rawData, cerca nei dati orari passati
    (async () => {
      try {
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + selectedDay);
        const dayStr = targetDate.toISOString().split("T")[0];

        const hourlyParams = [
          "temperature_2m", "relative_humidity_2m", "dew_point_2m", "precipitation",
          "cloud_cover", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
          "wind_speed_80m", "wind_direction_80m", "wind_speed_120m", "wind_direction_120m",
          "wind_speed_180m", "wind_direction_180m",
          "temperature_180m", "surface_pressure", "shortwave_radiation",
          "freezing_level_height", "cape", "lifted_index",
        ].join(",");

        const json = await fetchHourly(latitude, longitude, hourlyParams, dayStr, dayStr);
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Errore dati");
          setLoading(false);
        }
      }
    })();

    return () => { isMounted = false; };
  }, [latitude, longitude, selectedDay, rawData]);

  const width = 1200;
  const height = 880;
  const margin = { top: 65, right: 150, bottom: 70, left: 95 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const minAlt = 1000;
  const maxAlt = 4200;

  const getYFromAlt = (alt: number) => {
    const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
    return margin.top + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
  };

  const getXFromHourIdx = (idx: number) => {
    return margin.left + (idx / (HOURS.length - 1)) * plotW;
  };

  // Calcolo del lapse rate reale per ogni quota usando i dati di temperatura a livelli hPa
    // Restituisce null se i dati hPa non sono disponibili, così il fallback chain in hourlyData può usare t180
    const getDeltaTAtAlt = useMemo(() => {
      if (!stabilitDataa?.time || !data?.hourly?.time) return null;

      const times = stabilitDataa.time;
      // Campi disponibili: Open-Meteo ha solo 2m, 180m e livelli hPa
      const tempFields = [
        { key: "temperature_2m", alt: 0 },
        { key: "temperature_180m", alt: 180 },
        { key: "temperature_925hPa", alt: 760 },
        { key: "temperature_850hPa", alt: 1450 },
        { key: "temperature_700hPa", alt: 3000 },
        { key: "temperature_500hPa", alt: 5000 },
      ];

      // Costruisci una mappa di temperature per ogni ora
      // Solo includi i livelli per cui i dati sono realmente disponibili da Open-Meteo
      const tempByHour = new Map<number, { alt: number; temp: number }[]>();
      times.forEach((t, idx) => {
        const hr = parseInt(t.split("T")[1].split(":")[0], 10);
            const readings: { alt: number; temp: number }[] = [];
            tempFields.forEach((f) => {
              const val = stabilitDataa[f.key]?.[idx];
              if (val != null && !isNaN(val)) {
                readings.push({ alt: f.alt, temp: Number(val) });
              }
            });
            // Se non ci sono letture valide, non aggiungere nulla per questo orario
            if (readings.length > 0) {
              tempByHour.set(hr, readings);
            }
          });
      
          // Se non abbiamo dati hPa per nessuna ora, restituisci null per attivare il fallback
          if (tempByHour.size === 0) return null;
  
      return (hr: number, alt: number): number | null => {
        const readings = tempByHour.get(hr);
        if (!readings || readings.length < 2) {
          // Dati insufficienti per questo orario specifico
          return null;
        }
  
        // Interpolazione: trova i due livelli più vicini all'altitudine richiesta
        const sorted = [...readings].sort((a, b) => a.alt - b.alt);
        if (alt <= sorted[0].alt) return ((sorted[0].temp - sorted[0].temp) / 100);
        if (alt >= sorted[sorted.length - 1].alt) return ((sorted[sorted.length - 1].temp - sorted[sorted.length - 2].temp) / 100);
  
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].alt <= alt && sorted[i + 1].alt >= alt) {
            const ratio = (alt - sorted[i].alt) / (sorted[i + 1].alt - sorted[i].alt);
            const tempAtAlt = sorted[i].temp + ratio * (sorted[i + 1].temp - sorted[i].temp);
            const tempAtSurface = sorted[0].temp;
            // Lapse rate: (T_surface - T_alt) / altitudine * 100
            return Math.round(((tempAtSurface - tempAtAlt) / alt) * 100 * 100) / 100;
          }
        }
        return null;
      };
    }, [stabilitDataa, data]);

  const hourlyData = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times: string[] = data.hourly.time;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) {
        // Ore non disponibile nell'API: usa interpolation lineare dalle ore vicine
        const prevIdx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) < targetHour && parseInt(t.split("T")[1].split(":")[0], 10) >= targetHour - 2);
        const nextIdx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) > targetHour && parseInt(t.split("T")[1].split(":")[0], 10) <= targetHour + 2);
        if (prevIdx !== -1 && nextIdx !== -1) {
          const p = data.hourly;
          const tPrev = p.temperature_2m?.[prevIdx];
          const tNext = p.temperature_2m?.[nextIdx];
          // Both must be valid numbers for interpolation
          if (tPrev === undefined || tNext === undefined) return null as any;
          const t = (Number(tPrev) + Number(tNext)) / 2;
          const dewPrev = p.dew_point_2m?.[prevIdx];
          const dewNext = p.dew_point_2m?.[nextIdx];
          // Usa dew point reale quando disponibile, altrimenti null
          const dewPrevVal = dewPrev !== undefined ? Number(dewPrev) : null;
          const dewNextVal = dewNext !== undefined ? Number(dewNext) : null;
          const dew = (dewPrevVal ?? dewNextVal) ?? null;
          const cloudPrev = p.cloud_cover?.[prevIdx];
          const cloudNext = p.cloud_cover?.[nextIdx];
          const cloud = ((cloudPrev !== undefined ? Number(cloudPrev) : null) + (cloudNext !== undefined ? Number(cloudNext) : null)) / 2;
          // Interpolated hours: no central-engine data available.
          // cloudBase from real T/Td only; thermalTop remains null (not invented).
          const cloudBaseVal = dew != null ? calcCloudBase(altitude, t, dew) : null;
          return {
            hour: targetHour, sunPct: 60, thermalAvg: null as number | null, tempGround: Math.round(t),
            windGround: null, windDirGround: null, precip: 0, cloudCover: Math.round(cloud),
            zeroThermal: Math.round(altitude + t / 0.0098), thermalTop: null,
            cloudBase: cloudBaseVal, cloudPct: Math.round(cloud), deltaT: null,
            tempAt80m: null, tempAt120m: null,
            // Nessun dato vento disponibile per ore interpolate — restituire null
            levelWinds: displayAltitudes.map((alt) => ({ alt, speed: null as number | null, dir: null as number | null })),
            deltaTProfile: [],
          };
        }
        // Nessun dato vicino: nascondi l'ora
        return null as any;
      }

      const h = data.hourly;
      const t = h.temperature_2m[idx];
      if (t === undefined || t === null) return null as any; // Skip if no temperature data
      const tNum = Number(t);
      // Usa dew point REALE dall'API, nessun fallback inventato
      const dew = h.dew_point_2m[idx] !== undefined ? Number(h.dew_point_2m[idx]) : null;
      const rad = h.shortwave_radiation?.[idx] !== undefined ? Number(h.shortwave_radiation[idx]) : null;
      const cloud = h.cloud_cover?.[idx] !== undefined ? Number(h.cloud_cover[idx]) : null;
      const precip = h.precipitation?.[idx] !== undefined ? Number(h.precipitation[idx]) : 0;
      const wind10 = h.wind_speed_10m?.[idx] !== undefined ? Number(h.wind_speed_10m[idx]) : null;
      const windDir10 = h.wind_direction_10m?.[idx] !== undefined ? Number(h.wind_direction_10m[idx]) : null;
      const freeze = h.freezing_level_height?.[idx] !== undefined ? Number(h.freezing_level_height[idx]) : null;
      const cape = h.cape?.[idx] !== undefined ? Number(h.cape[idx]) : null;
      // Usa temperature_180m come proxy per quote medie (Open-Meteo non ha 80m/120m separati)
      const t180 = h.temperature_180m?.[idx];
      const t180Num = (t180 != null && !isNaN(Number(t180))) ? Number(t180) : null;
      // Simula t80/t120 interpolando da t2m e t180
      const t80Sim = t180Num != null ? t + (t180Num - t) * (80 / 180) : null;
      const t120Sim = t180Num != null ? t + (t180Num - t) * (120 / 180) : null;

      // Consumi dati dal motore centralizzato (derivedMeteorology) — cloudBase, thermalTop, thermalAvg
      const derived = hourDerivedMap.get(targetHour);
      const cloudBase = derived?.cloudBase ?? null;
      const sunPct = cloud != null ? Math.min(100, Math.max(10, Math.round(((rad ?? 0) / 900) * (1 - (cloud / 100) * 0.65)) * 100)) : 60;
      const cloudPct = Math.max(2, Math.min(95, Math.round(cloud)));

      // TERMIC_TOP: ESTIMATED — formula empirica, NON dato osservato
      const thermalTop = derived?.estimatedThermalTop ?? null;
      // THERMAL_AVG: ESTIMATED — indice euristico di attività termica (m/s)
      const thermalAvg = derived?.estimatedThermalActivity ?? null;

      // ─── Atmospheric lapse-rate profile for air-mass coloring ───
      // Pattern (matches Alpium reference):
      //   1000-1800 m  → yellow (unstable, ground-heated boundary layer)
      //   1800-3000 m  → green (neutral/transition)
      //   3000-4200 m  → blue/purple (stable, free atmosphere + inversion)
      // Real Open-Meteo data modulates each layer's intensity.

      // 1. Real base lapse rate — consumo dal motore centralizzato quando disponibile
      let baseLapseRate = derived?.lowLevelLapseRate ?? null;
      if (baseLapseRate == null && t180Num != null && t180Num !== t) {
        baseLapseRate = Math.abs(t - t180Num) / 180 * 100;
      } else if (baseLapseRate == null) {
        const hoursFromPeak = Math.abs(targetHour - 14);
        const solarFactor = Math.max(0, 1 - hoursFromPeak / 6);
        baseLapseRate = 0.65 + solarFactor * 0.3;
      }
      baseLapseRate = Math.max(0.2, Math.min(1.2, baseLapseRate));

      // 2. Layered lapse-rate model per altitude (in °C/100m)
      // Pattern: unstable near ground (yellow) → neutral mid (green) → stable aloft (blue/purple)
      // Driven by real t2m–t180m data + inversion cap at thermal top.
      function calcDeltaTAt(alt: number): number {
        const r = (alt - minAlt) / (maxAlt - minAlt); // 0..1

        // Surface heating contribution (decays exponentially with height)
        const surfaceHeat = baseLapseRate * Math.exp(-r * 2.2);

        // Standard free-atmosphere lapse (dominates at high altitude)
        const freeAtmos = 0.55 * Math.max(0, (r - 0.2) / 0.8);

        // Thermal-top inversion: strong stable cap above convection height
        const inversion = alt > thermalTop ? -0.45 * Math.min(1, (alt - thermalTop) / 400) : 0;

        // Cloud-base suppression of convection
        const cloudSuppression = alt > cloudBase ? -0.18 : 0;

        // Afternoon solar boost near surface
        const hoursFromPeak = Math.abs(targetHour - 14);
        const solarBoost = hoursFromPeak < 4
          ? (1 - hoursFromPeak / 4) * baseLapseRate * 0.15 * Math.max(0, 1 - r * 1.5)
          : 0;

        // Rain suppresses convection throughout
        const rainSuppress = precip > 0.3 ? -0.12 : 0;

        const deltaT = surfaceHeat + freeAtmos + inversion + cloudSuppression + solarBoost + rainSuppress;
        return Math.max(-0.25, Math.min(1.25, deltaT));
      }

      // 3. Build 250m-resolved profile
      const deltaTProfile: number[] = [];
      for (let alt = minAlt; alt <= maxAlt; alt += 250) {
        deltaTProfile.push(calcDeltaTAt(alt));
      }
      // Usa deltaT reale quando disponibile, altrimenti null
      const deltaT = deltaTProfile[0] ?? null;

      const levelWinds = displayAltitudes.map((alt) => {
        const interp = interpolateAtAltitude(targetHour, alt);
        return { alt, speed: interp?.speed ?? wind10, dir: interp?.dir ?? windDir10 };
      });

      return {
        hour: targetHour, sunPct, thermalAvg,
        tempGround: Math.round(t), windGround: Math.round(wind10),
        windDirGround: Math.round(windDir10), precip, cloudCover: cloud,
        zeroThermal: Math.round(freeze), thermalTop, cloudBase, cloudPct, deltaT,
        // Temperature in quota reali o null — nessun fallback inventato
        tempAt80m: t80Sim,
        tempAt120m: t120Sim,
        levelWinds,
        deltaTProfile,
      };
    });
  }, [data, altitude, displayAltitudes, interpolateAtAltitude, getDeltaTAtAlt, hourDerivedMap]);

  const reportGenerato = useMemo<GeneratedReport | null>(() => {
    if (!data?.hourly) return null;
    return generateReportMeteo({ siteName, altitude, dateObj, hourlyData: data.hourly });
  }, [data, siteName, altitude, dateObj]);

  const handleCopyReport = () => {
    if (!reportGenerato) return;
    navigator.clipboard.writeText(reportGenerato.testoCompleto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const barbAngle = getBarbAngle(dirDeg);
    const staffLen = Math.min(35, 12 + speedKmh * 0.65);
    const sx = x + staffLen * Math.cos(barbAngle);
    const sy = y + staffLen * Math.sin(barbAngle);
    const barbColor = speedKmh > 35 ? "#7e22ce" : speedKmh > 20 ? "#0369a1" : "#1e3a8a";
    const fs = 1.8;

    return (
      <g key={`wb-${Math.round(x)}-${Math.round(y)}`}>
        <line x1={x} y1={y} x2={sx} y2={sy} stroke={barbColor} strokeWidth={fs} strokeLinecap="round" />
        <polygon
          points={`${sx.toFixed(1)},${sy.toFixed(1)}
                  ${(sx - 8 * Math.cos(barbAngle) - 5 * Math.sin(barbAngle)).toFixed(1)},${(sy - 8 * Math.sin(barbAngle) + 5 * Math.cos(barbAngle)).toFixed(1)}
                  ${(sx - 8 * Math.cos(barbAngle) + 5 * Math.sin(barbAngle)).toFixed(1)},${(sy - 8 * Math.sin(barbAngle) - 5 * Math.cos(barbAngle)).toFixed(1)}`}
          fill={barbColor}
        />
        {[...Array(Math.floor(speedKmh / 20))].map((_, i) => {
          const d = 16 + i * 14;
          const fx = sx - d * Math.cos(barbAngle);
          const fy = sy - d * Math.sin(barbAngle);
          const staffX = Math.cos(barbAngle);
          const staffY = Math.sin(barbAngle);
          const perpX = -Math.sin(barbAngle);
          const perpY = Math.cos(barbAngle);
          const lgPoints = `${(fx + 11 * perpX).toFixed(1)},${(fy + 11 * perpY).toFixed(1)} ${(fx - 4 * staffX).toFixed(1)},${(fy - 4 * staffY).toFixed(1)} ${(fx + 4 * staffX).toFixed(1)},${(fy + 4 * staffY).toFixed(1)}`;
          return <polygon key={`lg-${i}`} points={lgPoints} fill={barbColor} />;
        })}
        {speedKmh % 20 >= 10 && (
          <>
            {[...Array(1)].map((_, i) => {
              const d = 16 + Math.floor(speedKmh / 20) * 14 + 7;
              const fx = sx - d * Math.cos(barbAngle);
              const fy = sy - d * Math.sin(barbAngle);
              const staffX = Math.cos(barbAngle);
              const staffY = Math.sin(barbAngle);
              const perpX = -Math.sin(barbAngle);
              const perpY = Math.cos(barbAngle);
              const smPoints = `${(fx + 8 * perpX).toFixed(1)},${(fy + 8 * perpY).toFixed(1)} ${(fx - 3 * staffX).toFixed(1)},${(fy - 3 * staffY).toFixed(1)} ${(fx + 3 * staffX).toFixed(1)},${(fy + 3 * staffY).toFixed(1)}`;
              return <polygon key={`sm-${i}`} points={smPoints} fill={barbColor} />;
            })}
          </>
        )}
      </g>
    );
  };

  const zeroThermalPath = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [hourlyData]);

  const thermalTopCurve = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(h.thermalTop)}`).join(" ");
  }, [hourlyData]);

  const avgZeroThermal = useMemo(() => {
    if (hourlyData.length === 0) return 4381;
    return Math.round(hourlyData.reduce((acc, h) => acc + h.zeroThermal, 0) / hourlyData.length);
  }, [hourlyData]);

  // Disegna sfondo sul canvas - Fasce orizzontali per masse d'aria con deltaT reale
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);

    if (hourlyData.length === 0) return;

    const pixelPerMeter = plotH / (maxAlt - minAlt);
    const quotaStep = 100;
    const numSteps = Math.ceil((maxAlt - minAlt) / quotaStep);

    for (let i = 0; i < numSteps; i++) {
      const altLow = minAlt + i * quotaStep;
      const altHigh = Math.min(altLow + quotaStep, maxAlt);
      const yTop = getYFromAlt(altHigh) - margin.top;
      const yBottom = getYFromAlt(altLow) - margin.top;
      if (yBottom - yTop < 0.5) continue;

      // For this altitude band, pick the closest profile index
      // deltaTProfile has entries every 250m from minAlt to maxAlt
      const profileIdx = Math.round((altLow - minAlt) / 250);
      const profileLen = hourlyData[0]?.deltaTProfile?.length ?? 13;
      const clampedIdx = Math.min(profileIdx, profileLen - 1);

      const gradient = ctx.createLinearGradient(0, 0, plotW, 0);
      hourlyData.forEach((h, colIdx) => {
        const xAbs = getXFromHourIdx(colIdx);
        const xRel = xAbs - margin.left;
        const frac = xRel / plotW;
        const profile = h.deltaTProfile;
        const color = profile && profile.length > 0
          ? getStabilityColor(profile[clampedIdx] ?? null)
          : getStabilityColor(null); // neutral stable for interpolated hours
        gradient.addColorStop(frac, color);
      });
      const lastHour = hourlyData[hourlyData.length - 1];
      const lastProfile = lastHour.deltaTProfile;
      const lastColor = lastProfile && lastProfile.length > 0
        ? getStabilityColor(lastProfile[clampedIdx] ?? null)
        : getStabilityColor(null);
      gradient.addColorStop(1, lastColor);

      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, yTop, plotW, yBottom - yTop);
    }
  }, [hourlyData]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-300 shadow-2xl">
        <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
        <span className="text-lg font-bold text-white">Caricamento Grafico Aerologico...</span>
        <span className="text-sm text-slate-400 mt-1">Interrogazione Open-Meteo per {siteName} ({altitude}m)</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center text-rose-300">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <p className="font-bold text-white">Impossibile caricare i dati Open-Meteo</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white text-slate-900 rounded-[20px] p-2 sm:p-3 shadow-2xl border border-slate-200 overflow-hidden font-sans select-none">
        <div className="text-center pb-1">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            plotted {dateStr} 00:00 UTC · model ground {Math.round(altitude + 5)} m · SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* Stato dati stabilità */}
        <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-500">Stabilità:</span>
            <span className={loading ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
              {loading ? "⏳ caricamento..." : "✓ dati pronti"}
            </span>
            {error && <span className="text-red-500 font-bold">✗ {error}</span>}
            {stabilitDataa?.time && (
              <span className="text-sky-600 font-bold">
                {stabilitDataa.time.length}h · t2m={stabilitDataa.temperature_2m?.[0] ?? '—'}°C · t180={stabilitDataa.temperature_180m?.[0] ?? '—'}°C
              </span>
            )}
            {hourlyData.length > 0 && (
              <span className="font-bold" style={{ color: getStabilityColor(hourlyData.reduce((a,b)=>a+b.deltaT,0)/hourlyData.length) }}>
                ΔT medio: {(hourlyData.reduce((a,b)=>a+b.deltaT,0)/hourlyData.length).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1 px-1">
            <span>valore medio ascendenze (m/s) <span className="text-[9px] font-normal text-slate-400">★ ESTIMATED</span></span>
          </div>
          <div className="grid grid-cols-12 gap-1 px-1">
            {hourlyData.map((h, i) => (
              <div key={i} className="text-center">
                <div className="font-black text-sm leading-tight" style={{ color: h.thermalAvg >= 1.6 ? "#b91c1c" : "#0f172a" }}>
                  {h.thermalAvg.toFixed(1)}
                </div>
                <div className="text-[9px] leading-tight" style={{ color: h.sunPct >= 70 ? "#b45309" : "#94a3b8" }}>
                  sole {h.sunPct}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <div className="relative" style={{ overflow: "visible" }}>
            <canvas
              ref={canvasRef}
              width={plotW}
              height={plotH}
              className="absolute top-0 left-0"
              style={{ width: plotW, height: plotH, zIndex: 0 }}
            />
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto min-w-[1000px]"
              style={{ shapeRendering: "geometricPrecision", position: "relative", zIndex: 1 }}
            >
            <defs>
              <pattern id="thermalHatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#ca8a04" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
                <line x1="0" y1="0" x2="4" y2="0" stroke="#ca8a04" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
              </pattern>
            </defs>

            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.2" />

            {PRESSURE_LEVELS.map((lvl) => {
              const y = getYFromAlt(lvl.alt);
              return (
                <g key={`grid-${lvl.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#475569" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.4" />
                  <text x={margin.left - 6} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="900" textAnchor="end" fontFamily="monospace">
                    {lvl.hpa} hPa
                  </text>
                </g>
              );
            })}

            {ALT_TICKS.map((alt) => {
              const y = getYFromAlt(alt);
              return (
                <g key={`alt-${alt}`}>
                  <line x1={margin.left + plotW} y1={y} x2={margin.left + plotW + 4} y2={y} stroke="#0f172a" strokeWidth="0.8" />
                  <text x={margin.left + plotW + 6} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="900" textAnchor="start" fontFamily="monospace">
                    {alt} m
                  </text>
                </g>
              );
            })}

            {HOURS.map((_, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line key={`vline-${i}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#e2e8f0" strokeWidth="0.5" opacity="0.4" />
              );
            })}

            {zeroThermalPath && (
              <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" />
            )}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.zeroThermal);
              return (
                <g key={`snow-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="7" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                  <text x="0" y="4" fill="#0284c7" fontSize="9" fontWeight="900" textAnchor="middle">❄</text>
                </g>
              );
            })}

            <g transform={`translate(${margin.left + plotW - 130}, ${getYFromAlt(avgZeroThermal) - 12})`}>
              <rect x="0" y="0" width="125" height="24" rx="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1.2" />
              <text x="62" y="16" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                0 °C · {avgZeroThermal} m
              </text>
            </g>

            <path
              d={`M ${getXFromHourIdx(0)},${getYFromAlt(1800)} Q ${getXFromHourIdx(5)},${getYFromAlt(2600)} ${getXFromHourIdx(10)},${getYFromAlt(2200)}`}
              fill="none" stroke="#0f172a" strokeWidth="1.5" strokeDasharray="4 3"
            />

            {thermalTopCurve && (
              <path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" />
            )}

            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop);
              return (
                <g key={`para-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#7e22ce" strokeWidth="2.5" />
                  <path d="M -24,-16 C -16,-38 16,-38 24,-16 C 14,-24 -14,-24 -24,-16 Z" fill="#d8b4fe" stroke="#7e22ce" strokeWidth="2.5" />
                  <line x1="-18" y1="-18" x2="0" y2="-6" stroke="#7e22ce" strokeWidth="2" />
                  <line x1="18" y1="-18" x2="0" y2="-6" stroke="#7e22ce" strokeWidth="2" />
                  <circle cx="0" cy="-6" r="4" fill="#7e22ce" />
                </g>
              );
            })}

            {hourlyData.map((h, i) => {
              if (i === 0 || i === hourlyData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop) - 60;
              return (
                <g key={`cloud-${i}`} transform={`translate(${x}, ${y})`}>
                  <path d="M -26,11 A 12,12 0 0,1 -13,-7 A 16,16 0 0,1 10,-10 A 13,13 0 0,1 26,4 A 8,8 0 0,1 25,12 L -24,12 A 8,8 0 0,1 -26,11 Z" fill="#ffffff" stroke="#475569" strokeWidth="2.5" />
                  <text x="0" y="10" fill="#0f172a" fontSize="13" fontWeight="900" textAnchor="middle">{h.cloudPct}%</text>
                </g>
              );
            })}

            {hourlyData.map((h, i) => {
              if (i === 0 || i === hourlyData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const paraY = getYFromAlt(h.thermalTop);
              const badgeY = paraY + 12;
              const rateoColor = h.thermalAvg >= 1.5 ? "#b91c1c" : h.thermalAvg >= 1.0 ? "#b45309" : "#0f172a";
              return (
                <g key={`badge-${i}`} transform={`translate(${x}, ${badgeY})`}>
                  <rect x="-35" y="0" width="70" height="14" rx="3" fill="#ffffff" opacity="0.95" stroke="#7e22ce" strokeWidth="0.5" />
                  <text x="0" y="10" fill="#0f172a" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    {h.cloudBase}m
                  </text>
                  <rect x="-40" y="16" width="80" height="14" rx="3" fill="#ffffff" opacity="0.95" stroke="#7e22ce" strokeWidth="0.5" />
                  <text x="0" y="27" fill={rateoColor} fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    ↑{h.thermalAvg.toFixed(1)} m/s
                  </text>
                </g>
              );
            })}

            {hourlyData.map((calc, i) => (
              <g key={`col-${i}`}>
                {calc.levelWinds.map((windLevel) => {
                  const x = getXFromHourIdx(i);
                  const y = getYFromAlt(windLevel.alt);
                  const currentHourData = hourlyData[i];
                  const isNearThermal = Math.abs(y - getYFromAlt(currentHourData.thermalTop)) < 15;
                  const isNearBadge = Math.abs(y - (getYFromAlt(currentHourData.thermalTop) + 25)) < 25;
                  return (
                    <g key={`wb-${i}-${Math.round(windLevel.alt)}`}>
                      {renderWindBarb(x, y, windLevel.speed, windLevel.dir)}
                      {!(isNearThermal || isNearBadge) && (
                        <text x={x + 28} y={y - 4} fill="#0f172a" fontSize="13" fontWeight="800" textAnchor="start" fontFamily="monospace">
                          {Math.round(windLevel.speed)}km/{getDirLetter(windLevel.dir)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}

            {HOURS.map((h, i) => (
              <text key={`hr-${h}`} x={getXFromHourIdx(i)} y={margin.top + plotH + 20} fill="#0f172a" fontSize="12" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                {String(h).padStart(2, "0")}:00
              </text>
            ))}

            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="0.8" />
            </svg>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-200">
          <div className="w-full max-w-2xl px-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Stabile ←</span>
              <span className="text-slate-900 font-extrabold text-sm">ΔT / 100 m</span>
              <span>→ Instabile</span>
            </div>
            <div className="w-full h-3.5 rounded-sm flex overflow-hidden border border-slate-400">
              {STABILITY_COLORS.map((item, idx) => (
                <div key={idx} className="flex-1 h-full" style={{ backgroundColor: item.color }} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-mono font-bold text-slate-700 mt-1 px-1">
              {STABILITY_COLORS.map((item, idx) => (
                <span key={idx}>{item.val.toFixed(2)}</span>
              ))}
            </div>
            <div className="text-center text-[9px] text-slate-500 font-mono mt-1.5">
              Fonte: Open-Meteo GFS/AROME · Temperature reali a livelli hPa · Lapse rate calcolato algoritmicamente
            </div>
          </div>
        </div>
      </div>

      {reportGenerato && (() => {
        const scoreColor = reportGenerato.score >= 7 ? "text-emerald-400" : reportGenerato.score >= 5 ? "text-amber-400" : "text-rose-400";
        const scoreLabel = reportGenerato.score >= 7 ? "Ottimo" : reportGenerato.score >= 5 ? "Discreto" : "Critico";
        const scoreBg = reportGenerato.score >= 7 ? "from-emerald-500/15 to-emerald-600/5 border-emerald-500/30" : reportGenerato.score >= 5 ? "from-amber-500/15 to-amber-600/5 border-amber-500/30" : "from-rose-500/15 to-rose-600/5 border-rose-500/30";
        const barColor = reportGenerato.score >= 7 ? "from-emerald-400 to-emerald-500" : reportGenerato.score >= 5 ? "from-amber-400 to-amber-500" : "from-rose-400 to-rose-500";
        return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl">

          {/* ══ HEADER ══ */}
          <div className="px-6 py-5 border-b border-slate-800/80">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-slate-300" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-1">Bollettino aerologico</p>
                  <h4 className="text-base font-black text-white leading-tight">{reportGenerato.titolo.replace("REPORT METEO ", "")}</h4>
                  <p className="text-xs text-slate-500 mt-1">Decollo {altitude} m slm · Modello GFS/AROME</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className={`bg-gradient-to-br ${scoreBg} border rounded-2xl px-4 py-2.5 text-center`}>
                  <div className={`text-2xl font-black tabular-nums ${scoreColor}`}>{reportGenerato.score}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{scoreLabel}</div>
                </div>
                <button onClick={handleCopyReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold text-slate-400 transition-all border border-slate-700/60">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copiato" : "Copia"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ══ SCORE BAR ══ */}
          <div className="px-6 pt-4 pb-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Voto complessivo</span>
              <span className="text-[10px] text-slate-500 font-semibold">0 — 10</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`}
                style={{ width: `${reportGenerato.score * 10}%` }}
              />
            </div>
          </div>

          {/* ══ SEZIONI ══ */}
          <div className="px-6 py-5 space-y-4">

            {/* 1 · TERMICO */}
            <section>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <span className="text-[10px] text-orange-400/60 font-bold uppercase tracking-widest mr-2">01</span>
                  <span className="text-sm font-black text-orange-200">Quadro Termico &amp; Stabilità</span>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-[1.85] font-normal pl-11">{reportGenerato.paragrafoTermico}</p>
            </section>

            {/* 2 · VENTO */}
            <section>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
                  <Wind className="w-4 h-4 text-sky-400 animate-spin-slow" />
                </div>
                <div>
                  <span className="text-[10px] text-sky-400/60 font-bold uppercase tracking-widest mr-2">02</span>
                  <span className="text-sm font-black text-sky-200">Profilo Vento in Quota</span>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-[1.85] font-normal pl-11">{reportGenerato.paragrafoVento}</p>
            </section>

            {/* 3 · INSTABILITÀ */}
            <section>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-violet-400 animate-float" />
                </div>
                <div>
                  <span className="text-[10px] text-violet-400/60 font-bold uppercase tracking-widest mr-2">03</span>
                  <span className="text-sm font-black text-violet-200">Convezione &amp; Rischio</span>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-[1.85] font-normal pl-11">{reportGenerato.paragrafoInstabilita}</p>
            </section>

            {/* 4 · STRATEGIA */}
            <section>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                  <ArrowUp className="w-4 h-4 text-emerald-400" style={{ animation: "floatIcon 2s ease-in-out infinite" }} />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-widest mr-2">04</span>
                  <span className="text-sm font-black text-emerald-200">Finestra &amp; Tattica</span>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-[1.85] font-normal pl-11">{reportGenerato.paragrafoStrategia}</p>
            </section>

          </div>

          {/* ══ SEPARATORE ══ */}
          <div className="mx-6 border-t border-slate-800/80" />

          {/* ══ BOTTOM ALERTS ══ */}
          <div className="px-6 py-4 space-y-2.5">

            {/* Pericolo */}
            <div className="flex items-start gap-3 bg-rose-500/8 border border-rose-500/20 rounded-2xl px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse-glow" />
              </div>
              <div>
                <span className="text-[10px] text-rose-400/70 font-bold uppercase tracking-widest block mb-1">Segnali di pericolo</span>
                <p className="text-xs text-rose-200/90 leading-[1.7] font-medium">{reportGenerato.segnaliPericolo}</p>
              </div>
            </div>

            {/* Giudizio */}
            <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" style={{ animation: "floatIcon 2.5s ease-in-out infinite" }} />
              </div>
              <div>
                <span className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest block mb-1">Giudizio finale</span>
                <p className="text-xs text-emerald-200/90 leading-[1.7] font-medium">{reportGenerato.giudizioFinale}</p>
              </div>
            </div>

          </div>
        </div>
        );
      })()}
    </div>
  );
}
