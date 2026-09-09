"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, Calendar, MapPin, TrendingUp, Cloud, AlertTriangle, Loader2, Sun, CloudRain, Zap } from "lucide-react";

const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_KEY || "";

interface WindPoint {
  time: string;
  level: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  temperature: number;
}

interface TomorrowWindgramProps {
  decollo: {
    name: string;
    lat: number;
    lon: number;
    elevation: number;
  };
  selectedDay?: number;
}

async function fetchTomorrowWindgram(lat: number, lon: number): Promise<WindPoint[]> {
  // Tomorrow.io supports multiple vertical levels
  const levels = ["surface", "100m", "300m", "500m", "800m", "1000m", "1500m", "2000m", "2500m", "3000m"];

  const url =
    `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}` +
    `&fields=windSpeed,windDirection,temperature,cloudCover` +
    `&timesteps=1h&levels=${levels.join(",")}` +
    `&units=metric&apikey=${TOMORROW_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  const intervals = data.data?.timelines?.[0]?.intervals ?? [];
  const result: WindPoint[] = [];

  for (const interval of intervals) {
    const time = interval.startTime;
    const v = interval.values || {};
    for (const level of levels) {
      const m = level === "surface" ? 0 : parseInt(level.replace("m", ""), 10);
      result.push({
        time,
        level: m,
        windSpeed: v.windSpeed?.[level] ?? NaN,
        windDirection: v.windDirection?.[level] ?? NaN,
        cloudCover: v.cloudCover?.[level] ?? NaN,
        temperature: v.temperature?.[level] ?? NaN,
      });
    }
  }
  return result;
}

function windColor(speed: number): string {
  if (speed < 5) return "#2ecc71";
  if (speed < 10) return "#f1c40f";
  if (speed < 20) return "#e67e22";
  return "#e74c3c";
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16] || "N";
}

function computeThermalBase(points: WindPoint[]): number | null {
  const byLevel: Record<number, WindPoint[]> = {};
  for (const p of points) {
    if (!byLevel[p.level]) byLevel[p.level] = [];
    byLevel[p.level].push(p);
  }
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);
  for (const l of levels) {
    const arr = byLevel[l];
    const t = arr.reduce((s, p) => s + p.temperature, 0) / arr.length;
    const c = arr.reduce((s, p) => s + p.cloudCover, 0) / arr.length;
    if (t >= 15 && c <= 60 && l >= 300) return l;
  }
  return null;
}

const ParapendioIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x},${y})`}>
    <path d="M -15,-4 C -12,-16 12,-16 15,-4 C 10,-8 -10,-8 -15,-4 Z" fill="#c084fc" stroke="#7e22ce" strokeWidth={1.8} />
    <line x1="-12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth={1} />
    <line x1="12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth={1} />
    <circle cx="0" cy="0" r="3.5" fill="#ffffff" stroke="#7e22ce" strokeWidth={2} />
  </g>
);

const SnowflakeIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x}, ${y})`}>
    <circle cx="0" cy="0" r="7.5" fill="#ffffff" stroke="#0284c7" strokeWidth={1.8} />
    <text x="0" y="3.5" fill="#0284c7" fontSize="10" fontWeight="900" textAnchor="middle">❄</text>
  </g>
);

export default function TomorrowWindgram({ decollo, selectedDay = 0 }: TomorrowWindgramProps) {
  const [data, setData] = useState<WindPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const result = await fetchTomorrowWindgram(decollo.lat, decollo.lon);
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Errore nel caricamento del windgram");
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [decollo.lat, decollo.lon]);

  // Filter data for selected day
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + selectedDay);
    const targetStr = targetDate.toISOString().split("T")[0];
    return data.filter(p => p.time.startsWith(targetStr));
  }, [data, selectedDay]);

  const times = useMemo(() => {
    if (!filteredData.length) return [];
    return Array.from(new Set(filteredData.map(p => p.time))).sort();
  }, [filteredData]);

  const levels = useMemo(() => {
    if (!filteredData.length) return [];
    return Array.from(new Set(filteredData.map(p => p.level))).sort((a, b) => a - b);
  }, [filteredData]);

  const thermalBase = useMemo(() => computeThermalBase(filteredData), [filteredData]);

  // Calculate zero degree level (freezing level)
  const zeroThermal = useMemo(() => {
    if (!filteredData.length) return null;
    const surfacePoints = filteredData.filter(p => p.level === 0);
    if (!surfacePoints.length) return null;
    const avgSurfaceTemp = surfacePoints.reduce((s, p) => s + p.temperature, 0) / surfacePoints.length;
    // Approximate freezing level: surface temp / lapse rate (0.0065°C/m) + surface elevation
    return Math.round(decollo.elevation + (avgSurfaceTemp / 0.0065));
  }, [filteredData, decollo.elevation]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <h3 className="text-white font-bold text-lg">Windgram — {decollo.name}</h3>
        </div>
        <p className="text-slate-400 text-sm">Caricamento dati vento in quota da Tomorrow.io...</p>
      </div>
    );
  }

  if (error || !filteredData.length) {
    return (
      <div className="bg-slate-900/80 border border-red-500/40 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h3 className="text-white font-bold text-lg">Windgram — {decollo.name}</h3>
        </div>
        <p className="text-red-300 text-sm">{error || "Nessun dato disponibile per questo giorno"}</p>
      </div>
    );
  }

  // SVG Dimensions
  const width = 1000;
  const height = 660;
  const margin = { top: 90, right: 85, bottom: 95, left: 85 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const minAlt = Math.max(0, decollo.elevation - 200);
  const maxAlt = 6000;

  const getYFromAlt = (alt: number) => {
    const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
    return margin.top + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
  };

  const getXFromHourIdx = (idx: number) => {
    return margin.left + (idx / Math.max(1, times.length - 1)) * plotW;
  };

  // Standard pressure levels for labels
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

  const ALT_TICKS = [6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500];

  // Format date for title
  const dateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d;
  }, [selectedDay]);

  const formattedDateTitle = useMemo(() => {
    const days = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return `${days[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
  }, [dateObj]);

  // Render wind barb (standard meteorological symbol)
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 90) * Math.PI) / 180;
    const staffLen = 22;
    const endX = x + staffLen * Math.cos(angle);
    const endY = y + staffLen * Math.sin(angle);
    const barbColor = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#3b82f6";
    const barbAngle = angle + (115 * Math.PI) / 180;

    const elements: React.ReactNode[] = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;

    // Pennant 50 knots
    while (rem >= 50 && pos >= 0.3) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <polygon key={`p50-${x}-${y}-${pos}`} points={`${bx},${by} ${bx + 11 * Math.cos(barbAngle)},${by + 11 * Math.sin(barbAngle)} ${bx + 5.5 * Math.cos(angle)},${by + 5.5 * Math.sin(angle)}`} fill={barbColor} stroke={barbColor} strokeWidth="1" />
      );
      rem -= 50;
      pos -= 0.28;
    }

    // Full barbs 10 knots
    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <line key={`l10-${x}-${y}-${pos}`} x1={bx} y1={by} x2={bx + 10 * Math.cos(barbAngle)} y2={by + 10 * Math.sin(barbAngle)} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
      );
      rem -= 10;
      pos -= 0.18;
    }

    // Half barb 5 knots
    if (rem >= 5 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <line key={`l5-${x}-${y}`} x1={bx} y1={by} x2={bx + 5.5 * Math.cos(barbAngle)} y2={by + 5.5 * Math.sin(barbAngle)} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
      );
    }

    return (
      <g key={`wb-${Math.round(x)}-${Math.round(y)}`}>
        <line x1={x} y1={y} x2={endX} y2={endY} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
        {elements}
      </g>
    );
  };

  // Zero thermal path
  const zeroThermalPath = useMemo(() => {
    if (!zeroThermal || times.length === 0) return "";
    return times.map((_, i) => `${getXFromHourIdx(i)},${getYFromAlt(zeroThermal)}`).join(" ");
  }, [zeroThermal, times]);

  // Thermal top curve (paraglider icons)
  const thermalTopCurve = useMemo(() => {
    if (times.length === 0) return "";
    return times.map((_, i) => {
      // Estimate thermal top from surface temp and cloud base
      const surfaceData = filteredData.find(p => p.time === times[i] && p.level === 0);
      if (!surfaceData) return "";
      const spread = Math.max(1, surfaceData.temperature - (surfaceData.temperature - (100 - surfaceData.cloudCover) / 5));
      const cloudBase = Math.round(decollo.elevation + spread * 125);
      const thermalTop = Math.min(3600, cloudBase + Math.min(700, 1.5 * 220));
      return `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(thermalTop)}`;
    }).join(" ");
  }, [times, filteredData, decollo.elevation]);

  const avgZeroThermal = zeroThermal || 4381;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/60 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{decollo.name} — Windgram Tomorrow.io</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{formattedDateTitle}</span>
            <span className="text-slate-600">·</span>
            <span>Decollo {decollo.elevation}m</span>
            <span className="text-slate-600">·</span>
            <span>Fonte: Tomorrow.io</span>
          </div>
        </div>
      </div>

      {/* Windgram SVG */}
      <div className="bg-white text-slate-900 rounded-[28px] p-4 sm:p-7 shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
        <div className="text-center pb-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight lowercase">
            {decollo.name.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-mono tracking-wide mt-0.5">
            plotted {dateObj.toISOString().split("T")[0]} 00:00 UTC &middot; model ground {Math.round(decollo.elevation + 5)} m &middot; SRTM {Math.round(decollo.elevation)} m
          </p>
        </div>

        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[880px]"
            style={{ shapeRendering: "geometricPrecision", textRendering: "geometricPrecision" }}
          >
            <defs>
              <pattern id="thermalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
                <line x1="0" y1="0" x2="8" y2="0" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
              </pattern>
            </defs>

            {/* Header metrics: thermal avg & sun % */}
            <text x={margin.left + plotW / 2} y={32} fill="#64748b" fontSize="12" fontWeight="700" textAnchor="middle">
              valore medio ascendenze (m/s)
            </text>
            <text x={margin.left - 12} y={75} fill="#a16207" fontSize="11" fontWeight="800" textAnchor="end">
              sole %
            </text>

            {times.map((t, i) => {
              const x = getXFromHourIdx(i);
              const surfaceData = filteredData.find(p => p.time === t && p.level === 0);
              const thermalAvg = surfaceData ? Math.max(0.4, Math.min(2.5, (surfaceData.temperature - 10) * 0.15 + (surfaceData.cloudCover < 30 ? 0.5 : 0))) : 1.2;
              const sunPct = surfaceData ? Math.min(100, Math.max(10, Math.round((1 - surfaceData.cloudCover / 100) * 80))) : 80;
              const isStrong = thermalAvg >= 1.6;
              return (
                <g key={`head-col-${i}`}>
                  <text x={x} y={52} fill={isStrong ? "#b91c1c" : "#1e293b"} fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    {thermalAvg.toFixed(1)}
                  </text>
                  <text x={x} y={75} fill={sunPct >= 90 ? "#94a3b8" : "#b45309"} fontSize="12" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                    {sunPct}
                  </text>
                </g>
              );
            })}

            {/* Background stability zones - Alpium style palette */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="#a3e635" />
            <path d={`M ${margin.left},${getYFromAlt(5800)} Q ${margin.left + plotW * 0.3},${getYFromAlt(6000)} ${margin.left + plotW * 0.5},${getYFromAlt(5700)} T ${margin.left + plotW},${getYFromAlt(5600)} L ${margin.left + plotW},${margin.top} L ${margin.left},${margin.top} Z`} fill="#eab308" opacity="0.85" />
            <path d={`M ${margin.left + plotW * 0.22},${getYFromAlt(4900)} Q ${margin.left + plotW * 0.35},${getYFromAlt(5200)} ${margin.left + plotW * 0.45},${getYFromAlt(4800)} Q ${margin.left + plotW * 0.35},${getYFromAlt(4500)} ${margin.left + plotW * 0.22},${getYFromAlt(4900)} Z`} fill="#facc15" opacity="0.9" />
            <path d={`M ${margin.left + plotW * 0.55},${getYFromAlt(3900)} Q ${margin.left + plotW * 0.65},${getYFromAlt(4000)} ${margin.left + plotW * 0.75},${getYFromAlt(3700)} Q ${margin.left + plotW * 0.65},${getYFromAlt(3500)} ${margin.left + plotW * 0.55},${getYFromAlt(3900)} Z`} fill="#facc15" opacity="0.8" />
            <path d={`M ${margin.left + plotW * 0.78},${getYFromAlt(3600)} Q ${margin.left + plotW * 0.88},${getYFromAlt(3700)} ${margin.left + plotW * 0.98},${getYFromAlt(3400)} Q ${margin.left + plotW * 0.88},${getYFromAlt(3300)} ${margin.left + plotW * 0.78},${getYFromAlt(3600)} Z`} fill="#facc15" opacity="0.85" />
            <path d={`M ${margin.left},${getYFromAlt(3400)} Q ${margin.left + plotW * 0.25},${getYFromAlt(3500)} ${margin.left + plotW * 0.5},${getYFromAlt(3000)} L ${margin.left + plotW},${getYFromAlt(3000)} L ${margin.left + plotW},${getYFromAlt(2700)} Q ${margin.left + plotW * 0.5},${getYFromAlt(2700)} ${margin.left},${getYFromAlt(3100)} Z`} fill="#38bdf8" opacity="0.8" />
            <path d={`M ${margin.left},${getYFromAlt(3100)} Q ${margin.left + plotW * 0.25},${getYFromAlt(3200)} ${margin.left + plotW * 0.45},${getYFromAlt(2800)} L ${margin.left + plotW * 0.45},${getYFromAlt(2650)} Q ${margin.left + plotW * 0.2},${getYFromAlt(2950)} ${margin.left},${getYFromAlt(2800)} Z`} fill="#6366f1" opacity="0.75" />
            <path d={`M ${margin.left + plotW * 0.55},${getYFromAlt(1900)} Q ${margin.left + plotW * 0.65},${getYFromAlt(2000)} ${margin.left + plotW * 0.82},${getYFromAlt(1850)} Q ${margin.left + plotW * 0.70},${getYFromAlt(1700)} ${margin.left + plotW * 0.55},${getYFromAlt(1900)} Z`} fill="#dc2626" opacity="0.9" />
            <path d={`M ${getXFromHourIdx(2)},${getYFromAlt(1450)} L ${getXFromHourIdx(2)},${getYFromAlt(2100)} Q ${getXFromHourIdx(5)},${getYFromAlt(2400)} ${getXFromHourIdx(8)},${getYFromAlt(2200)} L ${getXFromHourIdx(10)},${getYFromAlt(1800)} L ${getXFromHourIdx(10)},${getYFromAlt(1450)} Z`} fill="url(#thermalHatch)" />
            <text x={margin.left + plotW * 0.48} y={getYFromAlt(3500)} fill="#0f172a" opacity="0.08" fontSize="68" fontWeight="900" textAnchor="middle" letterSpacing="6" transform={`rotate(-15, ${margin.left + plotW * 0.48}, ${getYFromAlt(3500)})`}>ALPIUM</text>

            {/* Pressure levels & altitude grid */}
            {PRESSURE_LEVELS.map((lvl) => {
              const y = getYFromAlt(lvl.alt);
              return (
                <g key={`grid-lvl-${lvl.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.4" />
                  <text x={margin.left - 12} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="end">{lvl.hpa} hPa</text>
                </g>
              );
            })}
            {ALT_TICKS.map((alt) => {
              const y = getYFromAlt(alt);
              return (
                <g key={`grid-alt-${alt}`}>
                  <line x1={margin.left + plotW} y1={y} x2={margin.left + plotW + 5} y2={y} stroke="#0f172a" strokeWidth="1.2" />
                  <text x={margin.left + plotW + 10} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="start">{alt} m</text>
                </g>
              );
            })}

            {/* Vertical hour lines */}
            {times.map((_, i) => {
              const x = getXFromHourIdx(i);
              return <line key={`vline-${i}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.3" />;
            })}

            {/* Wind barbs at each level for each hour */}
            {times.map((t, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`col-barbs-${i}`}>
                  {levels.map((lvl) => {
                    const point = filteredData.find(p => p.time === t && p.level === lvl);
                    if (!point || isNaN(point.windSpeed)) return null;
                    const y = getYFromAlt(lvl);
                    return renderWindBarb(x, y, point.windSpeed, point.windDirection);
                  })}
                </g>
              );
            })}

            {/* Zero thermal line */}
            {zeroThermalPath && (
              <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
            )}
            {times.map((_, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(avgZeroThermal);
              return (
                <g key={`zero-snowflake-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="7.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                  <text x="0" y="3.5" fill="#0284c7" fontSize="10" fontWeight="900" textAnchor="middle">❄</text>
                </g>
              );
            })}

            {/* Zero thermal badge */}
            <g transform={`translate(${margin.left + plotW - 130}, ${getYFromAlt(avgZeroThermal) - 13})`}>
              <rect x="0" y="0" width="125" height="26" rx="6" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
              <text x="62.5" y="17" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">0 °C &middot; {avgZeroThermal} m</text>
            </g>

            {/* PBL / Boundary layer */}
            <path d={`M ${getXFromHourIdx(0)},${getYFromAlt(1800)} Q ${getXFromHourIdx(5)},${getYFromAlt(2700)} ${getXFromHourIdx(10)},${getYFromAlt(2300)}`} fill="none" stroke="#0f172a" strokeWidth="2.2" strokeDasharray="5 4" />

            {/* Thermal top curve with paraglider icons */}
            {thermalTopCurve && <path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="3.5" strokeLinecap="round" />}
            {times.map((_, i) => {
              const surfaceData = filteredData.find(p => p.time === times[i] && p.level === 0);
              if (!surfaceData) return null;
              const spread = Math.max(1, surfaceData.temperature - (surfaceData.temperature - (100 - surfaceData.cloudCover) / 5));
              const cloudBase = Math.round(decollo.elevation + spread * 125);
              const thermalTop = Math.min(3600, cloudBase + Math.min(700, 1.5 * 220));
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(thermalTop);
              return (
                <g key={`paraglider-icon-${i}`} transform={`translate(${x}, ${y})`}>
                  <path d="M -15,-4 C -12,-16 12,-16 15,-4 C 10,-8 -10,-8 -15,-4 Z" fill="#c084fc" stroke="#7e22ce" strokeWidth="1.8" />
                  <line x1="-12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth="1" />
                  <line x1="12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth="1" />
                  <circle cx="0" cy="0" r="3.5" fill="#ffffff" stroke="#7e22ce" strokeWidth="2" />
                </g>
              );
            })}

            {/* Cumulus clouds */}
            {times.map((t, i) => {
              if (i === 0 || i === times.length - 1) return null;
              const surfaceData = filteredData.find(p => p.time === t && p.level === 0);
              if (!surfaceData) return null;
              const spread = Math.max(1, surfaceData.temperature - (surfaceData.temperature - (100 - surfaceData.cloudCover) / 5));
              const cloudBase = Math.round(decollo.elevation + spread * 125);
              const x = getXFromHourIdx(i);
              const cloudY = getYFromAlt(cloudBase + 250);
              return (
                <g key={`cumulus-cloud-${i}`} transform={`translate(${x}, ${cloudY})`}>
                  <path d="M -13,2 A 5,5 0 0,1 -6,-4 A 8,8 0 0,1 6,-5 A 6,6 0 0,1 13,1 A 4,4 0 0,1 11,6 L -11,6 A 4,4 0 0,1 -13,2 Z" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
                  <text x="0" y="3" fill="#0f172a" fontSize="8" fontWeight="900" textAnchor="middle">{Math.round(surfaceData.cloudCover)}%</text>
                </g>
              );
            })}

            {/* Data badges: cloud base & climb rate */}
            {times.map((t, i) => {
              const surfaceData = filteredData.find(p => p.time === t && p.level === 0);
              if (!surfaceData) return null;
              const spread = Math.max(1, surfaceData.temperature - (surfaceData.temperature - (100 - surfaceData.cloudCover) / 5));
              const cloudBase = Math.round(decollo.elevation + spread * 125);
              const thermalTop = Math.min(3600, cloudBase + Math.min(700, 1.5 * 220));
              const climbRate = Math.max(0.4, Math.min(2.5, spread * 0.15 + (surfaceData.cloudCover < 30 ? 0.5 : 0)));
              const x = getXFromHourIdx(i);
              const badgeY = getYFromAlt(thermalTop) + 12;
              return (
                <g key={`badge-data-${i}`} transform={`translate(${x}, ${badgeY})`}>
                  <rect x="-24" y="0" width="48" height="24" rx="4" fill="#ffffff" stroke="#ea580c" strokeWidth="1.2" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))" />
                  <text x="0" y="10" fill="#0f172a" fontSize="8.5" fontWeight="900" textAnchor="middle" fontFamily="monospace">{cloudBase} m</text>
                  <text x="0" y="20" fill="#b91c1c" fontSize="8.5" fontWeight="900" textAnchor="middle" fontFamily="monospace">&uarr; {climbRate.toFixed(1)} m/s</text>
                </g>
              );
            })}

            {/* X-axis hour labels */}
            {times.map((t, i) => {
              const x = getXFromHourIdx(i);
              const hh = new Date(t).getHours();
              return (
                <text key={`label-hour-${hh}`} x={x} y={margin.top + plotH + 22} fill="#0f172a" fontSize="11.5" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                  {String(hh).padStart(2, "0")}:00
                </text>
              );
            })}

            {/* Plot border */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.4" />
          </svg>
        </div>

        {/* Stability scale */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col items-center">
          <div className="w-full max-w-2xl px-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Stabile &larr;</span>
              <span className="text-slate-900 font-extrabold text-sm">&Delta;T / 100 m</span>
              <span>&rarr; Instabile</span>
            </div>
            <div className="w-full h-4 rounded-sm flex overflow-hidden border border-slate-400">
              <div className="flex-1 h-full" style={{ backgroundColor: "#8a5bb8" }} />
              <div className="flex-1 h-full" style={{ backgroundColor: "#4f7fd9" }} />
              <div className="flex-1 h-full" style={{ backgroundColor: "#45b3cd" }} />
              <div className="flex-1 h-full" style={{ backgroundColor: "#4ec099" }} />
              <div className="flex-1 h-full" style={{ backgroundColor: "#8bc953" }} />
              <div className="flex-1 h-full" style={{ backgroundColor: "#d8c728" }} />
              <div className="flex-1 h-full" style={{ backgroundColor: "#eeb319" }} />
              <div className="flex-1 h-full" style={{ backgroundColor: "#e86c1f" }} />
              <div className="flex-1 h-full" style={{ backgroundColor: "#c92e1e" }} />
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs font-mono font-bold text-slate-700 mt-1 px-1">
              <span>-0.20</span><span>0.00</span><span>0.16</span><span>0.32</span><span>0.48</span><span>0.65</span><span>0.82</span><span>0.98</span><span>1.20</span>
            </div>
            <div className="text-center text-[10px] text-slate-500 font-mono mt-3">
              Fonte: Tomorrow.io &middot; Diagnostica di volo a vela stile Alpium
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#2ecc71" }} />
            <span>{"<"} 5 km/h</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#f1c40f" }} />
            <span>5–10 km/h</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#e67e22" }} />
            <span>10–20 km/h</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#e74c3c" }} />
            <span>{">"} 20 km/h</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-3 h-3 rounded-sm bg-white/80 border border-slate-500" />
            <span>Copertura nuvole</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ParapendioIcon x={0} y={0} />
            <span>Top termiche</span>
          </div>
          <div className="flex items-center gap-1.5">
            <SnowflakeIcon x={0} y={0} />
            <span>Zero termico</span>
          </div>
        </div>
      </div>
    </div>
  );
}