"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { getVoloStatus } from "@/utils/volo";
import { getWindDirection, getWeatherIcon } from "@/utils/weatherHelpers";
import { Clock, Mountain, TrendingUp, Cloud, Droplets, Wind, Thermometer } from "lucide-react";

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
      return {
        ora,
        temperatura: Math.round(h.temperature),
        vento: Math.round(h.windSpeed),
        raffica: h.windGusts ? Math.round(h.windGusts) : null,
        direzione: getWindDirection(h.windDir),
        termiche: termiche.rateo,
        termicheColore: termiche.colore,
        base: termiche.base,
        top: termiche.top,
        nuvole: h.cloudCover,
        pioggia: h.precipitation,
        codice: h.weatherCode,
        voloLabel: volo.label,
        voloIcon: "",
        voloColore: volo.color,
        isCurrent,
      };
    }).filter(Boolean) as any[];
  }, [dayData, altitude]);

  if (rows.length === 0) {
    return <div className="text-center py-8 text-slate-500 text-sm">Nessun dato orario disponibile.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-900/40">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/50">
        <Clock className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-slate-200">Orario 9:00–19:00</span>
        <span className="text-xs text-slate-600 ml-auto">{rows.length} ore</span>
      </div>
      <div className="p-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-2 text-left font-medium">Ora</th>
              <th className="py-2.5 px-2 text-center font-medium">Tempo</th>
              <th className="py-2.5 px-2 text-center font-medium">T°</th>
              <th className="py-2.5 px-2 text-center font-medium">Vento</th>
              <th className="py-2.5 px-2 text-center font-medium">Raff.</th>
              <th className="py-2.5 px-2 text-center font-medium">Dir</th>
              <th className="py-2.5 px-2 text-center font-medium">↑ m/s</th>
              <th className="py-2.5 px-2 text-center font-medium">Base</th>
              <th className="py-2.5 px-2 text-center font-medium">Top</th>
              <th className="py-2.5 px-2 text-center font-medium">Nuv</th>
              <th className="py-2.5 px-2 text-center font-medium">Pioggia</th>
              <th className="py-2.5 px-2 text-center font-medium">Volo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => {
              if (!r) return null;
              const isSelected = r.ora === selectedHour;
              return (
                <tr
                  key={r.ora}
                  onClick={() => onHourSelect(r.ora)}
                  className={`cursor-pointer border-b border-slate-800/30 last:border-0 transition-colors text-[13px] ${
                    isSelected
                      ? "bg-emerald-900/25 border-l-2 border-l-emerald-500"
                      : r.isCurrent
                      ? "bg-emerald-900/10 border-l-2 border-l-emerald-500/50"
                      : "hover:bg-slate-800/30 border-l-2 border-l-transparent"
                  }`}
                >
                  <td className="py-2.5 px-2"><span className="font-semibold text-slate-200">{String(r.ora).padStart(2, "0")}:00</span></td>
                  <td className="py-2.5 px-2 text-center text-lg">{getWeatherIcon(r.codice, 1)}</td>
                  <td className="py-2.5 px-2 text-center"><span className="font-semibold text-amber-400">{r.temperatura}°</span></td>
                  <td className="py-2.5 px-2 text-center"><span className="font-semibold text-sky-300">{r.vento}</span></td>
                  <td className="py-2.5 px-2 text-center"><span className={`font-semibold ${r.raffica && r.raffica > 30 ? "text-red-400" : "text-slate-500"}`}>{r.raffica || "—"}</span></td>
                  <td className="py-2.5 px-2 text-center"><span className="font-medium text-slate-300">{r.direzione}</span></td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="font-semibold" style={{ color: r.termicheColore }}>{r.termiche.toFixed(1)}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center">
                      <Mountain className="w-3 h-3 text-emerald-500" />
                      <span className="text-[11px] font-semibold text-emerald-400">{r.base > 0 ? r.base : "—"}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center">
                      <TrendingUp className="w-3 h-3 text-orange-500" />
                      <span className="text-[11px] font-semibold text-orange-400">{r.top > 0 ? r.top : "—"}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center"><span className="font-medium text-slate-400">{r.nuvole}%</span></td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`font-medium ${r.pioggia > 0 ? "text-sky-400" : "text-slate-600"}`}>
                      {r.pioggia > 0 ? `${r.pioggia.toFixed(1)}mm` : "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${r.voloColore}`}>
                      {r.voloLabel}
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
