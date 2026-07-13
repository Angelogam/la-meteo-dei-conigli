"use client";

import React, { useMemo } from "react";
import { Sun, Cloud, CloudRain, Wind, Thermometer } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface MeteogramProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const PANEL_HEIGHT = 38;
const SVG_WIDTH = 500;

// Direzioni vento
const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

function getDirLabel(deg: number): string {
  return DIRS[Math.round(deg / 45) % 8];
}

// Da temperatura e quota: stima vento in quota interpolata
function calcWindLevels(surfaceSpeed: number, surfaceDir: number) {
  const heights = [10, 500, 1000, 1500, 2000, 3000, 4000];
  return heights.map((h, i) => {
    const factor = 1 + i * 0.25;
    const speed = Math.min(surfaceSpeed * factor, 45);
    const dir = (surfaceDir + i * 10) % 360;
    const color =
      speed < 10
        ? "bg-green-400"
        : speed < 18
        ? "bg-lime-400"
        : speed < 25
        ? "bg-amber-400"
        : speed < 35
        ? "bg-orange-400"
        : "bg-red-500";
    return {
      height: h,
      speed: Math.round(speed),
      dir: Math.round(dir),
      dirArrow: getDirArrow(dir),
      dirLabel: getDirLabel(dir),
      color,
    };
  });
}

