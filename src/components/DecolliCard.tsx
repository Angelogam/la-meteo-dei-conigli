"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Wind, Clock, Thermometer, AlertTriangle } from "lucide-react";
import { weatherService } from "@/services/weatherService";
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

interface LiveDato {
  temp: number;
  wind: number;
  code: number;
  dir: number;
  gust: number | null;
}

const REFRESH_INTERVAL = 600000; // 10 minuti
const MAX_CONCURRENT = 3; // Massimo 3 richieste contemporanee

const DecolliCard = ({ decolli, selectedId, onSelect, selectedDay = 0 }: DecolliCardProps) => {
  const [liveData, setLiveData] = useState<Record<string, LiveDato | null>>({});
  const [loadingAll, setLoadingAll] = useState(true);
  const mountedRef = useRef(true);

  // Coda per gestire le richieste in modo sequenziale (rate limit)
  const loadAllData = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoadingAll(true);
    const newData: Record<string, LiveDato> = {};

    // Carica in batch da massimo 3 alla volta per evitare rate-limit
    for (let i = 0; i < decolli.length; i += MAX_CONCURRENT) {
      const batch = decolli.slice(i, i + MAX_CONCURRENT);

      await Promise.all(batch.map(async (item) => {
        try {
          // ⚡ Usa la chiamata LEGGERA (solo 4 parametri) per la lista
          const { data } = await weatherService.fetchLight(item.lat, item.lon);
          if (data && data.temperature != null && mountedRef.current) {
            newData[item.nome] = {
              temp: Math.round(data.temperature),
              wind: Math.round(data.windSpeed),
              code: data.weatherCode,
              dir: data.windDir || 180, // Direzione vento reale con fallback a S
              gust: null,
            };
          }
        } catch {
          // Ignora errori individuali
        }
      }));

      // Pausa tra i batch per evitare rate-limit
      if (i + MAX_CONCURRENT < decolli.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (mountedRef.current) {
      setLiveData(newData);
      setLoadingAll(false);
    }
  }, [decolli]);

  // Carica subito al mount
  useEffect(() => {
    loadAllData();

    // Refresh periodico in background
    const interval = setInterval(() => {
      loadAllData();
    }, REFRESH_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadAllData]);

  // Aggiorna anche quando cambia il giorno selezionato
  useEffect(() => {
    if (!loadingAll) {
      loadAllData();
    }
  }, [selectedDay]);

  // Stato di caricamento iniziale
  if (loadingAll && Object.keys(liveData).length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 md:p-4">
        <h2 className="text-sm md:text-base font-bold text-white mb-2 md:mb-3">
          Decolli ({decolli.length})
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-2">
          <div className="w-8 h-8 rounded-full border-3 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          <div className="text-xs md:text-sm">
            Caricamento {Object.keys(liveData).length}/{decolli.length} decolli...
          </div>
        </div>
      </div>
    );
  }

  const dt = getDateTime(selectedDay);
  const caricati = Object.keys(liveData).length;
  const percentuale = decolli.length > 0 ? Math.round((caricati / decolli.length) * 100) : 0;

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 md:p-4">
      <h2 className="text-sm md:text-base font-bold text-white mb-2 md:mb-3">
        Decolli ({caricati}/{decolli.length})
      </h2>

      {/* Barra progresso */}
      {loadingAll && caricati > 0 && caricati < decolli.length && (
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percentuale}%` }} />
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 mb-2 md:mb-3 bg-slate-800/60 rounded-lg px-2.5 py-1.5 border border-slate-700/40">
        <Clock size={12} />
        <span className="font-medium">{dt.date}</span>
        <span className="text-slate-600">·</span>
        <span>aggiornato {dt.ora}</span>
        <span className="text-slate-600">·</span>
        <span className="text-emerald-400">{percentuale}%</span>
      </div>

      <div className="space-y-2 max-h-64 md:max-h-80 overflow-y-auto pr-1 scrollbar-thin">
        {decolli.map((item) => {
          const isSelected = item.id === selectedId;
          const current = liveData[item.nome];
          const hasData = current != null;
          const temp = hasData ? Math.round(current.temp) : null;
          const wind = hasData ? Math.round(current.wind) : null;
          const dir = hasData ? current.dir : null;
          const code = hasData ? current.code : null;
          const emoji = getWeatherEmoji(code);
          const dirLabel = dir != null ? getCardinalDir(dir) : "N/D";
          const dirArrow = dir != null ? getWindArrow(dir) : "→";

          // Valuta compatibilità vento/esposizione
          const valutazione = hasData && dir != null
            ? validaVentoPerDecollo(dir, item.direzione)
            : null;

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
              <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                {item.nome}
                {valutazione && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${getVentoStatusColor(valutazione.status)}`}>
                    {valutazione.icon} {valutazione.status === "favorevole" ? "OK" : valutazione.status === "laterale" ? "LAT" : valutazione.status === "contrario" ? "CON" : "SOTTO"}
                  </span>
                )}
              </div>

              {hasData && temp != null ? (
                <>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base md:text-lg">{emoji}</span>
                      <span className="text-sm font-bold text-amber-300 tabular-nums">
                        {temp}°
                      </span>
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500">
                      {item.valle} · {item.quota}m · {item.direzione}
                    </div>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-700/30">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <Wind size={14} className="text-emerald-400 shrink-0" />
                        <span className="font-bold text-white tabular-nums">
                          {wind} km/h
                        </span>
                      </div>
                      <span className="text-xs text-slate-300 font-bold">
                        {dirArrow} {dirLabel} ({dir != null ? Math.round(dir) : ""}°)
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between mt-1.5 text-[10px] md:text-xs text-slate-500">
                  <span>{item.valle} · {item.quota}m · {item.direzione}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                    <span className="italic">attesa...</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

function getDateTime(selectedDay: number): { date: string; ora: string } {
  const oggi = new Date();
  const target = new Date(oggi);
  target.setDate(oggi.getDate() + selectedDay);

  const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  const date = `${giorni[target.getDay()]} ${target.getDate()} ${mesi[target.getMonth()]}`;
  const ora = oggi.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return { date, ora };
}

export default DecolliCard;