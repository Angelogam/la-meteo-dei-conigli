"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, MapPin, Mountain, Calendar } from "lucide-react";

interface HourlyData {
  time: string;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  cloudCover: number;
  thermalAvg: number;
  sunPct: number;
  cloudBase: number;
}

interface ProfessionalWindgramProps {
  latitude: number;
  longitude: number;
  altitude: number;
  siteName: string;
  selectedDay?: number;
}

const STABILITY_SCALE = [
  { c: "#8a5bb8" },
  { c: "#4f7fd9" },
  { c: "#45b3cd" },
  { c: "#4ec099" },
  { c: "#8bc953" },
  { c: "#d8c728" },
  { c: "#eeb319" },
  { c: "#e86c1f" },
  { c: "#c92e1e" },
];

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

async function fetchOpenMeteoData(
  lat: number,
  lon: number,
  altitude: number,
  selectedDay: number
): Promise<HourlyData[]> {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + selectedDay);
  const dateStr = targetDate.toISOString().split("T")[0];

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,cloud_cover,wind_speed_10m,wind_direction_10m` +
    `&models=best_match&timezone=UTC&start_date=${dateStr}&end_date=${dateStr}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
  const data = await res.json();

  const times: string[] = data.hourly?.time ?? [];
  const temps: number[] = data.hourly?.temperature_2m ?? [];
  const clouds: number[] = data.hourly?.cloud_cover ?? [];
  const winds: number[] = data.hourly?.wind_speed_10m ?? [];
  const dirs: number[] = data.hourly?.wind_direction_10m ?? [];

  // Filter only daytime hours (06:00 - 19:00 UTC) and shape into HourlyData
  const result: HourlyData[] = [];
  for (let i = 0; i < times.length; i++) {
    const hour = new Date(times[i]).getUTCHours();
    if (hour < 6 || hour > 19) continue;
    const t = temps[i] ?? 0;
    const cloud = clouds[i] ?? 0;
    const thermalAvg = Math.max(0.4, Math.min(2.5, (t - 10) * 0.15 + (cloud < 30 ? 0.5 : 0)));
    const sunPct = Math.min(100, Math.max(10, Math.round((1 - cloud / 100) * 100)));
    const spread = Math.max(1, t - (t - (100 - cloud) / 5));
    const cloudBase = Math.round(altitude + spread * 125);
    result.push({
      time: times[i],
      windSpeed: winds[i] ?? 0,
      windDirection: dirs[i] ?? 0,
      temperature: t,
      cloudCover: cloud,
      thermalAvg,
      sunPct,
      cloudBase,
    });
  }
  return result;
}

function windColor(speed: number): string {
  if (speed < 5) return "#2ecc71";
  if (speed < 10) return "#f1c40f";
  if (speed < 20) return "#e67e22";
  return "#e74c3c";
}

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16] || "N";
}

