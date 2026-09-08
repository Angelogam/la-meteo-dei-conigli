"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// WindgramChart — windgram meteo-parapente stile Alpium/Rasoft
// ────────────────────────────────────────────────────────────────────────────

interface WindgramChartProps {
  latitude: number;
  longitude: number;
  altitude: number;
  siteName: string;
  selectedDay?: number;
}

const HPA_LEVELS = [
  { hpa: 500, alt: 5800 },
  { hpa: 550, alt: 5000 },
  { hpa: 600, alt: 4400 },
  { hpa: 650, alt: 3750 },
  { hpa: 700, alt: 3100 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 1950 },
  { hpa: 850, alt: 1450 },
];

const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

const VB_W = 1100;
const VB_H = 700;
const MARGIN = { top: 95, right: 95, bottom: 90, left: 88 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;
const Y_MIN = 800;
const Y_MAX = 6200;

const yToPx = (alt: number) => MARGIN.top + ((Y_MAX - alt) / (Y_MAX - Y_MIN)) * PLOT_H;
const pxToAlt = (py: number) => Y_MAX - ((py - MARGIN.top) / PLOT_H) * (Y_MAX - Y_MIN);
const xToPx = (hr: number) => MARGIN.left + ((hr - 7.5) / DISPLAY_HOURS.length) * PLOT_W;

// ─── Scala ΔT/100m ───
const DT_SCALE = [
  { max: -0.3, color: "#3b5fa0" },
  { max: -0.1, color: "#5b78b8" },
  { max: 0.0, color: "#7fa0c8" },
  { max: 0.2, color: "#9bbed6" },
  { max: 0.4, color: "#bedfd6" },
  { max: 0.55, color: "#dfeec0" },
  { max: 0.65, color: "#fef08a" },
  { max: 0.75, color: "#fde047" },
  { max: 0.85, color: "#fbbf24" },
  { max: 0.95, color: "#fb923c" },
  { max: 1.05, color: "#f97316" },
  { max: 1.20, color: "#ea580c" },
  { max: Infinity, color: "#dc2626" },
];

function dtColor(dt: number): string {
  for (const s of DT_SCALE) {
    if (dt <= s.max) return s.color;
  }
  return "#dc2626";
}

// ─── Colore barbetta (km/h) ───
function barbColor(speed: number): string {
  if (speed <= 4) return "#0284c7";
  if (speed <= 8) return "#0d9488";
  if (speed <= 13) return "#16a34a";
  if (speed <= 18) return "#65a30d";
  if (speed <= 24) return "#eab308";
  if (speed <= 30) return "#f97316";
  if (speed <= 42) return "#dc2626";
  if (speed <= 58) return "#991b1b";
  return "#86198f";
}

// ─── Interpolazione temperatura a quota arbitraria ───
// Per quote sotto 850hPa (1450m) usa un gradiente realistico basato sul suolo
function getTempAtAlt(
  hourly: any,
  idx: number,
  alt: number,
  siteAlt: number
): number {
  const groundTemp = hourly.temperature_2m?.[idx] ?? 18;

  // Punti temperatura noti
  const pts: { alt: number; temp: number }[] = [
    { alt: siteAlt, temp: groundTemp },
  ];
  HPA_LEVELS.forEach((lv) => {
    const t = hourly[`temperature_${lv.hpa}hPa`]?.[idx];
    if (t != null && !isNaN(t)) pts.push({ alt: lv.alt, temp: t });
  });
  pts.sort((a, b) => a.alt - b.alt);

  if (pts.length === 0) return groundTemp - (alt - siteAlt) * 0.0065;
  if (alt <= pts[0].alt) return pts[0].temp;
  if (alt >= pts[pts.length - 1].alt) return pts[pts.length - 1].temp;

  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i].alt <= alt && pts[i + 1].alt >= alt) {
      const r = (alt - pts[i].alt) / (pts[i + 1].alt - pts[i].alt);
      return pts[i].temp + r * (pts[i + 1].temp - pts[i].temp);
    }
  }
  return groundTemp;
}

// ─── Smooth path ───
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const cpx = (prev.x + cur.x) / 2;
    d += ` Q ${prev.x} ${prev.y} ${cpx} ${(prev.y + cur.y) / 2}`;
    d += ` Q ${cur.x} ${cur.y} ${cur.x} ${cur.y}`;
  }
  return d;
}