export default function Meteogram({ dayData, altitude, selectedHour, onHourSelect }: MeteogramProps) {
  const data = useMemo(() => {
    return ORE.map(ora => {
      const h = dayData.find(d => d.time.getHours() === ora);
      if (!h) return null;
      const t = calcolaTermiche(h, altitude);
      const windLevels = calcWindLevels(h.windSpeed, h.windDir);
      return {
        ora,
        temp: Math.round(h.temperature),
        dew: Math.round(h.dewPoint),
        wind: Math.round(h.windSpeed),
        gust: Math.round(h.windGusts ?? h.windSpeed * 1.4),
        dir: Math.round(h.windDir),
        dirArrow: getDirArrow(h.windDir),
        dirLabel: getDirLabel(h.windDir),
        clouds: h.cloudCover,
        rain: h.precipitation,
        rateo: t.rateo,
        base: t.base,
        top: t.top,
        termicheColore: t.colore,
        termicheLabel: t.label,
        windLevels,
      };
    }).filter(Boolean);
  }, [dayData, altitude]);

  if (!data.length) return null;

  /* ... rest of component unchanged ... */

  const maxRateo = Math.max(...data.map(d => d.rateo), 1);
  const maxWind = Math.max(...data.map(d => d.wind), 1);
  const maxGust = Math.max(...data.map(d => d.gust), 1);
  const maxWindAll = Math.max(maxWind, maxGust);
  const maxCloudBase = Math.max(...data.map(d => d.base), 1000);
  const maxRain = Math.max(...data.map(d => d.rain), 0.5);
  const maxClouds = Math.max(...data.map(d => d.clouds), 50);

  const PAN_START = 18; // spazio per label sinistra
  const PAN_WIDTH = (SVG_WIDTH - PAN_START) / ORE.length;

  // La selezione su SVG
  const [selectedCol, setSelectedCol] = React.useState(ORE.indexOf(selectedHour));
  const currentIdx = selectedCol >= 0 ? selectedCol : 0;
  const current = data[currentIdx] ?? data[0];

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/40 p-3 sm:p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Sun className="w-5 h-5 text-amber-400" />
        <h3 className="text-white font-semibold text-sm">Meteogram · {ORE[0]}:00 – {ORE[ORE.length-1]}:00</h3>
      </div>

      {/* SVG GRAFICO */}
      <div className="overflow-x-auto -mx-2">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${PANEL_HEIGHT * 7 + 10}`}
          className="w-full min-w-[600px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Sfondo linea ore selezionata */}
          {data.map((d, i) => d.ora === selectedHour && (
            <rect
              key={`sel-${i}`}
              x={PAN_START + i * PAN_WIDTH}
              y={0}
              width={PAN_WIDTH}
              height={PANEL_HEIGHT * 7 + 10}
              fill="rgba(251, 191, 36, 0.06)"
              stroke="rgba(251, 191, 36, 0.3)"
              strokeWidth={0.5}
            />
          ))}

          {[0, 1, 2, 3, 4, 5, 6].map(panel => {
            const yOff = panel * PANEL_HEIGHT + 2;
            const labels = ["VENTO IN QUOTA", "VENTO SUOLO", "TERMICHE", "TEMPERATURA", "PIOGGIA", "BASE NUVOLE", "COPERTURA"];

            // Griglia
            const grid = [];
            if (panel < 3) {
              for (let g = 0; g < 3; g++) {
                grid.push(
                  <line key={`g-${panel}-${g}`}
                    x1={PAN_START} y1={yOff + g * (PANEL_HEIGHT - 6) / 3}
                    x2={SVG_WIDTH} y2={yOff + g * (PANEL_HEIGHT - 6) / 3}
                    stroke="rgba(100, 116, 139, 0.1)" strokeWidth={0.3}
                  />
                );
              }
            }

            return (
              <g key={panel}>
                {/* Label pannello */}
                <text x={2} y={yOff + (PANEL_HEIGHT - 4) / 2 + 1} fill="#64748b" fontSize={3} fontWeight={700} textAnchor="start">
                  {labels[panel]}
                </text>
                <line x1={PAN_START} y1={yOff + PANEL_HEIGHT - 4} x2={SVG_WIDTH} y2={yOff + PANEL_HEIGHT - 4} stroke="rgba(100, 116, 139, 0.2)" strokeWidth={0.3} />
                {grid}

                {/* === PANNELLO 0: VENTO IN QUOTA === */}
                {panel === 0 && data.map((d, i) => {
                  const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                  return d.windLevels.filter((_, idx) => idx % 2 === 0).map((wl, wi) => {
                    const y = yOff + (PANEL_HEIGHT - 6) * 0.85 - wi * 8;
                    const barH = 6;
                    const colorMap: Record<string, string> = {
                      "bg-green-400": "#4ade80",
                      "bg-lime-400": "#a3e635",
                      "bg-amber-400": "#fbbf24",
                      "bg-orange-400": "#fb923c",
                      "bg-red-500": "#ef4444",
                    };
                    return (
                      <g key={`wl-${i}-${wi}`}>
                        <rect x={x - 4} y={y} width={8} height={barH} rx={1} fill={colorMap[wl.color] ?? "#4ade80"} opacity={0.7} />
                        <text x={x + 7} y={y + 4} fill="#94a3b8" fontSize={2.8}>{wl.speed}</text>
                        <text x={x - 8} y={y + 4} fill="#64748b" fontSize={3} textAnchor="end">{wl.dirArrow} {wl.dirLabel}</text>
                        <text x={x - 12} y={y + 3} fill="#475569" fontSize={2.5} textAnchor="end">
                          {wl.height < 100 ? `${wl.height}m` : `${wl.height/1000}km`}
                        </text>
                      </g>
                    );
                  });
                })}

                {/* === PANNELLO 1: VENTO SUOLO + RAFFICHE + TEMPERATURA === */}
                {panel === 1 && data.map((d, i) => {
                  const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                  const barH = ((d.wind ?? 0) / maxWindAll) * (PANEL_HEIGHT - 12);
                  const gustH = ((d.gust ?? 0) / maxWindAll) * (PANEL_HEIGHT - 12);
                  const barW = PAN_WIDTH * 0.5;
                  return (
                    <g key={`ws-${i}`}>
                      {/* Barra vento */}
                      <rect x={x - barW / 2} y={yOff + (PANEL_HEIGHT - 8) - barH} width={barW} height={barH} rx={1} fill="#60a5fa" opacity={0.6} />
                      {/* Linea raffica */}
                      {gustH > barH && (
                        <line x1={x} y1={yOff + (PANEL_HEIGHT - 8) - gustH} x2={x} y2={yOff + (PANEL_HEIGHT - 8)} stroke="#f97316" strokeWidth={0.6} strokeDasharray="2,1" />
                      )}
                      {/* Pallino raffica */}
                      {gustH > barH && <circle cx={x} cy={yOff + (PANEL_HEIGHT - 8) - gustH} r={1} fill="#f97316" />}
                      {/* Etichetta velocità */}
                      <text x={x} y={yOff + (PANEL_HEIGHT - 8) - barH - 1} fill="#60a5fa" fontSize={3} textAnchor="middle" fontWeight={600}>
                        {d.wind}
                        {d.gust > d.wind && <tspan fill="#fb923c" fontSize={2.5}>/{d.gust}</tspan>}
                      </text>
                      {/* Temperatura sulla barra */}
                      <text x={x} y={yOff + (PANEL_HEIGHT - 8) - barH - 5} fill="#fbbf24" fontSize={3} textAnchor="middle" fontWeight={700}>
                        {d.temp}°
                      </text>
                      {/* Direzione */}
                      <text x={x} y={yOff + (PANEL_HEIGHT - 2)} fill="#94a3b8" fontSize={2.5} textAnchor="middle">
                        {d.dirArrow} {d.dirLabel}
                      </text>
                    </g>
                  );
                })}

                {/* === PANNELLO 2: TERMICHE === */}
                {panel === 2 && data.map((d, i) => {
                  const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                  const barH = ((d.rateo ?? 0) / maxRateo) * (PANEL_HEIGHT - 12);
                  const barW = PAN_WIDTH * 0.55;
                  return (
                    <g key={`th-${i}`}>
                      <rect x={x - barW / 2} y={yOff + (PANEL_HEIGHT - 8) - barH} width={barW} height={barH} rx={1} fill={d.termicheColore} opacity={0.75} />
                      <text x={x} y={yOff + (PANEL_HEIGHT - 8) - barH - 1} fill={d.termicheColore} fontSize={3.2} textAnchor="middle" fontWeight={800}>
                        {d.rateo.toFixed(1)}
                      </text>
                      <text x={x} y={yOff + (PANEL_HEIGHT - 2)} fill="#64748b" fontSize={2.3} textAnchor="middle">
                        {d.termicheLabel.slice(0, 10)}
                      </text>
                    </g>
                  );
                })}

                {/* === PANNELLO 3: TEMPERATURA + DEW POINT === */}
                {panel === 3 && (
                  <>
                    {/* Linea temperatura */}
                    <polyline
                      fill="none" stroke="#fbbf24" strokeWidth={0.8}
                      points={data.map((d, i) => {
                        const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                        const y = yOff + (PANEL_HEIGHT - 8) - ((d.temp - 10) / 30) * (PANEL_HEIGHT - 10);
                        return `${x},${y}`;
                      }).join(" ")}
                    />
                    {data.map((d, i) => {
                      const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                      const y = yOff + (PANEL_HEIGHT - 8) - ((d.temp - 10) / 30) * (PANEL_HEIGHT - 10);
                      return <circle key={`td-${i}`} cx={x} cy={y} r={1.2} fill="#fbbf24" stroke="#1e293b" strokeWidth={0.2} />;
                    })}
                    {/* Linea dew point */}
                    <polyline
                      fill="none" stroke="#38bdf8" strokeWidth={0.6} strokeDasharray="2,2"
                      points={data.map((d, i) => {
                        const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                        const y = yOff + (PANEL_HEIGHT - 8) - ((d.dew - 5) / 25) * (PANEL_HEIGHT - 10);
                        return `${x},${y}`;
                      }).join(" ")}
                    />
                    {data.map((d, i) => {
                      const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                      const y = yOff + (PANEL_HEIGHT - 8) - ((d.dew - 5) / 25) * (PANEL_HEIGHT - 10);
                      return <circle key={`dw-${i}`} cx={x} cy={y} r={0.8} fill="#38bdf8" />;
                    })}
                    {/* Etichette */}
                    {data.map((d, i) => {
                      if (i % 2 !== 0) return null;
                      const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                      const yTemp = yOff + (PANEL_HEIGHT - 8) - ((d.temp - 10) / 30) * (PANEL_HEIGHT - 10);
                      const yDew = yOff + (PANEL_HEIGHT - 8) - ((d.dew - 5) / 25) * (PANEL_HEIGHT - 10);
                      return (
                        <g key={`tl-${i}`}>
                          <text x={x + 6} y={yTemp} fill="#fbbf24" fontSize={2.8} fontWeight={600}>{d.temp}°</text>
                          <text x={x + 6} y={yDew} fill="#38bdf8" fontSize={2.5}>{d.dew}°</text>
                        </g>
                      );
                    })}
                  </>
                )}

                {/* === PANNELLO 4: PIOGGIA === */}
                {panel === 4 && data.map((d, i) => {
                  const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                  const barH = maxRain > 0 ? ((d.rain ?? 0) / maxRain) * (PANEL_HEIGHT - 10) : 0;
                  const barW = PAN_WIDTH * 0.5;
                  if (d.rain <= 0) return null;
                  return (
                    <g key={`rn-${i}`}>
                      <rect x={x - barW / 2} y={yOff + (PANEL_HEIGHT - 8) - barH} width={barW} height={barH} rx={1} fill="rgba(59, 130, 246, 0.5)" />
                      <text x={x} y={yOff + (PANEL_HEIGHT - 8) - barH - 1} fill="#60a5fa" fontSize={3} textAnchor="middle" fontWeight={600}>
                        {d.rain.toFixed(1)}
                      </text>
                    </g>
                  );
                })}
                {panel === 4 && data.every(d => d.rain === 0) && (
                  <text x={SVG_WIDTH / 2 + 20} y={yOff + (PANEL_HEIGHT - 4) / 2} fill="#475569" fontSize={3.5} textAnchor="middle">No pioggia</text>
                )}

                {/* === PANNELLO 5: BASE NUVOLE === */}
                {panel === 5 && data.map((d, i) => {
                  const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                  const barH = (d.base / maxCloudBase) * (PANEL_HEIGHT - 10);
                  const barW = PAN_WIDTH * 0.55;
                  return (
                    <g key={`cb-${i}`}>
                      <rect x={x - barW / 2} y={yOff + (PANEL_HEIGHT - 8) - barH} width={barW} height={barH} rx={1} fill="rgba(168, 85, 247, 0.4)" />
                      <text x={x} y={yOff + (PANEL_HEIGHT - 8) - barH - 1} fill="#c084fc" fontSize={3} textAnchor="middle" fontWeight={600}>
                        {d.base}
                      </text>
                    </g>
                  );
                })}

                {/* === PANNELLO 6: COPERTURA NUVOLE === */}
                {panel === 6 && data.map((d, i) => {
                  const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                  const barH = (d.clouds / maxClouds) * (PANEL_HEIGHT - 10) * 0.9;
                  const barW = PAN_WIDTH * 0.55;
                  const opacity = 0.3 + (d.clouds / 100) * 0.6;
                  return (
                    <g key={`cc-${i}`}>
                      <rect x={x - barW / 2} y={yOff + (PANEL_HEIGHT - 8) - barH} width={barW} height={barH} rx={1} fill="rgba(148, 163, 184, 0.5)" opacity={opacity} />
                      <text x={x} y={yOff + (PANEL_HEIGHT - 8) - barH - 1} fill="#94a3b8" fontSize={3} textAnchor="middle" fontWeight={600}>
                        {d.clouds}%
                      </text>
                    </g>
                  );
                })}

                {/* RIGA ORE IN BASSO */}
                {panel === 6 && data.map((d, i) => {
                  const isSelected = d.ora === selectedHour;
                  const x = PAN_START + i * PAN_WIDTH + PAN_WIDTH / 2;
                  return (
                    <g key={`hr-${i}`} onClick={() => { setSelectedCol(i); onHourSelect(d.ora); }} style={{ cursor: "pointer" }}>
                      <rect x={x - PAN_WIDTH / 2} y={yOff + PANEL_HEIGHT - 3} width={PAN_WIDTH} height={6} fill={isSelected ? "rgba(251, 191, 36, 0.15)" : "transparent"} rx={1} />
                      <text x={x} y={yOff + PANEL_HEIGHT + 1} fill={isSelected ? "#fbbf24" : "#64748b"} fontSize={3.5} textAnchor="middle" fontWeight={isSelected ? 800 : 500}>
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

      {/* TABELLA DATI ORA SELEZIONATA */}
      {current && (
        <div className="mt-5 bg-slate-800/60 border border-amber-500/20 rounded-2xl p-4 text-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-black text-amber-300 text-base">Ore {current.ora}:00</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ORE[i] !== undefined && (
                <button
                  key={ORE[i]}
                  onClick={() => { setSelectedCol(i); onHourSelect(ORE[i]); }}
                  className={`w-6 h-6 rounded text-[9px] font-bold ${
                    ORE[i] === selectedHour
                      ? "bg-amber-500/30 text-amber-300 border border-amber-400/40"
                      : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {ORE[i]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Temperatura</div>
              <div className="text-base font-bold text-amber-300">{current.temp}°C</div>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Dew point</div>
              <div className="text-base font-bold text-sky-300">{current.dew}°C</div>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Vento</div>
              <div className="text-base font-bold text-sky-300">{current.wind} <span className="text-xs text-slate-400">km/h</span></div>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Raffica</div>
              <div className="text-base font-bold text-orange-300">{current.gust} <span className="text-xs text-slate-400">km/h</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Direzione</div>
              <div className="text-base font-bold text-slate-200">{current.dirArrow} {current.dirLabel}</div>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Termiche</div>
              <div className="text-base font-bold" style={{ color: current.termicheColore }}>{current.rateo.toFixed(1)} <span className="text-xs text-slate-400">m/s</span></div>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Base nuvole</div>
              <div className="text-base font-bold text-purple-300">{current.base} <span className="text-xs text-slate-400">m</span></div>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Copertura</div>
              <div className="text-base font-bold text-slate-200">{current.clouds}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}