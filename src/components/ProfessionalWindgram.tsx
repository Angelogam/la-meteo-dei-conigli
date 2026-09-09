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

const SVG_W = 1400;
const HEADER_H = 140;
const PLOT_TOP = HEADER_H;
const PLOT_H = 700;
const FOOTER_H = 120;
const TOTAL_H = HEADER_H + PLOT_H + FOOTER_H;
const ML = 180; // margin left — widened for vertical altitude labels
const MR = 100;  // margin right — wider for right-side altitude labels
const GW = SVG_W - ML - MR;
const GH = PLOT_H;

const ALT_MIN = 1000;
const ALT_MAX = 4000;

// Wind direction abbreviations
const DIR_ABBREV: Record<number, string> = {
  0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SO", 270: "O", 315: "NO",
};
function getDirAbbrev(deg: number): string {
  const dirs = ["N", "NO", "O", "SO", "S", "SE", "E", "NE"];
  return dirs[Math.round(deg / 45) % 8];
}
function speedKmh(speed: number): string {
  return String(Math.round(speed * 3.6));
}

// ΔT color scale (Alpium)
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

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
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

function altToY(alt: number): number {
  const a = Math.max(ALT_MIN, Math.min(ALT_MAX, alt));
  return PLOT_TOP + GH * (1 - (a - ALT_MIN) / (ALT_MAX - ALT_MIN));
}
function yToAlt(y: number): number {
  return ALT_MIN + (1 - (y - PLOT_TOP) / GH) * (ALT_MAX - ALT_MIN);
}
function xFromIdx(i: number): number {
  if (NUM_HOURS <= 1) return ML + GW / 2;
  return ML + (i / (NUM_HOURS - 1)) * GW;
}

