"use client";

import React from "react";

interface RadarChartProps {
  values: { label: string; value: number; max: number }[];
  size?: number;
}

export default function RadarChart({ values, size = 200 }: RadarChartProps) {
  if (!values || values.length < 3) return null;

  const center = size / 2;
  const radius = center - 20;
  const angleStep = (Math.PI * 2) / values.length;

  const getPoint = (index: number, value: number, max: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / max) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const points = values.map((v, i) => getPoint(i, v.value, v.max));
  const polygonPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      {/* Griglia di fondo */}
      {[0.25, 0.5, 0.75, 1].map((level, li) => {
        const gridPoints = values.map((_, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const r = level * radius;
          return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
        });
        const gridPath = gridPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
        return (
          <path
            key={li}
            d={gridPath}
            fill="none"
            stroke="rgba(148, 163, 184, 0.15)"
            strokeWidth="1"
          />
        );
      })}

      {/* Linee radiali */}
      {values.map((_, i) => {
        const end = getPoint(i, 1, 1);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={end.x}
            y2={end.y}
            stroke="rgba(148, 163, 184, 0.15)"
            strokeWidth="1"
          />
        );
      })}

      {/* Area riempita */}
      <path d={polygonPath} fill="rgba(16, 185, 129, 0.25)" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="2" />

      {/* Punti */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="#fff" strokeWidth="2" className="drop-shadow" />
      ))}

      {/* Label */}
      {values.map((v, i) => {
        const labelPoint = getPoint(i, 1.25, 1);
        return (
          <text
            key={i}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-300 text-[10px] font-bold"
          >
            {v.label}
          </text>
        );
      })}
    </svg>
  );
}