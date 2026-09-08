"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
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

const CANVAS_W = 1000;
const HEADER_H = 120; // header + top numeric strip
const FOOTER_H = 60;  // legend + attribution
const PLOT_TOP = HEADER_H;
const PLOT_H = 600;
const TOTAL_H = HEADER_H + PLOT_H + FOOTER_H;
const MARGIN = { top: HEADER_H, right: 80, bottom: FOOTER_H, left: 80 };
const GRAPH_W = CANVAS_W - MARGIN.left - MARGIN.right;
const GRAPH_H = PLOT_H;

// Altitude range matching Alpium (1200–6000 m)
const ALT_MIN = 1200;
const ALT_MAX = 6000;

const HPA_LEVELS = [
  { hpa: "500 hPa", alt: "6000 m" },
  { hpa: "550 hPa", alt: "5000 m" },
  { hpa: "600 hPa", alt: "4000 m" },
  { hpa: "650 hPa", alt: "3500 m" },
  { hpa: "700 hPa", alt: "3000 m" },
  { hpa: "750 hPa", alt: "2500 m" },
  { hpa: "800 hPa", alt: "2000 m" },
  { hpa: "850 hPa", alt: "1500 m" },
];

// Alpium-style heatmap bands (from top to bottom)
const HEAT_BANDS = [
  { altTop: 6000, color: "#88c442" },
  { altTop: 4500, color: "#b2d855" },
  { altTop: 3500, color: "#e2e855" },
  { altTop: 2800, color: "#fca835" },
  { altTop: 2200, color: "#f84339" },
  { altTop: 1500, color: "#fca835" },
  { altTop: 1200, color: "#b2d855" },
];

// DeltaT color scale
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

// Legend gradient stops (stable → unstable)
const LEGEND_STOPS = [
  { pos: 0.0, color: "#a855f7" },
  { pos: 0.2, color: "#3b82f6" },
  { pos: 0.4, color: "#06b6d4" },
  { pos: 0.6, color: "#84cc16" },
  { pos: 0.8, color: "#f97316" },
  { pos: 1.0, color: "#dc2626" },
];

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbStr(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
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
  return PLOT_TOP + GRAPH_H * (1 - (a - ALT_MIN) / (ALT_MAX - ALT_MIN));
}
function yToAlt(y: number): number {
  return ALT_MIN + (1 - (y - PLOT_TOP) / GRAPH_H) * (ALT_MAX - ALT_MIN);
}
function xFromIdx(i: number): number {
  if (NUM_HOURS <= 1) return MARGIN.left + GRAPH_W / 2;
  return MARGIN.left + (i / (NUM_HOURS - 1)) * GRAPH_W;
}

// Catmull-Rom → cubic Bézier path
function catmullRomToBezier(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const p2 = pts[Math.min(i + 1, pts.length - 1)];
    const cp1x = p0.x + (p1.x - p0.x) / 3;
    const cp1y = p0.y + (p1.y - p0.y) / 3;
    const cp2x = p1.x - (p2.x - p1.x) / 3;
    const cp2y = p1.y - (p2.y - p1.y) / 3;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

// ─────────────────────────────────────────────────────
// Wind barb (Canvas)
// ─────────────────────────────────────────────────────
function drawWindBarb(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  speed: number, dir: number
) {
  if (speed == null || isNaN(speed) || speed < 1) return;
  const knots = speed * 0.54;

  // Direction the wind comes FROM (meteorological convention)
  const rad = ((dir - 90) * Math.PI) / 180;
  const staffLen = 30;
  const ex = cx + staffLen * Math.cos(rad);
  const ey = cy + staffLen * Math.sin(rad);

  // Feathers on the right side of the staff
  const featherRad = rad + Math.PI * 0.63;
  const fc = Math.cos(featherRad), fs = Math.sin(featherRad);

  const col = speed > 40 ? "#991b1b" : speed > 25 ? "#7e22ce" : "#1e3a5f";

  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  // Staff line
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Feathers
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;

  while (rem >= 50 && pos >= 0.22) {
    const bx = cx + pos * (ex - cx);
    const by = cy + pos * (ey - cy);
    const t = 14;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + t * fc, by + t * fs);
    ctx.lineTo(bx + t * 0.45 * Math.cos(rad), by + t * 0.45 * Math.sin(rad));
    ctx.closePath();
    ctx.fill();
    rem -= 50;
    pos -= 0.22;
  }
  while (rem >= 10 && pos >= 0.16) {
    const bx = cx + pos * (ex - cx);
    const by = cy + pos * (ey - cy);
    const t = 13;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + t * fc, by + t * fs);
    ctx.stroke();
    rem -= 10;
    pos -= 0.16;
  }
  if (rem >= 5 && pos >= 0.12) {
    const bx = cx + pos * (ex - cx);
    const by = cy + pos * (ey - cy);
    const t = 7;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + t * fc, by + t * fs);
    ctx.stroke();
  }
}