// Catmull-Rom → cubic Bézier path
function toBezier(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const p2 = pts[Math.min(i + 1, pts.length - 1)];
    const c1x = p0.x + (p1.x - p0.x) / 3;
    const c1y = p0.y + (p1.y - p0.y) / 3;
    const c2x = p1.x - (p2.x - p1.x) / 3;
    const c2y = p1.y - (p2.y - p1.y) / 3;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

// Sinuous path with wave modulation (for thermal base)
function toSinuousPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i];
    const cpX1 = prev.x + (curr.x - prev.x) * 0.45;
    const cpY1 = prev.y - (i % 2 === 0 ? 15 : -15);
    const cpX2 = prev.x + (curr.x - prev.x) * 0.75;
    const cpY2 = curr.y + (i % 2 === 0 ? -10 : 10);
    d += ` C ${cpX1.toFixed(1)},${cpY1.toFixed(1)} ${cpX2.toFixed(1)},${cpY2.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  return d;
}

// ─────────────────────────────────────────────────────
// Snowflake icon — enlarged for phone visibility
// ─────────────────────────────────────────────────────
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="14" fill="#fff" stroke="#0284c7" strokeWidth="2.5" />
      <g stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round">
        <line x1="0" y1="-8" x2="0" y2="8" />
        <line x1="-8" y1="0" x2="8" y2="0" />
        <line x1="-5.5" y1="-5.5" x2="5.5" y2="5.5" />
        <line x1="-5.5" y1="5.5" x2="5.5" y2="-5.5" />
      </g>
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
      const freeze = h.freezing_level_height?.[idx] ?? Math.round(altitude + t2m / 0.0065);
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];
      const sunDur = h.sunshine_duration?.[idx] ?? 0;

      const spread = Math.max(0.5, t2m - dew2m);
      const cloudBase = Math.round(altitude + spread * 125);
      const sunPct = Math.min(100, Math.max(5, Math.round((rad / 950) * (1 - cloud / 100 * 0.7) * 100)));

      let rateo = 0.5 + spread * 0.07 + (sunPct / 100) * 0.4 + (cape > 100 ? Math.min(1.0, cape / 800) : 0);
      if (precip > 0.3) rateo = Math.min(rateo, 0.3);
      else if (cloud > 80) rateo *= 0.35;
      if (cin > 100) rateo *= 0.5;
      rateo = Math.max(0.2, Math.min(3.0, Math.round(rateo * 10) / 10));

      const hourFrac = (targetHour - 8) / 10;
      const sineEnvelope = Math.sin(hourFrac * Math.PI);
      const thermalTop = Math.round(Math.min(5200, cloudBase + Math.min(1400, rateo * 150 + cape * 0.1 + sineEnvelope * 300)));

      const surfaceDeltaT = t80 != null ? Math.round(((t2m - t80) / 78) * 100 * 100) / 100
        : t120 != null ? Math.round(((t2m - t120) / 118) * 100 * 100) / 100
        : spread >= 10 ? 0.95 : spread >= 5 ? 0.72 : 0.55;

      const rawLevels = [
        { hpa: 500, alt: 5570, speed: h.wind_speed_500hPa?.[idx], dir: h.wind_direction_500hPa?.[idx] },
        { hpa: 550, alt: 4860, speed: h.wind_speed_550hPa?.[idx], dir: h.wind_direction_550hPa?.[idx] },
        { hpa: 600, alt: 4200, speed: h.wind_speed_600hPa?.[idx], dir: h.wind_direction_600hPa?.[idx] },
        { hpa: 650, alt: 3580, speed: h.wind_speed_650hPa?.[idx], dir: h.wind_direction_650hPa?.[idx] },
        { hpa: 700, alt: 3010, speed: h.wind_speed_700hPa?.[idx], dir: h.wind_direction_700hPa?.[idx] },
        { hpa: 750, alt: 2470, speed: h.wind_speed_750hPa?.[idx], dir: h.wind_direction_750hPa?.[idx] },
        { hpa: 800, alt: 1950, speed: h.wind_speed_800hPa?.[idx], dir: h.wind_direction_800hPa?.[idx] },
        { hpa: 850, alt: 1460, speed: h.wind_speed_850hPa?.[idx], dir: h.wind_direction_850hPa?.[idx] },
      ].map((l) => ({
        ...l,
        speed: l.speed ?? Math.round(wind10 * (1 + (5570 - l.alt) / (5570 - 1460) * 1.5)),
        dir: l.dir ?? Math.round(windDir10 + (5570 - l.alt) * 0.005),
      }));

      // Build full wind matrix at every 250m from launch to ALT_MAX
      const launchAlt = Math.round(altitude);
      const windMatrix: { alt: number; speed: number; dir: number }[] = [];
      for (let a = launchAlt; a <= ALT_MAX; a += 250) {
        // Interpolate from raw levels (sorted descending by alt: 5570 → 1460)
        let above = rawLevels[0]!, below = rawLevels[rawLevels.length - 1]!;
        for (let ri = 0; ri < rawLevels.length - 1; ri++) {
          if (rawLevels[ri]!.alt <= a && rawLevels[ri + 1]!.alt >= a) {
            below = rawLevels[ri + 1]!;
            above = rawLevels[ri]!;
            break;
          }
        }
        const span = above.alt - below.alt || 1;
        const f = (a - below.alt) / span;
        const wSpeed = Math.round(below.speed + f * (above.speed - below.speed));
        let wDir = below.dir + f * (above.dir - below.dir);
        if (wDir < 0) wDir += 360;
        if (wDir >= 360) wDir -= 360;
        windMatrix.push({ alt: a, speed: Math.max(1, wSpeed), dir: Math.round(wDir) });
      }

      type TP = { alt: number; temp: number };
      const tempPts: TP[] = [
        { alt: altitude, temp: t2m },
        ...(t80 != null ? [{ alt: altitude + 80, temp: t80 }] : []),
        ...(t120 != null ? [{ alt: altitude + 120, temp: t120 }] : []),
        { alt: 1460, temp: t2m - (1460 - altitude) * 0.0065 },
        { alt: 3010, temp: t2m - (3010 - altitude) * 0.007 },
        { alt: 4200, temp: t2m - (4200 - altitude) * 0.0075 },
        { alt: 5570, temp: t2m - (5570 - altitude) * 0.008 },
      ].filter((p): p is TP => p.temp != null && !isNaN(p.temp));

      function interpT(a: number): number {
        if (tempPts.length === 0) return t2m - (a - altitude) * 0.0065;
        const s = [...tempPts].sort((a, b) => a.alt - b.alt);
        if (a <= s[0].alt) return s[0].temp;
        if (a >= s[s.length - 1].alt) return s[s.length - 1].temp;
        for (let i = 0; i < s.length - 1; i++) {
          if (s[i].alt <= a && s[i + 1].alt >= a) {
            const f = (a - s[i].alt) / (s[i + 1].alt - s[i].alt);
            return s[i].temp + f * (s[i + 1].temp - s[i].temp);
          }
        }
        return t2m;
      }

      const lapseRates: { alt: number; dt: number }[] = [];
      const sampleAlts = [altitude, altitude + 300, altitude + 600, altitude + 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 5800];
      for (const a of sampleAlts) {
        const tB = interpT(a - 150);
        const tA = interpT(a + 150);
        lapseRates.push({ alt: a, dt: Math.round(((tA - tB) / 300) * 100 * 100) / 100 });
      }

      return {
        hour: targetHour, idx,
        x: xFromIdx(HOURS.indexOf(targetHour)),
        t2m, dew2m, hum, spread, cloud, precip, cape,
        wind10, windDir10, sunPct, sunDur,
        surfaceDeltaT, rateo,
        cloudBase, thermalTop, freeze,
        levelWinds: rawLevels, windMatrix, lapseRates,
        yCloudBase: altToY(cloudBase),
        yThermalTop: altToY(thermalTop),
        yFreeze: altToY(freeze),
        sineEnvelope,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [data, altitude]);

  // ── Pre-compute curves ─────────────────────────────
  const boundaryAlts = useMemo(() =>
    columns.map((c) => {
      const hourFrac = (c.hour - 8) / 10;
      const sine = Math.sin(hourFrac * Math.PI);
      const baseAlt = ALT_MIN + 180;
      const amp = c.rateo * 220 + c.cape * 0.08 + 160;
      return Math.min(ALT_MAX - 50, Math.max(ALT_MIN + 80, Math.round(baseAlt + sine * amp)));
    }),
    [columns]
  );
  const boundaryYPts = useMemo(
    () => columns.map((c, i) => ({ x: c.x, y: altToY(boundaryAlts[i]) })),
    [columns, boundaryAlts]
  );
  const boundaryPath = useMemo(() => toBezier(boundaryYPts), [boundaryYPts]);
  const sinuousBoundaryPath = useMemo(() => toSinuousPath(boundaryYPts), [boundaryYPts]);

  const thermalTopPts = useMemo(() => columns.map((c) => ({ x: c.x, y: c.yThermalTop })), [columns]);
  const thermalTopPath = useMemo(() => toBezier(thermalTopPts), [thermalTopPts]);
  const freezePts = useMemo(() => columns.map((c) => ({ x: c.x, y: c.yFreeze })), [columns]);
  const freezePath = useMemo(() => toBezier(freezePts), [freezePts]);
  const cloudBasePts = useMemo(() => columns.map((c) => ({ x: c.x, y: c.yCloudBase })), [columns]);
  const cloudBasePath = useMemo(() => toBezier(cloudBasePts), [cloudBasePts]);
  const avgFreeze = useMemo(
    () => columns.length ? Math.round(columns.reduce((s, c) => s + c.freeze, 0) / columns.length) : altitude + 3200,
    [columns, altitude]
  );

  // Cloud badges data
  const cloudBadges = useMemo(
    () => columns.map((c) => ({
      x: c.x,
      y: c.yThermalTop,
      alt: c.cloudBase,
      rate: c.rateo,
      cloudPct: Math.round(c.cloud),
    })),
    [columns]
  );

  // Interpolate lapse rate at arbitrary point
  function interpLapseAt(colFrac: number, alt: number): number {
    const ci0 = Math.floor(colFrac * (columns.length - 1));
    const ci1 = Math.min(ci0 + 1, columns.length - 1);
    const cf = colFrac * (columns.length - 1) - ci0;
    const c0 = columns[ci0]!, c1 = columns[ci1]!;

    function lapseInCol(col: typeof c0, a: number): number {
      const lr = col.lapseRates;
      if (lr.length < 2) return col.surfaceDeltaT;
      for (let i = 0; i < lr.length - 1; i++) {
        if (lr[i]!.alt <= a && lr[i + 1]!.alt >= a) {
          const f = (a - lr[i]!.alt) / (lr[i + 1]!.alt - lr[i]!.alt);
          return lr[i]!.dt + f * (lr[i + 1]!.dt - lr[i]!.dt);
        }
      }
      return lr[0]!.dt;
    }

    return lapseInCol(c0, alt) + (lapseInCol(c1, alt) - lapseInCol(c0, alt)) * cf;
  }

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
  const xStep = GW / (HOURS.length - 1);

  return (
    <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
      <svg
        viewBox={`0 0 ${SVG_W} ${TOTAL_H}`}
        className="w-full h-auto block"
        style={{ shapeRendering: "geometricPrecision" }}
      >
        <defs>
          {/* Clip path for graph area */}
          <clipPath id="graphClip">
            <rect x={plotLeft} y={PLOT_TOP} width={GW} height={GH} />
          </clipPath>

          {/* Ground hatch — thicker, darker */}
          <pattern id="groundHatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#0f172a" strokeWidth="1.8" opacity="0.4" />
          </pattern>

          {/* Light rain pattern — blue, thinner */}
          <pattern id="lightRainPattern" width="10" height="10" patternTransform="rotate(70 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#0284c7" strokeWidth="2" opacity="0.5" />
          </pattern>

          {/* Storm pattern — purple, thick */}
          <pattern id="stormPattern" width="12" height="12" patternTransform="rotate(75 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#4c1d95" strokeWidth="3" opacity="0.65" />
          </pattern>

          {/* Atmosphere gradient — darker blue top (more stable) */}
          <linearGradient id="bgAtmosphere" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="30%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#fef08a" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          {/* ΔT lapse rate bar gradient */}
          <linearGradient id="lapseRateBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="30%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* Drop shadow filter */}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* White background */}
        <rect x="0" y="0" width={SVG_W} height={TOTAL_H} fill="#ffffff" />

        {/* ══════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ══════════════════════════════════════════════════ */}
        <text x={SVG_W / 2} y="32" textAnchor="middle" className="fill-slate-900 font-black text-4xl tracking-wide">
                  {siteName.toLowerCase()} · Decollo {Math.round(altitude)}m
                </text>
                <text x={SVG_W / 2} y="54" textAnchor="middle" className="fill-slate-600 font-bold text-base">
                  Meteo Open-Meteo / AROME · Profilo Meteo Elaborato
                </text>
        
                {/* Top numeric strip labels */}
                <text x={ML - 20} y="65" textAnchor="end" className="fill-slate-500 font-black text-sm">ASCENDENZE</text>
                <text x={ML - 20} y="82" textAnchor="end" className="fill-slate-500 font-black text-sm">SOLE %</text>

        {/* Top numeric values */}
        {columns.map((c, i) => (
          <g key={`head-${i}`}>
            <text x={c.x} y="65" textAnchor="middle"
              className={c.rateo >= 1.6 ? "fill-red-600 font-black text-base" : c.rateo >= 1.0 ? "fill-orange-600 font-black text-base" : "fill-slate-900 font-black text-base"}>
              {c.rateo.toFixed(1)}
            </text>
            <text x={c.x} y="82" textAnchor="middle" className="fill-blue-600 font-extrabold text-sm">
              {c.cloud.toFixed(0)}%
            </text>
          </g>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* PLOT BACKGROUND — Alpium heat map gradient */}
        {/* ══════════════════════════════════════════════════ */}
        {/* GRAPH AREA — clipped to plot bounds */}
        {/* ══════════════════════════════════════════════════ */}
        <g clipPath="url(#graphClip)">
          {/* Atmosphere background gradient */}
          <rect x={plotLeft} y={PLOT_TOP} width={GW} height={GH}
            fill="url(#bgAtmosphere)" />

          {/* Weather events — rain & thunderstorm columns */}
          {(() => {
            const eventCols = columns.filter((c) => c.precip > 0.05);
            return eventCols.map((col, ri) => {
              const xC = col.x;
              const halfW = xStep / 2;
              const yTop = altToY(ALT_MAX);
              const yBase = altToY(Math.max(ALT_MIN, col.cloudBase));
              const isStorm = col.precip > 5;
              const pattern = isStorm ? "url(#stormPattern)" : "url(#lightRainPattern)";
              return (
                <g key={`evt-${col.hour}`}>
                  <rect x={xC - halfW} y={yTop} width={halfW * 2} height={yBase - yTop}
                    fill={pattern} />
                  {isStorm ? (
                    <g transform={`translate(${xC}, ${yTop + 25})`}>
                      <rect x="-40" y="-18" width="80" height="28" rx="5"
                        fill="#3b0764" stroke="#e9d5ff" strokeWidth="2" />
                      <text x="0" y="1" textAnchor="middle"
                        className="fill-amber-300 font-black text-[12px]">⚡ {col.precip.toFixed(1)} mm</text>
                    </g>
                  ) : (
                    <g transform={`translate(${xC}, ${yTop + 25})`}>
                      <rect x="-36" y="-15" width="72" height="22" rx="4"
                        fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="0" y="1" textAnchor="middle"
                        className="fill-white font-black text-[11px]">💧 {col.precip.toFixed(1)} mm</text>
                    </g>
                  )}
                </g>
              );
            });
          })()}

          {/* Terrain / ground below launch altitude */}
          {(() => {
            const launchY = altToY(Math.round(altitude));
            const groundY = altToY(ALT_MIN);
            return (
              <g>
                <rect x={plotLeft} y={launchY} width={GW} height={groundY - launchY}
                  fill="url(#groundHatch)" />
                <line x1={plotLeft} y1={launchY} x2={plotLeft + GW} y2={launchY}
                  stroke="#0f172a" strokeWidth="3.5" />
              </g>
            );
          })()}

          {/* CROSS-HATCH — unstable column zones */}
          {columns.map((col, ci) => {
            if (col.surfaceDeltaT < 0.55) return null;
            const bY = altToY(boundaryAlts[ci]);
            const xL = col.x - xStep / 2;
            const xR = col.x + xStep / 2;
            const hatchLines: React.ReactNode[] = [];
            const sp = 6;
            for (let hx = xL - GH; hx < xR + GH; hx += sp) {
              hatchLines.push(
                <line key={`d-${ci}-${hx}`} x1={hx} y1={bY} x2={hx + (plotBottom - bY)} y2={plotBottom}
                  stroke="rgba(0,0,0,0.13)" strokeWidth="0.85" />
              );
              hatchLines.push(
                <line key={`u-${ci}-${hx}`} x1={hx} y1={plotBottom} x2={hx + (plotBottom - bY)} y2={bY}
                  stroke="rgba(0,0,0,0.13)" strokeWidth="0.85" />
              );
            }
            return <g key={`ch-${ci}`}>{hatchLines}</g>;
          })}

        {/* ══════════════════════════════════════════════════ */}
        {/* HORIZONTAL GRID LINES + ALTITUDE LABELS (every 250m, both sides) */}
        {/* ══════════════════════════════════════════════════ */}
        {(() => {
          const launchAlt = Math.round(altitude);
          const altStart = Math.floor((launchAlt - 1) / 250) * 250;
          const els: React.ReactNode[] = [];
          const estTemp = (alt: number): string => {
            const surfaceT = Math.round(columns[0]?.t2m ?? 20);
            return `${surfaceT - Math.round((alt - ALT_MIN) * 0.0065 * 10) / 10}°C`;
          };
          for (let a = altStart; a <= 4000; a += 250) {
            const y = altToY(a);
            const tempStr = estTemp(a);
            els.push(
              <g key={`grid-${a}`}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y}
                  stroke="#0f172a" strokeWidth="0.8" opacity="0.15" />
                {/* Left side — wide margin accommodates it */}
                <text x={plotLeft - 18} y={y + 6} textAnchor="end"
                  className="fill-slate-950 font-black text-base tracking-tight">
                  {a} m
                  <tspan className="fill-blue-700 font-extrabold"> ({tempStr})</tspan>
                </text>
                {/* Right side — altitude scale from launch to 4000m */}
                <text x={plotRight + 18} y={y + 6} textAnchor="start"
                  className="fill-slate-950 font-black text-base tracking-tight">
                  {a} m
                  <tspan className="fill-blue-700 font-extrabold"> ({tempStr})</tspan>
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
        {/* WIND BARBS — proper arrows with speed badges every 250m */}
        {/* ══════════════════════════════════════════════════ */}
        {columns.map((col) =>
          col.windMatrix.map((wm) => {
            const y = altToY(wm.alt);
            const speedKm = wm.speed;
            const angle = ((wm.dir - 90) * Math.PI) / 180;
            const stickLen = 24; // Increased from 18 to 24 for better visibility
            const ex = col.x + stickLen * Math.cos(angle);
            const ey = y + stickLen * Math.sin(angle);
            return (
              <g key={`wb-${col.hour}-${wm.alt}`}>
                {/* Long stick */}
                <line x1={col.x} y1={y} x2={ex} y2={ey}
                  stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
                {/* Arrow head */}
                <polygon points={`${col.x},${y} ${ex - 8 * Math.cos(angle - 0.4)},${ey - 8 * Math.sin(angle - 0.4)} ${ex - 8 * Math.cos(angle + 0.4)},${ey - 8 * Math.sin(angle + 0.4)}`}
                  fill="#0f172a" />
                {/* Speed tick */}
                <line x1={col.x + 6 * Math.cos(angle)} y1={y + 6 * Math.sin(angle)}
                  x2={col.x + 18 * Math.cos(angle) - 6 * Math.sin(angle)}
                  y2={y + 18 * Math.sin(angle) + 6 * Math.cos(angle)}
                  stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
                {speedKm > 20 && (
                  <line x1={col.x + 4 * Math.cos(angle)} y1={y + 4 * Math.sin(angle)}
                    x2={col.x + 14 * Math.cos(angle) - 5 * Math.sin(angle)}
                    y2={y + 14 * Math.sin(angle) + 5 * Math.cos(angle)}
                    stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
                )}
                {/* Text — no white badge, shadow for readability */}
                <text x={col.x} y={y + 6} textAnchor="middle"
                  className="fill-slate-950 font-black text-base"
                  style={{ textShadow: '0px 0px 4px rgba(255,255,255,0.9), 0px 0px 2px rgba(255,255,255,1)' }}>
                  {String(Math.round(speedKm))}k {getDirAbbrev(wm.dir)}
                </text>
              </g>
            );
          })
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* 0°C ISOTHERM (blue dashed + snowflakes + badge) */}
        {/* ══════════════════════════════════════════════════ */}
        {freezePts.length >= 2 && (
          <>
            <path d={freezePath} fill="none" stroke="#0284c7" strokeWidth="2.5"
              strokeDasharray="6 4" filter="url(#shadow)" />
            {freezePts.map((p, i) => (
              <SnowflakeIcon key={`sf-${i}`} x={p.x} y={p.y - 16} />
            ))}
            <g transform={`translate(${plotRight - 140}, ${altToY(avgFreeze) - 14})`}>
              <rect width="130" height="26" rx="5" fill="#fff" stroke="#0284c7" strokeWidth="2.5" filter="url(#shadow)" />
              <text x="65" y="18" textAnchor="middle" className="fill-sky-900 font-black text-sm">
                              0 °C · {avgFreeze} m
                            </text>
            </g>
          </>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* THERMAL TOP CURVE (purple solid, thick) */}
        {/* ══════════════════════════════════════════════════ */}
        {thermalTopPts.length >= 2 && (
          <path d={thermalTopPath} fill="none" stroke="#581c87" strokeWidth="6" strokeLinecap="round" />
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* THERMAL BOUNDARY (orange sinusoidal wave) */}
        {/* ══════════════════════════════════════════════════ */}
        {boundaryYPts.length >= 2 && (
          <>
            <path d={sinuousBoundaryPath} fill="none" stroke="#f97316" strokeWidth="8" opacity="0.18" strokeLinecap="round" />
            <path d={sinuousBoundaryPath} fill="none" stroke="#ea580c" strokeWidth="2.8" strokeLinecap="round" opacity="0.92" />
            <path d={sinuousBoundaryPath} fill="none" stroke="#fb923c" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
          </>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* CLOUD BASE CURVE (purple dashed) */}
        {/* ══════════════════════════════════════════════════ */}
        {cloudBasePts.length >= 2 && (
          <path d={cloudBasePath} fill="none" stroke="#a855f7" strokeWidth="1.5"
            strokeDasharray="6 3" opacity="0.65" />
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* PBL CURVE (black dashed) */}
        {/* ══════════════════════════════════════════════════ */}
        {(() => {
          const pblPts = columns.map((c) => ({
            x: c.x,
            y: altToY(Math.min(ALT_MAX, Math.max(ALT_MIN, c.cloudBase + c.rateo * 600))),
          }));
          return pblPts.length >= 2 ? (
            <path d={toBezier(pblPts)} fill="none" stroke="#0f172a" strokeWidth="2"
              strokeDasharray="6 4" opacity="0.5" />
          ) : null;
        })()}

        {/* ══════════════════════════════════════════════════ */}
        {/* THERMAL PERCENTAGE CURVES (25%, 50%, 75%) */}
        {/* ══════════════════════════════════════════════════ */}
        {[25, 50, 75].map((pct) => {
          const pts = columns.map((c) => ({
            x: c.x,
            y: altToY(c.cloudBase + (c.thermalTop - c.cloudBase) * (pct / 100)),
          }));
          return (
            <path key={`tlc-${pct}`} d={toBezier(pts)} fill="none" stroke="#6366f1" strokeWidth="1.3"
              strokeDasharray="5 3" opacity="0.4" />
          );
        })}

        {/* ══════════════════════════════════════════════════ */}
                {/* CLOUD BADGES — Compact Alpium style */}
                {/* ══════════════════════════════════════════════════ */}
                {cloudBadges.map((b) => {
                  const col = columns.find((c) => Math.abs(c.x - b.x) < 2);
                  if (!col || col.rateo < 0.55) return null;
                  const cloudVal = b.cloudPct;
                  const hasBigCloud = cloudVal > 15;
                  // Position clouds ABOVE the paraglider icons (which are at yThermalTop - 28)
                  // Cloud badges are at b.y = yThermalTop, so move clouds up by ~40px
                  const cloudYOffset = -40;
                  return (
                    <g key={`badge-${b.x}`} transform={`translate(${b.x}, ${b.y + cloudYOffset})`}>
                      {/* Large cloud puff when significant coverage — scale 1.5 (increased) */}
                      {hasBigCloud && (
                        <g transform="translate(-35, -70) scale(1.5)">
                          <path d="M 14 30 C 7 30, 2 25, 2 18 C 2 12, 7 8, 13 8 C 15 3, 21 1, 28 1 C 35 1, 41 5, 43 10 C 49 10, 54 15, 54 21 C 54 26, 48 30, 41 30 Z"
                            fill="#ffffff" stroke="#0284c7" strokeWidth="3" />
                          <text x="28" y="20" textAnchor="middle"
                            className="fill-sky-950 font-black text-[12px]">{b.cloudPct}%</text>
                        </g>
                      )}
        
                      {/* Altitude pill — enlarged */}
                      <rect x="-40" y="-4" width="80" height="22" rx="5"
                        fill="#ffffff" stroke="#581c87" strokeWidth="2.5" />
                      <text x="0" y="12" textAnchor="middle"
                        className="fill-purple-950 font-black text-base">{b.alt} m</text>
       
                      {/* Rate pill — enlarged */}
                      <rect x="-32" y="22" width="64" height="20" rx="4" fill="#581c87" />
                      <text x="0" y="36" textAnchor="middle"
                        className="fill-white font-black text-sm">↑ {b.rate.toFixed(1)} m/s</text>
                    </g>
                  );
                })}

        {/* ══════════════════════════════════════════════════ */}
                {/* PARAGLIDER ICONS — above thermal top curve, positioned below clouds */}
                {/* ══════════════════════════════════════════════════ */}
                {columns.filter((c) => c.rateo >= 0.55).map((c) => (
                  <g key={`pg-${c.hour}`} transform={`translate(${c.x}, ${c.yThermalTop - 10})`}>
                    <path d="M -22,-8 Q -15,-28 0,-28 Q 15,-28 22,-8 Q 12,-18 0,-18 Q -12,-18 -22,-8 Z"
                      fill="#dc2626" stroke="#7f1d1d" strokeWidth="2.5" />
                    <line x1="-16" y1="-8" x2="0" y2="12" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1="16" y1="-8" x2="0" y2="12" stroke="#0f172a" strokeWidth="1.5" />
                    <circle cx="0" cy="13" r="6" fill="#fff" stroke="#0f172a" strokeWidth="2" />
                  </g>
                ))}
        </g> {/* close clipPath */}

        {/* ══════════════════════════════════════════════════ */}
        {/* HOUR LABELS */}
        {/* ══════════════════════════════════════════════════ */}
        {HOURS.map((hr, i) => (
          <g key={`xl-${hr}`}>
            <line x1={xFromIdx(i)} y1={plotBottom} x2={xFromIdx(i)} y2={plotBottom + 12}
              stroke="#0f172a" strokeWidth="2.5" />
            <text x={xFromIdx(i)} y={plotBottom + 35} textAnchor="middle"
                          className="fill-slate-900 font-black text-xl">{`${String(hr).padStart(2, "0")}:00`}</text>
          </g>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* FOOTER: LEGENDA FENOMENI + ΔT BAR */}
        {/* ══════════════════════════════════════════════════ */}
        <g transform={`translate(${ML}, ${TOTAL_H - 50})`}>
                  <text x="-15" y="12" textAnchor="end" className="fill-slate-800 font-black text-sm">ΔT / 100m</text>
                  <rect x="0" y="2" width={GW} height="14" rx="4" fill="url(#lapseRateBar)" />
                  <g transform="translate(0, 28)" className="fill-slate-700 font-black text-sm">
                    <text x="0" textAnchor="start" className="fill-sky-800">-0.2 (Stabile / Blu)</text>
                    <text x={GW * 0.5} textAnchor="middle">0.65</text>
                    <text x={GW} textAnchor="end" className="fill-red-700">1.2 (Instabile / Rosso)</text>
                  </g>
                </g>

        {/* ══════════════════════════════════════════════════ */}
        {/* ATTRIBUTION */}
        {/* ══════════════════════════════════════════════════ */}
        <text x={SVG_W / 2} y={TOTAL_H - 12} textAnchor="middle" className="fill-slate-400 font-medium text-base">
                  Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium
                </text>
      </svg>
    </div>
  );
}
