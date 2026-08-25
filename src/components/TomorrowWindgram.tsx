"use client";

import React, { useEffect, useState } from "react";

const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_KEY || "EBox6MVYAysc2A5X5EOhVgKeaDuFg4Pk";

export type Decollo = {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
};

type WindPoint = {
  time: string;
  level: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  temperature: number;
};

async function fetchWindgram(lat: number, lon: number): Promise<WindPoint[]> {
  const levels = ["surface", "100m", "500m", "1000m", "1500m", "2000m", "2500m", "3000m"];

  const url =
    `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}` +
    `&fields=windSpeed,windDirection,temperature,cloudCover` +
    `&timesteps=1h&levels=${levels.join(",")}` +
    `&units=metric&apikey=${TOMORROW_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tomorrow.io HTTP ${res.status}`);
  const data = await res.json();

  const intervals = data.data?.timelines?.[0]?.intervals ?? [];
  const result: WindPoint[] = [];

  for (const interval of intervals) {
    const time = interval.startTime;
    const v = interval.values || {};
    for (const level of levels) {
      const m = level === "surface" ? 0 : parseInt(level.replace("m", ""));
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
  if (isNaN(speed)) return "#444";
  if (speed < 5) return "#2ecc71";
  if (speed < 10) return "#f1c40f";
  if (speed < 20) return "#e67e22";
  return "#e74c3c";
}

function computeThermalBase(points: WindPoint[]): number | null {
  const byLevel: Record<number, WindPoint[]> = {};
  for (const p of points) {
    if (!byLevel[p.level]) byLevel[p.level] = [];
    byLevel[p.level].push(p);
  }
  const levels = Object.keys(byLevel)
    .map(Number)
    .sort((a, b) => a - b);
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
    <path d="M -10 0 Q 0 -10 10 0" stroke="#fff" fill="none" strokeWidth={2} />
    <line x1={-5} y1={0} x2={-2} y2={8} stroke="#fff" strokeWidth={1.5} />
    <line x1={5} y1={0} x2={2} y2={8} stroke="#fff" strokeWidth={1.5} />
    <circle cx={0} cy={10} r={2} fill="#fff" />
  </g>
);

interface TomorrowWindgramProps {
  decollo: Decollo;
}

export default function TomorrowWindgram({ decollo }: TomorrowWindgramProps) {
  const [data, setData] = useState<WindPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetchWindgram(decollo.lat, decollo.lon);
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setError(e.message || "Errore windgram");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [decollo.lat, decollo.lon]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Caricamento windgram Tomorrow.io per {decollo.name}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-6 text-center text-red-300">
        <p className="font-bold mb-1">Errore windgram Tomorrow.io</p>
        <p className="text-sm text-red-200">{error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center text-slate-400">
        Nessun dato windgram disponibile per {decollo.name}
      </div>
    );
  }

  const times = Array.from(new Set(data.map((p) => p.time))).sort();
  const levels = Array.from(new Set(data.map((p) => p.level))).sort((a, b) => a - b);

  const width = 900;
  const height = 520;
  const padL = 70;
  const padR = 20;
  const padT = 35;
  const padB = 45;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const xStep = w / Math.max(times.length - 1, 1);
  const yStep = h / Math.max(levels.length - 1, 1);

  const thermalBase = computeThermalBase(data);

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          Windgram Tomorrow.io — {decollo.name} ({decollo.lat.toFixed(3)}, {decollo.lon.toFixed(3)}) — Quota {decollo.elevation}m
        </h3>
        <span className="text-xs text-slate-400">windSpeed · windDirection · temperature · cloudCover</span>
      </div>

      <svg width={width} height={height} style={{ background: "#2c3e50", borderRadius: "8px" }}>
        {levels.map((l, i) => {
          const y = padT + h - i * yStep;
          return (
            <g key={l}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#34495e" />
              <text x={padL - 8} y={y + 4} fill="#bdc3c7" fontSize={10} textAnchor="end">
                {l} m
              </text>
            </g>
          );
        })}
        {times.map((t, i) => {
          const x = padL + i * xStep;
          const hh = new Date(t).getHours();
          return (
            <g key={t}>
              <line x1={x} y1={padT} x2={x} y2={height - padB} stroke="#34495e" />
              <text x={x} y={height - padB + 14} fill="#bdc3c7" fontSize={10} textAnchor="middle">
                {hh}h
              </text>
            </g>
          );
        })}
        {data.map((p) => {
          const ti = times.indexOf(p.time);
          const li = levels.indexOf(p.level);
          if (ti < 0 || li < 0) return null;
          const x = padL + ti * xStep;
          const y = padT + h - li * yStep;

          const speed = p.windSpeed;
          const dir = p.windDirection;
          const cloud = p.cloudCover;
          const cloudAlpha = isNaN(cloud) ? 0 : Math.min(Math.max(cloud / 100, 0), 0.8);
          const arrowLen = 11;
          const rad = ((dir - 90) * Math.PI) / 180;
          const x2 = x + Math.cos(rad) * arrowLen;
          const y2 = y + Math.sin(rad) * arrowLen;

          return (
            <g key={`${p.time}-${p.level}`}>
              <rect x={x - xStep / 2} y={y - yStep / 2} width={xStep} height={yStep} fill={windColor(speed)} opacity={0.4} />
              <rect x={x - xStep / 2} y={y - yStep / 2} width={xStep} height={yStep} fill="#fff" opacity={cloudAlpha} />
              {!isNaN(speed) && !isNaN(dir) && (
                <>
                  <line x1={x} y1={y} x2={x2} y2={y2} stroke="#ecf0f1" strokeWidth={1.3} />
                  <circle cx={x} cy={y} r={1.7} fill="#ecf0f1" />
                </>
              )}
              {!isNaN(speed) && (
                <text x={x} y={y + 11} fill="#ecf0f1" fontSize={9} textAnchor="middle">
                  {Math.round(speed)}
                </text>
              )}
              {!isNaN(cloud) && (
                <text x={x} y={y - 9} fill="#ecf0f1" fontSize={8} textAnchor="middle">
                  {Math.round(cloud)}%
                </text>
              )}
            </g>
          );
        })}
        {thermalBase !== null && (
          <>
            <ParapendioIcon
              x={padL + w * 0.12}
              y={padT + h - levels.indexOf(thermalBase) * yStep - 18}
            />
            <text
              x={padL + w * 0.12}
              y={padT + h - levels.indexOf(thermalBase) * yStep - 32}
              fill="#fff"
              fontSize={11}
              textAnchor="middle"
            >
              Base termiche ~ {thermalBase} m
            </text>
          </>
        )}
      </svg>

      <div className="flex items-center gap-6 mt-4 text-xs text-slate-400 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(90deg, #2ecc71, #f1c40f, #e67e22, #e74c3c)" }} />
          <span>Vento: verde ≤5 · giallo ≤10 · arancio ≤20 · rosso >20 km/h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white/80 border border-slate-500" />
          <span>Bianco opaco = copertura nuvole</span>
        </div>
        <div className="flex items-center gap-2">
          <span>➤ Freccia = direzione vento (da dove viene)</span>
        </div>
        {thermalBase !== null && (
          <div className="flex items-center gap-2 text-emerald-300">
            <span className="font-bold">✈ Base termiche: {thermalBase} m</span>
          </div>
        )}
      </div>
    </div>
  );
}