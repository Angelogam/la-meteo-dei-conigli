"use client";

import React, { useEffect, useState } from "react";
import { Wind, TrendingUp, Server, Mountain } from "lucide-react";
import { getVentiInterpolati, type VentiInterpolatiData } from "@/utils/getVentiInterpolati";

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

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

interface VentiInterpolatiTabProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  oraCorrente?: number;
  onOraChange?: (ora: number) => void;
}

export default function VentiInterpolatiTab({ lat, lon, quotaDecollo, selectedDay, oraCorrente = 12, onOraChange }: VentiInterpolatiTabProps) {
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
        // Seleziona ora più vicina a quella corrente
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Calcolo profilo vento interpolato...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Errore nel recupero dati vento</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || data.ventoOrario.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento per questo giorno</p>
      </div>
    );
  }

  // Dati per l'ora selezionata
  const oraData = data.ventoOrario.find(v => v.ora === oraSelezionata) || data.ventoOrario[0];
  const quoteKeys = Object.keys(oraData.quote).map(Number);
  const maxSpeed = Math.max(...quoteKeys.map(q => oraData.quote[q].speed), 1);

  // Genera le quote da visualizzare (dalla quota decollo a 4000m)
  const quoteVisibili: number[] = [];
  for (let q = data.quotaDecollo; q <= 4000; q += 250) {
    quoteVisibili.push(q);
  }

  return (
    <div className="space-y-4">
      {/* Intestazione */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-emerald-900/15 border-emerald-500/30">
          <Server className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-bold text-emerald-300">Open-Meteo · {data.giorno}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Mountain className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-400">Decollo {data.quotaDecollo}m</span>
        </div>
      </div>

      {/* Selezione ora */}
      <div className="flex flex-wrap gap-1.5">
        {data.ventoOrario.map(v => (
          <button
            key={v.ora}
            onClick={() => { setOraSelezionata(v.ora); onOraChange?.(v.ora); }}
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

      {/* Profilo verticale a barre orizzontali */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Wind className="w-5 h-5 text-cyan-400" />
          <h4 className="text-base font-bold text-cyan-300">
            Profilo vento verticale · {String(oraSelezionata).padStart(2, "0")}:00
          </h4>
          <span className="text-xs text-slate-500 ml-auto">Raffica {Math.round(oraData.gust)} km/h</span>
        </div>

        <div className="space-y-1.5">
          {quoteVisibili.slice().reverse().map((q) => {
            const v = oraData.quote[q];
            if (!v) return null;
            const width = maxSpeed > 0 ? (v.speed / maxSpeed) * 100 : 0;
            const isDecollo = q === data.quotaDecollo;
            return (
              <div key={q} className={`grid grid-cols-[80px_1fr_100px] gap-2 items-center py-1 ${
                isDecollo ? "bg-amber-900/20 rounded-lg px-1 -mx-1" : ""
              }`}>
                <span className={`text-xs font-mono font-bold ${
                  isDecollo ? "text-amber-300" : "text-slate-400"
                }`}>
                  {q}m {isDecollo ? "🪂" : ""}
                </span>
                <div className="h-6 bg-slate-700/60 rounded-full overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-full ${getSpeedBarColor(v.speed)} transition-all`}
                    style={{ width: `${Math.max(width, 8)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold ${getSpeedColor(v.speed)}`}>
                    {v.speed} km/h
                  </span>
                  <span className="text-slate-400">
                    {getWindArrow(v.dir)} {getWindDirName(v.dir)} ({v.dir}°)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda colori velocità */}
      <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400" /> &le;8</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-lime-400" /> 9-15</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400" /> 16-22</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400" /> 23-30</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400" /> >30</span>
      </div>

      <div className="text-center text-sm text-slate-500 border-t border-slate-700/30 pt-3">
        Dati interpolati ogni 250m da Open-Meteo · Livelli: decollo, 925hPa (760m), 850hPa (1450m), 700hPa (3000m), 600hPa (4000m)
      </div>
    </div>
  );
}