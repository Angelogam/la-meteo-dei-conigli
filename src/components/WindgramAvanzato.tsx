"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { fetchWithProxyFallback } from "@/utils/proxyFallback";

interface WindgramAvanzatoProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}

// ─────────────────────────────────────────────────────
// Constants & Layout
// ─────────────────────────────────────────────────────
const ALT_STEP = 250;
const ALT_MIN = 800;
const ALT_MAX = 4000;
const SVG_W = 900;
const SVG_H = 680;
const ML = 90;   // left margin for altitude labels
const MR = 90;   // right margin for altitude labels
const TOP = 70;  // top margin for header
const BOT = 60;  // bottom margin for time labels
const CHART_W = SVG_W - ML - MR;
const CHART_H = SVG_H - TOP - BOT;

// Lapse rate standard ~ -6.5°C/km
function tempAtAltitude(surfaceTemp: number, alt: number): number {
  return surfaceTemp + (-6.5 * (alt / 1000));
}

// Stima LCL semplificata
function estimateLCL(temp: number, dew: number): number {
  const diff = Math.max(1, temp - dew);
  return Math.max(300, Math.min(3500, diff * 125));
}

// Y coordinate from altitude
function altToY(alt: number, takeoff: number): number {
  const clamped = Math.max(takeoff, Math.min(ALT_MAX, alt));
  return BOT + CHART_H * (1 - (clamped - takeoff) / (ALT_MAX - takeoff));
}

// Wind barb SVG component
function WindBarb({
  x, y, speed, dir, color,
}: {
  x: number; y: number; speed: number; dir: number; color: string;
}) {
  const angle = ((dir - 90) * Math.PI) / 180;
  const len = 32; // Increased from 24
  const ex = x + len * Math.cos(angle);
  const ey = y + len * Math.sin(angle);

  // Barbs
  const barbs = [];
  const kmh = speed;
  let remaining = kmh;
  let tickDist = 6;
  while (remaining >= 25) { barbs.push({ dist: tickDist, type: "flag" }); remaining -= 25; tickDist += 8; }
  tickDist = 6;
  while (remaining >= 10) { barbs.push({ dist: tickDist, type: "long" }); remaining -= 10; tickDist += 6; }
  tickDist = 6;
  while (remaining >= 5) { barbs.push({ dist: tickDist, type: "short" }); remaining -= 5; tickDist += 4; }

  return (
    <g>
      {/* Stick */}
      <line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      {/* Arrow head */}
      <polygon
        points={`${x},${y} ${ex - 10 * Math.cos(angle - 0.35)},${ey - 10 * Math.sin(angle - 0.35)} ${ex - 10 * Math.cos(angle + 0.35)},${ey - 10 * Math.sin(angle + 0.35)}`}
        fill={color}
      />
      {/* Barbs */}
      {barbs.map((b, i) => {
        const px = x + b.dist * Math.cos(angle);
        const py = y + b.dist * Math.sin(angle);
        const perpX = -Math.sin(angle);
        const perpY = Math.cos(angle);
        const half = b.type === "flag" ? 12 : b.type === "long" ? 8 : 5;
        return (
          <line
            key={i}
            x1={px + half * perpX} y1={py + half * perpY}
            x2={px - half * perpX} y2={py - half * perpY}
            stroke={color} strokeWidth="2.5" strokeLinecap="round"
          />
        );
      })}
      {/* Speed text — below the barb */}
      <text
        x={x} y={y + 18}
        textAnchor="middle"
        className="fill-white font-black text-sm"
        style={{ textShadow: "0px 0px 4px rgba(0,0,0,0.9)" }}
      >
        {Math.round(kmh)}k
      </text>
    </g>
  );
}

// Parapendio icon — positioned at thermal top, below cloud
function ParapendioIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Canopy */}
      <path
        d="M -24,-6 Q -16,-28 0,-30 Q 16,-28 24,-6 Q 14,-16 0,-16 Q -14,-16 -24,-6 Z"
        fill="#ef4444"
        stroke="#7f1d1d"
        strokeWidth="2"
      />
      {/* Lines */}
      <line x1="-18" y1="-6" x2="0" y2="10" stroke="#f8fafc" strokeWidth="1.5" />
      <line x1="-8" y1="-7" x2="0" y2="10" stroke="#f8fafc" strokeWidth="1.5" />
      <line x1="8" y1="-7" x2="0" y2="10" stroke="#f8fafc" strokeWidth="1.5" />
      <line x1="18" y1="-6" x2="0" y2="10" stroke="#f8fafc" strokeWidth="1.5" />
      {/* Pilot */}
      <circle cx="0" cy="14" r="6" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
    </g>
  );
}

// Cloud icon — positioned ABOVE the paraglider
function CloudIcon({ x, y, coverage }: { x: number; y: number; coverage: number }) {
  const opacity = 0.6 + (coverage / 100) * 0.4;
  const scale = 1.0 + (coverage / 100) * 0.6;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M -18,8 Q -22,2 -16,-2 Q -18,-10 -10,-12 Q -6,-18 2,-16 Q 10,-18 14,-12 Q 22,-12 20,-4 Q 26,0 22,6 Q 24,14 16,14 L -14,14 Q -20,14 -18,8 Z"
        fill="white"
        stroke="#94a3b8"
        strokeWidth="1.5"
        opacity={opacity}
      />
      {coverage > 30 && (
        <text x="0" y="4" textAnchor="middle" className="fill-slate-700 font-black text-xs">
          {coverage.toFixed(0)}%
        </text>
      )}
    </g>
  );
}

// Snowflake for 0°C isotherm
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="8" fill="none" stroke="#0ea5e9" strokeWidth="2" />
      <g stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round">
        <line x1="0" y1="-5" x2="0" y2="5" />
        <line x1="-5" y1="0" x2="5" y2="0" />
        <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
        <line x1="-3.5" y1="3.5" x2="3.5" y2="-3.5" />
      </g>
    </g>
  );
}

