"use client";

import React from "react";
import { Wind, Clock, Layers, AlertTriangle, Sun, Cloud, CloudRain, Zap } from "lucide-react";
import type { Decollo } from "@/data/decolli";
import { validaVentoPerDecollo, getVentoStatusColor } from "@/utils/validaVentoDecollo";

interface DecolliCardProps {
  decolli: (Decollo & { aggressiveWeather?: any })[];
  selectedId: string;
  onSelect: (item: Decollo) => void;
  selectedDay?: number;
}

const ICONA_STATO: Record<string, React.ReactNode> = {
  sereno: <Sun className="w-4 h-4 text-amber-400" />,
  variabile: <Cloud className="w-4 h-4 text-amber-300" />,
  nuvoloso: <Cloud className="w-4 h-4 text-slate-400" />,
  pioggia: <CloudRain className="w-4 h-4 text-blue-400" />,
  temporale: <Zap className="w-4 h-4 text-purple-400" />,
  coperto: <Cloud className="w-4 h-4 text-slate-400" />,
  offline: <AlertTriangle className="w-4 h-4 text-slate-500" />,
};

export default function DecolliCard({ decolli, selectedId, onSelect, selectedDay = 0 }: DecolliCardProps) {
  const dt = getDateTime(selectedDay);

  return (
    <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl p-3 md:p-4 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
          Decolli
        </h2>
        <span className="text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
          Ibrido Aggressivo 15m
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
          const aggressive = item.aggressiveWeather;
          const hasAggressive = aggressive != null;

          // Usa dati aggressivi se disponibili, altrimenti mostra dati non disponibili
          const stato = hasAggressive ? aggressive.stato.toLowerCase() : "offline";
          const temp = hasAggressive ? aggressive.temp : "N/D";
          const rain = hasAggressive ? aggressive.rain : "N/D";
          const cloud = hasAggressive ? aggressive.cloud : "N/D";
          const wind = hasAggressive ? aggressive.wind : "N/D";
          const baseNubi = hasAggressive ? aggressive.baseNubi : "N/D";
          const termiche = hasAggressive ? aggressive.termiche : "N/D";
          const indice = hasAggressive ? aggressive.indice : null;
          const indiceLabel = hasAggressive ? aggressive.indiceLabel : "N/D";

          const dirLabel = hasAggressive ? getCardinalDir(parseFloat(aggressive.wind)) : "N/D";
          const dirArrow = hasAggressive ? getWindArrow(parseFloat(aggressive.wind)) : "→";

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

                {/* Badge Indice Volabilità Aggressivo */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-black ${indiceBg} ${indiceColor}`}>
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

              {/* Dati Meteo Aggressivi */}
              <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {ICONA_STATO[stato] || ICONA_STATO.offline}
                    <span className="font-bold text-white capitalize">{aggressive?.stato || "N/D"}</span>
                    <span className="font-extrabold text-amber-300 tabular-nums">{temp}°C</span>
                    {parseFloat(rain) > 0 && (
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/40">
                        {rain}mm
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-200">
                    <Wind size={13} className="text-cyan-400 shrink-0" />
                    <span className="font-bold tabular-nums text-white">{wind} km/h</span>
                    <span className="text-slate-400 font-mono text-[11px]">{dirArrow} {dirLabel}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Layers size={11} className="text-purple-400" />
                    <span>Base nubi: <strong className="text-purple-200">{baseNubi}</strong></span>
                  </span>
                  <span className="flex items-center gap-1">
                    Termiche: <strong className="text-amber-200">{termiche}</strong>
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