"use client";

import React, { useEffect, useState } from "react";
import { Wind, TrendingUp, Server } from "lucide-react";
import { getVento, type VentoData } from "@/utils/getVento";
import { interpretaProfiloVento } from "@/utils/windInterpretation";
import InterpretazioneVentoCard from "@/components/InterpretazioneVentoCard";

interface VentiTabProps {
  currentData: any;
  dayData: any[];
  hourlyData?: any[];
  targetHour?: number;
  lat?: number;
  lon?: number;
  selectedDay?: number;
  quotaDecollo?: number;
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

export default function VentiTab({
  currentData, dayData, hourlyData, targetHour = 12, lat, lon, selectedDay = 0, quotaDecollo = 1000
}: VentiTabProps) {
  const [ventoData, setVentoData] = useState<VentoData | null>(null);
  const [loadingVento, setLoadingVento] = useState(false);
  const [errorVento, setErrorVento] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lon) return;

    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    const dayStr = targetDate.toISOString().split("T")[0];

    setLoadingVento(true);
    setErrorVento(null);

    getVento(lat, lon, dayStr)
      .then(data => {
        setVentoData(data);
        setLoadingVento(false);
      })
      .catch(err => {
        setErrorVento(err instanceof Error ? err.message : "Errore nel recupero vento");
        setLoadingVento(false);
      });
  }, [lat, lon, selectedDay]);

  if (loadingVento) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Caricamento dati vento per il giorno selezionato...</span>
      </div>
    );
  }

  if (errorVento) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Errore nel recupero vento</p>
        <p className="text-sm text-slate-500 mt-1">{errorVento}</p>
      </div>
    );
  }

  if (!ventoData || ventoData.ventoOrario.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento per questo giorno</p>
      </div>
    );
  }

  const surfaceSpeed = currentData?.windSpeed ?? ventoData.ventoDecollo ?? 0;
  const surfaceDir = currentData?.windDir ?? 0;
  const maxSpeed = Math.max(...ventoData.ventoOrario.map(v => v.speed), 1);

  const livelliInterpretazione = ventoData.ventoOrario
    .filter(v => v.ora >= 9 && v.ora <= 18)
    .map(v => ({ quota: (v.ora - 8) * 300 + quotaDecollo, speed: v.speed, dir: v.dir }));

  const interpretazione = interpretaProfiloVento(livelliInterpretazione, quotaDecollo);

  const oggi = new Date();
  const targetDate = new Date(oggi);
  targetDate.setDate(oggi.getDate() + selectedDay);
  const dataGiorno = targetDate.toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long"
  });

  return (
    <div className="space-y-4">
      <InterpretazioneVentoCard interpretazione={interpretazione} />

      <div className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold bg-emerald-900/15 border-emerald-500/30 text-emerald-300">
        <Server className="w-4 h-4" />
        Dati reali da Open-Meteo · {dataGiorno} · {ventoData.ventoOrario.length} ore
      </div>

      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
          <Wind className="w-5 h-5" /> Vento orario · {dataGiorno}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {ventoData.ventoOrario.map((v, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-sm text-slate-400 font-bold mb-2">{String(v.ora).padStart(2, "0")}:00</div>
              <div className="text-xl font-bold text-white">{getWindArrow(v.dir)} {Math.round(v.speed)}</div>
              <div className="text-sm text-slate-400">{getWindDirName(v.dir)} ({Math.round(v.dir)}°)</div>
              <div className="text-sm text-red-300 mt-1">Raff. {Math.round(v.gust)}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Intensità vento oraria
        </h4>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-1">
          {ventoData.ventoOrario.map((v, idx) => {
            const width = maxSpeed > 0 ? Math.min(100, (v.speed / maxSpeed) * 100) : 10;
            const barColor = width < 30 ? "bg-emerald-400" : width < 50 ? "bg-lime-400" : width < 70 ? "bg-amber-400" : width < 90 ? "bg-orange-400" : "bg-red-400";
            return (
              <div key={idx} className="grid grid-cols-[60px_1fr_80px_60px] gap-2 items-center py-1.5">
                <span className="text-sm text-slate-300 font-bold">{String(v.ora).padStart(2, "0")}:00</span>
                <div className="h-6 bg-slate-700/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full flex items-center justify-end pr-2 ${barColor}`} style={{ width: `${Math.max(width, 15)}%` }}>
                    <span className="text-xs text-white font-bold">{Math.round(v.speed)}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-300 text-center font-medium">{getWindArrow(v.dir)} {getWindDirName(v.dir)}</span>
                <span className="text-sm text-red-300 text-center font-medium">{Math.round(v.gust)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase font-bold mb-1">Vento decollo (ora 9:00)</div>
          <div className="text-xl font-bold text-white">
            {ventoData.ventoDecollo != null ? `${Math.round(ventoData.ventoDecollo)} km/h` : "N/D"}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase font-bold mb-1">Vento atterraggio (ora 10:00)</div>
          <div className="text-xl font-bold text-white">
            {ventoData.ventoAtterraggio != null ? `${Math.round(ventoData.ventoAtterraggio)} km/h` : "N/D"}
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-slate-500 border-t border-slate-700/30 pt-3">
        Coordinate: {lat?.toFixed(4)}, {lon?.toFixed(4)} · {dataGiorno}
      </div>
    </div>
  );
}