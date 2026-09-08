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
// Costanti layout
// ─────────────────────────────────────────────────────
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
const NUM_HOURS = HOURS.length;

const PLOT_BOTTOM_ALT = 1300;
const PLOT_TOP_ALT = 6000;
const WX = 1060;
const HEADER_H = 62;
const PLOT_H = 510;
const PLOT_Y0 = HEADER_H + 14;
const TOTAL_H = PLOT_Y0 + PLOT_H + 58; // 58 for x-axis labels
const PLOT_LEFT = 72;
const PLOT_RIGHT = 970;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;

const PRESSURE_LEVELS = [
  { hpa: 500, alt: 5800 },
  { hpa: 550, alt: 5000 },
  { hpa: 600, alt: 4400 },
  { hpa: 650, alt: 3750 },
  { hpa: 700, alt: 3100 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 1950 },
  { hpa: 850, alt: 1450 },
];

// ─────────────────────────────────────────────────────
// Scala colori DeltaT / 100 m (stabile → instabile)
// ─────────────────────────────────────────────────────
const DELTAT_COLORS: { val: number; color: string }[] = [
  { val: -0.20, color: "#6d28d9" },  // viola
  { val: -0.05, color: "#4f46e5" },  // indaco
  { val:  0.00, color: "#2563eb" },  // blu
  { val:  0.16, color: "#0891b2" },  // ciano
  { val:  0.32, color: "#059669" },  // verde
  { val:  0.48, color: "#65a30d" },  // lime
  { val:  0.65, color: "#ca8a04" },  // giallo
  { val:  0.82, color: "#ea580c" },  // arancione
  { val:  1.00, color: "#dc2626" },  // rosso
  { val:  1.20, color: "#991b1b" },  // rosso scuro
];

function getDeltaTColor(dt: number): string {
  for (let i = 0; i < DELTAT_COLORS.length - 1; i++) {
    if (dt >= DELTAT_COLORS[i].val && dt <= DELTAT_COLORS[i + 1].val) {
      return DELTAT_COLORS[i].color;
    }
  }
  return dt < -0.2 ? DELTAT_COLORS[0].color : DELTAT_COLORS[DELTAT_COLORS.length - 1].color;
}

function getDeltaTValueIndex(dt: number): number {
  for (let i = 0; i < DELTAT_COLORS.length; i++) {
    if (dt <= DELTAT_COLORS[i].val) return i;
  }
  return DELTAT_COLORS.length - 1;
}

// ─────────────────────────────────────────────────────
// Helper geometria
// ─────────────────────────────────────────────────────
function altToY(alt: number): number {
  const clamped = Math.max(PLOT_BOTTOM_ALT, Math.min(PLOT_TOP_ALT, alt));
  return PLOT_Y0 + PLOT_H * (1 - (clamped - PLOT_BOTTOM_ALT) / (PLOT_TOP_ALT - PLOT_BOTTOM_ALT));
}

function xFromHourIdx(idx: number): number {
  if (NUM_HOURS <= 1) return PLOT_LEFT + PLOT_W / 2;
  return PLOT_LEFT + (idx / (NUM_HOURS - 1)) * PLOT_W;
}

function xFromHour(h: number): number {
  const idx = (HOURS as readonly number[]).indexOf(h);
  return idx >= 0 ? xFromHourIdx(idx) : PLOT_LEFT;
}

// ─────────────────────────────────────────────────────
// Smoothing (Catmull-Rom → cubic Bézier)
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

