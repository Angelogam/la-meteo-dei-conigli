"use client";

import React from "react";
import type { WindProfile } from "@/types/meteo";
import { wa } from "@/utils/meteo";

interface VentiQuotaTabProps {
  profiles: WindProfile[];
  dayData: any[];
  selectedHour: number;
}

// Quote dal suolo a 4000m con step di 250m
const QUOTE_STEPS = [
  250, 500, 750, 1000, 1250, 1500, 1750, 2000,
  2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000,
];

// Livelli disponibili da Open-Meteo (in metri)
const AVAILABLE_LEVELS = [
  { height: 120, label: "120" },
  { height: 180, label: "180" },
  { height: 300, label: "300" },
  { height: 600, label: "600" },
  { height: 900, label: "900" },
  { height: 1200, label: "1200" },
  { height: 1500, label: "1500" },
  { height: 1800, label: "1800" },
  { height: 2100, label: "2100" },
  { height: 2400, label: "2400" },
  { height: 2800, label: "2800" },
  { height: 3200, label: "3200" },
  { height: 3600, label: "3600" },
  { height: 4000, label: "4000" },
];

/** Trova il valore interpolato dal profilo disponibile */
function interpolateAtHeight(levels: WindProfile["levels"], targetHeight: number): { speed: number | null; dir: number | null } {
  const sorted = [...levels].filter(l => l.speed !== null && l.dir !== null).sort((a, b) => a.height - b.height);
  if (!sorted.length) return { speed: null, dir: null };

  // Trova i due livelli più vicini
  let lower = sorted[0];
  let upper = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].height <= targetHeight && sorted[i + 1].height >= targetHeight) {
      lower = sorted[i];
      upper = sorted[i + 1];
      break;
    }
  }

  if (targetHeight <= sorted[0].height) return { speed: sorted[0].speed, dir: sorted[0].dir };
  if (targetHeight >= sorted[sorted.length - 1].height) return { speed: sorted[sorted.length - 1].speed, dir: sorted[sorted.length - 1].dir };

  if (lower.height === upper.height) return { speed: lower.speed, dir: lower.dir };

  const fraction = (targetHeight - lower.height) / (upper.height - lower.height);
  const speed = lower.speed! + (upper.speed! - lower.speed!) * fraction;
  const dir = lower.dir! + (upper.dir! - lower.dir!) * fraction;
  return { speed: Math.round(speed * 10) / 10, dir: Math.round(dir) };
}

const VentiQuotaTab = ({ profiles, dayData, selectedHour }: VentiQuotaTabProps) => {
  // Trova il profilo per l'ora selezionata
  const currentProfile = profiles.find(
    (p) => p.time.getHours() === selectedHour
  );
  // Trova l'orario in dayData
  const currentHourData = dayData.find(
    (h) => h.time.getHours() === selectedHour
  );

  if (!profiles.length) {
    return (
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-center">
        <p className="text-sm text-blue-300">I dati vento in quota non sono disponibili per questo decollo.</p>
        <p className="text-xs text-blue-400/60 mt-1">Open-Meteo fornisce dati vento in altitudine solo per alcune località.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Tabella venti in quota */}
      <table className="w-full text-xs md:text-sm border-collapse">
        <thead>
          <tr className="bg-slate-700/80 border-b border-slate-500/50">
            <th className="sticky left-0 bg-slate-700/80 z-10 px-2 py-2 text-left font-bold text-blue-200 whitespace-nowrap">
              Quota (m)
            </th>
            <th className="px-2 py-2 text-center font-bold text-blue-200" colSpan={2}>
              Vento
            </th>
            <th className="px-2 py-2 text-center font-bold text-slate-400 w-16">
              Dir
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Riga suolo */}
          <tr className="border-b border-slate-600/40 hover:bg-slate-700/40 transition-colors">
            <td className="sticky left-0 bg-slate-800/90 z-10 px-2 py-1.5 font-bold text-green-400 whitespace-nowrap">
              🏔 Suolo <span className="text-[10px] text-slate-400 font-normal">(10m)</span>
            </td>
            <td className="px-2 py-1.5 text-center">
              <div className="flex items-center gap-1 justify-center">
                <div className="h-2 bg-slate-600 rounded-full w-16 overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full"
                    style={{ width: `${Math.min(100, (currentHourData?.windSpeed ?? 0) / 35 * 100)}%` }}
                  />
                </div>
                <span className="font-bold text-white w-12 text-right">
                  {currentHourData?.windSpeed ? Math.round(currentHourData.windSpeed) : "--"}
                </span>
              </div>
            </td>
            <td className="px-2 py-1.5 text-center text-slate-300 w-10">
              km/h
            </td>
            <td className="px-2 py-1.5 text-center font-medium text-slate-200">
              {currentHourData?.windDir ? wa(currentHourData.windDir) : "--"}
            </td>
          </tr>

          {/* Righe per ogni quota interpolata */}
          {QUOTE_STEPS.map((q, idx) => {
            const interp = currentProfile
              ? interpolateAtHeight(currentProfile.levels, q)
              : { speed: null, dir: null };

            const speed = interp.speed;
            const dir = interp.dir;

            // Colore barra in base alla velocità
            const barColor = !speed
              ? "bg-slate-600"
              : speed < 10
              ? "bg-green-400"
              : speed < 20
              ? "bg-yellow-400"
              : speed < 30
              ? "bg-orange-400"
              : "bg-red-400";

            return (
              <tr
                key={q}
                className={`border-b border-slate-600/30 hover:bg-slate-700/30 transition-colors ${
                  idx % 2 === 0 ? "bg-slate-800/40" : ""
                }`}
              >
                <td className="sticky left-0 bg-inherit z-10 px-2 py-1 font-mono text-slate-300 whitespace-nowrap">
                  {q}
                </td>
                <td className="px-2 py-1 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <div className="h-1.5 bg-slate-600 rounded-full w-14 overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all`}
                        style={{ width: `${speed !== null ? Math.min(100, speed / 40 * 100) : 0}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-100 w-10 text-right text-[11px]">
                      {speed !== null ? Math.round(speed) : "--"}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-1 text-center text-slate-500 w-10 text-[10px]">
                  km/h
                </td>
                <td className="px-2 py-1 text-center font-medium text-slate-300 text-[11px]">
                  {dir !== null ? wa(dir) : "--"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legenda */}
      <div className="flex items-center gap-3 justify-center mt-3 pt-2 border-t border-slate-600/30">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-green-400" />
          <span className="text-[10px] text-slate-400"><10</span>
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
          <span className="text-[10px] text-slate-400">>30</span>
        </div>
        <span className="text-[10px] text-slate-500 ml-2">km/h</span>
      </div>
    </div>
  );
};

export default VentiQuotaTab;