// ─── WindBarb — barbetta meteorologica ───
// direction = direzione DA CUI SOFFIA IL VENTO (convenzione meteo, gradi da Nord)
// La barbetta punta verso la direzione DA CUI viene il vento (come nelle mappe meteo classiche)
function WindBarb({
  cx,
  cy,
  speedKmh,
  direction,
}: {
  cx: number;
  cy: number;
  speedKmh: number;
  direction: number;
}) {
  if (speedKmh < 1 || isNaN(speedKmh)) return null;

  // direction è la direzione DA CUI viene il vento (0=Nord, 90=Est, 180=Sud, 270=Ovest)
  // Nella convenzione meteo, la barbetta punta verso la direzione di provenienza
  // Convertiamo in angolo SVG: Nord=−Y, Est=+X, Sud=+Y, Ovest=−X
  // angolo SVG = (direction - 90) * π/180  →  0°(N)=−90°(SU), 90°(E)=0°(DESTRA)
  // Aspetta — questo darebbe Nord=giù. Invece:
  // Per punta verso Nord (direction=0): angolo = −90° in SVG → verso l'alto ✓
  // Per punta verso Est (direction=90): angolo = 0° → verso destra ✓
  // Per punta verso Sud (direction=180): angolo = +90° → verso il basso ✓
  // Per punta verso Ovest (direction=270): angolo = +180° → verso sinistra ✓
  const svgAngle = ((direction - 90) * Math.PI) / 180;

  const knots = speedKmh * 0.539957;
  const staffLen = 26;

  // Vettore principale: dalla stazione verso la direzione di provenienza
  const ex = cx + staffLen * Math.cos(svgAngle);
  const ey = cy + staffLen * Math.sin(svgAngle);

  const color = barbColor(speedKmh);

  // Penna: sul lato opposto alla provenienza (lato a monte)
  // featherAngle = angolo + 100° in senso antiorario (perpicolare al gambo)
  const featherAngle = svgAngle + (105 * Math.PI) / 180;

  const elements: React.ReactNode[] = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;

  while (rem >= 50 && pos >= 0.25) {
    const bx = cx + pos * (ex - cx);
    const by = cy + pos * (ey - cy);
    elements.push(
      <polygon
        key={`p50-${cx.toFixed(0)}-${cy.toFixed(0)}-${pos.toFixed(2)}`}
        points={`${bx},${by} ${bx + 12 * Math.cos(featherAngle)},${by + 12 * Math.sin(featherAngle)} ${bx + 6 * Math.cos(svgAngle)},${by + 6 * Math.sin(svgAngle)}`}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
      />
    );
    rem -= 50;
    pos -= 0.25;
  }

  while (rem >= 10 && pos >= 0.15) {
    const bx = cx + pos * (ex - cx);
    const by = cy + pos * (ey - cy);
    elements.push(
      <line
        key={`l10-${cx.toFixed(0)}-${cy.toFixed(0)}-${pos.toFixed(2)}`}
        x1={bx}
        y1={by}
        x2={bx + 11 * Math.cos(featherAngle)}
        y2={by + 11 * Math.sin(featherAngle)}
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    );
    rem -= 10;
    pos -= 0.18;
  }

  if (rem >= 5 && pos >= 0.15) {
    const bx = cx + pos * (ex - cx);
    const by = cy + pos * (ey - cy);
    elements.push(
      <line
        key={`l5-${cx.toFixed(0)}-${cy.toFixed(0)}`}
        x1={bx}
        y1={by}
        x2={bx + 6 * Math.cos(featherAngle)}
        y2={by + 6 * Math.sin(featherAngle)}
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    );
  }

  return (
    <g key={`wb-${cx.toFixed(0)}-${cy.toFixed(0)}`}>
      <line
        x1={cx}
        y1={cy}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {elements}
    </g>
  );
}

// ─── Parapendio stilizzato ───
function ParagliderIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M -12 -5 Q 0 -16 12 -5" fill="none" stroke="#a855f7" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M -9 -4 Q 0 -11 9 -4" fill="none" stroke="#c084fc" strokeWidth={1.2} strokeLinecap="round" />
      <line x1="-8" y1="-4" x2="0" y2="5" stroke="#7e22ce" strokeWidth={1} />
      <line x1="8" y1="-4" x2="0" y2="5" stroke="#7e22ce" strokeWidth={1} />
      <circle cx="0" cy="5" r="2.5" fill="#fff" stroke="#7e22ce" strokeWidth={1.2} />
    </g>
  );
}

