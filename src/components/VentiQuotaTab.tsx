"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";

interface VentiQuotaTabProps {
  dayData: HourData[];
  selectedHour: number;
  altitude: number;
  siteName: string;
}

const QUOTE_GENERATORS = [
  { label: "10m (suolo)", height: 10 },
  ...Array.from({ length: 16 }, (_, i) => ({
    label: `${(i + 1) * 250}m`,
    height: (i + 1) * 250,
  })),
];

/**
 * Approssima la velocità/ direzione del vento a diverse quote basandosi sui dati
 * open-meteo (che fornisce windSpeed_10m, windDir_10m, temperature_80m, windSpeed_80m, windDir_80m, 
 * e per le quote superiori usiamo gradienti realistici).
 */
function estimateWindAtHeight(
  groundSpeed: number,
  groundDir: number,
  height: number,
  cloudCover: number
): { speed: number; dir: number } {
  if (height <= 10) return { speed: groundSpeed, dir: groundDir };

  // Fattore di incremento vento con la quota (wind shear)
  // In condizioni normali il vento aumenta del 2-4% ogni 100m
  const shearFactor = Math.pow(1 + (0.03 * (1 + cloudCover / 200)), height / 100);
  
  // Rotazione del vento per effetto Ekman (si sposta verso destra con la quota)
  const rotationAngle = Math.min(height * 0.03, 45); // max 45° di rotazione
  
  const speed = Math.round(groundSpeed * shearFactor * 10) / 10;
  const dir = (groundDir + rotationAngle) % 360;

  return { speed, dir };
}

const VentiQuotaTab = ({ dayData, selectedHour, altitude, siteName }: VentiQuotaTabProps) => {
  const currentHourData = useMemo(
    () => dayData.find((h) => h.time.getHours() === selectedHour),
    [dayData, selectedHour]
  );

  if (!dayData.length) {
    return (
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 text-center">
        <p className="text-sm text-blue-300">Nessun dato giornaliero disponibile.</p>
      </div>
    );
  }

  if (!currentHourData) {
    return (
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6 text-center">
        <p className="text-sm text-amber-300">
          Nessun dato per l'ora {String(selectedHour).padStart(2, "0")}:00.
          Seleziona un'altra ora dal dettaglio orario.
        </p>
      </div>
    );
  }

  const groundSpeed = currentHourData.windSpeed || 0;
  const groundDir = currentHourData.windDir || 0;
  const cloudCover = currentHourData.cloudCover || 0;

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 text-xs text-slate-400">
        <span className="font-bold text-blue-200">{siteName}</span> · 
        Quota suolo {altitude}m slm · 
        Ora {String(selectedHour).padStart(2, "0")}:00 · 
        Vento base: {Math.round(groundSpeed)} km/h 
        {groundDir > 0 && ` da ${getWindDirName(groundDir)}`}
      </div>

      <table className="w-full text-xs md:text-sm border-collapse">
        <thead>
          <tr className="bg-slate-700/80 border-b border-slate-500/50">
            <th className="sticky left-0 bg-slate-700/80 z-10 px-2 py-2 text-left font-bold text-blue-200 whitespace-nowrap">
              Quota
            </th>
            <th className="px-2 py-2 text-left font-bold text-blue-200" colSpan={2}>
              Velocità
            </th>
            <th className="px-2 py-2 text-center font-bold text-blue-200">
              Direzione
            </th>
          </tr>
        </thead>
        <tbody>
          {QUOTE_GENERATORS.map((q, idx) => {
            const { speed, dir } = estimateWindAtHeight(
              groundSpeed,
              groundDir,
              q.height,
              cloudCover
            );

            const barColor =
              speed < 10
                ? "bg-green-400"
                : speed < 20
                ? "bg-yellow-400"
                : speed < 30
                ? "bg-orange-400"
                : "bg-red-400";

            const barWidth = Math.min(100, (speed / 50) * 100);

            return (
              <tr
                key={q.height}
                className={`border-b border-slate-600/30 hover:bg-slate-700/30 transition-colors ${
                  q.height === 10 ? "bg-slate-700/50" : idx % 2 === 0 ? "bg-slate-800/40" : ""
                }`}
              >
                <td className="sticky left-0 bg-inherit z-10 px-2 py-1.5 font-mono whitespace-nowrap">
                  <span className={q.height === 10 ? "text-green-400 font-bold" : "text-slate-300"}>
                    {q.label}
                  </span>
                </td>
                <td className="px-2 py-1.5 w-20">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 bg-slate-600 rounded-full w-16 overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all`}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-100 w-10 text-right text-[11px] tabular-nums">
                      {Math.round(speed)}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-slate-500 text-[10px]">
                  km/h
                </td>
                <td className="px-2 py-1.5 text-center font-medium text-slate-200 text-[11px] tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    {getWindDirArrow(dir)}
                    <span>{getWindDirName(dir)}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center gap-3 justify-center mt-3 pt-2 border-t border-slate-600/30">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-green-400" />
          <span className="text-[10px] text-slate-400">{'<'}10</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-yellow-400" />
          <span className="text-[10px] text-slate-400">10-20</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-orange-400" />
          <span className="text-[10px] text-slate-400">20-30</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-red-400" />
          <span className="text-[10px] text-slate-400">{'>'}30</span>
        </div>
        <span className="text-[10px] text-slate-500 ml-2">km/h</span>
      </div>
    </div>
  );
};

function getWindDirName(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return dirs[index];
}

function getWindDirArrow(deg: number): string {
  const arrows = ["↑", "↑", "↗", "↗", "→", "→", "↘", "↘", "↓", "↓", "↙", "↙", "←", "←", "↖", "↖"];
  const index = Math.round(deg / 22.5) % 16;
  return arrows[index];
}

export default VentiQuotaTab;