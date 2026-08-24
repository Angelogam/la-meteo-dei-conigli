"use client";

import React from "react";
import {
  CloudSun, ArrowUp, TrendingUp,
  Sun, Eye, AlertTriangle, Thermometer, Calendar, MapPin,
  Wind, Droplets, Cloud, CloudRain, Shield, Gauge
} from "lucide-react";
import type { HourData } from "@/types/meteo";

interface MeteoTabProps {
  currentData: HourData | null;
  dayData: HourData[];
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
  currentData, dayData, site, thermalDelta, stabilityIndex, modelName, cape, liftedIndex, cin
}: MeteoTabProps) {
  const dataGiorno = React.useMemo(() => {
    if (dayData && dayData.length > 0) {
      return formatDateShort(new Date(dayData[0].time));
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
  const precipitation = currentData.precipitation || currentData.rain || 0;
  const dewPoint = currentData.dewPoint ?? (temp - (100 - (humidity ?? 50)) / 5);
  const uvIndex = currentData.uvIndex;
  const currentHour = new Date(currentData.time).getHours();

  const spread = temp - dewPoint;
  const cloudBase = Math.max(200, Math.min(3500, Math.round(spread * 125)));

  // Calcolo forza termica realistica
  let forzaTermica = 0;
  if (spread >= 10) forzaTermica += 3;
  else if (spread >= 6) forzaTermica += 2;
  else if (spread >= 3) forzaTermica += 1;

  if (windSpeed >= 5 && windSpeed <= 15) forzaTermica += 2;
  else if (windSpeed > 22) forzaTermica -= 1;

  if (cloudCover >= 15 && cloudCover <= 50) forzaTermica += 2;
  else if (cloudCover > 80) forzaTermica -= 2;

  if (precipitation > 0.5) forzaTermica = 0;
  forzaTermica = Math.max(0, Math.min(10, forzaTermica));

  let rateoTermico = precipitation > 0.3 ? 0 : Math.round((forzaTermica / 10) * 3.5 * 10) / 10;
  const topTermico = Math.min(4500, site.alt + cloudBase + Math.round(forzaTermica * 150));
  const zeroTermico = Math.max(0, Math.round(site.alt + (temp / 0.0098) * 100));

  const dirCardinali = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dirLabel = dirCardinali[Math.round(((windDir ?? 0) % 360 + 360) % 360 / 45) % 8];
  const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round(((windDir ?? 0) % 360 + 360) % 360 / 45) % 8];

  return (
    <div className="space-y-4">
      {/* Intestazione con nome decollo e data */}
      <div className="bg-slate-800/60 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-bold text-white">{site?.name || "Decollo"}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>{dataGiorno}</span>
              <span className="text-slate-600">·</span>
              <span>Quota {site?.alt || 0}m</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-bold">Ore {String(currentHour).padStart(2, "0")}:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Griglia parametri chiave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
          <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Temperatura</div>
          <div className="text-lg font-black text-white">{Math.round(temp)}°C</div>
          <div className="text-[10px] text-slate-500">Dew {Math.round(dewPoint)}°C</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
          <Wind className="w-4 h-4 text-sky-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Vento</div>
          <div className="text-lg font-black text-sky-300">{Math.round(windSpeed)} km/h</div>
          <div className="text-[10px] text-slate-400">{arrow} {dirLabel} ({Math.round(windDir)}°)</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
          <Cloud className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Nuvolosità</div>
          <div className="text-lg font-black text-slate-200">{Math.round(cloudCover)}%</div>
          <div className="text-[10px] text-slate-400">Base {cloudBase}m</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
          <CloudRain className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Pioggia</div>
          <div className={`text-lg font-black ${precipitation > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {precipitation > 0 ? `${precipitation.toFixed(1)} mm` : "0 mm"}
          </div>
          <div className="text-[10px] text-slate-500">Umidità {Math.round(humidity)}%</div>
        </div>
      </div>

      {/* Dettagli aerologici */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 space-y-2.5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          Parametri aerologici & convezione
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-800/50 rounded-lg p-2">
            <span className="text-slate-400 block text-[10px]">Rateo termico</span>
            <span className="text-orange-300 font-bold text-sm">{rateoTermico.toFixed(1)} m/s</span>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <span className="text-slate-400 block text-[10px]">Plafond termico</span>
            <span className="text-purple-300 font-bold text-sm">{topTermico}m</span>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <span className="text-slate-400 block text-[10px]">Zero termico</span>
            <span className="text-cyan-300 font-bold text-sm">{zeroTermico}m</span>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <span className="text-slate-400 block text-[10px]">CAPE / LI</span>
            <span className="text-emerald-300 font-bold text-sm">
              {cape != null ? `${cape} J/kg` : "—"} {liftedIndex != null ? `(${liftedIndex > 0 ? "+" : ""}${liftedIndex} LI)` : ""}
            </span>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <span className="text-slate-400 block text-[10px]">Pressione</span>
            <span className="text-slate-200 font-bold text-sm">{Math.round(pressure)} hPa</span>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <span className="text-slate-400 block text-[10px]">Raffiche</span>
            <span className="text-amber-300 font-bold text-sm">{windGust ? `${Math.round(windGust)} km/h` : "—"}</span>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 border-t border-slate-800 pt-3">
        {site?.name} &middot; Dati Open-Meteo AROME & ECMWF ad alta risoluzione &middot; Modello: {modelName || "auto"}
      </div>
    </div>
  );
}