"use client";

import React, { useMemo } from "react";
import { Sun, Thermometer, ArrowUp, ArrowUpRight } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface ThermalDayGraphProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  thermalDelta: number;
}

export default function ThermalDayGraph({
  dayData,
  altitude,
  selectedHour,
  onHourSelect,
  thermalDelta,
}: ThermalDayGraphProps) {
  const data = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];

    return dayData
      .filter(h => {
        const ora = h.time.getHours();
        return ora >= 6 && ora <= 20;
      })
      .map(h => {
        const ora = h.time.getHours();
        const termiche = calcolaTermiche(h, altitude);
        const irraggiamento = getIrraggiamentoPercentuale(ora);
        const attivita = termiche.rateo * 25; // 0-100%
        const baseTermica = h.temperature - 10 + (h.temperature - altitude * 0.0065) * 0.3;
        return {
          ora,
          temperatura: h.temperature,
          dewPoint: h.dewPoint,
          rateo: termiche.rateo,
          base: baseTermica,
          attivita: Math.min(100, Math.max(0, attivita)),
          irraggiamento,
          copertura: h.cloudCover ?? 50,
          ventoSuolo: h.windSpeed ?? 0,
          ventoAlta: h.windSpeed2000 ?? h.windSpeed ?? 0,
        };
      });
  }, [dayData, altitude]);

  const maxTemperatura = useMemo(() => Math.max(...data.map(d => d.temperatura), 25), [data]);
  const minTemperatura = useMemo(() => Math.min(...data.map(d => d.temperatura), 5), [data]);
  const rangeTemperatura = Math.max(maxTemperatura - minTemperatura, 10);

  const maxRateo = useMemo(() => Math.max(...data.map(d => d.rateo), 1), [data]);
  const rangeRateo = Math.max(maxRateo, 1);

  if (data.length === 0) return null;

  return (
    <div className="bg-slate-800/40 rounded-2xl p-4 sm:p-6 border border-slate-700/30">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Sun className="text-amber-400" size={22} />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Andamento Termico Giornaliero</h3>
          <p className="text-[11px] text-slate-400">Sviluppo termiche ore {data[0]?.ora ?? 6}–{data[data.length-1]?.ora ?? 20}</p>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 mb-5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-amber-400" />
          <span className="text-slate-300">Attività termica</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-sky-400" />
          <span className="text-slate-300">Temperatura</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-green-400" />
          <span className="text-slate-300">Base termica</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400/50 border border-amber-400" />
          <span className="text-slate-300">Rateo (m/s)</span>
        </div>
      </div>

      {/* Grafico */}
      <div className="relative h-52 sm:h-64 mb-2">
        {/* Griglia sfondo */}
        <div className="absolute inset-0 grid grid-cols-[30px_1fr]">
          <div className="border-r border-slate-700/30" />
        </div>
        <div className="absolute inset-0 flex flex-col">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 border-b border-slate-700/10" />
          ))}
        </div>

        {/* Area attività termica */}
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${data.length * 20} 100`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="thermalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Area attività termica */}
          <polyline
            fill="url(#thermalGradient)"
            stroke="none"
            points={data.map((d, i) => {
              const x = (i + 0.5) * (100 / data.length);
              const y = 100 - d.attivita;
              return `${x},${y}`;
            }).join(" ") + ` ${100},100 0,100`}
          />
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
            points={data.map((d, i) => {
              const x = (i + 0.5) * (100 / data.length);
              const y = 100 - d.attivita;
              return `${x},${y}`;
            }).join(" ")}
          />

          {/* Linea temperatura */}
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
            opacity={0.7}
            points={data.map((d, i) => {
              const x = (i + 0.5) * (100 / data.length);
              const tempPercent = ((d.temperatura - minTemperatura) / rangeTemperatura) * 100;
              const y = 95 - tempPercent * 0.85;
              return `${x},${y}`;
            }).join(" ")}
          />

          {/* Linea base termica */}
          <polyline
            fill="none"
            stroke="#4ade80"
            strokeWidth={0.4}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="3,2"
            opacity={0.6}
            points={data.map((d, i) => {
              const x = (i + 0.5) * (100 / data.length);
              const basePercent = ((d.base - minTemperatura) / rangeTemperatura) * 100;
              const y = 95 - basePercent * 0.85;
              return `${x},${y}`;
            }).join(" ")}
          />

          {/* Punti rateo */}
          {data.map((d, i) => {
            if (d.rateo < 0.1) return null;
            const x = (i + 0.5) * (100 / data.length);
            const y = 100 - (d.rateo / rangeRateo) * 90;
            const isSelected = d.ora === selectedHour;
            // rimuovo che non ci sia null nel rendering
            return (
              <circle
                key={d.ora}
                cx={x}
                cy={y}
                r={isSelected ? 1.2 : 0.8}
                fill={isSelected ? "#fbbf24" : "#f59e0b"}
                stroke={isSelected ? "#fff" : "none"}
                strokeWidth={isSelected ? 0.3 : 0}
                opacity={0.6}
              />
            );
          })}
        </svg>

        {/* Barre copertura nuvolosa */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end h-8 gap-0.5 px-0.5">
          {data.map(d => {
            const act = Math.min(d.attivita, 100);
            return (
              <div
                key={d.ora}
                className="flex-1 rounded-t"
                style={{
                  height: `${act * 0.15}%`,
                  backgroundColor: d.ora === selectedHour ? "#f59e0b" : "rgba(245, 158, 11, 0.15)",
                }}
              />
            );
          })}
        </div>

        {/* Etichette ore */}
        <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[9px] text-slate-500">
          {data.filter((_, i) => i % 2 === 0).map(d => (
            <span key={d.ora}>{String(d.ora).padStart(2, "0")}:00</span>
          ))}
        </div>
      </div>

      {/* Tabella dati orari (compact) */}
      <div className="mt-6 overflow-x-auto -mx-2">
        <div className="flex gap-2 min-w-max px-2">
          {data.map(d => {
            const isSelected = d.ora === selectedHour;
            const actPct = Math.round(d.attivita);
            return (
              <button
                key={d.ora}
                onClick={() => onHourSelect(d.ora)}
                className={`
                  flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px] transition-all
                  ${isSelected
                    ? "bg-amber-500/20 border border-amber-500/40 scale-105"
                    : "bg-slate-800/60 border border-slate-700/30 hover:border-slate-600/50"
                  }
                `}
              >
                <span className={`font-bold ${isSelected ? "text-amber-300" : "text-slate-300"}`}>
                  {String(d.ora).padStart(2, "0")}
                </span>
                {/* Barretta attività */}
                <div className="w-8 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400"
                    style={{ width: `${actPct}%` }}
                  />
                </div>
                <span className="text-slate-400">{d.temperatura.toFixed(0)}°</span>
                {d.rateo >= 0.3 && (
                  <span className="text-[9px] text-green-400">{d.rateo.toFixed(1)} m/s</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Calcola percentuale irraggiamento solare in base all'ora del giorno
function getIrraggiamentoPercentuale(ora: number): number {
  const curva = [
    [6, 10], [7, 25], [8, 45], [9, 65],
    [10, 80], [11, 90], [12, 95], [13, 100],
    [14, 98], [15, 92], [16, 80], [17, 65],
    [18, 45], [19, 25], [20, 10],
  ];
  const found = curva.find(([h]) => h === ora);
  return found ? found[1] : 0;
}