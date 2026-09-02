"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// RasoftWindgram — replica fedele del windgram Rasoft/Meteo-Parapente
// per il sito "Montoso Alto". Pixel-perfect.
// ────────────────────────────────────────────────────────────────────────────

interface RasoftWindgramProps {
  latitude: number;
  longitude: number;
  altitude: number;
  siteName: string;
  selectedDay?: number;
}

// Pressione (hPa) → quota (m) standard
const HPA_LEVELS: { hpa: number; alt: number }[] = [
  { hpa: 850, alt: 1450 },
  { hpa: 800, alt: 1950 },
  { hpa: 750, alt: 2500 },
  { hpa: 700, alt: 3100 },
  { hpa: 650, alt: 3750 },
  { hpa: 600, alt: 4400 },
  { hpa: 550, alt: 5000 },
  { hpa: 500, alt: 5800 },
];

// Costanti viewport
const VB_W = 1000;
const VB_H = 660;
const MARGIN = { top: 90, right: 85, bottom: 95, left: 85 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;

// Quota (m) → Y in pixel
const Y_MIN = 1000;
const Y_MAX = 6500;
const yToPx = (m: number) =>
  MARGIN.top + ((Y_MAX - m) / (Y_MAX - Y_MIN)) * PLOT_H;
const pxToY = (p: number) =>
  Y_MAX - ((p - MARGIN.top) / PLOT_H) * (Y_MAX - Y_MIN);

// Orari: 08..18 (11 ore diurne)
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);
const xToPx = (h: number) => MARGIN.left + ((h - 7.5) / 11) * PLOT_W;

// Tipi per i dati Open-Meteo
interface OMData {
  time: string[];
  temperature_2m: number[];
  dew_point_2m: number[];
  cloud_cover: number[];
  cloud_cover_low: number[];
  cloud_cover_mid: number[];
  cloud_cover_high: number[];
  shortwave_radiation: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  wind_speed_80m: number[];
  wind_direction_80m: number[];
  wind_speed_120m: number[];
  wind_direction_120m: number[];
  wind_speed_850hPa: number[];
  wind_direction_850hPa: number[];
  wind_speed_700hPa: number[];
  wind_direction_700hPa: number[];
  wind_speed_600hPa: number[];
  wind_direction_600hPa: number[];
  wind_speed_500hPa: number[];
  wind_direction_500hPa: number[];
  freezing_level_height: number[];
  cape: number[];
  relative_humidity_2m: number[];
}

interface HourRow {
  hour: number;
  idx: number;
  time: string;
  wind: { alt: number; speed: number; dir: number }[];
  thermal: number;
  sunPct: number;
  cloudPct: number;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
  cape: number;
  freezing: number;
  temp2m: number;
  dew2m: number;
  cloudBase: number;
  thermalTop: number;
  pbl: number;
  stability: number; // 0..1 - per posizionare il colore di stabilità
}

// Calcoli meteo-derivati
const computeCloudBase = (t: number, td: number, alt: number) => {
  return alt + 125 * (t - td);
};

const computeThermalStrength = (
  cape: number,
  cloudBase: number,
  thermalTop: number,
  cloudPct: number,
) => {
  const depth = Math.max(0, thermalTop - cloudBase);
  const capeFactor = Math.min(2.5, Math.sqrt(Math.max(0, cape)) * 0.18);
  const cloudFactor = cloudPct > 80 ? 0.5 : cloudPct > 50 ? 0.75 : 1;
  return Math.max(0, Math.min(4, capeFactor * cloudFactor + depth / 4000));
};

const computeThermalTop = (cape: number, cloudBase: number) => {
  if (cape <= 0) return cloudBase + 800;
  return cloudBase + 200 + Math.min(2800, cape * 1.6);
};

// ─── Colore del vento in base alla velocità (km/h) ───
const windColor = (kmh: number) => {
  if (kmh < 18) return "#0284c7"; // azzurro sotto
  if (kmh < 30) return "#dc2626"; // rosso sopra
  return "#9333ea"; // viola > 30
};