// ─── Nuvola stilizzata ───
function CloudIcon({ x, y, pct }: { x: number; y: number; pct: number }) {
  const opacity = Math.min(1, 0.25 + (pct / 100) * 0.75);
  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <path
        d="M -14 0 Q -14 -7 -7 -7 Q -4 -12 0 -12 Q 6 -12 8 -7 Q 15 -7 15 0 Q 15 5 10 5 L -10 5 Q -14 5 -14 0 Z"
        fill="#fff"
        stroke="#64748b"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {pct > 30 && (
        <text x={0} y={4} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="#1e293b" fontFamily="ui-monospace, monospace">
          {pct}%
        </text>
      )}
    </g>
  );
}

// ─── Fiocco di neve ───
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="7" fill="#fff" stroke="#0284c7" strokeWidth={1.4} />
      <g stroke="#0284c7" strokeWidth={1.1} strokeLinecap="round" fill="none">
        <line x1="0" y1="-4" x2="0" y2="4" />
        <line x1="-4" y1="0" x2="4" y2="0" />
        <line x1="-3" y1="-3" x2="3" y2="3" />
        <line x1="-3" y1="3" x2="3" y2="-3" />
      </g>
    </g>
  );
}

interface HourRow {
  hour: number;
  idx: number;
  wind: { alt: number; speed: number; dir: number }[];
  thermal: number;
  sunPct: number;
  cloudPct: number;
  cape: number;
  freezing: number;
  temp2m: number;
  dew2m: number;
  cloudBase: number;
  thermalTop: number;
  stability: number;
}

