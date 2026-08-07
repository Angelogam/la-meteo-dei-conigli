"use client";

import React, { useMemo } from "react";
import { CloudSun, MapPin, Calendar } from "lucide-react";

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number; name?: string };
  thermalDelta: number;
  stabilityIndex: { label: string; color: string };
  modelName?: string;
  cape?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function MeteoTab({
  currentData,
  dayData,
  site,
  thermalDelta,
  stabilityIndex,
  modelName,
  cape,
  liftedIndex,
  cin,
}: MeteoTabProps) {
  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) {
      return formatDateShort(dayData[0].time);
    }
    return formatDateShort(new Date());
  }, [dayData]);

  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <CloudSun className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato meteo per {site?.name || "questo decollo"}</p>
      </div>
    );
  }

  const temp = currentData.temperature;
  const humidity = currentData.humidity;
  const pressure = currentData.pressure;
  const cloudCover = currentData.cloudCover;
  const windSpeed = currentData.windSpeed;
  const windDir = currentData.windDir;
  const windGust = currentData.windGusts;
  const precipitation = currentData.precipitation;
  const dewPoint = currentData.dewPoint ?? (temp - (100 - (humidity ?? 50)) / 5);
  const weatherCode = currentData.weatherCode;

  const spread = temp - dewPoint;
  const cloudBase = Math.max(200, Math.min(3000, Math.round(spread * 125)));

  const dirCardinali = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dirLabel = dirCardinali[Math.round((windDir ?? 0) / 45) % 8];
  const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round((windDir ?? 0) / 45) % 8];

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{site?.name || "Decollo"}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>{site?.alt || 0}m</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Temperatura</div>
          <div className="text-xl font-bold text-amber-300">{Math.round(temp)}°C</div>
          <div className="text-[10px] text-slate-400">Percepita {Math.round(currentData.feelsLike ?? temp)}°C</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Vento</div>
          <div className="text-xl font-bold text-sky-300">{Math.round(windSpeed)} km/h</div>
          <div className="text-[10px] text-slate-400">
            {arrow} {dirLabel} · Raffiche {Math.round(windGust ?? 0)} km/h
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Umidità</div>
          <div className="text-xl font-bold text-blue-300">{Math.round(humidity)}%</div>
          <div className="text-[10px] text-slate-400">Dew point {Math.round(dewPoint)}°C</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Nuvolosità</div>
          <div className="text-xl font-bold text-slate-200">{Math.round(cloudCover)}%</div>
          <div className="text-[10px] text-slate-400">Base nuvole ~{cloudBase}m</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Pressione</div>
          <div className="text-xl font-bold text-purple-300">{Math.round(pressure)} hPa</div>
          <div className="text-[10px] text-slate-400">Delta termico {thermalDelta}°C</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Pioggia</div>
          <div className="text-xl font-bold text-blue-300">
            {precipitation > 0 ? `${precipitation.toFixed(1)} mm` : "0 mm"}
          </div>
          <div className="text-[10px] text-slate-400">
            {weatherCode >= 95 ? "⛈️ Temporale" : weatherCode >= 61 ? "🌧️ Pioggia" : "☀️ Secco"}
          </div>
        </div>
      </div>

      {(cape != null || liftedIndex != null || cin != null) && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
          <div className="text-xs font-bold text-slate-300 mb-2">Indici di stabilità</div>
          <div className="flex flex-wrap gap-4 text-sm">
            {cape != null && (
              <span className="text-slate-300">CAPE: <strong className="text-purple-300">{Math.round(cape)} J/kg</strong></span>
            )}
            {liftedIndex != null && (
              <span className="text-slate-300">LI: <strong className={liftedIndex < 0 ? "text-orange-300" : "text-green-300"}>{liftedIndex}°C</strong></span>
            )}
            {cin != null && (
              <span className="text-slate-300">CIN: <strong className="text-red-300">{Math.round(cin)} J/kg</strong></span>
            )}
            <span className="text-slate-300">Stabilità: <strong style={{ color: stabilityIndex.color }}>{stabilityIndex.label}</strong></span>
          </div>
        </div>
      )}

      <div className="text-center text-sm text-slate-600 border-t border-slate-700/30 pt-3">
        {site?.name} · Dati Open-Meteo · Modello: {modelName || "auto"}
      </div>
    </div>
  );
}