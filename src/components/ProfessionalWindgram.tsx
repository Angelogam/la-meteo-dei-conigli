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
// Layout — exact Alpium reference dimensions
// SVG: 1150 × 780
// Chart: x=130..1020 (W=890), y=90..650 (H=560)
// Altitude: 1500m .. 6000m
// ─────────────────────────────────────────────────────
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
const NUM_HOURS = HOURS.length;

const SVG_W = 1150;
const SVG_H = 780;
const PLOT_TOP = 90;
const PLOT_H = 560;
const PLOT_BOT = 650;
const ML = 130;   // left margin — pressure labels at x≈100
const MR = 130;   // right margin — altitude labels at x≈1040
const GW = 890;   // chart width
const GH = PLOT_H;
const ALT_MIN = 1500;
const ALT_MAX = 6000;
const ALT_STEP = 250;
const LAPSE_RATE = -6.5;

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
const DIR_DIRS = ["N", "NO", "O", "SO", "S", "SE", "E", "NE"];
function getDirAbbrev(deg: number): string {
  return DIR_DIRS[Math.round(deg / 45) % 8];
}

// ΔT colour stops — Alpium exact palette
const DT_STOPS = [
  { val: -0.20, color: "#4338ca" },
  { val: -0.05, color: "#1d4ed8" },
  { val:  0.00, color: "#0e7490" },
  { val:  0.16, color: "#047857" },
  { val:  0.32, color: "#4d7c0f" },
  { val:  0.48, color: "#a16207" },
  { val:  0.65, color: "#c2410c" },
  { val:  0.82, color: "#b91c1c" },
  { val:  1.00, color: "#7f1d1d" },
  { val:  1.20, color: "#4c0519" },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbStr(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.max(0, Math.min(255, Math.round(r)))},${Math.max(0, Math.min(255, Math.round(g)))},${Math.max(0, Math.min(255, Math.round(b)))},${a})`;
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

// Altitude → SVG Y (y=90 at 6000m, y=650 at 1500m)
function altToY(alt: number): number {
  const a = Math.max(ALT_MIN, Math.min(ALT_MAX, alt));
  return PLOT_BOT - ((a - ALT_MIN) / (ALT_MAX - ALT_MIN)) * GH;
}
function xFromIdx(i: number): number {
  if (NUM_HOURS <= 1) return ML + GW / 2;
  return ML + (i / (NUM_HOURS - 1)) * GW;
}
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
function toSinuousPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i];
    d += ` C ${prev.x + (curr.x - prev.x) * 0.45},${prev.y - (i % 2 === 0 ? 12 : -12)} ${prev.x + (curr.x - prev.x) * 0.75},${curr.y + (i % 2 === 0 ? -8 : 8)} ${curr.x},${curr.y}`;
  }
  return d;
}
function tempAtAltitude(surfaceTemp: number, alt: number): number {
  return surfaceTemp + LAPSE_RATE * (alt / 1000);
}
function estimateLCL(temp: number, dew: number): number {
  const diff = Math.max(1, temp - dew);
  return Math.max(ALT_MIN, Math.min(ALT_MAX, diff * 125));
}

// ─────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="7" fill="none" stroke="#00b4d8" strokeWidth="1.5" />
      <g stroke="#00b4d8" strokeWidth="1.2" strokeLinecap="round">
        <line x1="0" y1="-4.5" x2="0" y2="4.5" />
        <line x1="-4.5" y1="0" x2="4.5" y2="0" />
        <line x1="-3" y1="-3" x2="3" y2="3" />
        <line x1="-3" y1="3" x2="3" y2="-3" />
      </g>
    </g>
  );
}

function CloudIcon({ x, y, pct }: { x: number; y: number; pct: number }) {
  const opacity = 0.5 + (pct / 100) * 0.5;
  return (
    <g transform={`translate(${x}, ${y})`} opacity={opacity}>
      <path
        d="M -16 6 C -20 6, -21 2, -19 -1 C -17 -4, -13 -5, -10 -5 C -9 -10, -3 -12, 3 -10 C 9 -12, 14 -9, 16 -5 C 21 -4, 22 2, 20 5 C 21 9, 16 11, 13 11 L -13 11 C -17 11, -18 9, -16 6 Z"
        fill="white"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />
      {pct > 20 && (
        <text x="0" y="3" textAnchor="middle" className="fill-slate-700 font-black text-[8px]">
          {pct}%
        </text>
      )}
    </g>
  );
}

function ParagliderIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path d="M -13 -2 Q 0 -14 13 -2" stroke="#a855f7" strokeWidth="2" fill="none" />
      <line x1="-9" y1="-2" x2="0" y2="8" stroke="#a855f7" strokeWidth="1.3" />
      <line x1="9" y1="-2" x2="0" y2="8" stroke="#a855f7" strokeWidth="1.3" />
      <circle cx="0" cy="10" r="2.5" fill="#a855f7" />
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Wind barb (Alpium style — red for strong wind)
// ─────────────────────────────────────────────────────
function WindBarb({ cx, cy, speedKmh, dirDeg }: { cx: number; cy: number; speedKmh: number; dirDeg: number }) {
  const angle = ((dirDeg - 90) * Math.PI) / 180;
  const len = 18;
  const ex = cx + len * Math.cos(angle);
  const ey = cy + len * Math.sin(angle);
  const color = speedKmh > 50 ? "#ef4444" : speedKmh > 30 ? "#f59e0b" : "#e2e8f0";

  const barbs: { d: number }[] = [];
  let rem = speedKmh, d = 4;
  while (rem >= 25) { barbs.push({ d }); rem -= 25; d += 5; }
  d = 4;
  while (rem >= 10) { barbs.push({ d }); rem -= 10; d += 4; }
  d = 4;
  while (rem >= 5) { barbs.push({ d }); rem -= 5; d += 3; }

  return (
    <g>
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <polygon
        points={`${cx},${cy} ${ex - 5 * Math.cos(angle - 0.35)},${ey - 5 * Math.sin(angle - 0.35)} ${ex - 5 * Math.cos(angle + 0.35)},${ey - 5 * Math.sin(angle + 0.35)}`}
        fill={color}
      />
      {barbs.map((b, i) => {
        const px = cx + b.d * Math.cos(angle), py = cy + b.d * Math.sin(angle);
        return (
          <line key={i} x1={px} y1={py}
            x2={px - 5 * Math.sin(angle)} y2={py + 5 * Math.cos(angle)}
            stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        );
      })}
      <text x={cx + 12} y={cy - 6} textAnchor="start"
        className="fill-slate-300 font-bold text-[8px]">{getDirAbbrev(dirDeg)}</text>
      <text x={cx} y={cy + 15} textAnchor="middle"
        className="fill-white font-black text-[10px]"
        style={{ textShadow: "0 0 3px rgba(0,0,0,.9)" }}>{Math.round(speedKmh)}</text>
    </g>
  );
}

// ─────────────────────────────────────────────────────
export default function ProfessionalWindgram({
  latitude, longitude, altitude = 1275, siteName = "sito", selectedDay = 0,
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
      const dew2m = h.dew_point_2m?.[idx] ?? (t2m - 4);
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

      const spread = Math.max(0.5, t2m - dew2m);
      const cloudBase = estimateLCL(t2m, dew2m);
      const sunPct = Math.min(100, Math.max(5, Math.round((rad / 950) * (1 - cloud / 100 * 0.7) * 100)));

      let rateo = 0.5 + spread * 0.07 + (sunPct / 100) * 0.4 + (cape > 100 ? Math.min(1.0, cape / 800) : 0);
      if (precip > 0.3) rateo = Math.min(rateo, 0.3);
      else if (cloud > 80) rateo *= 0.35;
      if (cin > 100) rateo *= 0.5;
      rateo = Math.max(0.2, Math.min(3.0, Math.round(rateo * 10) / 10));

      const hourFrac = (targetHour - 8) / 10;
      const sineEnvelope = Math.sin(hourFrac * Math.PI);
      const thermalTop = Math.round(Math.min(ALT_MAX, cloudBase + Math.min(1200, rateo * 140 + cape * 0.08 + sineEnvelope * 250)));

      const surfaceDeltaT = t80 != null ? Math.round(((t2m - t80) / 78) * 100 * 100) / 100
        : t120 != null ? Math.round(((t2m - t120) / 118) * 100 * 100) / 100
        : spread >= 10 ? 0.95 : spread >= 5 ? 0.72 : 0.55;

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

  // ── Lapse rate matrix (ΔT/100m per cell) ──
  const lapseMatrix = useMemo(() => {
    return columns.map(col => {
      const rates: { alt: number; dt: number }[] = [];
      for (let a = ALT_MIN; a <= ALT_MAX; a += ALT_STEP) {
        const surfaceT = col.t2m;
        const altDiff = a - altitude;
        const tempBelow = surfaceT - (altDiff - 150) * 0.0065;
        const tempAbove = surfaceT - (altDiff + 150) * 0.0065;
        const dt = ((tempAbove - tempBelow) / 300) * 100;
        rates.push({ alt: a, dt });
      }
      return rates;
    });
  }, [columns, altitude]);

  // ── Curves ──
  const thermalTopPts = useMemo(() => columns.map(c => ({ x: c.x, y: c.yThermalTop })), [columns]);
  const thermalTopPath = useMemo(() => toBezier(thermalTopPts), [thermalTopPts]);
  const freezePts = useMemo(() => columns.map(c => ({ x: c.x, y: c.yFreeze })), [columns]);
  const freezePath = useMemo(() => toBezier(freezePts), [freezePts]);
  const avgFreeze = useMemo(
    () => columns.length ? Math.round(columns.reduce((s, c) => s + c.freeze, 0) / columns.length) : altitude + 3200,
    [columns, altitude]
  );
  const cloudBasePts = useMemo(() => columns.map(c => ({ x: c.x, y: c.yCloudBase })), [columns]);
  const cloudBasePath = useMemo(() => toBezier(cloudBasePts), [cloudBasePts]);

  const boundaryAlts = useMemo(() =>
    columns.map(c => {
      const hf = (c.hour - 8) / 10;
      const sine = Math.sin(hf * Math.PI);
      return Math.min(ALT_MAX, Math.max(ALT_MIN, Math.round(ALT_MIN + 200 + sine * (c.rateo * 200 + c.cape * 0.06 + 150))));
    }), [columns]
  );
  const boundaryYPts = useMemo(
    () => columns.map((c, i) => ({ x: c.x, y: altToY(boundaryAlts[i]) })), [columns, boundaryAlts]
  );
  const sinuousBoundaryPath = useMemo(() => toSinuousPath(boundaryYPts), [boundaryYPts]);

  // PBL curve (black dashed — higher than boundary)
  const pblPts = useMemo(() =>
    columns.map(c => ({
      x: c.x,
      y: altToY(Math.min(ALT_MAX, Math.max(ALT_MIN, c.cloudBase + c.rateo * 700))),
    })), [columns]
  );
  const pblPath = useMemo(() => toBezier(pblPts), [pblPts]);

  // ── Loading / error ──
  if (loading) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 p-8 flex flex-col items-center justify-center min-h-[420px]"
        style={{ background: "#05070b" }}>
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
        <p className="text-slate-300 font-semibold text-base">Caricamento windgram…</p>
        <p className="text-xs text-slate-500 mt-1">{siteName} · {dateStr}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 p-6 text-center" style={{ background: "#05070b" }}>
        <AlertTriangle className="w-9 h-9 mx-auto mb-2 text-rose-400" />
        <p className="font-bold text-rose-400 text-base">Impossibile caricare i dati</p>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  // ── Render ──
  const plotRight = ML + GW;
  const xStep = GW / (NUM_HOURS - 1);
  const halfW = xStep / 2;
  const midTemp = Math.round(columns[0]?.t2m ?? 15);
  const groundAlt = Math.round(altitude);

  return (
    <div className="rounded-2xl overflow-hidden font-sans select-none"
      style={{ background: "#05070b", boxShadow: "0 0 25px rgba(0,0,0,0.8)" }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto block"
        style={{ shapeRendering: "geometricPrecision" }}>
        <defs>
          <clipPath id="graphClip">
            <rect x={ML} y={PLOT_TOP} width={GW} height={GH} />
          </clipPath>
          {/* Rain pattern */}
          <pattern id="rainPattern" width="10" height="10" patternTransform="rotate(70 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#3b82f6" strokeWidth="2" opacity="0.4" />
          </pattern>
          {/* Storm pattern */}
          <pattern id="stormPattern" width="12" height="12" patternTransform="rotate(75 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#8b5cf6" strokeWidth="3" opacity="0.5" />
          </pattern>
          {/* Ground hatch */}
          <pattern id="groundHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#0f172a" strokeWidth="1.5" opacity="0.5" />
          </pattern>
          {/* Drop shadow */}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.4" />
          </filter>
          {/* ΔT bar gradient — Alpium exact: purple → blue → cyan → green → yellow → orange → red */}
          <linearGradient id="lapseRateBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="15%" stopColor="#1d4ed8" />
            <stop offset="30%" stopColor="#0e7490" />
            <stop offset="45%" stopColor="#047857" />
            <stop offset="60%" stopColor="#4d7c0f" />
            <stop offset="75%" stopColor="#a16207" />
            <stop offset="88%" stopColor="#c2410c" />
            <stop offset="95%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          {/* Instability background gradient — blue (stable/bottom) → red (unstable/top) */}
          <linearGradient id="instabilityBg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#003366" />
            <stop offset="50%" stopColor="#666600" />
            <stop offset="100%" stopColor="#990000" />
          </linearGradient>
        </defs>

        {/* Dark background */}
        <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#05070b" />

        {/* ══════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ══════════════════════════════════════════════════ */}
        <text x={ML} y="24" fill="#fff" fontSize="16" fontWeight="900" fontFamily="system-ui">
          {siteName.toLowerCase()} · {formattedDateTitle.toLowerCase()}
        </text>
        <text x={ML} y="42" fill="#aaa" fontSize="10" fontFamily="system-ui">
          plotted {dateStr} 00:00 UTC · model ground {groundAlt} m
        </text>

        {/* Top strip: ASCENDENZE */}
        <text x={ML} y="58" fill="#ff8800" fontSize="10" fontWeight="700" fontFamily="system-ui">
          valore medio ascendenze (m/s)
        </text>
        {columns.map((c) => (
          <text key={`asc-${c.hour}`} x={c.x} y="58" textAnchor="middle"
            className={c.rateo >= 1.6 ? "fill-red-400 font-black text-sm" : c.rateo >= 1.0 ? "fill-orange-400 font-black text-sm" : "fill-orange-300 font-black text-sm"}>
            {c.rateo.toFixed(1)}
          </text>
        ))}

        {/* Top strip: SOLE % */}
        <text x={ML} y="73" fill="#d97706" fontSize="10" fontWeight="700" fontFamily="system-ui">
          sole %
        </text>
        {columns.map((c) => (
          <text key={`sun-${c.hour}`} x={c.x} y="73" textAnchor="middle"
            className="fill-orange-400 font-extrabold text-xs">
            {c.cloud.toFixed(0)}%
          </text>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* GRAPH AREA — clipped */}
        {/* ══════════════════════════════════════════════════ */}
        <g clipPath="url(#graphClip)">

          {/* Instability background gradient (blue→green→red bottom→top) */}
          <rect x={ML} y={PLOT_TOP} width={GW} height={GH}
            fill="url(#instabilityBg)" />

          {/* ══════════════════════════════════════════════════ */}
          {/* STABILITY BANDS — coloured cells (ΔT/100m) */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.map((col, ci) => {
            const rates = lapseMatrix[ci]!;
            return rates.map((lr) => {
              const cellY = altToY(lr.alt + ALT_STEP / 2);
              const cellH = Math.max(1, altToY(lr.alt) - altToY(lr.alt + ALT_STEP));
              return (
                <rect key={`cell-${col.hour}-${lr.alt}`}
                  x={col.x - halfW} y={cellY}
                  width={halfW * 2} height={cellH}
                  fill={getDTColor(lr.dt)} opacity="0.6" />
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
                <rect x={col.x - halfW} y={altToY(ALT_MAX)} width={halfW * 2} height={Math.max(0, yBase - altToY(ALT_MAX))}
                  fill={isStorm ? "url(#stormPattern)" : "url(#rainPattern)"} />
                {col.precip > 0.2 && (
                  <g transform={`translate(${col.x}, ${altToY(ALT_MAX) + 14})`}>
                    <rect x="-32" y="-11" width="64" height="18" rx="3"
                      fill={isStorm ? "#4c1d95" : "#0369a1"} stroke="white" strokeWidth="1" />
                    <text x="0" y="1" textAnchor="middle"
                      className="fill-white font-black text-[9px]">
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
            const launchY = altToY(groundAlt);
            const groundY = altToY(ALT_MIN);
            return (
              <g>
                <rect x={ML} y={launchY} width={GW} height={Math.max(0, groundY - launchY)}
                  fill="url(#groundHatch)" />
                <line x1={ML} y1={launchY} x2={ML + GW} y2={launchY}
                  stroke="#1e293b" strokeWidth="2" />
              </g>
            );
          })()}

          {/* ══════════════════════════════════════════════════ */}
          {/* CROSS-HATCH unstable zones (ΔT surface > 0.55) */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.map((col, ci) => {
            if (col.surfaceDeltaT < 0.55) return null;
            const bY = altToY(boundaryAlts[ci]);
            const xL = col.x - halfW, xR = col.x + halfW;
            const lines: React.ReactNode[] = [];
            const sp = 5;
            for (let hx = xL - GH; hx < xR + GH; hx += sp) {
              lines.push(
                <line key={`d-${ci}-${hx}`} x1={hx} y1={bY} x2={hx + (PLOT_BOT - bY)} y2={PLOT_BOT}
                  stroke="rgba(0,0,0,0.18)" strokeWidth="0.7" />,
                <line key={`u-${ci}-${hx}`} x1={hx} y1={PLOT_BOT} x2={hx + (PLOT_BOT - bY)} y2={bY}
                  stroke="rgba(0,0,0,0.18)" strokeWidth="0.7" />
              );
            }
            return <g key={`ch-${ci}`}>{lines}</g>;
          })}

          {/* ══════════════════════════════════════════════════ */}
          {/* GRID LINES + PRESSURE / ALTITUDE LABELS */}
          {/* ══════════════════════════════════════════════════ */}
          {/* Horizontal grid every 250m */}
          {(() => {
            const els: React.ReactNode[] = [];
            for (let a = ALT_MIN; a <= ALT_MAX; a += ALT_STEP) {
              const y = altToY(a);
              els.push(
                <line key={`grid-${a}`} x1={ML} y1={y} x2={plotRight} y2={y}
                  stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
              );
            }
            return <g>{els}</g>;
          })()}

          {/* Left side: pressure levels + altitude */}
          {(() => {
            const pressures = [
              { hpa: 500, alt: 5570 }, { hpa: 550, alt: 4860 }, { hpa: 600, alt: 4200 },
              { hpa: 650, alt: 3580 }, { hpa: 700, alt: 3010 }, { hpa: 750, alt: 2470 },
              { hpa: 800, alt: 1950 }, { hpa: 850, alt: 1460 },
            ];
            const els: React.ReactNode[] = [];
            // Altitude labels at 500m steps on left
            for (let a = ALT_MIN; a <= ALT_MAX; a += 500) {
              const y = altToY(a);
              els.push(
                <text key={`alt-l-${a}`} x={ML - 8} y={y} textAnchor="end"
                  className="fill-slate-300 font-bold text-xs" dy="0.35em">
                  {a} m
                </text>
              );
            }
            // Pressure labels on left
            pressures.forEach(({ hpa, alt }) => {
              const y = altToY(alt);
              if (y >= PLOT_TOP && y <= PLOT_BOT) {
                els.push(
                  <text key={`hp-${hpa}`} x={ML - 8} y={y} textAnchor="end"
                    className="fill-slate-400 font-bold text-[9px]" dy="0.35em">
                    {hpa} hPa
                  </text>
                );
              }
            });
            return <g>{els}</g>;
          })()}

          {/* Right side: altitude labels */}
          {(() => {
            const els: React.ReactNode[] = [];
            for (let a = ALT_MIN; a <= ALT_MAX; a += 500) {
              const y = altToY(a);
              els.push(
                <text key={`alt-r-${a}`} x={plotRight + 8} y={y} textAnchor="start"
                  className="fill-slate-300 font-bold text-xs" dy="0.35em">
                  {a} m
                </text>
              );
            }
            return <g>{els}</g>;
          })()}

          {/* Vertical hour lines */}
          {columns.map((c) => (
            <line key={`vg-${c.hour}`} x1={c.x} y1={PLOT_TOP} x2={c.x} y2={PLOT_BOT}
              stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="2 3" />
          ))}

          {/* Plot border */}
          <rect x={ML} y={PLOT_TOP} width={GW} height={GH}
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

          {/* ══════════════════════════════════════════════════ */}
          {/* WIND BARBS */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.map((col) => {
            const rates = lapseMatrix[HOURS.indexOf(col.hour)]!;
            return rates.map((lr) => {
              const y = altToY(lr.alt);
              const lvl = col.rawLevels;
              const alt = lr.alt;
              let wSpeed = col.wind10, wDir = col.windDir10;
              for (let li = 0; li < lvl.length - 1; li++) {
                const aB = lvl[li]!.alt, aA = lvl[li + 1]!.alt;
                if (alt >= aB && alt <= aA) {
                  const f = (alt - aB) / (aA - aB);
                  wSpeed = lvl[li]!.speed + f * (lvl[li + 1]!.speed - lvl[li]!.speed);
                  wDir = lvl[li]!.dir + f * (lvl[li + 1]!.dir - lvl[li]!.dir);
                  if (wDir < 0) wDir += 360;
                  if (wDir >= 360) wDir -= 360;
                  break;
                }
              }
              return (
                <WindBarb key={`wb-${col.hour}-${lr.alt}`}
                  cx={col.x} cy={y} speedKmh={wSpeed * 3.6} dirDeg={wDir} />
              );
            });
          })}

          {/* ══════════════════════════════════════════════════ */}
          {/* 0°C ISOTHERM (blue dashed + snowflakes + white box) */}
          {/* ══════════════════════════════════════════════════ */}
          {freezePts.length >= 2 && (
            <>
              <path d={freezePath} fill="none" stroke="#00b4d8" strokeWidth="2"
                strokeDasharray="7 5" />
              {freezePts.map((p, i) => (
                <SnowflakeIcon key={`sf-${i}`} x={p.x} y={p.y - 12} />
              ))}
              {/* White box with 0°C label */}
              <g transform={`translate(${plotRight - 125}, ${altToY(avgFreeze) - 14})`}>
                <rect width="118" height="24" rx="4" fill="white" stroke="#00b4d8" strokeWidth="1.5" filter="url(#shadow)" />
                <text x="59" y="16" textAnchor="middle" className="fill-sky-900 font-black text-xs">
                  0 °C · {avgFreeze} m
                </text>
              </g>
            </>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* THERMAL TOP CURVE (purple solid, thick — Alpium) */}
          {/* ══════════════════════════════════════════════════ */}
          {thermalTopPts.length >= 2 && (
            <path d={thermalTopPath} fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* THERMAL BOUNDARY (orange sinusoidal wave) */}
          {/* ══════════════════════════════════════════════════ */}
          {boundaryYPts.length >= 2 && (
            <>
              <path d={sinuousBoundaryPath} fill="none" stroke="#f97316" strokeWidth="8" opacity="0.12" strokeLinecap="round" />
              <path d={sinuousBoundaryPath} fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
            </>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* CLOUD BASE CURVE (purple dashed) */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.length >= 2 && (
            <path d={cloudBasePath} fill="none" stroke="#c084fc" strokeWidth="1.3"
              strokeDasharray="5 3" opacity="0.5" />
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* PBL CURVE (black dashed) */}
          {/* ══════════════════════════════════════════════════ */}
          {pblPts.length >= 2 && (
            <path d={pblPath} fill="none" stroke="#0f172a" strokeWidth="1.8"
              strokeDasharray="6 4" opacity="0.7" />
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* PARAGLIDERS + CLOUD BADGES */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.filter(c => c.rateo >= 0.5).map((col) => {
            const paraY = col.yThermalTop;
            const lcl = estimateLCL(col.t2m, col.dew2m);
            const lclClamped = Math.max(ALT_MIN, Math.min(ALT_MAX, lcl));
            const cloudY = altToY(lclClamped);

            return (
              <g key={`badge-${col.hour}`}>
                {/* Cloud at LCL, ABOVE paraglider */}
                <CloudIcon x={col.x} y={cloudY - 20} pct={col.cloud} />

                {/* Paraglider at thermal top */}
                <ParagliderIcon x={col.x} y={paraY} />

                {/* Altitude label */}
                <text x={col.x} y={paraY + 18} textAnchor="middle"
                  className="fill-purple-300 font-black text-[10px]">
                  {col.cloudBase} m
                </text>

                {/* Rate badge */}
                <text x={col.x} y={paraY + 30} textAnchor="middle"
                  className={col.rateo >= 1.5 ? "fill-red-400 font-black text-[10px]"
                    : col.rateo >= 1.0 ? "fill-orange-400 font-black text-[10px]"
                    : "fill-orange-300 font-black text-[10px]"}>
                  ↑{col.rateo.toFixed(1)} m/s
                </text>
              </g>
            );
          })}
        </g> {/* close clipPath */}

        {/* ══════════════════════════════════════════════════ */}
        {/* HOUR LABELS */}
        {/* ══════════════════════════════════════════════════ */}
        {HOURS.map((hr, i) => (
          <g key={`xl-${hr}`}>
            <line x1={xFromIdx(i)} y1={PLOT_BOT} x2={xFromIdx(i)} y2={PLOT_BOT + 8}
              stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
            <text x={xFromIdx(i)} y={PLOT_BOT + 24} textAnchor="middle"
              className="fill-slate-300 font-black text-sm">{`${String(hr).padStart(2, "0")}:00`}</text>
          </g>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* FOOTER: ΔT SCALE */}
        {/* ══════════════════════════════════════════════════ */}
        <g transform={`translate(${ML}, ${SVG_H - 65})`}>
          <text x="-5" y="10" textAnchor="end" className="fill-slate-400 font-black text-xs">
            ΔT / 100m
          </text>
          <rect x="0" y="2" width={GW} height="14" rx="3" fill="url(#lapseRateBar)" />
          <g transform="translate(0, 28)" className="fill-slate-400 font-black text-xs">
            <text x="0" textAnchor="start" className="fill-cyan-400">Stabile ←</text>
            {/* Numeric labels along the bar */}
            <text x={GW * 0.1} textAnchor="middle" fill="#aaa" fontSize="9">-0.20</text>
            <text x={GW * 0.25} textAnchor="middle" fill="#aaa" fontSize="9">0.00</text>
            <text x={GW * 0.4} textAnchor="middle" fill="#aaa" fontSize="9">0.16</text>
            <text x={GW * 0.55} textAnchor="middle" fill="#aaa" fontSize="9">0.32</text>
            <text x={GW * 0.7} textAnchor="middle" fill="#aaa" fontSize="9">0.48</text>
            <text x={GW * 0.82} textAnchor="middle" fill="#aaa" fontSize="9">0.65</text>
            <text x={GW * 0.9} textAnchor="middle" fill="#aaa" fontSize="9">0.82</text>
            <text x={GW * 0.96} textAnchor="middle" fill="#aaa" fontSize="9">0.98</text>
            <text x={GW} textAnchor="end" className="fill-red-400">→ Instabile</text>
          </g>
        </g>

        {/* ══════════════════════════════════════════════════ */}
        {/* ATTRIBUTION */}
        {/* ══════════════════════════════════════════════════ */}
        <text x={SVG_W / 2} y={SVG_H - 12} textAnchor="middle" className="fill-slate-600 font-medium text-[8px]">
          Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium
        </text>
      </svg>
    </div>
  );
}