export default function WindgramChart({
  latitude,
  longitude,
  altitude,
  siteName,
  selectedDay = 0,
}: WindgramChartProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d.toISOString().split("T")[0];
  }, [selectedDay]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fields = [
      "temperature_2m", "dew_point_2m", "cloud_cover", "cloud_cover_low",
      "cloud_cover_mid", "cloud_cover_high", "shortwave_radiation",
      "wind_speed_10m", "wind_direction_10m", "wind_speed_80m", "wind_direction_80m",
      "wind_speed_120m", "wind_direction_120m",
      "wind_speed_850hPa", "wind_direction_850hPa",
      "wind_speed_700hPa", "wind_direction_700hPa",
      "wind_speed_600hPa", "wind_direction_600hPa",
      "wind_speed_500hPa", "wind_direction_500hPa",
      "temperature_850hPa", "temperature_700hPa", "temperature_600hPa", "temperature_500hPa",
      "freezing_level_height", "cape",
    ].join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${fields}&start_date=${targetDate}&end_date=${targetDate}&timezone=Europe/Rome&wind_speed_unit=kmh`;

    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j) => { if (!cancelled) { setData(j); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(String(e)); setLoading(false); } });

    return () => { cancelled = true; };
  }, [latitude, longitude, targetDate]);

  const rows = useMemo<HourRow[]>(() => {
    if (!data?.hourly?.time) return [];
    const h = data.hourly;
    const out: HourRow[] = [];

    for (const hr of DISPLAY_HOURS) {
      const idx = h.time.findIndex((t: string) => parseInt(t.split("T")[1].split(":")[0], 10) === hr);
      if (idx < 0) continue;

      const t = h.temperature_2m[idx] ?? 18;
      const td = h.dew_point_2m[idx] ?? (t - 8);
      const cloudPct = h.cloud_cover[idx] ?? 0;
      const cape = h.cape[idx] ?? 0;
      const rad = h.shortwave_radiation[idx] ?? 0;

      const cloudBase = altitude + 125 * Math.max(1, t - td);
      const thermalTop = cloudBase + Math.min(1800, cape * 0.9);
      const thermal = Math.min(3.5, Math.max(0, Math.sqrt(Math.max(0, cape)) * 0.12 + (thermalTop - cloudBase) / 5000));

      out.push({
        hour: hr,
        idx,
        wind: [
          // Direzioni: Open-Meteo restituisce direzione DA CUI viene il vento (convenzione meteo)
          // Le barbette puntano verso la direzione di provenienza (come nelle mappe meteo classiche)
          { alt: altitude, speed: h.wind_speed_10m[idx] ?? 0, dir: h.wind_direction_10m[idx] ?? 180 },
          { alt: altitude + 80, speed: h.wind_speed_80m[idx] ?? 0, dir: h.wind_direction_80m[idx] ?? 180 },
          { alt: altitude + 120, speed: h.wind_speed_120m[idx] ?? 0, dir: h.wind_direction_120m[idx] ?? 180 },
          { alt: 1450, speed: h.wind_speed_850hPa[idx] ?? 0, dir: h.wind_direction_850hPa[idx] ?? 180 },
          { alt: 3100, speed: h.wind_speed_700hPa[idx] ?? 0, dir: h.wind_direction_700hPa[idx] ?? 180 },
          { alt: 4400, speed: h.wind_speed_600hPa[idx] ?? 0, dir: h.wind_direction_600hPa[idx] ?? 180 },
          { alt: 5800, speed: h.wind_speed_500hPa[idx] ?? 0, dir: h.wind_direction_500hPa[idx] ?? 180 },
        ],
        thermal,
        sunPct: Math.min(100, Math.max(0, Math.round((rad / 900) * 100))),
        cloudPct,
        cape,
        freezing: h.freezing_level_height[idx] ?? 4000,
        temp2m: t,
        dew2m: td,
        cloudBase: Math.round(cloudBase),
        thermalTop: Math.round(Math.min(6000, thermalTop)),
        stability: Math.min(1, Math.max(0, (rad / 700) * 0.6 + (cape / 200) * 0.4)),
      });
    }
    return out;
  }, [data, altitude]);

  const thermalTopPts = useMemo(
    () => rows.map((r) => ({ x: xToPx(r.hour), y: yToPx(r.thermalTop) })),
    [rows]
  );
  const freezingPts = useMemo(
    () => rows.map((r) => ({ x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX, r.freezing)) })),
    [rows]
  );
  const pblPts = useMemo(
    () =>
      rows.map((r) => {
        const hf = 1 - Math.abs(r.hour - 13) / 5;
        const pbl = 1300 + r.thermal * 700 * Math.max(0, hf);
        return { x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX, Math.max(1100, pbl))) };
      }),
    [rows]
  );
  const cloudBasePts = useMemo(
    () => rows.map((r) => ({ x: xToPx(r.hour), y: yToPx(r.cloudBase) })),
    [rows]
  );

  const cloudList = useMemo(
    () =>
      rows
        .filter((r) => r.cloudPct > 20)
        .map((r) => ({
          x: xToPx(r.hour),
          y: yToPx(r.thermalTop + 350),
          pct: r.cloudPct,
        })),
    [rows]
  );

  const dateInfo = useMemo(() => {
    const d = new Date(targetDate + "T00:00:00");
    const giorni = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const mesi = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return { giorno: giorni[d.getDay()], data: d.getDate(), mese: mesi[d.getMonth()] };
  }, [targetDate]);

  // ─── Instabilità heatmap ───
  // Calcola ΔT/100m per ogni cella (ora × quota) usando temperature reali
  // Per la bassa quota (sotto 850hPa) usa un gradiente realistico
  const instabilityCells = useMemo(() => {
    if (!data?.hourly?.time || rows.length === 0) return [];
    const h = data.hourly;
    const cells: { x: number; y: number; w: number; h: number; color: string; opacity: number }[] = [];
    const colW = PLOT_W / DISPLAY_HOURS.length;
    const rowH = PLOT_H / 30;

    rows.forEach((row, ci) => {
      for (let ri = 0; ri < 30; ri++) {
        const alt = Y_MAX - (ri + 0.5) * (Y_MAX - Y_MIN) / 30;

        // Per quote basse (< 1000m sopra il suolo), usa un modello termico realistico
        // L'aria vicino al suolo è più instabile di giorno (riscaldata dal sole)
        const dayPhase = (row.hour - 13) / 5;
        const diurnalFactor = dayPhase >= -1 && dayPhase <= 1
          ? Math.cos((dayPhase * Math.PI) / 2)
          : 0;

        let dt: number;
        if (alt < altitude + 500) {
          // Zona di mistura: ΔT positivo di giorno (instabile), negativo di notte
          dt = -0.2 + diurnalFactor * 1.0;
        } else if (alt < altitude + 1500) {
          // Sotto la base cumuli: ΔT dipende dall'instabilità convettiva
          const baseDT = row.cloudPct < 40 ? 0.7 : row.cloudPct < 70 ? 0.5 : 0.3;
          dt = baseDT + diurnalFactor * 0.3;
        } else {
          // Quote medie-alte: usa temperature reali
          const tBelow = getTempAtAlt(h, row.idx, alt - 100, altitude);
          const tAbove = getTempAtAlt(h, row.idx, alt + 100, altitude);
          dt = ((tAbove - tBelow) / 200) * 100;
        }

        cells.push({
          x: MARGIN.left + ci * colW,
          y: MARGIN.top + ri * rowH,
          w: colW + 0.3,
          h: rowH + 0.3,
          color: dtColor(dt),
          opacity: 0.88,
        });
      }
    });
    return cells;
  }, [data, rows, altitude]);

  // Zona instabile rossa/arancio sotto thermalTop (onda sinusoidale)
  const unstableZonePath = useMemo(() => {
    if (rows.length === 0) return "";
    const pts: { x: number; y: number }[] = [];
    rows.forEach((r) => pts.push({ x: xToPx(r.hour), y: yToPx(r.thermalTop) }));
    const lastX = xToPx(rows[rows.length - 1].hour);
    const firstX = xToPx(rows[0].hour);
    const baseY = MARGIN.top + PLOT_H;
    return smoothPath(pts) + ` L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [rows]);

  // Area cross-hatch per alta instabilità in quota
  const crossHatchAreas = useMemo(() => {
    if (!data?.hourly?.time || rows.length === 0) return [];
    const h = data.hourly;
    const areas: { x: number; y: number; w: number; h: number }[] = [];
    const colW = PLOT_W / DISPLAY_HOURS.length;
    const rowH = PLOT_H / 30;

    rows.forEach((row, ci) => {
      for (let ri = 0; ri < 12; ri++) {
        const alt = Y_MAX - (ri + 0.5) * (Y_MAX - Y_MIN) / 30;
        const tBelow = getTempAtAlt(h, row.idx, alt - 100, altitude);
        const tAbove = getTempAtAlt(h, row.idx, alt + 100, altitude);
        const dt = ((tAbove - tBelow) / 200) * 100;
        if (dt > 0.9 && alt > 3000) {
          areas.push({
            x: MARGIN.left + ci * colW,
            y: MARGIN.top + ri * rowH,
            w: colW + 0.5,
            h: rowH * 2,
          });
        }
      }
    });
    return areas;
  }, [data, rows, altitude]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 flex items-center justify-center min-h-[420px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Caricamento windgram…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 p-8 text-center">
        <p className="text-rose-600 text-sm font-medium">
          Errore caricamento dati: {error ?? "nessun dato"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-3 md:p-5">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full min-w-[920px] h-auto block"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          <defs>
            <clipPath id="wc-plotClip">
              <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H} />
            </clipPath>
            <pattern id="crossHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#1e293b" strokeWidth="1" opacity="0.5" />
              <line x1="0" y1="0" x2="6" y2="0" stroke="#1e293b" strokeWidth="1" opacity="0.5" />
            </pattern>
          </defs>

          {/* ═══ SFONDO ISTABILITÀ ═══ */}
          <g clipPath="url(#wc-plotClip)">
            {instabilityCells.map((c, i) => (
              <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.color} opacity={c.opacity} />
            ))}

            {/* Zona instabile rossa/arancio sotto thermalTop */}
            {unstableZonePath && (
              <path d={unstableZonePath} fill="#f97316" opacity={0.5} />
            )}

            {/* Cross-hatch aree alta instabilità */}
            {crossHatchAreas.map((a, i) => (
              <rect key={`ch-${i}`} x={a.x} y={a.y} width={a.w} height={a.h} fill="url(#crossHatch)" opacity={0.55} />
            ))}
          </g>

          {/* ═══ BORDO PLOT ═══ */}
          <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H} fill="none" stroke="#0f172a" strokeWidth={1.3} />

          {/* ═══ LINEE QUOTE hPa ═══ */}
          {HPA_LEVELS.map((lv) => (
            <g key={lv.hpa}>
              <line x1={MARGIN.left} y1={yToPx(lv.alt)} x2={MARGIN.left + PLOT_W} y2={yToPx(lv.alt)} stroke="#0f172a" strokeWidth={0.7} strokeDasharray="4 3" opacity={0.6} />
              <text x={MARGIN.left - 6} y={yToPx(lv.alt) + 4} textAnchor="end" fontSize={11} fontWeight={800} fill="#0f172a" fontFamily="ui-monospace, monospace">{lv.hpa} hPa</text>
              <text x={MARGIN.left + PLOT_W + 6} y={yToPx(lv.alt) + 4} textAnchor="start" fontSize={9.5} fontWeight={600} fill="#475569" fontFamily="ui-monospace, monospace">{lv.alt}m</text>
            </g>
          ))}

          {/* ═══ ASSE Y DESTRO (quote 500m) ═══ */}
          {Array.from({ length: 12 }, (_, i) => 800 + i * 500).map((alt) => (
            <g key={`ay-${alt}`}>
              <line x1={MARGIN.left + PLOT_W} y1={yToPx(alt)} x2={MARGIN.left + PLOT_W + 5} y2={yToPx(alt)} stroke="#0f172a" strokeWidth={1} />
              <text x={MARGIN.left + PLOT_W + 9} y={yToPx(alt) + 4} fontSize={9} fontWeight={600} fill="#64748b" fontFamily="ui-monospace, monospace">{alt}</text>
            </g>
          ))}

          {/* ═══ ASSE X ORE ═══ */}
          {DISPLAY_HOURS.map((hr) => (
            <g key={`x-${hr}`}>
              <line x1={xToPx(hr)} y1={MARGIN.top + PLOT_H} x2={xToPx(hr)} y2={MARGIN.top + PLOT_H + 5} stroke="#0f172a" strokeWidth={1} />
              <text x={xToPx(hr)} y={MARGIN.top + PLOT_H + 22} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0f172a" fontFamily="ui-monospace, monospace">{String(hr).padStart(2, "0")}:00</text>
            </g>
          ))}

          {/* ═══ HEADER: ascendenze + sole ═══ */}
          <g>
            <text x={MARGIN.left - 34} y={MARGIN.top - 54} fontSize={9.5} fontWeight={600} fill="#475569" textAnchor="end">valore medio ascendenze (m/s)</text>
            {rows.map((r) => (
              <g key={`h-${r.hour}`}>
                <text x={xToPx(r.hour)} y={MARGIN.top - 34} textAnchor="middle" fontSize={16} fontWeight={800} fill={r.thermal >= 1.6 ? "#dc2626" : "#0f172a"} fontFamily="ui-monospace, monospace">{r.thermal.toFixed(1)}</text>
                <text x={xToPx(r.hour)} y={MARGIN.top - 14} textAnchor="middle" fontSize={12} fontWeight={700} fill={r.sunPct >= 90 ? "#94a3b8" : "#b45309"} fontFamily="ui-monospace, monospace">{r.sunPct}</text>
              </g>
            ))}
            <text x={MARGIN.left - 34} y={MARGIN.top - 10} fontSize={9.5} fontWeight={600} fill="#475569" textAnchor="end">sole %</text>
          </g>

          {/* ═══ TITOLO ═══ */}
          <text x={VB_W / 2} y={26} textAnchor="middle" fontSize={22} fontWeight={900} fill="#0f172a" letterSpacing={-0.3}>{siteName.toLowerCase()} · {dateInfo.giorno} {dateInfo.data} {dateInfo.mese}</text>
          <text x={VB_W / 2} y={46} textAnchor="middle" fontSize={10.5} fontWeight={500} fill="#64748b" fontFamily="ui-monospace, monospace">plotted {targetDate} 00:00 UTC · model ground {altitude + 10} m · SRTM {altitude} m</text>

          {/* ═══ FRECCE VENTO (barbette) ═══ */}
          <g clipPath="url(#wc-plotClip)">
            {rows.map((r) => (
              <g key={`wb-${r.hour}`}>
                {r.wind.map((w, i) => (
                  <WindBarb key={`wb-${r.hour}-${i}`} cx={xToPx(r.hour)} cy={yToPx(w.alt)} speedKmh={w.speed} direction={w.dir} />
                ))}
              </g>
            ))}
          </g>

          {/* ═══ CURVA TOP TERMICO (viola) ═══ */}
          <path d={smoothPath(thermalTopPts)} fill="none" stroke="#9333ea" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {thermalTopPts.map((p, i) => <ParagliderIcon key={`pg-${i}`} x={p.x} y={p.y - 4} />)}

          {/* ═══ CURVA BASE CUMULI (tratteggiata) ═══ */}
          <path d={smoothPath(cloudBasePts)} fill="none" stroke="#a855f7" strokeWidth={1.8} strokeDasharray="3 3" opacity={0.7} />

          {/* ═══ PBL tratteggiato ═══ */}
          <path d={smoothPath(pblPts)} fill="none" stroke="#0f172a" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />

          {/* ═══ ZERO TERMICO ═══ */}
          <path d={smoothPath(freezingPts)} fill="none" stroke="#0284c7" strokeWidth={2.2} strokeDasharray="6 4" strokeLinecap="round" />
          {freezingPts.map((p, i) => <SnowflakeIcon key={`flake-${i}`} x={p.x} y={p.y - 15} />)}

          {/* Badge zero termico */}
          {freezingPts[0] && (
            <g transform={`translate(${MARGIN.left + PLOT_W - 95}, ${MARGIN.top + 6})`}>
              <rect x={0} y={0} width={90} height={32} rx={5} fill="#fff" stroke="#0284c7" strokeWidth={1.4} />
              <text x={45} y={14} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0284c7" fontFamily="ui-monospace, monospace">0 °C</text>
              <text x={45} y={27} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0284c7" fontFamily="ui-monospace, monospace">{Math.round(pxToAlt(freezingPts[0].y))} m</text>
            </g>
          )}

          {/* ═══ NUVOLE ═══ */}
          {cloudList.map((c, i) => <CloudIcon key={`cl-${i}`} x={c.x} y={c.y} pct={c.pct} />)}

          {/* ═══ QUOTA DECOLLO ═══ */}
          <line x1={MARGIN.left} y1={yToPx(altitude)} x2={MARGIN.left + PLOT_W} y2={yToPx(altitude)} stroke="#10b981" strokeWidth={1.8} opacity={0.6} />
          <text x={MARGIN.left + 5} y={yToPx(altitude) - 5} fontSize={10} fontWeight={800} fill="#10b981">▲ {altitude}m</text>

          {/* ═══ ETICHETTE QUOTA + RATEO ═══ */}
          {rows.map((r, i) => {
            const x = xToPx(r.hour);
            const badgeY = yToPx(r.thermalTop) + 16;
            return (
              <g key={`badge-${i}`} transform={`translate(${x}, ${badgeY})`}>
                <rect x={-32} y={0} width={64} height={28} rx={5} fill="#fff" stroke="#ea580c" strokeWidth={1.5} />
                <text x={0} y={12} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#0f172a" fontFamily="ui-monospace, monospace">{r.cloudBase} m</text>
                <text x={0} y={24} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#b91c1c" fontFamily="ui-monospace, monospace">↑ {r.thermal.toFixed(1)} m/s</text>
              </g>
            );
          })}

          {/* ═══ SCALA ΔT/100m ═══ */}
          <g transform={`translate(${MARGIN.left}, ${VB_H - 42})`}>
            <text x={-28} y={12} textAnchor="end" fontSize={10} fontWeight={700} fill="#475569">Stabile ←</text>
            <text x={PLOT_W + 28} y={12} textAnchor="start" fontSize={10} fontWeight={700} fill="#475569">→ Instabile</text>
            <text x={PLOT_W / 2} y={-2} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#0f172a">ΔT / 100 m</text>
            {(() => {
              const segs = [
                { color: "#3b5fa0", val: -0.20 },
                { color: "#7fa0c8", val: 0.00 },
                { color: "#dfeec0", val: 0.16 },
                { color: "#fef08a", val: 0.32 },
                { color: "#fbbf24", val: 0.48 },
                { color: "#fb923c", val: 0.65 },
                { color: "#f97316", val: 0.82 },
                { color: "#ea580c", val: 0.98 },
                { color: "#dc2626", val: 1.20 },
              ];
              const segW = PLOT_W / segs.length;
              return segs.map((s, i) => (
                <g key={i}>
                  <rect x={i * segW} y={6} width={segW + 0.5} height={12} fill={s.color} opacity={0.9} />
                  <text x={i * segW + segW / 2} y={32} textAnchor="middle" fontSize={9} fontWeight={700} fill="#334155" fontFamily="ui-monospace, monospace">{s.val.toFixed(2)}</text>
                </g>
              ));
            })()}
          </g>

          {/* ═══ FONTE ═══ */}
          <text x={VB_W / 2} y={VB_H - 6} textAnchor="middle" fontSize={9.5} fontWeight={500} fill="#94a3b8" fontFamily="ui-monospace, monospace">Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Windgram meteo-parapente</text>
        </svg>
      </div>
    </div>
  );
}