// ─────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────
export default function ProfessionalWindgram({
  latitude, longitude, altitude = 1374, siteName = "sito", selectedDay = 0,
}: WindgramProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

      // Thermal rate
      let rateo = 0.5 + spread * 0.07 + (sunPct / 100) * 0.4 + (cape > 100 ? Math.min(1.0, cape / 800) : 0);
      if (precip > 0.3) rateo = Math.min(rateo, 0.3);
      else if (cloud > 80) rateo *= 0.35;
      if (cin > 100) rateo *= 0.5;
      rateo = Math.max(0.2, Math.min(3.0, Math.round(rateo * 10) / 10));

      // Thermal top with sinusoidal envelope
      const hourFrac = (targetHour - 8) / 10;
      const sineEnvelope = Math.sin(hourFrac * Math.PI);
      const thermalTop = Math.round(Math.min(5200, cloudBase + Math.min(1400, rateo * 150 + cape * 0.1 + sineEnvelope * 300)));

      // Surface deltaT/100m
      const surfaceDeltaT = t80 != null ? Math.round(((t2m - t80) / 78) * 100 * 100) / 100
        : t120 != null ? Math.round(((t2m - t120) / 118) * 100 * 100) / 100
        : spread >= 10 ? 0.95 : spread >= 5 ? 0.72 : 0.55;

      // Level winds
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

      // Lapse rate profile
      type TP = { alt: number; temp: number };
      const tempPts: TP[] = [
        { alt: altitude, temp: t2m },
        ...(t80 != null ? [{ alt: altitude + 80, temp: t80 }] : []),
        ...(t120 != null ? [{ alt: altitude + 120, temp: t120 }] : []),
        { alt: 1450, temp: t2m - (1450 - altitude) * 0.0065 },
        { alt: 3100, temp: t2m - (3100 - altitude) * 0.007 },
        { alt: 4400, temp: t2m - (4400 - altitude) * 0.0075 },
        { alt: 5800, temp: t2m - (5800 - altitude) * 0.008 },
      ].filter((p): p is TP => p.temp != null && !isNaN(p.temp));

      function interpT(alt: number): number {
        if (tempPts.length === 0) return t2m - (alt - altitude) * 0.0065;
        const s = [...tempPts].sort((a, b) => a.alt - b.alt);
        if (alt <= s[0].alt) return s[0].temp;
        if (alt >= s[s.length - 1].alt) return s[s.length - 1].temp;
        for (let i = 0; i < s.length - 1; i++) {
          if (s[i].alt <= alt && s[i + 1].alt >= alt) {
            const f = (alt - s[i].alt) / (s[i + 1].alt - s[i].alt);
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

  // ── Thermal boundary (sinusoidal curve) ────────────
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
  const boundaryPath = useMemo(
    () => catmullRomToBezier(boundaryYPts),
    [boundaryYPts]
  );

  // ── Other paths ────────────────────────────────────
  const thermalTopPts = useMemo(() => columns.map((c) => ({ x: c.x, y: c.yThermalTop })), [columns]);
  const freezePts = useMemo(() => columns.map((c) => ({ x: c.x, y: c.yFreeze })), [columns]);
  const cloudBasePts = useMemo(() => columns.map((c) => ({ x: c.x, y: c.yCloudBase })), [columns]);
  const avgFreeze = useMemo(
    () => columns.length ? Math.round(columns.reduce((s, c) => s + c.freeze, 0) / columns.length) : altitude + 3200,
    [columns, altitude]
  );
  const cloudBadges = useMemo(
    () => columns.slice(1, -1).map((c) => ({
      x: c.x, y: altToY(c.cloudBase + 240), alt: c.cloudBase, rate: c.rateo,
    })),
    [columns]
  );

  // ── Draw canvas ────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = TOTAL_H * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${TOTAL_H}px`;
    ctx.scale(dpr, dpr);

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, TOTAL_H);

    // ── Header ──────────────────────────────────────
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#111827";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(
      `${siteName.toLowerCase()} · ${formattedDateTitle.toLowerCase()}`,
      CANVAS_W / 2, 28
    );

    ctx.fillStyle = "#6b7280";
    ctx.font = "11px monospace";
    ctx.fillText(
      `plotted ${dateStr} 00:00 UTC · model ground ${Math.round(altitude + 5)} m · SRTM ${Math.round(altitude)} m`,
      CANVAS_W / 2, 48
    );

    ctx.fillStyle = "#6b7280";
    ctx.font = "italic 11px sans-serif";
    ctx.fillText("valore medio ascendenze (m/s)", CANVAS_W / 2, 68);

    // ── Top numeric strip ──────────────────────────
    const xStep = GRAPH_W / (HOURS.length - 1);
    ctx.font = "bold 12px sans-serif";

    HOURS.forEach((_, i) => {
      const x = MARGIN.left + i * xStep;

      // Ascendenze value
      const c = columns[i];
      if (!c) return;
      const rateColor = c.rateo >= 1.6 ? "#b91c1c" : c.rateo >= 1.0 ? "#ca8a04" : "#111827";
      ctx.fillStyle = rateColor;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(c.rateo.toFixed(1), x, 88);

      // Sole %
      if (i === 0) {
        ctx.fillStyle = "#6b7280";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("sole %", MARGIN.left - 8, 106);
        ctx.fillStyle = "#111827";
        ctx.font = "bold 11px monospace";
      }
      const sunColor = c.sunPct >= 60 ? "#b45309" : "#475569";
      ctx.fillStyle = sunColor;
      ctx.textAlign = "center";
      ctx.fillText(`${c.sunPct}%`, x, 106);
    });

    // ── PLOT AREA ──────────────────────────────────
    const plotLeft = MARGIN.left;
    const plotRight = MARGIN.left + GRAPH_W;
    const plotBottom = PLOT_TOP + GRAPH_H;

    // ── Heatmap bands (full width, Alpium colors) ──
    // But modulated by actual lapse rate data per column
    // First draw base bands
    let bandY = PLOT_TOP;
    for (const band of HEAT_BANDS) {
      const targetY = altToY(band.altTop);
      ctx.fillStyle = band.color;
      ctx.fillRect(plotLeft, bandY, GRAPH_W, targetY - bandY);
      bandY = targetY;
    }

    // ── Per-column lapse-rate modulated opacity overlay ──
    // Using the boundary curve: below = more opaque warm colors, above = stable
    if (columns.length > 0 && boundaryAlts.length === columns.length) {
      const N = 32; // vertical segments per column
      for (let ci = 0; ci < columns.length; ci++) {
        const col = columns[ci];
        const xL = col.x - xStep / 2;
        const xR = col.x + xStep / 2;
        const bAlt = boundaryAlts[ci];

        for (let si = 0; si < N; si++) {
          const altTop = ALT_MIN + ((N - si - 0.5) / N) * (ALT_MAX - ALT_MIN);
          const altBot = ALT_MIN + ((N - si - 1.5) / N) * (ALT_MAX - ALT_MIN);
          const yTop = altToY(altTop);
          const yBot = altToY(altBot);
          const midAlt = (altTop + altBot) / 2;
          const stripH = Math.max(1, yTop - yBot);

          if (midAlt <= bAlt) {
            // Below boundary: warm/unstable — modulate intensity by surfaceDeltaT
            const zoneFrac = Math.max(0, Math.min(1, (bAlt - midAlt) / (bAlt - ALT_MIN + 1)));
            const intensity = col.surfaceDeltaT / 1.2; // normalize
            const alpha = 0.3 + zoneFrac * 0.45 * intensity;
            // Color: orange at bottom → green near boundary
            const r = Math.round(252 - zoneFrac * 100);
            const g = Math.round(168 + zoneFrac * 80);
            const b = Math.round(53 - zoneFrac * 80);
            ctx.fillStyle = rgbStr(r, g, b, Math.min(0.85, alpha));
          } else {
            // Above boundary: cool/stable
            const zoneFrac = Math.max(0, Math.min(1, (midAlt - bAlt) / (ALT_MAX - bAlt + 1)));
            const intensity = 1 - col.surfaceDeltaT / 1.5;
            const alpha = 0.25 + zoneFrac * 0.5 * Math.max(0, intensity);
            // Color: green near boundary → purple at top
            const r = Math.round(136 - zoneFrac * 80);
            const g = Math.round(196 - zoneFrac * 120);
            const b = Math.round(66 + zoneFrac * 100);
            ctx.fillStyle = rgbStr(r, g, b, Math.min(0.8, alpha));
          }
          ctx.fillRect(xL, yTop, xR - xL, stripH);
        }
      }
    }

    // ── Cross-hatch (convective mesh) ──────────────
    // Only in columns with high surfaceDeltaT, below boundary
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 0.8;
    const hatchSpacing = 11;
    for (let ci = 0; ci < columns.length; ci++) {
      const col = columns[ci];
      if (col.surfaceDeltaT < 0.55) continue;
      const bY = altToY(boundaryAlts[ci]);
      const xL = col.x - xStep / 2;
      const xR = col.x + xStep / 2;

      // Diagonal lines going down-right
      for (let hx = xL - GRAPH_H; hx < xR + GRAPH_H; hx += hatchSpacing) {
        ctx.beginPath();
        ctx.moveTo(hx, bY);
        ctx.lineTo(hx + (plotBottom - bY), plotBottom);
        ctx.stroke();
      }
      // Diagonal lines going up-right
      for (let hx = xL - GRAPH_H; hx < xR + GRAPH_H; hx += hatchSpacing) {
        ctx.beginPath();
        ctx.moveTo(hx, plotBottom);
        ctx.lineTo(hx + (plotBottom - bY), bY);
        ctx.stroke();
      }
    }
    ctx.restore();

    // ── Horizontal grid lines + labels ─────────────
    const hpaStep = GRAPH_H / (HPA_LEVELS.length - 1);
    HPA_LEVELS.forEach((lvl, i) => {
      const y = PLOT_TOP + i * hpaStep;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();

      // Left label (hPa)
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(lvl.hpa, plotLeft - 10, y);

      // Right label (m)
      ctx.textAlign = "left";
      ctx.fillText(lvl.alt, plotRight + 10, y);
    });

    // ── Vertical hour lines ────────────────────────
    columns.forEach((c, i) => {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = 0.7;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(c.x, PLOT_TOP);
      ctx.lineTo(c.x, plotBottom);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── Plot border ────────────────────────────────
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(plotLeft, PLOT_TOP, GRAPH_W, GRAPH_H);

    // ── Wind barbs ─────────────────────────────────
    columns.forEach((col) => {
      col.levelWinds.forEach((lw) => {
        drawWindBarb(ctx, col.x, altToY(lw.alt), lw.speed, lw.dir);
      });
    });

    // ── 0°C isotherm (blue dashed line) ───────────
    if (freezePts.length >= 2) {
      const isoPath = catmullRomToBezier(freezePts);
      ctx.save();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      // Parse path and stroke it
      const cmdMatches = isoPath.match(/[MLC]|[0-9.\-]+/g);
      let px = 0, py = 0;
      let first = true;
      for (let i = 0; i < cmdMatches!.length; i++) {
        const token = cmdMatches![i];
        if (token === "M") {
          const nx = parseFloat(cmdMatches![++i]!);
          const ny = parseFloat(cmdMatches![++i]!);
          ctx.moveTo(nx, ny);
          first = false;
          px = nx; py = ny;
        } else if (token === "C") {
          const cx1 = parseFloat(cmdMatches![++i]!);
          const cy1 = parseFloat(cmdMatches![++i]!);
          const cx2 = parseFloat(cmdMatches![++i]!);
          const cy2 = parseFloat(cmdMatches![++i]!);
          const x = parseFloat(cmdMatches![++i]!);
          const y = parseFloat(cmdMatches![++i]!);
          ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x, y);
          px = x; py = y;
        }
      }
      ctx.stroke();
      ctx.restore();

      // Snowflake icons along the isotherm
      const snowInterval = Math.max(1, Math.floor(freezePts.length / 5));
      freezePts.forEach((p, i) => {
        if (i % snowInterval !== 0) return;
        drawSnowflake(ctx, p.x, p.y - 16);
      });
    }

    // 0°C badge
    if (freezePts[0]) {
      const badgeY = altToY(avgFreeze);
      const badgeX = plotRight - 115;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY - 12, 105, 24, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1e40af";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`0 °C · ${avgFreeze} m`, badgeX + 52, badgeY);
    }

    // ── Thermal top curve (purple solid, Alpium style) ──
    if (thermalTopPts.length >= 2) {
      const tp = catmullRomToBezier(thermalTopPts);
      ctx.strokeStyle = "#7e22ce";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      parseAndStroke(ctx, tp);
      ctx.stroke();
    }

    // ── Thermal boundary curve (orange sinusoidal wave) ──
    if (boundaryYPts.length >= 2) {
      // Glow
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 8;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      parseAndStroke(ctx, boundaryPath);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Main
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      parseAndStroke(ctx, boundaryPath);
      ctx.stroke();

      // Highlight
      ctx.strokeStyle = "#fb923c";
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      parseAndStroke(ctx, boundaryPath);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Cloud base curve (purple dashed) ───────────
    if (cloudBasePts.length >= 2) {
      ctx.save();
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      parseAndStroke(ctx, catmullRomToBezier(cloudBasePts));
      ctx.stroke();
      ctx.restore();
    }

    // ── PBL curve (black dashed) ───────────────────
    const pblPts = columns.map((c) => ({
      x: c.x,
      y: altToY(Math.min(ALT_MAX, Math.max(ALT_MIN, c.cloudBase + c.rateo * 600))),
    }));
    if (pblPts.length >= 2) {
      ctx.save();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      parseAndStroke(ctx, catmullRomToBezier(pblPts));
      ctx.stroke();
      ctx.restore();
    }

    // ── Paraglider icons ───────────────────────────
    columns.forEach((c) => {
      drawParaglider(ctx, c.x, c.yThermalTop - 6);
    });

    // ── Cloud base badges ──────────────────────────
    cloudBadges.forEach((b) => {
      drawCloudBadge(ctx, b.x, b.y, b.alt, b.rate);
    });

    // ── Hour labels ────────────────────────────────
    columns.forEach((c) => {
      // Tick
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(c.x, plotBottom);
      ctx.lineTo(c.x, plotBottom + 6);
      ctx.stroke();

      // Label
      ctx.fillStyle = "#111827";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${String(c.hour).padStart(2, "0")}:00`, c.x, plotBottom + 10);
    });

    // ── Right altitude ticks: 250m steps from launch altitude up to 4000m ──
    const launchAlt = Math.round(altitude);
    const altMinTick = Math.floor((launchAlt - 1) / 250) * 250;
    for (let a = altMinTick; a <= 4000; a += 250) {
      const y = altToY(a);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotRight, y);
      ctx.lineTo(plotRight + 5, y);
      ctx.stroke();
      ctx.fillStyle = "#475569";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${a} m`, plotRight + 9, y);
    }

    // ── FOOTER: DeltaT legend ──────────────────────
    const legendY = TOTAL_H - 44;
    const legendW = 520;
    const legendX = (CANVAS_W - legendW) / 2;

    const grad = ctx.createLinearGradient(legendX, 0, legendX + legendW, 0);
    LEGEND_STOPS.forEach((s) => grad.addColorStop(s.pos, s.color));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(legendX, legendY, legendW, 14, 3);
    ctx.fill();

    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#475569";
    ctx.fillText("Stabile ←", legendX - 8, legendY + 10);
    ctx.textAlign = "left";
    ctx.fillText("→ Instabile", legendX + legendW + 8, legendY + 10);
    ctx.textAlign = "center";
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText("ΔT / 100 m", CANVAS_W / 2, legendY - 7);

    // ── Attribution ────────────────────────────────
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.textAlign = "center";
    ctx.fillText(
      "Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium",
      CANVAS_W / 2, TOTAL_H - 10
    );

  }, [columns, boundaryAlts, boundaryYPts, boundaryPath, thermalTopPts, freezePts,
      cloudBasePts, avgFreeze, cloudBadges, dateStr, siteName, altitude,
      formattedDateTitle, latitude, longitude]);

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

  return (
    <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
      <div className="overflow-x-auto">
        <canvas
          ref={canvasRef}
          className="block w-full min-w-[700px] h-auto"
          style={{ maxWidth: CANVAS_W, margin: "0 auto" }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Helper: stroke a path string on canvas
// ─────────────────────────────────────────────────────
function parseAndStroke(ctx: CanvasRenderingContext2D, pathStr: string) {
  const tokens = pathStr.match(/[MLC]|[0-9.\-]+/g) || [];
  let x = 0, y = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t === "M") {
      x = parseFloat(tokens[++i]!);
      y = parseFloat(tokens[++i]!);
      ctx.moveTo(x, y);
    } else if (t === "C") {
      const cx1 = parseFloat(tokens[++i]!), cy1 = parseFloat(tokens[++i]!);
      const cx2 = parseFloat(tokens[++i]!), cy2 = parseFloat(tokens[++i]!);
      x = parseFloat(tokens[++i]!), y = parseFloat(tokens[++i]!);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x, y);
    }
  }
}

// ─────────────────────────────────────────────────────
// Paraglider icon
// ─────────────────────────────────────────────────────
function drawParaglider(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);

  // Canopy
  ctx.fillStyle = "#f3e8ff";
  ctx.strokeStyle = "#7e22ce";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -5);
  ctx.quadraticCurveTo(-10, -20, 0, -20);
  ctx.quadraticCurveTo(10, -20, 16, -5);
  ctx.quadraticCurveTo(8, -14, 0, -14);
  ctx.quadraticCurveTo(-8, -14, -16, -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lines
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-12, -5);
  ctx.lineTo(0, 8);
  ctx.moveTo(12, -5);
  ctx.lineTo(0, 8);
  ctx.stroke();

  // Pilot
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#7e22ce";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 8, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────────────
// Snowflake icon
// ─────────────────────────────────────────────────────
function drawSnowflake(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 3, Math.sin(angle) * 3);
    ctx.lineTo(Math.cos(angle) * 7, Math.sin(angle) * 7);
    ctx.stroke();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────
// Cloud badge (height + lift rate)
// ─────────────────────────────────────────────────────
function drawCloudBadge(ctx: CanvasRenderingContext2D, x: number, y: number, alt: number, rate: number) {
  const bw = 66, bh = 30;
  const bx = x - bw / 2, by = y - bh / 2 - 14;

  // Purple arc top
  ctx.fillStyle = "#f5d0fe";
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 4, 18, Math.PI, 0);
  ctx.lineTo(18, 4);
  ctx.lineTo(-18, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Divider
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.lineTo(18, 4);
  ctx.stroke();

  // Text
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${alt} m`, 0, 14);

  ctx.fillStyle = "#7e22ce";
  ctx.fillText(`↑ ${rate.toFixed(1)} m/s`, 0, 26);
}