// ─── Wind barb stilizzata "Rasoft" (semplice, poche piume) ───
function WindBarb({
  cx,
  cy,
  speed,
  direction,
  high = false,
}: {
  cx: number;
  cy: number;
  speed: number;
  direction: number;
  high?: boolean; // true = in quota (linea rossa), false = sotto (linea blu)
}) {
  // direction = provenienza in gradi (0=N, 90=E, 180=S, 270=W)
  // Convenzione WMO: la coda è nel punto di misura, la punta indica
  // la DIREZIONE DI PROVENIENZA del vento (da dove soffia).
  // Quindi per OVEST (270°): la punta va a OVEST (a sinistra).
  // Per SUD-EST (135°): la punta va a SUD-EST (in basso a destra).
  const rad = (direction * Math.PI) / 180;
  const len = 18;
  const x2 = cx + Math.sin(rad) * len;
  const y2 = cy - Math.cos(rad) * len;
  const color = high ? "#dc2626" : "#1d4ed8";

  const knots = speed / 1.852;
  // Piume: calcoliamo quante ne servono (max 2-3 per semplicità stilizzata)
  const totalHalfFlags = Math.round(knots / 5);
  const flags: React.ReactNode[] = [];
  let tPos = 0.55; // posizione normalizzata lungo il gambo
  const ux = (x2 - cx) / len;
  const uy = (y2 - cy) / len;
  // Piume sul lato SINISTRO rispetto alla direzione di provenienza
  // (perpendicolare ruotata di 90° in senso antiorario)
  const px = -uy;
  const py = ux;
  for (let i = 0; i < Math.min(3, totalHalfFlags); i++) {
    const t = tPos - i * 0.18;
    const bx = cx + ux * (len * t);
    const by = cy + uy * (len * t);
    const ex = bx + px * 5.5;
    const ey = by + py * 5.5;
    flags.push(
      <line
        key={i}
        x1={bx}
        y1={by}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />,
    );
  }

  return (
    <g>
      <line
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      {flags}
    </g>
  );
}

// Curva Bézier morbida
function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const cpx = (prev.x + cur.x) / 2;
    d += ` Q ${prev.x} ${prev.y} ${cpx} ${(prev.y + cur.y) / 2}`;
    d += ` Q ${cur.x} ${cur.y} ${cur.x} ${cur.y}`;
  }
  return d;
}

// Icona parapendio stilizzata Rasoft (semplice)
function ParagliderIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Arco viola */}
      <path
        d="M -8 0 Q 0 -6 8 0"
        fill="none"
        stroke="#a855f7"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* Funi */}
      <line x1="-6" y1="-0.5" x2="0" y2="6" stroke="#7e22ce" strokeWidth={0.6} />
      <line x1="6" y1="-0.5" x2="0" y2="6" stroke="#7e22ce" strokeWidth={0.6} />
      <line x1="0" y1="-2" x2="0" y2="6" stroke="#7e22ce" strokeWidth={0.6} />
      {/* Pallino bianco */}
      <circle cx="0" cy="6" r="1.6" fill="#ffffff" stroke="#7e22ce" strokeWidth={0.7} />
    </g>
  );
}

// Nuvola stilizzata piccola
function CloudIcon({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path
        d="M -10 0 Q -10 -5 -5 -5 Q -3 -8 0 -8 Q 4 -8 5 -5 Q 10 -5 10 0 Q 10 3 7 3 L -7 3 Q -10 3 -10 0 Z"
        fill="#ffffff"
        stroke="#475569"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <text
        x="0"
        y="1.5"
        textAnchor="middle"
        fontSize={8}
        fontWeight={700}
        fill="#1e293b"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {label}
      </text>
    </g>
  );
}