export default function ProfessionalWindgram({
  latitude,
  longitude,
  altitude,
  siteName,
  selectedDay = 0,
}: ProfessionalWindgramProps) {
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const result = await fetchOpenMeteoData(latitude, longitude, altitude, selectedDay);
        if (mounted) {
          setHourlyData(result);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Errore nel caricamento del windgram");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [latitude, longitude, altitude, selectedDay]);

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

  const dateStr = dateObj.toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <h3 className="text-white font-bold text-base">Windgram — {siteName || "Decollo"}</h3>
        </div>
        <p className="text-slate-400 text-xs mt-2">Caricamento dati Open-Meteo...</p>
      </div>
    );
  }

  if (error || hourlyData.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-red-500/40 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-white font-bold text-base">Windgram — {siteName || "Decollo"}</h3>
        </div>
        <p className="text-red-300 text-xs mt-2">{error || "Nessun dato disponibile"}</p>
      </div>
    );
  }

  // SVG dimensions
  const width = 1000;
  const height = 600;
  const margin = { top: 95, right: 85, bottom: 85, left: 85 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const minAlt = Math.max(0, altitude - 200);
  const maxAlt = 6000;

  const getYFromAlt = (alt: number) => {
    const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
    return margin.top + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
  };

  const getXFromHourIdx = (idx: number) => {
    return margin.left + (idx / Math.max(1, hourlyData.length - 1)) * plotW;
  };

  // Zero degree level estimate
  const zeroThermal = useMemo(() => {
    const avgTemp = hourlyData.reduce((s, h) => s + h.temperature, 0) / hourlyData.length;
    return Math.round(altitude + (avgTemp / 0.0065));
  }, [hourlyData, altitude]);

  // Render wind barb
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 90) * Math.PI) / 180;
    const staffLen = 20;
    const endX = x + staffLen * Math.cos(angle);
    const endY = y + staffLen * Math.sin(angle);
    const barbColor = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#3b82f6";
    const barbAngle = angle + (115 * Math.PI) / 180;

    const elements: React.ReactNode[] = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;

    while (rem >= 50 && pos >= 0.3) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <polygon
          key={`p50-${x}-${y}-${pos}`}
          points={`${bx},${by} ${bx + 11 * Math.cos(barbAngle)},${by + 11 * Math.sin(barbAngle)} ${bx + 5.5 * Math.cos(angle)},${by + 5.5 * Math.sin(angle)}`}
          fill={barbColor}
          stroke={barbColor}
          strokeWidth="1"
        />
      );
      rem -= 50;
      pos -= 0.28;
    }

    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <line
          key={`l10-${x}-${y}-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 10 * Math.cos(barbAngle)}
          y2={by + 10 * Math.sin(barbAngle)}
          stroke={barbColor}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      );
      rem -= 10;
      pos -= 0.18;
    }

    if (rem >= 5 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <line
          key={`l5-${x}-${y}`}
          x1={bx}
          y1={by}
          x2={bx + 5.5 * Math.cos(barbAngle)}
          y2={by + 5.5 * Math.sin(barbAngle)}
          stroke={barbColor}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
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
    return hourlyData
      .map((_, i) => `${getXFromHourIdx(i)},${getYFromAlt(zeroThermal)}`)
      .join(" ");
  }, [zeroThermal, hourlyData]);

  // Wind direction profile (single line) at decollo altitude
  const windDirLine = useMemo(() => {
    return hourlyData
      .map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(altitude + 100 + (h.windSpeed * 30))}`)
      .join(" ");
  }, [hourlyData, altitude]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-slate-800/60 border border-blue-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{siteName || "Decollo"} — Windgram Open-Meteo</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{formattedDateTitle}</span>
            <span className="text-slate-600">·</span>
            <span>Decollo {altitude}m</span>
            <span className="text-slate-600">·</span>
            <span>Fonte: Open-Meteo</span>
          </div>
        </div>
      </div>

      {/* Windgram SVG card - COMPACT */}
      <div className="bg-white text-slate-900 rounded-[24px] p-2 sm:p-3 shadow-lg border border-slate-300 overflow-hidden font-sans select-none">
        {/* Title */}
        <div className="text-center pb-0.5">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight lowercase">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono tracking-wide mt-0">
            plotted {dateStr} 00:00 UTC &middot; model ground {Math.round(altitude + 5)} m &middot; SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* Top table: Ascendenza media & Sole % */}
        <div className="bg-slate-50 rounded-xl p-2 mb-2 border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
            <span className="flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-emerald-500" />
              Ascendenza media
            </span>
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-amber-500" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
              </svg>
              Sole %
            </span>
          </div>
          <div className="grid grid-cols-11 gap-px">
            {hourlyData.map((h, i) => (
              <div key={i} className="text-center">
                <div className="font-black text-[11px]" style={{ color: h.thermalAvg >= 1.6 ? "#b91c1c" : "#0f172a" }}>
                  {h.thermalAvg.toFixed(1)}
                </div>
                <div className="text-[10px]" style={{ color: h.sunPct >= 90 ? "#94a3b8" : "#b45309" }}>
                  {h.sunPct}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SVG Windgram */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-0.5">
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
              <linearGradient id="deltaTGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {STABILITY_SCALE.map((item, idx) => (
                  <stop key={idx} offset={`${(idx / (STABILITY_SCALE.length - 1)) * 100}%`} stopColor={item.c} />
                ))}
              </linearGradient>
            </defs>

            {/* Background stability zones */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="#a3e635" />
            <path
              d={`M ${margin.left},${getYFromAlt(5800)} Q ${margin.left + plotW * 0.3},${getYFromAlt(6000)} ${margin.left + plotW * 0.5},${getYFromAlt(5700)} T ${margin.left + plotW},${getYFromAlt(5600)} L ${margin.left + plotW},${margin.top} L ${margin.left},${margin.top} Z`}
              fill="#eab308"
              opacity="0.85"
            />
            <path
              d={`M ${margin.left + plotW * 0.22},${getYFromAlt(4900)} Q ${margin.left + plotW * 0.35},${getYFromAlt(5200)} ${margin.left + plotW * 0.45},${getYFromAlt(4800)} Q ${margin.left + plotW * 0.35},${getYFromAlt(4500)} ${margin.left + plotW * 0.22},${getYFromAlt(4900)} Z`}
              fill="#facc15"
              opacity="0.9"
            />
            <path
              d={`M ${margin.left + plotW * 0.55},${getYFromAlt(3900)} Q ${margin.left + plotW * 0.65},${getYFromAlt(4000)} ${margin.left + plotW * 0.75},${getYFromAlt(3700)} Q ${margin.left + plotW * 0.65},${getYFromAlt(3500)} ${margin.left + plotW * 0.55},${getYFromAlt(3900)} Z`}
              fill="#facc15"
              opacity="0.8"
            />
            <path
              d={`M ${margin.left + plotW * 0.78},${getYFromAlt(3600)} Q ${margin.left + plotW * 0.88},${getYFromAlt(3700)} ${margin.left + plotW * 0.98},${getYFromAlt(3400)} Q ${margin.left + plotW * 0.88},${getYFromAlt(3300)} ${margin.left + plotW * 0.78},${getYFromAlt(3600)} Z`}
              fill="#facc15"
              opacity="0.85"
            />
            <path
              d={`M ${margin.left},${getYFromAlt(3400)} Q ${margin.left + plotW * 0.25},${getYFromAlt(3500)} ${margin.left + plotW * 0.5},${getYFromAlt(3000)} L ${margin.left + plotW},${getYFromAlt(3000)} L ${margin.left + plotW},${getYFromAlt(2700)} Q ${margin.left + plotW * 0.5},${getYFromAlt(2700)} ${margin.left},${getYFromAlt(3100)} Z`}
              fill="#38bdf8"
              opacity="0.8"
            />
            <path
              d={`M ${margin.left},${getYFromAlt(3100)} Q ${margin.left + plotW * 0.25},${getYFromAlt(3200)} ${margin.left + plotW * 0.45},${getYFromAlt(2800)} L ${margin.left + plotW * 0.45},${getYFromAlt(2650)} Q ${margin.left + plotW * 0.2},${getYFromAlt(2950)} ${margin.left},${getYFromAlt(2800)} Z`}
              fill="#6366f1"
              opacity="0.75"
            />
            <path
              d={`M ${margin.left + plotW * 0.55},${getYFromAlt(1900)} Q ${margin.left + plotW * 0.65},${getYFromAlt(2000)} ${margin.left + plotW * 0.82},${getYFromAlt(1850)} Q ${margin.left + plotW * 0.70},${getYFromAlt(1700)} ${margin.left + plotW * 0.55},${getYFromAlt(1900)} Z`}
              fill="#dc2626"
              opacity="0.9"
            />
            <path
              d={`M ${getXFromHourIdx(2)},${getYFromAlt(1450)} L ${getXFromHourIdx(2)},${getYFromAlt(2100)} Q ${getXFromHourIdx(5)},${getYFromAlt(2400)} ${getXFromHourIdx(8)},${getYFromAlt(2200)} L ${getXFromHourIdx(10)},${getYFromAlt(1800)} L ${getXFromHourIdx(10)},${getYFromAlt(1450)} Z`}
              fill="url(#thermalHatch)"
            />
            <text
              x={margin.left + plotW * 0.48}
              y={getYFromAlt(3500)}
              fill="#0f172a"
              opacity="0.08"
              fontSize="68"
              fontWeight="900"
              textAnchor="middle"
              letterSpacing="6"
              transform={`rotate(-15, ${margin.left + plotW * 0.48}, ${getYFromAlt(3500)})`}
            >
              ALPIUM
            </text>

            {/* Pressure levels & altitude grid */}
            {PRESSURE_LEVELS.map((lvl) => {
              const y = getYFromAlt(lvl.alt);
              return (
                <g key={`grid-lvl-${lvl.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.4" />
                  <text x={margin.left - 12} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="end">
                    {lvl.hpa} hPa
                  </text>
                </g>
              );
            })}
            {ALT_TICKS.map((alt) => {
              const y = getYFromAlt(alt);
              return (
                <g key={`grid-alt-${alt}`}>
                  <line x1={margin.left + plotW} y1={y} x2={margin.left + plotW + 5} y2={y} stroke="#0f172a" strokeWidth="1.2" />
                  <text x={margin.left + plotW + 10} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="start">
                    {alt} m
                  </text>
                </g>
              );
            })}

            {/* Vertical hour lines */}
            {hourlyData.map((_, i) => {
              const x = getXFromHourIdx(i);
              return <line key={`vline-${i}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.3" />;
            })}

            {/* Wind barbs at multiple altitudes per hour */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              // Show barbs at 100m, 500m, 1000m, 2000m, 3000m, 4000m, 5000m above ground
              const altitudes = [100, 500, 1000, 2000, 3000, 4000, 5000].map((a) => altitude + a);
              return (
                <g key={`col-barbs-${i}`}>
                  {altitudes.map((alt) => {
                    if (alt > maxAlt) return null;
                    // Reduce wind speed with altitude for visualization
                    const speedFactor = 1 + (alt - altitude) / 8000;
                    return renderWindBarb(x, getYFromAlt(alt), h.windSpeed * speedFactor, h.windDirection);
                  })}
                </g>
              );
            })}

            {/* Zero thermal line */}
            {zeroThermalPath && <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />}
            {hourlyData.map((_, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(zeroThermal);
              return (
                <g key={`zero-snowflake-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="7" fill="#ffffff" stroke="#0284c7" strokeWidth="1.6" />
                  <text x="0" y="3.5" fill="#0284c7" fontSize="9" fontWeight="900" textAnchor="middle">
                    ❄
                  </text>
                </g>
              );
            })}

            {/* Zero thermal badge */}
            <g transform={`translate(${margin.left + plotW - 130}, ${getYFromAlt(zeroThermal) - 13})`}>
              <rect x="0" y="0" width="125" height="26" rx="6" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
              <text x="62.5" y="17" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                0 °C &middot; {zeroThermal} m
              </text>
            </g>

            {/* Cloud base line */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(Math.min(maxAlt, h.cloudBase));
              return (
                <g key={`cloud-${i}`} transform={`translate(${x}, ${y})`}>
                  <path
                    d="M -13,2 A 5,5 0 0,1 -6,-4 A 8,8 0 0,1 6,-5 A 6,6 0 0,1 13,1 A 4,4 0 0,1 11,6 L -11,6 A 4,4 0 0,1 -13,2 Z"
                    fill="#ffffff"
                    stroke="#64748b"
                    strokeWidth="1.2"
                  />
                  <text x="0" y="3" fill="#0f172a" fontSize="8" fontWeight="900" textAnchor="middle">
                    {Math.round(h.cloudCover)}%
                  </text>
                </g>
              );
            })}

            {/* X-axis hour labels */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const hh = new Date(h.time).getUTCHours();
              return (
                <text key={`label-hour-${i}`} x={x} y={margin.top + plotH + 22} fill="#0f172a" fontSize="11.5" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                  {String(hh).padStart(2, "0")}:00
                </text>
              );
            })}

            {/* Plot border */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.4" />
          </svg>
        </div>

        {/* Stability scale */}
        <div className="mt-2 pt-2 border-t border-slate-200 flex flex-col items-center">
          <div className="w-full max-w-2xl px-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Stabile &larr;</span>
              <span className="text-slate-900 font-extrabold text-sm">&Delta;T / 100 m</span>
              <span>&rarr; Instabile</span>
            </div>
            <div className="w-full h-3 rounded-sm flex overflow-hidden border border-slate-400">
              {STABILITY_SCALE.map((s, i) => (
                <div key={i} className="flex-1 h-full" style={{ backgroundColor: s.c }} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono font-bold text-slate-700 mt-1 px-1">
              <span>-0.20</span>
              <span>0.00</span>
              <span>0.16</span>
              <span>0.32</span>
              <span>0.48</span>
              <span>0.65</span>
              <span>0.82</span>
              <span>0.98</span>
              <span>1.20</span>
            </div>
            <div className="text-center text-[9px] text-slate-500 font-mono mt-1">
              Fonte: Open-Meteo &middot; Diagnostica di volo a vela stile Alpium
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
