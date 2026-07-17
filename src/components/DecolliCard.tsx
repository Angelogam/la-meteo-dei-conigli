"use client";

import React from "react";
import { Wind, Clock, Thermometer, Gauge, Navigation, Mountain, MapPin } from "lucide-react";

function getCardinalDir(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function getWindArrow(deg: number): string {
  if (deg == null) return "→";
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
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

/**
 * Restituisce l'ora corrente nel fuso Europe/Rome.
 */
function getRomeHour(): number {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const month = now.getMonth() + 1;
  const isCest = month > 3 && month < 10;
  return (utcHour + (isCest ? 2 : 1)) % 24;
}

/**
 * Data odierna in formato YYYY-MM-DD nel fuso Europe/Rome.
 */
function getRomeDate(): string {
  return new Date().toLocaleDateString("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).split("/").reverse().join("-");
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

const DecolliCard = ({ decolli, selectedId, onSelect, weatherMap }: DecolliCardProps) => {
  // Trova il dato orario corrente usando il fuso Europe/Rome
  const getCurrentData = (id: string) => {
    if (!weatherMap?.[id]) return null;
    const hourly = weatherMap[id];
    if (!Array.isArray(hourly) || hourly.length === 0) return null;

    const oraCorrente = getRomeHour();
    const oggiRome = getRomeDate();

    // Cerca tra tutti i dati il più vicino all'ora corrente per oggi
    // Prova prima match esatto ora + data
    const current = hourly.find((h: any) => {
      if (!h.time) return false;
      const t = h.time instanceof Date ? h.time : new Date(h.time);
      if (isNaN(t.getTime())) return false;

      // Estrai ora UTC e data UTC
      const oraUtc = t.getUTCHours();
      const giornoUtc = t.toISOString().slice(0, 10);

      // L'API Open-Meteo dà i dati in UTC. Per avere l'ora italiana:
      const month = new Date().getMonth() + 1;
      const isCest = month > 3 && month < 10;
      const offset = isCest ? 2 : 1;
      const oraIta = (oraUtc + offset) % 24;

      return oraIta === oraCorrente && giornoUtc <= oggiRome;
    });

    if (current) return current;

    // Fallback 1: Match per data (oggi) e ora più vicina
    const candidati = hourly.filter((h: any) => {
      if (!h.time) return false;
      const t = h.time instanceof Date ? h.time : new Date(h.time);
      if (isNaN(t.getTime())) return false;
      const giornoUtc = t.toISOString().slice(0, 10);
      return giornoUtc <= oggiRome;
    });

    if (candidati.length > 0) {
      // Prendi l'ultimo dato disponibile (più recente)
      return candidati[candidati.length - 1];
    }

    // Fallback 2: primo dato disponibile
    return hourly[0] || null;
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
        {decolli.map((item, idx) => {
          const isSelected = item.nome === selectedId;
          const current = getCurrentData(item.nome);
          const hasData = current != null;
          const temp = hasData ? Math.round(current.temperature) : null;
          const wind = hasData ? Math.round(current.windSpeed) : null;
          const gust = hasData ? (current.windGusts ? Math.round(current.windGusts) : null) : null;
          const dir = hasData ? Math.round(current.windDir) : null;
          const code = hasData ? current.weatherCode : null;
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