// Fiocco di neve stilizzato
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="6" fill="#ffffff" stroke="#0284c7" strokeWidth={1.2} />
      <g stroke="#0284c7" strokeWidth={1} strokeLinecap="round" fill="none">
        <line x1="0" y1="-3.5" x2="0" y2="3.5" />
        <line x1="-3.5" y1="0" x2="3.5" y2="0" />
        <line x1="-2.5" y1="-2.5" x2="2.5" y2="2.5" />
        <line x1="-2.5" y1="2.5" x2="2.5" y2="-2.5" />
      </g>
    </g>
  );
}

// ─── Funzione per generare il path di una "banda" di stabilità ───
// center: quota centrale, amp: ampiezza verticale, value: 0..1
function stabilityBandPath(
  centerFn: (xFrac: number) => number,
  amp: number,
  steps = 30,
  offset = 0,
) {
  let d = `M ${MARGIN.left} ${yToPx(6500)} `;
  // Lato superiore (curva organica)
  for (let i = 0; i <= steps; i++) {
    const xFrac = i / steps;
    const x = MARGIN.left + xFrac * PLOT_W;
    const c = centerFn(xFrac);
    const yTop = c - amp / 2 + offset;
    d += ` L ${x} ${yToPx(Math.max(1100, Math.min(6400, yTop)))}`;
  }
  // Lato inferiore (curva organica speculare)
  for (let i = steps; i >= 0; i--) {
    const xFrac = i / steps;
    const x = MARGIN.left + xFrac * PLOT_W;
    const c = centerFn(xFrac);
    const yBot = c + amp / 2 + offset;
    d += ` L ${x} ${yToPx(Math.max(1100, Math.min(6400, yBot)))}`;
  }
  d += " Z";
  return d;
}

// Genera una curva "dolce" che segue la stabilità per disegnare le isolinee
function stabilityCurve(centerAlt: number, hourShift: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const xFrac = i / 40;
    const x = MARGIN.left + xFrac * PLOT_W;
    // Curva a "U" con minimo attorno all'ora 12-13
    const t = (xFrac - 0.5) * 2;
    const dip = -Math.cos(t * Math.PI) * 400 + centerAlt;
    pts.push({ x, y: yToPx(dip + hourShift) });
  }
  return smoothPath(pts);
}

