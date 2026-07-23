"use client";

import React from "react";
import { useMeteoBatch } from "@/services/meteoRepository";
import { Wind, Clock, Loader2 } from "lucide-react";
import { validaVentoPerDecollo, getVentoStatusColor } from "@/utils/validaVentoDecollo";

function getCardinalDir(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWindArrow(deg: number): string {
  if (deg == null) return "→";
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWeatherEmoji(code: number | undefined | null): string {
  if (code == null) return "☀️";
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "☀️";
}

interface DecolloItem {
  id: string;
  nome: string;
  valle: string;
  quota: number;
  direzione: string;
  lat: number;
  lon: number;
}

interface DecolliCardProps {
  decolli: DecolloItem[];
  selectedId: string;
  onSelect: (item: DecolloItem) => void;
  selectedDay?: number;
}

const DecolliCard = ({ decolli, selectedId, onSelect }: DecolliCardProps) => {
  const { decolliData, isLoading, isFetching } = useMeteoBatch(
    decolli.map(d => ({ id: d.id, lat: d.lat, lon: d.lon, name: d.nome }))
  );

  const caricati = Object.values(decolliData).filter(d => d.data != null).length;

  if (isLoading && caricati === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 md:p-4">
        <h2 className="text-sm md:text-base font-bold text-white mb-3">
          Decolli ({decolli.length})
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-2">
          <div className="w-8 h-8 rounded-full border-3 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          <div className="text-xs md:text-sm">Caricamento batch {decolli.length} decolli...</div>
        </div>
      </div>
    );
  }

  const oggi = new Date();
  const oraAgg = oggi.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm md:text-base font-bold text-white">
          Decolli ({caricati}/{decolli.length})
        </h2>
        {isFetching && (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 mb-2 md:mb-3 bg-slate-800/60 rounded-lg px-2.5 py-1.5 border border-slate-700/40">
        <Clock size={12} />
        <span className="font-medium">Dati live</span>
        <span className="text-slate-600">·</span>
        <span>agg. {oraAgg}</span>
      </div>

      <div className="space-y-2 max-h-64 md:max-h-80 overflow-y-auto pr-1 scrollbar-thin">
        {decolli.map((item) => {
          const isSelected = item.id === selectedId;
          const current = decolliData[item.id]?.data;
          const hasData = current != null;
          const temp = hasData ? current.temperature : null;
          const wind = hasData ? current.windSpeed : null;
          const dir = hasData ? current.windDir : null;
          const code = hasData ? current.weatherCode : null;
          const emoji = getWeatherEmoji(code);
          const dirLabel = dir != null ? getCardinalDir(dir) : "N/D";
          const dirArrow = dir != null ? getWindArrow(dir) : "→";

          const valutazioneVento = dir != null
            ? validaVentoPerDecollo(dir, item.direzione)
            : null;
          const ventoColor = valutazioneVento
            ? getVentoStatusColor(valutazioneVento.status)
            : "text-slate-400";

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`
                w-full rounded-xl p-3 text-left transition-all border-2 cursor-pointer
                ${isSelected
                  ? "bg-emerald-900/40 border-emerald-500 shadow-sm"
                  : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/50"
                }
              `}
            >
              <div className="text-sm font-bold text-white truncate">
                {item.nome}
              </div>

              {hasData && temp != null ? (
                <>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base md:text-lg">{emoji}</span>
                      <span className="text-sm font-bold text-amber-300 tabular-nums">{Math.round(temp)}°</span>
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500">
                      {item.valle} · {item.quota}m · {item.direzione}
                    </div>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-700/30">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <Wind size={14} className="text-emerald-400 shrink-0" />
                        <span className="font-bold text-white tabular-nums">{Math.round(wind)} km/h</span>
                      </div>
                      <span className="text-xs text-slate-300 font-bold">{dirArrow} {dirLabel}</span>
                    </div>

                    {valutazioneVento && (
                      <div className={`mt-1 flex items-center gap-1 text-[10px] rounded-lg px-2 py-1 border ${ventoColor}`}>
                        <span>{valutazioneVento.icon}</span>
                        <span className="font-bold">{valutazioneVento.label}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between mt-1.5 text-[10px] md:text-xs text-slate-500">
                  <span>{item.valle} · {item.quota}m · {item.direzione}</span>
                  <span className="italic text-slate-600">N/D</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolliCard;