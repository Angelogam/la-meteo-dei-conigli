"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { getVoloStatus } from "@/utils/volo";
import { Calendar, MapPin } from "lucide-react";

interface HourlyTableProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  dayLabel?: string;
  siteName?: string;
}

function iconaMeteo(code: number): string {
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌧️";
  if (code >= 71) return "❄️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 20) return "☁️";
  if (code >= 10) return "⛅";
  if (code >= 3) return "🌤️";
  return "☀️";
}

function ventoTesto(speed: number): string {
  if (speed < 3) return "Calma";
  if (speed < 8) return "Leggero";
  if (speed < 15) return "Moderato";
  if (speed < 22) return "Fresco";
  if (speed < 30) return "Forte";
  return "Molto forte";
}

function direzioneVento(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export default function HourlyTable({ dayData, altitude, selectedHour, onHourSelect, dayLabel, siteName }: HourlyTableProps) {
  const rows = useMemo(() => {
    const ore = Array.from({ length: 11 }, (_, i) => i + 9);
    return ore.map((ora) => {
      const h = dayData.find(d => d.time.getHours() === ora);
      if (!h) return null;
      const t = calcolaTermiche(h, altitude);
      const v = getVoloStatus(h);
      const now = new Date();
      const isAdesso = ora === now.getHours();
      
      return {
        ora,
        icona: iconaMeteo(h.weatherCode),
        temperatura: h.temperature !== null && h.temperature !== undefined ? `${Math.round(h.temperature)}°C` : "--°",
        vento: Math.round(h.windSpeed) + " km/h",
        ventoTesto: ventoTesto(h.windSpeed),
        direzione: direzioneVento(h.windDir),
        raffiche: h.windGusts ? Math.round(h.windGusts) + " km/h" : "—",
        termiche: t.rateo.toFixed(1) + " m/s",
        nuvole: Math.round(h.cloudCover) + "%",
        pioggia: h.precipitation > 0 ? h.precipitation.toFixed(1) + "mm" : "No",
        voloIcona: v.icon,
        voloTesto: v.label,
        voloColore: v.color,
        isAdesso,
      };
    }).filter(Boolean) as any[];
  }, [dayData, altitude]);

  const dataLabel = useMemo(() => {
    if (dayLabel) return dayLabel;
    if (dayData && dayData.length > 0) {
      const d = dayData[0].time;
      const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
      return `${giorni[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    }
    return "";
  }, [dayData, dayLabel]);

  if (rows.length === 0) {
    return <div className="text-center py-12 text-slate-400 text-base">Nessun dato disponibile.</div>;
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-200">Previsioni orarie</h3>
          {siteName && (
            <span className="flex items-center gap-1 text-xs text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <MapPin className="w-3 h-3" />
              {siteName}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />{dataLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/30 text-slate-500">
              <th className="p-2 text-left">Ora</th>
              <th className="p-2 text-left">Meteo</th>
              <th className="p-2 text-left">Temp</th>
              <th className="p-2 text-left">Vento</th>
              <th className="p-2 text-left">Dir</th>
              <th className="p-2 text-left">Termiche</th>
              <th className="p-2 text-left">Nuvole</th>
              <th className="p-2 text-left">Pioggia</th>
              <th className="p-2 text-left">Volo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr
                key={r.ora}
                onClick={() => onHourSelect(r.ora)}
                className={`
                  border-b border-slate-700/20 cursor-pointer transition-colors
                  ${r.ora === selectedHour ? "bg-emerald-900/30 border-emerald-500" : "hover:bg-slate-700/30"}
                  ${r.isAdesso ? "bg-emerald-900/15" : ""}
                `}
              >
                <td className="p-2 font-bold text-white">{String(r.ora).padStart(2, "0")}:00</td>
                <td className="p-2 text-lg">{r.icona}</td>
                <td className="p-2 font-bold text-amber-300">{r.temperatura}</td>
                <td className="p-2 text-sky-300">{r.vento} <span className="text-slate-500">({r.ventoTesto})</span></td>
                <td className="p-2 text-blue-300">{r.direzione}</td>
                <td className="p-2 font-bold" style={{ color: "#f97316" }}>{r.termiche}</td>
                <td className="p-2 text-slate-300">{r.nuvole}</td>
                <td className="p-2 text-blue-300">{r.pioggia}</td>
                <td className="p-2">
                  <span className={"inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border " + r.voloColore}>
                    {r.voloIcona} {r.voloTesto}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}