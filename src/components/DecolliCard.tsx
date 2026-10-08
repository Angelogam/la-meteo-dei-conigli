"use client";

import React, { useEffect, useState } from "react";
import { Wind, Clock, Layers, AlertTriangle, Sun, Cloud, CloudRain, Zap, Info, RefreshCw } from "lucide-react";
import type { Decollo } from "@/data/decolli";

export interface AggressiveWeatherData {
  temp: string | number;
  rain: string | number;
  cloud: string | number;
  wind: string | number;
  dir: string | number;
  stato: string;
  baseNubi: string;
  termiche: string;
  indice: number | null;
  indiceLabel: string;
  fonte: string;
}

interface DecolliCardProps {
  decolli: (Decollo & { aggressiveWeather?: AggressiveWeatherData | null })[];
  selectedId: string;
  onSelect: (item: Decollo) => void;
  selectedDay?: number;
  onRefresh?: () => void;
  isUpdating?: boolean;
  error?: string | null;
}

const ICONA_STATO: Record<string, React.ReactNode> = {
  sereno: <Sun className="w-4 h-4 text-amber-400" />,
  variabile: <Cloud className="w-4 h-4 text-amber-300" />,
  nuvoloso: <Cloud className="w-4 h-4 text-slate-400" />,
  pioggia: <CloudRain className="w-4 h-4 text-blue-400" />,
  temporale: <Zap className="w-4 h-4 text-purple-400" />,
  coperto: <Cloud className="w-4 h-4 text-slate-400" />,
  offline: <AlertTriangle className="w-4 h-4 text-slate-500" />,
  "n/d": <Info className="w-4 h-4 text-slate-400" />,
  errore: <AlertTriangle className="w-4 h-4 text-red-400" />,
};

function formatTemp(temp: string | number | null | undefined): React.ReactNode {
  if (temp === null || temp === undefined || temp === "N/D" || temp === "--") {
    return <span className="font-extrabold text-slate-500 tabular-nums">N/D</span>;
  }
  const n = parseFloat(String(temp));
  if (isNaN(n)) return <span className="font-extrabold text-slate-500 tabular-nums">N/D</span>;
  return <span className="font-extrabold text-amber-300 tabular-nums">{n.toFixed(1)}°C</span>;
}

function formatWind(wind: string | number | null | undefined): React.ReactNode {
  if (wind === null || wind === undefined || wind === "N/D" || wind === "--") {
    return <span className="font-bold tabular-nums text-slate-500">N/D</span>;
  }
  const n = parseFloat(String(wind));
  if (isNaN(n)) return <span className="font-bold tabular-nums text-slate-500">N/D</span>;
  return <span className="font-bold tabular-nums text-white">{n.toFixed(1)} km/h</span>;
}

function getStatoDisplay(stato: string | undefined | null): { icon: React.ReactNode; label: string; colorClass: string } {
  if (!stato) return { icon: ICONA_STATO["n/d"], label: "N/D", colorClass: "text-slate-400" };
  const s = stato.toLowerCase().trim();
  if (s === "offline") return { icon: ICONA_STATO.offline, label: "Offline", colorClass: "text-slate-400" };
  if (s === "errore" || s === "error") return { icon: ICONA_STATO.errore, label: "Errore", colorClass: "text-red-400" };
  if (s === "n/d") return { icon: ICONA_STATO["n/d"], label: "N/D", colorClass: "text-slate-400" };
  return { icon: ICONA_STATO[s] ?? ICONA_STATO.offline, label: stato, colorClass: "text-white" };
}

