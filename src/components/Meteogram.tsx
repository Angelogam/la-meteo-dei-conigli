"use client";

import React, { useMemo, useState } from "react";
import { Sun, Wind, Thermometer, CloudRain, Cloud, ArrowUp, Gauge } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface MeteogramProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const MARGIN_LEFT = 14;
const MARGIN_RIGHT = 4;
const PANEL_HEIGHT = 38;
const SVG_W = 520;
const SVG_H = PANEL_HEIGHT * 7 + 16;

function windColor(speed: number, gust: number): string {
  const avg = (speed + gust) / 2;
  if (avg < 8) return "rgba(74, 222, 128, 0.6)";
  if (avg < 15) return "rgba(96, 165, 250, 0.6)";
  if (avg < 25) return "rgba(251, 191, 36, 0.6)";
  if (avg < 35) return "rgba(251, 146, 60, 0.6)";
  return "rgba(239, 68, 68, 0.7)";
}

function thermalColor(rateo: number): string {
  if (rateo < 1) return "#64748b";
  if (rateo < 2) return "#a3e635";
  if (rateo < 3.5) return "#4ade80";
  if (rateo < 5) return "#facc15";
  if (rateo < 7) return "#fb923c";
  return "#ef4444";
}

function thermalLabel(rateo: number): string {
  if (rateo < 1) return "Niente";
  if (rateo < 2) return "Deboli";
  if (rateo < 3.5) return "Medio";
  if (rateo < 5) return "Buone";
  if (rateo < 7) return "Forte";
  return "Molto Forte";
}

function dirArrow(deg: number): string {
  const arrows = ["↑ N", "↗ NE", "→ E", "↘ SE", "↓ S", "↙ SW", "← W", "↖ NW"];
  return arrows[Math.round(deg / 45) % 8];
}

