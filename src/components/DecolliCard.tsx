"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Wind, Clock, Thermometer, AlertTriangle } from "lucide-react";
import { weatherService } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";
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

function getCurrentDateTime(): string {
  const now = new Date();
  return now.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getCurrentHour(): string {
  const now = new Date();
  return now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DecolloItem {
  nome: string;
  valle: string;
  quota: number;
  direzione: string;
}

interface DecolliCardProps {
  decolli: DecolloItem[];
  selectedId: string;
  onSelect: (item: DecolloItem) => void;
  weatherMap?: Record<string, any>;
}

interface LiveDato {
  temp: number;
  wind: number;
  gust: number | null;
  dir: number;
  code: number;
}

/** Carica vento reale per TUTTI i decolli */
async function caricaTuttiIVenti(): Promise<Record<string, LiveDato | null>> {
  const risultati: Record<string, LiveDato | null> = {};

  for (const item of DECOLLI) {
    try {
      const { data } = await weatherService.fetchCurrent(item.lat, item.lon);
      if (data) {
        risultati[item.name] = {
          temp: data.temperature ?? 20,
          wind: data.windSpeed ?? 0,
          gust: data.windGusts ?? null,
          dir: data.windDir ?? 0,
          code: data.weatherCode ?? 0,
        };
      }
    } catch {
      // silenzioso
    }
  }
  return risultati;
}

const DecolliCard = ({ decolli, selectedId, onSelect, weatherMap }: DecolliCardProps) => {
  const [liveData, setLiveData] = useState<Record<string, LiveDato | null>>({});
  const isFirstMount = useRef(true);

  const avviaAggiornamento = useCallback(async () => {
    const risultati = await caricaTuttiIVenti();
    setLiveData(risultati);
    console.log(`✅ Vento aggiornato per ${Object.keys(risultati).length} decolli`);
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      avviaAggiornamento();
    }

    // Refresh ogni 30 minuti
    const intervallo = setInterval(avviaAggiornamento, 30 * 60 * 1000);
    return () => clearInterval(intervallo);
  }, [avviaAggiornamento]);

  const getCurrentData = (id: string) => {
    // Priorità 1: dati live appena caricati
    const live = liveData[id];
    if (live) return live;

    // Priorità 2: weatherMap (dati già caricati)
    if (!weatherMap?.[id]) return null;
    const hourly = weatherMap[id];
    if (!Array.isArray(hourly) || hourly.length === 0) return null;

    const last = hourly[hourly.length - 1];
    if (!last) return null;

    return {
      temp: last.temperature ?? 20,
      wind: last.windSpeed ?? 0,
      gust: last.windGusts ?? null,
      dir: last.windDir ?? 0,
      code: last.weatherCode ?? 0,
    };
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4">
      <h2 className="text-base font-bold text-white mb-3">
        Decolli disponibili ({decolli.length})
      </h2>

      <div
        style={{
          maxHeight: "160px",
          overflowY: "auto",
          paddingRight: "4px",
        }}
      >
        {decolli.map((item) => {
          const isSelected = item.nome === selectedId;
          const current = getCurrentData(item.nome);
          const hasData = current != null;
          const temp = hasData ? Math.round(current.temp) : null;
          const wind = hasData ? Math.round(current.wind) : null;
          const gust = hasData ? (current.gust != null ? Math.round(current.gust) : null) : null;
          const dir = hasData ? Math.round(current.dir) : null;
          const code = hasData ? current.code : null;
          const emoji = getWeatherEmoji(code);
          const dirLabel = dir != null ? getCardinalDir(dir) : "N/D";
          const dirArrow = dir != null ? getWindArrow(dir) : "→";

          // VALUTAZIONE VENTO VS ESPOSIZIONE
          const valutazioneVento = dir != null
            ? valutaVentoPerDecollo(dir, item.direzione)
            : null;
          const ventoColor = valutazioneVento
            ? getVentoStatusColor(valutazioneVento.status)
            : "text-slate-400";

          return (
            <button
              key={item.nome}
              onClick={() => onSelect(item)}
              className={`
                w-full rounded-xl p-3 text-left transition-all border-2 mb-2
                ${isSelected
                  ? "bg-emerald-900/40 border-emerald-500"
                  : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/50"
                }
              `}
            >
              {/* NOME DECOLLO */}
              <div className="text-sm font-bold text-white">
                {item.nome}
              </div>

              {/* GIORNO E ORA (fuso Italy) */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                <Clock size={12} />
                <span>{getCurrentDateTime()} · {getCurrentHour()}</span>
              </div>

              {/* ICONA METEO + TEMPERATURA + VALLE / QUOTA / DIREZIONE */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{emoji}</span>
                  <span className="text-sm font-bold text-amber-300">
                    {temp != null ? `${temp}°` : "N/D"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex gap-3">
                  <span>{item.valle}</span>
                  <span>{item.quota} m</span>
                  <span>{item.direzione}</span>
                </div>
              </div>

              {/* VENTO ATTUALE + VALUTAZIONE ESPOSIZIONE */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-700/30">
                <div className="text-[11px] text-slate-500 mb-1">
                  Vento attuale quota decollo
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Wind size={16} />
                    <span className="font-bold">
                      {wind != null ? `${wind} km/h` : "N/D"}
                    </span>
                    {gust != null && (
                      <span className="text-[10px] text-red-300 font-normal">
                        (raff. {gust})
                      </span>
                    )}
                  </div>
                  {dir != null && (
                    <span className="text-slate-300 font-bold">
                      {dirArrow} {dirLabel} ({dir}°)
                    </span>
                  )}
                </div>

                {/* AVVISO VENTO/ESPOSIZIONE */}
                {valutazioneVento && (
                  <div className={`mt-1.5 flex items-center gap-1.5 text-[10px] rounded-lg px-2 py-1 border ${ventoColor}`}>
                    {valutazioneVento.status === "sottovento" && (
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                    )}
                    <span className="font-bold">{valutazioneVento.icon}</span>
                    <span>{valutazioneVento.label}</span>
                    <span className="text-slate-500">|</span>
                    <span className="opacity-80">{Math.round(wind)} km/h da {Math.round(dir)}° vs esposizione {item.direzione}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolliCard;