"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { wd } from "@/utils/meteo";

interface WindgramChartProps {
  dayData: HourData[];
  altitude: number;
  siteName: string;
}

// Livelli di quota in metri slm (sopra suolo)
const QUOTE_LABELS = [
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

// Ore di volo
const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

// Colori per intensità vento (dal più debole al più forte)
function getWindColor(speed: number): string {
  if (speed < 5) return "bg-green-400";
  if (speed < 10) return "bg-green-500";
  if (speed < 15) return "bg-yellow-400";
  if (speed < 20) return "bg-yellow-500";
  if (speed < 25) return "bg-orange-400";
  if (speed < 30) return "bg-orange-500";
  if (speed < 35) return "bg-red-400";
  if (speed < 40) return "bg-red-500";
  return "bg-red-700";
}

function getWindBgColor(speed: number): string {
  if (speed < 5) return "from-green-400/20 to-green-500/10";
  if (speed < 10) return "from-green-500/25 to-green-400/15";
  if (speed < 15) return "from-yellow-400/25 to-yellow-500/15";
  if (speed < 20) return "from-yellow-500/30 to-yellow-400/20";
  if (speed < 25) return "from-orange-400/30 to-orange-500/20";
  if (speed < 30) return "from-orange-500/35 to-orange-400/25";
  if (speed < 35) return "from-red-400/35 to-red-500/25";
  if (speed < 40) return "from-red-500/40 to-red-400/30";
  return "from-red-700/50 to-red-600/40";
}

// Frecce direzione vento
function getWindArrow(deg: number): string {
  const arrows = ["↓", "↓", "↙", "↙", "←", "←", "↖", "↖", "↑", "↑", "↗", "↗", "→", "→", "↘", "↘"];
  return arrows[Math.round(deg / 22.5) % 16];
}

// Stima vento in quota basata su dati reali + gradiente
function estimaVento(
  suoloSpeed: number,
  suoloDir: number,
  offset: number,
  ora: number,
  temp: number,
  cloudCover: number
): { speed: number; dir: number } {
  if (offset === 0) return { speed: suoloSpeed, dir: suoloDir };

  // Gradiente vento: ~0.25% per metro (più realistico)
  const factor = 1 + (offset * 0.0025) * (1 + cloudCover / 300);

  // Rotazione Ekman: ~3° ogni 100m, max 60°
  const rotation = Math.min(offset * 0.03, 60);

  // Riduzione notturna
  const nightFactor = ora < 8 || ora > 19 ? 0.5 : 1;

  const speed = Math.round(suoloSpeed * factor * nightFactor * 10) / 10;
  const dir = (suoloDir + rotation) % 360;

  return { speed, dir };
}

const WindgramChart = ({ dayData, altitude, siteName }: WindgramChartProps) => {
  const matrice = useMemo(() => {
    return ORE.map((ora) => {
      const h = dayData.find((d) => d.time.getHours() === ora);
      if (!h) return null;

      const suoloSpeed = h.windSpeed || 0;
      const suoloDir = h.windDir || 0;
      const temp = h.temperature;
      const cloudCover = h.cloudCover || 0;
      const pioggia = h.precipitation || 0;

      const livelli = QUOTE_LABELS.map((ql) => {
        const { speed, dir } = estimaVento(suoloSpeed, suoloDir, ql.offset, ora, temp, cloudCover);
        return {
          quota: altitude + ql.offset,
          label: ql.offset === 0 ? "GND" : `${ql.offset}m`,
          speed,
          dir,
          arrow: getWindArrow(dir),
          dirLabel: wd(dir),
        };
      });

      return {
        ora,
        temp: Math.round(temp),
        tempDisplay: `${Math.round(temp)}°C`,
        ventoSuolo: Math.round(suoloSpeed),
        livelli,
        pioggia,
        haPioggia: pioggia > 0.2,
        cloudCover,
      };
    });
  }, [dayData, altitude]);

  const maxSpeed = useMemo(
    () => Math.max(1, ...matrice.flatMap((c) => c?.livelli.map((l) => l.speed) ?? [0])),
    [matrice]
  );

  if (!matrice.length || matrice.every((c) => c === null)) {
    return (
      <div className="text-sm text-slate-300 p-4 text-center">
        Nessun dato disponibile per il windgram
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2 -mx-1">
      <div className="min-w-[700px]">
        {/* Intestazione: riga temperature */}
        <div className="grid grid-cols-[70px_repeat(10,1fr)] gap-0 mb-0.5">
          <div className="text-[10px] font-bold text-slate-400 px-1 py-0.5"></div>
          {matrice.map((col) =>
            col ? (
              <div
                key={col.ora}
                className="text-center text-[10px] font-bold text-orange-300 px-0.5 py-0.5"
              >
                {col.tempDisplay}
              </div>
            ) : (
              <div key={Math.random()} className="text-center text-[10px] text-slate-500 px-0.5 py-0.5">
                —
              </div>
            )
          )}
        </div>

        {/* Intestazione: ore */}
        <div className="grid grid-cols-[70px_repeat(10,1fr)] gap-0 mb-1">
          <div className="text-[10px] font-bold text-slate-500 px-1 py-0.5">Quota</div>
          {matrice.map((col) =>
            col ? (
              <div
                key={col.ora}
                className="text-center text-[11px] font-bold text-blue-200 px-0.5 py-0.5 bg-slate-700/60 rounded-t"
              >
                {String(col.ora).padStart(2, "0")}:00
              </div>
            ) : (
              <div key={Math.random()} className="text-center text-[11px] text-slate-500 px-0.5 py-0.5 bg-slate-700/30 rounded-t">
                —
              </div>
            )
          )}
        </div>

        {/* Righe: una per ogni quota */}
        {QUOTE_LABELS.map((ql, qIdx) => (
          <div
            key={ql.offset}
            className={`grid grid-cols-[70px_repeat(10,1fr)] gap-0 ${
              qIdx % 2 === 0 ? "bg-slate-800/40" : "bg-slate-800/10"
            } hover:bg-slate-700/30 transition-colors`}
          >
            {/* Etichetta quota */}
            <div className="flex items-center justify-end px-1.5 py-1 text-[10px] font-mono text-slate-400 truncate">
              {ql.offset === 0 ? `${altitude}m` : `${altitude + ql.offset}m`}
            </div>

            {/* Celle per ogni ora */}
            {matrice.map((col) => {
              if (!col)
                return (
                  <div
                    key={Math.random()}
                    className="flex items-center justify-center px-0.5 py-1 text-slate-600 text-[9px]"
                  >
                    —
                  </div>
                );

              const level = col.livelli[qIdx];
              if (!level)
                return (
                  <div
                    key={ql.offset + "-" + col.ora}
                    className="flex items-center justify-center px-0.5 py-1 text-slate-600 text-[9px]"
                  >
                    —
                  </div>
                );

              const bgGrad = getWindBgColor(level.speed);
              const barWidth = Math.min(100, (level.speed / (maxSpeed || 30)) * 100);

              return (
                <div
                  key={ql.offset + "-" + col.ora}
                  className={`flex flex-col items-center justify-center px-0.5 py-0.5 bg-gradient-to-b ${bgGrad} border border-slate-600/10`}
                >
                  {/* Barra vento */}
                  <div className="flex items-center gap-0.5 w-full justify-center">
                    <div className="w-8 h-1.5 bg-slate-600/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getWindColor(level.speed)} rounded-full transition-all`}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-bold text-slate-100 tabular-nums w-5 text-right">
                      {Math.round(level.speed)}
                    </span>
                  </div>

                  {/* Direzione con freccia */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-slate-300">{level.arrow}</span>
                    <span className="text-[7px] text-slate-400">{level.dirLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Riga pioggia */}
        <div className="grid grid-cols-[70px_repeat(10,1fr)] gap-0 mt-1 pt-1 border-t border-slate-600/30">
          <div className="flex items-center px-1.5 py-0.5 text-[9px] text-blue-300 font-medium">
            🌧️
          </div>
          {matrice.map((col) =>
            col ? (
              <div
                key={col.ora}
                className={`flex items-center justify-center px-0.5 py-0.5 text-[9px] ${
                  col.haPioggia ? "text-blue-300 font-bold" : "text-slate-600"
                }`}
              >
                {col.haPioggia ? `${col.pioggia.toFixed(1)}mm` : "—"}
              </div>
            ) : (
              <div key={Math.random()} className="flex items-center justify-center px-0.5 py-0.5 text-[9px] text-slate-600">
                —
              </div>
            )
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3 justify-center mt-3 pt-2 border-t border-slate-600/30">
        <span className="text-[9px] text-slate-400 font-bold">Vento (km/h):</span>
        {[
          { color: "bg-green-400", label: "0-5" },
          { color: "bg-green-500", label: "5-10" },
          { color: "bg-yellow-400", label: "10-15" },
          { color: "bg-yellow-500", label: "15-20" },
          { color: "bg-orange-400", label: "20-25" },
          { color: "bg-orange-500", label: "25-30" },
          { color: "bg-red-400", label: "30-35" },
          { color: "bg-red-500", label: "35-40" },
          { color: "bg-red-700", label: "40+" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded ${item.color}`} />
            <span className="text-[8px] text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WindgramChart;