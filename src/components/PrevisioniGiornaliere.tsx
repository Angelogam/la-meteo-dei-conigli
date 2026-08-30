import React from "react";
import {
  CloudRain,
  Sun,
  Cloud,
  Wind,
  Thermometer,
  Calendar,
  Mountain,
} from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: any[];
  dateLabels: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure: string };
  selectedDay: number;
  onSelectDay: (dayIdx: number) => void;
  nomeDecollo?: string;
}

function getWeatherEmoji(code: number): string {
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌧️";
  if (code >= 71) return "❄️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 20) return "☁️";
  if (code >= 10) return "⛅";
  if (code >= 5) return "🌤️";
  return "☀️";
}

function safeNumber(val: any): number {
  if (val == null || val === undefined || isNaN(val)) return 0;
  return Number(val);
}

function safeRound(val: any): string {
  const n = safeNumber(val);
  return n.toFixed(0);
}

// Calcola il weather code predominante per il giorno
function getDayWeatherCode(hours: any[]): number {
  if (!hours || hours.length === 0) return 0;
  // Prendi il weather code più frequente nelle ore diurne (6-18)
  const dayHours = hours.filter(h => {
    const hour = new Date(h.time).getHours();
    return hour >= 6 && hour <= 18;
  });
  const relevantHours = dayHours.length > 0 ? dayHours : hours;
  
  const codes = relevantHours.map(h => h.weatherCode ?? 0).filter(c => c != null);
  if (codes.length === 0) return 0;
  
  // Restituisci il codice più frequente
  const freq = new Map<number, number>();
  codes.forEach(c => freq.set(c, (freq.get(c) || 0) + 1));
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  selectedDay,
  onSelectDay,
  nomeDecollo,
}: PrevisioniGiornaliereProps) {
  const tabs = ["Oggi", "Domani", "Dopodomani"];

  return (
    <div className="space-y-3">
      {nomeDecollo && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            Previsioni 3 giorni · {nomeDecollo}
          </span>
          <span>Open-Meteo GFS</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tabName, idx) => {
          const daily = enrichedDaily[idx];
          const isActive = selectedDay === idx;
          const label = dateLabels[idx] || tabName;
          
          // Usa i nomi di proprietà corretti da enrichedDaily
          const tempMax = daily ? safeRound(daily.tempMax) : "--";
          const tempMin = daily ? safeRound(daily.tempMin) : "--";
          const ventoMax = daily ? safeRound(daily.windMax) : "--";
          const pioggia = daily ? daily.rainSum : 0;
          const weatherCode = daily ? getDayWeatherCode(daily.hours) : 0;
          const isRainy = pioggia > 0.5;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`text-left transition-all border-2 cursor-pointer p-3 rounded-2xl flex flex-col justify-between min-w-0 ${
                isActive
                  ? "border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-900/20"
                  : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70"
              } ${isRainy ? "border-rose-500/40" : ""}`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-white truncate">
                  {tabName}
                </span>
                <span className="text-lg">
                  {daily ? getWeatherEmoji(weatherCode) : "☀️"}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 truncate mb-2">
                {label}
              </div>

              {daily && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-300 font-bold">
                      {tempMax}°C
                    </span>
                    <span className="text-sky-300 font-medium">
                      {tempMin}°C
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-700/40">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Wind className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-medium">{ventoMax} km/h</span>
                    </span>
                  </div>

                  {pioggia > 0 && (
                    <div className="text-rose-300 font-semibold flex items-center gap-0.5 text-[10px]">
                      <CloudRain className="w-3 h-3" />
                      {pioggia.toFixed(1)}mm
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}