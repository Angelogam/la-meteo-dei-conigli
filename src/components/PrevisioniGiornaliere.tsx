"use client";

import React, { useMemo } from "react";
import { Calendar, Thermometer, Umbrella, Sun, Wind } from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: any[];
  dateLabels: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure?: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
  nomeDecollo?: string;
}

/** Icona meteo chiara */
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

/** Descrizione meteo chiara in italiano */
function descrizioneMeteo(code: number): string {
  if (code >= 95) return "Temporali";
  if (code >= 80) return "Rovesci";
  if (code >= 71) return "Neve";
  if (code >= 61) return "Pioggia";
  if (code >= 51) return "Pioggerella";
  if (code >= 45) return "Nebbia";
  if (code >= 20) return "Nuvoloso";
  if (code >= 10) return "Poco nuv.";
  if (code >= 3) return "Sereno";
  return "Sereno";
}

/** Label leggibile per la quantità di pioggia */
function pioggiaLabel(mm: number): string {
  if (mm < 0.1) return "No";
  if (mm < 1) return "Debole";
  if (mm < 5) return "Moderata";
  if (mm < 15) return "Forte";
  return "Molto forte";
}

/** Label per la forza del vento medio */
function ventoLabel(speed: number): string {
  if (speed < 3) return "Calma";
  if (speed < 8) return "Leggero";
  if (speed < 15) return "Moderato";
  if (speed < 22) return "Fresco";
  if (speed < 30) return "Forte";
  return "Molto forte";
}

function formatDateShort(date: any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
}

function getDayLabel(idx: number): string {
  if (idx === 0) return "Oggi";
  if (idx === 1) return "Domani";
  return "Dopodomani";
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  currentData,
  dayData,
  site,
  selectedDay,
  onSelectDay,
  nomeDecollo
}: PrevisioniGiornaliereProps) {
  const precipTotaleReale = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < dayData.length; i++) {
      sum += dayData[i].precipitation || 0;
    }
    return Math.round(sum * 10) / 10;
  }, [dayData]);

  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-base">Caricamento previsioni...</div>;
  }

  const days = enrichedDaily.slice(0, 3);
  const dayButtons: React.ReactNode[] = [];
  for (let idx = 0; idx < days.length; idx++) {
    const day = days[idx];
    const isActive = idx === selectedDay;
    const weatherCode = day.weatherCode ?? 0;
    const precipGiorno = idx === selectedDay && precipTotaleReale > 0 ? precipTotaleReale : Math.round((day.precipSum ?? 0) * 10) / 10;

    // Stima vento medio del giorno (dal primo dato utile)
    let ventoMedio = 0;
    if (day.windSpeedMax != null) ventoMedio = day.windSpeedMax;
    else if (dayData && dayData.length > 0) {
      const oreGiorno = dayData.filter((h: any) => {
        const hd = h.time instanceof Date ? h.time : new Date(h.time);
        const dd = day.date instanceof Date ? day.date : new Date(day.date);
        return hd.getDate() === dd.getDate() && hd.getMonth() === dd.getMonth();
      });
      if (oreGiorno.length > 0) {
        let sum = 0;
        for (let i = 0; i < oreGiorno.length; i++) sum += oreGiorno[i].windSpeed || 0;
        ventoMedio = sum / oreGiorno.length;
      }
    }

    dayButtons.push(
      <button
        key={idx}
        onClick={() => onSelectDay(idx)}
        className={`text-left transition-all border-2 cursor-pointer p-4 rounded-xl flex-1 min-w-[140px] ${
          isActive
            ? "border-emerald-400 bg-emerald-900/40 shadow-lg"
            : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
        }`}
      >
        {/* Nome giorno */}
        <div className="text-sm font-bold text-white mb-1">{getDayLabel(idx)}</div>
        <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {day.date ? formatDateShort(day.date) : ""}
        </div>

        {/* Icona meteo + descrizione */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{iconaMeteo(weatherCode)}</span>
          <span className="text-sm font-bold text-slate-200">{descrizioneMeteo(weatherCode)}</span>
        </div>

        {/* Temperatura */}
        <div className="flex items-center gap-1 text-xs mb-1">
          <Thermometer className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="text-white font-bold">{Math.round(day.tempMax)}°</span>
          <span className="text-slate-500">max</span>
          <span className="text-white font-bold ml-1">{Math.round(day.tempMin)}°</span>
          <span className="text-slate-500">min</span>
        </div>

        {/* Vento */}
        <div className="flex items-center gap-1 text-xs mb-1">
          <Wind className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="font-bold text-sky-300">{ventoLabel(ventoMedio)}</span>
          <span className="text-slate-500">({Math.round(ventoMedio)} km/h)</span>
        </div>

        {/* Pioggia */}
        <div className="flex items-center gap-1 text-xs">
          <Umbrella className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="font-bold text-blue-300">{pioggiaLabel(precipGiorno)}</span>
          {precipGiorno > 0 && (
            <span className="text-slate-500">({precipGiorno.toFixed(1)}mm)</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">
        {dayButtons}
      </div>
    </div>
  );
}