"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Wind, Clock, Thermometer } from "lucide-react";
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

/** Trova l'ora più vicina all'ora corrente tra i dati hourly */
function getClosestHour(hourly: any[]): any | null {
  if (!hourly || hourly.length === 0) return null;
  const now = new Date();
  const currentHour = now.getHours();
  const today = now.toDateString();

  // Cerca esattamente l'ora corrente di oggi
  const exact = hourly.find((h: any) => {
    const t = new Date(h.time);
    return t.toDateString() === today && t.getHours() === currentHour;
  });
  if (exact) return exact;

  // Fallback: ultima ora di oggi
  const todayHours = hourly.filter((h: any) => {
    const t = new Date(h.time);
    return t.toDateString() === today;
  });
  if (todayHours.length > 0) {
    return todayHours.reduce((prev: any, curr: any) => {
      const prevT = new Date(prev.time);
      const currT = new Date(curr.time);
      return Math.abs(currT.getHours() - currentHour) < Math.abs(prevT.getHours() - currentHour) ? curr : prev;
    }, todayHours[0]);
  }

  return hourly[0];
}

/** Estrae i dati vento da un dato orario weatherService */
function extractWind(d: any): { temp: number; wind: number; gust: number; dir: number; code: number } | null {
  if (!d) return null;
  const temp = d.temperature ?? d.temp ?? 20;
  const wind = d.windSpeed ?? d.wind_speed_10m ?? 0;
  const gust = d.windGusts ?? d.wind_gusts_10m ?? null;
  const dir = d.windDir ?? d.wind_direction_10m ?? 0;
  const code = d.weatherCode ?? d.weather_code ?? 0;
  return { temp, wind, gust, dir, code };
}

/** Carica vento reale per TUTTI i decolli (fetch singolo per decollo) */
async function caricaTuttiIVenti(): Promise<Record<string, { temp: number; wind: number; gust: number; dir: number; code: number } | null>> {
  const risultati: Record<string, any> = {};

  for (const item of DECOLLI) {
    try {
      const { data } = await weatherService.fetchCurrent(item.lat, item.lon);
      if (data) {
        risultati[item.name] = extractWind(data);
      }
    } catch {
      // silenzioso
    }
  }
  return risultati;
}

const DecolliCard = ({ decolli, selectedId, onSelect, weatherMap }: DecolliCardProps) => {
  const [liveData, setLiveData] = useState<Record<string, any>>({});
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

    // Priorità 2: dati hourly da weatherMap (usa l'ora più vicina)
    if (weatherMap?.[id]) {
      const hourly = weatherMap[id];
      if (Array.isArray(hourly) && hourly.length > 0) {
        const closest = getClosestHour(hourly);
        const extracted = extractWind(closest);
        if (extracted) return extracted;
      }
    }

    return null;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4">
      <h2 className="text-base font-bold text-white mb-3">
        Decolli disponibili ({decolli.length}) — Vento reale
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

              {/* VENTO ATTUALE QUOTA DECOLLO + PUNTO CARDINALE + KM/H */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-700/30">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Wind size={16} />
                    <span className="font-bold text-white">
                      {wind != null ? `${wind} km/h` : "N/D"}
                    </span>
                    {gust != null && gust > wind && (
                      <span className="text-[10px] text-red-300 font-normal">
                        raff. {gust}
                      </span>
                    )}
                  </div>
                  {dir != null && (
                    <span className="text-slate-300 font-bold text-xs">
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