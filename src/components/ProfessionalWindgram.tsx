"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { fetchWithProxyFallback } from "@/utils/proxyFallback";

interface WindgramProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}

// ─────────────────────────────────────────────────────
// Layout — Alpium style
// ─────────────────────────────────────────────────────
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
const NUM_HOURS = HOURS.length;

const SVG_W = 1400;
const HEADER_H = 130;
const PLOT_TOP = HEADER_H;
const PLOT_H = 680;
const FOOTER_H = 110;
const TOTAL_H = HEADER_H + PLOT_H + FOOTER_H;
const ML = 175;   // left margin for altitude/temp labels
const MR = 95;    // right margin for altitude labels
const GW = SVG_W - ML - MR;
const GH = PLOT_H;

const ALT_MIN = 1000;
const ALT_MAX = 4000;
const ALT_STEP = 250;

// Wind direction abbreviations
const DIR_ABBREV: Record<number, string> = {
  0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SO", 270: "O", 315: "NO",
};
function getDirAbbrev(deg: number): string {
  const dirs = ["N", "NO", "O", "SO", "S", "SE", "E", "NE"];
  return dirs[Math.round(deg / 45) % 8];
}

// ─────────────────────────────────────────────────────
// ΔT color scale (Alpium) — from purple (stable) to red (unstable)
// ─────────────────────────────────────────────────────
const DT_STOPS = [
  { val: -0.20, color: "#6d28d9" },
  { val: -0.05, color: "#4338ca" },
  { val:  0.00, color: "#1d4ed8" },
  { val:  0.16, color: "#0e7490" },
  { val:  0.32, color: "#047857" },
  { val:  0.48, color: "#4d7c0f" },
  { val:  0.65, color: "#a16207" },
  { val:  0.82, color: "#c2410c" },
  { val:  1.00, color: "#b91c1c" },
  { val:  1.20, color: "#7f1d1d" },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbStr(r: number, g: number, b: number, a = 1): string {
  const ra = Math.max(0, Math.min(255, Math.round(r)));
  const ga = Math.max(0, Math.min(255, Math.round(g)));
  const ba = Math.max(0, Math.min(255, Math.round(b)));
  return `rgba(${ra},${ga},${ba},${a})`;
}
function blendColors(c1: string, c2: string, f: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbStr(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f);
}
function getDTColor(dt: number): string {
  if (dt <= DT_STOPS[0].val) return DT_STOPS[0].color;
  if (dt >= DT_STOPS[DT_STOPS.length - 1].val) return DT_STOPS[DT_STOPS.length - 1].color;
  for (let i = 0; i < DT_STOPS.length - 1; i++) {
    if (dt >= DT_STOPS[i].val && dt <= DT_STOPS[i + 1].val) {
      const f = (dt - DT_STOPS[i].val) / (DT_STOPS[i + 1].val - DT_STOPS[i].val);
      return blendColors(DT_STOPS[i].color, DT_STOPS[i + 1].color, f);
    }
  }
  return DT_STOPS[DT_STOPS.length - 1].color;
}

// ─────────────────────────────────────────────────────
// Coordinate helpers
// ─────────────────────────────────────────────────────
function altToY(alt: number): number {
  const a = Math.max(ALT_MIN, Math.min(ALT_MAX, alt));
  return PLOT_TOP + GH * (1 - (a - ALT_MIN) / (ALT_MAX - ALT_MIN));
}
function xFromIdx(i: number): number {
  if (NUM_HOURS <= 1) return ML + GW / 2;
  return ML + (i / (NUM_HOURS - 1)) * GW;
}

// Catmull-Rom → cubic Bézier
function toBezier(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const p2 = pts[Math.min(i + 1, pts.length - 1)];
    d += ` C ${p0.x + (p1.x - p0.x) / 3},${p0.y + (p1.y - p0.y) / 3} ${p1.x - (p2.x - p1.x) / 3},${p1.y - (p2.y - p1.y) / 3} ${p1.x},${p1.y}`;
  }
  return d;
}

