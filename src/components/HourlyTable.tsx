"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { getVoloStatus } from "@/utils/volo";
import { getWindDirection, getWeatherIcon } from "@/utils/weatherHelpers";
import { Clock, Thermometer, Wind, Calendar } from "lucide-react";

interface HourlyTableProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  dayLabel?: string;
}

function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
}

export default function HourlyTable({ dayData, altitude, selectedHour, onHourSelect, dayLabel }: HourlyTableProps) {
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
        voloIcon: volo.icon,
        voloColore: volo.color,
        isCurrent,
      };
    }).filter(Boolean) as any[];
  }, [dayData, altitude]);

  const dataLabel = useMemo(() => {
    if (dayLabel) return dayLabel;
    if (dayData && dayData.length > 0) return formatDate(dayData[0].time);
    return "";
  }, [dayData, dayLabel]);

  if (rows.length === 0) {
    return <div className="text-center py-12 text-slate-400 text-base">Nessun dato disponibile per questa giornata.</div>;
  }

  return (
    <div className="card bg-slate-800/30 border border-slate-700/50 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/30">
        <Clock className="w-6 h-6 text-orange-400 shrink-0" />
        <span className="text-base font-bold text-slate-200">Previsioni orarie</span>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-500" />{dataLabel}
        </span>
        <span className="text-sm text-slate-500 bg-slate-800/60 px-3 py-0.5 rounded-full ml-auto">{rows.length} ore</span>
      </div>
      <div className="p-2 overflow-x-auto">
        <div className="flex gap-2 justify-center">
          {rows.map((r: any) => {
            if (!r) return null;
            const isSelected = r.ora === selectedHour;
            return (
              <button
                key={r.ora}
                onClick={() => onHourSelect(r.ora)}
                className={"rounded-xl p-3 text-center transition-all border-2 cursor-pointer flex flex-col items-center gap-1 " + (
                  isSelected
                    ? "bg-emerald-900/30 border-emerald-400 shadow-md"
                    : r.isCurrent
                    ? "bg-emerald-900/15 border-emerald-400"
                    : "bg-slate-800/60 border-slate-700/50 hover:bg-slate-700/30"
                )}
              >
                <strong className="text-sm font-bold text-white">{String(r.ora).padStart(2, "0")}:00</strong>
                <span className="text-xl">{getWeatherIcon(r.codice, 1)}</span>
                <div className="flex items-center gap-1 text-xs">
                  <Thermometer className="w-3 h-3 text-amber-400 shrink-0" />
                  <strong className="font-bold text-amber-300">{r.temperatura}°</strong>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Wind className="w-3 h-3 text-sky-400 shrink-0" />
                  <strong className="font-bold text-sky-300">{r.vento}</strong>
                </div>
                <div className="text-xs text-slate-400">
                  <span className="font-bold" style={{ color: r.termicheColore }}>{r.termiche.toFixed(1)} m/s</span>
                </div>
                <div className="text-xs text-slate-400">{r.nuvole}%</div>
                <div className="mt-0.5">
                  <span className={"inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border " + r.voloColore}>
                    {r.voloIcon} {r.voloLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}