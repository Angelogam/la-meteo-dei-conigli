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
// Layout — EXACT Alpium reference
// ─────────────────────────────────────────────────────
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
const NUM_HOURS = HOURS.length;

const CW = 1000;
const HEADER_H = 120;
const FOOTER_H = 58;
const PLOT_TOP = HEADER_H;
const PLOT_H = 600;
const TOTAL_H = HEADER_H + PLOT_H + FOOTER_H;
const ML = 80;   // margin left
const MR = 82;   // margin right
const GW = CW - ML - MR;  // graph width
const GH = PLOT_H;         // graph height

const ALT_MIN = 1200;
const ALT_MAX = 6000;

// Alpium hPa grid
const HPA = [
  { hpa: "500 hPa", alt: "6000 m" },
  { hpa: "550 hPa", alt: "5000 m" },
  { hpa: "600 hPa", alt: "4000 m" },
  { hpa: "650 hPa", alt: "3500 m" },
  { hpa: "700 hPa", alt: "3000 m" },
  { hpa: "750 hPa", alt: "2500 m" },
  { hpa: "800 hPa", alt: "2000 m" },
  { hpa: "850 hPa", alt: "1500 m" },
];

// Alpium heatmap base bands (top→bottom)
const BANDS = [
  { top: 6000, col: "#88c442" },
  { top: 4500, col: "#b2d855" },
  { top: 3500, col: "#e2e855" },
  { top: 2800, col: "#fca835" },
  { top: 2200, col: "#f84339" },
  { top: 1500, col: "#fca835" },
  { top: 1200, col: "#b2d855" },
];

// ΔT → color (Alpium exact)
const DT = [
  { v: -0.20, c: "#6d28d9" }, { v: -0.05, c: "#4338ca" },
  { v:  0.00, c: "#1d4ed8" }, { v:  0.16, c: "#0e7490" },
  { v:  0.32, c: "#047857" }, { v:  0.48, c: "#4d7c0f" },
  { v:  0.65, c: "#a16207" }, { v:  0.82, c: "#c2410c" },
  { v:  1.00, c: "#b91c1c" }, { v:  1.20, c: "#7f1d1d" },
];

