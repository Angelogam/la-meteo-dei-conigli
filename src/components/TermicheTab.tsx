"use client";

import React from "react";
import { Sun, Waves, Wind, Thermometer as ThermometerIcon, ArrowUp, Clock } from "lucide-react";
import { generaTermicheOrarie } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";

interface DayLabel {
  value: number;
  label: string;
}

interface TermicheTabProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  dateLabels?: DayLabel[];
  dayIdx?: number;
  onDaySelect?: (idx: number) => void;
  fetchGiorno?: (giorno: number) => void;
}

export const TermicheTab: React.FC<TermicheTabProps> = ({
  dayData,
  altitude,
  selectedHour,
  dateLabels = [],
  dayIdx = 0,
  onDaySelect,
  fetchGiorno,
}) => {
  const termiche = generaTermicheOrarie(dayData, altitude);

  const dataOdierna = dayData[0]?.time || new Date();
  const maxTemp = Math.max(...termiche.map((t) => t.temp), 15);
  const maxBase = Math.max(...termiche.map((t) => t.base), 500);
  const maxVel = Math.max(...termiche.map((t) => t.windSpeed), 10);

  if (!termiche.length) {
    return (
      <div className="text-sm text-slate-300 p-4 text-center">
        Nessun dato termico disponibile.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* PULSANTI GIORNI - dentro il tab termiche */}
      {dateLabels.length > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-thin">
          {dateLabels.map((dl, i) => (
            <button
              key={i}
              onClick={() => {
                if (onDaySelect) onDaySelect(dl.value);
                if (dl.value > 0 && fetchGiorno) {
                  fetchGiorno(dl.value);
                }
              }}
              className={`shrink-0 px-3.5 py-2 text-xs font-bold rounded-xl border-2 transition-all duration-200 whitespace-nowrap ${
                (dayIdx ?? 0) === dl.value
                  ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/20 scale-105"
                  : "bg-slate-700/60 text-slate-300 border-slate-500/50 hover:bg-slate-600 hover:text-white hover:border-slate-400"
              }`}
            >
              {dl.value === 0 ? "Oggi" : dl.label}
            </button>
          ))}
        </div>
      )}

      {/* Riepilogo termico - Singola Card */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-600/50 p-4 md:p-5">
        <h3 className="text-base font-bold text-amber-400 mb-3 flex items-center gap-2">
          <Sun className="w-4 h-4" />
          Riepilogo termiche orarie
        </h3>

        <div className="grid md:grid-cols-2 gap-3">
          {/* TABELLA */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-600/50">
                  <th className="text-left py-2 pr-2">Ora</th>
                  <th className="text-right py-2 px-2">Temp</th>
                  <th className="text-right py-2 px-2">Base</th>
                  <th className="text-right py-2 px-2">Vento</th>
                  <th className="text-right py-2 pl-2">Qualità</th>
                </tr>
              </thead>
              <tbody>
                {termiche.map((t, idx) => {
                  const qualitàClasse =
                    t.quality >= 4
                      ? "text-green-400"
                      : t.quality >= 3
                        ? "text-yellow-400"
                        : "text-red-400";
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-slate-700/40 ${
                        selectedHour === t.hour
                          ? "bg-blue-600/20"
                          : "hover:bg-slate-700/30"
                      }`}
                    >
                      <td className="py-2 pr-2 font-mono">{t.hour}:00</td>
                      <td className="text-right py-2 px-2 font-mono">{t.temp}°C</td>
                      <td className="text-right py-2 px-2 font-mono">{t.base}m</td>
                      <td className="text-right py-2 px-2 font-mono">{t.windSpeed}km/h</td>
                      <td className={`text-right py-2 pl-2 font-bold ${qualitàClasse}`}>
                        {"★".repeat(t.quality)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* GRAFICO A BARRE */}
          <div className="flex flex-col justify-center">
            <div className="space-y-1">
              {termiche.slice(0, 10).map((t, idx) => {
                const altezzaTemp = Math.round((t.temp / maxTemp) * 100);
                const altezzaBase = Math.round((t.base / maxBase) * 100);
                const altezzaVel = Math.round((t.windSpeed / maxVel) * 100);

                return (
                  <div key={idx} className="flex items-center gap-2 md:gap-3 text-xs">
                    <span className="w-6 text-right font-mono text-slate-400 shrink-0">
                      {t.hour}
                    </span>
                    <div className="flex-1 flex items-center gap-1">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all"
                        style={{ width: `${altezzaTemp}%` }}
                        title={`Temp: ${t.temp}°C`}
                      />
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                        style={{ width: `${altezzaBase}%` }}
                        title={`Base: ${t.base}m`}
                      />
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                        style={{ width: `${altezzaVel}%` }}
                        title={`Vento: ${t.windSpeed}km/h`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                Temp
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Base
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                Vento
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermicheTab;