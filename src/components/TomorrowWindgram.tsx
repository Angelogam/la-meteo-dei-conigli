in JSX legend">
"use client";

import React, { useEffect, useState } from "react";

const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_KEY || "EBox6MVYAysc2A5X5EOhVgKeaDuFg4Pk";

export type Decollo = {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
};

export type WindgramPoint = {
  time: string;
  level: number;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  cloudCover: number;
};

interface TomorrowWindgramProps {
  decollo: Decollo;
}

async function fetchWindgramData(lat: number, lon: number): Promise<WindgramPoint[]> {
  const levels = ["surface", "100m", "500m", "1000m", "1500m", "2000m", "2500m", "3000m", "3500m"];

  const url =
    `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}` +
    `&fields=windSpeed,windDirection,temperature,cloudCover` +
    `&timesteps=1h&levels=${levels.join(",")}` +
    `&units=metric&apikey=${TOMORROW_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Errore Tomorrow.io Windgram");
  const data = await res.json();

  const timeline = data.data?.timelines?.[0]?.intervals ?? [];
  const result: WindgramPoint[] = [];

  for (const interval of timeline) {
    const time = interval.startTime;
    const values = interval.values || {};
    for (const level of levels) {
      const levelMeters = level === "surface" ? 0 : parseInt(level.replace("m", ""), 10);
      result.push({
        time,
        level: levelMeters,
        windSpeed: values.windSpeed?.[level] ?? NaN,
        windDirection: values.windDirection?.[level] ?? NaN,
        temperature: values.temperature?.[level] ?? NaN,
        cloudCover: values.cloudCover?.[level] ?? NaN
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

function computeThermalBase(points: WindgramPoint[]): number | null {
  const byLevel: Record<number, WindgramPoint[]> = {};
  for (const p of points) {
    if (!byLevel[p.level]) byLevel[p.level] = [];
    byLevel[p.level].push(p);
  }
  const levels = Object.keys(byLevel).map(l => parseInt(l, 10)).sort((a, b) => a - b);
  for (const level of levels) {
    if (level < 300) continue;
    const arr = byLevel[level];
    const avgTemp =
      arr.reduce((s, p) => s + (isNaN(p.temperature) ? 0 : p.temperature), 0) / arr.length;
    const avgCloud =
      arr.reduce((s, p) => s + (isNaN(p.cloudCover) ? 0 : p.cloudCover), 0) / arr.length;
    if (avgTemp >= 15 && avgCloud <= 60) return level;
  }
  return null;
}

const ParapendioIcon: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <path d="M -10 0 Q 0 -10 10 0" fill="none" stroke="#ffffff" strokeWidth={2} />
    <line x1={-5} y1={0} x2={-2} y2={8} stroke="#ffffff" strokeWidth={1.5} />
    <line x1={5} y1={0} x2={2} y2={8} stroke="#ffffff" strokeWidth={1.5} />
    <circle cx={0} cy={10} r={2} fill="#ffffff" />
  </g>
);

export default function TomorrowWindgram({ decollo }: TomorrowWindgramProps) {
  const [data, setData] = useState<WindgramPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetchWindgramData(decollo.lat, decollo.lon);
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setError(e.message || "Errore windgram");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [decollo.lat, decollo.lon]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Caricamento Windgram Tomorrow.io per {decollo.name}...</p>
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

  const times = Array.from(new Set(data.map(d => d.time))).sort();
  const levels = Array.from(new Set(data.map(d => d.level))).sort((a, b) => a - b);

  const width = 900;
  const height = 520;
  const paddingLeft = 70;
  const paddingBottom = 45;
  const paddingTop = 35;
  const paddingRight = 20;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const xStep = innerWidth / Math.max(times.length - 1, 1);
  const yStep = innerHeight / Math.max(levels.length - 1, 1);

  const thermalBase = computeThermalBase(data);

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          Windgram Tomorrow.io – {decollo.name} ({decollo.lat.toFixed(3)}, {decollo.lon.toFixed(3)}) – Quota decollo {decollo.elevation} m
        </h3>
        <span className="text-xs text-slate-400">Dati: windSpeed, windDirection, temperature, cloudCover · Livelli: surface → 3500m</span>
      </div>

      <svg width={width} height={height} style={{ background: "#1e293b", borderRadius: "8px" }}>
        {/* Assi quota */}
        {levels.map((level, i) => {
          const y = paddingTop + innerHeight - i * yStep;
          return (
            <g key={level}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#334155"
                strokeWidth={0.6}
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                fill="#94a3b8"
                fontSize={10}
                textAnchor="end"
              >
                {level} m
              </text>
            </g>
          );
        })}

        {/* Assi tempo */}
        {times.map((t, idx) => {
          const x = paddingLeft + idx * xStep;
          const date = new Date(t);
          const h = date.getHours();
          return (
            <g key={t}>
              <line
                x1={x}
                y1={paddingTop}
                x2={x}
                y2={height - paddingBottom}
                stroke="#334155"
                strokeWidth={0.4}
              />
              <text
                x={x}
                y={height - paddingBottom + 14}
                fill="#94a3b8"
                fontSize={10}
                textAnchor="middle"
              >
                {h}h
              </text>
            </g>
          );
        })}

        {/* Celle vento + nuvole + valori */}
        {data.map((p) => {
          const timeIndex = times.indexOf(p.time);
          const levelIndex = levels.indexOf(p.level);
          if (timeIndex < 0 || levelIndex < 0) return null;

          const x = paddingLeft + timeIndex * xStep;
          const y = paddingTop + innerHeight - levelIndex * yStep;

          const speed = p.windSpeed;
          const dir = p.windDirection;
          const cloud = p.cloudCover;

          const cellColor = windColor(speed);
          const cloudAlpha = isNaN(cloud) ? 0 : Math.min(Math.max(cloud / 100, 0), 0.8);

          const arrowLen = 11;
          const rad = (dir - 90) * (Math.PI / 180);
          const x2 = x + Math.cos(rad) * arrowLen;
          const y2 = y + Math.sin(rad) * arrowLen;

          return (
            <g key={`${p.time}-${p.level}`}>
              <rect
                x={x - xStep / 2}
                y={y - yStep / 2}
                width={xStep}
                height={yStep}
                fill={cellColor}
                opacity={0.4}
              />
              <rect
                x={x - xStep / 2}
                y={y - yStep / 2}
                width={xStep}
                height={yStep}
                fill="#ffffff"
                opacity={cloudAlpha}
              />
              {!isNaN(speed) && !isNaN(dir) && (
                <g>
                  <line
                    x1={x}
                    y1={y}
                    x2={x2}
                    y2={y2}
                    stroke="#ecf0f1"
                    strokeWidth={1.3}
                  />
                  <circle cx={x} cy={y} r={1.7} fill="#ecf0f1" />
                </g>
              )}
              {!isNaN(speed) && (
                <text
                  x={x}
                  y={y + 11}
                  fill="#ecf0f1"
                  fontSize={9}
                  textAnchor="middle"
                >
                  {Math.round(speed)}
                </text>
              )}
              {!isNaN(cloud) && (
                <text
                  x={x}
                  y={y - 9}
                  fill="#ecf0f1"
                  fontSize={8}
                  textAnchor="middle"
                >
                  {Math.round(cloud)}%
                </text>
              )}
            </g>
          );
        })}

        {/* Parapendio alla base termiche */}
        {thermalBase !== null && (
          <>
            <ParapendioIcon
              x={paddingLeft + innerWidth * 0.12}
              y={paddingTop + innerHeight - levels.indexOf(thermalBase) * yStep - 18}
            />
            <text
              x={paddingLeft + innerWidth * 0.12}
              y={paddingTop + innerHeight - levels.indexOf(thermalBase) * yStep - 32}
              fill="#ecf0f1"
              fontSize={11}
              textAnchor="middle"
            >
              Base termiche ~ {thermalBase} m
            </text>
          </>
        )}
      </svg>

      {/* Legenda */}
      <div className="flex items-center gap-6 mt-4 text-xs text-slate-400 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(90deg, #2ecc71, #f1c40f, #e67e22, #e74c3c)" }} />
          <span>Vento: verde ≤5 · giallo ≤10 · arancio ≤20 · rosso >20 km/h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white/80 border border-slate-500" />
          <span>Bianco opaco = copertura nuvole (più opaco = più nuvole)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>➤ Freccia = direzione vento (da dove viene)</span>
        </div>
        {thermalBase !== null && (
          <div className="flex items-center gap-2 text-emerald-300">
            <span className="font-bold">✈ Base termiche stimata: {thermalBase} m</span>
          </div>
        )}
      </div>
    </div>
  );
}