"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Wind, Clock, Layers, AlertTriangle, Sun, Cloud, CloudRain, Zap } from "lucide-react";
import { weatherService } from "@/services/openMeteoService";
import { calcolaStatoMeteo, type StatoMeteo, calcolaPrecipProssimeOre } from "@/utils/statoMeteo";
import { calcolaIndiceVolabilita, type RisultatoVolabilita } from "@/utils/indiceVolabilita";
import { DECOLLI, type Decollo } from "@/data/decolli";

const ICONA_STATO: Record<string, React.ReactNode> = {
  sereno: <Sun className="w-4 h-4 text-amber-400" />,
  variabile: <Cloud className="w-4 h-4 text-amber-300" />,
  nuvoloso: <Cloud className="w-4 h-4 text-slate-400" />,
  pioggia: <CloudRain className="w-4 h-4 text-blue-400" />,
  temporale: <Zap className="w-4 h-4 text-purple-400" />,
  offline: <AlertTriangle className="w-4 h-4 text-slate-500" />,
};

const REFRESH_INTERVAL_MS = 900000; // 15 minuti esatti

interface DecolliCardProps {
  decolli: Decollo[];
  selectedId: string;
  onSelect: (item: Decollo) => void;
  selectedDay?: number;
}

export default function DecolliCard({ decolli, selectedId, onSelect, selectedDay = 0 }: DecolliCardProps) {
  const [liveData, setLiveData] = useState<Record<string, MeteoCurrent | null>>({});
  const [loadingAll, setLoadingAll] = useState(true);
  const mountedRef = useRef(true);

  const loadAllData = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoadingAll(true);
    const newData: Record<string, MeteoCurrent> = {};

    for (const item of decolli) {
      try {
        const current = await weatherService.fetchMeteoCorrente(item.lat, item.lon);
        if (current && mountedRef.current) {
          newData[item.id] = current;
        }
      } catch {
        // Nessun dato inventato - lascia null
      }
    }

    if (mountedRef.current) {
      setLiveData(newData);
      setLoadingAll(false);
    }
  }, [decolli]);

  useEffect(() => {
    mountedRef.current = true;
    loadAllData();
    const interval = setInterval(loadAllData, REFRESH_INTERVAL_MS);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [loadAllData]);

  const dt = getDateTime(selectedDay);
  const caricati = Object.keys(liveData).filter(k => liveData[k] != null).length;

  return (
    <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl p-3 md:p-4 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
          Decolli ({caricati}/{decolli.length})
        </h2>
        <span className="text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
          Open-Meteo 15m
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 mb-3 bg-slate-800/60 rounded-xl px-2.5 py-1.5 border border-slate-700/40">
        <Clock size={12} />
        <span className="font-medium">{dt.date}</span>
        <span className="text-slate-600">·</span>
        <span>aggiornamento ogni 15 min</span>
      </div>

      <div className="space-y-2.5 max-h-80 md:max-h-96 overflow-y-auto pr-1 scrollbar-thin">
        {decolli.map((item) => {
          const isSelected = item.id === selectedId;
          const current = liveData[item.id];
          const hasData = current != null;

          let statoMeteo: StatoMeteo = "offline";
          let volabilita: RisultatoVolabilita | null = null;

          if (hasData) {
            const precipNext = current.precipitation;

            const statoResult = calcolaStatoMeteo({
              precipNow: current.precipitation,
              precipNextHours: precipNext,
              cloudNow: current.cloudCover,
              windSpeed: current.windSpeed,
              windDir: current.windDir,
              temperature: current.temperature,
              cape: current.cape,
              weatherCode: current.weatherCode,
            });
            statoMeteo = statoResult.stato;

            volabilita = calcolaIndiceVolabilita({
              windSpeed: current.windSpeed,
              windGusts: current.windGusts,
              windDir: current.windDir,
              esposizione: item.orientation,        // CAMPO STATICO PROTETTO
              temperature: current.temperature,
              dewPoint: current.dewPoint,
              cloudCover: current.cloudCover,
              precipitation: current.precipitation,
              weatherCode: current.weatherCode,
              cape: current.cape,
              quota: item.elevation_m,              // CAMPO STATICO PROTETTO
            });
          }

          const dirLabel = hasData ? getCardinalDir(current!.windDir) : "N/D";
          const dirArrow = hasData ? getWindArrow(current!.windDir) : "→";
          const emoji = hasData ? getWeatherEmoji(current!.weatherCode, current!.precipitation) : "📡";

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`
                w-full rounded-2xl p-3 text-left transition-all border-2 cursor-pointer relative overflow-hidden
                ${isSelected
                  ? "bg-slate-800/90 border-emerald-400 shadow-md ring-1 ring-emerald-400/40"
                  : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600"
                }
              `}
            >
              {/* Header con CAMPI STATICI PROTETTI */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    {/* site_name + location_name */}
                    <span>{item.site_name}</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-300">{item.location_name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {/* orientation • elevation_m */}
                    {item.orientation} · {item.elevation_m}m
                  </div>
                </div>

                {/* Badge Indice Volabilità */}
                {volabilita && (
                  <div className="flex flex-col items-end shrink-0">
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-black ${volabilita.coloreBg} ${volabilita.coloreTesto} ${volabilita.coloreBordo}`}
                      title={`Indice: ${volabilita.indice}/10 (${volabilita.label}) - ${volabilita.windRelativo}`}
                    >
                      <span className="text-[9px]">Indice:</span>
                      <span className="text-xs">{volabilita.indice}</span>
                      <span className="text-[9px] opacity-70">/10</span>
                    </div>
                    <span className={`text-[9px] font-semibold mt-0.5 ${volabilita.coloreTesto}`}>
                      {volabilita.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Dati Meteo Reali (solo campi dinamici) */}
              {hasData ? (
                <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {ICONA_STATO[statoMeteo]}
                      <span className="font-bold text-white capitalize">{statoMeteo}</span>
                      <span className="font-extrabold text-amber-300 tabular-nums">
                        {Math.round(current!.temperature)}°C
                      </span>
                      {current!.precipitation > 0 && (
                        <span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/40">
                          {current!.precipitation.toFixed(1)}mm
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-slate-200">
                      <Wind size={13} className="text-cyan-400 shrink-0" />
                      <span className="font-bold tabular-nums text-white">
                        {Math.round(current!.windSpeed)} km/h
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {dirArrow} {dirLabel} ({Math.round(current!.windDir)}°)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Layers size={11} className="text-purple-400" />
                      <span>Base nubi: <strong className="text-purple-200">{volabilita?.baseNubiM}m</strong></span>
                    </span>
                    <span className="flex items-center gap-1">
                      Termiche: <strong className="text-amber-200">↑ {volabilita?.rateoTermicoMs} m/s</strong>
                    </span>
                    {volabilita && volabilita.windRelativo !== "frontale" && volabilita.windRelativo !== "sconosciuto" && (
                      <span className="flex items-center gap-1 text-amber-300">
                        Vento: <strong>{volabilita.windRelativo}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic mt-1 pt-1 border-t border-slate-700/30 flex items-center justify-between">
                  <span>Lettura API Open-Meteo...</span>
                  <span className="w-2 h-2 rounded-full bg-slate-600 animate-ping" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getDateTime(selectedDay: number): { date: string; ora: string } {
  const oggi = new Date();
  const target = new Date(oggi);
  target.setDate(oggi.getDate() + selectedDay);
  const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return { date: `${giorni[target.getDay()]} ${target.getDate()} ${mesi[target.getMonth()]}`, ora: oggi.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) };
}

function getCardinalDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWeatherEmoji(code: number | undefined | null, precip?: number): string {
  if (precip && precip > 0.1) return "🌧️";
  if (code == null) return "📡";
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌧️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 3) return "☁️";
  if (code >= 1) return "🌤️";
  return "☀️";
}