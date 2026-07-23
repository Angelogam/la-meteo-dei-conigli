"use client";

import React from "react";

interface WindCompassProps {
  windDir: number;
  windSpeed: number;
  gustSpeed?: number;
  size?: number;
}

export default function WindCompass({ windDir, windSpeed, gustSpeed, size = 120 }: WindCompassProps) {
  const getSpeedColor = (speed: number): string => {
    if (speed <= 5) return "#10b981";
    if (speed <= 10) return "#84cc16";
    if (speed <= 15) return "#eab308";
    if (speed <= 22) return "#f97316";
    if (speed <= 30) return "#ef4444";
    return "#dc2626";
  };

  const color = getSpeedColor(windSpeed);
  const center = size / 2;

  // Punti cardinali
  const labels = [
    { text: "N", angle: 0 }, { text: "NE", angle: 45 },
    { text: "E", angle: 90 }, { text: "SE", angle: 135 },
    { text: "S", angle: 180 }, { text: "SW", angle: 225 },
    { text: "O", angle: 270 }, { text: "NW", angle: 315 },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Cerchi concentrici */}
        <circle cx={center} cy={center} r={center - 8} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
        <circle cx={center} cy={center} r={(center - 8) * 0.7} fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
        <circle cx={center} cy={center} r={(center - 8) * 0.4} fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />

        {/* Punti cardinali */}
        {labels.map((l) => {
          const rad = (l.angle * Math.PI) / 180 - Math.PI / 2;
          const r = center - 8;
          const x = center + r * 0.82 * Math.cos(rad);
          const y = center + r * 0.82 * Math.sin(rad);
          const isN = l.text === "N";
          return (
            <text
              key={l.text}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={isN ? "fill-red-400 text-[10px] font-bold" : "fill-slate-500 text-[8px] font-bold"}
            >
              {l.text}
            </text>
          );
        })}

        {/* Freccia vento */}
        <g
          transform={`rotate(${windDir}, ${center}, ${center})`}
          style={{ transition: "transform 0.5s ease-out" }}
        >
          <polygon
            points={`${center},${center - (center - 12)} ${center - 6},${center} ${center},${center + 10} ${center + 6},${center}`}
            fill={color}
            stroke="white"
            strokeWidth="1.5"
            className="drop-shadow-lg"
          />
          <circle cx={center} cy={center} r="4" fill="white" stroke={color} strokeWidth="2" />
        </g>
      </svg>

      {/* Dati numerici */}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-lg font-extrabold text-white tabular-nums">{Math.round(windSpeed)}</span>
        <span className="text-[10px] text-slate-500">km/h</span>
        {gustSpeed != null && gustSpeed > windSpeed && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-sm font-bold text-red-300">{Math.round(gustSpeed)}</span>
            <span className="text-[9px] text-slate-500">raffica</span>
          </>
        )}
      </div>
    </div>
  );
}