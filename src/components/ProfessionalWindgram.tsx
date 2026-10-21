"use client";

import React, { useEffect, useState, useMemo } from "react";
import type { OpenMeteoRawResponse } from "@/types/meteo";
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
  rawData?: OpenMeteoRawResponse | null; // JSON grezzo Open-Meteo — condiviso per evitare chiamate duplicate
}

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

const PRESSURE_LEVELS = [
  { hpa: 600, alt: 4000 },
  { hpa: 650, alt: 3500 },
  { hpa: 700, alt: 3000 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 2000 },
  { hpa: 850, alt: 1500 },
  { hpa: 900, alt: 1000 },
];

const computeDisplayAltitudes = (siteAlt: number): number[] => {
  const base = Math.floor(siteAlt / 250) * 250;
  const result: number[] = [];
  for (let alt = 4000; alt >= base; alt -= 250) result.push(alt);
  return result;
};

/** Select only the requested calendar day from shared Open-Meteo data. */
function selectRawHourlyDay(
  rawData: OpenMeteoRawResponse | null | undefined,
  selectedDay: number,
): OpenMeteoRawResponse | null {
  const times = rawData?.hourly?.time;
  if (!rawData?.hourly || !Array.isArray(times) || times.length === 0) return null;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + selectedDay);
  const targetKey = [
    targetDate.getFullYear(),
    String(targetDate.getMonth() + 1).padStart(2, "0"),
    String(targetDate.getDate()).padStart(2, "0"),
  ].join("-");
  const indexes = times
    .map((time: unknown, index: number) => String(time).slice(0, 10) === targetKey ? index : -1)
    .filter((index: number) => index >= 0);
  if (indexes.length === 0) return null;

  const hourly = Object.fromEntries(
    Object.entries(rawData.hourly).map(([key, values]) => [
      key,
      Array.isArray(values) && values.length === times.length
        ? indexes.map((index: number) => values[index])
        : values,
    ]),
  );

  return { ...rawData, hourly: hourly as OpenMeteoRawResponse["hourly"] };
}

// Palette delle masse d'aria ispirata ad Alpium: inversione, stabilità, mix e instabilità.
const STABILITY_COLORS = {
  veryStable: "#d7e2f2",   // Azzurro-grigio: inversione/stabilità marcata
  stable: "#dce9fb",       // Azzurro: stabile
  mixed: "#c9f4d5",        // Verde: gradiente intermedio
  unstable: "#fff08a",     // Giallo: instabilità crescente
  veryUnstable: "#f6cbd1", // Rosa: gradiente molto ripido
  missing: "#f3f5f8",      // Fondo neutro quando manca un profilo attendibile
};

const STABILITY_LEGEND = [
  { val: -0.2, color: STABILITY_COLORS.veryStable, label: "Inversione" },
  { val: 0.0, color: STABILITY_COLORS.stable, label: "Stabile" },
  { val: 0.4, color: STABILITY_COLORS.mixed, label: "Intermedia" },
  { val: 0.7, color: STABILITY_COLORS.unstable, label: "Instabile" },
  { val: 0.98, color: STABILITY_COLORS.veryUnstable, label: "Molto instabile" },
];

function getStabilityColor(deltaT: number | null | undefined): string {
  if (deltaT == null || !Number.isFinite(deltaT)) return STABILITY_COLORS.missing;
  if (deltaT <= 0.0) return STABILITY_COLORS.veryStable;
  if (deltaT < 0.4) return STABILITY_COLORS.stable;
  if (deltaT < 0.7) return STABILITY_COLORS.mixed;
  if (deltaT < 0.98) return STABILITY_COLORS.unstable;
  return STABILITY_COLORS.veryUnstable;
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
  const [data, setData] = useState<OpenMeteoRawResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const { interpolateAtAltitude } = useMultiHourWindProfile({
    lat: latitude,
    lon: longitude,
    siteAlt: altitude,
    selectedDay,
    rawData,
  });

  const stabilitDataa = data?.hourly ?? null;

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
        convectiveCloudTop: stabilitDataa.convective_cloud_top?.[idx] != null ? Number(stabilitDataa.convective_cloud_top[idx]) : null,
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
      const modelGroundAltitude = data?.elevation != null && Number.isFinite(Number(data.elevation))
        ? Number(data.elevation)
        : altitude;
      const derived = computeHourlyDerived(raw, altitude, modelGroundAltitude);
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

  const formattedDateTitle = useMemo(() => {
    const days = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return `${days[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
  }, [dateObj]);

  useEffect(() => {
    let isMounted = true;
    const sharedDayData = selectRawHourlyDay(rawData, selectedDay);
    const hasSharedHourlyData = Boolean(sharedDayData?.hourly?.time?.length);

    // Show the already-fetched homepage forecast immediately while enriching it with
    // pressure-level sounding variables in the background.
    setLoading(!hasSharedHourlyData);
    setError(null);
    setWarning(null);
    if (hasSharedHourlyData) setData(sharedDayData);

    (async () => {
      try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + selectedDay);
        const dayStr = [
          targetDate.getFullYear(),
          String(targetDate.getMonth() + 1).padStart(2, "0"),
          String(targetDate.getDate()).padStart(2, "0"),
        ].join("-");

        const hourlyParams = [
          "temperature_2m", "relative_humidity_2m", "dew_point_2m", "precipitation",
          "precipitation_probability", "weather_code", "cloud_cover", "cloud_cover_low",
          "cloud_cover_mid", "cloud_cover_high", "wind_speed_10m", "wind_direction_10m",
          "wind_gusts_10m", "wind_speed_80m", "wind_direction_80m", "wind_speed_120m",
          "wind_direction_120m", "wind_speed_180m", "wind_direction_180m", "temperature_80m",
          "temperature_120m", "temperature_180m", "surface_pressure", "pressure_msl",
          "shortwave_radiation", "freezing_level_height", "cape", "convective_inhibition",
          "lifted_index", "boundary_layer_height", "convective_cloud_base", "convective_cloud_top",
          "temperature_925hPa", "temperature_850hPa", "temperature_800hPa",
          "temperature_750hPa", "temperature_700hPa", "temperature_650hPa",
          "temperature_600hPa", "temperature_550hPa", "temperature_500hPa",
          "geopotential_height_925hPa", "geopotential_height_850hPa", "geopotential_height_800hPa",
          "geopotential_height_750hPa", "geopotential_height_700hPa", "geopotential_height_650hPa",
          "geopotential_height_600hPa", "geopotential_height_550hPa", "geopotential_height_500hPa",
          "wind_speed_925hPa", "wind_direction_925hPa", "wind_speed_850hPa", "wind_direction_850hPa",
          "wind_speed_700hPa", "wind_direction_700hPa", "wind_speed_600hPa", "wind_direction_600hPa",
          "wind_speed_500hPa", "wind_direction_500hPa",
        ].join(",");

        const sounding = await fetchHourly(latitude, longitude, hourlyParams, dayStr, dayStr);
        if (isMounted) {
          const sharedForSelectedDay = selectRawHourlyDay(rawData, selectedDay);
          const merged = sharedForSelectedDay?.hourly
            ? { ...sharedForSelectedDay, ...sounding, hourly: { ...sharedForSelectedDay.hourly, ...sounding.hourly } }
            : sounding;
          setData(merged);
          setError(null);
          setWarning(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          if (hasSharedHourlyData) {
            setData(sharedDayData);
            setError(null);
            setWarning("Profilo verticale avanzato non disponibile in questo momento. Il grafico continua a usare i dati orari già caricati; alcune informazioni in quota possono mancare.");
          } else {
            setError(err instanceof Error ? err.message : "Errore dati");
          }
          setLoading(false);
        }
      }
    })();

    return () => { isMounted = false; };
  }, [latitude, longitude, selectedDay, rawData]);

  const width = 1200;
  const height = 1040;
  const margin = { top: 200, right: 150, bottom: 78, left: 95 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Parte dalla quota del decollo arrotondata ai 200 m inferiori:
  // evita una grande zona vuota sotto il terreno del sito.
  const minAlt = Math.max(200, Math.floor(altitude / 200) * 200);
  const maxAlt = 4200;
  const altitudeTicks = Array.from(
    { length: Math.max(1, Math.floor((maxAlt - minAlt) / 200) + 1) },
    (_, index) => maxAlt - index * 200,
  );

  const getYFromAlt = (alt: number) => {
    const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
    return margin.top + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
  };

  const getXFromHourIdx = (idx: number) => {
    return margin.left + ((idx + 0.5) / HOURS.length) * plotW;
  };

  const hourlyData = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times: string[] = data.hourly.time;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) return null;

      const h = data.hourly;
      const t = h.temperature_2m[idx];
      if (t === undefined || t === null) return null;
      const tNum = Number(t);
      const dew = h.dew_point_2m[idx] !== undefined ? Number(h.dew_point_2m[idx]) : null;
      const rad = h.shortwave_radiation?.[idx] !== undefined ? Number(h.shortwave_radiation[idx]) : null;
      const cloud = h.cloud_cover?.[idx] != null ? Number(h.cloud_cover[idx]) : null;
      const cloudLow = h.cloud_cover_low?.[idx] != null ? Number(h.cloud_cover_low[idx]) : null;
      const cloudMid = h.cloud_cover_mid?.[idx] != null ? Number(h.cloud_cover_mid[idx]) : null;
      const cloudHigh = h.cloud_cover_high?.[idx] != null ? Number(h.cloud_cover_high[idx]) : null;
      const precip = h.precipitation?.[idx] != null ? Number(h.precipitation[idx]) : null;
      const wind10 = h.wind_speed_10m?.[idx] != null ? Number(h.wind_speed_10m[idx]) : null;
      const windDir10 = h.wind_direction_10m?.[idx] != null ? Number(h.wind_direction_10m[idx]) : null;
      const wind80 = h.wind_speed_80m?.[idx] != null ? Number(h.wind_speed_80m[idx]) : null;
      const windDir80 = h.wind_direction_80m?.[idx] != null ? Number(h.wind_direction_80m[idx]) : null;
      const freeze = h.freezing_level_height?.[idx] != null ? Number(h.freezing_level_height[idx]) : null;

      const derived = hourDerivedMap.get(targetHour);
      const cloudBase = derived?.cloudBase ?? null;
      const cloudPct = cloud != null && Number.isFinite(cloud) ? Math.max(0, Math.min(100, Math.round(cloud))) : null;

      const thermalTop = derived?.estimatedThermalTop ?? null;
      const thermalAvg = derived?.estimatedThermalActivity ?? null;

      const soundingLevels: Array<{ alt: number; temp: number }> = [];
      const addLevel = (alt: unknown, temp: unknown) => {
        const z = Number(alt), value = Number(temp);
        if (alt != null && temp != null && Number.isFinite(z) && Number.isFinite(value)) {
          soundingLevels.push({ alt: z, temp: value });
        }
      };
      addLevel(altitude + 2, t);
      addLevel(altitude + 80, data.hourly.temperature_80m?.[idx]);
      addLevel(altitude + 120, data.hourly.temperature_120m?.[idx]);
      addLevel(altitude + 180, data.hourly.temperature_180m?.[idx]);
      const pressureLevels = [925, 850, 800, 750, 700, 650, 600, 550, 500];
      pressureLevels.forEach((hpa) => {
        const z = data.hourly[`geopotential_height_${hpa}hPa`]?.[idx];
        const temp = data.hourly[`temperature_${hpa}hPa`]?.[idx];
        if (z != null && Number(z) > altitude + 50) addLevel(z, temp);
      });
      soundingLevels.sort((a, b) => a.alt - b.alt);
      const uniqueLevels = soundingLevels.filter((level, i, arr) =>
        i === 0 || Math.abs(level.alt - arr[i - 1].alt) > 20
      );

      function calcDeltaTAt(alt: number): number | null {
        if (uniqueLevels.length < 2) return null;
        for (let i = 0; i < uniqueLevels.length - 1; i++) {
          const lower = uniqueLevels[i], upper = uniqueLevels[i + 1];
          if (alt >= lower.alt && alt <= upper.alt && upper.alt > lower.alt) {
            const lapse = ((lower.temp - upper.temp) / (upper.alt - lower.alt)) * 100;
            return Number.isFinite(lapse) ? Math.max(-0.25, Math.min(1.25, lapse)) : null;
          }
        }
        return null;
      }

      const deltaTProfile: Array<number | null> = [];
      for (let alt = minAlt; alt <= maxAlt; alt += 100) {
        deltaTProfile.push(calcDeltaTAt(alt));
      }

      const levelWinds = displayAltitudes.map((alt) => {
        const interp = interpolateAtAltitude(targetHour, alt);
        // Non estendere il vento al suolo alle quote senza un dato verticale.
        return { alt, speed: interp?.speed ?? null, dir: interp?.dir ?? null };
      });

      return {
        hour: targetHour,
        thermalAvg,
        tempGround: Math.round(tNum),
        windGround: wind10 != null && Number.isFinite(wind10) ? Math.round(wind10) : null,
        windDirGround: windDir10 != null && Number.isFinite(windDir10) ? Math.round(windDir10) : null,
        wind80: wind80 != null && Number.isFinite(wind80) ? Math.round(wind80) : null,
        windDir80: windDir80 != null && Number.isFinite(windDir80) ? Math.round(windDir80) : null,
        cloudLow,
        cloudMid,
        cloudHigh,
        precip: precip != null && Number.isFinite(precip) ? precip : null,
        cloudCover: cloud,
        zeroThermal: freeze != null && Number.isFinite(freeze) ? Math.round(freeze) : null,
        thermalTop,
        cloudBase,
        cloudPct,
        levelWinds,
        deltaTProfile,
      };
    }).filter((entry) => entry != null);
  }, [data, altitude, displayAltitudes, interpolateAtAltitude, hourDerivedMap]);

  const reportGenerato = useMemo<GeneratedReport | null>(() => {
    if (!data?.hourly) return null;
    return generateReportMeteo({ siteName, altitude, dateObj, hourlyData: data.hourly, derivedByHour: hourDerivedMap });
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
    const staffLen = Math.min(32, 12 + speedKmh * 0.6);
    const sx = x + staffLen * Math.cos(barbAngle);
    const sy = y + staffLen * Math.sin(barbAngle);
    const barbColor = speedKmh > 35 ? "#9333ea" : speedKmh > 20 ? "#0284c7" : "#334155";
    const fs = 1.8;

    return (
      <g key={`wb-${Math.round(x)}-${Math.round(y)}`}>
        <line x1={x} y1={y} x2={sx} y2={sy} stroke={barbColor} strokeWidth={fs} strokeLinecap="round" />
        <polygon
          points={`${sx.toFixed(1)},${sy.toFixed(1)}
                  ${(sx - 7 * Math.cos(barbAngle) - 4 * Math.sin(barbAngle)).toFixed(1)},${(sy - 7 * Math.sin(barbAngle) + 4 * Math.cos(barbAngle)).toFixed(1)}
                  ${(sx - 7 * Math.cos(barbAngle) + 4 * Math.sin(barbAngle)).toFixed(1)},${(sy - 7 * Math.sin(barbAngle) - 4 * Math.cos(barbAngle)).toFixed(1)}`}
          fill={barbColor}
        />
      </g>
    );
  };

  const zeroThermalPath = useMemo(() => {
    if (hourlyData.length === 0) return "";
    let drawing = false;
    const segments: string[] = [];
    hourlyData.forEach((h, i) => {
      if (h.zeroThermal == null || !Number.isFinite(h.zeroThermal) || h.zeroThermal < minAlt || h.zeroThermal > maxAlt) {
        drawing = false;
        return;
      }
      segments.push(`${drawing ? "L" : "M"} ${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`);
      drawing = true;
    });
    return segments.join(" ");
  }, [hourlyData, minAlt, maxAlt]);

  const thermalTopCurve = useMemo(() => {
    if (hourlyData.length === 0) return "";
    let drawing = false;
    const segments: string[] = [];
    hourlyData.forEach((h, i) => {
      if (h.thermalTop == null || !Number.isFinite(h.thermalTop) || h.thermalTop < minAlt || h.thermalTop > maxAlt) {
        drawing = false;
        return;
      }
      segments.push(`${drawing ? "L" : "M"} ${getXFromHourIdx(i)},${getYFromAlt(h.thermalTop)}`);
      drawing = true;
    });
    return segments.join(" ");
  }, [hourlyData]);

  const avgZeroThermal = useMemo(() => {
    const valid = hourlyData
      .map((h) => h.zeroThermal)
      .filter((value): value is number => value != null && Number.isFinite(value) && value >= minAlt && value <= maxAlt);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((acc, value) => acc + value, 0) / valid.length);
  }, [hourlyData, minAlt, maxAlt]);

  if (loading) {
    return (
      <div className="bg-slate-100 border border-slate-300 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-700 shadow-sm">
        <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mb-3" />
        <span className="text-base font-bold text-slate-800">Caricamento Windgram Aerologico...</span>
        <span className="text-xs text-slate-500 mt-1">Interrogazione Open-Meteo per {siteName} ({altitude}m)</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center text-rose-800">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
        <p className="font-bold text-slate-900">Impossibile caricare i dati del Windgram</p>
        <p className="text-xs text-slate-600 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="alpium-windgram space-y-4 font-sans select-none">
      {warning && (
        <div
          role="status"
          data-testid="windgram-fallback-notice"
          className="rounded-xl border border-amber-300/40 bg-amber-100/75 px-3 py-2 text-xs leading-relaxed text-slate-700"
        >
          {warning}
        </div>
      )}
      {/* PANNELLO PRINCIPALE WINDGRAM - STYLE ALPIUM (Grigio perla) */}
      <div className="bg-slate-100 text-slate-800 rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-300 backdrop-blur-md">

        {/* Header Windgram */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-300">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Wind className="w-5 h-5 text-sky-600" />
              {siteName} &middot; <span className="text-sky-700 font-semibold">{formattedDateTitle}</span>
            </h2>
            <p className="text-[11px] text-slate-600 font-mono mt-0.5">
              Windgram aerologico &middot; Decollo {Math.round(altitude)} m &middot; Profilo previsto Open-Meteo
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 border border-slate-300">
              Fasce 100 m
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
              Previsione del modello
            </span>
          </div>
        </div>

        {/* Grafico Aerologico SVG + Canvas */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1 mt-3">
          <div className="relative" style={{ overflow: "visible" }}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto min-w-[1000px]"
              style={{ shapeRendering: "geometricPrecision", position: "relative", zIndex: 1 }}
            >
              <defs>
                <pattern id="rainHatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                  <rect width="9" height="9" fill="#ffffff" fillOpacity="0.3" />
                  <line x1="0" y1="0" x2="0" y2="9" stroke="#0284c7" strokeWidth="2" strokeOpacity="0.4" />
                </pattern>
              </defs>

              {/* Fondo base del sounding */}
              <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill={STABILITY_COLORS.missing} />

              {/* Masse d'aria stile Alpium: celle orarie × fasce di quota, disegnate nell'SVG
                  per rimanere visibili e allineate con griglia, barbule e curve su ogni browser. */}
              {hourlyData.flatMap((hourData) => {
                const hourIndex = HOURS.indexOf(hourData.hour);
                if (hourIndex < 0) return [];
                const cellW = plotW / HOURS.length;
                const profile = hourData.deltaTProfile;
                return Array.from({ length: Math.ceil((maxAlt - minAlt) / 100) }, (_, bandIndex) => {
                  const altLow = minAlt + bandIndex * 100;
                  const altHigh = Math.min(altLow + 100, maxAlt);
                  const sampleAltitude = altLow + (altHigh - altLow) / 2;
                  const profileIndex = Math.max(0, Math.min(
                    (profile?.length ?? 1) - 1,
                    Math.round((sampleAltitude - minAlt) / 100),
                  ));
                  const deltaT = profile?.[profileIndex] ?? null;
                  const color = getStabilityColor(deltaT);
                  return (
                    <rect
                      key={`air-mass-${hourData.hour}-${bandIndex}`}
                      data-testid="windgram-stability-cell"
                      data-stability-color={color}
                      data-hour={hourData.hour}
                      data-altitude-low={altLow}
                      data-altitude-high={altHigh}
                      x={margin.left + hourIndex * cellW}
                      y={getYFromAlt(altHigh)}
                      width={cellW + 0.4}
                      height={Math.max(0.5, getYFromAlt(altLow) - getYFromAlt(altHigh))}
                      fill={color}
                      fillOpacity={0.98}
                      stroke="#ffffff"
                      strokeOpacity={0.26}
                      strokeWidth="0.45"
                    />
                  );
                });
              })}

              <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#8c9bad" strokeWidth="1" />

              {/* Livelli di Pressione */}
              {PRESSURE_LEVELS.map((lvl) => {
                const y = getYFromAlt(lvl.alt);
                return (
                  <g key={`grid-${lvl.hpa}`}>
                    <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#64748b" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
                    <text x={margin.left - 6} y={y + 4} fill="#334155" fontSize="11" fontWeight="800" textAnchor="end" fontFamily="monospace">
                      {lvl.hpa} hPa
                    </text>
                  </g>
                );
              })}

              {/* Ticks Altitudine */}
              {altitudeTicks.map((alt) => {
                const y = getYFromAlt(alt);
                return (
                  <g key={`alt-${alt}`}>
                    <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#8190a0" strokeWidth="0.45" opacity="0.42" />
                    <line x1={margin.left + plotW} y1={y} x2={margin.left + plotW + 4} y2={y} stroke="#475569" strokeWidth="0.8" />
                    <text x={margin.left + plotW + 6} y={y + 4} fill="#334155" fontSize="11" fontWeight="800" textAnchor="start" fontFamily="monospace">
                      {alt} m
                    </text>
                  </g>
                );
              })}

              {/* Righe superiori del sounding: nuvole per fascia e vento ai primi livelli. */}
              <text transform={`translate(${margin.left - 70}, 83) rotate(-90)`} fill="#526579" fontSize="11" fontWeight="900" textAnchor="middle" letterSpacing="1.2">NUVOLE</text>
              <text transform={`translate(${margin.left - 70}, 158) rotate(-90)`} fill="#526579" fontSize="11" fontWeight="900" textAnchor="middle" letterSpacing="1.2">VENTO</text>
              {[
                { label: "H", y: 30 },
                { label: "M", y: 60 },
                { label: "B", y: 90 },
              ].map((row) => (
                <text key={`cloud-row-label-${row.label}`} x={margin.left - 12} y={row.y + 18} fill="#334155" fontSize="11" fontWeight="900" textAnchor="end">{row.label}</text>
              ))}
              {[
                { label: "SUOLO", y: 130 },
                { label: "80 m", y: 163 },
              ].map((row) => (
                <text key={`wind-row-label-${row.label}`} x={margin.left - 12} y={row.y + 18} fill="#334155" fontSize="9" fontWeight="900" textAnchor="end">{row.label}</text>
              ))}
              <text x={margin.left + plotW} y="18" fill="#687889" fontSize="10" fontWeight="800" textAnchor="end">Vento: km/h · Nuvole: % copertura</text>
              {hourlyData.flatMap((h) => {
                const hourIndex = HOURS.indexOf(h.hour);
                if (hourIndex < 0) return [];
                const cellW = plotW / HOURS.length;
                const x = margin.left + hourIndex * cellW;
                const cloudRows = [
                  { key: "high", y: 30, value: h.cloudHigh },
                  { key: "mid", y: 60, value: h.cloudMid },
                  { key: "low", y: 90, value: h.cloudLow },
                ];
                const cloudCells = cloudRows.map((row) => {
                  const cover = row.value;
                  const fill = cover == null || !Number.isFinite(cover)
                    ? "#f3f5f8"
                    : cover >= 75 ? "#b5bdc9" : cover >= 45 ? "#d0d7e1" : cover >= 15 ? "#e5eaf1" : "#f6f8fb";
                  return (
                    <g key={`cloud-${h.hour}-${row.key}`}>
                      <rect x={x} y={row.y} width={cellW} height="28" fill={fill} stroke="#c1cad5" strokeWidth=".65" />
                      <text x={x + cellW / 2} y={row.y + 18} fill="#3c4a5c" fontSize="9" fontWeight="800" textAnchor="middle">
                        {cover != null && Number.isFinite(cover) ? `${Math.round(cover)}` : ""}
                      </text>
                    </g>
                  );
                });
                const windRows = [
                  { key: "ground", y: 130, speed: h.windGround, dir: h.windDirGround },
                  { key: "80m", y: 163, speed: h.wind80, dir: h.windDir80 },
                ];
                const windCells = windRows.map((row) => {
                  const speed = row.speed;
                  const fill = speed == null ? "#f3f5f8" : speed >= 30 ? "#9fd8ec" : speed >= 18 ? "#bfe6ef" : speed >= 8 ? "#d5efef" : "#e4f3f1";
                  const centerX = x + cellW / 2;
                  return (
                    <g key={`wind-${h.hour}-${row.key}`}>
                      <rect x={x} y={row.y} width={cellW} height="28" fill={fill} stroke="#c1cad5" strokeWidth=".65" />
                      {speed != null && row.dir != null && Number.isFinite(speed) && Number.isFinite(row.dir) && renderWindBarb(centerX - 9, row.y + 13, speed, row.dir)}
                      <text x={x + cellW - 4} y={row.y + 24} fill="#34485a" fontSize="8" fontWeight="800" textAnchor="end">
                        {speed != null && Number.isFinite(speed) ? Math.round(speed) : ""}
                      </text>
                    </g>
                  );
                });
                return [...cloudCells, ...windCells];
              })}

              {/* Griglia Oraria */}
              {Array.from({ length: HOURS.length + 1 }, (_, i) => {
                const x = margin.left + (i / HOURS.length) * plotW;
                return (
                  <line key={`vline-${i}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#94a3b8" strokeWidth={i === 0 || i === HOURS.length ? 1 : 0.5} opacity={0.6} />
                );
              })}

              {/* Precipitazioni */}
              {hourlyData.map((h) => {
                const hasRain = h.precip != null && Number.isFinite(h.precip) && h.precip >= 0.2;
                if (!hasRain) return null;
                const cellW = plotW / HOURS.length;
                const hourIndex = HOURS.indexOf(h.hour);
                if (hourIndex < 0) return null;
                return (
                  <g key={`rain-${h.hour}`}>
                    <rect
                      x={margin.left + hourIndex * cellW}
                      y={margin.top}
                      width={cellW}
                      height={plotH}
                      fill="url(#rainHatch)"
                      stroke="#0284c7"
                      strokeOpacity="0.4"
                      strokeWidth="1"
                    />
                    <text
                      x={margin.left + (hourIndex + 0.5) * cellW}
                      y={margin.top + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="800"
                      fill="#0369a1"
                    >PIOGGIA {h.precip.toFixed(1)}mm</text>
                  </g>
                );
              })}

              {/* Isoterma Zero Termico */}
              {zeroThermalPath && (
                <path d={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="1.8" strokeDasharray="5 3" strokeLinecap="round" />
              )}
              {hourlyData.map((h, i) => {
                if (h.zeroThermal == null || !Number.isFinite(h.zeroThermal) || h.zeroThermal < minAlt || h.zeroThermal > maxAlt) return null;
                const x = getXFromHourIdx(i);
                const y = getYFromAlt(h.zeroThermal);
                return (
                  <g key={`snow-${i}`} transform={`translate(${x}, ${y})`}>
                    <circle cx="0" cy="0" r="6" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                    <text x="0" y="3.5" fill="#0284c7" fontSize="8" fontWeight="900" textAnchor="middle">❄</text>
                  </g>
                );
              })}

              {avgZeroThermal != null && (
                <g transform={`translate(${margin.left + plotW - 130}, ${getYFromAlt(avgZeroThermal) - 12})`}>
                  <rect x="0" y="0" width="125" height="22" rx="4" fill="#0284c7" opacity="0.9" />
                  <text x="62" y="15" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                    0 °C · {avgZeroThermal.toLocaleString("it-IT")} m
                  </text>
                </g>
              )}

              {/* Curva del Thermal Top (Sviluppo verticale convettivo) */}
              {thermalTopCurve && (
                <path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="2.2" strokeLinecap="round" />
              )}

              {/* Parapendio su Thermal Top */}
              {hourlyData.map((h, i) => {
                if (h.thermalTop == null || !Number.isFinite(h.thermalTop) || h.thermalTop < minAlt || h.thermalTop > maxAlt) return null;
                const x = getXFromHourIdx(i);
                const y = getYFromAlt(h.thermalTop);
                return (
                  <g key={`para-${i}`} transform={`translate(${x}, ${y})`}>
                    <circle cx="0" cy="0" r="8" fill="#ffffff" stroke="#7e22ce" strokeWidth="2" />
                    <path d="M -18,-12 C -12,-28 12,-28 18,-12 C 10,-18 -10,-18 -18,-12 Z" fill="#c084fc" stroke="#7e22ce" strokeWidth="2" />
                    <circle cx="0" cy="-4" r="3" fill="#7e22ce" />
                  </g>
                );
              })}

              {/* Nuvoletta Cumulo sopra la quota */}
              {hourlyData.map((h, i) => {
                if (i === 0 || i === hourlyData.length - 1 || h.thermalTop == null || !Number.isFinite(h.thermalTop) || h.thermalTop < minAlt || h.thermalTop > maxAlt || h.cloudPct == null) return null;
                const x = getXFromHourIdx(i);
                const y = getYFromAlt(h.thermalTop) - 50;
                return (
                  <g key={`cloud-${i}`} transform={`translate(${x}, ${y})`}>
                    <path d="M -20,8 A 9,9 0 0,1 -10,-5 A 12,12 0 0,1 8,-7 A 10,10 0 0,1 20,3 A 6,6 0 0,1 19,9 L -18,9 A 6,6 0 0,1 -20,8 Z" fill="#ffffff" stroke="#64748b" strokeWidth="2" />
                    <text x="0" y="7" fill="#1e293b" fontSize="10" fontWeight="900" textAnchor="middle">{h.cloudPct}%</text>
                  </g>
                );
              })}

              {/* Badge Base Cumuli & Rateo ascensionale */}
              {hourlyData.map((h, i) => {
                if (i === 0 || i === hourlyData.length - 1 || h.thermalTop == null || !Number.isFinite(h.thermalTop) || h.thermalTop < minAlt || h.thermalTop > maxAlt || h.cloudBase == null) return null;
                const x = getXFromHourIdx(i);
                const paraY = getYFromAlt(h.thermalTop);
                const badgeY = paraY + 10;
                return (
                  <g key={`badge-${i}`} transform={`translate(${x}, ${badgeY})`}>
                    <rect x="-30" y="0" width="60" height="13" rx="3" fill="#ffffff" stroke="#9333ea" strokeWidth="0.5" />
                    <text x="0" y="9.5" fill="#3b0764" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                      {h.cloudBase}m
                    </text>
                    <rect x="-35" y="15" width="70" height="13" rx="3" fill="#ffffff" stroke="#9333ea" strokeWidth="0.5" />
                    <text x="0" y="24.5" fill="#7e22ce" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                      ↑{h.thermalAvg != null && Number.isFinite(h.thermalAvg) ? h.thermalAvg.toFixed(1) : "—"} m/s
                    </text>
                  </g>
                );
              })}

              {/* Vettori Vento a vari livelli */}
              {hourlyData.map((calc, i) => (
                <g key={`col-${i}`}>
                  {calc.levelWinds.map((windLevel) => {
                    if (windLevel.speed == null || windLevel.dir == null || !Number.isFinite(windLevel.speed) || !Number.isFinite(windLevel.dir)) return null;
                    const x = getXFromHourIdx(i);
                    const y = getYFromAlt(windLevel.alt);
                    const currentHourData = hourlyData[i];
                    const isNearThermal = currentHourData.thermalTop != null && Math.abs(y - getYFromAlt(currentHourData.thermalTop)) < 15;
                    return (
                      <g key={`wb-${i}-${Math.round(windLevel.alt)}`}>
                        {renderWindBarb(x, y, windLevel.speed, windLevel.dir)}
                        {!isNearThermal && (
                          <text x={x + 22} y={y + 3} fill="#1e293b" fontSize="11" fontWeight="700" textAnchor="start" fontFamily="monospace">
                            {Math.round(windLevel.speed)}/{getDirLetter(windLevel.dir)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              ))}

              {/* Etichette Ore in Basso */}
              {HOURS.map((h, i) => (
                <text key={`hr-${h}`} x={getXFromHourIdx(i)} y={margin.top + plotH + 20} fill="#334155" fontSize="12" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                  {String(h).padStart(2, "0")}:00
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Legenda del Gradiente Termico / Stabilità (Stile Alpium Grigio perla) */}
        <div className="mt-3 pt-3 border-t border-slate-300">
          <div className="w-full max-w-2xl mx-auto px-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>← Stabile / Inversione</span>
              <span className="text-slate-900 font-extrabold">ΔT / 100 m (Gradiente Ambientale)</span>
              <span>Instabile →</span>
            </div>
            <div className="w-full h-3.5 rounded-sm flex overflow-hidden border border-slate-400">
              {STABILITY_LEGEND.map((item, idx) => (
                <div key={idx} className="flex-1 h-full" style={{ backgroundColor: item.color }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-600 mt-1">
              {STABILITY_LEGEND.map((item, idx) => (
                <span key={idx}>{item.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* REPORT METEO INTEGRATO SOTTO IL WINDGRAM */}
      {reportGenerato && (
        <div className="bg-slate-100 border border-slate-300 rounded-2xl overflow-hidden shadow-sm p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-sky-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Analisi Tecnica Windgram Aerologico</h3>
                <p className="text-xs text-slate-500">Decollo {altitude}m &middot; Stima profili Open-Meteo</p>
              </div>
            </div>
            <button
              onClick={handleCopyReport}
              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copiato" : "Copia Report"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-slate-700">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">01 · Quadro Termico &amp; Stabilità</span>
              <p>{reportGenerato.paragrafoTermico}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">02 · Profilo Vento in Quota</span>
              <p>{reportGenerato.paragrafoVento}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
