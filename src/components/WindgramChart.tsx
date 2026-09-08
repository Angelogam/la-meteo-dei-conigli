"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Wind } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// WindgramChart — nuovo windgram meteo-parapente
// Background instabilità colorata + frecce vento + curve termiche
// ────────────────────────────────────────────────────────────────────────────

interface WindgramChartProps {
  latitude: number;
  longitude: number;
  altitude: number;
  siteName: string;
  selectedDay?: number;
}

// Livelli isobarici standard
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

// Viewport SVG
const VB_W = 1100;
const VB_H = 680;
const MARGIN = { top: 90, right: 90, bottom: 90, left: 88 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;

const Y_MIN_ALT = 1000;
const Y_MAX_ALT = 6200;
const yToPx = (alt: number) =>
  MARGIN.top + ((Y_MAX_ALT - alt) / (Y_MAX_ALT - Y_MIN_ALT)) * PLOT_H;
const pxToAlt = (py: number) =>
  Y_MAX_ALT - ((py - MARGIN.top) / PLOT_H) * (Y_MAX_ALT - Y_MIN_ALT);

const xToPx = (hr: number) => MARGIN.left + ((hr - 7.5) / DISPLAY_HOURS.length) * PLOT_W;

// ─── Colori ΔT/100m (instabilità) ───
function instabilityColor(deltaT: number): string {
  if (deltaT <= -0.5) return "#3b5fa0";
  if (deltaT <= -0.2) return "#5b78b8";
  if (deltaT <= 0.0) return "#7fa0c8";
  if (deltaT <= 0.2) return "#9bbed6";
  if (deltaT <= 0.4) return "#bedfd6";
  if (deltaT <= 0.55) return "#dfeec0";
  if (deltaT <= 0.65) return "#fef08a";
  if (deltaT <= 0.75) return "#fde047";
  if (deltaT <= 0.85) return "#fbbf24";
  if (deltaT <= 0.95) return "#fb923c";
  if (deltaT <= 1.05) return "#f97316";
  if (deltaT <= 1.20) return "#ea580c";
  return "#dc2626";
}

// ─── Colore freccia vento (km/h) ───
function windArrowColor(speed: number): string {
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

// ─── Freccia vento stile meteo-parapente ───
function WindArrow({
  cx,
  cy,
  speed,
  direction,
}: {
  cx: number;
  cy: number;
  speed: number;
  direction: number;
}) {
  // direction = direzione DEL MOTO (Open-Meteo: provenienza, convertita già qui)
  const targetDeg = direction;
  const rad = (targetDeg * Math.PI) / 180;
  const len = 15;
  const dx = Math.sin(rad) * len;
  const dy = -Math.cos(rad) * len;

  const tx = cx - dx;
  const ty = cy - dy;
  const px = cx + dx;
  const py = cy + dy;

  const color = windArrowColor(speed);

  const wingLen = 5.5;
  const wingAngle = 0.55;
  const perpX = Math.cos(rad) * wingLen;
  const perpY = Math.sin(rad) * wingLen;

  const a1x = px - dx * 0.45 + perpX * Math.sin(wingAngle);
  const a1y = py - dy * 0.45 - perpY * Math.sin(wingAngle);
  const a2x = px - dx * 0.45 - perpX * Math.sin(wingAngle);
  const a2y = py - dy * 0.45 + perpY * Math.sin(wingAngle);

  return (
    <g>
      <line
        x1={tx}
        y1={ty}
        x2={px}
        y2={py}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <polygon
        points={`${px},${py} ${a1x},${a1y} ${a2x},${a2y}`}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
        strokeLinejoin="round"
      />
      {/* Codetta */}
      <line
        x1={tx}
        y1={ty}
        x2={tx - Math.sin(rad) * 3}
        y2={ty + Math.cos(rad) * 3}
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </g>
  );
}

// ─── Parapendio stilizzato ───
function ParagliderIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path
        d="M -10 -4 Q 0 -12 10 -4"
        fill="none"
        stroke="#a855f7"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M -8 -3 Q 0 -8 8 -3"
        fill="none"
        stroke="#c084fc"
        strokeWidth={1}
        strokeLinecap="round"
      />
      <line x1="-7" y1="-3" x2="0" y2="5" stroke="#7e22ce" strokeWidth={0.8} />
      <line x1="7" y1="-3" x2="0" y2="5" stroke="#7e22ce" strokeWidth={0.8} />
      <circle cx="0" cy="5" r="2" fill="#fff" stroke="#7e22ce" strokeWidth={1} />
    </g>
  );
}

