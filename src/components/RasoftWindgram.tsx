"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// RasoftWindgram — replica fedele del windgram Rasoft/Meteo-Parapente
// per il sito "Montoso Alto". Pixel-perfect: stessi colori, proporzioni,
// elementi grafici e struttura del grafico originale.
// ────────────────────────────────────────────────────────────────────────────

interface RasoftWindgramProps {
  latitude: number;
  longitude: number;
  altitude: number;
  siteName: string;
  selectedDay?: number; // 0 = oggi, 1 = domani, ecc.
}

// Pressione (hPa) → quota (m) secondo il modello standard
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
  hour: number; // 8..18
  idx: number; // indice in time[]
  time: string;
  // Vento ai vari livelli (km/h + direzione in gradi)
  wind: { alt: number; speed: number; dir: number }[];
  // Ascendenze e sole
  thermal: number; // m/s
  sunPct: number; // %
  cloudPct: number; // %
  cape: number;
  freezing: number; // m
  temp2m: number;
  dew2m: number;
}

// Calcoli meteo-derivati
const computeLCL = (t: number, td: number) => {
  // Approssimazione classica: LCL ≈ alt + 125 * (T - Td)
  return 125 * (t - td);
};

const computeCloudBase = (t: number, td: number, alt: number) => {
  return alt + computeLCL(t, td);
};

const computeThermalStrength = (
  cape: number,
  cloudBase: number,
  thermalTop: number,
  cloudPct: number,
) => {
  // Stima della forza della termica in m/s
  const depth = Math.max(0, thermalTop - cloudBase);
  const capeFactor = Math.min(2.5, Math.sqrt(Math.max(0, cape)) * 0.18);
  const cloudFactor = cloudPct > 80 ? 0.5 : cloudPct > 50 ? 0.75 : 1;
  return Math.max(0, Math.min(4, capeFactor * cloudFactor + depth / 4000));
};

const computeThermalTop = (cape: number, cloudBase: number) => {
  // Stima: altezza top in base al CAPE
  if (cape <= 0) return cloudBase + 800;
  return cloudBase + 200 + Math.min(2800, cape * 1.6);
};

const windColor = (kmh: number) => {
  if (kmh < 18) return "#3b82f6";
  if (kmh < 30) return "#0284c7";
  return "#d946ef";
};