// Legend gradient (stable → unstable)
const LEG = [
  { p: 0.00, c: "#a855f7" }, { p: 0.16, c: "#3b82f6" },
  { p: 0.32, c: "#06b6d4" }, { p: 0.48, c: "#84cc16" },
  { p: 0.65, c: "#eab308" }, { p: 0.82, c: "#f97316" },
  { p: 1.00, c: "#dc2626" },
];

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb(r: number, g: number, b: number, a = 1) {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}
function lerpColor(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  return rgb(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function dtColor(dt: number): string {
  if (dt <= DT[0].v) return DT[0].c;
  if (dt >= DT[DT.length - 1].v) return DT[DT.length - 1].c;
  for (let i = 0; i < DT.length - 1; i++) {
    if (dt >= DT[i].v && dt <= DT[i + 1].v) {
      const f = (dt - DT[i].v) / (DT[i + 1].v - DT[i].v);
      return lerpColor(DT[i].c, DT[i + 1].c, f);
    }
  }
  return DT[DT.length - 1].c;
}

function altY(a: number) {
  return PLOT_TOP + GH * (1 - (Math.max(ALT_MIN, Math.min(ALT_MAX, a)) - ALT_MIN) / (ALT_MAX - ALT_MIN));
}
function xIdx(i: number) {
  return ML + (i / (NUM_HOURS - 1)) * GW;
}
function colL(i: number) { return i === 0 ? ML : xIdx(i - 0.5); }
function colR(i: number) { return i === NUM_HOURS - 1 ? ML + GW : xIdx(i + 0.5); }
function colW(i: number) { return colR(i) - colL(i); }

// Catmull-Rom → cubic Bézier SVG path string
function bezier(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[Math.min(i + 1, pts.length - 1)];
    d += ` C ${(p0.x + (p1.x - p0.x) / 3).toFixed(1)},${(p0.y + (p1.y - p0.y) / 3).toFixed(1)}`;
    d += ` ${(p1.x - (p2.x - p1.x) / 3).toFixed(1)},${(p1.y - (p2.y - p1.y) / 3).toFixed(1)}`;
    d += ` ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}
function strokePath(ctx: CanvasRenderingContext2D, s: string) {
  const t = s.match(/[MLC]|[0-9.\-]+/g) || [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "M") { ctx.moveTo(+t[++i]!, +t[++i]!); }
    else if (t[i] === "C") { ctx.bezierCurveTo(+t[++i]!, +t[++i]!, +t[++i]!, +t[++i]!, +t[++i]!, +t[++i]!); }
  }
}

// ─────────────────────────────────────────────────────
// Wind barb
// ─────────────────────────────────────────────────────
function drawBarb(ctx: CanvasRenderingContext2D, cx: number, cy: number, spd: number, dir: number) {
  if (!spd || isNaN(spd) || spd < 1) return;
  const kn = spd * 0.54;
  const rad = ((dir - 90) * Math.PI) / 180;
  const sl = 30;
  const ex = cx + sl * Math.cos(rad), ey = cy + sl * Math.sin(rad);
  const fr = rad + Math.PI * 0.63;
  const fc = Math.cos(fr), fs_ = Math.sin(fr);
  const col = spd > 40 ? "#991b1b" : spd > 25 ? "#7e22ce" : "#1e3a5f";
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineWidth = 2; ctx.lineCap = "round";

  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();

  let rem = Math.round(kn / 5) * 5, pos = 1.0;
  while (rem >= 50 && pos >= 0.22) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy), t = 14;
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(bx + t * fc, by + t * fs_);
    ctx.lineTo(bx + t * 0.45 * Math.cos(rad), by + t * 0.45 * Math.sin(rad));
    ctx.closePath(); ctx.fill();
    rem -= 50; pos -= 0.22;
  }
  while (rem >= 10 && pos >= 0.16) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy), t = 13;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + t * fc, by + t * fs_); ctx.stroke();
    rem -= 10; pos -= 0.16;
  }
  if (rem >= 5 && pos >= 0.12) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy), t = 7;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + t * fc, by + t * fs_); ctx.stroke();
  }
}

// ─────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────
function drawParaglider(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "#f3e8ff"; ctx.strokeStyle = "#7e22ce"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -5); ctx.quadraticCurveTo(-10, -20, 0, -20);
  ctx.quadraticCurveTo(10, -20, 16, -5);
  ctx.quadraticCurveTo(8, -14, 0, -14);
  ctx.quadraticCurveTo(-8, -14, -16, -5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-12, -5); ctx.lineTo(0, 8);
  ctx.moveTo(12, -5); ctx.lineTo(0, 8); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#7e22ce"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(0, 8, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawSnow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
  for (let a = 0; a < 4; a++) {
    const ag = (a * Math.PI) / 4;
    ctx.beginPath(); ctx.moveTo(Math.cos(ag) * 3, Math.sin(ag) * 3);
    ctx.lineTo(Math.cos(ag) * 7, Math.sin(ag) * 7); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Cloud badge — purple arc on TOP, text below.
 * Placed directly ON the cloud-base curve.
 */
function drawCloudBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, alt: number, rate: number) {
  ctx.save();
  // Purple semi-circle cloud (arc on top, flat bottom at cy)
  ctx.fillStyle = "#e0e7ff";
  ctx.strokeStyle = "#4338ca";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, Math.PI, 0);          // upper arc
  ctx.lineTo(cx + 16, cy);                  // right edge
  ctx.lineTo(cx - 16, cy);                  // left edge
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Altitude text
  ctx.fillStyle = "#1e1b4b";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${alt} m`, cx, cy + 13);

  // Rate text
  ctx.fillStyle = "#4338ca";
  ctx.font = "bold 9px monospace";
  ctx.fillText(`↑ ${rate.toFixed(1)} m/s`, cx, cy + 24);
  ctx.restore();
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
    const d = new Date(); d.setDate(d.getDate() + selectedDay); return d;
  }, [selectedDay]);
  const dateStr = useMemo(() => dateObj.toISOString().split("T")[0], [dateObj]);
  const fmtDate = useMemo(() => {
    const days = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return `${days[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
  }, [dateObj]);

  // ── Fetch ─────────────────────────────────────────
  useEffect(() => {
    let on = true;
    setLoading(true); setError(null);
    const p = new URLSearchParams({
      latitude: latitude.toString(), longitude: longitude.toString(),
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
      timezone: "Europe/Rome", start_date: dateStr, end_date: dateStr,
    });
    fetchWithProxyFallback(p.toString())
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json(); if (on) { setData(j); setLoading(false); } })
      .catch((e: any) => { if (on) { setError(e?.message || "Errore"); setLoading(false); } });
    return () => { on = false; };
  }, [latitude, longitude, dateStr]);

  // ── Build columns ─────────────────────────────────
  const cols = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const h = data.hourly, times = data.hourly.time;
    return HOURS.map((hr) => {
      const i = times.findIndex((t: string) => parseInt(t.split("T")[1].split(":")[0], 10) === hr);
      if (i === -1) return null;

      const t2m = h.temperature_2m[i] ?? 15;
      const dew = h.dew_point_2m?.[i] ?? (t2m - 6);
      const rad = h.shortwave_radiation?.[i] ?? 400;
      const cloud = h.cloud_cover?.[i] ?? 30;
      const precip = h.precipitation?.[i] ?? 0;
      const cape = h.cape?.[i] ?? 0;
      const cin = h.convective_inhibition?.[i] ?? 0;
      const w10 = h.wind_speed_10m?.[i] ?? 5;
      const wd10 = h.wind_direction_10m?.[i] ?? 180;
      const frz = h.freezing_level_height?.[i] ?? Math.round(altitude + t2m / 0.0065);
      const t80 = h.temperature_80m?.[i], t120 = h.temperature_120m?.[i];
      const sunDur = h.sunshine_duration?.[i] ?? 0;

      const spread = Math.max(0.5, t2m - dew);
      const cloudBase = Math.round(altitude + spread * 125);
      const sunPct = Math.min(100, Math.max(5, Math.round((rad / 950) * (1 - cloud / 100 * 0.7) * 100)));

      let rateo = 0.5 + spread * 0.07 + (sunPct / 100) * 0.4 + (cape > 100 ? Math.min(1.0, cape / 800) : 0);
      if (precip > 0.3) rateo = Math.min(rateo, 0.3);
      else if (cloud > 80) rateo *= 0.35;
      if (cin > 100) rateo *= 0.5;
      rateo = Math.max(0.2, Math.min(3.0, Math.round(rateo * 10) / 10));

      // Thermal top = slightly above cloud base (matching Alpium: ~2000-2300m in ref)
      const sineEnv = Math.sin(((hr - 8) / 10) * Math.PI);
      const thermalTop = Math.round(Math.min(5200, cloudBase + Math.max(150, rateo * 200 + sineEnv * 120)));

      const dtSurface = t80 != null ? Math.round(((t2m - t80) / 78) * 100 * 100) / 100
        : t120 != null ? Math.round(((t2m - t120) / 118) * 100 * 100) / 100
        : spread >= 10 ? 0.95 : spread >= 5 ? 0.72 : 0.55;

      // Level winds at 4 pressure levels
      const lwinds = [
        { alt: 5800, spd: h.wind_speed_500hPa?.[i], dir: h.wind_direction_500hPa?.[i] },
        { alt: 4400, spd: h.wind_speed_600hPa?.[i], dir: h.wind_direction_600hPa?.[i] },
        { alt: 3100, spd: h.wind_speed_700hPa?.[i], dir: h.wind_direction_700hPa?.[i] },
        { alt: 1450, spd: h.wind_speed_850hPa?.[i], dir: h.wind_direction_850hPa?.[i] },
      ].map((l) => ({
        ...l,
        spd: l.spd ?? Math.round(w10 * (1 + (5800 - l.alt) / (5800 - 1450) * 1.8)),
        dir: l.dir ?? Math.round(wd10 + (5800 - l.alt) * 0.008),
      }));

      // Lapse-rate profile
      type TP = { a: number; t: number };
      const tps: TP[] = [
        { a: altitude, t: t2m },
        ...(t80 != null ? [{ a: altitude + 80, t: t80 }] : []),
        ...(t120 != null ? [{ a: altitude + 120, t: t120 }] : []),
        { a: 1450, t: t2m - (1450 - altitude) * 0.0065 },
        { a: 3100, t: t2m - (3100 - altitude) * 0.007 },
        { a: 4400, t: t2m - (4400 - altitude) * 0.0075 },
        { a: 5800, t: t2m - (5800 - altitude) * 0.008 },
      ].filter((p): p is TP => p.t != null && !isNaN(p.t));

      const interp = (a: number) => {
        if (!tps.length) return t2m - (a - altitude) * 0.0065;
        const s = [...tps].sort((a, b) => a.a - b.a);
        if (a <= s[0].a) return s[0].t;
        if (a >= s[s.length - 1].a) return s[s.length - 1].t;
        for (let j = 0; j < s.length - 1; j++) {
          if (s[j].a <= a && s[j + 1].a >= a) {
            const f = (a - s[j].a) / (s[j + 1].a - s[j].a);
            return s[j].t + f * (s[j + 1].t - s[j].t);
          }
        }
        return t2m;
      };

      const lapseRates: { a: number; dt: number }[] = [];
      for (const a of [altitude, altitude + 300, altitude + 600, altitude + 1000,
                       1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 5800]) {
        lapseRates.push({ a, dt: Math.round(((interp(a + 150) - interp(a - 150)) / 300) * 100 * 100) / 100 });
      }

      return {
        hr, i, x: xIdx(HOURS.indexOf(hr)),
        t2m, dew, spread, cloud, precip, cape, rateo, dtSurface,
        wind10: w10, windDir10: wd10, sunPct, sunDur, cloudBase, thermalTop, frz,
        lwinds, lapseRates,
        yCB: altY(cloudBase), yTT: altY(thermalTop), yFrz: altY(frz),
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [data, altitude]);

  // ── Thermal boundary (sinusoidal wave) ────────────
  const bAlts = useMemo(() =>
    cols.map((c) => {
      const s = Math.sin(((c.hr - 8) / 10) * Math.PI);
      const amp = c.rateo * 260 + c.cape * 0.1 + 180;
      return Math.min(ALT_MAX - 50, Math.max(ALT_MIN + 60, Math.round(ALT_MIN + 160 + s * amp)));
    }), [cols]);
  const bYPts = useMemo(() => cols.map((c, i) => ({ x: c.x, y: altY(bAlts[i]) })), [cols, bAlts]);
  const bPath = useMemo(() => bezier(bYPts), [bYPts]);

  const ttPts = useMemo(() => cols.map((c) => ({ x: c.x, y: c.yTT })), [cols]);
  const frzPts = useMemo(() => cols.map((c) => ({ x: c.x, y: c.yFrz })), [cols]);
  const cbPts = useMemo(() => cols.map((c) => ({ x: c.x, y: c.yCB })), [cols]);
  const avgFrz = useMemo(() =>
    cols.length ? Math.round(cols.reduce((s, c) => s + c.frz, 0) / cols.length) : altitude + 3200, [cols, altitude]);

  // Cloud badges: ONE per intermediate hour, placed ON the cloud-base curve
  const badges = useMemo(
    () => cols.slice(1, -1).map((c) => ({ x: c.x, y: c.yCB, alt: c.cloudBase, rate: c.rateo })),
    [cols]
  );

  // Precipitation labels
  const precipLabels = useMemo(
    () => cols.filter((c) => c.precip > 0.05).map((c) => ({ x: c.x, y: altY(ALT_MAX) - 6, mm: c.precip })),
    [cols]
  );

  // ── Draw ───────────────────────────────────────────
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    cvs.width = CW * dpr; cvs.height = TOTAL_H * dpr;
    cvs.style.width = `${CW}px`; cvs.style.height = `${TOTAL_H}px`;
    ctx.scale(dpr, dpr);

    const PL = ML, PR = ML + GW, PB = PLOT_TOP + GH;
    const xs = GW / (HOURS.length - 1);

    // White bg
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, CW, TOTAL_H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    // ── HEADER ────────────────────────────────────
    ctx.fillStyle = "#111827"; ctx.font = "bold 20px sans-serif";
    ctx.fillText(`${siteName.toLowerCase()} · ${fmtDate.toLowerCase()}`, CW / 2, 28);
    ctx.fillStyle = "#6b7280"; ctx.font = "11px monospace";
    ctx.fillText(`plotted ${dateStr} 00:00 UTC · model ground ${Math.round(altitude + 5)} m · SRTM ${Math.round(altitude)} m`, CW / 2, 48);
    ctx.fillStyle = "#6b7280"; ctx.font = "italic 11px sans-serif";
    ctx.fillText("valore medio ascendenze (m/s)", CW / 2, 68);

    // ── TOP NUMERIC STRIP ─────────────────────────
    cols.forEach((c, idx) => {
      const x = ML + idx * xs;
      // Row 1: rateo
      const rc = c.rateo >= 1.6 ? "#b91c1c" : c.rateo >= 1.0 ? "#ca8a04" : "#111827";
      ctx.fillStyle = rc; ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(c.rateo.toFixed(1), x, 88);
      // Row 2: sole %
      if (idx === 0) {
        ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif"; ctx.textAlign = "right";
        ctx.fillText("sole %", ML - 8, 106);
      }
      const sc = c.sunPct >= 60 ? "#b45309" : "#475569";
      ctx.fillStyle = sc; ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${c.sunPct}%`, x, 106);
    });

    // ── PLOT BG: Alpium heat bands ───────────────
    let by = PLOT_TOP;
    for (const b of BANDS) {
      const ty = altY(b.top);
      ctx.fillStyle = b.col;
      ctx.fillRect(PL, by, GW, ty - by);
      by = ty;
    }

    // ── Per-column lapse-rate overlay ────────────
    if (cols.length > 0) {
      const N = 32;
      for (let ci = 0; ci < cols.length; ci++) {
        const c = cols[ci], bA = bAlts[ci];
        const xL = colL(ci), xR = colR(ci), w = colW(ci);
        for (let si = 0; si < N; si++) {
          const aT = ALT_MIN + ((N - si - 0.5) / N) * (ALT_MAX - ALT_MIN);
          const aB = ALT_MIN + ((N - si - 1.5) / N) * (ALT_MAX - ALT_MIN);
          const yT = altY(aT), yB = altY(aB), mid = (aT + aB) / 2, sh = Math.max(1, yT - yB);
          if (mid <= bA) {
            const zf = Math.max(0, Math.min(1, (bA - mid) / (bA - ALT_MIN + 1)));
            const inten = c.dtSurface / 1.2;
            const al = Math.min(0.85, 0.25 + zf * 0.5 * inten);
            ctx.fillStyle = rgb(252 - zf * 100, 168 + zf * 80, 53 - zf * 80, al);
          } else {
            const zf = Math.max(0, Math.min(1, (mid - bA) / (ALT_MAX - bA + 1)));
            const inten = 1 - c.dtSurface / 1.5;
            const al = Math.min(0.8, 0.2 + zf * 0.5 * Math.max(0, inten));
            ctx.fillStyle = rgb(136 - zf * 80, 196 - zf * 120, 66 + zf * 100, al);
          }
          ctx.fillRect(xL, yT, w, sh);
        }
      }
    }

    // ── Cross-hatch (convective mesh, below boundary) ──
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 0.85;
    const hs = 11;
    for (let ci = 0; ci < cols.length; ci++) {
      if (cols[ci].dtSurface < 0.55) continue;
      const bY = altY(bAlts[ci]);
      const xL = colL(ci), xR = colR(ci);
      for (let hx = xL - GH; hx < xR + GH; hx += hs) {
        ctx.beginPath(); ctx.moveTo(hx, bY); ctx.lineTo(hx + (PB - bY), PB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx, PB); ctx.lineTo(hx + (PB - bY), bY); ctx.stroke();
      }
    }
    ctx.restore();

    // ── Horizontal grid + hPa / meter labels ─────
    const hpaStep = GH / (HPA.length - 1);
    HPA.forEach((lv, i) => {
      const y = PLOT_TOP + i * hpaStep;
      ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PR, y); ctx.stroke();
      ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px monospace";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(lv.hpa, PL - 10, y);
      ctx.textAlign = "left";
      ctx.fillText(lv.alt, PR + 10, y);
    });

    // ── Right altitude ticks: 250m steps launch→4000 ──
    const launchAlt = Math.round(altitude);
    const aMinTick = Math.floor((launchAlt - 1) / 250) * 250;
    for (let a = aMinTick; a <= 4000; a += 250) {
      const y = altY(a);
      ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PR, y); ctx.lineTo(PR + 5, y); ctx.stroke();
      ctx.fillStyle = "#475569"; ctx.font = "10px monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(`${a} m`, PR + 9, y);
    }

    // ── Vertical hour lines ──────────────────────
    cols.forEach((c) => {
      ctx.strokeStyle = "rgba(148,163,184,0.35)"; ctx.lineWidth = 0.7;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(c.x, PLOT_TOP); ctx.lineTo(c.x, PB); ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── Plot border ──────────────────────────────
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.5;
    ctx.strokeRect(PL, PLOT_TOP, GW, GH);

    // ── Wind barbs ───────────────────────────────
    cols.forEach((c) => {
      c.lwinds.forEach((lw) => drawBarb(ctx, c.x, altY(lw.alt), lw.spd, lw.dir));
    });

    // ── 0°C isotherm (blue dashed + snowflakes) ──
    if (frzPts.length >= 2) {
      ctx.save();
      ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath(); strokePath(ctx, bezier(frzPts)); ctx.stroke();
      ctx.restore();

      const si = Math.max(1, Math.floor(frzPts.length / 5));
      frzPts.forEach((p, idx) => { if (idx % si === 0) drawSnow(ctx, p.x, p.y - 16); });
    }

    // 0°C badge
    if (frzPts[0]) {
      const by = altY(avgFrz), bx = PR - 115;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(bx, by - 12, 105, 24, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1e40af"; ctx.font = "bold 12px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`0 °C · ${avgFrz} m`, bx + 52, by);
    }

    // ── Thermal TOP curve (purple solid, Alpium style) ──
    if (ttPts.length >= 2) {
      ctx.strokeStyle = "#7e22ce"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); strokePath(ctx, bezier(ttPts)); ctx.stroke();
    }

    // ── Thermal BOUNDARY wave (orange, prominent glow) ──
    if (bYPts.length >= 2) {
      ctx.strokeStyle = "#f97316"; ctx.lineWidth = 10;
      ctx.globalAlpha = 0.18;
      ctx.beginPath(); strokePath(ctx, bPath); ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = "#ea580c"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); strokePath(ctx, bPath); ctx.stroke();

      ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); strokePath(ctx, bPath); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Cloud BASE curve (purple dashed) ─────────
    if (cbPts.length >= 2) {
      ctx.save();
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]); ctx.globalAlpha = 0.7;
      ctx.beginPath(); strokePath(ctx, bezier(cbPts)); ctx.stroke();
      ctx.restore();
    }

    // ── PBL curve (black dashed) ─────────────────
    const pblPts = cols.map((c) => ({
      x: c.x, y: altY(Math.min(ALT_MAX, Math.max(ALT_MIN, c.cloudBase + c.rateo * 600))),
    }));
    if (pblPts.length >= 2) {
      ctx.save();
      ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]); ctx.globalAlpha = 0.55;
      ctx.beginPath(); strokePath(ctx, bezier(pblPts)); ctx.stroke();
      ctx.restore();
    }

    // ── Thermal % curves (25/50/75%, light purple dashed) ──
    [25, 50, 75].forEach((pct) => {
      const pts = cols.map((c) => ({
        x: c.x, y: altY(c.cloudBase + (c.thermalTop - c.cloudBase) * (pct / 100)),
      }));
      ctx.save();
      ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 3]); ctx.globalAlpha = 0.45;
      ctx.beginPath(); strokePath(ctx, bezier(pts)); ctx.stroke();
      ctx.restore();
    });

    // ── Paragliders ON thermal-top curve ─────────
    cols.forEach((c) => drawParaglider(ctx, c.x, c.yTT - 6));

    // ── Cloud badges ON cloud-base curve ─────────
    badges.forEach((b) => drawCloudBadge(ctx, b.x, b.y, b.alt, b.rate));

    // ── Cloud coverage % text (right side of plot) ─
    cols.slice(1, -1).forEach((c) => {
      ctx.fillStyle = "#475569"; ctx.font = "bold 11px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${c.cloud}%`, c.x, altY(c.cloudBase + 320));
    });

    // ── Precipitation labels ─────────────────────
    precipLabels.forEach((pl) => {
      ctx.fillStyle = "#dbeafe"; ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(pl.x - 18, pl.y - 8, 36, 16, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1e40af"; ctx.font = "bold 9px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${pl.mm.toFixed(2)} mm`, pl.x, pl.y);
    });

    // ── Hour labels ──────────────────────────────
    cols.forEach((c) => {
      ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(c.x, PB); ctx.lineTo(c.x, PB + 6); ctx.stroke();
      ctx.fillStyle = "#111827"; ctx.font = "bold 12px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(`${String(c.hr).padStart(2, "0")}:00`, c.x, PB + 10);
    });

    // ── FOOTER: ΔT legend ────────────────────────
    const ly = TOTAL_H - 44, lw = 520, lx = (CW - lw) / 2;
    const grad = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    LEG.forEach((s) => grad.addColorStop(s.p, s.c));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(lx, ly, lw, 14, 3); ctx.fill();

    // ΔT values under legend
    ctx.font = "9px monospace"; ctx.fillStyle = "#6b7280"; ctx.textAlign = "center";
    DT.forEach((s, idx) => {
      const px = lx + (idx / (DT.length - 1)) * lw;
      ctx.fillText(s.v.toFixed(2), px, ly + 17);
    });

    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "right"; ctx.fillStyle = "#475569";
    ctx.fillText("Stabile ←", lx - 8, ly + 10);
    ctx.textAlign = "left";
    ctx.fillText("→ Instabile", lx + lw + 8, ly + 10);
    ctx.textAlign = "center";
    ctx.font = "bold 11px sans-serif"; ctx.fillStyle = "#1e293b";
    ctx.fillText("ΔT / 100 m", CW / 2, ly - 7);

    // Attribution
    ctx.font = "11px sans-serif"; ctx.fillStyle = "#6b7280"; ctx.textAlign = "center";
    ctx.fillText(
      "Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium",
      CW / 2, TOTAL_H - 10
    );

  }, [cols, bAlts, bYPts, bPath, ttPts, frzPts, cbPts, avgFrz, badges,
      precipLabels, dateStr, siteName, altitude, fmtDate, latitude, longitude]);

  // ── Loading / error ───────────────────────────────
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
          style={{ maxWidth: CW, margin: "0 auto" }}
        />
      </div>
    </div>
  );
}
