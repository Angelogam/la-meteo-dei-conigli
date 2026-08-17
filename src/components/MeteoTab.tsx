"use client";

import React from "react";
import {
  CloudSun, ArrowUp, TrendingUp,
  Sun, Eye, AlertTriangle, Thermometer, Calendar, MapPin
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

export default function MeteoTab({
  currentData, dayData, site, thermalDelta, stabilityIndex, modelName, cape, liftedIndex, cin
}: MeteoTabProps) {
  const dataGiorno = React.useMemo(() => {
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
  const temp80m = currentData.temp80m;
  const temp120m = currentData.temp120m;
  const uvIndex = currentData.uvIndex;

  const spread = temp - dewPoint;
  const cloudBase = Math.max(200, Math.min(3000, Math.round(spread * 125)));

  let gradienteReale = 0.98;
  let gradienteLabel = "Adiabatico secco";
  if (temp80m != null) { gradienteReale = ((temp - temp80m) / 78) * 100; gradienteLabel = "Da T80m"; }
  else if (temp120m != null) { gradienteReale = ((temp - temp120m) / 118) * 100; gradienteLabel = "Da T120m"; }

  let forzaTermica = 0;
  if (gradienteReale >= 1.2) forzaTermica += 3;
  else if (gradienteReale >= 0.98) forzaTermica += 2;
  else if (gradienteReale >= 0.7) forzaTermica += 1;
  if (windSpeed >= 5 && windSpeed <= 15) forzaTermica += 2;
  else if (windSpeed >= 3 && windSpeed < 5) forzaTermica += 1.5;
  else if (windSpeed > 15 && windSpeed <= 22) forzaTermica += 1;
  if (cloudCover >= 15 && cloudCover <= 45) forzaTermica += 2;
  else if (cloudCover >= 5 && cloudCover < 15) forzaTermica += 1.5;
  if (humidity >= 30 && humidity <= 50) forzaTermica += 1.5;
  else if (humidity > 50 && humidity <= 65) forzaTermica += 1;
  if (uvIndex != null) {
    if (uvIndex >= 7) forzaTermica += 1;
    else if (uvIndex >= 5) forzaTermica += 0.7;
    else if (uvIndex >= 3) forzaTermica += 0.4;
  }
  forzaTermica = Math.min(10, Math.max(0, Math.round(forzaTermica * 10) / 10));
  let rateoTermico = (forzaTermica / 10) * 4;
  if (precipitation > 1) rateoTermico = 0;
  rateoTermico = Math.round(rateoTermico * 10) / 10;
  const topTermico = Math.min(5000, cloudBase + Math.round(forzaTermica * 250));
  const raffiche = windGust ?? Math.round(windSpeed * 1.4);
  const zeroTermico = Math.max(0, Math.round(site.alt + (temp / 0.0098) + 200));

  const dirCardinali = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dirLabel = dirCardinali[Math.round((windDir ?? 0) / 45) % 8];
  const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round((windDir ?? 0) / 45) % 8];

  return (
    <div className="space-y-4">
      {/* Intestazione con nome decollo e data */}
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

      <div className="text-center text-sm text-slate-600 border-t border-slate-700/30 pt-3">
        {site?.name} · Dati Open-Meteo · Modello: {modelName || "auto"}
      </div>
    </div>
  );
}