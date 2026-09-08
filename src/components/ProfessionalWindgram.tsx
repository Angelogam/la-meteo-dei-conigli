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

const SVG_W = 1100;
const HEADER_H = 140;
const PLOT_H = 640;
const FOOTER_H = 120;
const TOTAL_H = HEADER_H + PLOT_H + FOOTER_H;
const ML = 110; // margin left
const MR = 90;  // margin right
const GW = SVG_W - ML - MR;
const GH = PLOT_H;

const ALT_MIN = 1000;
const ALT_MAX = 4500;

// Grid levels: 250m steps from 1000 to 4500 with hPa conversion
const GRID_LEVELS: { hpa: string; alt: number }[] = (() => {
  const levels: { hpa: string; alt: number }[] = [];
  for (let a = 1000; a <= 4500; a += 250) {
    const hPaVal = Math.round(1013.25 * Math.pow(1 - 2.25577e-5 * a, 5.25588));
    levels.push({ hpa: `${hPaVal} hPa`, alt: a });
  }
  return levels;
})();

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
// Wind barb — feathers on right side of staff (meteorological convention)
// ─────────────────────────────────────────────────────
function WindBarb({ cx, cy, knots, deg }: { cx: number; cy: number; knots: number; deg: number }) {
  // Direction wind comes FROM
  const rad = ((deg - 90) * Math.PI) / 180;
  const staffLen = 28;
  const ex = cx + staffLen * Math.cos(rad);
  const ey = cy + staffLen * Math.sin(rad);

  // Feather direction (right side of staff)
  const featherRad = rad + Math.PI * 0.63;
  const fc = Math.cos(featherRad), fs = Math.sin(featherRad);

  const barbEls: React.ReactNode[] = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;
  while (rem >= 50 && pos >= 0.22) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    const t = 12;
    barbEls.push(
      <polygon key={`b50`}
        points={`${bx},${by} ${bx + t * fc},${by + t * fs} ${bx + t * 0.4 * Math.cos(rad)},${by + t * 0.4 * Math.sin(rad)}`}
        fill="#be123c" stroke="#be123c" strokeWidth="0.8" />
    );
    rem -= 50; pos -= 0.22;
  }
  while (rem >= 10 && pos >= 0.16) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    const t = 11;
    barbEls.push(
      <line key={`b10`} x1={bx} y1={by} x2={bx + t * fc} y2={by + t * fs}
        stroke="#be123c" strokeWidth="1.8" strokeLinecap="round" />
    );
    rem -= 10; pos -= 0.16;
  }
  if (rem >= 5 && pos >= 0.12) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    const t = 6;
    barbEls.push(
      <line key={`b5`} x1={bx} y1={by} x2={bx + t * fc} y2={by + t * fs}
        stroke="#be123c" strokeWidth="1.5" strokeLinecap="round" />
    );
  }

  return (
    <g>
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="#be123c" strokeWidth="1.8" strokeLinecap="round" />
      {barbEls}
      {knots < 3.5 && (
        <circle cx={cx} cy={cy} r="3" fill="none" stroke="#be123c" strokeWidth="1.5" />
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Snowflake icon
// ─────────────────────────────────────────────────────
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="10" fill="#fff" stroke="#0284c7" strokeWidth="1.8" />
      <g stroke="#0284c7" strokeWidth="1.2" strokeLinecap="round">
        <line x1="0" y1="-5.5" x2="0" y2="5.5" />
        <line x1="-5.5" y1="0" x2="5.5" y2="0" />
        <line x1="-4" y1="-4" x2="4" y2="4" />
        <line x1="-4" y1="4" x2="4" y2="-4" />
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

      const levelWinds = [
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
        levelWinds, lapseRates,
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

  // Precipitation labels
  const precipLabels = useMemo(
    () => columns.filter((c) => c.precip > 0.05).map((c) => ({
      x: c.x,
      y: altToY(ALT_MAX - 30),
      amount: c.precip,
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
          {/* Ground hatch pattern */}
          <pattern id="groundHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#1e293b" strokeWidth="1.2" opacity="0.35" />
          </pattern>

          {/* Alpium background heat map gradient */}
          <linearGradient id="bgHeatmap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="30%" stopColor="#fde047" />
            <stop offset="65%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>

          {/* ΔT lapse rate bar gradient */}
          <linearGradient id="lapseRateBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="25%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
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
        <text x={SVG_W / 2} y="36" textAnchor="middle" className="fill-slate-900 font-extrabold text-2xl tracking-tight">
          {siteName.toLowerCase()} · {formattedDateTitle.toLowerCase()}
        </text>
        <text x={SVG_W / 2} y="56" textAnchor="middle" className="fill-slate-500 font-medium text-xs">
          plotted {dateStr} 00:00 UTC · model ground {Math.round(altitude + 5)} m · SRTM {Math.round(altitude)} m
        </text>

        {/* Top numeric strip labels */}
        <text x={ML - 15} y="85" textAnchor="end" className="fill-slate-400 font-bold text-[9px]">SCENDENZE (m/s)</text>
        <text x={ML - 15} y="98" textAnchor="end" className="fill-slate-400 font-bold text-[9px]">SOLE %</text>
        <text x={ML - 15} y="111" textAnchor="end" className="fill-slate-400 font-bold text-[9px]">TEMP (°C)</text>

        {/* Top numeric values */}
        {columns.map((c, i) => (
          <g key={`head-${i}`}>
            <text x={c.x} y="85" textAnchor="middle"
              className={c.rateo >= 1.6 ? "fill-red-600 font-black text-xs" : c.rateo >= 1.0 ? "fill-orange-600 font-black text-xs" : "fill-slate-900 font-black text-xs"}>
              {c.rateo.toFixed(1)}
            </text>
            <text x={c.x} y="98" textAnchor="middle"
              className={c.sunPct >= 60 ? "fill-orange-700 font-semibold text-xs" : "fill-slate-500 font-medium text-[10px]"}>
              {c.sunPct}%
            </text>
            <text x={c.x} y="111" textAnchor="middle" className="fill-slate-700 font-semibold text-[10px]">
              {`${c.t2m.toFixed(0)}°/${c.dew2m.toFixed(0)}°`}
            </text>
          </g>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* PLOT BACKGROUND — Alpium heat map gradient */}
        {/* ══════════════════════════════════════════════════ */}
        <rect x={plotLeft} y={PLOT_TOP} width={GW} height={GH}
          fill="url(#bgHeatmap)" rx="4" />

        {/* Terrain / ground below launch altitude */}
        {(() => {
          const launchY = altToY(Math.round(altitude));
          const groundY = altToY(ALT_MIN);
          return (
            <g>
              <rect x={plotLeft} y={launchY} width={GW} height={groundY - launchY}
                fill="url(#groundHatch)" />
              <line x1={plotLeft} y1={launchY} x2={plotLeft + GW} y2={launchY}
                stroke="#0f172a" strokeWidth="2" />
            </g>
          );
        })()}

        {/* ══════════════════════════════════════════════════ */}
        {/* CROSS-HATCH — rectangular zones per unstable column */}
        {/* ══════════════════════════════════════════════════ */}
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
        {/* HORIZONTAL GRID LINES + hPa / meter LABELS */}
        {/* ══════════════════════════════════════════════════ */}
        {GRID_LEVELS.map((lvl, i) => {
          const y = altToY(lvl.alt);
          return (
            <g key={`grid-${i}`}>
              <line x1={plotLeft} y1={y} x2={plotRight} y2={y}
                stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
              <text x={plotLeft - 12} y={y + 4} textAnchor="end"
                className="fill-slate-800 font-bold text-[10px] tracking-tight">{lvl.hpa}</text>
              <text x={plotRight + 12} y={y + 4} textAnchor="start"
                className="fill-slate-800 font-extrabold text-[10px]">{lvl.alt} m</text>
            </g>
          );
        })}

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
          fill="none" stroke="#0f172a" strokeWidth="1.5" rx="4" />

        {/* ══════════════════════════════════════════════════ */}
        {/* WIND BARBS */}
        {/* ══════════════════════════════════════════════════ */}
        {columns.map((col) =>
          col.levelWinds.map((lw) => (
            <WindBarb key={`wb-${col.hour}-${lw.hpa}`}
              cx={col.x} cy={altToY(lw.alt)} knots={lw.speed} deg={lw.dir} />
          ))
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* 0°C ISOTHERM (blue dashed + snowflakes + badge) */}
        {/* ══════════════════════════════════════════════════ */}
        {freezePts.length >= 2 && (
          <>
            <path d={freezePath} fill="none" stroke="#0284c7" strokeWidth="2.2"
              strokeDasharray="7 5" filter="url(#shadow)" />
            {freezePts.map((p, i) => (
              <SnowflakeIcon key={`sf-${i}`} x={p.x} y={p.y - 16} />
            ))}
            <g transform={`translate(${plotRight - 110}, ${altToY(avgFreeze) - 11})`}>
              <rect width="100" height="22" rx="4" fill="#fff" stroke="#0284c7" strokeWidth="1.5" filter="url(#shadow)" />
              <text x="50" y="15" textAnchor="middle" className="fill-sky-800 font-extrabold text-[11px]">
                0 °C · {avgFreeze} m
              </text>
            </g>
          </>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* THERMAL TOP CURVE (purple solid, thick) */}
        {/* ══════════════════════════════════════════════════ */}
        {thermalTopPts.length >= 2 && (
          <path d={thermalTopPath} fill="none" stroke="#6b21a8" strokeWidth="4" filter="url(#shadow)" />
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
        {/* CLOUD BADGES — ON the thermal top curve */}
        {/* ══════════════════════════════════════════════════ */}
        {cloudBadges.map((b) => {
          const col = columns.find((c) => Math.abs(c.x - b.x) < 2);
          if (!col || col.rateo < 0.55) return null;
          return (
            <g key={`badge-${b.x}`} transform={`translate(${b.x}, ${b.y})`}>
              {/* Purple circle with cloud % */}
              <circle cx="0" cy="0" r="16" fill="#e0e7ff" stroke="#4338ca" strokeWidth="1.5" />
              <text x="0" y="-1" textAnchor="middle" dominantBaseline="middle"
                className="fill-slate-800 font-bold text-[9px]">{b.cloudPct}%</text>
              {/* Altitude pill */}
              <rect x="-30" y="20" width="60" height="18" rx="4" fill="#fff" stroke="#6b21a8" strokeWidth="1.5" filter="url(#shadow)" />
              <text x="0" y="33" textAnchor="middle" className="fill-purple-950 font-black text-[10px]">{b.alt} m</text>
              {/* Rate pill */}
              <rect x="-22" y="42" width="44" height="14" rx="3" fill="#6b21a8" />
              <text x="0" y="52" textAnchor="middle" className="fill-white font-bold text-[9px]">↑ {b.rate.toFixed(1)} m/s</text>
            </g>
          );
        })}

        {/* ══════════════════════════════════════════════════ */}
        {/* PARAGLIDER ICONS — above thermal top curve */}
        {/* ══════════════════════════════════════════════════ */}
        {columns.filter((c) => c.rateo >= 0.55).map((c) => (
          <g key={`pg-${c.hour}`} transform={`translate(${c.x}, ${c.yThermalTop - 28})`}>
            <path d="M -18,-6 Q -12,-22 0,-22 Q 12,-22 18,-6 Q 9,-15 0,-15 Q -9,-15 -18,-6 Z"
              fill="#f3e8ff" stroke="#7e22ce" strokeWidth="2" />
            <line x1="-14" y1="-6" x2="0" y2="9" stroke="#7e22ce" strokeWidth="1.3" />
            <line x1="14" y1="-6" x2="0" y2="9" stroke="#7e22ce" strokeWidth="1.3" />
            <circle cx="0" cy="9" r="5" fill="#fff" stroke="#7e22ce" strokeWidth="1.8" />
          </g>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* PRECIPITATION LABELS */}
        {/* ══════════════════════════════════════════════════ */}
        {precipLabels.map((pl) => {
          const tw = pl.amount.toFixed(2).length * 6 + 10;
          return (
            <g key={`prec-${pl.x}`} transform={`translate(${pl.x - tw / 2}, ${pl.y - 8})`}>
              <rect width={tw} height="16" rx="3" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" />
              <text x={tw / 2} y="11" textAnchor="middle" className="fill-blue-900 font-bold text-[9px]">
                {pl.amount.toFixed(2)} mm
              </text>
            </g>
          );
        })}

        {/* ══════════════════════════════════════════════════ */}
        {/* HOUR LABELS */}
        {/* ══════════════════════════════════════════════════ */}
        {HOURS.map((hr, i) => (
          <g key={`xl-${hr}`}>
            <line x1={xFromIdx(i)} y1={plotBottom} x2={xFromIdx(i)} y2={plotBottom + 8}
              stroke="#1e293b" strokeWidth="1.5" />
            <text x={xFromIdx(i)} y={plotBottom + 24} textAnchor="middle"
              className="fill-slate-900 font-black text-sm">{`${String(hr).padStart(2, "0")}:00`}</text>
          </g>
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* FOOTER: ΔT LEGEND — full-width bar */}
        {/* ══════════════════════════════════════════════════ */}
        <g transform={`translate(${ML}, ${TOTAL_H - 55})`}>
          <text x="-12" y="11" textAnchor="end" className="fill-slate-700 font-black text-[10px]">ΔT / 100 m</text>
          <rect x="0" y="2" width={GW} height="12" rx="3" fill="url(#lapseRateBar)" />
          <g transform="translate(0, 26)" className="fill-slate-500 font-bold text-[9px]">
            <text x="0" textAnchor="start">-0.2 (Stabile)</text>
            <text x={GW * 0.25} textAnchor="middle">0</text>
            <text x={GW * 0.5} textAnchor="middle">0.65</text>
            <text x={GW * 0.75} textAnchor="middle">0.98</text>
            <text x={GW} textAnchor="end">1.2 (Instabile)</text>
          </g>
        </g>

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
