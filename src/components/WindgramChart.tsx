"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { wd } from "@/utils/meteo";

interface WindgramChartProps {
  dayData: HourData[];
  altitude: number;
  siteName: string;
}

const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const QUOTE = [
  { label: "Suolo", offset: 0 },
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

// Sfondo cella in base alla velocità - come nell'immagine
function cellBg(speed: number): string {
  if (speed < 5) return "#1a3a2a";
  if (speed < 10) return "#1a4a2a";
  if (speed < 15) return "#4a4a00";
  if (speed < 20) return "#5a4a00";
  if (speed < 25) return "#5a3a00";
  if (speed < 30) return "#6a2a00";
  if (speed < 35) return "#7a1a1a";
  if (speed < 40) return "#8a0000";
  return "#4a0000";
}

// Colore del numero velocità - come nell'immagine
function numColor(speed: number): string {
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

// Freccia direzione vento - 8 direzioni
function dirArrow(deg: number): string {
  const arr = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
  return arr[Math.round(deg / 45) % 8];
}

// Stima vento in quota
function stimaVento(suoloSpeed: number, suoloDir: number, offset: number, ora: number, cloud: number): { speed: number; dir: number } {
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
      const livelli = QUOTE.map((q) => stimaVento(h.windSpeed || 0, h.windDir || 0, q.offset, ora, cloud));
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
      <table className="w-full border-collapse text-xs" style={{ minWidth: "800px" }}>
        <thead>
          {/* RIGA TEMPERATURA */}
          <tr className="bg-slate-700/80">
            <th className="px-2 py-1.5 text-left text-slate-400 font-medium whitespace-nowrap sticky left-0 bg-slate-700/80 z-10" style={{ width: "70px" }}>
              Quota
            </th>
            {cols.map((c) => (
              <th key={c?.ora || 0} className="px-2 py-1.5 text-center font-bold text-orange-300 text-xs">
                {c?.temp || "—"}
              </th>
            ))}
          </tr>

          {/* RIGA ORE */}
          <tr className="bg-slate-700 border-b border-slate-600">
            <th className="px-2 py-1.5 text-left text-slate-400 font-medium sticky left-0 bg-slate-700 z-10">
              {altitude}m
            </th>
            {cols.map((c) => (
              <th key={c?.ora || 0} className="px-2 py-1.5 text-center font-bold text-blue-200 text-xs">
                {c ? `${String(c.ora).padStart(2, "0")}:00` : "—"}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {QUOTE.map((q, qi) => (
            <tr
              key={q.offset}
              className={qi % 2 === 0 ? "" : ""}
            >
              {/* ETICHETTA QUOTA */}
              <td className="px-2 py-1.5 text-slate-300 font-mono text-xs sticky left-0 z-10 bg-slate-800 whitespace-nowrap">
                {q.label === "Suolo" ? `${altitude}m` : q.offset <= 3000 ? `${q.offset}m` : `${q.offset}m`}
              </td>

              {/* CELLE VENTO */}
              {cols.map((c) => {
                if (!c) return <td key={Math.random()} className="px-2 py-1.5 text-center text-slate-600">—</td>;
                const lvl = c.livelli[qi];
                if (!lvl) return <td key={Math.random()} className="px-2 py-1.5 text-center text-slate-600">—</td>;
                const bg = cellBg(lvl.speed);
                const col = numColor(lvl.speed);
                return (
                  <td
                    key={q.offset + "-" + c.ora}
                    className="px-2 py-1.5 text-center border-b border-slate-700/20"
                    style={{ backgroundColor: bg }}
                  >
                    {/* Numero velocità GRANDE */}
                    <div className="text-sm md:text-base font-extrabold leading-tight" style={{ color: col }}>
                      {lvl.speed}
                    </div>
                    {/* Freccia + direzione */}
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <span className="text-sm font-bold text-slate-100">{dirArrow(lvl.dir)}</span>
                      <span className="text-[9px] text-slate-400 font-medium">{lvl.dir >= 0 ? wd(lvl.dir) : "—"}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* RIGA PIOGGIA */}
          <tr className="bg-slate-700/60 border-t border-slate-600">
            <td className="px-2 py-1.5 text-slate-300 font-medium whitespace-nowrap sticky left-0 bg-slate-700/60 z-10 text-xs">
              Pioggia
            </td>
            {cols.map((c) => (
              <td key={c?.ora || 0} className="px-2 py-1.5 text-center text-xs">
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

      {/* LEGENDA */}
      <div className="flex flex-wrap items-center gap-3 justify-center mt-3 pt-2.5 border-t border-slate-600/30">
        <span className="text-[11px] text-slate-400 font-bold">km/h:</span>
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
            <span className="text-[10px] text-slate-400">{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WindgramChart;