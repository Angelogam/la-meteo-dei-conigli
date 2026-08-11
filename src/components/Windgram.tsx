"use client";

import React, { useEffect, useState } from "react";
import { Wind, TrendingUp, MapPin } from "lucide-react";
import { generateWindgramFull } from "@/utils/windgram";

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16] || "N";
}

function getSpeedBarColor(speed: number): string {
  if (speed <= 8) return "bg-emerald-400";
  if (speed <= 15) return "bg-lime-400";
  if (speed <= 22) return "bg-amber-400";
  if (speed <= 30) return "bg-orange-400";
  return "bg-red-400";
}

interface WindgramProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  siteName?: string;
  selectedDay?: number;
}

export default function Windgram({
  lat,
  lon,
  quotaDecollo,
  siteName,
  selectedDay = 0,
}: WindgramProps) {
  const [windgramData, setWindgramData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lon || !quotaDecollo) return;

    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    const dayStr = targetDate.toISOString().split("T")[0];

    setLoading(true);
    setError(null);

    generateWindgramFull(lat, lon, quotaDecollo, dayStr)
      .then((result) => {
        setWindgramData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Errore");
        setLoading(false);
      });
  }, [lat, lon, quotaDecollo, selectedDay]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <div className="w-6 h-6 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Caricamento windgram...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Wind className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm font-bold">Errore windgram</p>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!windgramData || windgramData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Wind className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm font-bold">Nessun dato windgram disponibile</p>
      </div>
    );
  }

  const maxSpeed = Math.max(...windgramData.map((e) => e.speed), 1);

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
        <h3 className="text-base font-bold text-white">
          Windgram {siteName ? `· ${siteName}` : ""}
        </h3>
        <MapPin className="w-4 h-4 text-slate-500 ml-auto" />
        <span className="text-xs text-slate-400">{quotaDecollo}m</span>
      </div>

      <div className="space-y-1">
        {windgramData.map((entry) => {
          const wPerc = Math.max(6, (entry.speed / Math.max(maxSpeed, 1)) * 100);
          return (
            <div key={entry.quota} className="grid grid-cols-[3.5rem_1fr_5rem] gap-2 items-center py-0.5">
              <span className="text-xs font-mono text-slate-500 text-right">{entry.quota}m</span>
              <div
                className="h-4 bg-slate-800/50 rounded-full overflow-hidden"
                style={{ width: `${wPerc}%` }}
              />
              <div className="flex items-center gap-1 text-xs font-mono text-slate-300">
                <span>{entry.speed}</span>
                <span className="text-slate-500">km/h</span>
                <span className="text-slate-600">{getDirAbbrev(entry.dir)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-3">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
          ≤8
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-lime-400" />
          9-15
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
          16-22
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-400" />
          23-30
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
          over 30
        </span>
      </div>
    </div>
  );
}