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

function getDayHourData(
  hourly: any[],
  selectedDay: number
): any | null {
  if (!Array.isArray(hourly) || hourly.length === 0) return null;

  const oggi = new Date();
  const targetDate = new Date(oggi);
  targetDate.setDate(oggi.getDate() + selectedDay);

  const targetStr = `${targetDate.getFullYear()}-${targetDate.getMonth()}-${targetDate.getDate()}`;

  const oreDelGiorno = hourly.filter((h) => {
    const t = new Date(h.time);
    const tStr = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
    return tStr === targetStr;
  });

  if (oreDelGiorno.length === 0) return null;

  const hour = oggi.getHours();
  let closest = oreDelGiorno[0];
  let minDiff = Math.abs(new Date(closest.time).getHours() - hour);

  for (const h of oreDelGiorno) {
    const diff = Math.abs(new Date(h.time).getHours() - hour);
    if (diff < minDiff) {
      minDiff = diff;
      closest = h;
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
  selectedDay?: number;
}

interface LiveDato {
  temp: number;
  wind: number;
  gust: number | null;
  dir: number;
  code: number;
}

const REFRESH_INTERVAL = 600000; // 10 minuti

const DecolliCard = ({ decolli, selectedId, onSelect, weatherMap, selectedDay = 0 }: DecolliCardProps) => {
  const [liveData, setLiveData] = useState<Record<string, LiveDato | null>>({});
  const [loadingAll, setLoadingAll] = useState(true);
  const mountedRef = useRef(true);

  // Carica TUTTI i decolli in blocco al mount e poi ogni 10 minuti
  const loadAllData = useCallback(async () => {
    if (!mountedRef.current) return;

    // Se abbiamo weatherMap con dati giornalieri, usiamo quelli
    if (weatherMap) {
      const entries = Object.entries(weatherMap);
      if (entries.length > 0) {
        const newData: Record<string, LiveDato> = {};
        for (const [key, hourly] of entries) {
          const nome = DECOLLI.find(d => d.id === key)?.name;
          if (!nome) continue;
          const dayData = getDayHourData(hourly, selectedDay);
          if (dayData) {
            newData[nome] = {
              temp: dayData.temperature ?? 20,
              wind: dayData.windSpeed ?? 0,
              gust: dayData.windGusts ?? null,
              dir: dayData.windDir ?? 0,
              code: dayData.weatherCode ?? 0,
            };
          }
        }
        if (Object.keys(newData).length > 0) {
          setLiveData(prev => ({ ...prev, ...newData }));
          setLoadingAll(false);
          return;
        }
      }
    }

    // Fallback: carica da API in blocco
    const newData: Record<string, LiveDato> = {};
    setLoadingAll(true);

    const promises = decolli.map(async (item) => {
      const d = DECOLLI.find(d => d.name === item.nome);
      if (!d) return;
      try {
        const { data } = await weatherService.fetchCurrent(d.lat, d.lon);
        if (data && mountedRef.current) {
          newData[item.nome] = {
            temp: Math.round(data.temperature),
            wind: Math.round(data.windSpeed),
            gust: data.windGusts != null ? Math.round(data.windGusts) : null,
            dir: Math.round(data.windDir),
            code: data.weatherCode,
          };
        }
      } catch {
        // silently fail — card resta vuota
      }
    });

    await Promise.all(promises);
    if (mountedRef.current) {
      setLiveData(newData);
      setLoadingAll(false);
    }
  }, [decolli, weatherMap, selectedDay]);

  // Carica subito al mount
  useEffect(() => {
    loadAllData();

    // Refresh periodico in background
    const interval = setInterval(loadAllData, REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadAllData]);

  // Aggiorna anche quando cambia il giorno selezionato o la weatherMap
  useEffect(() => {
    if (!loadingAll) {
      loadAllData();
    }
  }, [selectedDay]);

  if (loadingAll && Object.keys(liveData).length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 md:p-4">
        <h2 className="text-sm md:text-base font-bold text-white mb-2 md:mb-3">
          Decolli ({decolli.length})
        </h2>
        <div className="text-xs md:text-sm text-slate-400 flex items-center gap-2 justify-center py-8">
          <div className="w-5 h-5 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          <span>Caricamento in corso...</span>
        </div>
      </div>
    );
  }

  const dt = getDateTime(selectedDay);

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 md:p-4">
      <h2 className="text-sm md:text-base font-bold text-white mb-2 md:mb-3">
        Decolli ({decolli.length})
      </h2>

      <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 mb-2 md:mb-3 bg-slate-800/60 rounded-lg px-2.5 py-1.5 border border-slate-700/40">
        <Clock size={12} />
        <span className="font-medium">{dt.date}</span>
        <span className="text-slate-600">·</span>
        <span>aggiornato {dt.ora}</span>
      </div>

      <div className="space-y-2 max-h-64 md:max-h-80 overflow-y-auto pr-1 scrollbar-thin">
        {decolli.map((item) => {
          const isSelected = item.nome === selectedId;
          const current = liveData[item.nome];
          const hasData = current != null;
          const temp = hasData ? Math.round(current.temp) : null;
          const wind = hasData ? Math.round(current.wind) : null;
          const gust = hasData ? (current.gust != null ? Math.round(current.gust) : null) : null;
          const dir = hasData ? Math.round(current.dir) : null;
          const code = hasData ? current.code : null;
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
              key={item.nome}
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
                        {gust != null && gust > 0 && (
                          <span className="text-[10px] text-red-300 font-normal">
                            raf. {gust}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-300 font-bold">
                        {dirArrow} {dirLabel}
                      </span>
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
                  <span className="italic">caricamento...</span>
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