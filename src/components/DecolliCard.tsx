"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Wind, Clock, Thermometer, RefreshCw } from "lucide-react";
import { weatherService } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";

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

// Trova l'ora più vicina nelle previsioni orarie
function getClosestHourData(hourlyData: any[]): any | null {
  if (!hourlyData || hourlyData.length === 0) return null;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  // Se siamo oltre i 30 minuti, prendiamo l'ora successiva
  const targetHour = currentMinutes >= 30 ? currentHour + 1 : currentHour;
  
  // Cerca l'ora più vicina nei dati
  let closest = hourlyData[0];
  let minDiff = Infinity;
  
  for (const data of hourlyData) {
    if (!data.time) continue;
    const dataHour = new Date(data.time).getHours();
    const diff = Math.abs(dataHour - targetHour);
    if (diff < minDiff) {
      minDiff = diff;
      closest = data;
    }
  }
  
  return closest;
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

/** Carica dati meteo attuali per TUTTI i decolli */
async function caricaDatiMeteo(): Promise<Record<string, LiveDato | null>> {
  const risultati: Record<string, LiveDato | null> = {};

  for (const item of DECOLLI) {
    try {
      // Usa fetchWeather che esiste nel service
      const { current } = await weatherService.fetchWeather(item.lat, item.lon);
      
      if (current) {
        risultati[item.name] = {
          temp: Math.round(current.temperature),
          wind: Math.round(current.windSpeed),
          gust: current.windGusts != null ? Math.round(current.windGusts) : null,
          dir: Math.round(current.windDir),
          code: current.weatherCode ?? 0,
        };
      }
    } catch (error) {
      console.error(`Errore nel caricare meteo per ${item.name}:`, error);
    }
  }
  return risultati;
}

const DecolliCard = ({ decolli, selectedId, onSelect, weatherMap }: DecolliCardProps) => {
  const [liveData, setLiveData] = useState<Record<string, LiveDato | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const isFirstMount = useRef(true);

  const avviaAggiornamento = useCallback(async () => {
    setIsLoading(true);
    console.log("🔄 Aggiornamento dati meteo in corso...");
    const dati = await caricaDatiMeteo();
    setLiveData(dati);
    setIsLoading(false);
    console.log(`✅ Dati aggiornati per ${Object.keys(dati).length} decolli`);
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      avviaAggiornamento();
    }

    // Refresh ogni 15 minuti
    const intervallo = setInterval(avviaAggiornamento, 15 * 60 * 1000);
    return () => clearInterval(intervallo);
  }, [avviaAggiornamento]);

  const getCurrentData = (id: string) => {
    // Priorità 1: dati live appena caricati
    const live = liveData[id];
    if (live) return live;

    // Priorità 2: weatherMap (dati già caricati dal componente padre)
    if (!weatherMap?.[id]) return null;
    const hourly = weatherMap[id];
    if (!Array.isArray(hourly) || hourly.length === 0) return null;

    const closestData = getClosestHourData(hourly);
    if (!closestData) return null;

    return {
      temp: closestData.temperature ?? 20,
      wind: closestData.windSpeed ?? 0,
      gust: closestData.windGusts ?? null,
      dir: closestData.windDir ?? 0,
      code: closestData.weatherCode ?? 0,
    };
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-white">
          Decolli disponibili ({decolli.length})
        </h2>
        <button
          onClick={avviaAggiornamento}
          disabled={isLoading}
          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "Aggiornando..." : "Aggiorna"}
        </button>
      </div>

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
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {item.nome}
                {!hasData && (
                  <span className="text-[10px] text-yellow-400">
                    ⚠️ dati non disponibili
                  </span>
                )}
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

              {/* VENTO ATTUALE QUOTA DECOLLO + PUNTO CARDINALE + KM/H */}
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
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolliCard;