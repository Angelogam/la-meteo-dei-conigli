"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface SoundingData {
  pressure: number[];
  temperature: number[];
  dewPoint: number[];
  windSpeed: number[];
  windDir: number[];
  cloudCover: number[];
  cloudCoverLow: number[];
  cloudCoverMid: number[];
  cloudCoverHigh: number[];
  rh: number[];
  precipitation: number[];
  cape: number;
  cin: number;
  liftedIndex: number;
  freezingLevel: number;
}

interface SkewTDiagramProps {
  latitude: number;
  longitude: number;
  siteAltitude: number;
  siteName: string;
  selectedHour?: number;
  selectedDay?: number;
}

const W = 1000;
const H = 660;
const M = { top: 90, right: 85, bottom: 95, left: 85 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const P_BOTTOM = 1050;
const P_TOP = 100;
const T_MIN = -40;
const T_MAX = 45;
const SKEW_DEG = 30;

const PRESSURE_LEVELS = [
  { p: 500, alt: 5800 },
  { p: 550, alt: 5000 },
  { p: 600, alt: 4400 },
  { p: 650, alt: 3750 },
  { p: 700, alt: 3100 },
  { p: 750, alt: 2500 },
  { p: 800, alt: 1950 },
  { p: 850, alt: 1450 },
];

const ALT_TICKS = [6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500];

// Scala colori stabilità Alpium (-0.20 -> 1.20)
const STABILITY_SCALE = [
  { val: -0.20, color: "#8a5bb8" }, // viola
  { val: 0.00, color: "#4f7fd9" },  // blu
  { val: 0.16, color: "#45b3cd" },  // azzurro ciano
  { val: 0.32, color: "#4ec099" },  // verde acqua
  { val: 0.48, color: "#8bc953" },  // verde chiaro
  { val: 0.65, color: "#d8c728" },  // giallo verde
  { val: 0.82, color: "#eeb319" },  // giallo oro
  { val: 0.98, color: "#e86c1f" },  // arancione
  { val: 1.20, color: "#c92e1e" },  // rosso scuro
];

function pToY(p: number): number {
  const logP = Math.log(p);
  return M.top + PH * (logP - Math.log(P_TOP)) / (Math.log(P_BOTTOM) - Math.log(P_TOP));
}

function tToX(t: number, p: number): number {
  const normT = (t - T_MIN) / (T_MAX - T_MIN);
  const skew = Math.tan(SKEW_DEG * Math.PI / 180)
    * (Math.log(p) - Math.log(P_BOTTOM))
    / (Math.log(P_TOP) - Math.log(P_BOTTOM))
    * PW;
  return M.left + normT * PW + skew + PW * 0.05;
}

function renderWindBarb(x: number, y: number, speedKmh: number, dirDeg: number): React.ReactNode {
  if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
  const knots = speedKmh * 0.539957;
  const angle = ((dirDeg - 90) * Math.PI) / 180;
  const staffLen = 22;
  const endX = x + staffLen * Math.cos(angle);
  const endY = y + staffLen * Math.sin(angle);
  const barbColor = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#3b82f6";
  const barbAngle = angle + (115 * Math.PI) / 180;

  const elems: React.ReactNode[] = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;

  // Pennacchio 50 nodi
  while (rem >= 50 && pos >= 0.3) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    elems.push(
      <polygon key={`p50-${x}-${y}-${pos}`} points={`${bx},${by} ${bx + 11 * Math.cos(barbAngle)},${by + 11 * Math.sin(barbAngle)} ${bx + 5.5 * Math.cos(angle)},${by + 5.5 * Math.sin(angle)}`} fill={barbColor} stroke={barbColor} strokeWidth="1" />
    );
    rem -= 50;
    pos -= 0.28;
  }

  // Alette 10 nodi
  while (rem >= 10 && pos >= 0.2) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    elems.push(
      <line key={`l10-${x}-${y}-${pos}`} x1={bx} y1={by} x2={bx + 10 * Math.cos(barbAngle)} y2={by + 10 * Math.sin(barbAngle)} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
    );
    rem -= 10;
    pos -= 0.18;
  }

  // Alette 5 nodi
  if (rem >= 5 && pos >= 0.2) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    elems.push(
      <line key={`l5-${x}-${y}`} x1={bx} y1={by} x2={bx + 5.5 * Math.cos(barbAngle)} y2={by + 5.5 * Math.sin(barbAngle)} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
    );
  }

  return (
    <g key={`wb-${Math.round(x)}-${Math.round(y)}`}>
      <line x1={x} y1={y} x2={endX} y2={endY} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
      {elems}
    </g>
  );
}

function getStabilityColor(deltaT: number): string {
  if (deltaT <= -0.1) return STABILITY_SCALE[0].color;
  if (deltaT <= 0.08) return STABILITY_SCALE[1].color;
  if (deltaT <= 0.24) return STABILITY_SCALE[2].color;
  if (deltaT <= 0.40) return STABILITY_SCALE[3].color;
  if (deltaT <= 0.56) return STABILITY_SCALE[4].color;
  if (deltaT <= 0.73) return STABILITY_SCALE[5].color;
  if (deltaT <= 0.90) return STABILITY_SCALE[6].color;
  if (deltaT <= 1.10) return STABILITY_SCALE[7].color;
  return STABILITY_SCALE[8].color;
}

export default function SkewTDiagram({
  latitude, longitude, siteAltitude, siteName,
  selectedHour = 12, selectedDay = 1
}: SkewTDiagramProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const dateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d;
  }, [selectedDay]);

  const dateStr = useMemo(() => dateObj.toISOString().split("T")[0], [dateObj]);

  const formattedDateTitle = useMemo(() => {
    if (selectedDay === 1) {
      // Show actual date when tomorrow is selected
      const days = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
      const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
      return `${days[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
    }
    const days = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return `${days[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
  }, [dateObj, selectedDay]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

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

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${hourlyParams}&timezone=Europe/Rome&start_date=${dateStr}&end_date=${dateStr}`;

    fetchMeteo();
    async function fetchMeteo() {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
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
    }

    return () => { isMounted = false; };
  }, [latitude, longitude, dateStr]);

  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  const hourlyData = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times: string[] = data.hourly.time;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) {
        return {
          hour: targetHour,
          sunPct: 80,
          thermalAvg: 1.2,
          tempGround: 19,
          windGround: 8,
          windDirGround: 180,
          precip: 0,
          cloudCover: 10,
          zeroThermal: 4380,
          thermalTop: siteAltitude + 900,
          cloudBase: siteAltitude + 800,
          cloudPct: 5,
          deltaT: 0.75,
          levelWinds: LEVELS.map((l) => ({ ...l, speed: 12, dir: 240 })),
        };
      }

      const h = data.hourly;
      const t = h.temperature_2m[idx] ?? 18;
      const dew = h.dew_point_2m[idx] ?? (t - 8);
      const rad = h.shortwave_radiation?.[idx] ?? 600;
      const cloud = h.cloud_cover?.[idx] ?? 10;
      const precip = h.precipitation?.[idx] ?? 0;
      const wind10 = h.wind_speed_10m?.[idx] ?? 7;
      const windDir10 = h.wind_direction_10m?.[idx] ?? 180;
      const freeze = h.freezing_level_height?.[idx] ?? (siteAltitude + (t / 0.0098) * 100);
      const cape = h.cape?.[idx] ?? 350;

      const sunPct = Math.min(100, Math.max(10, Math.round(((rad / 900) * (1 - (cloud / 100) * 0.65)) * 100)));

      const spread = Math.max(1, t - dew);
      const cloudBase = Math.round(siteAltitude + spread * 125);
      const cloudPct = Math.max(2, Math.min(95, Math.round(cloud)));

      let deltaT = 0.72;
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];
      if (t80 != null) deltaT = Math.round(((t - t80) / 78) * 100 * 100) / 100;
      else if (t120 != null) deltaT = Math.round(((t - t120) / 118) * 100 * 100) / 100;
      else deltaT = spread >= 10 ? 0.98 : spread >= 6 ? 0.82 : 0.65;

      let rateo = 0.6 + (spread * 0.08) + (sunPct / 100) * 0.45 + (cape > 200 ? (cape / 1000) * 0.4 : 0);
      if (precip > 0.4) rateo = 0.3;
      else if (cloud > 80) rateo *= 0.4;
      rateo = Math.max(0.4, Math.min(2.5, Math.round(rateo * 10) / 10));

      const thermalTop = Math.round(Math.min(3600, cloudBase + Math.min(700, rateo * 220 + cape * 0.3)));

      const levelWinds = [
        { hpa: 500, alt: 5800, speed: h.wind_speed_500hPa?.[idx] ?? (wind10 * 2.8), dir: h.wind_direction_500hPa?.[idx] ?? (windDir10 + 40) },
        { hpa: 550, alt: 5000, speed: (h.wind_speed_500hPa?.[idx] ? h.wind_speed_500hPa[idx] * 0.9 : wind10 * 2.5), dir: (h.wind_direction_500hPa?.[idx] ?? windDir10) + 30 },
        { hpa: 600, alt: 4400, speed: h.wind_speed_600hPa?.[idx] ?? (wind10 * 2.1), dir: h.wind_direction_600hPa?.[idx] ?? (windDir10 + 20) },
        { hpa: 650, alt: 3750, speed: (h.wind_speed_700hPa?.[idx] ? h.wind_speed_700hPa[idx] * 1.15 : wind10 * 1.8), dir: (h.wind_direction_700hPa?.[idx] ?? windDir10) + 15 },
        { hpa: 700, alt: 3100, speed: h.wind_speed_700hPa?.[idx] ?? (wind10 * 1.5), dir: h.wind_direction_700hPa?.[idx] ?? (windDir10 + 10) },
        { hpa: 750, alt: 2500, speed: (h.wind_speed_850hPa?.[idx] ? h.wind_speed_850hPa[idx] * 1.15 : wind10 * 1.3), dir: (h.wind_direction_850hPa?.[idx] ?? windDir10) + 5 },
        { hpa: 800, alt: 1950, speed: (h.wind_speed_850hPa?.[idx] ? h.wind_speed_850hPa[idx] * 0.95 : wind10 * 1.1), dir: h.wind_direction_850hPa?.[idx] ?? windDir10 },
        { hpa: 850, alt: 1450, speed: h.wind_speed_850hPa?.[idx] ?? wind10, dir: h.wind_direction_850hPa?.[idx] ?? windDir10 },
      ];

      return {
        hour: targetHour,
        sunPct,
        thermalAvg: rateo,
        tempGround: Math.round(t),
        windGround: Math.round(wind10),
        windDirGround: Math.round(windDir10),
        precip,
        cloudCover: cloud,
        zeroThermal: Math.round(freeze),
        thermalTop,
        cloudBase,
        cloudPct,
        deltaT,
        levelWinds,
      };
    });
  }, [data, siteAltitude]);

  const zeroThermalPath = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [hourlyData]);

  const thermalTopCurve = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData
      .map((h, i) => `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(h.thermalTop)}`)
      .join(" ");
  }, [hourlyData]);

  const avgZeroThermal = useMemo(() => {
    if (hourlyData.length === 0) return 4381;
    const sum = hourlyData.reduce((acc, h) => acc + h.zeroThermal, 0);
    return Math.round(sum / hourlyData.length);
  }, [hourlyData]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-300 shadow-2xl">
        <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
        <span className="text-lg font-bold text-white">Caricamento Grafico Aerologico Alpium...</span>
        <span className="text-sm text-slate-400 mt-1">Interrogazione Open-Meteo per {siteName} ({siteAltitude}m)</span>
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
    <div className="w-full overflow-x-auto">
      {/* Titolo Principale in Alto */}
      <div className="text-center pb-2">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight lowercase">
          {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
        </h2>
        <p className="text-[11px] sm:text-xs text-slate-500 font-mono tracking-wide mt-0.5">
          plotted {dateStr} 00:00 UTC &middot; model ground {Math.round(siteAltitude + 5)} m &middot; SRTM {Math.round(siteAltitude)} m
        </p>
      </div>
    </div>
  );
}

const LEVELS = [
  { hpa: 500, alt: 5800 },
  { hpa: 550, alt: 5000 },
  { hpa: 600, alt: 4400 },
  { hpa: 650, alt: 3750 },
  { hpa: 700, alt: 3100 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 1950 },
  { hpa: 850, alt: 1450 },
];

function getXFromHourIdx(idx: number): number {
  const M = { left: 85, right: 85 };
  const W = 1000;
  const PW = W - M.left - M.right;
  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  return M.left + (idx / (HOURS.length - 1)) * PW;
}

function getYFromAlt(alt: number): number {
  const M = { top: 90 };
  const H = 660;
  const PH = H - M.top - 70;
  const minAlt = 1300;
  const maxAlt = 6000;
  const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
  return M.top + PH - ((clamped - minAlt) / (maxAlt - minAlt)) * PH;
}