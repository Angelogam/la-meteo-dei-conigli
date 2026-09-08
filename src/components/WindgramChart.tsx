"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

interface WindgramChartProps {
  latitude: number;
  longitude: number;
  altitude: number;
  siteName: string;
  selectedDay?: number;
}

const HPA_LEVELS = [
  { hpa: 500, alt: 5800 },
  { hpa: 600, alt: 4400 },
  { hpa: 700, alt: 3100 },
  { hpa: 850, alt: 1450 },
];

const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

// Viewport leggermente più compatto per mobile
const VB_W = 1000;
const VB_H = 640;
const MARGIN = { top: 88, right: 90, bottom: 78, left: 82 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;
const Y_MIN = 800;
const Y_MAX = 6200;

const yToPx = (alt: number) => MARGIN.top + ((Y_MAX - alt) / (Y_MAX - Y_MIN)) * PLOT_H;
const pxToAlt = (py: number) => Y_MAX - ((py - MARGIN.top) / PLOT_H) * (Y_MAX - Y_MIN);
const xToPx = (hr: number) => MARGIN.left + ((hr - 7.5) / DISPLAY_HOURS.length) * PLOT_W;

// ─── Scala ΔT/100m ───
function dtColor(dt: number): string {
  if (dt <= -0.3) return "#1e3a5f";
  if (dt <= -0.1) return "#3b6fb8";
  if (dt <= 0.0)  return "#6a9fd4";
  if (dt <= 0.2)  return "#9ec5d4";
  if (dt <= 0.4)  return "#c5dfc8";
  if (dt <= 0.55) return "#dce8b0";
  if (dt <= 0.65) return "#ede88a";
  if (dt <= 0.8)  return "#f7d05a";
  if (dt <= 1.0)  return "#f5a623";
  if (dt <= 1.2)  return "#e8552b";
  return "#c02020";
}

function windColor(speed: number): string {
  if (speed <= 5)  return "#0ea5e9";
  if (speed <= 12) return "#10b981";
  if (speed <= 20) return "#eab308";
  if (speed <= 30) return "#f97316";
  if (speed <= 45) return "#ef4444";
  return "#7c3aed";
}

// ─── Interpolazione temperatura ───
function getTempAtAlt(hourly: any, idx: number, alt: number, siteAlt: number): number {
  const pts: { alt: number; temp: number }[] = [];
  const t2 = hourly.temperature_2m?.[idx];
  if (t2 != null) pts.push({ alt: siteAlt, temp: t2 });
  HPA_LEVELS.forEach((lv) => {
    const t = hourly[`temperature_${lv.hpa}hPa`]?.[idx];
    if (t != null && !isNaN(t)) pts.push({ alt: lv.alt, temp: t });
  });
  pts.sort((a, b) => a.alt - b.alt);
  if (pts.length === 0) return 15 - (alt - siteAlt) * 0.0065;
  if (alt <= pts[0].alt) return pts[0].temp;
  if (alt >= pts[pts.length - 1].alt) return pts[pts.length - 1].temp;
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i].alt <= alt && pts[i + 1].alt >= alt) {
      const r = (alt - pts[i].alt) / (pts[i + 1].alt - pts[i].alt);
      return pts[i].temp + r * (pts[i + 1].temp - pts[i].temp);
    }
  }
  return pts[0].temp;
}

// ─── Smooth curve ───
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], cur = pts[i];
    const cpx = (prev.x + cur.x) / 2;
    d += ` Q ${prev.x} ${prev.y} ${cpx} ${(prev.y + cur.y) / 2}`;
    d += ` Q ${cur.x} ${cur.y} ${cur.x} ${cur.y}`;
  }
  return d;
}