export default function RasoftWindgram({
  latitude,
  longitude,
  altitude,
  siteName,
  selectedDay = 0,
}: RasoftWindgramProps) {
  const [data, setData] = useState<OMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, [selectedDay]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      hourly: [
        "temperature_2m",
        "dew_point_2m",
        "relative_humidity_2m",
        "cloud_cover",
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "shortwave_radiation",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_speed_80m",
        "wind_direction_80m",
        "wind_speed_120m",
        "wind_direction_120m",
        "wind_speed_850hPa",
        "wind_direction_850hPa",
        "wind_speed_700hPa",
        "wind_direction_700hPa",
        "wind_speed_600hPa",
        "wind_direction_600hPa",
        "wind_speed_500hPa",
        "wind_direction_500hPa",
        "freezing_level_height",
        "cape",
      ].join(","),
      start_date: targetDate,
      end_date: targetDate,
      timezone: "Europe/Rome",
      wind_speed_unit: "kmh",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: OMData) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, targetDate]);

  // Costruiamo le righe orarie 08-18 leggendo i dati Open-Meteo
  const rows = useMemo<HourRow[]>(() => {
    if (!data) return [];
    const out: HourRow[] = [];
    for (const hour of HOURS) {
      const idx = data.time.findIndex((t) => {
        const hh = parseInt(t.slice(11, 13), 10);
        const dd = t.slice(8, 10);
        const mm = t.slice(5, 7);
        return hh === hour && dd === targetDate.slice(8, 10) && mm === targetDate.slice(5, 7);
      });
      if (idx < 0) continue;
      const t = data.temperature_2m[idx];
      const td = data.dew_point_2m[idx];
      const cloudPct = data.cloud_cover[idx] ?? 0;
      const cape = data.cape[idx] ?? 0;
      const cloudBase = computeCloudBase(t, td, altitude);
      const thermalTop = computeThermalTop(cape, cloudBase);
      const thermal = computeThermalStrength(
        cape,
        cloudBase,
        thermalTop,
        cloudPct,
      );
      const rad = data.shortwave_radiation[idx] ?? 0;
      const sunPct = Math.min(100, Math.max(0, Math.round((rad / 900) * 100)));
      // PBL approssimato
      const pbl = Math.max(altitude + 200, 1500 + thermal * 400);
      // Stabilità: in base alla radiazione e al CAPE
      const stability = Math.min(1, Math.max(0, (rad / 700) * 0.6 + (cape / 200) * 0.4));
      out.push({
        hour,
        idx,
        time: data.time[idx],
        wind: [
          { alt: altitude, speed: data.wind_speed_10m[idx] ?? 0, dir: data.wind_direction_10m[idx] ?? 0 },
          { alt: altitude + 80, speed: data.wind_speed_80m[idx] ?? 0, dir: data.wind_direction_80m[idx] ?? 0 },
          { alt: altitude + 120, speed: data.wind_speed_120m[idx] ?? 0, dir: data.wind_direction_120m[idx] ?? 0 },
          { alt: 1450, speed: data.wind_speed_850hPa[idx] ?? 0, dir: data.wind_direction_850hPa[idx] ?? 0 },
          { alt: 3100, speed: data.wind_speed_700hPa[idx] ?? 0, dir: data.wind_direction_700hPa[idx] ?? 0 },
          { alt: 4400, speed: data.wind_speed_600hPa[idx] ?? 0, dir: data.wind_direction_600hPa[idx] ?? 0 },
          { alt: 5800, speed: data.wind_speed_500hPa[idx] ?? 0, dir: data.wind_direction_500hPa[idx] ?? 0 },
        ],
        thermal,
        sunPct,
        cloudPct,
        cloudLow: data.cloud_cover_low[idx] ?? 0,
        cloudMid: data.cloud_cover_mid[idx] ?? 0,
        cloudHigh: data.cloud_cover_high[idx] ?? 0,
        cape,
        freezing: data.freezing_level_height[idx] ?? 4000,
        temp2m: t,
        dew2m: td,
        cloudBase,
        thermalTop,
        pbl,
        stability,
      });
    }
    return out;
  }, [data, altitude, targetDate]);

  // Curva top termico (viola) - arco che sale nelle ore centrali
  const thermalTopPoints = useMemo(
    () =>
      rows.map((r) => {
        // Quota top basata sulla forza termica + curve morbida
        const t = r.thermal;
        // Orario centrale ha il top più alto
        const hourFactor = 1 - Math.abs(r.hour - 13) / 8; // 1 a 13, 0 ai bordi
        const top = 1900 + (1.4 + t) * 600 * hourFactor;
        return { x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX, Math.max(1500, top))) };
      }),
    [rows],
  );

  // PBL - arco nero tratteggiato
  const pblPoints = useMemo(
    () =>
      rows.map((r) => {
        const hourFactor = 1 - Math.abs(r.hour - 13) / 8;
        const pbl = 1500 + r.thermal * 500 * hourFactor;
        return { x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX, Math.max(1500, pbl))) };
      }),
    [rows],
  );

  // Zero termico
  const freezingPoints = useMemo(
    () =>
      rows.map((r) => ({
        x: xToPx(r.hour),
        y: yToPx(Math.min(Y_MAX, r.freezing)),
      })),
    [rows],
  );

  // Badge cumulonembi (sotto curva termica, "quota + rateo")
  const cloudBadges = useMemo(
    () =>
      rows.map((r) => {
        const t = r.thermal;
        const base = Math.max(altitude + 100, 1700 + t * 350);
        return {
          x: xToPx(r.hour),
          y: yToPx(Math.min(Y_MAX, base - 80)),
          alt: Math.round(base),
          rate: t,
        };
      }),
    [rows, altitude],
  );

  // Nubi
  const clouds = useMemo(
    () =>
      rows
        .filter((r) => r.cloudMid > 20 || r.cloudLow > 20)
        .map((r) => {
          const t = r.thermal;
          const base = Math.max(altitude + 100, 1700 + t * 350);
          return {
            x: xToPx(r.hour),
            y: yToPx(Math.min(Y_MAX, base + 200)),
            label: `${Math.round(r.cloudMid || r.cloudLow || r.cloudPct)}%`,
          };
        }),
    [rows, altitude],
  );

  // Date info
  const dateInfo = useMemo(() => {
    const d = new Date(targetDate + "T00:00:00");
    const giorni = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const mesi = [
      "gen", "feb", "mar", "apr", "mag", "giu",
      "lug", "ago", "set", "ott", "nov", "dic",
    ];
    return {
      giorno: giorni[d.getDay()],
      data: d.getDate(),
      mese: mesi[d.getMonth()],
    };
  }, [targetDate]);

  // ─── Path delle "bande di stabilità" (zone concentriche attorno a 2500m) ───
  const stabilityCenter = (xFrac: number) => {
    // Curva a U con minimo a metà plot
    const t = (xFrac - 0.5) * 2;
    return 2700 - Math.cos(t * Math.PI * 0.8) * 400;
  };

  const stabilityBands = useMemo(() => {
    // Dal più esterno (alto) al più interno (rosso)
    return [
      { color: "#fde047", opacity: 0.85, center: 5800, amp: 1400 }, // giallo stabile in quota
      { color: "#84cc16", opacity: 0.55, center: 4700, amp: 1200 }, // verde lime
      { color: "#22c55e", opacity: 0.45, center: 3800, amp: 900 },  // verde
      { color: "#06b6d4", opacity: 0.55, center: 3300, amp: 700 },  // ciano
      { color: "#3b82f6", opacity: 0.6, center: 3000, amp: 500 },   // blu
      { color: "#1e40af", opacity: 0.45, center: 2800, amp: 350 },  // blu scuro
      { color: "#f97316", opacity: 0.7, center: 2500, amp: 700 },   // arancione
      { color: "#ef4444", opacity: 0.75, center: 2300, amp: 400 },  // rosso centrale
    ];
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-slate-600 text-sm">Caricamento windgram Rasoft…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 p-8 text-center">
        <p className="text-rose-600 text-sm">
          Errore nel caricamento dei dati meteo: {error ?? "dati non disponibili"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[28px] shadow-2xl border border-slate-300 p-4 md:p-6">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full min-w-[880px] h-auto block"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          <defs>
            <clipPath id="plotClip">
              <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H} />
            </clipPath>
          </defs>

          {/* ─── Bande concentriche di stabilità (campo ΔT) ─── */}
          <g clipPath="url(#plotClip)">
            {stabilityBands.map((band, i) => (
              <path
                key={`band-${i}`}
                d={stabilityBandPath(stabilityCenter, band.amp, 40, band.center - 2700)}
                fill={band.color}
                opacity={band.opacity}
              />
            ))}
            {/* Banda di base gialla (sotto tutto) */}
            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={PLOT_W}
              height={PLOT_H}
              fill="#facc15"
              opacity={0.35}
            />
          </g>

          {/* ─── Bordo del plot ─── */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="none"
            stroke="#0f172a"
            strokeWidth={1.2}
          />

          {/* ─── Linee tratteggiate orizzontali (livelli isobarici) ─── */}
          {HPA_LEVELS.map((lv) => (
            <g key={lv.hpa}>
              <line
                x1={MARGIN.left}
                y1={yToPx(lv.alt)}
                x2={MARGIN.left + PLOT_W}
                y2={yToPx(lv.alt)}
                stroke="#0f172a"
                strokeWidth={0.7}
                strokeDasharray="4 3"
                opacity={0.65}
              />
              <text
                x={MARGIN.left - 6}
                y={yToPx(lv.alt) + 4}
                textAnchor="end"
                fontSize={11}
                fontWeight={800}
                fill="#0f172a"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {lv.hpa} hPa
              </text>
            </g>
          ))}

          {/* ─── Asse Y destro (quota m) ─── */}
          {Array.from({ length: 10 }, (_, i) => 1500 + i * 500).map((alt) => (
            <g key={`y-${alt}`}>
              <line
                x1={MARGIN.left + PLOT_W}
                y1={yToPx(alt)}
                x2={MARGIN.left + PLOT_W + 4}
                y2={yToPx(alt)}
                stroke="#0f172a"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left + PLOT_W + 8}
                y={yToPx(alt) + 4}
                fontSize={10.5}
                fontWeight={700}
                fill="#0f172a"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {alt} m
              </text>
            </g>
          ))}

          {/* ─── Asse X (ore 08-18) ─── */}
          {HOURS.map((h) => (
            <g key={`x-${h}`}>
              <line
                x1={xToPx(h)}
                y1={MARGIN.top + PLOT_H}
                x2={xToPx(h)}
                y2={MARGIN.top + PLOT_H + 5}
                stroke="#0f172a"
                strokeWidth={1}
              />
              <text
                x={xToPx(h)}
                y={MARGIN.top + PLOT_H + 22}
                textAnchor="middle"
                fontSize={11.5}
                fontWeight={800}
                fill="#0f172a"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {String(h).padStart(2, "0")}:00
              </text>
            </g>
          ))}

          {/* ─── Header tabella ascendenze + sole ─── */}
          <g>
            <text
              x={MARGIN.left - 30}
              y={MARGIN.top - 52}
              fontSize={10}
              fontWeight={600}
              fill="#475569"
              textAnchor="end"
            >
              valore medio ascendenze (m/s)
            </text>
            {rows.map((r) => (
              <g key={`hdr-${r.hour}`}>
                <text
                  x={xToPx(r.hour)}
                  y={MARGIN.top - 32}
                  textAnchor="middle"
                  fontSize={16}
                  fontWeight={800}
                  fill={r.thermal >= 1.6 ? "#dc2626" : "#0f172a"}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {r.thermal.toFixed(1)}
                </text>
                <text
                  x={xToPx(r.hour)}
                  y={MARGIN.top - 12}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill={r.sunPct >= 90 ? "#94a3b8" : "#b45309"}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {r.sunPct}
                </text>
              </g>
            ))}
            <text
              x={MARGIN.left - 30}
              y={MARGIN.top - 8}
              fontSize={10}
              fontWeight={600}
              fill="#475569"
              textAnchor="end"
            >
              sole %
            </text>
          </g>

          {/* ─── Titolo ─── */}
          <text
            x={VB_W / 2}
            y={26}
            textAnchor="middle"
            fontSize={22}
            fontWeight={900}
            fill="#0f172a"
            letterSpacing={-0.3}
          >
            {siteName.toLowerCase()} · {dateInfo.giorno} {dateInfo.data} {dateInfo.mese}
          </text>
          <text
            x={VB_W / 2}
            y={46}
            textAnchor="middle"
            fontSize={11}
            fontWeight={500}
            fill="#64748b"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            plotted {targetDate} 00:00 UTC · model ground {altitude + 12} m · SRTM {altitude} m
          </text>

          {/* ─── Wind Barbs stilizzate ─── */}
          <g clipPath="url(#plotClip)">
            {rows.map((r) => (
              <g key={`wb-${r.hour}`}>
                {r.wind.map((w, i) => (
                  <WindBarb
                    key={`wb-${r.hour}-${i}`}
                    cx={xToPx(r.hour)}
                    cy={yToPx(w.alt)}
                    speed={w.speed}
                    direction={w.dir}
                    high={w.alt > 3500}
                  />
                ))}
              </g>
            ))}
          </g>

          {/* ─── PBL (boundary layer) tratteggiata nera ─── */}
          <path
            d={smoothPath(pblPoints)}
            fill="none"
            stroke="#0f172a"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />

          {/* ─── Zero termico azzurro tratteggiato ─── */}
          <path
            d={smoothPath(freezingPoints)}
            fill="none"
            stroke="#0284c7"
            strokeWidth={2.2}
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
          {/* Fiocchi di neve ai punti orari del zero termico */}
          {freezingPoints.map((p, i) => (
            <SnowflakeIcon key={`flake-${i}`} x={p.x} y={p.y - 14} />
          ))}

          {/* ─── Badge zero termico in alto a destra ─── */}
          {freezingPoints[0] && (
            <g
              transform={`translate(${MARGIN.left + PLOT_W - 86}, ${MARGIN.top + 6})`}
            >
              <rect
                x={0}
                y={0}
                width={82}
                height={32}
                rx={5}
                fill="#ffffff"
                stroke="#0284c7"
                strokeWidth={1.4}
              />
              <text
                x={41}
                y={14}
                textAnchor="middle"
                fontSize={11}
                fontWeight={800}
                fill="#0284c7"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                0 °C
              </text>
              <text
                x={41}
                y={27}
                textAnchor="middle"
                fontSize={11}
                fontWeight={800}
                fill="#0284c7"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {Math.round(pxToY(freezingPoints[0].y))} m
              </text>
            </g>
          )}

          {/* ─── Nuvole stilizzate con % ─── */}
          {clouds.map((c, i) => (
            <CloudIcon key={`cloud-${i}`} x={c.x} y={c.y} label={c.label} />
          ))}

          {/* ─── Badge cumulonembi (sotto curva termica) ─── */}
          {cloudBadges.map((b, i) => (
            <g key={`badge-${i}`} transform={`translate(${b.x - 24}, ${b.y})`}>
              <text
                x={24}
                y={10}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={800}
                fill="#0f172a"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {b.alt} m
              </text>
              <text
                x={24}
                y={24}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={800}
                fill="#dc2626"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                ↑ {b.rate.toFixed(1)} m/s
              </text>
            </g>
          ))}

          {/* ─── Curva top termico viola (parapendio) ─── */}
          <path
            d={smoothPath(thermalTopPoints)}
            fill="none"
            stroke="#a855f7"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Icone parapendio ai nodi */}
          {thermalTopPoints.map((p, i) => (
            <ParagliderIcon key={`pg-${i}`} x={p.x} y={p.y - 4} />
          ))}

          {/* ─── Scala stabilità ΔT/100m ─── */}
          <g transform={`translate(${MARGIN.left}, ${VB_H - 38})`}>
            <text
              x={-30}
              y={11}
              textAnchor="end"
              fontSize={10}
              fontWeight={700}
              fill="#475569"
            >
              Stabile ←
            </text>
            <text
              x={PLOT_W + 30}
              y={11}
              textAnchor="start"
              fontSize={10}
              fontWeight={700}
              fill="#475569"
            >
              → Instabile
            </text>
            <text
              x={PLOT_W / 2}
              y={-2}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={800}
              fill="#0f172a"
            >
              ΔT / 100 m
            </text>

            {(() => {
              const segW = PLOT_W / 9;
              const colors = [
                "#7c3aed",
                "#3b82f6",
                "#06b6d4",
                "#14b8a6",
                "#84cc16",
                "#a3e635",
                "#eab308",
                "#f97316",
                "#ef4444",
              ];
              const values = [-0.20, 0.00, 0.16, 0.32, 0.48, 0.65, 0.82, 0.98, 1.20];
              return colors.map((c, i) => (
                <g key={i}>
                  <rect
                    x={i * segW}
                    y={6}
                    width={segW}
                    height={12}
                    fill={c}
                    opacity={0.9}
                  />
                  <text
                    x={i * segW + segW / 2}
                    y={32}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontWeight={700}
                    fill="#334155"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {values[i].toFixed(2)}
                  </text>
                </g>
              ));
            })()}
          </g>

          {/* ─── Fonte dati ─── */}
          <text
            x={VB_W / 2}
            y={VB_H - 6}
            textAnchor="middle"
            fontSize={9.5}
            fontWeight={500}
            fill="#94a3b8"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium
          </text>
        </svg>
      </div>
    </div>
  );
}