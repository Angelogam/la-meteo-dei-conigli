"use client";

import React, { useEffect, useState } from "react";
import { Wind, Calendar, MapPin } from "lucide-react";
import { getVentiInterpolati, type VentiInterpolatiData, type VentoOrario } from "@/utils/getVentiInterpolati";

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
  return abbrevs[Math.round(deg / 22.5) % 16] || "N";
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
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

export default function VentiInterpolatiTab({ lat, lon, quotaDecollo, selectedDay, oraCorrente = 12, onOraChange, siteName }: VentiInterpolatiTabProps) {
  const [data, setData] = useState<VentiInterpolatiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oraSelezionata, setOraSelezionata] = useState(oraCorrente);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Calcolo profilo vento per {siteName || "decollo"}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Errore venti per {siteName || "decollo"}</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || data.ventoOrario.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento per {siteName || "decollo"} — {dataGiorno}</p>
      </div>
    );
  }

  // Dati dell'ora selezionata
  const oraData = data.ventoOrario.find(v => v.ora === oraSelezionata) || data.ventoOrario[0];

  // Quote visibili nel grafico (da quota decollo a 4000m ogni 250m)
  const quoteVisibili: number[] = [];
  for (let q = data.quotaDecollo; q <= 4000; q += 250) {
    quoteVisibili.push(q);
  }
  const maxSpeed = Math.max(...quoteVisibili.map(q => oraData.quote[q]?.speed || 0), 1);

  return (
    <div className="space-y-3">
      {/* Selezione oraria */}
      <div className="flex flex-wrap gap-1.5">
        {data.ventoOrario.map(v => (
          <button
            key={v.ora}
            onClick={() => {
              setOraSelezionata(v.ora);
              onOraChange?.(v.ora);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              v.ora === oraSelezionata
                ? "bg-emerald-600/30 border-emerald-400/50 text-emerald-200"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/40"
            }`}
          >
            {String(v.ora).padStart(2, "0")}:00
          </button>
        ))}
      </div>

      {/* Grafico vento per tutte le quote — aggiornato all'ora selezionata */}
      <div className="space-y-1">
        {quoteVisibili.map(q => {
          const entry = oraData.quote[q];
          if (!entry) return null;
          const wPerc = Math.max(6, (entry.speed / Math.max(maxSpeed, 1)) * 100);
          return (
            <div key={q} className="grid grid-cols-[3.5rem_1fr_5rem] gap-2 items-center py-0.5">
              <span className="text-xs font-mono text-slate-500 text-right">{q}m</span>
              <div className="h-4 bg-slate-800/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getSpeedBarColor(entry.speed)}`}
                  style={{ width: `${wPerc}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-xs font-mono text-slate-300">
                <span>{entry.speed}</span>
                <span className="text-slate-500">km/h</span>
                <span className="text-slate-600">{getDirAbbrev(entry.dir)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda colori velocità */}
      <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400" /> ≤8</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-lime-400" /> 9-15</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400" /> 16-22</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400" /> 23-30</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400" /> over 30</span>
      </div>
    </div>
  );
}