// ─────────────────────────────────────────────────────
// Snowflake icon (0°C isotherm)
// ─────────────────────────────────────────────────────
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="10" fill="#fff" stroke="#0284c7" strokeWidth="2" />
      <g stroke="#0284c7" strokeWidth="1.4" strokeLinecap="round">
        <line x1="0" y1="-6" x2="0" y2="6" />
        <line x1="-6" y1="0" x2="6" y2="0" />
        <line x1="-4.2" y1="-4.2" x2="4.2" y2="4.2" />
        <line x1="-4.2" y1="4.2" x2="4.2" y2="-4.2" />
      </g>
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Cloud puff (at LCL, above paraglider)
// ─────────────────────────────────────────────────────
function CloudPuff({ x, y, pct }: { x: number; y: number; pct: number }) {
  const opacity = 0.55 + (pct / 100) * 0.45;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        d="M -20 10 C -24 10, -26 5, -24 1 C -22 -4, -16 -6, -12 -6 C -10 -12, -3 -14, 4 -12 C 11 -14, 18 -10, 20 -5 C 26 -4, 28 3, 26 8 C 26 13, 21 14, 17 14 L -17 14 C -21 14, -22 13, -20 10 Z"
        fill="white"
        stroke="#94a3b8"
        strokeWidth="1.8"
        opacity={opacity}
      />
      {pct > 20 && (
        <text x="0" y="5" textAnchor="middle" className="fill-slate-700 font-black text-[10px]">
          {pct}%
        </text>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Wind barb
// ─────────────────────────────────────────────────────
function WindBarb({
  cx, cy, speedKmh, dirDeg,
}: {
  cx: number; cy: number; speedKmh: number; dirDeg: number;
}) {
  const angle = ((dirDeg - 90) * Math.PI) / 180;
  const len = 22;
  const ex = cx + len * Math.cos(angle);
  const ey = cy + len * Math.sin(angle);

  const color = speedKmh > 60 ? "#ef4444" : speedKmh > 40 ? "#f59e0b" : "#0f172a";

  // Barbs calculation
  const barbs = [];
  let remaining = speedKmh;
  let d = 5;
  while (remaining >= 25) { barbs.push({ d, type: "flag" as const }); remaining -= 25; d += 7; }
  d = 5;
  while (remaining >= 10) { barbs.push({ d, type: "long" as const }); remaining -= 10; d += 5; }
  d = 5;
  while (remaining >= 5) { barbs.push({ d, type: "short" as const }); remaining -= 5; d += 4; }

  return (
    <g>
      {/* Stick */}
      <line x1={cx} y1={cy} x2={ex} y2={ey}
        stroke={color} strokeWidth="3" strokeLinecap="round" />
      {/* Arrow head */}
      <polygon
        points={`${cx},${cy} ${ex - 7 * Math.cos(angle - 0.35)},${ey - 7 * Math.sin(angle - 0.35)} ${ex - 7 * Math.cos(angle + 0.35)},${ey - 7 * Math.sin(angle + 0.35)}`}
        fill={color}
      />
      {/* Barbs */}
      {barbs.map((b, i) => {
        const px = cx + b.d * Math.cos(angle);
        const py = cy + b.d * Math.sin(angle);
        const px2 = px - 7 * Math.sin(angle);
        const py2 = py + 7 * Math.cos(angle);
        return (
          <line key={i} x1={px} y1={py} x2={px2} y2={py2}
            stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        );
      })}
      {/* Speed text — below the barb */}
      <text x={cx} y={cy + 18} textAnchor="middle"
        className="fill-slate-900 font-black text-xs"
        style={{ textShadow: "0px 0px 3px rgba(255,255,255,0.8)" }}>
        {Math.round(speedKmh)}
      </text>
      {/* Direction label — small, to the right */}
      <text x={cx + 14} y={cy - 8} textAnchor="start"
        className="fill-slate-700 font-bold text-[9px]">
        {getDirAbbrev(dirDeg)}
      </text>
    </g>
  );
}

// ─────────────────────────────────────────────────────
export default function ProfessionalWindgram({
  latitude, longitude, altitude = 1374, siteName = "sito", selectedDay = 0,
}: WindgramProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // ── Fetch data ─────────────────────────────────────
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
        "wind_speed_600hPa", "wind_direction_600hPa",
        "wind_speed_500hPa", "wind_direction_500hPa",
        "temperature_80m", "temperature_120m",
        "shortwave_radiation", "direct_radiation",
        "freezing_level_height",
        "cape", "lifted_index", "convective_inhibition",
        "sunshine_duration",
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

  // ── Build columns ──────────────────────────────────
  const columns = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times = data.hourly.time;
    const h = data.hourly;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t: string) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) return null;

      const t2m = h.temperature_2m[idx] ?? 15;
      const dew2m = h.dew_point_2m?.[idx] ?? (t2m - 6);
      const hum = h.relative_humidity_2m?.[idx] ?? 60;
      const rad = h.shortwave_radiation?.[idx] ?? 400;
      const cloud = h.cloud_cover?.[idx] ?? 30;
      const precip = h.precipitation?.[idx] ?? 0;
      const cape = h.cape?.[idx] ?? 0;
      const cin = h.convective_inhibition?.[idx] ?? 0;
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

      // Spread = temp - dew point → cloud base estimator
      const spread = Math.max(0.5, t2m - dew2m);
      const cloudBase = Math.round(altitude + spread * 125); // LCL estimation
      const sunPct = Math.min(100, Math.max(5, Math.round((rad / 950) * (1 - cloud / 100 * 0.7) * 100)));

      // Rateo di ascendenza (m/s)
      let rateo = 0.5 + spread * 0.07 + (sunPct / 100) * 0.4 + (cape > 100 ? Math.min(1.0, cape / 800) : 0);
      if (precip > 0.3) rateo = Math.min(rateo, 0.3);
      else if (cloud > 80) rateo *= 0.35;
      if (cin > 100) rateo *= 0.5;
      rateo = Math.max(0.2, Math.min(3.0, Math.round(rateo * 10) / 10));

      const hourFrac = (targetHour - 8) / 10;
      const sineEnvelope = Math.sin(hourFrac * Math.PI);
      const thermalTop = Math.round(Math.min(ALT_MAX, cloudBase + Math.min(1000, rateo * 120 + cape * 0.08 + sineEnvelope * 200)));

      // Surface ΔT/100m
      const surfaceDeltaT = t80 != null ? Math.round(((t2m - t80) / 78) * 100 * 100) / 100
        : t120 != null ? Math.round(((t2m - t120) / 118) * 100 * 100) / 100
        : spread >= 10 ? 0.95 : spread >= 5 ? 0.72 : 0.55;

      // Wind levels for interpolation
      const rawLevels = [
        { alt: altitude, speed: wind10, dir: windDir10 },
        { alt: Math.min(ALT_MAX, altitude + 800), speed: wind80, dir: windDir80 },
        { alt: Math.min(ALT_MAX, altitude + 1200), speed: wind120, dir: windDir120 },
        { alt: Math.min(ALT_MAX, altitude + 1800), speed: wind180, dir: windDir180 },
      ];

      return {
        hour: targetHour, idx,
        x: xFromIdx(HOURS.indexOf(targetHour)),
        t2m, dew2m, hum, spread, cloud, precip, cape,
        wind10, windDir10, sunPct,
        surfaceDeltaT, rateo,
        cloudBase, thermalTop, freeze,
        rawLevels,
        yCloudBase: altToY(cloudBase),
        yThermalTop: altToY(thermalTop),
        yFreeze: altToY(freeze),
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [data, altitude]);

  // ── Pre-compute lapse rate at every altitude per column ──
  const lapseMatrix = useMemo(() => {
    return columns.map(col => {
      const rates: { alt: number; dt: number }[] = [];
      // Sample at every 250m
      for (let a = ALT_MIN; a <= ALT_MAX; a += ALT_STEP) {
        // Approximate temperature at a using standard lapse rate from surface
        const surfaceT = col.t2m;
        const altDiff = a - altitude;
        const tempAtA = surfaceT - altDiff * 0.0065;
        const tempBelow = surfaceT - (altDiff - 150) * 0.0065;
        const tempAbove = surfaceT - (altDiff + 150) * 0.0065;
        const dt = ((tempAbove - tempBelow) / 300) * 100;
        rates.push({ alt: a, dt });
      }
      return rates;
    });
  }, [columns, altitude]);

  // ── Curves ─────────────────────────────────────────
  const cloudBasePath = useMemo(() => {
    if (columns.length < 2) return "";
    return toBezier(columns.map(c => ({ x: c.x, y: c.yCloudBase })));
  }, [columns]);

  const thermalTopPts = useMemo(() => columns.map(c => ({ x: c.x, y: c.yThermalTop })), [columns]);
  const thermalTopPath = useMemo(() => toBezier(thermalTopPts), [thermalTopPts]);

  const freezePts = useMemo(() => columns.map(c => ({ x: c.x, y: c.yFreeze })), [columns]);
  const freezePath = useMemo(() => toBezier(freezePts), [freezePts]);

  const avgFreeze = useMemo(
    () => columns.length ? Math.round(columns.reduce((s, c) => s + c.freeze, 0) / columns.length) : altitude + 3200,
    [columns, altitude]
  );

  // Boundary altitudes (PBL)
  const boundaryAlts = useMemo(() =>
    columns.map(c => {
      const hf = (c.hour - 8) / 10;
      const sine = Math.sin(hf * Math.PI);
      return Math.min(ALT_MAX - 50, Math.max(ALT_MIN + 80, Math.round(ALT_MIN + 180 + sine * (c.rateo * 180 + c.cape * 0.06 + 140))));
    }), [columns]
  );
  const boundaryYPts = useMemo(
    () => columns.map((c, i) => ({ x: c.x, y: altToY(boundaryAlts[i]) })), [columns, boundaryAlts]
  );

  // ── Loading / error ────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 p-8 flex flex-col items-center justify-center min-h-[420px]">
        <RefreshCw className="w-10 h-10 text-violet-500 animate-spin mb-3" />
        <p className="text-slate-600 font-semibold text-base">Caricamento windgram…</p>
        <p className="text-xs text-slate-400 mt-1">{siteName} · {dateStr}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white rounded-[28px] shadow-2xl border border-rose-300 p-6 text-center">
        <AlertTriangle className="w-9 h-9 mx-auto mb-2 text-rose-400" />
        <p className="font-bold text-rose-600 text-base">Impossibile caricare i dati</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  // ── Render SVG ─────────────────────────────────────
  const plotLeft = ML;
  const plotRight = ML + GW;
  const plotBottom = PLOT_TOP + GH;
  const xStep = GW / (NUM_HOURS - 1);
  const halfW = xStep / 2;

  return (
    <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
      <svg
        viewBox={`0 0 ${SVG_W} ${TOTAL_H}`}
        className="w-full h-auto block"
        style={{ shapeRendering: "geometricPrecision" }}
      >
        <defs>
          <clipPath id="graphClip">
            <rect x={plotLeft} y={PLOT_TOP} width={GW} height={GH} />
          </clipPath>

          {/* Rain pattern */}
          <pattern id="rainPattern" width="10" height="10" patternTransform="rotate(70 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#0284c7" strokeWidth="2" opacity="0.5" />
          </pattern>
          {/* Storm pattern */}
          <pattern id="stormPattern" width="12" height="12" patternTransform="rotate(75 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#4c1d95" strokeWidth="3" opacity="0.65" />
          </pattern>
          {/* Ground hatch */}
          <pattern id="groundHatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#0f172a" strokeWidth="1.8" opacity="0.4" />
          </pattern>

          {/* Drop shadow */}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* White background */}
        <rect x="0" y="0" width={SVG_W} height={TOTAL_H} fill="#ffffff" />

        {/* ══════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ══════════════════════════════════════════════════ */}
        <text x={SVG_W / 2} y="30" textAnchor="middle" className="fill-slate-900 font-black text-3xl tracking-wide">
          {siteName.toLowerCase()} · {formattedDateTitle.toLowerCase()}
        </text>
        <text x={SVG_W / 2} y="50" textAnchor="middle" className="fill-slate-500 font-bold text-xs">
          Meteo Open-Meteo / AROME · Evidenziazione Grafica Fenomeni Precipitativi
        </text>

        {/* Top strip: average rateo per hour */}
        <text x={ML - 20} y="65" textAnchor="end" className="fill-slate-500 font-black text-xs">ASCENDENZE</text>
        <text x={ML - 20} y="82" textAnchor="end" className="fill-slate-500 font-black text-xs">SOLE %</text>
        {columns.map((c) => (
          <g key={`head-${c.hour}`}>
            <text x={c.x} y="65" textAnchor="middle"
              className={c.rateo >= 1.6 ? "fill-red-600 font-black text-sm" : c.rateo >= 1.0 ? "fill-orange-600 font-black text-sm" : "fill-slate-900 font-black text-sm"}>
              {c.rateo.toFixed(1)}
            </text>
            <text x={c.x} y="82" textAnchor="middle" className="fill-blue-600 font-extrabold text-xs">
              {c.cloud.toFixed(0)}%
            </text>
          </g>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* GRAPH AREA — clipped */}
        {/* ══════════════════════════════════════════════════ */}
        <g clipPath="url(#graphClip)">

          {/* ══════════════════════════════════════════════════ */}
          {/* STABILITY BANDS — colored cells based on ΔT/100m */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.map((col, ci) => {
            const dtRates = lapseMatrix[ci]!;
            return dtRates.map((lr) => {
              const cellY = altToY(lr.alt + ALT_STEP / 2);
              const cellH = altToY(lr.alt) - altToY(lr.alt + ALT_STEP);
              return (
                <rect
                  key={`cell-${col.hour}-${lr.alt}`}
                  x={col.x - halfW} y={cellY}
                  width={halfW * 2} height={Math.max(1, cellH)}
                  fill={getDTColor(lr.dt)}
                  opacity="0.72"
                />
              );
            });
          })}

          {/* ══════════════════════════════════════════════════ */}
          {/* RAIN / THUNDERSTORM columns */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.filter(c => c.precip > 0.05).map((col) => {
            const isStorm = col.precip > 5;
            const yBase = altToY(Math.max(ALT_MIN, col.cloudBase));
            return (
              <g key={`evt-${col.hour}`}>
                <rect x={col.x - halfW} y={altToY(ALT_MAX)} width={halfW * 2} height={yBase - altToY(ALT_MAX)}
                  fill={isStorm ? "url(#stormPattern)" : "url(#rainPattern)"} />
                {col.precip > 0.3 && (
                  <g transform={`translate(${col.x}, ${altToY(ALT_MAX) + 18})`}>
                    <rect x="-35" y="-14" width="70" height="22" rx="4"
                      fill={isStorm ? "#3b0764" : "#0284c7"} stroke="white" strokeWidth="1.5" />
                    <text x="0" y="1" textAnchor="middle"
                      className="fill-white font-black text-[10px]">
                      {isStorm ? "⚡" : "💧"} {col.precip.toFixed(1)} mm
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ══════════════════════════════════════════════════ */}
          {/* GROUND / TERRAIN below launch */}
          {/* ══════════════════════════════════════════════════ */}
          {(() => {
            const launchY = altToY(Math.round(altitude));
            const groundY = altToY(ALT_MIN);
            return (
              <g>
                <rect x={plotLeft} y={launchY} width={GW} height={Math.max(0, groundY - launchY)}
                  fill="url(#groundHatch)" />
                <line x1={plotLeft} y1={launchY} x2={plotLeft + GW} y2={launchY}
                  stroke="#0f172a" strokeWidth="3" />
              </g>
            );
          })()}

          {/* ══════════════════════════════════════════════════ */}
          {/* CROSS-HATCH — unstable column zones (ΔT > 0.55) */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.map((col, ci) => {
            if (col.surfaceDeltaT < 0.55) return null;
            const bY = altToY(boundaryAlts[ci]);
            const xL = col.x - halfW;
            const xR = col.x + halfW;
            const lines: React.ReactNode[] = [];
            const sp = 6;
            for (let hx = xL - GH; hx < xR + GH; hx += sp) {
              lines.push(
                <line key={`d-${ci}-${hx}`} x1={hx} y1={bY} x2={hx + (plotBottom - bY)} y2={plotBottom}
                  stroke="rgba(0,0,0,0.13)" strokeWidth="0.85" />,
                <line key={`u-${ci}-${hx}`} x1={hx} y1={plotBottom} x2={hx + (plotBottom - bY)} y2={bY}
                  stroke="rgba(0,0,0,0.13)" strokeWidth="0.85" />
              );
            }
            return <g key={`ch-${ci}`}>{lines}</g>;
          })}

          {/* ══════════════════════════════════════════════════ */}
          {/* HORIZONTAL GRID LINES + LABELS */}
          {/* ══════════════════════════════════════════════════ */}
          {(() => {
            const launchAlt = Math.round(altitude);
            const altStart = Math.floor((launchAlt - 1) / ALT_STEP) * ALT_STEP;
            const els: React.ReactNode[] = [];
            const surfaceT = Math.round(columns[0]?.t2m ?? 20);
            for (let a = altStart; a <= ALT_MAX; a += ALT_STEP) {
              const y = altToY(a);
              const tempStr = (surfaceT - (a - ALT_MIN) * 0.0065).toFixed(1);
              els.push(
                <g key={`grid-${a}`}>
                  <line x1={plotLeft} y1={y} x2={plotRight} y2={y}
                    stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
                  {/* Left: temperature */}
                  <text x={plotLeft - 15} y={y + 5} textAnchor="end"
                    className="fill-slate-900 font-black text-xs">
                    {a} m
                    <tspan className="fill-blue-600 font-bold"> ({tempStr}°C)</tspan>
                  </text>
                  {/* Right: altitude */}
                  <text x={plotRight + 15} y={y + 5} textAnchor="start"
                    className="fill-slate-900 font-black text-xs">
                    {a} m
                  </text>
                </g>
              );
            }
            return <g>{els}</g>;
          })()}

          {/* ══════════════════════════════════════════════════ */}
          {/* VERTICAL HOUR LINES */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.map((c) => (
            <line key={`vg-${c.hour}`} x1={c.x} y1={PLOT_TOP} x2={c.x} y2={plotBottom}
              stroke="rgba(148,163,184,0.35)" strokeWidth="0.7" strokeDasharray="3 3" />
          ))}

          {/* ══════════════════════════════════════════════════ */}
          {/* PLOT BORDER */}
          {/* ══════════════════════════════════════════════════ */}
          <rect x={plotLeft} y={PLOT_TOP} width={GW} height={GH}
            fill="none" stroke="#0f172a" strokeWidth="1.5" />

          {/* ══════════════════════════════════════════════════ */}
          {/* WIND BARBS — one per altitude step per hour */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.map((col) => {
            const rates = lapseMatrix[HOURS.indexOf(col.hour)]!;
            return rates.map((lr) => {
              const y = altToY(lr.alt);
              // Interpolate wind at this altitude
              const lvl = col.rawLevels;
              const alt = lr.alt;
              let wSpeed = col.wind10;
              let wDir = col.windDir10;
              for (let li = 0; li < lvl.length - 1; li++) {
                const aBelow = lvl[li]!.alt;
                const aAbove = lvl[li + 1]!.alt;
                if (alt >= aBelow && alt <= aAbove) {
                  const f = (alt - aBelow) / (aAbove - aBelow);
                  wSpeed = lvl[li]!.speed + f * (lvl[li + 1]!.speed - lvl[li]!.speed);
                  wDir = lvl[li]!.dir + f * (lvl[li + 1]!.dir - lvl[li]!.dir);
                  if (wDir < 0) wDir += 360;
                  if (wDir >= 360) wDir -= 360;
                  break;
                }
              }
              const speedKmh = wSpeed * 3.6;
              return (
                <WindBarb
                  key={`wb-${col.hour}-${lr.alt}`}
                  cx={col.x} cy={y}
                  speedKmh={speedKmh}
                  dirDeg={wDir}
                />
              );
            });
          })}

          {/* ══════════════════════════════════════════════════ */}
          {/* 0°C ISOTHERM (blue dashed + snowflakes + badge) */}
          {/* ══════════════════════════════════════════════════ */}
          {freezePts.length >= 2 && (
            <>
              <path d={freezePath} fill="none" stroke="#0284c7" strokeWidth="2.5"
                strokeDasharray="6 4" filter="url(#shadow)" />
              {freezePts.map((p, i) => (
                <SnowflakeIcon key={`sf-${i}`} x={p.x} y={p.y - 14} />
              ))}
              <g transform={`translate(${plotRight - 130}, ${altToY(avgFreeze) - 12})`}>
                <rect width="120" height="24" rx="4" fill="#fff" stroke="#0284c7" strokeWidth="2" filter="url(#shadow)" />
                <text x="60" y="16" textAnchor="middle" className="fill-sky-900 font-black text-xs">
                  0 °C · {avgFreeze} m
                </text>
              </g>
            </>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* THERMAL TOP CURVE (purple solid, thick) */}
          {/* ══════════════════════════════════════════════════ */}
          {thermalTopPts.length >= 2 && (
            <path d={thermalTopPath} fill="none" stroke="#581c87" strokeWidth="5" strokeLinecap="round" />
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* THERMAL BOUNDARY (orange sinusoidal) */}
          {/* ══════════════════════════════════════════════════ */}
          {boundaryYPts.length >= 2 && (
            <>
              <path d={toBezier(boundaryYPts)} fill="none" stroke="#f97316" strokeWidth="8" opacity="0.15" strokeLinecap="round" />
              <path d={toBezier(boundaryYPts)} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
            </>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* CLOUD BASE CURVE (purple dashed) */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.length >= 2 && (
            <path d={cloudBasePath} fill="none" stroke="#a855f7" strokeWidth="1.5"
              strokeDasharray="6 3" opacity="0.6" />
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* CLOUD BADGES + PARAGLIDERS */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.filter(c => c.rateo >= 0.55).map((col) => {
            const paraY = col.yThermalTop;
            // Cloud positioned ABOVE the paraglider
            const cloudY = paraY - 30;
            return (
              <g key={`badge-${col.hour}`}>
                {/* Cloud at LCL-ish altitude, above paraglider */}
                <CloudPuff x={col.x} y={cloudY} pct={col.cloud} />

                {/* Paraglider icon at thermal top */}
                <g transform={`translate(${col.x}, ${paraY})`}>
                  <path d="M -16,-5 Q -11,-20 0,-20 Q 11,-20 16,-5 Q 9,-14 0,-14 Q -9,-14 -16,-5 Z"
                    fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
                  <line x1="-12" y1="-5" x2="0" y2="8" stroke="#0f172a" strokeWidth="1.3" />
                  <line x1="12" y1="-5" x2="0" y2="8" stroke="#0f172a" strokeWidth="1.3" />
                  <circle cx="0" cy="9" r="5" fill="#fff" stroke="#0f172a" strokeWidth="1.8" />
                </g>

                {/* Rate badge below paraglider */}
                <g transform={`translate(${col.x}, ${paraY + 22})`}>
                  <rect x="-28" y="-10" width="56" height="18" rx="4"
                    fill={col.rateo >= 1.5 ? "#dc2626" : col.rateo >= 1.0 ? "#f97316" : "#22c55e"} />
                  <text x="0" y="3" textAnchor="middle" className="fill-white font-black text-[10px]">
                    ↑{col.rateo.toFixed(1)} m/s
                  </text>
                </g>
              </g>
            );
          })}
        </g> {/* close clipPath */}

        {/* ══════════════════════════════════════════════════ */}
        {/* HOUR LABELS */}
        {/* ══════════════════════════════════════════════════ */}
        {HOURS.map((hr, i) => (
          <g key={`xl-${hr}`}>
            <line x1={xFromIdx(i)} y1={plotBottom} x2={xFromIdx(i)} y2={plotBottom + 10}
              stroke="#0f172a" strokeWidth="2" />
            <text x={xFromIdx(i)} y={plotBottom + 28} textAnchor="middle"
              className="fill-slate-900 font-black text-base">{`${String(hr).padStart(2, "0")}:00`}</text>
          </g>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* FOOTER: ΔT SCALE */}
        {/* ══════════════════════════════════════════════════ */}
        <g transform={`translate(${ML}, ${TOTAL_H - 50})`}>
          <text x="-15" y="12" textAnchor="end" className="fill-slate-800 font-black text-xs">ΔT / 100m</text>
          <rect x="0" y="2" width={GW} height="14" rx="4" fill="url(#lapseRateBar)" />
          <g transform="translate(0, 28)" className="fill-slate-700 font-black text-xs">
            <text x="0" textAnchor="start" className="fill-sky-800">-0.2 (Stabile / Blu)</text>
            <text x={GW * 0.5} textAnchor="middle">0.65</text>
            <text x={GW} textAnchor="end" className="fill-red-700">1.2 (Instabile / Rosso)</text>
          </g>
        </g>

        {/* Gradient for ΔT bar (re-declared inside SVG) */}
        <defs>
          <linearGradient id="lapseRateBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6d28d9" />
            <stop offset="20%" stopColor="#4338ca" />
            <stop offset="35%" stopColor="#1d4ed8" />
            <stop offset="50%" stopColor="#0e7490" />
            <stop offset="65%" stopColor="#047857" />
            <stop offset="78%" stopColor="#a16207" />
            <stop offset="88%" stopColor="#c2410c" />
            <stop offset="95%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>

        {/* ══════════════════════════════════════════════════ */}
        {/* ATTRIBUTION */}
        {/* ══════════════════════════════════════════════════ */}
        <text x={SVG_W / 2} y={TOTAL_H - 12} textAnchor="middle" className="fill-slate-400 font-medium text-[9px]">
          Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium
        </text>
      </svg>
    </div>
  );
}