// ─── Nuvola stilizzata ───
function CloudIcon({ x, y, pct }: { x: number; y: number; pct: number }) {
  const opacity = Math.min(1, 0.3 + (pct / 100) * 0.7);
  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <path
        d="M -12 0 Q -12 -6 -6 -6 Q -4 -10 0 -10 Q 5 -10 7 -6 Q 13 -6 13 0 Q 13 4 9 4 L -9 4 Q -12 4 -12 0 Z"
        fill="#fff"
        stroke="#64748b"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {pct > 30 && (
        <text
          x={0}
          y={3}
          textAnchor="middle"
          fontSize={7}
          fontWeight={700}
          fill="#1e293b"
          fontFamily="ui-monospace, monospace"
        >
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
      <circle cx="0" cy="0" r="6" fill="#fff" stroke="#0284c7" strokeWidth={1.3} />
      <g stroke="#0284c7" strokeWidth={1} strokeLinecap="round" fill="none">
        <line x1="0" y1="-3.5" x2="0" y2="3.5" />
        <line x1="-3.5" y1="0" x2="3.5" y2="0" />
        <line x1="-2.5" y1="-2.5" x2="2.5" y2="2.5" />
        <line x1="-2.5" y1="2.5" x2="2.5" y2="-2.5" />
      </g>
    </g>
  );
}

// ─── Smooth curve ───
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

// ─── Interpolazione temperatura a quota arbitraria ───
function getTempAtAlt(
  hourly: any,
  idx: number,
  alt: number,
  siteAlt: number
): number {
  const pts: { alt: number; temp: number }[] = [];
  HPA_LEVELS.forEach((lv) => {
    const key = `temperature_${lv.hpa}hPa`;
    const t = hourly[key]?.[idx];
    if (t != null && !isNaN(t)) pts.push({ alt: lv.alt, temp: t });
  });
  const t2 = hourly.temperature_2m?.[idx];
  if (t2 != null) pts.push({ alt: siteAlt, temp: t2 });
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
  deltaT: number;
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

  // Costruisci righe orarie
  const rows = useMemo<HourRow[]>(() => {
    if (!data?.hourly?.time) return [];
    const h = data.hourly;
    const out: HourRow[] = [];
    for (const hr of DISPLAY_HOURS) {
      const idx = h.time.findIndex((t: string) => {
        const hh = parseInt(t.split("T")[1].split(":")[0], 10);
        return hh === hr;
      });
      if (idx < 0) continue;

      const t = h.temperature_2m[idx] ?? 18;
      const td = h.dew_point_2m[idx] ?? (t - 8);
      const cloudPct = h.cloud_cover[idx] ?? 0;
      const cape = h.cape[idx] ?? 0;
      const rad = h.shortwave_radiation[idx] ?? 0;

      const cloudBase = altitude + 125 * Math.max(1, t - td);
      const thermalTop = cloudBase + Math.min(1500, cape * 0.8);
      const thermal = Math.min(3.5, Math.max(0, Math.sqrt(Math.max(0, cape)) * 0.12 + (thermalTop - cloudBase) / 5000));

      // deltaT/100m approssimato
      const t850 = h.temperature_850hPa?.[idx];
      const t700 = h.temperature_700hPa?.[idx];
      let deltaT = 0.65;
      if (t850 != null && t700 != null) {
        deltaT = Math.round(((t700 - t850) / (3100 - 1450)) * 100 * 100) / 100;
      } else {
        deltaT = cloudPct < 40 ? 0.85 : cloudPct < 70 ? 0.65 : 0.45;
      }

      out.push({
        hour: hr,
        idx,
        wind: [
          { alt: altitude, speed: h.wind_speed_10m[idx] ?? 0, dir: (h.wind_direction_10m[idx] ?? 180) + 180 },
          { alt: altitude + 80, speed: h.wind_speed_80m[idx] ?? 0, dir: (h.wind_direction_80m[idx] ?? 180) + 180 },
          { alt: altitude + 120, speed: h.wind_speed_120m[idx] ?? 0, dir: (h.wind_direction_120m[idx] ?? 180) + 180 },
          { alt: 1450, speed: h.wind_speed_850hPa[idx] ?? 0, dir: (h.wind_direction_850hPa[idx] ?? 180) + 180 },
          { alt: 3100, speed: h.wind_speed_700hPa[idx] ?? 0, dir: (h.wind_direction_700hPa[idx] ?? 180) + 180 },
          { alt: 4400, speed: h.wind_speed_600hPa[idx] ?? 0, dir: (h.wind_direction_600hPa[idx] ?? 180) + 180 },
          { alt: 5800, speed: h.wind_speed_500hPa[idx] ?? 0, dir: (h.wind_direction_500hPa[idx] ?? 180) + 180 },
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
        deltaT,
      });
    }
    return out;
  }, [data, altitude]);

  // Curve SVG
  const thermalTopPts = useMemo(
    () => rows.map((r) => ({ x: xToPx(r.hour), y: yToPx(r.thermalTop) })),
    [rows]
  );
  const freezingPts = useMemo(
    () => rows.map((r) => ({ x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX_ALT, r.freezing)) })),
    [rows]
  );
  const pblPts = useMemo(
    () =>
      rows.map((r) => {
        const hf = 1 - Math.abs(r.hour - 13) / 5;
        const pbl = 1400 + r.thermal * 600 * Math.max(0, hf);
        return { x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX_ALT, Math.max(1200, pbl))) };
      }),
    [rows]
  );

  // Nubi
  const cloudList = useMemo(
    () =>
      rows
        .filter((r) => r.cloudPct > 25)
        .map((r) => ({
          x: xToPx(r.hour),
          y: yToPx(r.thermalTop + 300),
          pct: r.cloudPct,
        })),
    [rows]
  );

  // Date
  const dateInfo = useMemo(() => {
    const d = new Date(targetDate + "T00:00:00");
    const giorni = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const mesi = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return { giorno: giorni[d.getDay()], data: d.getDate(), mese: mesi[d.getMonth()] };
  }, [targetDate]);

  // Instabilità heatmap: rettangoli per ogni cella (ora × quota)
  const instabilityCells = useMemo(() => {
    if (!data?.hourly?.time || rows.length === 0) return [];
    const h = data.hourly;
    const cells: { x: number; y: number; w: number; h: number; color: string; opacity: number }[] = [];
    const colW = PLOT_W / DISPLAY_HOURS.length;
    const rowH = PLOT_H / 20;

    rows.forEach((row, ci) => {
      for (let ri = 0; ri < 20; ri++) {
        const alt = Y_MAX_ALT - (ri + 0.5) * (Y_MAX_ALT - Y_MIN_ALT) / 20;
        const tBelow = getTempAtAlt(h, row.idx, alt - 150, altitude);
        const tAbove = getTempAtAlt(h, row.idx, alt + 150, altitude);
        const dt = ((tAbove - tBelow) / 300) * 100;
        const color = instabilityColor(dt);
        cells.push({
          x: MARGIN.left + ci * colW,
          y: MARGIN.top + ri * rowH,
          w: colW + 0.5,
          h: rowH + 0.5,
          color,
          opacity: 0.82,
        });
      }
    });
    return cells;
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
          className="w-full min-w-[900px] h-auto block"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          <defs>
            <clipPath id="wc-plotClip">
              <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H} />
            </clipPath>
          </defs>

          {/* ─── SFONDO INSTABILITÀ ─── */}
          <g clipPath="url(#wc-plotClip)">
            {instabilityCells.map((c, i) => (
              <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.color} opacity={c.opacity} />
            ))}
          </g>

          {/* ─── BORDO PLOT ─── */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="none"
            stroke="#0f172a"
            strokeWidth={1.3}
          />

          {/* ─── LINEE QUOTE hPa ─── */}
          {HPA_LEVELS.map((lv) => (
            <g key={lv.hpa}>
              <line
                x1={MARGIN.left}
                y1={yToPx(lv.alt)}
                x2={MARGIN.left + PLOT_W}
                y2={yToPx(lv.alt)}
                stroke="#0f172a"
                strokeWidth={0.6}
                strokeDasharray="4 3"
                opacity={0.55}
              />
              <text
                x={MARGIN.left - 6}
                y={yToPx(lv.alt) + 4}
                textAnchor="end"
                fontSize={10.5}
                fontWeight={800}
                fill="#0f172a"
                fontFamily="ui-monospace, monospace"
              >
                {lv.hpa} hPa
              </text>
              <text
                x={MARGIN.left + PLOT_W + 6}
                y={yToPx(lv.alt) + 4}
                textAnchor="start"
                fontSize={9.5}
                fontWeight={600}
                fill="#475569"
                fontFamily="ui-monospace, monospace"
              >
                {lv.alt}m
              </text>
            </g>
          ))}

          {/* ─── ASSE Y DESTRO (quote 500m) ─── */}
          {Array.from({ length: 11 }, (_, i) => 1000 + i * 500).map((alt) => (
            <g key={`ay-${alt}`}>
              <line
                x1={MARGIN.left + PLOT_W}
                y1={yToPx(alt)}
                x2={MARGIN.left + PLOT_W + 4}
                y2={yToPx(alt)}
                stroke="#0f172a"
                strokeWidth={0.8}
              />
              <text
                x={MARGIN.left + PLOT_W + 8}
                y={yToPx(alt) + 4}
                fontSize={9}
                fontWeight={600}
                fill="#64748b"
                fontFamily="ui-monospace, monospace"
              >
                {alt}
              </text>
            </g>
          ))}

          {/* ─── ASSE X ORE ─── */}
          {DISPLAY_HOURS.map((hr) => (
            <g key={`x-${hr}`}>
              <line
                x1={xToPx(hr)}
                y1={MARGIN.top + PLOT_H}
                x2={xToPx(hr)}
                y2={MARGIN.top + PLOT_H + 5}
                stroke="#0f172a"
                strokeWidth={1}
              />
              <text
                x={xToPx(hr)}
                y={MARGIN.top + PLOT_H + 20}
                textAnchor="middle"
                fontSize={11}
                fontWeight={800}
                fill="#0f172a"
                fontFamily="ui-monospace, monospace"
              >
                {String(hr).padStart(2, "0")}:00
              </text>
            </g>
          ))}

          {/* ─── HEADER: ascendenze + sole ─── */}
          <g>
            <text x={MARGIN.left - 34} y={MARGIN.top - 54} fontSize={9.5} fontWeight={600} fill="#475569" textAnchor="end">
              ascendenze (m/s)
            </text>
            {rows.map((r) => (
              <g key={`h-${r.hour}`}>
                <text
                  x={xToPx(r.hour)}
                  y={MARGIN.top - 34}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight={800}
                  fill={r.thermal >= 1.6 ? "#dc2626" : "#0f172a"}
                  fontFamily="ui-monospace, monospace"
                >
                  {r.thermal.toFixed(1)}
                </text>
                <text
                  x={xToPx(r.hour)}
                  y={MARGIN.top - 14}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={r.sunPct >= 90 ? "#94a3b8" : "#b45309"}
                  fontFamily="ui-monospace, monospace"
                >
                  {r.sunPct}
                </text>
              </g>
            ))}
            <text x={MARGIN.left - 34} y={MARGIN.top - 10} fontSize={9.5} fontWeight={600} fill="#475569" textAnchor="end">
              sole %
            </text>
          </g>

          {/* ─── TITOLO ─── */}
          <text x={VB_W / 2} y={26} textAnchor="middle" fontSize={22} fontWeight={900} fill="#0f172a" letterSpacing={-0.3}>
            {siteName.toLowerCase()} · {dateInfo.giorno} {dateInfo.data} {dateInfo.mese}
          </text>
          <text
            x={VB_W / 2}
            y={46}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight={500}
            fill="#64748b"
            fontFamily="ui-monospace, monospace"
          >
            plotted {targetDate} 00:00 UTC · model ground {altitude + 10} m · SRTM {altitude} m
          </text>

          {/* ─── FRECCE VENTO ─── */}
          <g clipPath="url(#wc-plotClip)">
            {rows.map((r) => (
              <g key={`wb-${r.hour}`}>
                {r.wind.map((w, i) => (
                  <WindArrow
                    key={`wb-${r.hour}-${i}`}
                    cx={xToPx(r.hour)}
                    cy={yToPx(w.alt)}
                    speed={w.speed}
                    direction={w.dir}
                  />
                ))}
              </g>
            ))}
          </g>

          {/* ─── CURVA TOP TERMICO (viola) ─── */}
          <path
            d={smoothPath(thermalTopPts)}
            fill="none"
            stroke="#a855f7"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {thermalTopPts.map((p, i) => (
            <ParagliderIcon key={`pg-${i}`} x={p.x} y={p.y - 4} />
          ))}

          {/* ─── PBL tratteggiato ─── */}
          <path
            d={smoothPath(pblPts)}
            fill="none"
            stroke="#0f172a"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />

          {/* ─── ZERO TERMICO ─── */}
          <path
            d={smoothPath(freezingPts)}
            fill="none"
            stroke="#0284c7"
            strokeWidth={2.2}
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
          {freezingPts.map((p, i) => (
            <SnowflakeIcon key={`flake-${i}`} x={p.x} y={p.y - 14} />
          ))}

          {/* Badge zero termico */}
          {freezingPts[0] && (
            <g transform={`translate(${MARGIN.left + PLOT_W - 90}, ${MARGIN.top + 6})`}>
              <rect x={0} y={0} width={86} height={32} rx={5} fill="#fff" stroke="#0284c7" strokeWidth={1.4} />
              <text x={43} y={14} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0284c7" fontFamily="ui-monospace, monospace">
                0 °C
              </text>
              <text x={43} y={27} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0284c7" fontFamily="ui-monospace, monospace">
                {Math.round(pxToAlt(freezingPts[0].y))} m
              </text>
            </g>
          )}

          {/* ─── NUVOLE ─── */}
          {cloudList.map((c, i) => (
            <CloudIcon key={`cl-${i}`} x={c.x} y={c.y} pct={c.pct} />
          ))}

          {/* ─── QUOTA DECOLLO ─── */}
          <line
            x1={MARGIN.left}
            y1={yToPx(altitude)}
            x2={MARGIN.left + PLOT_W}
            y2={yToPx(altitude)}
            stroke="#10b981"
            strokeWidth={1.5}
            opacity={0.6}
          />
          <text x={MARGIN.left + 4} y={yToPx(altitude) - 5} fontSize={10} fontWeight={800} fill="#10b981">
            ▲ {altitude}m
          </text>

          {/* ─── SCALA ΔT/100m ─── */}
          <g transform={`translate(${MARGIN.left}, ${VB_H - 40})`}>
            <text x={-28} y={12} textAnchor="end" fontSize={10} fontWeight={700} fill="#475569">
              Stabile ←
            </text>
            <text x={PLOT_W + 28} y={12} textAnchor="start" fontSize={10} fontWeight={700} fill="#475569">
              → Instabile
            </text>
            <text x={PLOT_W / 2} y={-2} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#0f172a">
              ΔT / 100 m
            </text>
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
                  <text
                    x={i * segW + segW / 2}
                    y={32}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="#334155"
                    fontFamily="ui-monospace, monospace"
                  >
                    {s.val.toFixed(2)}
                  </text>
                </g>
              ));
            })()}
          </g>

          {/* ─── FONTE ─── */}
          <text
            x={VB_W / 2}
            y={VB_H - 6}
            textAnchor="middle"
            fontSize={9.5}
            fontWeight={500}
            fill="#94a3b8"
            fontFamily="ui-monospace, monospace"
          >
            Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Windgram meteo-parapente
          </text>
        </svg>
      </div>
    </div>
  );
}
