"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { wd } from "@/utils/meteo";

interface WindgramChartProps {
  dayData: HourData[];
  altitude: number;
  siteName: string;
}

const QUOTE = [
  { label: "GND", offset: 0 },
  { label: "250", offset: 250 },
  { label: "500", offset: 500 },
  { label: "750", offset: 750 },
  { label: "1000", offset: 1000 },
  { label: "1250", offset: 1250 },
  { label: "1500", offset: 1500 },
  { label: "1750", offset: 1750 },
  { label: "2000", offset: 2000 },
  { label: "2250", offset: 2250 },
  { label: "2500", offset: 2500 },
  { label: "2750", offset: 2750 },
  { label: "3000", offset: 3000 },
  { label: "3500", offset: 3500 },
  { label: "4000", offset: 4000 },
];

const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function getCellBg(speed: number): string {
  if (speed < 5) return "#0a2e1a";
  if (speed < 10) return "#0d3d22";
  if (speed < 15) return "#3a2a00";
  if (speed < 20) return "#4a3500";
  if (speed < 25) return "#4a2800";
  if (speed < 30) return "#5a2000";
  if (speed < 35) return "#5a1010";
  if (speed < 40) return "#6a0000";
  return "#3a0000";
}

function getCellColor(speed: number): string {
  if (speed < 5) return "#4ade80";
  if (speed < 10) return "#22c55e";
  if (speed < 15) return "#facc15";
  if (speed < 20) return "#eab308";
  if (speed < 25) return "#fb923c";
  if (speed < 30) return "#f97316";
  if (speed < 35) return "#f87171";
  if (speed < 40) return "#ef4444";
  return "#dc2626";
}

function getArrow(deg: number): string {
  const arr = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
  return arr[Math.round(deg / 45) % 8];
}

function estimaVento(suoloSpeed: number, suoloDir: number, offset: number, ora: number, cloud: number): { speed: number; dir: number } {
  if (offset === 0) return { speed: Math.round(suoloSpeed), dir: Math.round(suoloDir) };
  const factor = 1 + offset * 0.0025 * (1 + cloud / 300);
  const rot = Math.min(offset * 0.03, 60);
  const night = ora < 8 || ora > 19 ? 0.5 : 1;
  return {
    speed: Math.round(suoloSpeed * factor * night),
    dir: Math.round((suoloDir + rot) % 360),
  };
}

const WindgramChart = ({ dayData, altitude }: WindgramChartProps) => {
  const cols = useMemo(() => {
    return ORE.map((ora) => {
      const h = dayData.find((d) => d.time.getHours() === ora);
      if (!h) return null;
      const cloud = h.cloudCover || 0;
      const livelli = QUOTE.map((q) => estimaVento(h.windSpeed || 0, h.windDir || 0, q.offset, ora, cloud));
      return {
        ora,
        temp: `${Math.round(h.temperature)}°`,
        pioggia: h.precipitation || 0,
        livelli,
      };
    });
  }, [dayData]);

  return (
    <div className="overflow-x-auto -mx-1 pb-2">
      <table className="w-full border-collapse" style={{ minWidth: "750px", fontSize: "12px" }}>
        <thead>
          {/* Riga 1: temperature */}
          <tr className="bg-slate-700">
            <th className="p-1.5 text-left text-slate-400 font-medium sticky left-0 bg-slate-700 z-10" style={{ width: "75px" }}>
              Quota
            </th>
            {cols.map((c) => (
              <th key={c?.ora || 0} className="p-1.5 text-center text-orange-300 font-bold">
                {c?.temp || "—"}
              </th>
            ))}
          </tr>
          {/* Riga 2: ore e quota suolo */}
          <tr className="bg-slate-700 border-b border-slate-600">
            <th className="p-1.5 text-left text-slate-300 font-bold sticky left-0 bg-slate-700 z-10">
              {altitude}m
            </th>
            {cols.map((c) => (
              <th key={c?.ora || 0} className="p-1.5 text-center text-blue-200 font-bold">
                {c ? `${String(c.ora).padStart(2, "0")}:00` : "—"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {QUOTE.map((q, qi) => (
            <tr
              key={q.offset}
              className={qi % 2 === 0 ? "bg-slate-800/80" : "bg-slate-800/40"}
            >
              <td className="p-1.5 text-slate-300 font-mono sticky left-0 z-10 bg-slate-800">
                {q.label === "GND" ? `${altitude}m` : `${altitude + q.offset}m`}
              </td>
              {cols.map((c) => {
                if (!c) return <td key={qi} className="p-1.5 text-center text-slate-600">—</td>;
                const lvl = c.livelli[qi];
                if (!lvl) return <td key={qi} className="p-1.5 text-center text-slate-600">—</td>;
                const bg = getCellBg(lvl.speed);
                const col = getCellColor(lvl.speed);
                return (
                  <td
                    key={qi}
                    className="p-1.5 text-center border-b border-slate-700/30"
                    style={{ backgroundColor: bg }}
                  >
                    <div className="text-base font-extrabold leading-tight" style={{ color: col }}>
                      {lvl.speed}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <span className="text-sm">{getArrow(lvl.dir)}</span>
                      <span className="text-[10px] text-slate-400">{lvl.dir >= 0 ? wd(lvl.dir) : "—"}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Riga pioggia */}
          <tr className="bg-slate-700/60 border-t border-slate-600">
            <td className="p-1.5 text-slate-300 font-medium sticky left-0 bg-slate-700/60 z-10">🌧️</td>
            {cols.map((c) => (
              <td key={c?.ora || 0} className="p-1.5 text-center">
                {c ? (
                  c.pioggia > 0.2 ? (
                    <span className="text-blue-300 font-bold">{c.pioggia.toFixed(1)}mm</span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-2 justify-center mt-3 pt-2 border-t border-slate-600/30">
        <span className="text-[10px] text-slate-400 font-semibold mr-1">km/h:</span>
        {[
          { c: "#4ade80", l: "0-5" },
          { c: "#22c55e", l: "5-10" },
          { c: "#facc15", l: "10-15" },
          { c: "#eab308", l: "15-20" },
          { c: "#fb923c", l: "20-25" },
          { c: "#f97316", l: "25-30" },
          { c: "#f87171", l: "30-35" },
          { c: "#ef4444", l: "35-40" },
          { c: "#dc2626", l: "40+" },
        ].map((x) => (
          <div key={x.l} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: x.c }} />
            <span className="text-[9px] text-slate-400">{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WindgramChart;