function pathLine(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

// ─────────────────────────────────────────────────────
// Vento barbetta — convenzione meteo (punta verso la provenienza)
// ─────────────────────────────────────────────────────
function WindBarb({ cx, cy, speed, dir }: {
  cx: number; cy: number; speed: number; dir: number;
}): React.ReactNode {
  if (speed == null || isNaN(speed) || speed < 1) return null;
  const knots = speed * 0.539957;

  // Barra指向风向来的方向 (meteorological convention)
  const rad = ((dir - 90) * Math.PI) / 180;
  const len = 18;
  const ex = cx + len * Math.cos(rad);
  const ey = cy + len * Math.sin(rad);

  // Pennacce sul lato destro della barra
  const featherRad = rad + Math.PI * 0.62;
  const c = Math.cos(featherRad), s = Math.sin(featherRad);

  const col = speed > 35 ? "#b91c1c" : speed > 22 ? "#7e22ce" : "#1e3a5f";

  const elems: React.ReactNode[] = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;
  const step50 = 0.25, step10 = 0.18, step5 = 0.14;

  while (rem >= 50 && pos >= step50) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    const t = 9;
    elems.push(
      <polygon key={`f50-${cx.toFixed(0)}-${cy.toFixed(0)}-${pos.toFixed(2)}`}
        points={`${bx},${by} ${bx + t * c},${by + t * s} ${bx + t * 0.5 * Math.cos(rad)},${by + t * 0.5 * Math.sin(rad)}`}
        fill={col} stroke={col} strokeWidth="0.5" />
    );
    rem -= 50; pos -= step50;
  }
  while (rem >= 10 && pos >= step10) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    const t = 8;
    elems.push(
      <line key={`f10-${cx.toFixed(0)}-${cy.toFixed(0)}-${pos.toFixed(2)}`}
        x1={bx} y1={by} x2={bx + t * c} y2={by + t * s}
        stroke={col} strokeWidth="1.6" strokeLinecap="round" />
    );
    rem -= 10; pos -= step10;
  }
  if (rem >= 5 && pos >= step5) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    const t = 4.5;
    elems.push(
      <line key={`f5-${cx.toFixed(0)}-${cy.toFixed(0)}`}
        x1={bx} y1={by} x2={bx + t * c} y2={by + t * s}
        stroke={col} strokeWidth="1.6" strokeLinecap="round" />
    );
  }

  return (
    <g>
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={col} strokeWidth="1.4" strokeLinecap="round" />
      {elems}
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Parapendio icon (small arc + lines)
// ─────────────────────────────────────────────────────
function ParagliderIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M -10,-4 C -6,-14 6,-14 10,-4 C 5,-9 -5,-9 -10,-4 Z"
        fill="#e9d5ff" stroke="#7e22ce" strokeWidth="1.6" />
      <line x1="-8" y1="-4" x2="0" y2="5" stroke="#7e22ce" strokeWidth="1" />
      <line x1="8" y1="-4" x2="0" y2="5" stroke="#7e22ce" strokeWidth="1" />
      <line x1="0" y1="-7" x2="0" y2="5" stroke="#7e22ce" strokeWidth="0.8" />
      <circle cx="0" cy="5" r="3" fill="#fff" stroke="#7e22ce" strokeWidth="1.5" />
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Fiocco di neve
// ─────────────────────────────────────────────────────
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="7" fill="#fff" stroke="#0284c7" strokeWidth="1.3" />
      <g stroke="#0284c7" strokeWidth="0.9" strokeLinecap="round">
        <line x1="0" y1="-4" x2="0" y2="4" />
        <line x1="-4" y1="0" x2="4" y2="0" />
        <line x1="-3" y1="-3" x2="3" y2="3" />
        <line x1="-3" y1="3" x2="3" y2="-3" />
      </g>
    </g>
  );
}