export default function Meteogram({ dayData, altitude, selectedHour, onHourSelect }: MeteogramProps) {
  const data = useMemo(() => {
    return ORE.map(ora => {
      const h = dayData.find(d => d.time.getHours() === ora);
      if (!h) return null;
      const t = calcolaTermiche(h, altitude);
      return {
        ora,
        temp: Math.round(h.temperature),
        dew: Math.round(h.dewPoint),
        wind: Math.round(h.windSpeed),
        gust: Math.round(h.windGusts ?? h.windSpeed * 1.35),
        dir: h.windDir,
        dirStr: dirArrow(h.windDir),
        clouds: h.cloudCover,
        precip: h.precipitation,
        rateo: t.rateo,
        base: t.base,
        windColor: windColor(h.windSpeed, h.windGusts ?? h.windSpeed * 1.35),
        thermalColor: thermalColor(t.rateo),
        thermalLabel: thermalLabel(t.rateo),
        pressure: h.pressure ?? 1013,
      };
    }).filter(Boolean);
  }, [dayData, altitude]);

  if (!data.length) return null;

  const maxWind = Math.max(...data.map(d => Math.max(d.wind, d.gust)), 1);
  const maxRateo = Math.max(...data.map(d => d.rateo), 1);
  const maxPrecip = Math.max(...data.map(d => d.precip), 0.1);
  const maxClouds = Math.max(...data.map(d => d.clouds), 50);
  const tempMin = Math.min(...data.map(d => Math.min(d.temp, d.dew)));
  const tempMax = Math.max(...data.map(d => Math.max(d.temp, d.dew)));
  const tempRange = Math.max(tempMax - tempMin + 4, 10);

  const colW = (SVG_W - MARGIN_LEFT - MARGIN_RIGHT) / ORE.length;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  function scale(val: number, min: number, max: number, h: number): number {
    return (h - 4) - ((val - min) / (max - min)) * (h - 8);
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-sky-400" />
          <h3 className="text-white font-bold text-sm">Windgram — Andamento orario</h3>
        </div>
        <div className="text-[10px] text-slate-400">
          Alt: {altitude}m
        </div>
      </div>

      {/* SVG pannello principale */}
      <div className="overflow-x-auto -mx-2 p-1">
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="min-w-[500px]" preserveAspectRatio="xMidYMid meet">
          {/* COLONNE SFONDO */}
          {data.map((d, i) => {
            const x = MARGIN_LEFT + i * colW;
            const isHover = hoverIdx === i;
            const isSelected = d.ora === selectedHour;
            return (
              <g key={`bg-${i}`}>
                {(isHover || isSelected) && (
                  <rect
                    x={x} y={0} width={colW} height={SVG_H}
                    fill={isSelected ? "rgba(251, 191, 36, 0.06)" : "rgba(255,255,255,0.015)"}
                    rx={1}
                  />
                )}
                {isSelected && (
                  <line x1={x + colW / 2} y1={0} x2={x + colW / 2} y2={SVG_H} stroke="rgba(251, 191, 36, 0.15)" strokeWidth={0.5} />
                )}
              </g>
            );
          })}

          {[0, 1, 2, 3, 4, 5, 6].map(panel => {
            const y0 = panel * PANEL_HEIGHT + 2;
            const label = ["VENTO", "TERMICHE", "TEMP & DEW", "NUVOLE", "PIOGGIA", "BASE", "COPERTURA"][panel];

            return (
              <g key={panel}>
                {/* Label */}
                <text x={2} y={y0 + PANEL_HEIGHT / 2 + 1} fill="#475569" fontSize={3} fontWeight={700}>{label}</text>
                {/* Linea separatrice */}
                <line x1={MARGIN_LEFT - 2} y1={y0 + PANEL_HEIGHT - 2} x2={SVG_W} y2={y0 + PANEL_HEIGHT - 2} stroke="rgba(100,116,139,0.15)" strokeWidth={0.3} />

                {/* PANEL 0: VENTO */}
                {panel === 0 && data.map((d, i) => {
                  const x = MARGIN_LEFT + i * colW + colW / 2;
                  const barW = Math.max(colW * 0.45, 8);
                  const maxH = PANEL_HEIGHT - 10;
                  const h = (d.wind / maxWind) * maxH;
                  const gh = (d.gust / maxWind) * maxH;
                  return (
                    <g key={`v-${i}`}>
                      {/* Barra vento */}
                      <rect
                        x={x - barW / 2} y={y0 + PANEL_HEIGHT - 5 - h}
                        width={barW} height={h} rx={1.5}
                        fill={d.windColor}
                      />
                      {/* Linea raffica */}
                      <line
                        x1={x} y1={y0 + PANEL_HEIGHT - 5 - gh}
                        x2={x} y2={y0 + PANEL_HEIGHT - 5}
                        stroke="#f97316" strokeWidth={0.6} strokeDasharray="2,1.5"
                      />
                      <circle cx={x} cy={y0 + PANEL_HEIGHT - 5 - gh} r={1} fill="#f97316" />
                      {/* Valore vento */}
                      <text x={x} y={y0 + PANEL_HEIGHT - 6 - h} fill="#93c5fd" fontSize={3.2} textAnchor="middle" fontWeight={700}>
                        {d.wind}
                      </text>
                      {/* Temperatura su vento */}
                      <text x={x} y={y0 + PANEL_HEIGHT - 6 - h - 3.5} fill="#fbbf24" fontSize={3} textAnchor="middle" fontWeight={600}>
                        {d.temp}°
                      </text>
                      {/* Direzione */}
                      <text x={x} y={y0 + PANEL_HEIGHT - 1} fill="#64748b" fontSize={2.3} textAnchor="middle">
                        {d.dirStr}
                      </text>
                    </g>
                  );
                })}

                {/* PANEL 1: TERMICHE */}
                {panel === 1 && data.map((d, i) => {
                  const x = MARGIN_LEFT + i * colW + colW / 2;
                  const barW = Math.max(colW * 0.5, 10);
                  const maxH = PANEL_HEIGHT - 10;
                  const h = maxRateo > 0 ? (d.rateo / maxRateo) * maxH : 2;
                  return (
                    <g key={`t-${i}`}>
                      <rect
                        x={x - barW / 2} y={y0 + PANEL_HEIGHT - 5 - h}
                        width={barW} height={h} rx={1.5}
                        fill={d.thermalColor} opacity={0.75}
                      />
                      <text x={x} y={y0 + PANEL_HEIGHT - 6 - h} fill={d.thermalColor} fontSize={3} textAnchor="middle" fontWeight={800}>
                        {d.rateo.toFixed(1)}
                      </text>
                      <text x={x} y={y0 + PANEL_HEIGHT - 1.5} fill="#475569" fontSize={2.2} textAnchor="middle">
                        {d.thermalLabel}
                      </text>
                    </g>
                  );
                })}

                {/* PANEL 2: TEMPERATURA + DEW POINT */}
                {panel === 2 && (
                  <>
                    <polyline
                      fill="none" stroke="#fbbf24" strokeWidth={0.8}
                      points={data.map((d, i) => {
                        const x = MARGIN_LEFT + i * colW + colW / 2;
                        const y = y0 + scale(d.temp, tempMin, tempMax, PANEL_HEIGHT - 4);
                        return `${x},${y}`;
                      }).join(" ")}
                    />
                    {data.map((d, i) => {
                      const x = MARGIN_LEFT + i * colW + colW / 2;
                      const y = y0 + scale(d.temp, tempMin, tempMax, PANEL_HEIGHT - 4);
                      return <circle key={`tp-${i}`} cx={x} cy={y} r={1} fill="#fbbf24" stroke="rgba(0,0,0,0.3)" strokeWidth={0.2} />;
                    })}
                    <polyline
                      fill="none" stroke="#38bdf8" strokeWidth={0.6} strokeDasharray="2.5,2"
                      points={data.map((d, i) => {
                        const x = MARGIN_LEFT + i * colW + colW / 2;
                        const y = y0 + scale(d.dew, tempMin, tempMax, PANEL_HEIGHT - 4);
                        return `${x},${y}`;
                      }).join(" ")}
                    />
                    {data.map((d, i) => {
                      const x = MARGIN_LEFT + i * colW + colW / 2;
                      const y = y0 + scale(d.dew, tempMin, tempMax, PANEL_HEIGHT - 4);
                      return <circle key={`dw-${i}`} cx={x} cy={y} r={0.7} fill="#38bdf8" />;
                    })}
                    {data.map((d, i) => {
                      const x = MARGIN_LEFT + i * colW + colW / 2;
                      const yT = y0 + scale(d.temp, tempMin, tempMax, PANEL_HEIGHT - 4);
                      const yD = y0 + scale(d.dew, tempMin, tempMax, PANEL_HEIGHT - 4);
                      return (
                        <g key={`tl-${i}`}>
                          <text x={x + colW * 0.35} y={yT + 1.5} fill="#fbbf24" fontSize={2.5} fontWeight={600}>{d.temp}°</text>
                          <text x={x + colW * 0.35} y={yD + 1.5} fill="#38bdf8" fontSize={2.3}>{d.dew}°</text>
                        </g>
                      );
                    })}
                  </>
                )}

                {/* PANEL 3: COPERTURA NUVOLE */}
                {panel === 3 && data.map((d, i) => {
                  const x = MARGIN_LEFT + i * colW + colW / 2;
                  const barW = Math.max(colW * 0.4, 7);
                  const maxH = PANEL_HEIGHT - 10;
                  const h = (d.clouds / 100) * maxH;
                  const opacity = 0.2 + (d.clouds / 100) * 0.5;
                  return (
                    <g key={`cl-${i}`}>
                      <rect x={x - barW / 2} y={y0 + PANEL_HEIGHT - 5 - h} width={barW} height={h} rx={1} fill="rgba(148,163,184,0.4)" opacity={opacity} />
                      <text x={x} y={y0 + PANEL_HEIGHT - 6 - h} fill="#94a3b8" fontSize={2.8} textAnchor="middle" fontWeight={600}>
                        {d.clouds}%
                      </text>
                    </g>
                  );
                })}

                {/* PANEL 4: PIOGGIA */}
                {panel === 4 && (
                  <>
                    {data.map((d, i) => {
                      const x = MARGIN_LEFT + i * colW + colW / 2;
                      const barW = Math.max(colW * 0.35, 6);
                      const maxH = PANEL_HEIGHT - 10;
                      const h = maxPrecip > 0 ? (d.precip / maxPrecip) * maxH : 0;
                      if (d.precip <= 0) return null;
                      return (
                        <g key={`pr-${i}`}>
                          <rect x={x - barW / 2} y={y0 + PANEL_HEIGHT - 5 - h} width={barW} height={h} rx={1} fill="rgba(56,189,248,0.5)" />
                          <text x={x} y={y0 + PANEL_HEIGHT - 6 - h} fill="#7dd3fc" fontSize={2.8} textAnchor="middle" fontWeight={600}>
                            {d.precip.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}
                    {data.every(d => d.precip === 0) && (
                      <text x={SVG_W / 2 + 10} y={y0 + PANEL_HEIGHT / 2} fill="#475569" fontSize={3} textAnchor="middle">Nessuna precipitazione</text>
                    )}
                  </>
                )}

                {/* PANEL 5: BASE NUVOLE */}
                {panel === 5 && data.map((d, i) => {
                  const x = MARGIN_LEFT + i * colW + colW / 2;
                  const barW = Math.max(colW * 0.4, 7);
                  const maxH = PANEL_HEIGHT - 10;
                  const maxBase = Math.max(...data.map(dd => dd.base), 1000);
                  const h = (d.base / maxBase) * maxH;
                  return (
                    <g key={`cb-${i}`}>
                      <rect x={x - barW / 2} y={y0 + PANEL_HEIGHT - 5 - h} width={barW} height={h} rx={1} fill="rgba(168,85,247,0.35)" />
                      <text x={x} y={y0 + PANEL_HEIGHT - 6 - h} fill="#a78bfa" fontSize={2.8} textAnchor="middle" fontWeight={600}>
                        {d.base}
                      </text>
                    </g>
                  );
                })}

                {/* PANEL 6: ORARIO selezionabile */}
                {panel === 6 && data.map((d, i) => {
                  const x = MARGIN_LEFT + i * colW + colW / 2;
                  const isSelected = d.ora === selectedHour;
                  return (
                    <g
                      key={`hr-${i}`}
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx(null)}
                      onClick={() => onHourSelect(d.ora)}
                      style={{ cursor: "pointer" }}
                    >
                      <rect x={x - colW / 2} y={y0 + 2} width={colW} height={PANEL_HEIGHT - 4} fill={isSelected ? "rgba(251,191,36,0.08)" : "transparent"} rx={2} />
                      <text x={x} y={y0 + PANEL_HEIGHT / 2 + 1} fill={isSelected ? "#fbbf24" : "#64748b"} fontSize={4} textAnchor="middle" fontWeight={isSelected ? 900 : 500}>
                        {d.ora}:00
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tabella dati ora selezionata */}
      {data.filter(d => d.ora === selectedHour).map(current => (
        <div key={`detail-${current.ora}`} className="border-t border-slate-700/30 px-3 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-amber-300 font-black text-sm">Ore {current.ora}:00</span>
            <span className="text-[10px] text-slate-500">— Dettaglio</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Temperatura</div>
              <div className="text-sm font-bold text-amber-300">{current.temp}°C</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Dew point</div>
              <div className="text-sm font-bold text-sky-300">{current.dew}°C</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Vento / Raffica</div>
              <div className="text-sm font-bold text-sky-300">{current.wind}/{current.gust} <span className="text-[9px] text-slate-400">km/h</span></div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Direzione</div>
              <div className="text-sm font-bold text-slate-200">{current.dirStr}</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Termiche</div>
              <div className="text-sm font-bold" style={{ color: current.thermalColor }}>{current.rateo.toFixed(1)} m/s</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Nuvole / Base</div>
              <div className="text-sm font-bold text-slate-200">{current.clouds}% / {current.base}m</div>
            </div>
          </div>
          {/* Mini pulsanti ore */}
          <div className="flex flex-wrap gap-1 mt-2 justify-center">
            {ORE.map(ora => (
              <button
                key={ora}
                onClick={() => onHourSelect(ora)}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  ora === selectedHour
                    ? "bg-amber-500/30 text-amber-300 border border-amber-400/40 scale-105"
                    : "bg-slate-700/40 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                {ora}:00
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}