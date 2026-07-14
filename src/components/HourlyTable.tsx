"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { getVoloStatus } from "@/utils/volo";
import { getWindDirection, getWeatherIcon } from "@/utils/weatherHelpers";
import { Clock, Wind, ThermometerSun, Cloud, CloudRain, ArrowUp, Gauge, Sparkles, Mountain, TrendingUp } from "lucide-react";

interface HourlyTableProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

export default function HourlyTable({ dayData, altitude, selectedHour, onHourSelect }: HourlyTableProps) {
  const rows = useMemo(() => {
    const ore = Array.from({ length: 11 }, (_, i) => i + 9);
    return ore.map((ora) => {
      const h = dayData.find(d => d.time.getHours() === ora);
      if (!h) return null;
      
      const termiche = calcolaTermiche(h, altitude);
      const volo = getVoloStatus(h);
      const now = new Date();
      const isCurrent = ora === now.getHours();

      // La base termica è già assoluta (quota slm) da calcolaTermiche
      // Es: se decollo a 1350m, base ~1700m, top ~2500m
      const baseTermica = termiche.base;
      const topTermica = termiche.top;

      return {
        ora,
        temperatura: Math.round(h.temperature),
        vento: Math.round(h.windSpeed),
        raffica: h.windGusts ? Math.round(h.windGusts) : null,
        direzione: getWindDirection(h.windDir),
        ventoDir: h.windDir,
        termiche: termiche.rateo,
        termicheLabel: termiche.label,
        termicheColore: termiche.colore,
        base: baseTermica,
        top: topTermica,
        nuvole: h.cloudCover,
        pioggia: h.precipitation,
        codice: h.weatherCode,
        voloLabel: volo.label,
        voloIcon: volo.icon,
        voloColore: volo.color,
        hum: h.humidity,
        press: h.pressure,
        isCurrent,
      };
    }).filter(Boolean);
  }, [dayData, altitude]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        Nessun dato disponibile per questa giornata.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-slate-700/40 bg-slate-800/30">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/30">
        <Clock className="w-6 h-6 text-orange-400" />
        <span className="text-lg font-bold text-slate-200 tracking-wide">Previsioni orarie 9:00 – 19:00</span>
        <span className="text-sm text-slate-500 bg-slate-800/60 px-3 py-0.5 rounded-full">{rows.length} ore</span>
      </div>
      <div className="p-2">
        <table className="w-full text-base">
          <thead>
            <tr className="text-slate-400 text-xs uppercase tracking-wider">
              <th className="py-3 px-3 text-left w-16">Ora</th>
              <th className="py-3 px-3 text-center w-14">☀️</th>
              <th className="py-3 px-3 text-center">T°</th>
              <th className="py-3 px-3 text-center">Vento</th>
              <th className="py-3 px-3 text-center">Raff.</th>
              <th className="py-3 px-3 text-center">Dir</th>
              <th className="py-3 px-3 text-center">↑ Term.</th>
              <th className="py-3 px-3 text-center" title="Quota base termica (slm)">
                Base
              </th>
              <th className="py-3 px-3 text-center" title="Quota top termica (slm)">
                Top
              </th>
              <th className="py-3 px-3 text-center">☁️</th>
              <th className="py-3 px-3 text-center">💧</th>
              <th className="py-3 px-3 text-center">Volo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              if (!r) return null;
              const isSelected = r.ora === selectedHour;
              return (
                <tr
                  key={r.ora}
                  onClick={() => onHourSelect(r.ora)}
                  className={`cursor-pointer border-b border-slate-700/20 last:border-0 transition-all duration-150 ${
                    isSelected
                      ? "bg-green-900/25 border-l-4 border-l-green-400"
                      : r.isCurrent
                      ? "bg-emerald-900/15 border-l-4 border-l-emerald-400"
                      : "hover:bg-slate-700/30 border-l-4 border-l-transparent"
                  }`}
                >
                  {/* Ora */}
                  <td className="py-4 px-3">
                    <span className={`font-bold tabular-nums ${
                      isSelected ? "text-green-300 text-lg" : r.isCurrent ? "text-emerald-300 text-base" : "text-slate-200 text-base"
                    }`}>
                      {String(r.ora).padStart(2, "0")}
                    </span>
                  </td>

                  {/* Icona meteo */}
                  <td className="py-4 px-3 text-center text-3xl">
                    {getWeatherIcon(r.codice, 1)}
                  </td>

                  {/* Temperatura */}
                  <td className="py-4 px-3 text-center">
                    <span className="font-bold text-amber-300 tabular-nums text-lg">{r.temperatura}°</span>
                  </td>

                  {/* Vento km/h */}
                  <td className="py-4 px-3 text-center">
                    <span className="font-bold text-sky-300 tabular-nums text-lg">{r.vento}</span>
                    <span className="text-slate-500 text-xs ml-1">km/h</span>
                  </td>

                  {/* Raffica */}
                  <td className="py-4 px-3 text-center">
                    <span className={`tabular-nums font-semibold text-base ${
                      r.raffica && r.raffica > 30 ? "text-red-400" : "text-slate-400"
                    }`}>
                      {r.raffica ? r.raffica : "—"}
                    </span>
                  </td>

                  {/* Direzione */}
                  <td className="py-4 px-3 text-center">
                    <span className="text-slate-300 font-semibold text-base">{r.direzione}</span>
                  </td>

                  {/* Termiche (m/s) */}
                  <td className="py-4 px-3 text-center">
                    <span className="font-bold tabular-nums text-lg" style={{ color: r.termicheColore }}>
                      {r.termiche.toFixed(1)}
                    </span>
                    <span className="text-slate-500 text-xs ml-1">m/s</span>
                  </td>

                  {/* Base termica (quota slm) */}
                  <td className="py-4 px-3 text-center" title="Quota base termica sul livello del mare">
                    <div className="flex flex-col items-center">
                      <Mountain className="w-3 h-3 text-green-400 mb-0.5" />
                      <span className="text-green-300 font-semibold tabular-nums text-base">
                        {r.base > 0 ? r.base : "—"}
                      </span>
                      <span className="text-[9px] text-slate-500">slm</span>
                    </div>
                  </td>

                  {/* Top termica (quota slm) */}
                  <td className="py-4 px-3 text-center" title="Quota top termica sul livello del mare">
                    <div className="flex flex-col items-center">
                      <TrendingUp className="w-3 h-3 text-red-400 mb-0.5" />
                      <span className="text-red-300 font-semibold tabular-nums text-base">
                        {r.top > 0 ? r.top : "—"}
                      </span>
                      <span className="text-[9px] text-slate-500">slm</span>
                    </div>
                  </td>

                  {/* Nuvolosità */}
                  <td className="py-4 px-3 text-center">
                    <span className="text-slate-300 font-semibold text-base">{r.nuvole}%</span>
                  </td>

                  {/* Pioggia */}
                  <td className="py-4 px-3 text-center">
                    <span className={`font-semibold text-base ${r.pioggia > 0 ? "text-blue-300" : "text-slate-500"}`}>
                      {r.pioggia > 0 ? `${r.pioggia.toFixed(1)}mm` : "—"}
                    </span>
                  </td>

                  {/* Volo */}
                  <td className="py-4 px-3 text-center">
                    <span className={`px-3 py-1.5 rounded-md text-sm font-bold border ${r.voloColore}`}>
                      {r.voloIcon} {r.voloLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}