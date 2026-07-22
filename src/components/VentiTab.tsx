"use client";

import React, { useEffect, useState } from "react";
import { Wind, TrendingUp, Server } from "lucide-react";
import { getVento, type VentoData } from "@/utils/getVento";
import { interpretaProfiloVento } from "@/utils/windInterpretation";
import InterpretazioneVentoCard from "@/components/InterpretazioneVentoCard";

interface VentiTabProps {
  currentData: any;
  dayData: any[];
  hourlyData?: any[];
  targetHour?: number;
  lat?: number;
  lon?: number;
  selectedDay?: number;
  quotaDecollo?: number; // per interpretazione
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

export default function VentiTab({
  currentData, dayData, hourlyData, targetHour = 12, lat, lon, selectedDay = 0, quotaDecollo = 1000
}: VentiTabProps) {
  const [ventoData, setVentoData] = useState<VentoData | null>(null);
  const [loadingVento, setLoadingVento] = useState(false);
  const [errorVento, setErrorVento] = useState<string | null>(null);

  // Calcola la data YYYY-MM-DD dal selectedDay
  useEffect(() => {
    if (!lat || !lon) return;

    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    const dayStr = targetDate.toISOString().split("T")[0];

    setLoadingVento(true);
    setErrorVento(null);

    getVento(lat, lon, dayStr)
      .then(data => {
        setVentoData(data);
        setLoadingVento(false);
      })
      .catch(err => {
        setErrorVento(err instanceof Error ? err.message : "Errore nel recupero vento");
        setLoadingVento(false);
      });
  }, [lat, lon, selectedDay]);

  if (loadingVento) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Caricamento dati vento per il giorno selezionato...</span>
      </div>
    );
  }

  if (errorVento) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Errore nel recupero vento</p>
        <p className="text-sm text-slate-500 mt-1">{errorVento}</p>
      </div>
    );
  }

  if (!ventoData || ventoData.ventoOrario.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento per questo giorno</p>
      </div>
    );
  }

  const surfaceSpeed = currentData?.windSpeed ?? ventoData.ventoDecollo ?? 0;
  const surfaceDir = currentData?.windDir ?? 0;
  const maxSpeed = Math.max(...ventoData.ventoOrario.map(v => v.speed), 1);

  // Costruisci livelli per interpretazione
  const livelliInterpretazione = ventoData.ventoOrario
    .filter(v => v.ora >= 9 && v.ora <= 18)
    .map(v => ({ quota: (v.ora - 8) * 300 + quotaDecollo, speed: v.speed, dir: v.dir }));

  const interpretazione = interpretaProfiloVento(livelliInterpretazione, quotaDecollo);

  return (
    <div className="space-y-4">
      {/* Interpretazione vento */}
      <InterpretazioneVentoCard interpretazione={interpretazione} />

      {/* Badge fonte dati */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold bg-emerald-900/15 border-emerald-500/30 text-emerald-300">
        <Server className="w-4 h-4" />
        Dati reali da Open-Meteo · {ventoData.giorno} · {ventoData.ventoOrario.length} ore
      </div>

      {/* Carte riassuntive vento in quota */}
      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
          <Wind className="w-5 h-5" /> Vento orario · {ventoData.giorno}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {ventoData.ventoOrario.map((v, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-sm text-slate-400 font-bold mb-2">{String(v.ora).padStart(2, "0")}:00</div>
              <div className="text-xl font-bold text-white">{getWindArrow(v.dir)} {Math.round(v.speed)}</div>
              <div className="text-sm text-slate-400">{getWindDirName(v.dir)} ({Math.round(v.dir)}°)</div>
              <div className="text-sm text-red-300 mt-1">Raff. {Math.round(v.gust)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Profilo vento verticale (barre) */}
      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Intensità vento oraria
        </h4>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-1">
          {ventoData.ventoOrario.map((v, idx) => {
            const width = maxSpeed > 0 ? Math.min(100, (v.speed / maxSpeed) * 100) : 10;
            const barColor = width < 30 ? "bg-emerald-400" : width < 50 ? "bg-lime-400" : width < 70 ? "bg-amber-400" : width < 90 ? "bg-orange-400" : "bg-red-400";
            return (
              <div key={idx} className="grid grid-cols-[60px_1fr_80px_60px] gap-2 items-center py-1.5">
                <span className="text-sm text-slate-300 font-bold">{String(v.ora).padStart(2, "0")}:00</span>
                <div className="h-6 bg-slate-700/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full flex items-center justify-end pr-2 ${barColor}`} style={{ width: `${Math.max(width, 15)}%` }}>
                    <span className="text-xs text-white font-bold">{Math.round(v.speed)}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-300 text-center font-medium">{getWindArrow(v.dir)} {getWindDirName(v.dir)}</span>
                <span className="text-sm text-red-300 text-center font-medium">{Math.round(v.gust)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Riepilogo decollo e atterraggio */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase font-bold mb-1">Vento decollo (ora 9:00)</div>
          <div className="text-xl font-bold text-white">
            {ventoData.ventoDecollo != null ? `${Math.round(ventoData.ventoDecollo)} km/h` : "N/D"}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase font-bold mb-1">Vento atterraggio (ora 10:00)</div>
          <div className="text-xl font-bold text-white">
            {ventoData.ventoAtterraggio != null ? `${Math.round(ventoData.ventoAtterraggio)} km/h` : "N/D"}
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-slate-500 border-t border-slate-700/30 pt-3">
        Coordinate: {lat?.toFixed(4)}, {lon?.toFixed(4)} · {ventoData.giorno}
      </div>
    </div>
  );
}
</dyad-w<dyad-write path="src/components/MeteoTab.tsx" description="Aggiungo il badge climatologico nel tab Meteo">
"use client";

import React from "react";
import {
  CloudSun, ArrowUp, TrendingUp,
  Sun, Eye, AlertTriangle, Thermometer, Calendar, MapPin
} from "lucide-react";
import BadgeClima from "@/components/BadgeClima";
import { confrontaClima } from "@/utils/climatologia";

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

  // Calcola anomalie climatologiche
  const anomalieClima = React.useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    const oreGiorno = dayData.filter(h => {
      const hh = h.time.getHours();
      return hh >= 8 && hh <= 18;
    });
    if (oreGiorno.length < 3) return [];

    const tempMax = Math.max(...oreGiorno.map(h => h.temperature));
    const tempMin = Math.min(...oreGiorno.map(h => h.temperature));
    const ventoMedio = oreGiorno.reduce((s, h) => s + h.windSpeed, 0) / oreGiorno.length;
    const pioggiaTot = oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0);
    const delta = Math.round((tempMax - tempMin) * 10) / 10;

    return confrontaClima(tempMax, tempMin, Math.round(ventoMedio), pioggiaTot, delta);
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

      {/* Badge climatologico */}
      {anomalieClima.length > 0 && <BadgeClima anomalie={anomalieClima} />}

      <div className="text-center text-sm text-slate-600 border-t border-slate-700/30 pt-3">
        {site?.name} · Dati Open-Meteo · Modello: {modelName || "auto"}
      </div>
    </div>
  );
}