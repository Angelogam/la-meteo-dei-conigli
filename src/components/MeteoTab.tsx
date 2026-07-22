"use client";

import React from "react";
import {
  Thermometer, Wind, Droplets, Eye, ArrowUp, Gauge, Cloud,
  MapPin, Calendar, Clock, Sun
} from "lucide-react";

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number; name?: string };
  thermalDelta: number;
  stabilityIndex: { label: string; color: string };
  modelName?: string;
  cape?: number;
  liftedIndex?: number;
  cin?: number;
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getCurrentTime(): string {
  return new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export default function MeteoTab({
  currentData, dayData, site, thermalDelta, stabilityIndex, modelName, cape, liftedIndex, cin
}: MeteoTabProps) {
  const dataGiorno = React.useMemo(() => {
    if (dayData && dayData.length > 0) return formatDateShort(dayData[0].time);
    return formatDateShort(new Date());
  }, [dayData]);

  const oraCorrente = getCurrentTime();

  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Sun className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold text-center">Nessun dato meteo per {site?.name || "questo decollo"}</p>
        <p className="text-xs text-slate-500 mt-2">Aggiornamento: {oraCorrente}</p>
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
  const uvIndex = currentData.uvIndex;

  const spread = temp - dewPoint;
  const cloudBase = Math.max(200, Math.min(3000, Math.round(spread * 125)));

  const dirCardinali = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dirLabel = dirCardinali[Math.round((windDir ?? 0) / 45) % 8];
  const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round((windDir ?? 0) / 45) % 8];

  let rateoTermico = Math.min(4, Math.max(0, Math.round(((spread * 0.15 + (windSpeed >= 5 && windSpeed <= 15 ? 0.5 : 0) + (cloudCover >= 15 && cloudCover <= 45 ? 0.3 : 0)) * (precipitation > 1 ? 0 : 1)) * 10) / 10));

  return (
    <div className="space-y-4">
      {/* Header luogo */}
      <div className="text-center bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
        <div className="text-base font-bold text-white">{site?.name || "Decollo"}</div>
        <div className="text-[10px] text-slate-500 flex items-center justify-center gap-2 mt-1">
          <Calendar className="w-3 h-3" />
          <span>{dataGiorno}</span>
          <span className="text-slate-600">·</span>
          <Clock className="w-3 h-3" />
          <span>{oraCorrente}</span>
          <span className="text-slate-600">·</span>
          <MapPin className="w-3 h-3" />
          <span>{site?.alt || 0}m</span>
        </div>
      </div>

      {/* Griglia metriche centrata */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <Thermometer className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <div className="text-sm text-slate-400">Temperatura</div>
          <div className="text-2xl font-bold text-white">{Math.round(temp)}°C</div>
          <div className="text-[10px] text-slate-500">Percepita {Math.round(currentData.apparentTemp ?? temp)}°C</div>
          <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
        </div>
        <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <Wind className="w-5 h-5 text-sky-400 mx-auto mb-1" />
          <div className="text-sm text-slate-400">Vento</div>
          <div className="text-2xl font-bold text-white">{Math.round(windSpeed)} km/h</div>
          <div className="text-[10px] text-slate-500">{arrow} {dirLabel} · Raffiche {Math.round(windGust ?? windSpeed * 1.4)} km/h</div>
          <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
        </div>
        <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <div className="text-sm text-slate-400">Umidità</div>
          <div className="text-2xl font-bold text-white">{Math.round(humidity)}%</div>
          <div className="text-[10px] text-slate-500">Dew point {Math.round(dewPoint)}°C</div>
          <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
        </div>
        <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <Eye className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <div className="text-sm text-slate-400">Visibilità</div>
          <div className="text-xl font-bold text-white">{cloudCover <= 30 ? "Buona" : cloudCover <= 60 ? "Discreta" : "Ridotta"}</div>
          <div className="text-[10px] text-slate-500">Nuvole: {Math.round(cloudCover)}%</div>
          <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
        </div>
        <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <ArrowUp className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <div className="text-sm text-slate-400">Termiche</div>
          <div className="text-2xl font-bold text-orange-300">{rateoTermico.toFixed(1)} m/s</div>
          <div className="text-[10px] text-slate-500">{rateoTermico >= 2 ? "Buone" : rateoTermico >= 1 ? "Moderate" : rateoTermico >= 0.3 ? "Deboli" : "Assenti"}</div>
          <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
        </div>
        <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <Cloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <div className="text-sm text-slate-400">Condizioni</div>
          <div className="text-xl font-bold text-white">{stabilityIndex.label}</div>
          <div className="text-[10px] text-slate-500">ΔT {thermalDelta}°C</div>
          <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
        </div>
      </div>

      {/* Modello */}
      <div className="text-center text-[10px] text-slate-600 border-t border-slate-700/30 pt-3">
        {site?.name} · Modello: {modelName || "auto"} · Ultimo aggiornamento: {oraCorrente}
      </div>
    </div>
  );
}