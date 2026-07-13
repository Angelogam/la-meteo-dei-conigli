"use client";

import React, { useMemo } from "react";
import { ArrowUp, Wind } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface MeteogramProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const SVG_W = 600;
const SVG_H = 380;
const ML = 44;
const MR = 8;
const MT = 20;
const MB = 20;

function thermalColor(r: number): string {
  if (r < 1) return "#64748b";
  if (r < 2) return "#a3e635";
  if (r < 3.5) return "#4ade80";
  if (r < 5) return "#facc15";
  if (r < 7) return "#fb923c";
  return "#ef4444";
}

function dirStr(deg: number): string {
  return ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg / 45) % 8];
}

export default function Meteogram({ dayData, altitude, selectedHour, onHourSelect }: MeteogramProps) {
  const data = useMemo(() => {
    return ORE.map(ora => {
      const h = dayData.find(d => d.time.getHours() === ora);
      if (!h) return null;
      const t = calcolaTermiche(h, altitude);
  
      const spread = h.temperature - h.dewPoint;
      const LCL = Math.max(200, Math.min(3000, spread * 125));
  
      // top realistico: base + (rateo * 400)
      const topReale = Math.min(5000, LCL + t.rateo * 400);
      const cloudDepth = Math.max(0, topReale - LCL);
  
      return {
        ora,
        temp: Math.round(h.temperature),
        dew: Math.round(h.dewPoint),
        wind: Math.round(h.windSpeed),
        gust: Math.round(h.windGusts ?? h.windSpeed * 1.35),
        dir: h.windDir,
        dirStr: dirStr(h.windDir),
        clouds: h.cloudCover,
        precip: h.precipitation,
        rateo: t.rateo,
        base: LCL,
        top: Math.round(topReale),
        cloudDepth: Math.round(cloudDepth),
        thermalColor: thermalColor(t.rateo),
      };
    }).filter(Boolean);
  }, [dayData, altitude]);

  if (!data.length) return null;

  const maxQuota = Math.max(...data.map(d => d.top + d.cloudDepth + 200), 3000);
  const colW = (SVG_W - ML - MR) / ORE.length;
  const plotH = SVG_H - MT - MB;

  const yScale = (alt: number) => MT + plotH - (alt / maxQuota) * plotH;
  const y0 = yScale(0);
  const maxY = yScale(maxQuota);

  // quote etichette Y
  const step = Math.ceil(maxQuota / 400) * 100;
  const yTicks: number[] = [];
  for (let q = 0; q <= maxQuota; q += step) yTicks.push(q);

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-700/30">
        <ArrowUp className="w-4 h-4 text-amber-400" />
        <span className="text-white font-bold text-sm">Sviluppo termico</span>
        <span className="text-[10px] text-slate-500 ml-auto">{altitude}m slm</span>
      </div>

      {/* SVG */}
      <div className="overflow-x-auto p-2">
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="min-w-[580px]" preserveAspectRatio="xMidYMid meet">
          {/* Griglia Y */}
          {yTicks.map(q => {
            const y = yScale(q);
            return (
              <g key={`g-${q}`}>
                <line x1={ML} y1={y} x2={SVG_W - MR} y2={y} stroke="rgba(100,116,139,0.1)" strokeWidth={0.4} />
                <text x={ML - 2} y={y + 1} fill="#475569" fontSize={3} textAnchor="end">
                  {q >= 1000 ? (q / 1000).toFixed(0) + "k" : q}
                </text>
              </g>
            );
          })}
          <line x1={ML} y1={y0} x2={SVG_W - MR} y2={y0} stroke="rgba(100,116,139,0.4)" strokeWidth={0.6} />

          {/* Colonna per ogni ora */}
          {data.map((d, i) => {
            const x = ML + i * colW + colW / 2;
            const isSel = d.ora === selectedHour;

            const yBase = yScale(d.base);
            const yTop = yScale(d.top);
            const yCloud = yScale(d.top + d.cloudDepth);
            const barL = colW * 0.2;
            const barR = colW * 0.2;

            const numUps = Math.floor((y0 - yBase) / 14);

            return (
              <g
                key={d.ora}
                onClick={() => onHourSelect(d.ora)}
                style={{ cursor: "pointer" }}
              >
                {/* Sfondo hover/selected */}
                {isSel && (
                  <rect x={ML + i * colW} y={MT} width={colW} height={plotH} fill="rgba(251,191,36,0.06)" rx={2} />
                )}

                {isSel && (
                  <line x1={x} y1={maxY} x2={x} y2={y0 + 2} stroke="rgba(251,191,36,0.2)" strokeWidth={0.5} />
                )}

                {/* COLONNA ASCENSIONALE (adiabatica secca) */}
                <rect
                  x={x - barL / 2} y={yBase} width={barL} height={y0 - yBase}
                  fill="rgba(251,191,36,0.04)"
                  rx={1}
                />

                {/* FRECCE SALITA */}
                {Array.from({ length: numUps }).map((_, fi) => {
                  const fy = y0 - fi * 14 - 6;
                  if (fy <= yBase) return null;
                  return (
                    <polygon
                      key={`up-${i}-${fi}`}
                      points={`${x-1.5},${fy+3} ${x+1.5},${fy+3} ${x},${fy-2}`}
                      fill={d.thermalColor}
                      opacity={0.3 + (d.rateo / 8) * 0.5}
                    />
                  );
                })}

                {/* BASE DI CONDENSA */}
                <line
                  x1={x - colW * 0.3} y1={yBase} x2={x + colW * 0.3} y2={yBase}
                  stroke={d.thermalColor} strokeWidth={0.8} strokeDasharray="3,2"
                />
                <text x={x + colW * 0.32} y={yBase + 1.5} fill={d.thermalColor} fontSize={2.5} fontWeight={700}>
                  {d.base}
                </text>

                {/* CUMULO */}
                {d.cloudDepth > 30 && (
                  <>
                    <rect
                      x={x - barR / 2} y={yCloud} width={barR} height={yBase - yCloud}
                      fill="rgba(148,163,184,0.35)" rx={2}
                    />
                    <ellipse cx={x} cy={yCloud + 3} rx={barR / 2 + 2} ry={5} fill="rgba(148,163,184,0.5)" />
                    <text x={x} y={yCloud - 1} fill="#94a3b8" fontSize={2.5} textAnchor="middle">
                      {d.cloudDepth > 500 ? (d.cloudDepth / 1000).toFixed(1) + "km" : d.cloudDepth + "m"}
                    </text>
                  </>
                )}

                {/* PALLINO TERMICA */}
                <circle cx={x} cy={yBase - 5} r={3} fill={d.thermalColor} stroke="#1e293b" strokeWidth={0.3} />
                <text x={x} y={yBase - 6.5} fill="#fff" fontSize={2.8} textAnchor="middle" fontWeight={900}>
                  {d.rateo.toFixed(1)}
                </text>

                {/* VENTO */}
                <rect
                  x={x - 7} y={y0 + 2} width={14} height={5} rx={1.5}
                  fill={
                    d.wind < 8 ? "rgba(74,222,128,0.6)" :
                    d.wind < 15 ? "rgba(96,165,250,0.6)" :
                    d.wind < 25 ? "rgba(251,191,36,0.6)" :
                    d.wind < 35 ? "rgba(251,146,60,0.6)" : "rgba(239,68,68,0.6)"
                  }
                />
                <text x={x} y={y0 + 8} fill="#64748b" fontSize={2.3} textAnchor="middle">
                  {d.dirStr} {d.wind}
                </text>

                {/* ORA */}
                <text x={x} y={y0 + 16} fill={isSel ? "#fbbf24" : "#64748b"} fontSize={3.2} textAnchor="middle" fontWeight={isSel ? 800 : 500}>
                  {d.ora}:00
                </text>
              </g>
            );
          })}

          {/* Legenda */}
          <g transform={`translate(${ML + 4}, ${SVG_H - MB + 4})`}>
            <text x={0} y={2} fill="#475569" fontSize={2.5}>Termiche:</text>
            {[
              { c: "#a3e635", l: "Deb." },
              { c: "#4ade80", l: "Mod." },
              { c: "#facc15", l: "Buon." },
              { c: "#fb923c", l: "Fort." },
              { c: "#ef4444", l: "X" },
            ].map((leg, li) => (
              <g key={`l-${li}`} transform={`translate(${li * 28 + 30}, 0)`}>
                <rect x={0} y={0} width={5} height={5} rx={1} fill={leg.c} />
                <text x={6} y={4} fill="#475569" fontSize={2.3}>{leg.l}</text>
              </g>
            ))}
            <line x1={170} y1={2} x2={180} y2={2} stroke="#94a3b8" strokeWidth={0.6} strokeDasharray="3,2" />
            <text x={183} y={4} fill="#475569" fontSize={2.3}>Base</text>
          </g>
        </svg>
      </div>

      {/* Tabellina compatta */}
      {data.filter(d => d.ora === selectedHour).map(c => (
        <div key={`det-${c.ora}`} className="border-t border-slate-700/30 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300 flex-wrap">
            <span className="text-amber-300 font-bold text-xs">{c.ora}:00</span>
            <span className="text-slate-500">|</span>
            <span>T {c.temp}°</span>
            <span className="text-sky-400">Dew {c.dew}°</span>
            <span className="text-slate-500">|</span>
            <span className="font-bold" style={{ color: c.thermalColor }}>{c.rateo.toFixed(1)} m/s</span>
            <span className="text-slate-500">|</span>
            <span>Base {c.base}m</span>
            <span className="text-slate-500">|</span>
            <span>Top {c.top}m</span>
            <span className="text-slate-500">|</span>
            <span>{c.dirStr} {c.wind}/{c.gust} km/h</span>
          </div>
          <div className="flex gap-1 mt-1">
            {ORE.map(ora => (
              <button
                key={ora}
                onClick={() => onHourSelect(ora)}
                className={`px-1 py-0.5 rounded text-[9px] font-bold transition-all ${
                  ora === selectedHour ? "bg-amber-500/30 text-amber-300" : "bg-slate-700/40 text-slate-500 hover:text-slate-300"
                }`}
              >
                {ora}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}