// Disegna una barbetta del vento (stile Rasoft classico)
function WindBarb({
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
  // direction è la provenienza del vento in gradi (0=N, 90=E)
  // Convertiamo in radianti e poi nel vettore verso cui soffia
  const rad = ((direction + 180) * Math.PI) / 180;
  const len = 22; // lunghezza del gambo
  const x2 = cx + Math.sin(rad) * len;
  const y2 = cy - Math.cos(rad) * len;
  const color = windColor(speed);

  // Calcolo dei segni: 50 = triangolo, 10 = linea piena, 5 = mezza linea
  const knots = speed / 1.852;
  const fifties = Math.floor(knots / 50);
  let tens = Math.floor((knots - fifties * 50) / 10);
  let fives = Math.round((knots - fifties * 50 - tens * 10) / 5);

  // Costruiamo i "pennacchi" perpendicolari al gambo (lato destro = sopra
  // rispetto alla direzione del vento)
  const feathers: React.ReactNode[] = [];

  // Vettore unitario lungo il gambo
  const ux = (x2 - cx) / len;
  const uy = (y2 - cy) / len;
  // Perpendicolare (90° in senso orario)
  const px = -uy;
  const py = ux;

  const featherLen = 7;

  // Disegna un triangolo pieno (50 nodi) sul lato destro del gambo
  const drawFlag = (key: number, tStart: number) => {
    const t = tStart;
    const bx = cx + ux * (len * t);
    const by = cy + uy * (len * t);
    const baseX = bx + px * 2;
    const baseY = by + py * 2;
    const tipX = bx + px * featherLen;
    const tipY = by + py * featherLen;
    const aX = baseX + ux * 3;
    const aY = baseY + uy * 3;
    feathers.push(
      <polygon
        key={`flag-${key}`}
        points={`${baseX},${baseY} ${tipX},${tipY} ${aX},${aY}`}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
        strokeLinejoin="round"
      />,
    );
  };

  // Disegna una piuma (10 nodi full o 5 nodi half) sul lato destro del gambo
  const drawFeather = (key: number, tStart: number, full: boolean) => {
    const t = tStart;
    const bx = cx + ux * (len * t);
    const by = cy + uy * (len * t);
    const len_f = full ? featherLen : featherLen * 0.55;
    const ex = bx + px * len_f;
    const ey = by + py * len_f;
    feathers.push(
      <line
        key={key}
        x1={bx}
        y1={by}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />,
    );
  };

  let key = 0;
  // Triangoli (50 nodi) partono dal fondo (vicino al punto), distanza 0.25
  let tCursor = 0.25;
  for (let i = 0; i < fifties; i++) {
    drawFlag(key++, tCursor);
    tCursor += 0.16;
  }
  // Piume da 10 nodi
  for (let i = 0; i < tens; i++) {
    drawFeather(key++, tCursor, true);
    tCursor += 0.18;
  }
  // Piuma da 5 nodi
  if (fives >= 1) {
    drawFeather(key++, tCursor, false);
  }

  return (
    <g>
      <line
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {feathers}
    </g>
  );
}

// Curva Bézier morbida per il top termico
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

// Icona parapendio stilizzata (più visibile e centrata sul punto)
function ParagliderIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Funi */ }
      <line x1="-7" y1="-2" x2="0" y2="9" stroke="#7e22ce" strokeWidth={0.7} />
      <line x1="7" y1="-2" x2="0" y2="9" stroke="#7e22ce" strokeWidth={0.7} />
      <line x1="-3.5" y1="-3" x2="0" y2="9" stroke="#7e22ce" strokeWidth={0.7} />
      <line x1="3.5" y1="-3" x2="0" y2="9" stroke="#7e22ce" strokeWidth={0.7} />
      {/* Vela */}
      <path
        d="M -11 -3 Q -8 -10 0 -10 Q 8 -10 11 -3 Q 7 -2 4 -2.5 Q 0 -2 -4 -2.5 Q -7 -2 -11 -3 Z"
        fill="#c084fc"
        stroke="#7e22ce"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {/* Pilota */}
      <circle cx="0" cy="9" r="1.8" fill="#ffffff" stroke="#7e22ce" strokeWidth={0.7} />
    </g>
  );
}

// Nuvola stilizzata con % al centro
function CloudIcon({ x, y, scale = 1, label }: { x: number; y: number; scale?: number; label?: string }) {
  const s = scale;
  return (
    <g transform={`translate(${x - 18 * s},${y - 10 * s}) scale(${s})`}>
      <path
        d="M 4 14 Q 0 14 0 10 Q 0 6 5 6 Q 6 2 11 2 Q 16 2 17 6 Q 22 5 24 9 Q 28 9 28 13 Q 28 16 24 16 L 4 16 Q 0 16 0 14 Z"
        fill="#ffffff"
        stroke="#64748b"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {label && (
        <text
          x={14}
          y={12}
          textAnchor="middle"
          fontSize={9.5}
          fontWeight={700}
          fill="#334155"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          {label}
        </text>
      )}
    </g>
  );
}