export default function DecolliCard({
  decolli,
  selectedId,
  onSelect,
  selectedDay = 0,
  onRefresh,
  isUpdating,
  error,
}: DecolliCardProps) {
  const [showDebug, setShowDebug] = useState(false);
  const dt = getDateTime(selectedDay);

  const datiCaricati = decolli.some(d => {
    const agg = d.aggressiveWeather;
    return agg && agg.stato !== "Offline" && agg.stato !== "Errore";
  });

  return (
    <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl p-3 md:p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
          Decolli
          {!datiCaricati && !isUpdating && (
            <AlertTriangle size={14} className="text-amber-500" />
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
            Ibrido Aggressivo 15m
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isUpdating}
              className="p-1 rounded-lg hover:bg-slate-700/60 transition-colors disabled:opacity-50"
              title="Aggiorna dati"
            >
              <RefreshCw size={14} className={`text-slate-400 ${isUpdating ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 mb-3 bg-slate-800/60 rounded-xl px-2.5 py-1.5 border border-slate-700/40">
        <Clock size={12} />
        <span className="font-medium">{dt.date}</span>
        <span className="text-slate-600">·</span>
        <span>aggiornamento ogni 15 min</span>
        {error && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-rose-400 truncate">{error}</span>
          </>
        )}
        {!datiCaricati && !isUpdating && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400">Dati non disponibili</span>
          </>
        )}
        {isUpdating && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-cyan-400 animate-pulse">Aggiornamento in corso...</span>
          </>
        )}
      </div>

      {/* Debug toggle */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showDebug ? "Nascondi debug" : "Debug dati"}
        </button>
      </div>

      {showDebug && (
        <div className="mb-3 p-2 bg-slate-800/80 rounded-lg text-[10px] font-mono text-slate-400 max-h-32 overflow-y-auto">
          <div className="mb-1 text-slate-300">Stato caricamento dati:</div>
          <div>Card totali: {decolli.length}</div>
          <div>Con dati validi: {decolli.filter(d => {
            const a = d.aggressiveWeather;
            return a && a.stato !== "Offline" && a.stato !== "Errore" && a.stato !== "N/D";
          }).length}</div>
          <div>Offline: {decolli.filter(d => {
            const a = d.aggressiveWeather;
            return a && (a.stato === "Offline" || a.stato === "Errore" || a.stato === "N/D");
          }).length}</div>
          {decolli.slice(0, 3).map(d => {
            const a = d.aggressiveWeather;
            return (
              <div key={d.id} className="text-slate-500">
                • {d.site_name || d.name}: stato={a?.stato ?? "null"} temp={a?.temp ?? "N/D"} wind={a?.wind ?? "N/D"}
              </div>
            );
          })}
          {decolli.length > 3 && <div className="text-slate-600">...e altri {decolli.length - 3}</div>}
        </div>
      )}

      {/* Lista card */}
      <div className="space-y-2.5 max-h-80 md:max-h-96 overflow-y-auto pr-1 scrollbar-thin">
        {decolli.map((item) => {
          const isSelected = item.id === selectedId;
          const aggressive = item.aggressiveWeather ?? null;
          const hasData = aggressive !== null && aggressive !== undefined;

          const { icon: statoIcon, label: statoLabel, colorClass: statoColor } =
            getStatoDisplay(hasData ? aggressive.stato : undefined);

          const temp = hasData ? aggressive.temp : null;
          const rain = hasData ? aggressive.rain : null;
          const wind = hasData ? aggressive.wind : null;
          const dir = hasData ? aggressive.dir : null;
          const baseNubi = hasData ? aggressive.baseNubi : null;
          const termiche = hasData ? aggressive.termiche : null;
          const indice = hasData ? aggressive.indice : null;
          const indiceLabel = hasData ? aggressive.indiceLabel : "N/D";

          const direction = dir;
          const dirLabel = (direction !== null && direction !== "N/D" && direction !== "--" && direction !== "")
            ? getCardinalDir(parseFloat(String(direction)))
            : "N/D";
          const dirArrow = (direction !== null && direction !== "N/D" && direction !== "--" && direction !== "")
            ? getWindArrow(parseFloat(String(direction)))
            : "→";

          // Colore indice
          const indiceColor = indice === null ? "text-slate-400" :
                              indice <= 3 ? "text-emerald-400" :
                              indice <= 5 ? "text-lime-400" :
                              indice <= 7 ? "text-amber-400" :
                              indice <= 8 ? "text-orange-400" : "text-red-400";
          const indiceBg = indice === null ? "bg-slate-800/60 border-slate-600/40" :
                           indice <= 3 ? "bg-emerald-950/60 border-emerald-500/40" :
                           indice <= 5 ? "bg-lime-950/60 border-lime-500/40" :
                           indice <= 7 ? "bg-amber-950/60 border-amber-500/40" :
                           indice <= 8 ? "bg-orange-950/60 border-orange-500/40" : "bg-red-950/60 border-red-500/40";

          const isOffline = !hasData || aggressive.stato === "Offline" || aggressive.stato === "Errore";
          const rainValue = (() => {
            if (!hasData) return 0;
            const n = parseFloat(String(rain));
            return isNaN(n) ? 0 : n;
          })();

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`
                w-full rounded-2xl p-3 text-left transition-all border-2 cursor-pointer relative overflow-hidden
                ${isSelected
                  ? "bg-slate-800/90 border-emerald-400 shadow-md ring-1 ring-emerald-400/40"
                  : isOffline
                    ? "bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600"
                    : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600"
                }
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    <span>{item.site_name || item.name}</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-300">{item.location_name || item.valley}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.orientation || item.exposure} · {item.elevation_m || item.altitude}m
                  </div>
                </div>

                {/* Badge Indice Volabilità */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-black shrink-0 ${indiceBg} ${indiceColor}`}>
                  {indice !== null ? (
                    <>
                      <span>{indice}</span>
                      <span className="opacity-70">/10</span>
                    </>
                  ) : (
                    <span>N/D</span>
                  )}
                </div>
              </div>

              {/* Dati Meteo */}
              <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {statoIcon}
                    <span className={`font-bold capitalize truncate ${statoColor}`}>{statoLabel}</span>
                    {formatTemp(temp)}
                    {!isOffline && rainValue > 0 && (
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/40">
                        {rainValue.toFixed(1)}mm
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-200 shrink-0">
                    <Wind size={13} className="text-cyan-400 shrink-0" />
                    {formatWind(wind)}
                    <span className="text-slate-400 font-mono text-[11px]">{dirArrow} {dirLabel}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Layers size={11} className="text-purple-400" />
                    <span>Base nubi: <strong className="text-purple-200">{baseNubi ?? "N/D"}</strong></span>
                  </span>
                  <span className="flex items-center gap-1">
                    Termiche: <strong className="text-amber-200">{termiche ?? "N/D"}</strong>
                  </span>
                </div>
              </div>
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
