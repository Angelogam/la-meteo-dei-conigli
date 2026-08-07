"use client";

import React from "react";
import { Calendar, CloudRain, Wind, Thermometer, Mountain, Droplets, Gauge, AlertTriangle } from "lucide-react";
import type { DailyData, HourData } from "@/types/meteo";

interface PrevisioniGiornaliereProps {
  enrichedDaily: DailyData[];
  dateLabels: string[];
  currentData: HourData | null;
  dayData: HourData[];
  site: { name: string; altitude: number; exposure: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
  nomeDecollo: string;
}

function getWeatherEmoji(code: number): string {
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌧️";
  if (code >= 71) return "🌨️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 20) return "☁️";
  if (code >= 10) return "⛅";
  if (code >= 5) return "🌤️";
  return "☀️";
}

function getWeatherLabel(code: number): string {
  if (code >= 95) return "Temporali";
  if (code >= 80) return "Rovesci";
  if (code >= 71) return "Neve";
  if (code >= 61) return "Pioggia";
  if (code >= 51) return "Pioviggine";
  if (code >= 45) return "Nebbia";
  if (code >= 20) return "Nuvoloso";
  if (code >= 10) return "Parz. nuvoloso";
  if (code >= 5) return "Poco nuvoloso";
  return "Sereno";
}

function formatHours(hours: number[]): string {
  return hours.map(h => `${String(h).padStart(2, "0")}:00`).join(" · ");
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  selectedDay,
  onSelectDay,
  nomeDecollo,
  site,
}: PrevisioniGiornaliereProps) {
  if (!enrichedDaily || enrichedDaily.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 text-center">
        <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Previsioni giornaliere non disponibili.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-emerald-400 shrink-0" />
        <h3 className="text-base font-bold text-white">
          Previsioni · {nomeDecollo}
        </h3>
        {site && (
          <span className="text-[10px] text-slate-500 ml-auto">
            Decollo {site.altitude} m · {site.exposure}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {enrichedDaily.map((day, idx) => {
          const isSelected = idx === selectedDay;
          const label = dateLabels[idx] ?? day.date.toLocaleDateString("it-IT");

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`text-left rounded-2xl p-4 border-2 transition-all duration-200 ${
                isSelected
                  ? "bg-emerald-900/40 border-emerald-500 shadow-lg"
                  : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/40 hover:border-slate-500"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${isSelected ? "text-emerald-300" : "text-white"}`}>
                  {label}
                </span>
                <span className="text-2xl">{getWeatherEmoji(day.weatherCode)}</span>
              </div>

              <div className="text-[11px] text-slate-400 mb-2">
                {getWeatherLabel(day.weatherCode)}
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-amber-300">
                  {Math.round(day.temperatureMax)}°
                </span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-sm font-bold text-blue-300">
                  {Math.round(day.temperatureMin)}°
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                <span className="flex items-center gap-1 text-sky-300">
                  <Wind className="w-3 h-3 shrink-0" />
                  {Math.round(day.windSpeedMax)} km/h
                </span>
                {day.gustMaxHourly != null && day.gustMaxHourly > 0 && (
                  <span className="flex items-center gap-1 text-red-300">
                    <Gauge className="w-3 h-3 shrink-0" />
                    raffiche {day.gustMaxHourly} km/h
                  </span>
                )}
                <span className="flex items-center gap-1 text-blue-300">
                  <CloudRain className="w-3 h-3 shrink-0" />
                  {day.precipitationSum > 0 ? `${day.precipitationSum.toFixed(1)} mm` : "0 mm"}
                </span>
              </div>

              {/* Zero termico */}
              {day.freezingLevelMax != null && day.freezingLevelMax > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Mountain className="w-3 h-3 shrink-0" />
                    Zero termico
                    <strong className="text-white">
                      {day.freezingLevelMin === day.freezingLevelMax
                        ? `${day.freezingLevelMax} m`
                        : `${day.freezingLevelMin}–${day.freezingLevelMax} m`}
                    </strong>
                  </span>
                  {site && (
                    <span className="text-slate-500">
                      {day.freezingLevelMax - site.altitude >= 0 ? "+" : ""}
                      {day.freezingLevelMax - site.altitude} m dal decollo
                    </span>
                  )}
                </div>
              )}

              {/* Probabilità precipitazioni */}
              {(day.precipitationProbabilityMax ?? 0) > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-blue-300">
                  <CloudRain className="w-3 h-3 shrink-0" />
                  <span>
                    Prob. pioggia{" "}
                    <strong className="text-sky-300">{day.precipitationProbabilityMax}%</strong>
                  </span>
                </div>
              )}

              {/* Ore di precipitazione */}
              {day.rainHours && day.rainHours.length > 0 && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-300">
                  <Droplets className="w-3 h-3 text-sky-300 shrink-0 mt-0.5" />
                  <span>
                    Pioggia{" "}
                    <strong className="text-sky-300">
                      {formatHours(day.rainHours.map(r => r.hour))}
                    </strong>
                    {day.rainHours.length === 1 ? " — " : " · "}
                    {day.rainHours[0].precip.toFixed(1)} mm/h
                  </span>
                </div>
              )}

              {/* Temporali */}
              {day.thunderHours && day.thunderHours.length > 0 && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-orange-300">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>
                    Temporali{" "}
                    <strong className="text-orange-200">
                      {formatHours(day.thunderHours)}
                    </strong>
                  </span>
                </div>
              )}

              {isSelected && (
                <div className="mt-2 pt-2 border-t border-emerald-500/30 text-[10px] text-emerald-300 font-semibold">
                  ✓ Giorno selezionato
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}