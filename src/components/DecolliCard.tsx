"use client";

import React from "react";
import { Wind, Clock, Layers, AlertTriangle, Sun, Cloud, CloudRain, Zap, Info, MapPin } from "lucide-react";
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
  isUpdating,
  error,
}: DecolliCardProps) {
  const dt = getDateTime(selectedDay);

  const datiCaricati = decolli.some((d) => {
    const stato = d.aggressiveWeather?.stato?.toLowerCase();
    return stato != null && !["offline", "errore", "n/d"].includes(stato);
  });

  return (
    <section className="launch-list-card bg-slate-900/90 border border-slate-700/60 rounded-2xl p-3 md:p-4 shadow-xl" aria-labelledby="launch-list-title">
      {/* Header */}
      <div className="launch-list-header flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 id="launch-list-title" className="launch-list-title text-sm md:text-base font-bold text-white flex items-center gap-2">
            Scegli il decollo
            {!datiCaricati && !isUpdating && (
              <AlertTriangle size={14} className="text-amber-400" aria-label="Dati meteo non disponibili" />
            )}
          </h2>
          <p className="launch-list-subtitle mt-0.5 text-xs leading-relaxed text-slate-400">
            Confronta le condizioni dei siti monitorati.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="launch-source-pill text-[10px] text-cyan-200 bg-cyan-950/50 border border-cyan-500/30 px-2 py-1 rounded-full font-medium">
            Multi-fonte
          </span>

        </div>
      </div>

      {/* Info bar */}
      <div className="launch-list-info flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 mb-3 bg-slate-800/60 rounded-xl px-2.5 py-1.5 border border-slate-700/40">
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

      {/* Lista card */}
      <div className="launch-list-items space-y-2.5 max-h-80 md:max-h-96 overflow-y-auto pr-1 scrollbar-thin">
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

          const direction = dir;
          const dirDegrees = (direction !== null && direction !== "N/D" && direction !== "--" && direction !== "")
            ? parseFloat(String(direction))
            : null;
          const dirLabel = dirDegrees !== null && Number.isFinite(dirDegrees)
            ? getCardinalDir(dirDegrees)
            : "N/D";
          const hasDirection = dirDegrees !== null && Number.isFinite(dirDegrees);
          const lat = Number(item.lat);
          const lon = Number(item.lon);
          const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

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
              aria-pressed={isSelected}
              className={`
                launch-option w-full rounded-2xl p-3 text-left transition-all border-2 cursor-pointer relative overflow-hidden
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
                  <div className="launch-option-title text-sm font-bold text-white flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate">{item.site_name || item.name}</span>
                    <span className="shrink-0 text-slate-500">·</span>
                    <span className="min-w-0 truncate font-medium text-slate-300">{item.location_name || item.valley}</span>
                  </div>
                  <div className="launch-option-meta text-[10px] text-slate-400 truncate">
                    {item.orientation || item.exposure} · {item.elevation_m || item.altitude}m
                  </div>
                  {hasCoords && (
                    <div className="launch-option-coords text-[9px] font-mono text-slate-500 truncate" title={`Coordinate GPS del decollo: ${lat.toFixed(4)}, ${lon.toFixed(4)}`}>
                      <MapPin size={9} aria-hidden="true" className="inline-block align-[-1px] mr-0.5 text-slate-500" />
                      {lat.toFixed(4)}, {lon.toFixed(4)}
                    </div>
                  )}
                </div>

                {/* Indicatore sintetico, da leggere insieme ai dettagli meteo */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-black shrink-0 ${indiceBg} ${indiceColor}`}
                  aria-label={indice !== null ? `Indice meteo indicativo ${indice} su 10` : "Indice meteo non disponibile"}
                  title="Indice sintetico indicativo, non è un giudizio di sicurezza del volo"
                >
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
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {statoIcon}
                    <span className={`font-bold capitalize whitespace-nowrap ${statoColor}`}>{statoLabel}</span>
                    {formatTemp(temp)}
                    {!isOffline && rainValue > 0 && (
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/40 whitespace-nowrap">
                        {rainValue.toFixed(1)}mm
                      </span>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-1 text-slate-200 shrink-0">
                    <Wind size={13} className="text-cyan-400 shrink-0" />
                    {formatWind(wind)}
                    <span
                      className="launch-wind-dial"
                      aria-hidden="true"
                      title={hasDirection ? `Provenienza del vento: ${Math.round(dirDegrees)}°` : "Direzione del vento non disponibile"}
                    >
                      <span
                        className="launch-wind-needle"
                        style={hasDirection ? { transform: `rotate(${dirDegrees}deg)` } : undefined}
                      />
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]" title="Settore di provenienza del vento">{dirLabel}</span>
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
    </section>
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