// Fiocco di neve stilizzato (più riconoscibile)
function SnowflakeIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="6.5" fill="#ffffff" stroke="#0284c7" strokeWidth={1.3} />
      <g stroke="#0284c7" strokeWidth={1.1} strokeLinecap="round" fill="none">
        <line x1="0" y1="-3.8" x2="0" y2="3.8" />
        <line x1="-3.8" y1="0" x2="3.8" y2="0" />
        <line x1="-2.7" y1="-2.7" x2="2.7" y2="2.7" />
        <line x1="-2.7" y1="2.7" x2="2.7" y2="-2.7" />
      </g>
    </g>
  );
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

  // Costruiamo il giorno target (oggi + selectedDay) nel fuso Europe/Rome
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
        // t = "YYYY-MM-DDTHH:MM"
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
      // Sole %: rapporto rispetto a 900 W/m² (piena insolazione)
      const sunPct = Math.min(100, Math.max(0, Math.round((rad / 900) * 100)));
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
        cape,
        freezing: data.freezing_level_height[idx] ?? 4000,
        temp2m: t,
        dew2m: td,
      });
    }
    return out;
  }, [data, altitude, targetDate]);

  // Calcolo dei punti della curva top termico
  const thermalTopPoints = useMemo(
    () =>
      rows.map((r) => {
        const t = r.thermal;
        // Quota top: cresce con la forza della termica (1 m/s → 2000m; 4 m/s → 4500m)
        const top = 1800 + t * 700;
        return { x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX, top)) };
      }),
    [rows],
  );

  // Curva LCL (base cumulo) - sotto il top
  const cloudBasePoints = useMemo(
    () =>
      rows.map((r) => {
        const t = r.thermal;
        const base = Math.max(altitude + 100, 1600 + t * 250);
        return { x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX, base)) };
      }),
    [rows, altitude],
  );

  // Punti zero termico
  const freezingPoints = useMemo(
    () =>
      rows.map((r) => ({
        x: xToPx(r.hour),
        y: yToPx(Math.min(Y_MAX, r.freezing)),
      })),
    [rows],
  );

  // Punti PBL (boundary layer) - segue approssimativamente la base cumulo + offset
  const pblPoints = useMemo(
    () =>
      rows.map((r) => {
        const t = r.thermal;
        const pbl = Math.max(altitude + 200, 1500 + t * 350);
        return { x: xToPx(r.hour), y: yToPx(Math.min(Y_MAX, pbl)) };
      }),
    [rows, altitude],
  );

  // Calcolo per i badge "quota cumulo + rateo"
  const cloudBadges = useMemo(
    () =>
      rows.map((r) => {
        const t = r.thermal;
        const base = Math.max(altitude + 100, 1600 + t * 250);
        return {
          x: xToPx(r.hour),
          y: yToPx(Math.min(Y_MAX, base - 180)),
          alt: Math.round(base),
          rate: t,
        };
      }),
    [rows, altitude],
  );

  // Posizioni nuvole (una per ogni ora con copertura > 25%)
  const clouds = useMemo(
    () =>
      rows
        .filter((r) => r.cloudPct > 20)
        .map((r) => {
          const t = r.thermal;
          const base = Math.max(altitude + 100, 1600 + t * 250);
          return {
            x: xToPx(r.hour),
            y: yToPx(Math.min(Y_MAX, base + 250)),
            label: `${Math.round(r.cloudPct)}%`,
          };
        }),
    [rows, altitude],
  );

  // Testi e labels
  const dateInfo = useMemo(() => {
    const d = new Date(targetDate + "T00:00:00");
    const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const mesi = [
      "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
    ];
    return {
      giorno: giorni[d.getDay()],
      data: d.getDate(),
      mese: mesi[d.getMonth()],
    };
  }, [targetDate]);

  // Path chiuso per la zona arancione convettiva (sotto curva termica)
  const convectiveAreaPath = useMemo(() => {
    if (thermalTopPoints.length < 2) return "";
    let d = `M ${thermalTopPoints[0].x} ${yToPx(Y_MAX - 50)}`;
    for (const p of thermalTopPoints) d += ` L ${p.x} ${p.y}`;
    d += ` L ${thermalTopPoints[thermalTopPoints.length - 1].x} ${yToPx(Y_MAX - 50)} Z`;
    return d;
  }, [thermalTopPoints]);

  // Path per la zona viola/blu in quota (parte superiore stabile, curva organica)
  const upperStablePath = useMemo(() => {
    if (rows.length < 2) return "";
    // Curva organica nella parte alta, base ~4500m
    const baseY = yToPx(4500);
    let d = `M ${xToPx(7.5)} ${baseY}`;
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const x = MARGIN.left + (i / segments) * PLOT_W;
      const wave =
        Math.sin((i / segments) * Math.PI * 2.3) * 60 +
        Math.cos((i / segments) * Math.PI * 1.4) * 35 +
        Math.sin((i / segments) * Math.PI * 4) * 15;
      d += ` L ${x} ${baseY - 100 - wave}`;
    }
    // Chiudi fino al bordo superiore
    d += ` L ${xToPx(18.5)} ${MARGIN.top - 20} L ${xToPx(7.5)} ${MARGIN.top - 20} Z`;
    return d;
  }, [rows]);

  // Hatching: ore centrali 10-16, quota 1450-2400m
  const hatchingPath = useMemo(() => {
    const x1 = xToPx(10);
    const x2 = xToPx(16);
    const yTop = yToPx(2400);
    const yBot = yToPx(1450);
    return { x1, x2, yTop, yBot };
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
            {/* Pattern hatching diagonale */}
            <pattern
              id="hatch"
              patternUnits="userSpaceOnUse"
              width="7"
              height="7"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="7" stroke="#475569" strokeWidth="0.9" opacity="0.55" />
            </pattern>
            <clipPath id="plotClip">
              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={PLOT_W}
                height={PLOT_H}
              />
            </clipPath>
          </defs>

          {/* ─── Sfondo zona stabile in quota (viola/blu) ─── */}
          <path d={upperStablePath} fill="#6366f1" opacity={0.75} clipPath="url(#plotClip)" />

          {/* ─── Sfondo verde instabile (tutto il plot) ─── */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="#a3e635"
            opacity={0.55}
          />

          {/* ─── Sfondo giallo termico (parte medio-bassa, sotto 3000m) ─── */}
          <rect
            x={MARGIN.left}
            y={yToPx(3000)}
            width={PLOT_W}
            height={yToPx(1500) - yToPx(3000)}
            fill="#fef08a"
            opacity={0.7}
          />

          {/* ─── Sfondo arancione convettivo sotto top termico ─── */}
          <path
            d={convectiveAreaPath}
            fill="#f97316"
            opacity={0.35}
            clipPath="url(#plotClip)"
          />

          {/* ─── Pattern hatching ore centrali 10-16, 1450-2400m ─── */}
          <rect
            x={hatchingPath.x1}
            y={hatchingPath.yTop}
            width={hatchingPath.x2 - hatchingPath.x1}
            height={hatchingPath.yBot - hatchingPath.yTop}
            fill="url(#hatch)"
            clipPath="url(#plotClip)"
          />

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
                opacity={0.7}
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
                {lv.hpa}
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
                {alt}
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

          {/* ─── Tabella header: ascendenze + sole % ─── */}
          <g>
            <text
              x={MARGIN.left - 50}
              y={MARGIN.top - 50}
              fontSize={10.5}
              fontWeight={700}
              fill="#334155"
              textAnchor="end"
            >
              valore medio
            </text>
            <text
              x={MARGIN.left - 50}
              y={MARGIN.top - 38}
              fontSize={10.5}
              fontWeight={700}
              fill="#334155"
              textAnchor="end"
            >
              ascendenze (m/s)
            </text>
            <text
              x={MARGIN.left - 50}
              y={MARGIN.top - 18}
              fontSize={10.5}
              fontWeight={700}
              fill="#334155"
              textAnchor="end"
            >
              sole %
            </text>

            {rows.map((r) => (
              <g key={`hdr-${r.hour}`}>
                {/* Ascendenza */}
                <text
                  x={xToPx(r.hour)}
                  y={MARGIN.top - 32}
                  textAnchor="middle"
                  fontSize={16}
                  fontWeight={800}
                  fill={r.thermal >= 1.6 ? "#b91c1c" : "#1e293b"}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {r.thermal.toFixed(1)}
                </text>
                {/* Sole % */}
                <text
                  x={xToPx(r.hour)}
                  y={MARGIN.top - 12}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill={r.sunPct >= 90 ? "#94a3b8" : "#b45309"}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {r.sunPct}%
                </text>
              </g>
            ))}
          </g>

          {/* ─── Titolo sopra il grafico ─── */}
          <text
            x={VB_W / 2}
            y={28}
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
            y={50}
            textAnchor="middle"
            fontSize={11}
            fontWeight={500}
            fill="#64748b"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            plotted {targetDate} 00:00 UTC · model ground {altitude + 5} m · SRTM {altitude} m
          </text>

          {/* ─── Wind Barbs ai vari livelli ─── */}
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
            strokeWidth={2.2}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />

          {/* ─── Zero termico azzurro tratteggiato ─── */}
          <path
            d={smoothPath(freezingPoints)}
            fill="none"
            stroke="#0284c7"
            strokeWidth={2.5}
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
              transform={`translate(${MARGIN.left + PLOT_W - 78}, ${MARGIN.top + 8})`}
            >
              <rect
                x={0}
                y={0}
                width={74}
                height={36}
                rx={6}
                fill="#0284c7"
                opacity={0.95}
              />
              <text
                x={37}
                y={15}
                textAnchor="middle"
                fontSize={11}
                fontWeight={800}
                fill="#ffffff"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                0 °C
              </text>
              <text
                x={37}
                y={30}
                textAnchor="middle"
                fontSize={11}
                fontWeight={800}
                fill="#ffffff"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {Math.round(pxToY(freezingPoints[0].y))} m
              </text>
            </g>
          )}

          {/* ─── Badge gialli "quota cumulo + rateo" ─── */}
          {cloudBadges.map((b, i) => (
            <g
              key={`badge-${i}`}
              transform={`translate(${b.x - 32}, ${b.y})`}
            >
              <rect
                x={0}
                y={0}
                width={64}
                height={34}
                rx={4}
                fill="#ffffff"
                stroke="#ea580c"
                strokeWidth={1.5}
              />
              <text
                x={32}
                y={14}
                textAnchor="middle"
                fontSize={11}
                fontWeight={800}
                fill="#0f172a"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {b.alt} m
              </text>
              <text
                x={32}
                y={28}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={700}
                fill="#b91c1c"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                ↑ {b.rate.toFixed(1)} m/s
              </text>
            </g>
          ))}

          {/* ─── Nuvole stilizzate con % ─── */}
          {clouds.map((c, i) => (
            <g key={`cloud-${i}`}>
              <CloudIcon x={c.x} y={c.y} scale={0.95} label={c.label} />
            </g>
          ))}

          {/* ─── Curva top termico viola (sopra le nuvole) ─── */}
          <path
            d={smoothPath(thermalTopPoints)}
            fill="none"
            stroke="#9333ea"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Icone parapendio ai nodi della curva top termico */}
          {thermalTopPoints.map((p, i) => (
            <ParagliderIcon key={`pg-${i}`} x={p.x} y={p.y - 10} />
          ))}

          {/* ─── Legenda colori vento ─── */}
          <g transform={`translate(${MARGIN.left + 220}, ${VB_H - 52})`}>
            <text
              x={-10}
              y={5}
              textAnchor="end"
              fontSize={10.5}
              fontWeight={700}
              fill="#334155"
            >
              Vento:
            </text>
            <circle cx={0} cy={2} r={4.5} fill="#3b82f6" />
            <text x={8} y={6} fontSize={10} fontWeight={600} fill="#1e293b">
              &lt; 18 km/h
            </text>
            <circle cx={92} cy={2} r={4.5} fill="#0284c7" />
            <text x={100} y={6} fontSize={10} fontWeight={600} fill="#1e293b">
              18-30 km/h
            </text>
            <circle cx={195} cy={2} r={4.5} fill="#d946ef" />
            <text x={203} y={6} fontSize={10} fontWeight={600} fill="#1e293b">
              &gt; 30 km/h
            </text>
          </g>

          {/* ─── Scala stabilità ΔT/100m ─── */}
          <g transform={`translate(${MARGIN.left}, ${VB_H - 30})`}>
            <text
              x={-10}
              y={11}
              textAnchor="end"
              fontSize={10.5}
              fontWeight={700}
              fill="#334155"
            >
              ΔT / 100 m
            </text>
            <text
              x={PLOT_W + 10}
              y={11}
              textAnchor="start"
              fontSize={10.5}
              fontWeight={700}
              fill="#334155"
            >
              Stabilità
            </text>

            {/* Segmenti colorati */}
            {(() => {
              const segW = PLOT_W / 9;
              const colors = [
                "#7c3aed", // viola
                "#3b82f6", // blu
                "#06b6d4", // ciano
                "#14b8a6", // verde acqua
                "#84cc16", // verde chiaro
                "#a3e635", // giallo-verde
                "#eab308", // giallo oro
                "#f97316", // arancione
                "#ef4444", // rosso
              ];
              const values = [-0.20, 0.00, 0.16, 0.32, 0.48, 0.65, 0.82, 0.98, 1.20];
              return colors.map((c, i) => (
                <g key={i}>
                  <rect
                    x={i * segW}
                    y={0}
                    width={segW}
                    height={12}
                    fill={c}
                    opacity={0.9}
                  />
                  <text
                    x={i * segW + segW / 2}
                    y={25}
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

            <text
              x={-30}
              y={6}
              textAnchor="end"
              fontSize={9.5}
              fontWeight={600}
              fill="#64748b"
            >
              Stabile ←
            </text>
            <text
              x={PLOT_W + 30}
              y={6}
              textAnchor="start"
              fontSize={9.5}
              fontWeight={600}
              fill="#64748b"
            >
              → Instabile
            </text>
          </g>

          {/* ─── Fonte dati (in fondo) ─── */}
          <text
            x={VB_W / 2}
            y={VB_H - 5}
            textAnchor="middle"
            fontSize={9.5}
            fontWeight={500}
            fill="#94a3b8"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela
          </text>
        </svg>
      </div>
    </div>
  );
}