// ─────────────────────────────────────────────────────
// Principal component
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

  // Fetch data
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: [
        "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
        "precipitation", "precipitation_probability", "weather_code",
        "pressure_msl", "surface_pressure",
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

  // Build hourly computed data
  const hourlyData = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times: string[] = data.hourly.time;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) return null;

      const h = data.hourly;
      const t = h.temperature_2m[idx] ?? 15;
      const dew = h.dew_point_2m?.[idx] ?? (t - 6);
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

      // Spread T - Td
      const spread = Math.max(0.5, t - dew);
      const cloudBase = Math.round(altitude + spread * 125);

      // Sole % (realistic)
      const sunPct = Math.min(100, Math.max(5, Math.round((rad / 950) * (1 - cloud / 100 * 0.7) * 100)));

      // DeltaT/100m from vertical temperature gradient
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];
      let deltaT = 0.65; // neutral dry adiabatic
      if (t80 != null && !isNaN(t80)) deltaT = Math.round(((t - t80) / 78) * 100 * 100) / 100;
      else if (t120 != null && !isNaN(t120)) deltaT = Math.round(((t - t120) / 118) * 100 * 100) / 100;
      else deltaT = spread >= 10 ? 0.95 : spread >= 5 ? 0.72 : 0.55;

      // Thermal rate
      let rateo = 0.5 + spread * 0.07 + (sunPct / 100) * 0.4 + (cape > 100 ? Math.min(1.0, cape / 800) : 0);
      if (precip > 0.3) rateo = Math.min(rateo, 0.3);
      else if (cloud > 80) rateo *= 0.35;
      if (cin > 100) rateo *= 0.5;
      rateo = Math.max(0.2, Math.min(3.0, Math.round(rateo * 10) / 10));

      // Thermal top
      const thermalTop = Math.round(Math.min(4500, cloudBase + Math.min(1000, rateo * 120 + cape * 0.08)));

      // Zero thermal (freezing level)
      const freeze = h.freezing_level_height?.[idx] ?? Math.round(altitude + (t / 0.0065));

      // Level winds from real data
      const levelWinds = [
        { hpa: 500, alt: 5800, speed: h.wind_speed_500hPa?.[idx], dir: h.wind_direction_500hPa?.[idx] },
        { hpa: 600, alt: 4400, speed: h.wind_speed_600hPa?.[idx], dir: h.wind_direction_600hPa?.[idx] },
        { hpa: 700, alt: 3100, speed: h.wind_speed_700hPa?.[idx], dir: h.wind_direction_700hPa?.[idx] },
        { hpa: 850, alt: 1450, speed: h.wind_speed_850hPa?.[idx], dir: h.wind_direction_850hPa?.[idx] },
      ].map((l) => ({
        ...l,
        speed: l.speed ?? Math.round(wind10 * (5800 - l.alt) / (5800 - 1450) * 1.5 + wind10 * 0.5),
        dir: l.dir ?? Math.round(windDir10 + (5800 - l.alt) * 0.01),
      }));

      return {
        hour: targetHour,
        idx,
        t, dew, hum,
        spread,
        cloud, cloudLow, cloudMid, cloudHigh,
        precip, cape, li, cin,
        wind10, windDir10, gust10,
        sunPct, sunDur,
        deltaT, rateo,
        cloudBase, thermalTop, freeze,
        t80: t80 ?? t - 3, t120: t120 ?? t - 6,
        levelWinds,
        x: xFromHour(targetHour),
        yCloudBase: altToY(cloudBase),
        yThermalTop: altToY(thermalTop),
        yFreeze: altToY(freeze),
      };
    }).filter((d): d is NonNullable<typeof d> => d !== null);
  }, [data, altitude]);

  // Smooth paths
  const thermalTopPts = useMemo(
    () => hourlyData.map((h) => ({ x: h.x, y: h.yThermalTop })),
    [hourlyData]
  );
  const freezePts = useMemo(
    () => hourlyData.map((h) => ({ x: h.x, y: h.yFreeze })),
    [hourlyData]
  );

  // Zero thermal label (average altitude)
  const avgFreeze = useMemo(() => {
    if (!hourlyData.length) return altitude + 3000;
    return Math.round(hourlyData.reduce((s, h) => s + h.freeze, 0) / hourlyData.length);
  }, [hourlyData, altitude]);

  // Cloud base badges for middle hours
  const cloudBadges = useMemo(() => {
    return hourlyData.filter((_, i) => i > 0 && i < hourlyData.length - 1).map((h, i) => ({
      x: h.x,
      y: altToY(h.cloudBase + 180),
      alt: h.cloudBase,
      rate: h.rateo,
      pct: h.cloud,
    }));
  }, [hourlyData]);

  // Precipitation labels
  const precipLabels = useMemo(() => {
    return hourlyData.filter((h) => h.precip > 0.05).map((h) => ({
      x: h.x,
      y: altToY(PLOT_TOP_ALT) - 8,
      amount: h.precip,
      hour: h.hour as number,
    }));
  }, [hourlyData]);

  // ─── Rendering ────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 p-8 flex flex-col items-center justify-center min-h-[420px]">
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

  return (
    <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
      {/* ── HEADER ── */}
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight text-center lowercase">
          {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
        </h2>
        <p className="text-[10px] sm:text-xs text-slate-500 font-mono text-center mt-0.5">
          plotted {dateStr} 00:00 UTC &middot; model ground {Math.round(altitude + 5)} m &middot; SRTM {Math.round(altitude)} m
        </p>
      </div>

      {/* ── TOP STRIP: ascendenze + sole ── */}
      <div className="px-5 pb-2">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">valore medio ascendenze (m/s)</span>
        </div>
        <div className="flex items-center justify-between">
          {hourlyData.map((h, i) => (
            <div key={i} className="flex-1 text-center">
              <div
                className="text-base sm:text-lg font-black tabular-nums"
                style={{ color: h.rateo >= 1.6 ? "#b91c1c" : h.rateo >= 1.0 ? "#ca8a04" : "#0f172a" }}
              >
                {h.rateo.toFixed(1)}
              </div>
              <div className="text-[10px] font-bold" style={{ color: h.sunPct >= 70 ? "#b45309" : "#64748b" }}>
                {h.sunPct}%
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-0.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">sole %</span>
        </div>
      </div>

      {/* ── SVG WINDGRAM ── */}
      <div className="overflow-x-auto px-2">
        <svg
          viewBox={`0 0 ${WX} ${TOTAL_H}`}
          className="w-full min-w-[700px] h-auto block"
          style={{ shapeRendering: "geometricPrecision" }}
        >
          {/*Defs */}
          <defs>
            <pattern id="crossHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#1e293b" strokeWidth="0.7" opacity="0.3" />
              <line x1="0" y1="0" x2="6" y2="0" stroke="#1e293b" strokeWidth="0.7" opacity="0.3" />
            </pattern>
            <linearGradient id="deltatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              {DELTAT_COLORS.map((item, idx) => (
                <stop key={idx} offset={`${(idx / (DELTAT_COLORS.length - 1)) * 100}%`} stopColor={item.color} />
              ))}
            </linearGradient>
          </defs>

          {/* ── Plot background (pale yellow) ── */}
          <rect x={PLOT_LEFT} y={PLOT_Y0} width={PLOT_W} height={PLOT_H} fill="#fefce8" />

          {/* ── Stability background bands ── */}
          {hourlyData.map((h, i) => {
            const xL = i === 0 ? PLOT_LEFT : xFromHourIdx(i - 1);
            const xR = i === hourlyData.length - 1 ? PLOT_LEFT + PLOT_W : xFromHourIdx(i + 1);
            const w = xR - xL;
            // Stable zone (above thermal top): inverted deltaT
            const stableColor = getDeltaTColor(-h.deltaT);
            const unstableColor = getDeltaTColor(h.deltaT);
            return (
              <g key={`bands-${i}`}>
                <rect x={xL} y={PLOT_Y0} width={w} height={PLOT_Y0 + (altToY(PLOT_TOP_ALT) - PLOT_Y0) * 0.4}
                  fill={stableColor} opacity="0.35" />
                <rect x={xL} y={PLOT_Y0 + (altToY(PLOT_TOP_ALT) - PLOT_Y0) * 0.4} width={w} height={PLOT_H * 0.6}
                  fill={unstableColor} opacity="0.55" />
              </g>
            );
          })}

          {/* ── Cross-hatch over convective hours (10-15) ── */}
          <rect
            x={xFromHour(10)} y={PLOT_Y0}
            width={xFromHour(15) - xFromHour(10)}
            height={PLOT_H}
            fill="url(#crossHatch)"
          />

          {/* ── Pressure level grid lines ── */}
          {PRESSURE_LEVELS.map((lv) => {
            const y = altToY(lv.alt);
            return (
              <g key={`pl-${lv.hpa}`}>
                <line x1={PLOT_LEFT} y1={y} x2={PLOT_LEFT + PLOT_W} y2={y}
                  stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.6" />
                <text x={PLOT_LEFT - 6} y={y + 4} textAnchor="end"
                  fontSize="10" fontWeight="700" fill="#334155" fontFamily="monospace">
                  {lv.hpa} hPa
                </text>
                <text x={PLOT_LEFT + PLOT_W + 6} y={y + 4} textAnchor="start"
                  fontSize="9" fontWeight="600" fill="#64748b" fontFamily="monospace">
                  {lv.alt} m
                </text>
              </g>
            );
          })}

          {/* ── Hour vertical grid lines ── */}
          {hourlyData.map((h, i) => (
            <line key={`vg-${h.hour}`} x1={h.x} y1={PLOT_Y0} x2={h.x} y2={PLOT_Y0 + PLOT_H}
              stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
          ))}

          {/* ── Plot border ── */}
          <rect x={PLOT_LEFT} y={PLOT_Y0} width={PLOT_W} height={PLOT_H}
            fill="none" stroke="#0f172a" strokeWidth="1.2" />

          {/* ── Wind barbs at each hour & level ── */}
          {hourlyData.map((h, hi) =>
            h.levelWinds.map((lw, li) => (
              <WindBarb
                key={`wb-${hi}-${li}`}
                cx={h.x}
                cy={altToY(lw.alt)}
                speed={lw.speed}
                dir={lw.dir}
              />
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
            <g transform={`translate(${PLOT_LEFT + PLOT_W - 120}, ${altToY(avgFreeze) - 14})`}>
              <rect x="0" y="0" width="116" height="26" rx="5"
                fill="#fff" stroke="#0284c7" strokeWidth="1.5" />
              <text x="58" y="18" textAnchor="middle" fontSize="11" fontWeight="800"
                fill="#0284c7" fontFamily="monospace">
                0 °C &middot; {avgFreeze} m
              </text>
            </g>
          )}

          {/* ── Thermal top curve (purple) ── */}
          {thermalTopPts.length >= 2 && (
            <path d={smoothPath(thermalTopPts)} fill="none" stroke="#9333ea"
              strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* ── Paraglider icons on thermal top ── */}
          {hourlyData.map((h, i) => (
            <ParagliderIcon key={`pg-${i}`} x={h.x} y={h.yThermalTop - 4} />
          ))}

          {/* ── Thermal level curves (dashed, various percentages) ── */}
          {[25, 50, 75].map((pct) => {
            const pts = hourlyData.map((h) => ({
              x: h.x,
              y: altToY(h.cloudBase + (h.thermalTop - h.cloudBase) * (pct / 100)),
            }));
            return (
              <path key={`tlc-${pct}`} d={pathLine(pts)} fill="none"
                stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.55" />
            );
          })}

          {/* ── Cloud base curve (light purple dashed) ── */}
          {hourlyData.length >= 2 && (
            <path d={pathLine(hourlyData.map((h) => ({ x: h.x, y: h.yCloudBase })))}
              fill="none" stroke="#a855f7" strokeWidth="1.3" strokeDasharray="5 3" opacity="0.7" />
          )}

          {/* ── Cloud base badges ── */}
          {cloudBadges.map((b, i) => (
            <g key={`cb-${i}`} transform={`translate(${b.x - 28}, ${b.y})`}>
              <rect x="0" y="0" width="56" height="26" rx="4"
                fill="#fff" stroke="#c084fc" strokeWidth="1.2" />
              <text x="28" y="11" textAnchor="middle" fontSize="9" fontWeight="800"
                fill="#0f172a" fontFamily="monospace">
                {b.alt} m
              </text>
              <text x="28" y="22" textAnchor="middle" fontSize="9" fontWeight="800"
                fill="#7e22ce" fontFamily="monospace">
                ↑ {b.rate.toFixed(1)} m/s
              </text>
            </g>
          ))}

          {/* ── Cloud coverage badges ── */}
          {hourlyData.map((h, i) => {
            if (i === 0 || i === hourlyData.length - 1) return null;
            return (
              <g key={`cpct-${i}`} transform={`translate(${h.x}, ${altToY(h.cloudBase + 320)})`}>
                <text x="0" y="0" textAnchor="middle" fontSize="8" fontWeight="700"
                  fill="#475569" fontFamily="monospace">
                  {h.cloud}%
                </text>
              </g>
            );
          })}

          {/* ── Precipitation labels ── */}
          {precipLabels.map((pl, i) => (
            <g key={`prec-${i}`} transform={`translate(${pl.x - 16}, ${pl.y})`}>
              <rect x="0" y="0" width="32" height="14" rx="3"
                fill="#dbeafe" stroke="#3b82f6" strokeWidth="0.8" />
              <text x="16" y="10" textAnchor="middle" fontSize="8" fontWeight="700"
                fill="#1e40af" fontFamily="monospace">
                {pl.amount.toFixed(2)} mm
              </text>
            </g>
          ))}

          {/* ── PBL (planetary boundary layer) dashed black ── */}
          {(() => {
            const pblPts = hourlyData.map((h) => ({
              x: h.x,
              y: altToY(Math.min(PLOT_TOP_ALT, Math.max(PLOT_BOTTOM_ALT, h.cloudBase + h.rateo * 600))),
            }));
            return pblPts.length >= 2 ? (
              <path d={smoothPath(pblPts)} fill="none" stroke="#0f172a"
                strokeWidth="1.8" strokeDasharray="5 4" strokeLinecap="round" opacity="0.7" />
            ) : null;
          })()}

          {/* ── X-axis labels ── */}
          {hourlyData.map((h) => (
            <g key={`xl-${h.hour}`}>
              <line x1={h.x} y1={PLOT_Y0 + PLOT_H} x2={h.x} y2={PLOT_Y0 + PLOT_H + 6}
                stroke="#0f172a" strokeWidth="1" />
              <text x={h.x} y={PLOT_Y0 + PLOT_H + 20} textAnchor="middle"
                fontSize="11" fontWeight="700" fill="#0f172a" fontFamily="monospace">
                {String(h.hour).padStart(2, "0")}:00
              </text>
            </g>
          ))}

          {/* ── Right-side altitude ticks ── */}
          {[1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000].map((alt) => {
            const y = altToY(alt);
            return (
              <g key={`rt-${alt}`}>
                <line x1={PLOT_LEFT + PLOT_W} y1={y} x2={PLOT_LEFT + PLOT_W + 5} y2={y}
                  stroke="#0f172a" strokeWidth="1" />
                <text x={PLOT_LEFT + PLOT_W + 9} y={y + 4} textAnchor="start"
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
          {DELTAT_COLORS.map((item, idx) => (
            <div key={idx} className="flex-1 h-full" style={{ backgroundColor: item.color }} />
          ))}
        </div>
        <div className="flex justify-between text-[9px] font-mono font-bold text-slate-600 mt-0.5 px-0.5">
          {DELTAT_COLORS.map((item, idx) => (
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