// ─── WindBarb ───
function WindBarb({ cx, cy, speedKmh, direction }: { cx: number; cy: number; speedKmh: number; direction: number }) {
  if (speedKmh < 1 || isNaN(speedKmh)) return null;
  const svgAngle = ((direction - 90) * Math.PI) / 180;
  const knots = speedKmh * 0.539957;
  const staffLen = 26;
  const ex = cx + staffLen * Math.cos(svgAngle);
  const ey = cy + staffLen * Math.sin(svgAngle);
  const color = windColor(speedKmh);
  const featherAngle = svgAngle - Math.PI / 2;

  const elements: React.ReactNode[] = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;

  while (rem >= 50 && pos >= 0.25) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    elements.push(
      <polygon key={`p50-${pos.toFixed(2)}`}
        points={`${bx},${by} ${bx + 13 * Math.cos(featherAngle)},${by + 13 * Math.sin(featherAngle)} ${bx + 6.5 * Math.cos(svgAngle)},${by + 6.5 * Math.sin(svgAngle)}`}
        fill={color} stroke={color} strokeWidth={0.8} />
    );
    rem -= 50; pos -= 0.25;
  }
  while (rem >= 10 && pos >= 0.15) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    elements.push(
      <line key={`l10-${pos.toFixed(2)}`} x1={bx} y1={by}
        x2={bx + 12 * Math.cos(featherAngle)} y2={by + 12 * Math.sin(featherAngle)}
        stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    );
    rem -= 10; pos -= 0.18;
  }
  if (rem >= 5 && pos >= 0.15) {
    const bx = cx + pos * (ex - cx), by = cy + pos * (ey - cy);
    elements.push(
      <line key={`l5-${pos.toFixed(2)}`} x1={bx} y1={by}
        x2={bx + 6.5 * Math.cos(featherAngle)} y2={by + 6.5 * Math.sin(featherAngle)}
        stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    );
  }

  return (
    <g>
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {elements}
    </g>
  );
}

// ─── Parapendio icona ───
function ParagliderIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M -12 -5 Q 0 -17 12 -5" fill="none" stroke="#a855f7" strokeWidth={2.8} strokeLinecap="round" />
      <path d="M -8 -4 Q 0 -11 8 -4" fill="none" stroke="#c084fc" strokeWidth={1.3} strokeLinecap="round" />
      <line x1="-7" y1="-4" x2="0" y2="6" stroke="#7e22ce" strokeWidth={1.1} />
      <line x1="7" y1="-4" x2="0" y2="6" stroke="#7e22ce" strokeWidth={1.1} />
      <circle cx="0" cy="6" r="2.8" fill="#fff" stroke="#7e22ce" strokeWidth={1.4} />
    </g>
  );
}

