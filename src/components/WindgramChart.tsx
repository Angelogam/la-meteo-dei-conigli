"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { wd } from "@/utils/meteo";
import { ArrowUp, ArrowDown, Wind, Thermometer } from "lucide-react";

interface WindgramChartProps {
  dayData: HourData[];
  altitude: number;
  siteName: string;
}

const QUOTE = [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3500, 4000];

function stimaVentoQuota(
  suolo: number,
  dir: number,
  quota: number,
  nuvolosita: number,
  ora: number
): { speed: number; dir: number } {
  const shear = 1 + quota * 0.00025 * (1 + nuvolosita / 200);
  const rot = Math.min(quota * 0.035, 55);
  const riduzioneNotturna = ora < 8 || ora > 19 ? 0.6 : 1;
  return {
    speed: Math.round(suolo * shear * riduzioneNotturna * 10) / 10,
    dir: (dir + rot) % 360,
  };
}

function stimaDeltaT(suolo: number, quota: number): number {
  // Gradiente adiabatico secco ~1°C/100m
  return Math.round((suolo - quota * 0.0098) * 10) / 10;
}

const WindgramChart = ({ dayData, altitude, siteName }: WindgramChartProps) => {
  const ore = useMemo(() => [9, 10, 11, 12, 13, 14, 15, 16, 17, 18], []);

  const matrice = useMemo(() => {
    return ore.map((ora) => {
      const h = dayData.find((d) => d.time.getHours() === ora);
      if (!h) return null;
      const suolo = h.windSpeed || 0;
      const dirBase = h.windDir || 0;
      const nuvoli = h.cloudCover || 0;
      const temp = h.temperature;

      const livelli = QUOTE.map((q) => {
        const v = stimaVentoQuota(suolo, dirBase, q, nuvoli, ora);
        const deltaT = q === 0 ? null : stimaDeltaT(temp, q);
        return {
          quota: q + altitude,
          speed: v.speed,
          dir: v.dir,
          dirLabel: wd(v.dir),
          deltaT,
        };
      });

      return {
        ora,
        tempSuolo: Math.round(temp),
        ventoSuolo: Math.round(suolo),
        dirSuolo: wd(dirBase),
        livelli,
        nuvolosita: Math.round(nuvoli),
        pioggia: h.precipitation || 0,
        weatherCode: h.weatherCode,
      };
    });
  }, [dayData, ore, altitude]);

  const maxSpeed = useMemo(
    () => Math.max(1, ...matrice.flatMap((c) => c?.livelli.map((l) => l.speed) ?? [0])),
    [matrice]
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="text-[10px] text-slate-400 mb-2 flex items-center gap-2">
        <Thermometer className="w-3 h-3 text-orange-400" />
        <span>Quota {altitude}m</span>
        <span className="text-slate-500">·</span>
        <Wind className="w-3 h-3 text-blue-400" />
        <span>Vento suolo</span>
      </div>

      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-slate-700/80 border-b border-slate-500/50">
            <th className="sticky left-0 bg-slate-700/80 z-10 px-1 py-1.5 text-left text-white min-w-[70px]">Quota</th>
            {ore.map((o) => (
              <th key={o} className="px-1 py-1.5 text-center text-blue-200 min-w-[70px]">
                {String(o).padStart(2, "0")}:00
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {QUOTE.map((q, qIdx) => (
            <tr
              key={q}
              className={`border-b border-slate-600/20 ${
                q === 0 ? "bg-slate-700/50 font-bold" : qIdx % 2 === 0 ? "bg-slate-800/30" : ""
              }`}
            >
              <td className="sticky left-0 bg-inherit z-10 px-1 py-0.5 text-slate-300 font-mono whitespace-nowrap">
                {q === 0 ? `${altitude}m (suolo)` : `${altitude + q}m`}
              </td>
              {matrice.map((col, colIdx) => {
                if (!col) return <td key={colIdx} className="px-1 py-0.5 text-center text-slate-600">—</td>;
                const level = col.livelli[qIdx];
                if (!level) return <td key={colIdx} className="px-1 py-0.5 text-center text-slate-600">—</td>;

                const barWidth = Math.min(100, (level.speed / (maxSpeed || 30)) * 100);
                const windColor = level.speed < 10 ? "bg-green-400" : level.speed < 20 ? "bg-yellow-400" : level.speed < 30 ? "bg-orange-400" : "bg-red-400";

                // Delta T indicatore: positivo = termica attiva
                const dtColor = level.deltaT !== null && level.deltaT > 0 ? "text-green-300" : "text-red-300";

                return (
                  <td key={colIdx} className="px-1 py-0.5 text-center align-middle">
                    <div className="flex flex-col items-center gap-0.5">
                      {/* Delta T (differenza termica rispetto a suolo) */}
                      {level.deltaT !== null && (
                        <span className={`text-[7px] font-bold ${dtColor}`}>
                          {level.deltaT > 0 ? "+" : ""}{level.deltaT.toFixed(1)}°
                        </span>
                      )}
                      {/* Barra vento */}
                      <div className="flex items-center gap-1 w-full justify-center">
                        <div className="w-10 h-1.5 bg-slate-600/60 rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full ${windColor} rounded-full transition-all`}
                            style={{ width: `${Math.max(barWidth, 2)}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-bold text-slate-100 w-7 text-right tabular-nums">
                          {Math.round(level.speed)}
                        </span>
                      </div>
                      {/* Direzione */}
                      <span className="text-[7px] text-slate-400">{level.dirLabel}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legenda colori vento */}
      <div className="flex items-center gap-3 justify-center mt-2 pt-2 border-t border-slate-600/30">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-green-400" />
          <span className="text-[8px] text-slate-400">{'<'}10</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-yellow-400" />
          <span className="text-[8px] text-slate-400">10-19</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-orange-400" />
          <span className="text-[8px] text-slate-400">20-29</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-red-400" />
          <span className="text-[8px] text-slate-400">{'>'}30</span>
        </div>
        <span className="text-[8px] text-slate-500 ml-1">km/h</span>
        <span className="w-px h-3 bg-slate-500 mx-1" />
        <span className="text-[8px] text-green-400">ΔT +</span>
        <span className="text-[8px] text-red-400">ΔT –</span>
      </div>
    </div>
  );
};

export default WindgramChart;