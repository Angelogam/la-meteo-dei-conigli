"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, Calendar, MapPin, TrendingUp, Info } from "lucide-react";
import { getVentiInterpolati, type VentiInterpolatiData } from "@/utils/getVentiInterpolati";
import WindgramProfessionale from "./WindgramProfessionale";

function getSpeedColor(speed: number): string {
  if (speed <= 8) return "text-emerald-300";
  if (speed <= 15) return "text-lime-300";
  if (speed <= 22) return "text-amber-300";
  if (speed <= 30) return "text-orange-300";
  return "text-red-400";
}

function getSpeedBarColor(speed: number): string {
  if (speed <= 8) return "bg-emerald-400";
  if (speed <= 15) return "bg-lime-400";
  if (speed <= 22) return "bg-amber-400";
  if (speed <= 30) return "bg-orange-400";
  return "bg-red-400";
}

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16];
}

function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return `${giorni[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface VentiInterpolatiTabProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  oraCorrente?: number;
  onOraChange?: (ora: number) => void;
  siteName?: string;
}

const QUOTE_GRAFICO = [500, 1000, 1500, 2000, 2500, 3000];

export default function VentiInterpolatiTab({ lat, lon, quotaDecollo, selectedDay, oraCorrente = 12, onOraChange, siteName }: VentiInterpolatiTabProps) {
  const [data, setData] = useState<VentiInterpolatiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oraSelezionata, setOraSelezionata] = useState(oraCorrente);
  const [mostraDettaglio, setMostraDettaglio] = useState(false);

  useEffect(() => {
    if (!lat || !lon || !quotaDecollo) return;
    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    const dayStr = targetDate.toISOString().split("T")[0];

    setLoading(true);
    setError(null);

    getVentiInterpolati(lat, lon, quotaDecollo, dayStr)
      .then(result => {
        setData(result);
        setLoading(false);
        if (result.ventoOrario.length > 0) {
          const closest = result.ventoOrario.reduce((prev, curr) =>
            Math.abs(curr.ora - oraCorrente) < Math.abs(prev.ora - oraCorrente) ? curr : prev
          );
          setOraSelezionata(closest.ora);
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "Errore");
        setLoading(false);
      });
  }, [lat, lon, quotaDecollo, selectedDay, oraCorrente]);

  const oggi = new Date();
  const targetDate = new Date(oggi);
  targetDate.setDate(oggi.getDate() + selectedDay);
  const dataGiorno = formatDateShort(targetDate);

  const oraData = useMemo(() => {
    if (!data) return null;
    return data.ventoOrario.find(v => v.ora === oraSelezionata) || data.ventoOrario[0] || null;
  }, [data, oraSelezionata]);

  const quoteVisibili = useMemo(() => {
    if (!oraData) return [];
    const partenza = Math.floor(quotaDecollo / 250) * 250;
    const quote: { quota: number; speed: number; dir: number }[] = [];
    for (let q = partenza; q <= 4000; q += 250) {
      if (oraData.quote[q]) {
        quote.push({ quota: q, speed: oraData.quote[q].speed, dir: oraData.quote[q].dir });
      }
    }
    if (!quote.find(q => Math.abs(q.quota - quotaDecollo) < 100)) {
      const closest = Object.entries(oraData.quote)
        .map(([q, v]) => ({ quota: parseInt(q), ...v }))
        .sort((a, b) => Math.abs(a.quota - quotaDecollo) - Math.abs(b.quota - quotaDecollo))[0];
      if (closest) quote.push(closest);
    }
    return quote.sort((a, b) => a.quota - b.quota);
  }, [oraData, quotaDecollo]);

  const maxSpeed = useMemo(() => Math.max(...quoteVisibili.map(q => q.speed), ...(data?.ventoOrario.map(v => v.gust) || []), 1), [quoteVisibili, data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Calcolo venti per {siteName || "decollo"}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Errore venti</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || data.ventoOrario.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento per {siteName || "decollo"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Intestazione */}
      <div className="bg-slate-800/60 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{siteName || "Decollo"} — Venti in quota</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>Decollo {quotaDecollo}m</span>
          </div>
        </div>
      </div>

      {/* ⭐ NOVITÀ: Windgram Professionale */}
      <WindgramProfessionale
        dati={data.ventoOrario}
        quotaDecollo={quotaDecollo}
        siteName={siteName}
        dataGiorno={dataGiorno}
        oraSelezionata={oraSelezionata}
        onOraChange={(ora) => {
          setOraSelezionata(ora);
          onOraChange?.(ora);
        }}
      />

      {/* Selettore ore compatto (per mobile) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin md:hidden">
        {data.ventoOrario.map(v => (
          <button
            key={v.ora}
            onClick={() => {
              setOraSelezionata(v.ora);
              onOraChange?.(v.ora);
            }}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              v.ora === oraSelezionata
                ? "bg-blue-600/30 border-blue-400/50 text-blue-200"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/40"
            }`}
          >
            {String(v.ora).padStart(2, "0")}:00
          </button>
        ))}
      </div>

      {/* Tabella riepilogo orario — collassabile su mobile */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setMostraDettaglio(!mostraDettaglio)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors"
        >
          <span>Riepilogo orario vento al decollo ({quotaDecollo}m)</span>
          <span className="text-slate-500">{mostraDettaglio ? "−" : "+"}</span>
        </button>

        {mostraDettaglio && (
          <div className="divide-y divide-slate-700/20">
            {data.ventoOrario.map(v => {
              const ventoDecollo = v.quote[quotaDecollo] || v.quote[Object.keys(v.quote)[0]] || { speed: 0, dir: 0 };
              const isSelected = v.ora === oraSelezionata;
              return (
                <button
                  key={v.ora}
                  onClick={() => {
                    setOraSelezionata(v.ora);
                    onOraChange?.(v.ora);
                  }}
                  className={`w-full grid grid-cols-[3rem_1fr_4.5rem_3.5rem] gap-2 px-4 py-2 text-xs transition-all text-left ${
                    isSelected ? "bg-blue-900/20" : "hover:bg-slate-700/30"
                  }`}
                >
                  <span className={`font-bold font-mono ${isSelected ? "text-blue-300" : "text-slate-300"}`}>
                    {String(v.ora).padStart(2, "0")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getSpeedBarColor(ventoDecollo.speed)}`}
                        style={{ width: `${Math.min(100, (ventoDecollo.speed / 40) * 100)}%` }}
                      />
                    </div>
                    <span className={`font-mono tabular-nums ${getSpeedColor(ventoDecollo.speed)}`}>
                      {Math.round(ventoDecollo.speed)}
                    </span>
                  </div>
                  <span className="text-slate-300 text-center font-mono">
                    <span className="font-bold">{getDirAbbrev(ventoDecollo.dir)}</span>
                    <span className="text-slate-500 ml-0.5">{Math.round(ventoDecollo.dir)}°</span>
                  </span>
                  <span className="text-slate-500 text-right font-mono">
                    {Math.round(v.gust)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-2 bg-slate-800/20 rounded-lg px-3 py-2 border border-slate-700/30">
        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Dati interpolati dai livelli standard di Open-Meteo (10m, 925hPa, 850hPa, 700hPa, 600hPa). 
          I venti in quota possono variare localmente a causa dell'orografia.
        </p>
      </div>
    </div>
  );
}