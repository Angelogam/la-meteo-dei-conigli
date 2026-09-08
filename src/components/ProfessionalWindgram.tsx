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
// Layout constants
// ─────────────────────────────────────────────────────
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
const NUM_HOURS = HOURS.length;
const COLS = NUM_HOURS;

// Plot geometry
const WX = 1060;
const HEADER_H = 58;
const PLOT_H = 500;
const PLOT_Y0 = HEADER_H + 12;
const AXIS_H = 42;
const TOTAL_H = PLOT_Y0 + PLOT_H + AXIS_H;
const PLOT_LEFT = 68;
const PLOT_W = WX - PLOT_LEFT - 62; // 62 for right labels
const PLOT_RIGHT = PLOT_LEFT + PLOT_W;

// Altitude range
const ALT_MIN = 1200;
const ALT_MAX = 6000;

// Pressure level grid
const LEVELS = [
  { hpa: 500, alt: 5800 },
  { hpa: 600, alt: 4400 },
  { hpa: 700, alt: 3100 },
  { hpa: 850, alt: 1450 },
];

// ─────────────────────────────────────────────────────
// DeltaT color scale (Alpium standard)
// ─────────────────────────────────────────────────────
const DT_COLORS = [
  { val: -0.20, color: "#7c3aed" },
  { val: -0.05, color: "#4f46e5" },
  { val:  0.00, color: "#2563eb" },
  { val:  0.16, color: "#0891b2" },
  { val:  0.32, color: "#059669" },
  { val:  0.48, color: "#65a30d" },
  { val:  0.65, color: "#ca8a04" },
  { val:  0.82, color: "#ea580c" },
  { val:  1.00, color: "#dc2626" },
  { val:  1.20, color: "#991b1b" },
];

function getDTColor(dt: number): string {
  if (dt <= DT_COLORS[0].val) return DT_COLORS[0].color;
  if (dt >= DT_COLORS[DT_COLORS.length - 1].val) return DT_COLORS[DT_COLORS.length - 1].color;
  for (let i = 0; i < DT_COLORS.length - 1; i++) {
    if (dt >= DT_COLORS[i].val && dt <= DT_COLORS[i + 1].val) {
      // Interpolate color
      const f = (dt - DT_COLORS[i].val) / (DT_COLORS[i + 1].val - DT_COLORS[i].val);
      return blendColors(DT_COLORS[i].color, DT_COLORS[i + 1].color, f);
    }
  }
  return DT_COLORS[DT_COLORS.length - 1].color;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}

function blendColors(c1: string, c2: string, f: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f);
}

// ─────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────
function altToY(alt: number): number {
  const a = Math.max(ALT_MIN, Math.min(ALT_MAX, alt));
  return PLOT_Y0 + PLOT_H * (1 - (a - ALT_MIN) / (ALT_MAX - ALT_MIN));
}

function yToAlt(y: number): number {
  const ratio = 1 - (y - PLOT_Y0) / PLOT_H;
  return ALT_MIN + ratio * (ALT_MAX - ALT_MIN);
}

function xFromHourIdx(idx: number): number {
  if (COLS <= 1) return PLOT_LEFT + PLOT_W / 2;
  return PLOT_LEFT + (idx / (COLS - 1)) * PLOT_W;
}

function xFromHourCol(i: number): number {
  return xFromHourIdx(i);
}

// Column boundaries
function colLeft(i: number): number {
  return i === 0 ? PLOT_LEFT : xFromHourIdx(i - 0.5);
}

function colRight(i: number): number {
  return i === COLS - 1 ? PLOT_RIGHT : xFromHourIdx(i + 0.5);
}

// ─────────────────────────────────────────────────────
// Catmull-Rom smooth path
// ─────────────────────────────────────────────────────
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], cur = pts[i];
    const cpx = (prev.x + cur.x) / 2;
    d += ` Q ${prev.x},${prev.y} ${cpx},${(prev.y + cur.y) / 2}`;
    d += ` Q ${cur.x},${cur.y} ${cur.x},${cur.y}`;
  }
  return d;
}

function linePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

// ─────────────────────────────────────────────────────
// Wind barb (meteorological convention: points FROM where wind comes)
// ─────────────────────────────────────────────────────
function WindBarb({ cx, cy, speed, dir }: { cx: number; cy: number; speed: number; dir: number }) {
  if (speed == null || isNaN(speed) || speed < 1) return null;
  const knots = speed * 0.54;

  // Wind barb points toward where wind COMES FROM
  const rad = ((dir - 90) * Math.PI) / 180;
  const len = 18;
  const ex = cx + len * Math.cos(rad);
  const ey = cy + len * Math.sin(rad);

  // Feathers on the RIGHT side of the staff
  const featherRad = rad + Math.PI * 0.63;
  const fc = Math.cos(featherRad), fs = Math.sin(featherRad);

  const col = speed > 35 ? "#b91c1c" : speed > 20 ? "#7e22ce" : "#1e3a5f";

  const elems: React.ReactNode[] = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;
  const s50 = 0.24, s10 = 0.17, s5 = 0.13;

  while (rem >= 50 && pos >= s50) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    const t = 9;
    elems.push(
      <polygon key={`f50-${cx.toFixed(0)}-${cy.toFixed(0)}`}
        points={`${bx},${by} ${bx + t * fc},${by + t * fs} ${bx + t * 0.5 * Math.cos(rad)},${by + t * 0.5 * Math.sin(rad)}`}
        fill={col} stroke={col} strokeWidth="0.5" />
    );
    rem -= 50; pos -= s50;
  }
  while (rem >= 10 && pos >= s10) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    const t = 8;
    elems.push(
      <line key={`f10-${cx.toFixed(0)}-${cy.toFixed(0)}`}
        x1={bx} y1={by} x2={bx + t * fc} y2={by + t * fs}
        stroke={col} strokeWidth="1.5" strokeLinecap="round" />
    );
    rem -= 10; pos -= s10;
  }
  if (rem >= 5 && pos >= s5) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    const t = 4.5;
    elems.push(
      <line key={`f5-${cx.toFixed(0)}-${cy.toFixed(0)}`}
        x1={bx} y1={by} x2={bx + t * fc} y2={by + t * fs}
        stroke={col} strokeWidth="1.5" strokeLinecap="round" />
    );
  }

  return (
    <g>
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={col} strokeWidth="1.3" strokeLinecap="round" />
      {elems}
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Paraglider icon
// ─────────────────────────────────────────────────────
function ParagliderIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M -10,-4 C -6,-14 6,-14 10,-4 C 5,-9 -5,-9 -10,-4 Z"
        fill="#f3e8ff" stroke="#7e22ce" strokeWidth="1.5" />
      <line x1="-8" y1="-4" x2="0" y2="5" stroke="#7e22ce" strokeWidth="0.9" />
      <line x1="8" y1="-4" x2="0" y2="5" stroke="#7e22ce" strokeWidth="0.9" />
      <circle cx="0" cy="5" r="2.8" fill="#fff" stroke="#7e22ce" strokeWidth="1.4" />
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Snowflake icon
// ─────────────────────────────────────────────────────
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="6.5" fill="#fff" stroke="#0284c7" strokeWidth="1.2" />
      <g stroke="#0284c7" strokeWidth="0.8" strokeLinecap="round">
        <line x1="0" y1="-3.5" x2="0" y2="3.5" />
        <line x1="-3.5" y1="0" x2="3.5" y2="0" />
        <line x1="-2.5" y1="-2.5" x2="2.5" y2="2.5" />
        <line x1="-2.5" y1="2.5" x2="2.5" y2="-2.5" />
      </g>
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Cloud badge (purple semi-circle with % and altitude)
// ─────────────────────────────────────────────────────
function CloudBadge({ x, y, alt, rate, pct }: { x: number; y: number; alt: number; rate: number; pct: number }) {
  return (
    <g transform={`translate(${x - 26}, ${y})`}>
      {/* Purple arc on top */}
      <path d="M -14,2 Q -14,-6 0,-6 Q 14,-6 14,2"
        fill="#e9d5ff" stroke="#a855f7" strokeWidth="1.3" />
      {/* Text */}
      <text x="0" y="7" textAnchor="middle" fontSize="8" fontWeight="800"
        fill="#0f172a" fontFamily="monospace">{alt} m</text>
      <text x="0" y="17" textAnchor="middle" fontSize="8" fontWeight="800"
        fill="#7e22ce" fontFamily="monospace">↑ {rate.toFixed(1)} m/s</text>
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Main component
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

  // ── Fetch data ──────────────────────────────────────
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

  // ── Build hourly columns ────────────────────────────
  const columns = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times: string[] = data.hourly.time;
    const h = data.hourly;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) return null;

      const t2m = h.temperature_2m[idx] ?? 15;
      const dew2m = h.dew_point_2m?.[idx] ?? (t2m - 6);
      const hum = h.relative_humidity_2m?.[idx] ?? 60;
      const rad = h.shortwave_radiation?.[idx] ?? 400;
      const directRad = h.direct_radiation?.[idx] ?? 200;
      const cloud = h.cloud_cover?.[idx] ?? 30;
      const cloudLow = h.cloud_cover_low?.[idx] ?? 0;
      const cloudMid = h.cloud_cover_mid?.[idx] ?? 0;
      const cloudHigh = h.cloud_cover_high?.[idx] ?? 0;
      const precip = h.precipitation?.[idx] ?? 0;
      const cape = h.cape?.[idx] ?? 0;
      const li = h.lifted_index?.[idx] ?? 5;
      const cin = h.convective_inhibition?.[idx] ?? 0;
      const wind10 = h.wind_speed_10m?.[idx] ?? 5;
      const windDir10 = h.wind_direction_10m?.[idx] ?? 180;
      const gust10 = h.wind_gusts_10m?.[idx] ?? wind10 * 1.3;
      const sunDur = h.sunshine_duration?.[idx] ?? 0;
      const freeze = h.freezing_level_height?.[idx] ?? Math.round(altitude + t2m / 0.0065);
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];

      // Spread & cloud base
      const spread = Math.max(0.5, t2m - dew2m);
      const cloudBase = Math.round(altitude + spread * 125);

      // Solar percentage
      const sunPct = Math.min(100, Math.max(5, Math.round((rad / 950) * (1 - cloud / 100 * 0.7) * 100)));

      // Thermal rate
      let rateo = 0.5 + spread * 0.07 + (sunPct / 100) * 0.4 + (cape > 100 ? Math.min(1.0, cape / 800) : 0);
      if (precip > 0.3) rateo = Math.min(rateo, 0.3);
      else if (cloud > 80) rateo *= 0.35;
      if (cin > 100) rateo *= 0.5;
      rateo = Math.max(0.2, Math.min(3.0, Math.round(rateo * 10) / 10));

      // Thermal top
      const thermalTop = Math.round(Math.min(4800, cloudBase + Math.min(1200, rateo * 130 + cape * 0.08)));

      // Surface-level deltaT/100m
      const surfaceDeltaT = t80 != null ? Math.round(((t2m - t80) / 78) * 100 * 100) / 100
        : t120 != null ? Math.round(((t2m - t120) / 118) * 100 * 100) / 100
        : spread >= 10 ? 0.95 : spread >= 5 ? 0.72 : 0.55;

      // Real level winds (with fallback interpolation)
      const levelWinds = [
        { hpa: 500, alt: 5800, speed: h.wind_speed_500hPa?.[idx], dir: h.wind_direction_500hPa?.[idx] },
        { hpa: 600, alt: 4400, speed: h.wind_speed_600hPa?.[idx], dir: h.wind_direction_600hPa?.[idx] },
        { hpa: 700, alt: 3100, speed: h.wind_speed_700hPa?.[idx], dir: h.wind_direction_700hPa?.[idx] },
        { hpa: 850, alt: 1450, speed: h.wind_speed_850hPa?.[idx], dir: h.wind_direction_850hPa?.[idx] },
      ].map((l) => ({
        ...l,
        speed: l.speed ?? Math.round(wind10 * (1 + (5800 - l.alt) / (5800 - 1450) * 1.8)),
        dir: l.dir ?? Math.round(windDir10 + (5800 - l.alt) * 0.008),
      }));

      // ── Compute lapse rate at multiple altitudes for the column ──
      // Build a temperature profile from available data points
      type TempPoint = { alt: number; temp: number };
      const tempPoints: TempPoint[] = [
        { alt: altitude, temp: t2m },
        ...(t80 != null ? [{ alt: altitude + 80, temp: t80 }] : []),
        ...(t120 != null ? [{ alt: altitude + 120, temp: t120 }] : []),
        ...(h.wind_speed_925hPa?.[idx] != null ? [{ alt: 760, temp: h.temperature_2m?.[idx] ?? t2m - 8 }] : []),
        { alt: 1450, temp: h.temperature_2m?.[idx] ?? t2m - 5 },
        { alt: 3100, temp: (h.temperature_2m?.[idx] ?? t2m) - 15 },
        { alt: 4400, temp: (h.temperature_2m?.[idx] ?? t2m) - 22 },
        { alt: 5800, temp: (h.temperature_2m?.[idx] ?? t2m) - 30 },
      ].filter((p) => p.temp != null && !isNaN(p.temp) as boolean);

      // Interpolate temperature at given altitude
      function interpTemp(alt: number): number {
        if (tempPoints.length === 0) return t2m - (alt - altitude) * 0.0065;
        const sorted = [...tempPoints].sort((a, b) => a.alt - b.alt);
        if (alt <= sorted[0].alt) return sorted[0].temp;
        if (alt >= sorted[sorted.length - 1].alt) return sorted[sorted.length - 1].temp;
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].alt <= alt && sorted[i + 1].alt >= alt) {
            const f = (alt - sorted[i].alt) / (sorted[i + 1].alt - sorted[i].alt);
            return sorted[i].temp + f * (sorted[i + 1].temp - sorted[i].temp);
          }
        }
        return t2m;
      }

      // Compute lapse rate (ΔT/100m) at various altitudes
      const lapseRates: { alt: number; dt: number }[] = [];
      const sampleAlts = [
        altitude, altitude + 200, altitude + 400, altitude + 700,
        1000, 1300, 1600, 1950, 2300, 2700, 3100, 3500, 3900,
        4300, 4700, 5100, 5500, 5800,
      ];
      for (const a of sampleAlts) {
        const tBelow = interpTemp(a - 100);
        const tAbove = interpTemp(a + 100);
        const dt = Math.round(((tAbove - tBelow) / 200) * 100 * 100) / 100;
        lapseRates.push({ alt: a, dt });
      }

      return {
        hour: targetHour,
        idx,
        x: xFromHourIdx(HOURS.indexOf(targetHour)),
        t2m, dew2m, hum,
        spread, cloud, cloudLow, cloudMid, cloudHigh,
        precip, cape, li, cin,
        wind10, windDir10, gust10,
        sunPct, sunDur,
        surfaceDeltaT, rateo,
        cloudBase, thermalTop, freeze,
        levelWinds, lapseRates,
        yCloudBase: altToY(cloudBase),
        yThermalTop: altToY(thermalTop),
        yFreeze: altToY(freeze),
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [data, altitude]);

  // ── Paths for curves ────────────────────────────────
  const thermalTopPts = useMemo(
    () => columns.map((c) => ({ x: c.x, y: c.yThermalTop })),
    [columns]
  );
  const freezePts = useMemo(
    () => columns.map((c) => ({ x: c.x, y: c.yFreeze })),
    [columns]
  );
  const cloudBasePts = useMemo(
    () => columns.map((c) => ({ x: c.x, y: c.yCloudBase })),
    [columns]
  );
  const pblPts = useMemo(
    () => columns.map((c) => ({
      x: c.x,
      y: altToY(Math.min(ALT_MAX, Math.max(ALT_MIN, c.cloudBase + c.rateo * 550))),
    })),
    [columns]
  );

  const avgFreeze = useMemo(() => {
    if (!columns.length) return altitude + 3000;
    return Math.round(columns.reduce((s, c) => s + c.freeze, 0) / columns.length);
  }, [columns, altitude]);

  // Cloud badges for middle hours
  const cloudBadges = useMemo(() => {
    return columns.slice(1, -1).map((c) => ({
      x: c.x,
      y: altToY(c.cloudBase + 200),
      alt: c.cloudBase,
      rate: c.rateo,
      pct: c.cloud,
    }));
  }, [columns]);

  // Precipitation labels
  const precipLabels = useMemo(() =>
    columns.filter((c) => c.precip > 0.05).map((c) => ({
      x: c.x,
      y: altToY(ALT_MAX) - 6,
      amount: c.precip,
    })), [columns]
  );

  // ── Loading / error ────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 p-8 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-9 h-9 text-violet-500 animate-spin mb-3" />
        <p className="text-slate-600 font-semibold">Caricamento windgram…</p>
        <p className="text-xs text-slate-400 mt-1">{siteName} · {dateStr}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white rounded-[28px] shadow-2xl border border-rose-300 p-6 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <p className="font-bold text-rose-600">Impossibile caricare i dati</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────
  return (
    <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
      {/* ── HEADER ── */}
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight text-center lowercase">
          {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
        </h2>
        <p className="text-[10px] text-slate-500 font-mono text-center mt-0.5">
          plotted {dateStr} 00:00 UTC &middot; model ground {Math.round(altitude + 5)} m &middot; SRTM {Math.round(altitude)} m
        </p>
      </div>

      {/* ── TOP STRIP: ascendenze + sole ── */}
      <div className="px-5 pb-2">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            valore medio ascendenze (m/s)
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            sole %
          </span>
        </div>
        <div className="flex items-end justify-between gap-1">
          {columns.map((c, i) => (
            <div key={i} className="flex-1 text-center">
              <div
                className="text-base sm:text-lg font-black tabular-nums leading-tight"
                style={{ color: c.rateo >= 1.6 ? "#b91c1c" : c.rateo >= 1.0 ? "#ca8a04" : "#0f172a" }}
              >
                {c.rateo.toFixed(1)}
              </div>
              <div className="text-[10px] font-bold tabular-nums"
                style={{ color: c.sunPct >= 60 ? "#b45309" : "#64748b" }}>
                {c.sunPct}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SVG WINDGRAM ── */}
      <div className="overflow-x-auto px-2">
        <svg
          viewBox={`0 0 ${WX} ${TOTAL_H}`}
          className="w-full min-w-[700px] h-auto block"
          style={{ shapeRendering: "geometricPrecision" }}
        >
          <defs>
            {/* Cross-hatch pattern for convective zones */}
            <pattern id="crossHatch" width="5" height="5" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="5" stroke="#1e293b" strokeWidth="0.6" opacity="0.28" />
              <line x1="0" y1="0" x2="5" y2="0" stroke="#1e293b" strokeWidth="0.6" opacity="0.28" />
            </pattern>
            {/* DeltaT gradient for legend */}
            <linearGradient id="deltatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              {DT_COLORS.map((item, idx) => (
                <stop key={idx} offset={`${(idx / (DT_COLORS.length - 1)) * 100}%`} stopColor={item.color} />
              ))}
            </linearGradient>
          </defs>

          {/* ── Background: pale paper color ── */}
          <rect x={PLOT_LEFT} y={PLOT_Y0} width={PLOT_W} height={PLOT_H} fill="#fefce8" />

          {/* ── STABILITY COLOR FIELD: continuous vertical ΔT/100m bands ── */}
          {columns.map((col, ci) => {
            const xL = colLeft(ci);
            const xR = colRight(ci);
            const w = xR - xL;
            // Render 30 thin horizontal strips per column
            const strips = [];
            const N_STRIPS = 30;
            for (let si = 0; si < N_STRIPS; si++) {
              const altTop = ALT_MIN + ((N_STRIPS - si - 0.5) / N_STRIPS) * (ALT_MAX - ALT_MIN);
              const altBot = ALT_MIN + ((N_STRIPS - si - 1.5) / N_STRIPS) * (ALT_MAX - ALT_MIN);
              // Get lapse rate at this altitude
              let dt = col.surfaceDeltaT;
              for (const lr of col.lapseRates) {
                if (Math.abs(lr.alt - altTop) < 200) { dt = lr.dt; break; }
              }
              // If not found, interpolate from nearest
              if (dt === col.surfaceDeltaT) {
                // Default: decrease with altitude (more stable aloft)
                const altFactor = (altTop - ALT_MIN) / (ALT_MAX - ALT_MIN);
                dt = col.surfaceDeltaT * (1 - altFactor * 0.7) - altFactor * 0.15;
              }
              const yTop = altToY(altTop);
              const yBot = altToY(altBot);
              const color = getDTColor(dt);
              strips.push(
                <rect key={`strip-${ci}-${si}`}
                  x={xL} y={yTop} width={w} height={Math.max(1, yBot - yTop)}
                  fill={color} opacity={0.72} />
              );
            }
            return <g key={`col-bg-${ci}`}>{strips}</g>;
          })}

          {/* ── Cross-hatch over convective columns (hours with high ΔT near surface) ── */}
          {columns.map((col, ci) => {
            if (col.surfaceDeltaT < 0.6) return null;
            return (
              <rect key={`hatch-${ci}`}
                x={colLeft(ci)} y={PLOT_Y0}
                width={colRight(ci) - colLeft(ci)} height={PLOT_H}
                fill="url(#crossHatch)" />
            );
          })}

          {/* ── Pressure level grid lines ── */}
          {LEVELS.map((lv) => {
            const y = altToY(lv.alt);
            return (
              <g key={`pl-${lv.hpa}`}>
                <line x1={PLOT_LEFT} y1={y} x2={PLOT_RIGHT} y2={y}
                  stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.55" />
                <text x={PLOT_LEFT - 5} y={y + 4} textAnchor="end"
                  fontSize="10" fontWeight="700" fill="#334155" fontFamily="monospace">
                  {lv.hpa} hPa
                </text>
              </g>
            );
          })}

          {/* ── Hour vertical grid lines ── */}
          {columns.map((c, i) => (
            <line key={`vg-${i}`}
              x1={c.x} y1={PLOT_Y0} x2={c.x} y2={PLOT_Y0 + PLOT_H}
              stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.4" />
          ))}

          {/* ── Plot border ── */}
          <rect x={PLOT_LEFT} y={PLOT_Y0} width={PLOT_W} height={PLOT_H}
            fill="none" stroke="#0f172a" strokeWidth="1.2" />

          {/* ── Wind barbs at pressure levels ── */}
          {columns.map((col, ci) =>
            col.levelWinds.map((lw, li) => (
              <WindBarb key={`wb-${ci}-${li}`}
                cx={col.x} cy={altToY(lw.alt)}
                speed={lw.speed} dir={lw.dir} />
            ))
          )}

          {/* ── Zero isotherm (freezing level) ── */}
          {freezePts.length >= 2 && (
            <>
              <path d={smoothPath(freezePts)} fill="none" stroke="#0284c7"
                strokeWidth="2" strokeDasharray="7 4" strokeLinecap="round" opacity="0.9" />
              {freezePts.map((p, i) => (
                <SnowflakeIcon key={`sf-${i}`} x={p.x} y={p.y - 12} />
              ))}
            </>
          )}

          {/* ── Zero thermal label badge ── */}
          {freezePts[0] && (
            <g transform={`translate(${PLOT_RIGHT - 118}, ${altToY(avgFreeze) - 14})`}>
              <rect x="0" y="0" width="114" height="26" rx="5"
                fill="#fff" stroke="#0284c7" strokeWidth="1.4" />
              <text x="57" y="18" textAnchor="middle" fontSize="11" fontWeight="800"
                fill="#0284c7" fontFamily="monospace">
                0 °C · {avgFreeze} m
              </text>
            </g>
          )}

          {/* ── Thermal top curve (purple solid) ── */}
          {thermalTopPts.length >= 2 && (
            <path d={smoothPath(thermalTopPts)} fill="none" stroke="#9333ea"
              strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* ── Paraglider icons on thermal top ── */}
          {columns.map((c, i) => (
            <ParagliderIcon key={`pg-${i}`} x={c.x} y={c.yThermalTop - 4} />
          ))}

          {/* ── Cloud base curve (light purple dashed) ── */}
          {cloudBasePts.length >= 2 && (
            <path d={smoothPath(cloudBasePts)} fill="none" stroke="#a855f7"
              strokeWidth="1.3" strokeDasharray="5 3" opacity="0.7" />
          )}

          {/* ── Thermal percentage level curves ── */}
          {[25, 50, 75].map((pct) => {
            const pts = columns.map((c) => ({
              x: c.x,
              y: altToY(c.cloudBase + (c.thermalTop - c.cloudBase) * (pct / 100)),
            }));
            return (
              <path key={`tlc-${pct}`} d={linePath(pts)} fill="none"
                stroke="#6366f1" strokeWidth="1.1" strokeDasharray="4 3" opacity="0.5" />
            );
          })}

          {/* ── PBL curve (black dashed) ── */}
          {pblPts.length >= 2 && (
            <path d={smoothPath(pblPts)} fill="none" stroke="#0f172a"
              strokeWidth="1.8" strokeDasharray="5 4" strokeLinecap="round" opacity="0.65" />
          )}

          {/* ── Cloud base badges ── */}
          {cloudBadges.map((b, i) => (
            <CloudBadge key={`cb-${i}`} x={b.x} y={b.y} alt={b.alt} rate={b.rate} pct={b.pct} />
          ))}

          {/* ── Cloud coverage % labels ── */}
          {columns.slice(1, -1).map((c, i) => (
            <g key={`cpct-${i}`} transform={`translate(${c.x}, ${altToY(c.cloudBase + 300)})`}>
              <text x="0" y="0" textAnchor="middle" fontSize="8" fontWeight="700"
                fill="#475569" fontFamily="monospace">{c.cloud}%</text>
            </g>
          ))}

          {/* ── Precipitation labels ── */}
          {precipLabels.map((pl, i) => (
            <g key={`prec-${i}`} transform={`translate(${pl.x - 16}, ${pl.y})`}>
              <rect x="0" y="0" width="32" height="14" rx="3"
                fill="#dbeafe" stroke="#3b82f6" strokeWidth="0.8" />
              <text x="16" y="10" textAnchor="middle" fontSize="8" fontWeight="700"
                fill="#1e40af" fontFamily="monospace">{pl.amount.toFixed(2)} mm</text>
            </g>
          ))}

          {/* ── X-axis labels ── */}
          {columns.map((c) => (
            <g key={`xl-${c.hour}`}>
              <line x1={c.x} y1={PLOT_Y0 + PLOT_H} x2={c.x} y2={PLOT_Y0 + PLOT_H + 6}
                stroke="#0f172a" strokeWidth="1" />
              <text x={c.x} y={PLOT_Y0 + PLOT_H + 20} textAnchor="middle"
                fontSize="11" fontWeight="700" fill="#0f172a" fontFamily="monospace">
                {String(c.hour).padStart(2, "0")}:00
              </text>
            </g>
          ))}

          {/* ── Right-side altitude ticks ── */}
          {[1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000].map((alt) => {
            const y = altToY(alt);
            return (
              <g key={`rt-${alt}`}>
                <line x1={PLOT_RIGHT} y1={y} x2={PLOT_RIGHT + 5} y2={y}
                  stroke="#0f172a" strokeWidth="1" />
                <text x={PLOT_RIGHT + 9} y={y + 4} textAnchor="start"
                  fontSize="9" fontWeight="600" fill="#475569" fontFamily="monospace">
                  {alt} m
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── DELTA T LEGEND ── */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
          <span>Stabile &larr;</span>
          <span className="text-slate-900 text-xs">&Delta;T / 100 m</span>
          <span>&rarr; Instabile</span>
        </div>
        <div className="w-full h-3 rounded-sm overflow-hidden border border-slate-300 flex">
          {DT_COLORS.map((item, idx) => (
            <div key={idx} className="flex-1 h-full" style={{ backgroundColor: item.color }} />
          ))}
        </div>
        <div className="flex justify-between text-[9px] font-mono font-bold text-slate-600 mt-0.5 px-0.5">
          {DT_COLORS.map((item, idx) => (
            <span key={idx}>{item.val.toFixed(2)}</span>
          ))}
        </div>
        <p className="text-center text-[9px] text-slate-400 font-mono mt-1.5">
          Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo &middot; Diagnostica di volo a vela di Alpium
        </p>
      </div>
    </div>
  );
}
