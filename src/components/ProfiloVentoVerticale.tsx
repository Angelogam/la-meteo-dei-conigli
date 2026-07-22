"use client";

import React, { useMemo } from "react";
import { Thermometer, Wind, ArrowUp, Gauge, TrendingUp } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface ProfiloVentoVerticaleProps {
  dayData: HourData[];
  siteAlt: number;
  siteName?: string;
}

function getWindArrow(deg: number): string {
  if (deg == null) return "";
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

function getDirAbbrev(deg: number): string {
  if (deg == null) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getSpeedColor(speed: number): string {
  if (speed <= 8) return "text-emerald-400";
  if (speed <= 15) return "text-lime-400";
  if (speed <= 22) return "text-amber-400";
  if (speed <= 30) return "text-orange-400";
  return "text-red-400";
}

function getBarColor(speed: number): string {
  if (speed <= 8) return "bg-emerald-400";
  if (speed <= 15) return "bg-lime-400";
  if (speed <= 22) return "bg-amber-400";
  if (speed <= 30) return "bg-orange-400";
  return "bg-red-400";
}

export default function ProfiloVentoVerticale({ dayData, siteAlt, siteName }: ProfiloVentoVerticaleProps) {
  const data = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    const hd = dayData.find(h => h.time.getHours() === 13)
      || dayData.find(h => h.time.getHours() >= 11 && h.time.getHours() <= 15)
      || dayData[0];

    if (!hd) return null;

    const surfaceSpeed = hd.windSpeed;
    const surfaceDir = hd.windDir;
    const surfaceTemp = hd.temperature;
    const dewPoint = hd.dewPoint ?? (surfaceTemp - 8);

    // Gradiente: usa la temperatura a 2m come riferimento, stima adiabatica secca
    const gradiente = 0.98;
    const gradoGradiente = "Adiabatico secco (stimato)";
    const gradienteLabel = "Stabile";

    // Zero termico
    const zeroTermico = Math.round(Math.max(siteAlt + 200, siteAlt + surfaceTemp * 90 + (surfaceTemp - dewPoint) * 20));
    const freezingLevel = hd.freezingLevel ?? zeroTermico;

    // Genera quote da decollo a 4000m step 250
    const quote: number[] = [];
    const start = Math.floor(siteAlt / 250) * 250;
    for (let q = start; q <= 4000; q += 250) quote.push(q);

    const righe = quote.map(q => {
      const deltaAlt = q - siteAlt;
      const temp = Math.round((surfaceTemp - (deltaAlt / 100) * gradiente) * 10) / 10;

      // Stima vento: logaritmica + rotazione
      let speed: number;
      if (q <= siteAlt + 100) {
        speed = Math.round(surfaceSpeed);
      } else {
        const h = Math.max(10, q);
        speed = Math.round(Math.min(surfaceSpeed * Math.pow(h / 10, 0.143), surfaceSpeed * 1.5) * 10) / 10;
      }
      speed = Math.max(0.5, speed);
      const rotazione = Math.round((q - siteAlt) / 250) * 2;
      const dir = Math.round(((surfaceDir + rotazione) % 360 + 360) % 360);

      return { quota: q, temp, speed, dir };
    });

    const maxSpeed = Math.max(...righe.map(r => r.speed), 1);

    return {
      gradiente,
      gradienteLabel,
      gradoGradiente,
      zeroTermico,
      freezingLevel,
      righe,
      maxSpeed,
      surfaceTemp: Math.round(surfaceTemp),
      dewPoint: Math.round(dewPoint),
    };
  }, [dayData, siteAlt]);

  if (!data || data.righe.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Dati insufficienti per il profilo verticale.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Riepilogo gradiente e zero termico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            Gradiente termico
          </div>
          <div className="text-base font-bold text-white">{data.gradiente}°C/100m</div>
          <div className="text-[10px] text-slate-400">{data.gradienteLabel} ({data.gradoGradiente})</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Thermometer className="w-3 h-3 text-amber-400" />
            Temp. superficie
          </div>
          <div className="text-base font-bold text-amber-300">{data.surfaceTemp}°C</div>
          <div className="text-[10px] text-slate-400">Dew point {data.dewPoint}°C</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ArrowUp className="w-3 h-3 text-cyan-400" />
            Zero termico
          </div>
          <div className="text-base font-bold text-cyan-300">{data.zeroTermico}m</div>
          <div className="text-[10px] text-slate-400">
            {data.freezingLevel !== data.zeroTermico ? `Open-Meteo: ${data.freezingLevel}m` : ""}
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Gauge className="w-3 h-3 text-purple-400" />
            Max vento
          </div>
          <div className="text-base font-bold text-purple-300">{Math.round(data.maxSpeed)} km/h</div>
          <div className="text-[10px] text-slate-400">a {data.righe.reduce((best, r) => r.speed > best.speed ? r : best, data.righe[0]).quota}m</div>
        </div>
      </div>

      {/* Tabella profilo */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/30">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">Profilo verticale · {siteName || "Decollo"}</span>
          <span className="text-[10px] text-slate-500 ml-auto">{siteAlt}m → 4000m (step 250m)</span>
        </div>
        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-900/90 z-10">
              <tr className="border-b border-slate-700/30 text-slate-500">
                <th className="p-2 text-left w-14">Quota</th>
                <th className="p-2 text-left w-20">Temp</th>
                <th className="p-2 text-left">Vento</th>
                <th className="p-2 text-left w-16">Dir</th>
                <th className="p-2 text-left w-16">°</th>
              </tr>
            </thead>
            <tbody>
              {data.righe.map((r, i) => {
                const isZero = Math.abs(r.quota - data.zeroTermico) < 200;
                const isDecollo = Math.abs(r.quota - siteAlt) < 100;
                return (
                  <tr
                    key={r.quota}
                    className={`border-b border-slate-700/20 transition-colors ${
                      isZero ? "bg-cyan-900/20" : isDecollo ? "bg-emerald-900/20" : "hover:bg-slate-700/30"
                    }`}
                  >
                    <td className="p-2 font-mono font-bold text-white whitespace-nowrap">
                      {r.quota}m
                      {isDecollo && <span className="text-[8px] text-emerald-400 ml-1">🪂</span>}
                      {isZero && <span className="text-[8px] text-cyan-400 ml-1">❄️</span>}
                    </td>
                    <td className={`p-2 font-mono whitespace-nowrap ${r.temp > 15 ? "text-amber-300" : r.temp > 5 ? "text-yellow-300" : "text-blue-300"}`}>
                      {r.temp > 0 ? "+" : ""}{r.temp}°
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-700/60 rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full ${getBarColor(r.speed)}`}
                            style={{ width: `${Math.max(4, (r.speed / data.maxSpeed) * 100)}%` }}
                          />
                        </div>
                        <span className={`font-mono font-bold ${getSpeedColor(r.speed)}`}>
                          {Math.round(r.speed)} km/h
                        </span>
                      </div>
                    </td>
                    <td className="p-2 font-mono text-sky-300 whitespace-nowrap">
                      {getWindArrow(r.dir)} {getDirAbbrev(r.dir)}
                    </td>
                    <td className="p-2 text-slate-500 font-mono whitespace-nowrap">{Math.round(r.dir)}°</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda colori */}
      <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-400" /> ≤8</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-lime-400" /> 9-15</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400" /> 16-22</span**16. `GraficoTermiche.tsx`** — `TermicheData` non esportato
**17-19. `ThermalChart.tsx`** — `label` e `gradienteReale` non in `TermicheResult`
**20-21. `meteoIntegrityTest.ts`** — `mockData` non è `HourData`

<dyad-write path="src/components/GraficoTermiche.tsx" description="Fix TypeScript error — replace TermicheData import with inline type">
"use client";

import React, { useState } from "react";

interface TermicheDato {
  rateo: number;
  forza: number;
  base: number;
  top: number;
  label: string;
  colore: string;
  gradienteReale: number;
}

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheDato }[];
  oraCorrente: number;
}

const HOURS_VISIBILI = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const GraficoTermiche = ({ hourly, oraCorrente }: GraficoTermicheProps) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  if (!hourly || hourly.length === 0) {
    return <div className="text-center py-8 text-slate-500">Nessun dato termico</div>;
  }

  const daMostrare = HOURS_VISIBILI.map((h) => {
    const trovato = hourly.find((x) => x.hour === h);
    if (trovato) return trovato;
    for (let i = h + 1; i <= h + 2; i++) {
      const vicino = hourly.find((x) => x.hour === i);
      if (vicino) return vicino;
    }
    return { hour: h, termiche: { rateo: 0, forza: 0, base: 0, top: 0, label: "N/D", colore: "#475569", gradienteReale: 0 } };
  });

  const maxVal = Math.max(...daMostrare.map((d) => d.termiche.rateo), 0.1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {daMostrare.map((d) => {
          const pct = (d.termiche.rateo / maxVal) * 100;
          const isSelected = d.hour === selectedHour;
          const isCorrente = d.hour === oraCorrente;

          return (
            <button
              key={d.hour}
              onClick={() => setSelectedHour(d.hour === selectedHour ? null : d.hour)}
              className={`flex flex-col items-center flex-1 transition-all rounded cursor-pointer p-1 ${
                isSelected ? "bg-green-900/30 scale-110" : isCorrente ? "bg-emerald-900/20" : "hover:bg-slate-700/30"
              }`}
            >
              <div className="w-full h-24 bg-slate-800/60 rounded-md relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(pct, 3)}%`,
                    backgroundColor: d.termiche.colore || "#475569",
                    opacity: d.termiche.rateo > 0 ? 0.8 : 0.3,
                  }}
                />
              </div>
              <span className={`text-[10px] mt-1 font-mono ${isSelected ? "text-green-300 font-bold" : "text-slate-500"}`}>
                {String(d.hour).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      {selectedHour !== null && (
        <div className="bg-slate-800/60 rounded-xl p-3 border border-green-400/30 text-center">
          <div className="text-xs text-slate-400 mb-1">Ore {String(selectedHour).padStart(2, "0")}:00</div>
          <div className="text-lg font-bold text-green-300">
            {daMostrare.find((d) => d.hour === selectedHour)?.termiche.rateo.toFixed(1) || "0.0"} m/s
          </div>
          <div className="text-xs text-slate-400">
            Base {daMostrare.find((d) => d.hour === selectedHour)?.termiche.base || 0}m
            · Top {daMostrare.find((d) => d.hour === selectedHour)?.termiche.top || 0}m
          </div>
        </div>
      )}
    </div>
  );
};

export default GraficoTermiche;