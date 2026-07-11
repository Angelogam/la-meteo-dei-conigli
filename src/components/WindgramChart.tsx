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
  { offset: 0 },
  { offset: 250 },
  { offset: 500 },
  { offset: 750 },
  { offset: 1000 },
  { offset: 1250 },
  { offset: 1500 },
  { offset: 1750 },
  { offset: 2000 },
  { offset: 2250 },
  { offset: 2500 },
  { offset: 2750 },
  { offset: 3000 },
  { offset: 3500 },
  { offset: 4000 },
];

const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

// Colori solidi per intensità vento
function getWindColor(speed: number): string {
  if (speed < 5) return "#22c55e";
  if (speed < 10) return "#16a34a";
  if (speed < 15) return "#eab308";
  if (speed < 20) return "#ca8a04";
  if (speed < 25) return "#f97316";
  if (speed < 30) return "#ea580c";
  if (speed < 35) return "#ef4444";
  if (speed < 40) return "#dc2626";
  return "#b91c1c";
}

function getWindBgHex(speed: number): string {
  if (speed < 5) return "#052e16";
  if (speed < 10) return "#052e16";
  if (speed < 15) return "#422006";
  if (speed < 20) return "#422006";
  if (speed < 25) return "#431407";
  if (speed < 30) return "#431407";
  if (speed < 35) return "#450a0a";
  if (speed < 40) return "#450a0a";
  return "#1c1917";
}

function estimaVento(suoloSpeed: number, suoloDir: number, offset: number, ora: number, cloudCover: number): { speed: number; dir: number } {
  if (offset === 0) return { speed: suoloSpeed, dir: suoloDir };
  const factor = 1 + (offset * 0.0025) * (1 + cloudCover / 300);
  const rotation = Math.min(offset * 0.03, 60);
  const nightFactor = ora < 8 || ora > 19 ? 0.5 : 1;
  return {
    speed: Math.round(suoloSpeed * factor * nightFactor * 10) / 10,
    dir: (suoloDir + rotation) % 360,
  };
}

function getArrow(deg: number): string {
  const arrows = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
  return arrows[Math.round(deg / 45) % 8];
}

const WindgramChart = ({ dayData, altitude, siteName }: WindgramChartProps) => {
  const matrice = useMemo(() => {
    return ORE.map((ora) => {
      const h = dayData.find((d) => d.time.getHours() === ora);
      if (!h) return null;

      const suoloSpeed = h.windSpeed || 0;
      const suoloDir = h.windDir || 0;
      const cloudCover = h.cloudCover || 0;
      const pioggia = h.precipitation || 0;
      const temp = h.temperature;

      const livelli = QUOTE.map((q) => {
        const { speed, dir } = estimaVento(suoloSpeed, suoloDir, q.offset, ora, cloudCover);
        return {
          speed: Math.round(speed),
          dir: Math.round(dir),
          arrow: getArrow(dir),
          dirLabel: wd(dir),
        };
      });

      return { ora, temp: Math.round(temp), livelli, pioggia, haPioggia: pioggia > 0.2 };
    });
  }, [dayData, altitude]);

  if (!matrice.length || matrice.every((c) => c === null)) {
    return <div className="text-sm text-slate-300 p-4 text-center">Nessun dato disponibile per il windgram</div>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <table className="w-full text-xs border-collapse" style={{ fontSize: "11px" }}>
        {/* Riga temperature */}
        <thead>
          <tr className="bg-slate-700">
            <th className="px-2 py-1 text-left text-slate-400 font-medium sticky left-0 bg-slate-700 z-10" style={{ width: "80px" }}>
              Quota
            </th>
            {matrice.map((col) => (
              <th key={col?.ora || Math.random()} className="px-2 py-1 text-center text-orange-300 font-bold" style={{ width: "72px" }}>
                {col ? `${col.temp}°C` : "—"}
              </th>
            ))}
          </tr>

          {/* Riga ore */}
          <tr className="bg-slate-700 border-b border-slate-600">
            <th className="px-2 py-1 text-left text-slate-400 font-medium sticky left-0 bg-slate-700 z-10">
              {altitude}m
            </th>
            {matrice.map((col) => (
              <th key={col?.ora || Math.random()} className="px-2 py-1 text-center text-blue-200 font-bold">
                {col ? `${String(col.ora).padStart(2, "0")}:00` : "—"}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {QUOTE.map((q, qIdx) => (
            <tr
              key={q.offset}
              className={qIdx % 2 === 0 ? "bg-slate-800" : "bg-slate-800/60"}
            >
              {/* Etichetta quota */}
              <td className="px-2 py-1.5 text-slate-300 font-mono sticky left-0 z-10"
                style={{ backgroundColor: qIdx % 2 === 0 ? "#1e293b" : "#1e293b" }}
              >
                {q.offset === 0 ? `${altitude}m` : `${altitude + q.offset}m`}
              </td>

              {/* Celle */}
              {matrice.map((col) => {
                if (!col) return <td key={Math.random()} className="px-2 py-1.5 text-center text-slate-600">—</td>;

                const level = col.livelli[qIdx];
                if (!level) return <td key={q.offset + "-" + col.ora} className="px-2 py-1.5 text-center text-slate-600">—</td>;

                const bgColor = getWindBgHex(level.speed);
                const fgColor = getWindColor(level.speed);

                return (
                  <td
                    key={q.offset + "-" + col.ora}
                    className="px-2 py-1.5 text-center border-b border-slate-700/50"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {/* Velocità */}
                      <span className="font-bold text-sm" style={{ color: fgColor }}>
                        {level.speed}
                      </span>
                      {/* Freccia + direzione */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-200">{level.arrow}</span>
                        <span className="text-[9px] text-slate-400">{level.dirLabel}</span>
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Riga pioggia */}
          <tr className="bg-slate-700/80 border-t border-slate-600">
            <td className="px-2 py-1.5 text-slate-300 font-medium sticky left-0 bg-slate-700/80 z-10">
              🌧️
            </td>
            {matrice.map((col) => (
              <td key={col?.ora || Math.random()} className="px-2 py-1.5 text-center">
                {col ? (
                  col.haPioggia ? (
                    <span className="text-blue-300 font-bold text-xs">{col.pioggia.toFixed(1)} mm</span>
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
        <span className="text-[10px] text-slate-400 font-bold mr-1">km/h:</span>
        {[
          { color: "#22c55e", label: "0-5" },
          { color: "#16a34a", label: "5-10" },
          { color: "#eab308", label: "10-15" },
          { color: "#ca8a04", label: "15-20" },
          { color: "#f97316", label: "20-25" },
          { color: "#ea580c", label: "25-30" },
          { color: "#ef4444", label: "30-35" },
          { color: "#dc2626", label: "35-40" },
          { color: "#b91c1c", label: "40+" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[9px] text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WindgramChart;