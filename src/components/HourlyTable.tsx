"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { getVoloStatus } from "@/utils/volo";
import { Calendar } from "lucide-react";

interface HourlyTableProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  dayLabel?: string;
}

/** Icona meteo precisa basata su codice WMO, pioggia e nuvolosità effettiva */
function getIconaMeteoPrecisa(code: number, cloudCover: number = 0, precip: number = 0): string {
  // Temporali
  if (code >= 95 || (precip > 3 && cloudCover > 70)) return "⛈️";
  // Pioggia o rovesci
  if (code >= 80 || precip > 1.5) return "🌧️";
  if (code >= 61 || precip > 0.3) return "🌧️";
  if (code >= 51 || (precip > 0 && precip <= 0.3)) return "🌦️";
  // Neve
  if (code >= 71 && code <= 77) return "❄️";
  // Nebbia
  if (code >= 45 && code <= 48) return "🌫️";
  // Copertura nuvolosa reale
  if (cloudCover >= 85) return "☁️";
  if (cloudCover >= 60) return "⛅";
  if (cloudCover >= 25) return "🌤️";
  return "☀️";
}

/** Descrizione vento */
function ventoTesto(speed: number): string {
  if (speed < 3) return "Calma";
  if (speed < 8) return "Leggero";
  if (speed < 15) return "Moderato";
  if (speed < 22) return "Fresco";
  if (speed < 30) return "Forte";
  return "Molto forte";
}

/** Direzione vento in italiano */
function direzioneVento(deg: number): string {
  if (deg == null) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

export default function HourlyTable({ dayData, altitude, selectedHour, onHourSelect, dayLabel }: HourlyTableProps) {
  const rows = useMemo(() => {
    const ore = Array.from({ length: 11 }, (_, i) => i + 9); // 09:00 - 19:00
    return ore.map((ora) => {
      const h = dayData.find(d => new Date(d.time).getHours() === ora);
      if (!h) return null;
      const t = calcolaTermiche(h, altitude);
      const v = getVoloStatus(h);
      const now = new Date();
      const isAdesso = ora === now.getHours();
      
      const pioggiaVal = h.precipitation || h.rain || 0;
      const cloudVal = h.cloudCover ?? 0;

      return {
        ora,
        icona: getIconaMeteoPrecisa(h.weatherCode, cloudVal, pioggiaVal),
        temperatura: Math.round(h.temperature) + "°C",
        vento: Math.round(h.windSpeed) + " km/h",
        ventoTesto: ventoTesto(h.windSpeed),
        direzione: direzioneVento(h.windDir),
        raffiche: h.windGusts ? Math.round(h.windGusts) + " km/h" : "—",
        termiche: t.rateo.toFixed(1) + " m/s",
        nuvole: Math.round(cloudVal) + "%",
        pioggia: pioggiaVal > 0 ? pioggiaVal.toFixed(1) + "mm" : "0mm",
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
      const d = new Date(dayData[0].time);
      const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
      return `${giorni[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    }
    return "";
  }, [dayData, dayLabel]);

  if (rows.length === 0) {
    return <div className="text-center py-12 text-slate-400 text-base">Nessun dato disponibile per il giorno selezionato.</div>;
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30 bg-slate-800/60">
        <h3 className="text-base font-bold text-slate-200">Previsioni orarie (09:00 – 19:00)</h3>
        <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/40">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          {dataLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/40 text-slate-400 bg-slate-900/30 font-semibold">
              <th className="p-2.5 text-left">Ora</th>
              <th className="p-2.5 text-left">Meteo</th>
              <th className="p-2.5 text-left">Temp</th>
              <th className="p-2.5 text-left">Vento</th>
              <th className="p-2.5 text-left">Dir</th>
              <th className="p-2.5 text-left">Termiche</th>
              <th className="p-2.5 text-left">Nuvole</th>
              <th className="p-2.5 text-left">Pioggia</th>
              <th className="p-2.5 text-left">Volo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => {
              const isSelected = r.ora === selectedHour;
              return (
                <tr
                  key={r.ora}
                  onClick={() => onHourSelect(r.ora)}
                  className={`
                    border-b border-slate-700/20 cursor-pointer transition-all duration-150
                    ${isSelected ? "bg-emerald-950/60 border-l-4 border-l-emerald-400" : "hover:bg-slate-700/30"}
                    ${r.isAdesso && !isSelected ? "bg-slate-700/20" : ""}
                  `}
                >
                  <td className="p-2.5 font-bold text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{String(r.ora).padStart(2, "0")}:00</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-xl">{r.icona}</td>
                  <td className="p-2.5 font-bold text-amber-300">{r.temperatura}</td>
                  <td className="p-2.5 text-sky-300">
                    {r.vento} <span className="text-slate-400 text-[10px]">({r.ventoTesto})</span>
                  </td>
                  <td className="p-2.5 text-blue-300 font-semibold">{r.direzione}</td>
                  <td className="p-2.5 font-bold text-orange-400">{r.termiche}</td>
                  <td className={`p-2.5 font-medium ${parseInt(r.nuvole) >= 80 ? "text-slate-300 font-bold" : "text-slate-400"}`}>
                    {r.nuvole}
                  </td>
                  <td className={`p-2.5 font-bold ${r.pioggia !== "0mm" && r.pioggia !== "0.0mm" ? "text-rose-400" : "text-emerald-400"}`}>
                    {r.pioggia}
                  </td>
                  <td className="p-2.5">
                    <span className={"inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border " + r.voloColore}>
                      {r.voloIcona} {r.voloTesto}
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