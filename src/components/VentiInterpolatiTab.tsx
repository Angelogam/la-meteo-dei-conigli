"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, Calendar, MapPin, TrendingUp } from "lucide-react";
import { getVentiInterpolati, type VentiInterpolatiData } from "@/utils/getVentiInterpolati";
import ProfessionalWindgram from "@/components/ProfessionalWindgram";

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

export default function VentiInterpolatiTab({
  lat,
  lon,
  quotaDecollo,
  selectedDay,
  oraCorrente = 12,
  onOraChange,
  siteName,
}: VentiInterpolatiTabProps) {
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
      .then((result) => {
        setData(result);
        setLoading(false);
        if (result.ventoOrario.length > 0) {
          const closest = result.ventoOrario.reduce((prev, curr) =>
            Math.abs(curr.ora - oraCorrente) < Math.abs(prev.ora - oraCorrente) ? curr : prev
          );
          setOraSelezionata(closest.ora);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Errore");
        setLoading(false);
      });
  }, [lat, lon, quotaDecollo, selectedDay, oraCorrente]);

  const oggi = new Date();
  const targetDate = new Date(oggi);
  targetDate.setDate(oggi.getDate() + selectedDay);
  const dataGiorno = formatDateShort(targetDate);

  // Wave Index: differenza direzione vento al suolo vs 850hPa (~1450m)
  const waveIndex = useMemo(() => {
    if (!data || data.ventoOrario.length === 0) return null;
    const ref = data.ventoOrario.find(v => v.ora === oraSelezionata) || data.ventoOrario[0];
    if (!ref) return null;
    const dir10 = ref.quote?.[quotaDecollo]?.dir ?? ref.quote?.[quotaDecollo + 10]?.dir ?? 0;
    const dir850 = ref.quote?.[1450]?.dir ?? 0;
    if (dir10 === 0 && dir850 === 0) return null;
    const diff = Math.abs(dir850 - dir10);
    const normalized = diff > 180 ? 360 - diff : diff;
    return { diff: Math.round(normalized), level: normalized < 30 ? "forte" : normalized < 60 ? "medio" : normalized < 90 ? "debole" : "assente" as const };
  }, [data, oraSelezionata, quotaDecollo]);

  const oraData = useMemo(() => {
    if (!data) return null;
    return data.ventoOrario.find((v) => v.ora === oraSelezionata) || data.ventoOrario[0] || null;
  }, [data, oraSelezionata]);

  const quoteVisibili = useMemo(() => {
    if (!oraData) return [];

    const quote: { quota: number; speed: number; dir: number }[] = [];
    const partenza = Math.floor(quotaDecollo / 250) * 250;
    for (let q = partenza; q <= 4000; q += 250) {
      if (oraData.quote[q]) {
        quote.push({ quota: q, speed: oraData.quote[q].speed, dir: oraData.quote[q].dir });
      }
    }

    if (!quote.find((q) => Math.abs(q.quota - quotaDecollo) < 100)) {
      const closest = Object.entries(oraData.quote)
        .map(([q, v]) => ({ quota: parseInt(q), ...v }))
        .sort((a, b) => Math.abs(a.quota - quotaDecollo) - Math.abs(b.quota - quotaDecollo))[0];
      if (closest) quote.push(closest);
    }

    return quote.sort((a, b) => a.quota - b.quota);
  }, [oraData, quotaDecollo]);

  const maxSpeed = useMemo(() => Math.max(...quoteVisibili.map((q) => q.speed), 1), [quoteVisibili]);

  return (
    <div className="space-y-6">
      {/* Windgram Professionale integrato con dati reali */}
      <ProfessionalWindgram
        latitude={lat}
        longitude={lon}
        altitude={quotaDecollo}
        siteName={siteName}
        selectedDay={selectedDay}
      />

      <div className="bg-slate-800/60 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{siteName || "Decollo"} — Venti in quota dettagliati</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>Decollo {quotaDecollo}m</span>
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Wind className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-xs text-slate-400">Wave Index</span>
            </div>
            {waveIndex ? (
              <span className={`text-sm font-bold tabular-nums ${
                waveIndex.level === "forte" ? "text-violet-300" :
                waveIndex.level === "medio" ? "text-sky-300" :
                waveIndex.level === "debole" ? "text-amber-300" : "text-slate-500"
              }`}>
                {waveIndex.diff}°{" "}
                <span className="text-[10px] font-normal opacity-70">
                  {waveIndex.level === "forte" ? "Onda forte ✓" :
                   waveIndex.level === "medio" ? "Onda presente" :
                   waveIndex.level === "debole" ? "Onda debole" : "No onda"}
                </span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">—</span>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {data.ventoOrario.map((v) => (
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

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Profilo verticale · {String(oraSelezionata).padStart(2, "0")}:00
              </h4>
              <span className="text-[10px] text-slate-500 ml-auto">{quotaDecollo}m → 4000m · step 250m</span>
            </div>

            <div className="space-y-1">
              {quoteVisibili.map((q) => {
                const pct = Math.max(6, (q.speed / maxSpeed) * 100);
                const isDecollo = Math.abs(q.quota - quotaDecollo) < 150;
                return (
                  <div key={q.quota} className="grid grid-cols-[3.5rem_1fr_4.5rem] gap-2 items-center">
                    <span className="text-[10px] md:text-xs font-mono text-slate-500 text-right">
                      {q.quota}m
                      {isDecollo && <span className="text-emerald-400 ml-0.5">🪂</span>}
                    </span>
                    <div className="h-4 md:h-5 bg-slate-800/60 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full ${getSpeedBarColor(q.speed)} transition-all`}
                        style={{ width: `${pct}%` }}
                      >
                        <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] md:text-[10px] text-white font-bold">
                          {q.speed >= 15 && Math.round(q.speed)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] md:text-xs font-mono">
                      <span className={getSpeedColor(q.speed)}>{Math.round(q.speed)}</span>
                      <span className="text-slate-500">km/h</span>
                      <span className="text-slate-400">{getDirArrow(q.dir)}{getDirAbbrev(q.dir)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}