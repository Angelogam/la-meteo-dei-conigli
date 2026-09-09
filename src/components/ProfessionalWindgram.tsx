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
// Layout — matches Alpium reference exactly
// ─────────────────────────────────────────────────────
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
const NUM_HOURS = HOURS.length;

const SVG_W = 1150;
const SVG_H = 780;
const HEADER_H = 80;
const PLOT_TOP = HEADER_H + 10;
const PLOT_H = 590;
const FOOTER_H = 100;
const TOTAL_H = PLOT_TOP + PLOT_H + FOOTER_H;
const ML = 130;
const MR = 130;
const GW = SVG_W - ML - MR;
const GH = PLOT_H;

const ALT_MIN = 1500;
const ALT_MAX = 4000;
const ALT_STEP = 250;
const LAPSE_RATE = -6.5; // °C/km

// ─────────────────────────────────────────────────────
// Wind direction abbreviations
// ─────────────────────────────────────────────────────
const DIR_DIRS = ["N", "NO", "O", "SO", "S", "SE", "E", "NE"];
function getDirAbbrev(deg: number): string {
  return DIR_DIRS[Math.round(deg / 45) % 8];
}

// ─────────────────────────────────────────────────────
// ΔT color scale — Alpium style (blue → cyan → red)
// ─────────────────────────────────────────────────────
const DT_STOPS = [
  { val: -0.20, color: "#0000ff" },
  { val:  0.00, color: "#0088ff" },
  { val:  0.32, color: "#00cccc" },
  { val:  0.48, color: "#88cc00" },
  { val:  0.65, color: "#ccaa00" },
  { val:  0.82, color: "#cc6600" },
  { val:  1.00, color: "#cc2200" },
  { val:  1.20, color: "#880000" },
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
    d += ` C ${prev.x + (curr.x - prev.x) * 0.45},${prev.y - (i % 2 === 0 ? 15 : -15)} ${prev.x + (curr.x - prev.x) * 0.75},${curr.y + (i % 2 === 0 ? -10 : 10)} ${curr.x},${curr.y}`;
  }
  return d;
}
function tempAtAltitude(surfaceTemp: number, alt: number): number {
  return surfaceTemp + LAPSE_RATE * (alt / 1000);
}
function estimateLCL(temp: number, dew: number): number {
  const diff = Math.max(1, temp - dew);
  return Math.max(300, Math.min(3500, diff * 125));
}

// ─────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="8" fill="none" stroke="#00ffff" strokeWidth="1.5" />
      <g stroke="#00ffff" strokeWidth="1.2" strokeLinecap="round">
        <line x1="0" y1="-5" x2="0" y2="5" />
        <line x1="-5" y1="0" x2="5" y2="0" />
        <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
        <line x1="-3.5" y1="3.5" x2="3.5" y2="-3.5" />
      </g>
    </g>
  );
}

function CloudIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        d="M -14 5 C -18 5, -20 1, -18 -2 C -16 -5, -12 -7, -9 -7 C -8 -12, -2 -14, 4 -12 C 10 -14, 15 -10, 16 -6 C 21 -5, 22 1, 20 4 C 21 9, 16 11, 13 11 L -12 11 C -16 11, -17 9, -14 5 Z"
        fill="rgba(255,255,255,0.9)"
        stroke="#64748b"
        strokeWidth="1.2"
      />
    </g>
  );
}

function ParagliderIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Canopy arc */}
      <path d="M -12 0 Q 0 -14 12 0" stroke="#ff8800" strokeWidth="2" fill="none" />
      {/* Lines */}
      <line x1="0" y1="0" x2="-5" y2="9" stroke="#ff8800" strokeWidth="1.5" />
      <line x1="0" y1="0" x2="5" y2="9" stroke="#ff8800" strokeWidth="1.5" />
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

  const color = speedKmh > 60 ? "#ff0000" : speedKmh > 40 ? "#ffcc00" : "#ffffff";

  // Barbs
  const barbs: { d: number }[] = [];
  let remaining = speedKmh;
  let d = 4;
  while (remaining >= 25) { barbs.push({ d }); remaining -= 25; d += 6; }
  d = 4;
  while (remaining >= 10) { barbs.push({ d }); remaining -= 10; d += 5; }
  d = 4;
  while (remaining >= 5) { barbs.push({ d }); remaining -= 5; d += 4; }

  return (
    <g>
      {/* Stick */}
      <line x1={cx} y1={cy} x2={ex} y2={ey}
        stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Arrow head */}
      <polygon
        points={`${cx},${cy} ${ex - 6 * Math.cos(angle - 0.35)},${ey - 6 * Math.sin(angle - 0.35)} ${ex - 6 * Math.cos(angle + 0.35)},${ey - 6 * Math.sin(angle + 0.35)}`}
        fill={color}
      />
      {/* Barbs */}
      {barbs.map((b, i) => {
        const px = cx + b.d * Math.cos(angle);
        const py = cy + b.d * Math.sin(angle);
        const px2 = px - 6 * Math.sin(angle);
        const py2 = py + 6 * Math.cos(angle);
        return (
          <line key={i} x1={px} y1={py} x2={px2} y2={py2}
            stroke={color} strokeWidth="2" strokeLinecap="round" />
        );
      })}
      {/* Speed text — black on white bg */}
      <text x={cx} y={cy + 18} textAnchor="middle"
        className="fill-slate-900 font-black text-xs">
        {Math.round(speedKmh)}
      </text>
      {/* Direction */}
      <text x={cx + 14} y={cy - 7} textAnchor="start"
        className="fill-slate-400 font-bold text-[8px]">
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
        "cloud_cover",
        "wind_speed_10m", "wind_direction_10m",
        "wind_speed_80m", "wind_direction_80m",
        "wind_speed_120m", "wind_direction_120m",
        "wind_speed_180m", "wind_direction_180m",
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
      const thermalTop = Math.round(Math.min(ALT_MAX, cloudBase + Math.min(800, rateo * 100 + sineEnvelope * 180)));

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

  // ── Lapse rate matrix ──
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
      return Math.min(ALT_MAX - 50, Math.max(ALT_MIN + 80, Math.round(ALT_MIN + 180 + sine * (c.rateo * 180 + c.cape * 0.06 + 140))));
    }), [columns]
  );
  const boundaryYPts = useMemo(
    () => columns.map((c, i) => ({ x: c.x, y: altToY(boundaryAlts[i]) })), [columns, boundaryAlts]
  );
  const sinuousBoundaryPath = useMemo(() => toSinuousPath(boundaryYPts), [boundaryYPts]);

  // ── Loading / error ──
  if (loading) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 p-8 flex flex-col items-center justify-center min-h-[420px]" style={{ background: "#05070b" }}>
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
  const plotLeft = ML;
  const plotRight = ML + GW;
  const plotBottom = PLOT_TOP + GH;
  const xStep = GW / (NUM_HOURS - 1);
  const halfW = xStep / 2;
  const surfaceT = Math.round(columns[0]?.t2m ?? 15);
  const midTemp = surfaceT;

  return (
    <div className="rounded-2xl overflow-hidden font-sans select-none" style={{ boxShadow: "0 0 25px rgba(0,0,0,0.8)" }}>
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
            <line x1="0" y1="0" x2="0" y2="10" stroke="#3b82f6" strokeWidth="2" opacity="0.4" />
          </pattern>
          {/* Ground hatch */}
          <pattern id="groundHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#0f172a" strokeWidth="1.5" opacity="0.5" />
          </pattern>
          {/* ΔT bar gradient — blue → cyan → red (Alpium style) */}
          <linearGradient id="lapseRateBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0000ff" />
            <stop offset="50%" stopColor="#00ffff" />
            <stop offset="100%" stopColor="#ff0000" />
          </linearGradient>
          {/* Instability background gradient — blue (stable/bottom) → red (unstable/top) */}
          <linearGradient id="instabilityBg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#003366" />
            <stop offset="50%" stopColor="#666600" />
            <stop offset="100%" stopColor="#990000" />
          </linearGradient>
        </defs>

        {/* Dark background */}
        <rect x="0" y="0" width={SVG_W} height={TOTAL_H} fill="#05070b" />

        {/* ══════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ══════════════════════════════════════════════════ */}
        <text x={ML} y="28" fill="#fff" fontSize="15" fontWeight="900">
          {siteName.toLowerCase()} · {formattedDateTitle.toLowerCase()}
        </text>
        <text x={ML} y="46" fill="#aaa" fontSize="10">
          Meteo Open-Meteo / AROME - Evidenziazione Grafica Fenomeni Precipitativi
        </text>

        {/* Top strip: ASCENDENZE */}
        <text x={ML} y="62" fill="#ff8800" fontSize="10" fontWeight="700">
          ASCENDENZE (m/s):
        </text>
        {columns.map((c) => (
          <text key={`asc-${c.hour}`} x={c.x} y="62" textAnchor="middle"
            className={c.rateo >= 1.6 ? "fill-red-400 font-black text-sm" : c.rateo >= 1.0 ? "fill-orange-400 font-black text-sm" : "fill-orange-300 font-black text-sm"}>
            {c.rateo.toFixed(1)}
          </text>
        ))}

        {/* Top strip: SOLE % */}
        <text x={ML} y="76" fill="#ffff66" fontSize="10" fontWeight="700">
          SOLE %:
        </text>
        {columns.map((c) => (
          <text key={`sun-${c.hour}`} x={c.x} y="76" textAnchor="middle"
            className="fill-yellow-300 font-extrabold text-xs">
            {c.cloud.toFixed(0)}%
          </text>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* GRAPH AREA */}
        {/* ══════════════════════════════════════════════════ */}
        <g clipPath="url(#graphClip)">
          {/* Instability background */}
          <rect x={plotLeft} y={PLOT_TOP} width={GW} height={GH}
            fill="url(#instabilityBg)" />

          {/* ══════════════════════════════════════════════════ */}
          {/* STABILITY BANDS — colored cells (ΔT/100m) */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.map((col, ci) => {
            const rates = lapseMatrix[ci]!;
            return rates.map((lr) => {
              const cellY = altToY(lr.alt + ALT_STEP / 2);
              const cellH = Math.max(1, altToY(lr.alt) - altToY(lr.alt + ALT_STEP));
              return (
                <rect
                  key={`cell-${col.hour}-${lr.alt}`}
                  x={col.x - halfW} y={cellY}
                  width={halfW * 2} height={cellH}
                  fill={getDTColor(lr.dt)}
                  opacity="0.55"
                />
              );
            });
          })}

          {/* ══════════════════════════════════════════════════ */}
          {/* RAIN columns */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.filter(c => c.precip > 0.05).map((col) => {
            const isStorm = col.precip > 5;
            const yBase = altToY(Math.max(ALT_MIN, col.cloudBase));
            return (
              <g key={`evt-${col.hour}`}>
                <rect x={col.x - halfW} y={altToY(ALT_MAX)} width={halfW * 2} height={Math.max(0, yBase - altToY(ALT_MAX))}
                  fill={isStorm ? "url(#stormPattern)" : "url(#rainPattern)"} />
                {col.precip > 0.3 && (
                  <g transform={`translate(${col.x}, ${altToY(ALT_MAX) + 16})`}>
                    <rect x="-34" y="-12" width="68" height="20" rx="4"
                      fill={isStorm ? "#4c1d95" : "#0369a1"} stroke="white" strokeWidth="1.2" />
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
          {/* GROUND below launch */}
          {/* ══════════════════════════════════════════════════ */}
          {(() => {
            const launchY = altToY(Math.round(altitude));
            const groundY = altToY(ALT_MIN);
            return (
              <g>
                <rect x={plotLeft} y={launchY} width={GW} height={Math.max(0, groundY - launchY)}
                  fill="url(#groundHatch)" />
                <line x1={plotLeft} y1={launchY} x2={plotLeft + GW} y2={launchY}
                  stroke="#0f172a" strokeWidth="2.5" />
              </g>
            );
          })()}

          {/* ══════════════════════════════════════════════════ */}
          {/* CROSS-HATCH unstable zones */}
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
                  stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />,
                <line key={`u-${ci}-${hx}`} x1={hx} y1={plotBottom} x2={hx + (plotBottom - bY)} y2={bY}
                  stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
              );
            }
            return <g key={`ch-${ci}`}>{lines}</g>;
          })}

          {/* ══════════════════════════════════════════════════ */}
          {/* GRID LINES + QUOTE/TEMPERATURE LABELS */}
          {/* ══════════════════════════════════════════════════ */}
          {(() => {
            const launchAlt = Math.round(altitude);
            const altStart = Math.floor((launchAlt - 1) / ALT_STEP) * ALT_STEP;
            const els: React.ReactNode[] = [];
            for (let a = altStart; a <= ALT_MAX; a += ALT_STEP) {
              const y = altToY(a);
              const tAlt = tempAtAltitude(midTemp, a);
              els.push(
                <g key={`grid-${a}`}>
                  <line x1={plotLeft} y1={y} x2={plotRight} y2={y}
                    stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
                  {/* Left: altitude */}
                  <text x={plotLeft - 12} y={y} textAnchor="end"
                    className="fill-slate-300 font-bold text-sm"
                    dy="0.35em">
                    {a} m
                  </text>
                  {/* Right: temperature */}
                  <text x={plotRight + 12} y={y} textAnchor="start"
                    className="fill-orange-300 font-bold text-sm"
                    dy="0.35em">
                    {tAlt.toFixed(1)} °C
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
              stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" strokeDasharray="3 3" />
          ))}

          {/* ══════════════════════════════════════════════════ */}
          {/* PLOT BORDER */}
          {/* ══════════════════════════════════════════════════ */}
          <rect x={plotLeft} y={PLOT_TOP} width={GW} height={GH}
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />

          {/* ══════════════════════════════════════════════════ */}
          {/* WIND BARBS */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.map((col) => {
            const rates = lapseMatrix[HOURS.indexOf(col.hour)]!;
            return rates.map((lr) => {
              const y = altToY(lr.alt);
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
              return (
                <WindBarb
                  key={`wb-${col.hour}-${lr.alt}`}
                  cx={col.x} cy={y}
                  speedKmh={wSpeed * 3.6}
                  dirDeg={wDir}
                />
              );
            });
          })}

          {/* ══════════════════════════════════════════════════ */}
          {/* 0°C ISOTHERM */}
          {/* ══════════════════════════════════════════════════ */}
          {freezePts.length >= 2 && (
            <>
              <path d={freezePath} fill="none" stroke="#00ffff" strokeWidth="1.5"
                strokeDasharray="6 4" />
              {freezePts.map((p, i) => (
                <SnowflakeIcon key={`sf-${i}`} x={p.x} y={p.y - 12} />
              ))}
              <text x={plotLeft + 10} y={altToY(avgFreeze) - 10} fill="#00ffff" fontSize="11" fontWeight="700">
                0 °C – {avgFreeze} m
              </text>
            </>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* THERMAL TOP CURVE (orange — Alpium style) */}
          {/* ══════════════════════════════════════════════════ */}
          {thermalTopPts.length >= 2 && (
            <path d={thermalTopPath} fill="none" stroke="#ff8800" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* THERMAL BOUNDARY (orange sinusoidal) */}
          {/* ══════════════════════════════════════════════════ */}
          {boundaryYPts.length >= 2 && (
            <>
              <path d={sinuousBoundaryPath} fill="none" stroke="#f97316" strokeWidth="7" opacity="0.15" strokeLinecap="round" />
              <path d={sinuousBoundaryPath} fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            </>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* CLOUD BASE CURVE (purple dashed) */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.length >= 2 && (
            <path d={cloudBasePath} fill="none" stroke="#a855f7" strokeWidth="1.3"
              strokeDasharray="5 3" opacity="0.5" />
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* PARAGLIDERS + CLOUDS */}
          {/* ══════════════════════════════════════════════════ */}
          {columns.filter(c => c.rateo >= 0.5).map((col) => {
            const paraY = col.yThermalTop;
            // LCL cloud above paraglider
            const lcl = estimateLCL(col.t2m, col.dew2m);
            const lclClamped = Math.max(ALT_MIN, Math.min(ALT_MAX, lcl));
            const cloudY = altToY(lclClamped);

            return (
              <g key={`badge-${col.hour}`}>
                {/* Cloud at LCL, ABOVE paraglider */}
                <CloudIcon x={col.x} y={cloudY - 18} />

                {/* Paraglider at thermal top */}
                <ParagliderIcon x={col.x} y={paraY} />

                {/* Rate badge below paraglider */}
                <text x={col.x} y={paraY + 16} textAnchor="middle"
                  className={col.rateo >= 1.5 ? "fill-red-400 font-black text-xs" : col.rateo >= 1.0 ? "fill-orange-400 font-black text-xs" : "fill-orange-300 font-black text-xs"}>
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
            <line x1={xFromIdx(i)} y1={plotBottom} x2={xFromIdx(i)} y2={plotBottom + 8}
              stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
            <text x={xFromIdx(i)} y={plotBottom + 24} textAnchor="middle"
              className="fill-slate-300 font-black text-sm">{`${String(hr).padStart(2, "0")}:00`}</text>
          </g>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* FOOTER: ΔT SCALE */}
        {/* ══════════════════════════════════════════════════ */}
        <g transform={`translate(${ML}, ${TOTAL_H - 65})`}>
          <text x="-5" y="10" textAnchor="end" className="fill-slate-400 font-black text-xs">
            ΔT / 100m
          </text>
          <rect x="0" y="2" width={GW} height="14" rx="3" fill="url(#lapseRateBar)" />
          <g transform="translate(0, 28)" className="fill-slate-400 font-black text-xs">
            <text x="0" textAnchor="start" className="fill-cyan-400">-0.2 (Stabile)</text>
            <text x={GW / 2} textAnchor="middle">0.65</text>
            <text x={GW} textAnchor="end" className="fill-red-400">1.2 (Instabile)</text>
          </g>
        </g>

        {/* ══════════════════════════════════════════════════ */}
        {/* ATTRIBUTION */}
        {/* ══════════════════════════════════════════════════ */}
        <text x={SVG_W / 2} y={TOTAL_H - 10} textAnchor="middle" className="fill-slate-600 font-medium text-[8px]">
          Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium
        </text>
      </svg>
    </div>
  );
}
