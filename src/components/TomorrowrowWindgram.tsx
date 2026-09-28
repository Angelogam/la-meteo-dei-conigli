"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Sun, AlertTriangle } from "lucide-react";
import { calcCloudBase } from "@/utils/calcCloudBase";

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
  const levels = ["surface", "100m", "300m", "500m", "800m", "1000m", "1500m", "2000m", "2500m", "3000m"];
  const url = `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}&fields=windSpeed,windDirection,temperature,cloudCover&timesteps=1h&levels=${levels.join(",")}&units=metric&apikey=${TOMORROW_API_KEY}`;
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

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16] || "N";
}

function getWindArrow(deg: number): string {
  const arrows = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

const ParapendioIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x},${y})`}>
    <path d="M -15,-4 C -12,-16 12,-16 15,-4 C 10,-8 -10,-8 -15,-4 Z" fill="#c084fc" stroke="#7e22ce" strokeWidth={1.8} />
    <line x1="-12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth={1} />
    <line x1="12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth={1} />
    <circle cx="0" cy="0" r="3.5" fill="#ffffff" stroke="#7e22ce" strokeWidth={2} />
  </g>
);

export default function Tomorrowwindgram({ decollo, selectedDay = 0 }: TomorrowWindgramProps) {
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
    return () => {
      mounted = false;
    };
  }, [decollo.lat, decollo.lon]);

  const filteredData = useMemo(() => {
    if (!data.length) return [];
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + selectedDay);
    const targetStr = targetDate.toISOString().split("T")[0];
    return data.filter((p) => p.time.startsWith(targetStr));
  }, [data, selectedDay]);

  const times = useMemo(() => {
    if (!filteredData.length) return [];
    return Array.from(new Set(filteredData.map((p) => p.time))).sort();
  }, [filteredData]);

  const levels = useMemo(() => {
    if (!filteredData.length) return [];
    return Array.from(new Set(filteredData.map((p) => p.level))).sort((a, b) => a - b);
  }, [filteredData]);

  const zeroThermal = useMemo(() => {
    if (!filteredData.length) return null;
    const surfacePoints = filteredData.filter((p) => p.level === 0);
    if (!surfacePoints.length) return null;
    const avgSurfaceTemp = surfacePoints.reduce((s, p) => s + p.temperature, 0) / surfacePoints.length;
    return Math.round(decollo.elevation + avgSurfaceTemp / 0.0065);
  }, [filteredData, decollo.elevation]);

  const dateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d;
  }, [selectedDay]);

  const formattedDateTitle = useMemo(() => {
    const days = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return `${days[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  }, [dateObj]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <h3 className="text-white font-bold text-lg">Windgram Tomorrow.io &mdash; {decollo.name}</h3>
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
          <h3 className="text-white font-bold text-lg">Windgram &mdash; {decollo.name}</h3>
        </div>
        <p className="text-red-300 text-sm">{error || "Nessun dato disponibile per questo giorno"}</p>
      </div>
    );
  }

  const width = 1000;
  const height = 350;
  const padL = 60;
  const padR = 20;
  const padT = 30;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const minAlt = Math.max(0, decollo.elevation - 200);
  const maxAlt = 6000;

  const getYFromAlt = (alt: number) => {
    const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
    return padT + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
  };

  const getXFromHourIdx = (idx: number) => {
    return padL + (idx / Math.max(1, times.length - 1)) * plotW;
  };

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

    while (rem >= 50 && pos >= 0.3) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <polygon
          key={`p50-${x}-${y}-${pos}`}
          points={`${bx},${by} ${bx + 11 * Math.cos(barbAngle)},${by + 11 * Math.sin(barbAngle)} ${bx + 5.5 * Math.cos(barbAngle)},${by + 5.5 * Math.sin(barbAngle)}`}
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

  const zeroThermalPath = useMemo(() => {
    if (!zeroThermal || times.length === 0) return "";
    return times.map((_, i) => `${getXFromHourIdx(i)},${getYFromAlt(zeroThermal)}`).join(" ");
  }, [zeroThermal, times]);

  const avgZeroThermal = zeroThermal || 4381;

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 shadow-xl">
      <h3 className="text-white font-bold mb-3 text-lg flex items-center gap-2">
        <Sun className="w-5 h-5 text-emerald-400" />
        Windgram Tomorrow.io &mdash; {decollo.name} &mdash; {formattedDateTitle}
      </h3>

      <div className="overflow-x-auto">
        <svg width={width} height={height} style={{ background: "#2c3e50", borderRadius: "8px" }} className="max-w-full">
          <rect x={padL} y={padT} width={plotW} height={plotH} fill="#a3e635" />

          {PRESSURE_LEVELS.map((lvl) => {
            const y = getYFromAlt(lvl.alt);
            return (
              <g key={`grid-lvl-${lvl.hpa}`}>
                <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.4" />
                <text x={padL - 12} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="end">
                  {lvl.hpa} hPa
                </text>
              </g>
            );
          })}

          {ALT_TICKS.map((alt) => {
            const y = getYFromAlt(alt);
            return (
              <g key={`grid-alt-${alt}`}>
                <line x1={padL + plotW} y1={y} x2={padL + plotW + 5} y2={y} stroke="#0f172a" strokeWidth="1.2" />
                <text x={padL + plotW + 10} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="start">
                  {alt} m
                </text>
              </g>
            );
          })}

          {times.map((_, i) => {
            const x = getXFromHourIdx(i);
            return (
              <line key={`vline-${i}`} x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.3" />
            );
          })}

          {times.map((t, i) => {
            const x = getXFromHourIdx(i);
            return (
              <g key={`col-barbs-${i}`}>
                {levels.map((lvl) => {
                  const point = filteredData.find((p) => p.time === t && p.level === lvl);
                  if (!point || isNaN(point.windSpeed)) return null;
                  const y = getYFromAlt(lvl);
                  return renderWindBarb(x, y, point.windSpeed, point.windDirection);
                })}
              </g>
            );
          })}

          {zeroThermalPath && (
            <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
          )}

          {times.map((_, i) => {
            const surfaceData = filteredData.find((p) => p.time === times[i] && p.level === 0);
            if (!surfaceData) return null;
            const spread = Math.max(1, surfaceData.temperature - (surfaceData.temperature - (100 - surfaceData.cloudCover) / 5));
            const cloudBase = calcCloudBase(decollo.elevation, surfaceData.temperature, surfaceData.temperature - (100 - surfaceData.cloudCover) / 5);
            const thermalTop = Math.min(3600, cloudBase + Math.min(700, 1.5 * 220));
            const x = getXFromHourIdx(i);
            const y = getYFromAlt(thermalTop);
            return <ParapendioIcon key={`pg-${i}`} x={x} y={y} />;
          })}

          {times.map((t, i) => {
            if (i === 0 || i === times.length - 1) return null;
            const surfaceData = filteredData.find((p) => p.time === t && p.level === 0);
            if (!surfaceData) return null;
            const spread = Math.max(1, surfaceData.temperature - (surfaceData.temperature - (100 - surfaceData.cloudCover) / 5));
            const cloudBase = calcCloudBase(decollo.elevation, surfaceData.temperature, surfaceData.temperature - (100 - surfaceData.cloudCover) / 5);
            const x = getXFromHourIdx(i);
            const cloudY = getYFromAlt(cloudBase + 250);
            return (
              <g key={`cloud-${i}`}>
                <ellipse cx={x} cy={cloudY} rx="14" ry="6" fill="#ffffff" stroke="#64748b" strokeWidth="1" opacity="0.85" />
                <text x={x} y={cloudY + 3} fill="#0f172a" fontSize="9" fontWeight="900" textAnchor="middle">
                  {Math.round(surfaceData.cloudCover)}%
                </text>
              </g>
            );
          })}

          {times.map((t, i) => {
            const x = getXFromHourIdx(i);
            const hh = new Date(t).getHours();
            return (
              <text key={`label-hour-${hh}`} x={x} y={padT + plotH + 22} fill="#0f172a" fontSize="11.5" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                {String(hh).padStart(2, "0")}:00
              </text>
            );
          })}

          <rect x={padL} y={padT} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.4" />
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#2ecc71" }} />
          <span>{"<"} 5 km/h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#f1c40f" }} />
          <span>5-10 km/h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#e67e22" }} />
          <span>10-20 km/h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#e74c3c" }} />
          <span>{">"} 20 km/h</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-white/80 border border-slate-500" />
          <span>Copertura nuvole</span>
        </div>
      </div>
    </div>
  );
}