// ─── Nuvola ───
function CloudIcon({ x, y, pct }: { x: number; y: number; pct: number }) {
  if (pct < 25) return null;
  const opacity = Math.min(1, 0.25 + (pct / 100) * 0.75);
  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <path d="M -14 0 Q -14 -7 -7 -7 Q -4 -13 0 -13 Q 6 -13 8 -7 Q 15 -7 15 0 Q 15 5 10 5 L -10 5 Q -14 5 -14 0 Z"
        fill="#fff" stroke="#64748b" strokeWidth={1.4} strokeLinejoin="round" />
      {pct > 30 && (
        <text x={0} y={4} textAnchor="middle" fontSize={8} fontWeight={700} fill="#1e293b" fontFamily="ui-monospace, monospace">
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
      <circle cx="0" cy="0" r="7" fill="#fff" stroke="#0284c7" strokeWidth={1.6} />
      <g stroke="#0284c7" strokeWidth={1.2} strokeLinecap="round" fill="none">
        <line x1="0" y1="-4.5" x2="0" y2="4.5" />
        <line x1="-4.5" y1="0" x2="4.5" y2="0" />
        <line x1="-3" y1="-3" x2="3" y2="3" />
        <line x1="-3" y1="3" x2="3" y2="-3" />
      </g>
    </g>
  );
}

interface HourRow {
  hour: number; idx: number;
  wind: { alt: number; speed: number; dir: number }[];
  thermal: number; sunPct: number; cloudPct: number; cape: number;
  freezing: number; temp2m: number; dew2m: number;
  cloudBase: number; thermalTop: number; stability: number; deltaT: number;
}

export default function WindgramChart({ latitude, longitude, altitude, siteName, selectedDay = 0 }: WindgramChartProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + selectedDay);
    return d.toISOString().split("T")[0];
  }, [selectedDay]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    const fields = [
      "temperature_2m", "dew_point_2m", "cloud_cover", "shortwave_radiation",
      "wind_speed_10m", "wind_direction_10m",
      "wind_speed_850hPa", "wind_direction_850hPa",
      "wind_speed_700hPa", "wind_direction_700hPa",
      "wind_speed_600hPa", "wind_direction_600hPa",
      "wind_speed_500hPa", "wind_direction_500hPa",
      "temperature_850hPa", "temperature_700hPa", "temperature_600hPa", "temperature_500hPa",
      "freezing_level_height", "cape",
    ].join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${fields}&start_date=${targetDate}&end_date=${targetDate}&timezone=Europe/Rome&wind_speed_unit=kmh`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => { if (!cancelled) { setData(j); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
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
      const t850 = h.temperature_850hPa?.[idx], t700 = h.temperature_700hPa?.[idx];
      let deltaT = 0.65;
      if (t850 != null && t700 != null) deltaT = Math.round(((t700 - t850) / (3100 - 1450)) * 100 * 100) / 100;
      else deltaT = cloudPct < 40 ? 0.85 : cloudPct < 70 ? 0.65 : 0.45;
      out.push({
        hour: hr, idx,
        wind: [
          { alt: 1450, speed: h.wind_speed_850hPa[idx] ?? 0, dir: h.wind_direction_850hPa[idx] ?? 180 },
          { alt: 3100, speed: h.wind_speed_700hPa[idx] ?? 0, dir: h.wind_direction_700hPa[idx] ?? 180 },
          { alt: 4400, speed: h.wind_speed_600hPa[idx] ?? 0, dir: h.wind_direction_600hPa[idx] ?? 180 },
          { alt: 5800, speed: h.wind_speed_500hPa[idx] ?? 0, dir: h.wind_direction_500hPa[idx] ?? 180 },
        ],
        thermal, sunPct: Math.min(100, Math.round((rad / 900) * 100)),
        cloudPct, cape, freezing: h.freezing_level_height[idx] ?? 4000,
        temp2m: t, dew2m: td,
        cloudBase: Math.round(cloudBase),
        thermalTop: Math.round(Math.min(6000, thermalTop)),
        stability: Math.min(1, Math.max(0, (rad / 700) * 0.6 + (cape / 200) * 0.4)),
        deltaT,
      });
    }
    return out;
  }, [data, altitude]);

  const thermalTopPts = useMemo(() => rows.map(r => ({ x: xToPx(r.hour), y: yToPx(r.thermalTop) })), [rows]);
  const freezingPts = useMemo(() => rows.map(r => ({ x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX, r.freezing)) })), [rows]);
  const pblPts = useMemo(() => rows.map(r => {
    const hf = 1 - Math.abs(r.hour - 13) / 5;
    const pbl = 1300 + r.thermal * 700 * Math.max(0, hf);
    return { x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX, Math.max(1100, pbl))) };
  }), [rows]);
  const cloudBasePts = useMemo(() => rows.map(r => ({ x: xToPx(r.hour), y: yToPx(r.cloudBase) })), [rows]);
  const cloudList = useMemo(() => rows.filter(r => r.cloudPct > 20).map(r => ({ x: xToPx(r.hour), y: yToPx(r.thermalTop + 400), pct: r.cloudPct })), [rows]);

  const dateInfo = useMemo(() => {
    const d = new Date(targetDate + "T00:00:00");
    const giorni = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const mesi = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return { giorno: giorni[d.getDay()], data: d.getDate(), mese: mesi[d.getMonth()] };
  }, [targetDate]);

  // ─── Instabilità heatmap (12 righe per cella più grande) ───
  const heatmapCells = useMemo(() => {
    if (!data?.hourly?.time || rows.length === 0) return [];
    const h = data.hourly;
    const cells: { x: number; y: number; w: number; h: number; color: string }[] = [];
    const colW = PLOT_W / DISPLAY_HOURS.length;
    const rowH = PLOT_H / 12;
    rows.forEach((row, ci) => {
      for (let ri = 0; ri < 12; ri++) {
        const alt = Y_MAX - (ri + 0.5) * (Y_MAX - Y_MIN) / 12;
        const tBelow = getTempAtAlt(h, row.idx, alt - 200, altitude);
        const tAbove = getTempAtAlt(h, row.idx, alt + 200, altitude);
        const dt = ((tAbove - tBelow) / 400) * 100;
        cells.push({ x: MARGIN.left + ci * colW, y: MARGIN.top + ri * rowH, w: colW + 0.5, h: rowH + 0.5, color: dtColor(dt) });
      }
    });
    return cells;
  }, [data, rows, altitude]);

  const unstableZonePath = useMemo(() => {
    if (rows.length === 0) return "";
    const pts = rows.map(r => ({ x: xToPx(r.hour), y: yToPx(r.thermalTop) }));
    const lastX = xToPx(rows[rows.length - 1].hour), firstX = xToPx(rows[0].hour);
    const baseY = MARGIN.top + PLOT_H;
    return smoothPath(pts) + ` L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [rows]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 flex items-center justify-center min-h-[320px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          <p className="text-slate-500 text-sm">Caricamento windgram…</p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-rose-200 p-6 text-center">
        <p className="text-rose-600 text-sm font-medium">Errore: {error ?? "nessun dato"}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-2 md:p-4">
      {/* SVG responsivo — nessuna min-w fissa */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto block"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <defs>
          <clipPath id="wc-clip">
            <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H} />
          </clipPath>
          <linearGradient id="dtGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            {([
              { v: -0.3, c: "#1e3a5f" },
              { v: -0.1, c: "#3b6fb8" },
              { v: 0.0, c: "#6a9fd4" },
              { v: 0.2, c: "#9ec5d4" },
              { v: 0.4, c: "#c5dfc8" },
              { v: 0.55, c: "#dce8b0" },
              { v: 0.65, c: "#ede88a" },
              { v: 0.8, c: "#f7d05a" },
              { v: 1.0, c: "#f5a623" },
              { v: 1.2, c: "#e8552b" },
            ] as const).map((s, i, arr) => (
              <stop key={i} offset={`${(i / (arr.length - 1)) * 100}%`} stopColor={s.c} />
            ))}
          </linearGradient>
        </defs>

        {/* ─── SFONDO ISTABILITÀ ─── */}
        <g clipPath="url(#wc-clip)">
          {heatmapCells.map((c, i) => (
            <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.color} opacity={0.88} />
          ))}
          {unstableZonePath && <path d={unstableZonePath} fill="#f97316" opacity={0.4} />}
        </g>

        {/* ─── BORDO PLOT ─── */}
        <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H} fill="none" stroke="#0f172a" strokeWidth={1.3} />

        {/* ─── LINEE QUOTE hPa ─── */}
        {HPA_LEVELS.map(lv => (
          <g key={lv.hpa}>
            <line x1={MARGIN.left} y1={yToPx(lv.alt)} x2={MARGIN.left + PLOT_W} y2={yToPx(lv.alt)} stroke="#0f172a" strokeWidth={0.6} strokeDasharray="4 3" opacity={0.5} />
            <text x={MARGIN.left - 6} y={yToPx(lv.alt) + 4} textAnchor="end" fontSize={11} fontWeight={800} fill="#0f172a" fontFamily="ui-monospace, monospace">{lv.hpa}h</text>
            <text x={MARGIN.left + PLOT_W + 6} y={yToPx(lv.alt) + 4} textAnchor="start" fontSize={10} fontWeight={700} fill="#475569" fontFamily="ui-monospace, monospace">{lv.alt}m</text>
          </g>
        ))}

        {/* ─── ASSE Y DESTRO (step 500m) ─── */}
        {Array.from({ length: 12 }, (_, i) => 1000 + i * 500).map(alt => (
          <g key={alt}>
            <line x1={MARGIN.left + PLOT_W} y1={yToPx(alt)} x2={MARGIN.left + PLOT_W + 8} y2={yToPx(alt)} stroke="#0f172a" strokeWidth={1.5} />
            <text x={MARGIN.left + PLOT_W + 12} y={yToPx(alt) + 6} fontSize={12} fontWeight={800} fill="#1e293b" fontFamily="ui-monospace, monospace">{alt}m</text>
          </g>
        ))}

        {/* ─── ASSE X ORE ─── */}
        {DISPLAY_HOURS.map(hr => (
          <g key={hr}>
            <line x1={xToPx(hr)} y1={MARGIN.top + PLOT_H} x2={xToPx(hr)} y2={MARGIN.top + PLOT_H + 5} stroke="#0f172a" strokeWidth={1} />
            <text x={xToPx(hr)} y={MARGIN.top + PLOT_H + 20} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0f172a" fontFamily="ui-monospace, monospace">{String(hr).padStart(2, "0")}:00</text>
          </g>
        ))}

        {/* ─── HEADER ─── */}
        <text x={MARGIN.left - 32} y={MARGIN.top - 48} fontSize={9.5} fontWeight={600} fill="#475569" textAnchor="end">m/s ↑</text>
        {rows.map(r => (
          <g key={`h-${r.hour}`}>
            <text x={xToPx(r.hour)} y={MARGIN.top - 30} textAnchor="middle" fontSize={15} fontWeight={800} fill={r.thermal >= 1.6 ? "#dc2626" : "#0f172a"} fontFamily="ui-monospace, monospace">{r.thermal.toFixed(1)}</text>
            <text x={xToPx(r.hour)} y={MARGIN.top - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#b45309" fontFamily="ui-monospace, monospace">{r.sunPct}%</text>
          </g>
        ))}
        <text x={MARGIN.left - 32} y={MARGIN.top - 8} fontSize={9.5} fontWeight={600} fill="#475569" textAnchor="end">sole</text>

        {/* ─── TITOLO ─── */}
        <text x={VB_W / 2} y={24} textAnchor="middle" fontSize={20} fontWeight={900} fill="#0f172a" letterSpacing={-0.3}>{siteName.toLowerCase()} · {dateInfo.giorno} {dateInfo.data} {dateInfo.mese}</text>
        <text x={VB_W / 2} y={42} textAnchor="middle" fontSize={10} fontWeight={500} fill="#64748b" fontFamily="ui-monospace, monospace">{targetDate} · {altitude}m SRTM</text>

        {/* ─── FRECCE VENTO (barbette) ─── */}
        <g clipPath="url(#wc-clip)">
          {rows.map(r => (
            <g key={`wb-${r.hour}`}>
              {r.wind.map((w, i) => (
                <WindBarb key={`${r.hour}-${i}`} cx={xToPx(r.hour)} cy={yToPx(w.alt)} speedKmh={w.speed} direction={w.dir} />
              ))}
            </g>
          ))}
        </g>

        {/* ─── CURVE ─── */}
        {/* Thermal top */}
        <path d={smoothPath(thermalTopPts)} fill="none" stroke="#9333ea" strokeWidth={3} strokeLinecap="round" />
        {thermalTopPts.map((p, i) => <ParagliderIcon key={`pg-${i}`} x={p.x} y={p.y - 5} />)}

        {/* Cloud base tratteggiata */}
        <path d={smoothPath(cloudBasePts)} fill="none" stroke="#a855f7" strokeWidth={1.8} strokeDasharray="3 3" opacity={0.6} />

        {/* PBL tratteggiato */}
        <path d={smoothPath(pblPts)} fill="none" stroke="#0f172a" strokeWidth={2} strokeDasharray="5 4" />

        {/* Zero termico */}
        <path d={smoothPath(freezingPts)} fill="none" stroke="#0284c7" strokeWidth={2.2} strokeDasharray="6 4" />
        {freezingPts.map((p, i) => <SnowflakeIcon key={`flake-${i}`} x={p.x} y={p.y - 14} />)}

        {/* Badge zero termico */}
        {freezingPts[0] && (
          <g transform={`translate(${MARGIN.left + PLOT_W - 95}, ${MARGIN.top + 6})`}>
            <rect x={0} y={0} width={90} height={30} rx={5} fill="#fff" stroke="#0284c7" strokeWidth={1.4} />
            <text x={45} y={13} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0284c7" fontFamily="ui-monospace, monospace">0 °C</text>
            <text x={45} y={26} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0284c7" fontFamily="ui-monospace, monospace">{Math.round(pxToAlt(freezingPts[0].y))}m</text>
          </g>
        )}

        {/* ─── NUVOLE ─── */}
        {cloudList.map((c, i) => <CloudIcon key={`cl-${i}`} x={c.x} y={c.y} pct={c.pct} />)}

        {/* ─── QUOTA DECOLLO ─── */}
        <line x1={MARGIN.left} y1={yToPx(altitude)} x2={MARGIN.left + PLOT_W} y2={yToPx(altitude)} stroke="#10b981" strokeWidth={1.8} opacity={0.6} />
        <text x={MARGIN.left + 5} y={yToPx(altitude) - 5} fontSize={10} fontWeight={800} fill="#10b981">▲ {altitude}m</text>

        {/* ─── ETICHETTE QUOTA + RATEO ─── */}
        {rows.map((r, i) => {
          const x = xToPx(r.hour);
          const badgeY = yToPx(r.thermalTop) + 15;
          return (
            <g key={`badge-${i}`} transform={`translate(${x}, ${badgeY})`}>
              <rect x={-32} y={0} width={64} height={26} rx={4} fill="#fff" stroke="#ea580c" strokeWidth={1.4} />
              <text x={0} y={11} textAnchor="middle" fontSize={10} fontWeight={800} fill="#0f172a" fontFamily="ui-monospace, monospace">{r.cloudBase}m</text>
              <text x={0} y={23} textAnchor="middle" fontSize={10} fontWeight={800} fill="#b91c1c" fontFamily="ui-monospace, monospace">↑{r.thermal.toFixed(1)}</text>
            </g>
          );
        })}

        {/* ─── SCALA ΔT/100m ─── */}
        <g transform={`translate(${MARGIN.left}, ${VB_H - 38})`}>
          <text x={-26} y={12} textAnchor="end" fontSize={10} fontWeight={700} fill="#475569">Stabile</text>
          <text x={PLOT_W + 26} y={12} textAnchor="start" fontSize={10} fontWeight={700} fill="#475569">Instabile</text>
          <text x={PLOT_W / 2} y={-2} textAnchor="middle" fontSize={10} fontWeight={800} fill="#0f172a">ΔT / 100 m</text>
          <rect x={0} y={6} width={PLOT_W} height={12} fill="url(#dtGrad)" opacity={0.92} />
          {([-0.3, -0.1, 0.0, 0.2, 0.4, 0.65, 0.8, 1.0, 1.2] as const).map((v, i) => (
            <text key={i} x={(i / 8) * PLOT_W} y={26} textAnchor="middle" fontSize={9} fontWeight={700} fill="#334155" fontFamily="ui-monospace, monospace">{v.toFixed(2)}</text>
          ))}
        </g>

        {/* ─── FONTE ─── */}
        <text x={VB_W / 2} y={VB_H - 6} textAnchor="middle" fontSize={9} fontWeight={500} fill="#94a3b8" fontFamily="ui-monospace, monospace">Fonte: AROME 0-48h + ICON-EU 0-120h · Open-Meteo</text>
      </svg>
    </div>
  );
}
