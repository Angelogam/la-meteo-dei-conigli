"use client";

import React, { useMemo, useState } from "react";
import { Sun, Cloud, CloudRain, Wind, Thermometer, Gauge, ArrowUp } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { getVoloStatus } from "@/utils/volo";

interface MeteogramProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

const ORE_VISIBILI = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export default function Meteogram({ dayData, altitude, selectedHour, onHourSelect }: MeteogramProps) {
  const data = useMemo(() => {
    return ORE_VISIBILI.map(ora => {
      const h = dayData.find(d => d.time.getHours() === ora);
      if (!h) return null;
      const termiche = calcolaTermiche(h, altitude);
      const volo = getVoloStatus(h);
      const isDay = ora >= 6 && ora <= 20;
      return {
        ora,
        temp: h.temperature,
        dewPoint: h.dewPoint,
        feelsLike: h.apparentTemp ?? h.temperature,
        windSpeed: h.windSpeed,
        windGust: h.windGusts ?? 0,
        windDir: h.windDir,
        cloudCover: h.cloudCover,
        precipitation: h.precipitation,
        pressure: h.pressure,
        termiche: termiche.rateo,
        termicheColore: termiche.colore,
        termicheBase: termiche.base,
        termicheTop: termiche.top,
        weatherCode: h.weatherCode,
        voloLabel: volo.label,
        voloIcon: volo.icon,
        voloColore: volo.color,
        isDay,
      };
    }).filter(Boolean);
  }, [dayData, altitude]);

  if (!data.length) return null;

  // Range per ogni pannello
  const tempMin = Math.min(...data.map(d => Math.min(d.temp, d.dewPoint, d.feelsLike))) - 2;
  const tempMax = Math.max(...data.map(d => Math.max(d.temp, d.dewPoint, d.feelsLike))) + 2;
  const tempRange = Math.max(tempMax - tempMin, 10);

  const windMax = Math.max(...data.map(d => Math.max(d.windSpeed, d.windGust)), 1);
  const windRange = Math.max(windMax, 10);

  const pressureMin = Math.min(...data.map(d => d.pressure)) - 2;
  const pressureMax = Math.max(...data.map(d => d.pressure)) + 2;
  const pressureRange = Math.max(pressureMax - pressureMin, 5);

  const thermalMax = Math.max(...data.map(d => d.termiche), 1);

  function tempToY(temp: number, height: number): number {
    return height - ((temp - tempMin) / tempRange) * height * 0.85 - height * 0.075;
  }

  function pressureToY(p: number, height: number): number {
    return height - ((p - pressureMin) / pressureRange) * height * 0.85 - height * 0.075;
  }

  function windToHeight(ws: number, height: number): number {
    return (ws / windRange) * height * 0.9;
  }

  const PANEL_HEIGHT = 40;

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/40 p-4 sm:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
          <Sun className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Windgram · Andamento Giornaliero</h3>
          <p className="text-[11px] text-slate-400">Pannelli: Temperatura, Vento, Nuvolosità, Pioggia, Pressione, Termiche</p>
        </div>
      </div>

      {/* LEGENDA */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-amber-400" />
          <span>Temperatura</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-sky-400 border-dashed" style={{ borderTop: "1px dashed #38bdf8", height: 0 }} />
          <span>Dew point</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded" style={{ background: "linear-gradient(to right, #0ea5e9, #fbbf24)" }} />
          <span>Vento + raffiche</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-blue-400" />
          <span>Pioggia</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-emerald-400" />
          <span>Pressione</span>
        </span>
      </div>

      {/* SVG PANNELLI */}
      <div className="relative" style={{ height: `${PANEL_HEIGHT * 6 + 30}px` }}>
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${data.length * 50} ${PANEL_HEIGHT * 6 + 30}`} preserveAspectRatio="none">

          {/* RIPETI PER OGNI PANNELLO */}
          {[0, 1, 2, 3, 4, 5].map(panel => {
            const yOffset = panel * PANEL_HEIGHT + 5;
            const isFirst = panel === 0;
            const isLast = panel === 5;
            const label = ["Temperatura", "Vento", "Nuvolosità", "Pioggia", "Pressione", "Termiche"][panel];

            // Griglia orizzontale
            const gridLines = [];
            for (let i = 0; i < 4; i++) {
              gridLines.push(
                <line
                  key={`grid-${panel}-${i}`}
                  x1={0} y1={yOffset + (PANEL_HEIGHT - 10) * (i / 4)}
                  x2={data.length * 50} y2={yOffset + (PANEL_HEIGHT - 10) * (i / 4)}
                  stroke="rgba(100, 116, 139, 0.12)"
                  strokeWidth={0.3}
                />
              );
            }

            return (
              <g key={panel}>
                {/* Label pannello */}
                <text
                  x={2} y={yOffset + 6}
                  fill="#64748b"
                  fontSize={3.5}
                  fontWeight={700}
                  opacity={0.7}
                >
                  {label}
                </text>

                {gridLines}

                {/* PANNELLO 0: TEMPERATURA */}
                {panel === 0 && (
                  <>
                    {/* Area temperatura */}
                    <polyline
                      fill="rgba(251, 191, 36, 0.08)"
                      stroke="none"
                      points={
                        data.map((d, i) => {
                          const x = (i + 0.5) * 50;
                          const y = tempToY(d.temp, PANEL_HEIGHT - 10) + yOffset;
                          return `${x},${y}`;
                        }).join(" ") +
                        ` ${(data.length - 0.5) * 50},${yOffset + PANEL_HEIGHT - 10} ${0.5 * 50},${yOffset + PANEL_HEIGHT - 10}`
                      }
                    />
                    {/* Linea temperatura */}
                    <polyline
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={0.7}
                      vectorEffect="non-scaling-stroke"
                      points={
                        data.map((d, i) => {
                          const x = (i + 0.5) * 50;
                          const y = tempToY(d.temp, PANEL_HEIGHT - 10) + yOffset;
                          return `${x},${y}`;
                        }).join(" ")
                      }
                    />
                    {/* Punti temperatura */}
                    {data.map((d, i) => {
                      const x = (i + 0.5) * 50;
                      const y = tempToY(d.temp, PANEL_HEIGHT - 10) + yOffset;
                      return (
                        <circle
                          key={`temp-${i}`}
                          cx={x} cy={y}
                          r={0.8}
                          fill="#fbbf24"
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth={0.2}
                        />
                      );
                    })}
                    {/* Linea dew point */}
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={0.5}
                      strokeDasharray="3,2"
                      vectorEffect="non-scaling-stroke"
                      points={
                        data.map((d, i) => {
                          const x = (i + 0.5) * 50;
                          const y = tempToY(d.dewPoint, PANEL_HEIGHT - 10) + yOffset;
                          return `${x},${y}`;
                        }).join(" ")
                      }
                    />
                    {/* Punti dew point */}
                    {data.map((d, i) => {
                      const x = (i + 0.5) * 50;
                      const y = tempToY(d.dewPoint, PANEL_HEIGHT - 10) + yOffset;
                      return (
                        <circle
                          key={`dew-${i}`}
                          cx={x} cy={y}
                          r={0.6}
                          fill="#38bdf8"
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth={0.2}
                        />
                      );
                    })}
                    {/* Etich. valori */}
                    {data.map((d, i) => {
                      if (i % 2 !== 0) return null;
                      const x = (i + 0.5) * 50;
                      const y = tempToY(d.temp, PANEL_HEIGHT - 10) + yOffset - 2;
                      return (
                        <text key={`temp-label-${i}`} x={x} y={y} fill="#fbbf24" fontSize={3} textAnchor="middle" fontWeight={600}>
                          {Math.round(d.temp)}°
                        </text>
                      );
                    })}
                  </>
                )}

                {/* PANNELLO 1: VENTO */}
                {panel === 1 && (
                  <>
                    {/* Barre vento */}
                    {data.map((d, i) => {
                      const x = (i + 0.5) * 50;
                      const barWidth = 8;
                      const h = windToHeight(d.windSpeed, PANEL_HEIGHT - 10);
                      return (
                        <g key={`wind-${i}`}>
                          {/* Barra vento */}
                          <rect
                            x={x - barWidth / 2}
                            y={yOffset + (PANEL_HEIGHT - 10) - h}
                            width={barWidth}
                            height={h}
                            rx={1}
                            fill="rgba(14, 165, 233, 0.5)"
                          />
                          {/* Linea raffica */}
                          {d.windGust > 0 && (
                            <line
                              x1={x} y1={yOffset}
                              x2={x} y2={yOffset + (PANEL_HEIGHT - 10) - windToHeight(Math.min(d.windGust, windRange), PANEL_HEIGHT - 10)}
                              stroke="#f97316"
                              strokeWidth={0.5}
                              strokeDasharray="2,1"
                            />
                          )}
                          {/* Etichetta velocità */}
                          <text x={x} y={yOffset + (PANEL_HEIGHT - 10) - h - 1} fill="#38bdf8" fontSize={3} textAnchor="middle" fontWeight={600}>
                            {Math.round(d.windSpeed)}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}

                {/* PANNELLO 2: NUOVOLOSITÀ */}
                {panel === 2 && (
                  <>
                    {data.map((d, i) => {
                      const x = (i + 0.5) * 50;
                      const barWidth = 10;
                      const h = (d.cloudCover / 100) * (PANEL_HEIGHT - 10);
                      return (
                        <g key={`cloud-${i}`}>
                          <defs>
                            <linearGradient id={`cloudGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={d.cloudCover > 70 ? "rgba(255,255,255,0.3)" : "rgba(251, 191, 36, 0.2)"} />
                              <stop offset="100%" stopColor="rgba(14, 165, 233, 0.6)" />
                            </linearGradient>
                          </defs>
                          <rect
                            x={x - barWidth / 2}
                            y={yOffset + (PANEL_HEIGHT - 10) - h}
                            width={barWidth}
                            height={h}
                            rx={1}
                            fill={`url(#cloudGrad-${i})`}
                          />
                          <text x={x} y={yOffset + (PANEL_HEIGHT - 10) - h - 1} fill="#94a3b8" fontSize={3} textAnchor="middle">
                            {d.cloudCover}%
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}

                {/* PANNELLO 3: PIOGGIA */}
                {panel === 3 && (
                  <>
                    {data.map((d, i) => {
                      const x = (i + 0.5) * 50;
                      const barWidth = 8;
                      const maxPrecip = Math.max(...data.map(p => p.precipitation), 0.5);
                      const h = (d.precipitation / maxPrecip) * (PANEL_HEIGHT - 10);
                      if (d.precipitation <= 0) return null;
                      return (
                        <g key={`rain-${i}`}>
                          <rect
                            x={x - barWidth / 2}
                            y={yOffset + (PANEL_HEIGHT - 10) - h}
                            width={barWidth}
                            height={h}
                            rx={1}
                            fill="rgba(59, 130, 246, 0.6)"
                          />
                          <text x={x} y={yOffset + (PANEL_HEIGHT - 10) - h - 1} fill="#60a5fa" fontSize={3} textAnchor="middle" fontWeight={600}>
                            {d.precipitation.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}
                    {/* Se niente pioggia */}
                    {data.every(d => d.precipitation === 0) && (
                      <text x={(data.length * 50) / 2} y={yOffset + (PANEL_HEIGHT - 10) / 2} fill="#475569" fontSize={4} textAnchor="middle">
                        No precipitazioni
                      </text>
                    )}
                  </>
                )}

                {/* PANNELLO 4: PRESSIONE */}
                {panel === 4 && (
                  <>
                    <polyline
                      fill="rgba(52, 211, 153, 0.08)"
                      stroke="none"
                      points={
                        data.map((d, i) => {
                          const x = (i + 0.5) * 50;
                          const y = pressureToY(d.pressure, PANEL_HEIGHT - 10) + yOffset;
                          return `${x},${y}`;
                        }).join(" ") +
                        ` ${(data.length - 0.5) * 50},${yOffset + PANEL_HEIGHT - 10} ${0.5 * 50},${yOffset + PANEL_HEIGHT - 10}`
                      }
                    />
                    <polyline
                      fill="none"
                      stroke="#34d399"
                      strokeWidth={0.7}
                      vectorEffect="non-scaling-stroke"
                      points={
                        data.map((d, i) => {
                          const x = (i + 0.5) * 50;
                          const y = pressureToY(d.pressure, PANEL_HEIGHT - 10) + yOffset;
                          return `${x},${y}`;
                        }).join(" ")
                      }
                    />
                    {data.map((d, i) => {
                      if (i % 2 !== 0) return null;
                      const x = (i + 0.5) * 50;
                      const y = pressureToY(d.pressure, PANEL_HEIGHT - 10) + yOffset - 2;
                      return (
                        <text key={`pres-${i}`} x={x} y={y} fill="#34d399" fontSize={3} textAnchor="middle" fontWeight={600}>
                          {Math.round(d.pressure)}
                        </text>
                      );
                    })}
                  </>
                )}

                {/* PANNELLO 5: TERMICHE */}
                {panel === 5 && (
                  <>
                    {data.map((d, i) => {
                      const x = (i + 0.5) * 50;
                      const barWidth = 10;
                      const h = (d.termiche / Math.max(thermalMax, 1)) * (PANEL_HEIGHT - 10);
                      return (
                        <g key={`therm-${i}`}>
                          <rect
                            x={x - barWidth / 2}
                            y={yOffset + (PANEL_HEIGHT - 10) - h}
                            width={barWidth}
                            height={h}
                            rx={1}
                            fill={d.termicheColore}
                            opacity={0.7}
                          />
                          <text x={x} y={yOffset + (PANEL_HEIGHT - 10) - h - 1} fill={d.termicheColore} fontSize={3} textAnchor="middle" fontWeight={700}>
                            {d.termiche.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ORE IN BASSO (asse X) */}
      <div className="flex justify-between mt-1 mb-4">
        {data.map((d, i) => {
          const isSelected = d.ora === selectedHour;
          return (
            <button
              key={d.ora}
              onClick={() => onHourSelect(d.ora)}
              className={`
                flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all text-[10px]
                ${isSelected
                  ? "bg-amber-500/20 border border-amber-500/40 scale-105"
                  : "bg-transparent hover:bg-slate-700/30"
                }
              `}
            >
              <span className={`font-bold ${isSelected ? "text-amber-300" : "text-slate-400"}`}>
                {String(d.ora).padStart(2, "0")}
              </span>
              {/* Mini barretta termiche */}
              <div className="w-5 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(d.termiche / Math.max(thermalMax, 1)) * 100}%`, backgroundColor: d.termicheColore }}
                />
              </div>
              <span className="text-slate-500">{Math.round(d.temp)}°</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}