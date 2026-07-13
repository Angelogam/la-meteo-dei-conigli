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
const SVG_W = 580;
const SVG_H = 320;
const MARGIN_L = 36;
const MARGIN_R = 12;
const MARGIN_TOP = 16;
const MARGIN_BOT = 24;

function thermalColor(v: number): string {
  if (v < 0.5) return "#64748b";
  if (v < 1.5) return "#a3e635";
  if (v < 3) return "#4ade80";
  if (v < 4.5) return "#facc15";
  if (v < 6.5) return "#fb923c";
  return "#ef4444";
}

function cloudColor(cover: number): string {
  if (cover < 10) return "rgba(148,163,184,0.05)";
  if (cover < 30) return "rgba(148,163,184,0.2)";
  if (cover < 50) return "rgba(148,163,184,0.4)";
  if (cover < 75) return "rgba(148,163,184,0.6)";
  return "rgba(148,163,184,0.8)";
}

function thermalLabel(v: number): string {
  if (v < 0.5) return "Nulla";
  if (v < 1.5) return "Debole";
  if (v < 3) return "Media";
  if (v < 4.5) return "Buona";
  if (v < 6.5) return "Forte";
  return "Fortiss.";
}

// Stima delta adiabatica secca: 1°C ogni 100m
function getCloudDepth(temp: number, dew: number, base: number): number {
  const delta = temp - dew;
  const LCL = delta * 125; // stima sollevamento a base nuvole
  const cloudTop = base + LCL * 3; // stima sviluppo cumulo (semplicistica)
  return Math.max(0, cloudTop - base);
}

export default function Meteogram({ dayData, altitude, selectedHour, onHourSelect }: MeteogramProps) {
  const data = useMemo(() => {
    return ORE.map(ora => {
      const h = dayData.find(d => d.time.getHours() === ora);
      if (!h) return null;
      const t = calcolaTermiche(h, altitude);
      const cloudDepth = getCloudDepth(h.temperature, h.dewPoint, t.base);
      return {
        ora,
        temp: Math.round(h.temperature),
        dew: Math.round(h.dewPoint),
        wind: Math.round(h.windSpeed),
        gust: Math.round(h.windGusts ?? h.windSpeed * 1.35),
        dir: h.windDir,
        dirStr: ["↑ N","↗ NE","→ E","↘ SE","↓ S","↙ SW","← W","↖ NW"][Math.round(h.windDir / 45) % 8],
        clouds: h.cloudCover,
        precip: h.precipitation,
        rateo: t.rateo,
        base: Math.round(t.base),
        top: Math.round(t.top),
        cloudDepth: Math.round(cloudDepth),
        pressure: h.pressure ?? 1013,
        termicaColore: thermalColor(t.rateo),
        termicaLabel: thermalLabel(t.rateo),
      };
    }).filter(Boolean);
  }, [dayData, altitude]);

  // --- sezione principale: grafico termiche + nuvole + colonne ---
  // Disegno un grafico che mostra:
  // - Asse Y: quota (da 0 a top max)
  // - Asse X: ore
  // - Per ogni ora: colonna d'aria che sale, base cumulo, spessore cumulo, vento

  if (!data.length) return null;

  const maxTop = Math.max(...data.map(d => d.top), 2000);
  const maxWind = Math.max(...data.map(d => d.wind), 1);
  const maxGust = Math.max(...data.map(d => d.gust), 1);
  const maxWindAll = Math.max(maxWind, maxGust);

  const colW = (SVG_W - MARGIN_L - MARGIN_R) / ORE.length;
  const plotH = SVG_H - MARGIN_TOP - MARGIN_BOT;

  const yScale = (alt: number) => MARGIN_TOP + plotH - (alt / maxTop) * plotH;

  // Etichette Y (quota)
  const yTicks = [];
  const step = Math.ceil(maxTop / 500) * 100;
  for (let q = 0; q <= maxTop; q += step) {
    yTicks.push(q);
  }

  const [hoverOra, setHoverOra] = useState<number | null>(null);

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <ArrowUp className="w-5 h-5 text-amber-400" />
          <h3 className="text-white font-bold text-sm">Sviluppo termico · {ORE[0]}:00 – {ORE[ORE.length-1]}:00</h3>
        </div>
        <div className="text-[10px] text-slate-400">Alt: {altitude}m</div>
      </div>

      {/* Grafico SVG */}
      <div className="overflow-x-auto -mx-2 p-1">
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="min-w-[580px]" preserveAspectRatio="xMidYMid meet">
          {/* Griglia orizzontale quote */}
          {yTicks.map(q => {
            const y = yScale(q);
            return (
              <g key={`yt-${q}`}>
                <line x1={MARGIN_L} y1={y} x2={SVG_W - MARGIN_R} y2={y} stroke="rgba(100,116,139,0.12)" strokeWidth={0.4} />
                <text x={MARGIN_L - 2} y={y + 1.5} fill="#475569" fontSize={2.8} textAnchor="end">
                  {q >= 1000 ? `${(q/1000).toFixed(0)}k` : q}
                </text>
              </g>
            );
          })}
          {/* Linea suolo */}
          <line x1={MARGIN_L} y1={yScale(0)} x2={SVG_W - MARGIN_R} y2={yScale(0)} stroke="rgba(100,116,139,0.4)" strokeWidth={0.6} />

          {/* Per ogni ora: colonna termica + nuvole */}
          {data.map((d, i) => {
            const x = MARGIN_L + i * colW + colW / 2;
            const isHover = hoverOra === d.ora;
            const isSelected = d.ora === selectedHour;

            const yBase = yScale(d.base);
            const yTop = yScale(d.top);
            const yCloudTop = yScale(d.top + d.cloudDepth);
            const yZero = yScale(0);

            return (
              <g
                key={`col-${i}`}
                onMouseEnter={() => setHoverOra(d.ora)}
                onMouseLeave={() => setHoverOra(null)}
                onClick={() => onHourSelect(d.ora)}
                style={{ cursor: "pointer" }}
              >
                {/* Sfondo selezione */}
                {(isHover || isSelected) && (
                  <rect x={MARGIN_L + i * colW} y={0} width={colW} height={SVG_H} fill={isSelected ? "rgba(251, 191, 36, 0.06)" : "rgba(255,255,255,0.015)"} />
                )}

                {/* Linea verticale centrale */}
                <line x1={x} y1={yZero} x2={x} y2={yScale(maxTop)} stroke="rgba(100,116,139,0.08)" strokeWidth={0.3} />

                {/* COLONNA D'ARIA CHE SALE (adiabatica secca) - dal suolo alla base */}
                <rect
                  x={x - 6}
                  y={yBase}
                  width={12}
                  height={yZero - yBase}
                  fill="rgba(251, 191, 36, 0.04)"
                  rx={2}
                />

                {/* FRECCE verso l'alto (corrente ascensionale) */}
                {Array.from({ length: Math.floor((yZero - yBase) / 20) }).map((_, fi) => {
                  const fy = yZero - fi * 20 - 8;
                  if (fy <= yBase) return null;
                  return (
                    <polygon
                      key={`up-${i}-${fi}`}
                      points={`${x-2},${fy+4} ${x+2},${fy+4} ${x},${fy-2}`}
                      fill={d.termicaColore}
                      opacity={0.25 + (d.rateo / 8) * 0.4}
                    />
                  );
                })}

                {/* BASE DI CONDENSA (linea tratteggiata) */}
                {d.base > 0 && (
                  <>
                    <line x1={x - 14} y1={yBase} x2={x + 14} y2={yBase} stroke={d.termicaColore} strokeWidth={0.8} strokeDasharray="2.5,1.5" />
                    <text x={x + 16} y={yBase + 1.5} fill={d.termicaColore} fontSize={2.5} fontWeight={600}>
                      {d.base}m
                    </text>
                  </>
                )}

                {/* SVILUPPO CUMULO (nuvola) - dalla base al top */}
                {d.cloudDepth > 50 && (
                  <>
                    {/* Corpo nuvola */}
                    <rect
                      x={x - 10}
                      y={yCloudTop}
                      width={20}
                      height={yBase - yCloudTop}
                      fill={cloudColor(d.clouds)}
                      rx={3}
                      opacity={0.6}
                    />
                    {/* Contorno nuvola - arrotondato sopra */}
                    <ellipse cx={x} cy={yCloudTop + 4} rx={12} ry={6} fill={cloudColor(d.clouds)} opacity={0.8} />
                    {/* Spessore */}
                    <text x={x} y={yCloudTop - 2} fill="#94a3b8" fontSize={2.5} textAnchor="middle" fontWeight={600}>
                      {d.cloudDepth > 500 ? `${(d.cloudDepth/1000).toFixed(1)}km` : `${d.cloudDepth}m`}
                    </text>
                  </>
                )}

                {/* INDICATORE TERMICA (pallino + valore) sulla colonna */}
                <circle cx={x} cy={yBase - 6} r={3.5} fill={d.termicaColore} stroke="#1e293b" strokeWidth={0.4} />
                <text x={x} y={yBase - 8} fill="#fff" fontSize={2.8} textAnchor="middle" fontWeight={900}>
                  {d.rateo.toFixed(1)}
                </text>

                {/* VENTO: barra orizzontale al suolo */}
                {d.wind > 0 && (
                  <>
                    <rect
                      x={x - 8}
                      y={yZero + 2}
                      width={16}
                      height={6}
                      rx={1.5}
                      fill={d.wind < 8 ? "rgba(74,222,128,0.5)" : d.wind < 15 ? "rgba(96,165,250,0.5)" : d.wind < 25 ? "rgba(251,191,36,0.5)" : d.wind < 35 ? "rgba(251,146,60,0.5)" : "rgba(239,68,68,0.5)"}
                    />
                    <text x={x} y={yZero + 10} fill="#64748b" fontSize={2.5} textAnchor="middle">{d.dirStr} {d.wind}</text>
                  </>
                )}

                {/* ETICHETTA ORA in fondo */}
                <text x={x} y={yZero + 18} fill={isSelected ? "#fbbf24" : "#64748b"} fontSize={3.5} textAnchor="middle" fontWeight={isSelected ? 800 : 500}>
                  {d.ora}:00
                </text>
              </g>
            );
          })}

          {/* Legenda */}
          <g transform={`translate(${MARGIN_L + 4}, ${SVG_H - MARGIN_BOT + 20})`}>
            <text x={0} y={0} fill="#475569" fontSize={2.5}>Termiche:</text>
            {[
              { v: "<1.5", c: "#a3e635" },
              { v: "3", c: "#4ade80" },
              { v: "4.5", c: "#facc15" },
              { v: "6.5", c: "#fb923c" },
              { v: ">6.5", c: "#ef4444" },
            ].map((leg, li) => (
              <g key={`leg-${li}`} transform={`translate(${li * 35 + 30}, 0)`}>
                <rect x={0} y={-3} width={6} height={6} rx={1} fill={leg.c} />
                <text x={8} y={1.5} fill="#64748b" fontSize={2.5}>{leg.v}</text>
              </g>
            ))}
            <rect x={185} y={-3} width={6} height={6} rx={1} fill="rgba(148,163,184,0.5)" />
            <text x={193} y={1.5} fill="#64748b" fontSize={2.5}>Cumulo</text>
          </g>
        </svg>
      </div>

      {/* Tabella dati ora selezionata */}
      {data.filter(d => d.ora === selectedHour).map(current => (
        <div key={`detail-${current.ora}`} className="border-t border-slate-700/30 px-3 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-amber-300 font-black text-sm">Ore {current.ora}:00</span>
            <span className="text-[10px] text-slate-500">— Dettaglio termico</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">T / Dew</div>
              <div className="text-sm font-bold text-amber-300">{current.temp}° / <span className="text-sky-300">{current.dew}°</span></div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Termiche</div>
              <div className="text-sm font-bold" style={{ color: current.termicaColore }}>{current.rateo.toFixed(1)} <span className="text-[9px] text-slate-400">m/s</span></div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Base / Top</div>
              <div className="text-sm font-bold text-purple-300">{current.base}m / {current.top}m</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Sviluppo</div>
              <div className="text-sm font-bold text-slate-200">{current.cloudDepth > 500 ? `${(current.cloudDepth/1000).toFixed(1)}km` : `${current.cloudDepth}m`}</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Vento / Raffica</div>
              <div className="text-sm font-bold text-sky-300">{current.wind}/{current.gust} <span className="text-[9px] text-slate-400">km/h</span></div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-slate-400">Direzione</div>
              <div className="text-sm font-bold text-slate-200">{current.dirStr}</div>
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