// ─────────────────────────────────────────────────────
export default function WindgramAvanzato({
  latitude, longitude, altitude = 1374, siteName = "sito", selectedDay = 0,
}: WindgramAvanzatoProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d;
  }, [selectedDay]);
  const dateStr = useMemo(() => dateObj.toISOString().split("T")[0], [dateObj]);

  // Fetch hourly data
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: [
        "temperature_2m", "relative_humidity_2m", "dew_point_2m",
        "precipitation", "precipitation_probability",
        "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
        "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
        "wind_speed_80m", "wind_direction_80m",
        "wind_speed_120m", "wind_direction_120m",
        "wind_speed_180m", "wind_direction_180m",
        "wind_speed_925hPa", "wind_direction_925hPa",
        "wind_speed_850hPa", "wind_direction_850hPa",
        "wind_speed_700hPa", "wind_direction_700hPa",
        "temperature_80m", "temperature_120m",
        "shortwave_radiation",
        "freezing_level_height",
        "cape", "lifted_index", "convective_inhibition",
      ].join(","),
      timezone: "Europe/Rome",
      start_date: dateStr,
      end_date: dateStr,
    });
    fetchWithProxyFallback(params.toString())
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (mounted) { setData(json); setLoading(false); }
      })
      .catch((e: any) => {
        if (mounted) { setError(e?.message || "Errore dati"); setLoading(false); }
      });
    return () => { mounted = false; };
  }, [latitude, longitude, dateStr]);

  // Filter to useful hours (8-18)
  const columns = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times = data.hourly.time;
    const h = data.hourly;
    const targetHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

    return targetHours.map((targetHour) => {
      const idx = times.findIndex((t: string) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) return null;

      const t2m = h.temperature_2m[idx] ?? 15;
      const dew2m = h.dew_point_2m?.[idx] ?? (t2m - 6);
      const hum = h.relative_humidity_2m?.[idx] ?? 60;
      const cloud = h.cloud_cover?.[idx] ?? 30;
      const precip = h.precipitation?.[idx] ?? 0;
      const cape = h.cape?.[idx] ?? 0;
      const wind10 = h.wind_speed_10m?.[idx] ?? 5;
      const windDir10 = h.wind_direction_10m?.[idx] ?? 180;
      const wind80 = h.wind_speed_80m?.[idx] ?? wind10;
      const windDir80 = h.wind_direction_80m?.[idx] ?? windDir10;
      const wind120 = h.wind_speed_120m?.[idx] ?? wind10;
      const windDir120 = h.wind_direction_120m?.[idx] ?? windDir10;
      const wind180 = h.wind_speed_180m?.[idx] ?? wind10;
      const windDir180 = h.wind_direction_180m?.[idx] ?? windDir10;
      const freeze = h.freezing_level_height?.[idx] ?? Math.round(altitude + t2m / 0.0065);
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];

      const spread = Math.max(0.5, t2m - dew2m);
      const cloudBase = Math.round(altitude + spread * 125);

      // Rateo di ascendenza
      let rateo = 0.5 + spread * 0.07 + (cloud < 30 ? 0.3 : 0);
      if (precip > 0.3) rateo = Math.min(rateo, 0.3);
      else if (cloud > 80) rateo *= 0.35;
      if (cape > 0) rateo += Math.min(0.8, cape / 1000);
      rateo = Math.max(0.2, Math.min(3.5, Math.round(rateo * 10) / 10));

      const thermalTop = Math.round(Math.min(ALT_MAX, cloudBase + Math.min(1200, rateo * 140 + cape * 0.08)));

      // Wind at different levels
      const windLevels = [
        { alt: altitude, speed: wind10, dir: windDir10 },
        { alt: Math.min(ALT_MAX, altitude + 800), speed: wind80, dir: windDir80 },
        { alt: Math.min(ALT_MAX, altitude + 1200), speed: wind120, dir: windDir120 },
        { alt: Math.min(ALT_MAX, altitude + 1800), speed: wind180, dir: windDir180 },
      ];

      return {
        hour: targetHour, idx, cloudBase, thermalTop, freeze, rateo, cloud, precip, cape,
        t2m, dew2m, spread, windLevels,
        x: ML + ((targetHour - 8) / 10) * CHART_W,
        yCloudBase: altToY(cloudBase, altitude),
        yThermalTop: altToY(thermalTop, altitude),
        yFreeze: altToY(freeze, altitude),
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [data, altitude]);

  // Curves
  const cloudBasePath = useMemo(() => {
    if (columns.length < 2) return "";
    let d = `M ${columns[0]!.x},${columns[0]!.yCloudBase}`;
    for (let i = 1; i < columns.length; i++) {
      const prev = columns[i - 1]!, curr = columns[i]!;
      const c1x = prev.x + (curr.x - prev.x) * 0.45;
      const c1y = prev.yCloudBase - 10;
      const c2x = prev.x + (curr.x - prev.x) * 0.55;
      const c2y = curr.yCloudBase + 10;
      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${curr.x},${curr.yCloudBase}`;
    }
    return d;
  }, [columns]);

  const thermalTopPath = useMemo(() => {
    if (columns.length < 2) return "";
    let d = `M ${columns[0]!.x},${columns[0]!.yThermalTop}`;
    for (let i = 1; i < columns.length; i++) {
      const prev = columns[i - 1]!, curr = columns[i]!;
      const c1x = prev.x + (curr.x - prev.x) * 0.45;
      const c1y = prev.yThermalTop - 15;
      const c2x = prev.x + (curr.x - prev.x) * 0.55;
      const c2y = curr.yThermalTop + 15;
      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${curr.x},${curr.yThermalTop}`;
    }
    return d;
  }, [columns]);

  const freezePath = useMemo(() => {
    if (columns.length < 2) return "";
    let d = `M ${columns[0]!.x},${columns[0]!.yFreeze}`;
    for (let i = 1; i < columns.length; i++) {
      const prev = columns[i - 1]!, curr = columns[i]!;
      d += ` L ${curr.x},${curr.yFreeze}`;
    }
    return d;
  }, [columns]);

  // Loading / error states
  if (loading) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-emerald-500/30 p-6 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
        <p className="text-slate-300 font-semibold text-base">Caricamento windgram…</p>
        <p className="text-xs text-slate-500 mt-1">{siteName} · {dateStr}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-rose-500/30 p-4 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <p className="font-bold text-rose-400 text-base">Impossibile caricare i dati</p>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  const chartLeft = ML;
  const chartRight = ML + CHART_W;
  const chartTop = TOP;
  const chartBottom = SVG_H - BOT;

  return (
    <div className="bg-slate-900 rounded-2xl border border-emerald-500/30 overflow-hidden">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-auto block"
        style={{ shapeRendering: "geometricPrecision" }}
      >
        <defs>
          {/* Atmosphere gradient — instability from bottom to top */}
          <linearGradient id="instabilityBg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#022c22" />
            <stop offset="30%" stopColor="#064e3b" />
            <stop offset="60%" stopColor="#1e3a5f" />
            <stop offset="85%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Rain pattern */}
          <pattern id="rainPattern" width="8" height="8" patternTransform="rotate(75 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#3b82f6" strokeWidth="1.5" opacity="0.4" />
          </pattern>

          {/* Storm pattern */}
          <pattern id="stormPattern" width="10" height="10" patternTransform="rotate(75 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#8b5cf6" strokeWidth="2" opacity="0.5" />
          </pattern>

          {/* Ground hatch */}
          <pattern id="groundHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#0f172a" strokeWidth="1.5" opacity="0.5" />
          </pattern>

          <clipPath id="chartClip">
            <rect x={chartLeft} y={chartTop} width={CHART_W} height={CHART_H} />
          </clipPath>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#020617" />

        {/* Header */}
        <text x={SVG_W / 2} y="28" textAnchor="middle" className="fill-white font-black text-xl tracking-wide">
          {siteName.toLowerCase()} · Decollo {Math.round(altitude)}m → {ALT_MAX}m
        </text>
        <text x={SVG_W / 2} y="48" textAnchor="middle" className="fill-slate-400 font-bold text-sm">
          {dateObj.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} · Open-Meteo
        </text>

        {/* Main chart area */}
        <g clipPath="url(#chartClip)">
          {/* Atmosphere gradient background */}
          <rect x={chartLeft} y={chartTop} width={CHART_W} height={CHART_H} fill="url(#instabilityBg)" />

          {/* Weather events — rain & thunderstorm columns */}
          {columns.filter(c => c.precip > 0.05).map(col => {
            const halfW = CHART_W / (columns.length - 1 || 1) / 2;
            const yTop = altToY(ALT_MAX, altitude);
            const yBase = altToY(Math.max(altitude, col.cloudBase), altitude);
            const isStorm = col.precip > 5;
            return (
              <g key={`evt-${col.hour}`}>
                <rect
                  x={col.x - halfW} y={yTop}
                  width={halfW * 2} height={Math.max(0, yBase - yTop)}
                  fill={isStorm ? "url(#stormPattern)" : "url(#rainPattern)"}
                />
                {col.precip > 0.3 && (
                  <g transform={`translate(${col.x}, ${yTop + 15})`}>
                    <rect x="-42" y="-12" width="84" height="24" rx="5"
                      fill={isStorm ? "#4c1d95" : "#0369a1"} stroke="white" strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle"
                      className="fill-white font-black text-xs">
                      {isStorm ? "⚡" : "💧"} {col.precip.toFixed(1)} mm
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Terrain below launch */}
          {(() => {
            const launchY = altToY(altitude, altitude);
            const groundY = altToY(Math.min(ALT_MIN, altitude), altitude);
            return (
              <g>
                <rect x={chartLeft} y={launchY} width={CHART_W} height={Math.max(0, groundY - launchY)}
                  fill="url(#groundHatch)" />
                <line x1={chartLeft} y1={launchY} x2={chartLeft + CHART_W} y2={launchY}
                  stroke="#0f172a" strokeWidth="3" />
              </g>
            );
          })()}

          {/* Horizontal grid lines — every 250m */}
          {Array.from({ length: Math.floor((ALT_MAX - altitude) / ALT_STEP) + 1 }, (_, i) => {
            const alt = altitude + i * ALT_STEP;
            const y = altToY(alt, altitude);
            const surfaceT = columns[0]?.t2m ?? 15;
            const tempStr = (surfaceT - (alt - altitude) * 0.0065).toFixed(1);
            return (
              <g key={`grid-${alt}`}>
                <line x1={chartLeft} y1={y} x2={chartRight} y2={y}
                  stroke="rgba(148,163,184,0.2)" strokeWidth="0.8" />
                {/* Left side label */}
                <text x={chartLeft - 10} y={y + 5} textAnchor="end"
                  className="fill-slate-300 font-bold text-xs">
                  {alt}m
                  <tspan className="fill-sky-400"> ({tempStr}°C)</tspan>
                </text>
                {/* Right side label */}
                <text x={chartRight + 10} y={y + 5} textAnchor="start"
                  className="fill-slate-300 font-bold text-xs">
                  {alt}m
                  <tspan className="fill-sky-400"> ({tempStr}°C)</tspan>
                </text>
              </g>
            );
          })}

          {/* Vertical hour lines */}
          {columns.map((c) => (
            <line key={`vg-${c.hour}`} x1={c.x} y1={chartTop} x2={c.x} y2={chartBottom}
              stroke="rgba(148,163,184,0.15)" strokeWidth="0.7" strokeDasharray="3 3" />
          ))}

          {/* Chart border */}
          <rect x={chartLeft} y={chartTop} width={CHART_W} height={CHART_H}
            fill="none" stroke="rgba(148,163,184,0.3)" strokeWidth="1.5" />

          {/* Wind barbs at multiple levels for each hour */}
          {columns.map((col) => {
            const levels = col.windLevels;
            return levels.map((lvl, li) => {
              const y = altToY(lvl.alt, altitude);
              const kmh = lvl.speed * 3.6;
              const angle = ((lvl.dir - 90) * Math.PI) / 180;
              const len = 28;
              const ex = col.x + len * Math.cos(angle);
              const ey = y + len * Math.sin(angle);

              // Color based on speed
              const color = kmh > 60 ? "#ef4444" : kmh > 40 ? "#f59e0b" : "#f8fafc";

              return (
                <g key={`wb-${col.hour}-${lvl.alt}`}>
                  {/* Stick */}
                  <line x1={col.x} y1={y} x2={ex} y2={ey}
                    stroke={color} strokeWidth="3" strokeLinecap="round" />
                  {/* Arrow head */}
                  <polygon
                    points={`${col.x},${y} ${ex - 8 * Math.cos(angle - 0.35)},${ey - 8 * Math.sin(angle - 0.35)} ${ex - 8 * Math.cos(angle + 0.35)},${ey - 8 * Math.sin(angle + 0.35)}`}
                    fill={color}
                  />
                  {/* Speed badge */}
                  <text x={col.x + 18} y={y + 4}
                    className="fill-white font-black text-xs"
                    style={{ textShadow: "0px 0px 4px rgba(0,0,0,0.9)" }}>
                    {Math.round(kmh)}k
                  </text>
                </g>
              );
            });
          })}

          {/* 0°C isotherm (blue dashed) */}
          {columns.length >= 2 && (
            <>
              <path d={freezePath} fill="none" stroke="#0ea5e9" strokeWidth="2.5"
                strokeDasharray="6 4" opacity="0.8" />
              {columns.map((c) => (
                <SnowflakeIcon key={`sf-${c.hour}`} x={c.x} y={c.yFreeze - 14} />
              ))}
              <g transform={`translate(${chartRight - 100}, ${altToY(columns[0]?.freeze ?? 3500, altitude) - 12})`}>
                <rect width="90" height="24" rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
                <text x="45" y="16" textAnchor="middle" className="fill-sky-300 font-black text-xs">
                  0°C · {columns[0]?.freeze ?? 3500} m
                </text>
              </g>
            </>
          )}

          {/* Thermal top curve (purple solid, thick) */}
          {columns.length >= 2 && (
            <path d={thermalTopPath} fill="none" stroke="#a855f7" strokeWidth="5"
              strokeLinecap="round" opacity="0.9" />
          )}

          {/* Cloud base curve (purple dashed) */}
          {columns.length >= 2 && (
            <path d={cloudBasePath} fill="none" stroke="#c084fc" strokeWidth="1.5"
              strokeDasharray="6 3" opacity="0.6" />
          )}

          {/* Cloud badges + Paraglider icons */}
          {columns.filter(c => c.rateo >= 0.5).map((col) => {
            // Cloud positioned above paraglider
            const cloudY = col.yThermalTop - 35;
            const paraY = col.yThermalTop;

            return (
              <g key={`badge-${col.hour}`}>
                {/* Cloud — ABOVE the paraglider */}
                <CloudIcon x={col.x} y={cloudY} coverage={col.cloud} />

                {/* Paraglider — below cloud */}
                <ParapendioIcon x={col.x} y={paraY} />

                {/* Rate indicator */}
                <g transform={`translate(${col.x}, ${paraY + 32})`}>
                  <rect x="-28" y="-10" width="56" height="18" rx="4"
                    fill={col.rateo >= 1.5 ? "#dc2626" : col.rateo >= 1.0 ? "#f97316" : "#22c55e"} />
                  <text x="0" y="3" textAnchor="middle" className="fill-white font-black text-xs">
                    ↑{col.rateo.toFixed(1)} m/s
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* Hour labels */}
        {columns.map((c) => (
          <g key={`xl-${c.hour}`}>
            <line x1={c.x} y1={chartBottom} x2={c.x} y2={chartBottom + 10}
              stroke="rgba(148,163,184,0.5)" strokeWidth="2" />
            <text x={c.x} y={chartBottom + 28} textAnchor="middle"
              className="fill-slate-300 font-black text-base">
              {`${String(c.hour).padStart(2, "0")}`}
            </text>
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${chartLeft}, ${chartBottom + 50})`}>
          <rect x="0" y="0" width="8" height="8" rx="2" fill="#a855f7" />
          <text x="14" y="8" className="fill-slate-300 font-medium text-xs">Top termica</text>

          <rect x="100" y="0" width="8" height="8" rx="2" fill="#c084fc" strokeDasharray="4 2" />
          <text x="114" y="8" className="fill-slate-300 font-medium text-xs">Base nuvole</text>

          <line x1="200" y1="4" x2="220" y2="4" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4 2" />
          <text x="226" y="8" className="fill-slate-300 font-medium text-xs">0°C isoterma</text>

          <rect x="320" y="-4" width="12" height="8" rx="2" fill="url(#rainPattern)" />
          <text x="338" y="8" className="fill-slate-300 font-medium text-xs">Precipitazioni</text>
        </g>
      </svg>
    </div>
  );
}
