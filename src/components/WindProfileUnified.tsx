"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  fetchRealWindData,
  calcolaProfiloVento,
  degTo16Dir,
  dir16ToDeg,
  type WindAlgorithmResult,
  type WindLevel,
} from "@/utils/windAlgorithm";

function getSpeedColor(speed: number): string {
  if (speed <= 8) return "bg-emerald-400/60";
  if (speed <= 15) return "bg-amber-400/60";
  if (speed <= 22) return "bg-orange-400/60";
  if (speed <= 30) return "bg-red-400/60";
  return "bg-red-500/70";
}

function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

const WindProfileUnified: React.FC<{
  lat: number;
  lon: number;
  quotaDecollo?: number;
  siteName?: string;
}> = ({ lat, lon, quotaDecollo = 1740, siteName = "Malanotte" }) => {
  const [result, setResult] = useState<WindAlgorithmResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { livelliReali, warning } = await fetchRealWindData(lat, lon, quotaDecollo);

    if (warning) {
      setResult({
        profilo: [],
        warning,
        datiReali: [],
        gradienteMedio: 0,
        direzioneMedia: "N",
      });
      setLoading(false);
      return;
    }

    const algoritmo = calcolaProfiloVento(livelliReali, quotaDecollo);
    setResult(algoritmo);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30 * 60 * 1000); // ogni 30 minuti
    return () => clearInterval(interval);
  }, [lat, lon, quotaDecollo]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-800/50 text-slate-400 text-sm">
        <div className="w-5 h-5 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
        ⏳ Calcolo profilo vento reale per {siteName}...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-800/50 text-slate-400 text-sm">
        <span>Nessun dato vento disponibile.</span>
      </div>
    );
  }

  const { profilo, warning, datiReali, gradienteMedio, direzioneMedia } = result;
  const showWarning = warning != null;

  // Determina se limitare graficamente le barre
  const hasExtremeSpeed = profilo.some((p) => p.vento > 50);
  const hasBigJump = profilo.some((p, i) => {
    if (i === 0) return false;
    return Math.abs(p.vento - profilo[i - 1].vento) > 20;
  });
  const needsCap = hasExtremeSpeed || hasBigJump;

  const maxSpeed = Math.max(...profilo.map((p) => p.vento), 1);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
      {/* Dati reali usati */}
      {datiReali.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
          <span className="font-bold text-slate-300">Dati reali:</span>
          {datiReali.map((l) => (
            <span
              key={l.quota}
              className="bg-slate-800/60 px-1.5 py-0.5 rounded"
            >
              {l.quota}m: {Math.round(l.speed)}km/h {getDirArrow(l.dir)}
              {degTo16Dir(l.dir)}
            </span>
          ))}
        </div>
      )}

      {/* Warning */}
      {showWarning && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-900/30 border border-yellow-500/30 text-yellow-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      {/* Profilo verticale (barre orizzontali per quota) */}
      {profilo.length > 0 && (
        <>
          <div className="flex flex-col gap-1">
            {profilo.map((p) => {
              const displaySpeed = needsCap
                ? Math.min(p.vento, 40)
                : p.vento;
              const width = Math.min(
                (displaySpeed / Math.max(maxSpeed, 40)) * 100,
                100
              );
              return (
                <div
                  key={p.quota}
                  className="flex items-center gap-2 text-sm"
                >
                  {/* Quota */}
                  <span className="w-12 shrink-0 text-right text-xs font-bold text-slate-400 tabular-nums">
                    {p.quota}m
                  </span>

                  {/* Barra velocità */}
                  <div className="flex-1 h-3 bg-slate-700/50 rounded-md overflow-hidden">
                    <div
                      className={`h-full rounded-md transition-all ${getSpeedColor(
                        p.vento
                      )}`}
                      style={{ width: `${Math.max(width, 6)}%` }}
                    >
                      {width > 30 && (
                        <span className="text-[9px] text-white font-bold pl-1 leading-3 block">
                          {p.vento}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valore e direzione */}
                  <span className="w-16 shrink-0 text-left text-[10px] font-bold text-slate-300 tabular-nums">
                    {p.vento} km/h {getDirArrow(dir16ToDeg(p.direzione))}{" "}
                    {p.direzione}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Avviso di cap */}
          {needsCap && (
            <div className="text-[9px] text-orange-400 text-center mt-1">
              ⚠️ Barre limitate a 40 km/h — dati potenzialmente non realistici
            </div>
          )}

          {/* Legenda */}
          <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400 justify-center mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400/60" />{" "}
              ≤8
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400/60" /> 9-15
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400/60" /> 16-22
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400/60" /> 23-30
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500/70" /> ≥30
            </span>
            <span className="text-slate-600 ml-auto">km/h</span>
          </div>
        </>
      )}

      <div className="text-[9px] text-slate-600 text-center mt-1">
        Algoritmo basato su dati reali Open-Meteo (10m, 80m, 120m, 180m) · gradiente {(gradienteMedio * 100).toFixed(2)} km/h/100m · direzione media {direzioneMedia}
      </div>
    </div>
  );
};

export default WindProfileUnified;