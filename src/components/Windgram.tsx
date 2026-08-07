"use client";

import React, { useMemo } from "react";
import type { MeteoHourly } from "@/services/weatherService";

interface WindgramProps {
  hourlyData: MeteoHourly[];
  site: { name: string; alt: number; lat: number; lon: number };
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

const ORE = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const DIR_NAMES: Record<number, string> = {
  0: "N", 45: "NE", 90: "E", 135: "SE",
  180: "S", 225: "SW", 270: "W", 315: "NW",
};

function dirName(deg: number): string {
  const rounded = Math.round(deg / 45) * 45;
  return DIR_NAMES[((rounded % 360) + 360) % 360] || "N";
}

function dirArrow(deg: number): string {
  const arr = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arr[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function speedColor(speed: number): string {
  if (speed <= 5) return "#10b981";
  if (speed <= 10) return "#84cc16";
  if (speed <= 15) return "#eab308";
  if (speed <= 22) return "#f97316";
  if (speed <= 30) return "#ef4444";
  return "#dc2626";
}

function generaQuote(alt: number): number[] {
  const partenza = Math.floor(alt / 500) * 500;
  const quote: number[] = [];
  for (let q = partenza; q <= 4000; q += 500) {
    quote.push(q);
  }
  return quote;
}

export default function Windgram({ hourlyData, site, selectedHour, onHourSelect }: WindgramProps) {
  const oggi = new Date();
  const oggiStr = oggi.toDateString();

  const oreOggi = useMemo(() => {
    return hourlyData.filter((h) => h.time.toDateString() === oggiStr);
  }, [hourlyData, oggiStr]);

  const hd = useMemo(() => {
    return oreOggi.find((h) => h.time.getHours() === selectedHour) || null;
  }, [oreOggi, selectedHour]);

  const quote = useMemo(() => generaQuote(site.alt), [site.alt]);

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
      <h3 className="text-lg font-bold text-white mb-4">
        Windgram · {site.name}
      </h3>
      <div className="text-sm text-slate-400">
        {hd
          ? `Dati vento per le ${String(selectedHour).padStart(2, "0")}:00`
          : "Nessun dato per l'ora selezionata"}
      </div>
      {quote.map((q) => {
        const speed = hd?.windSpeed ?? 0;
        const dir = hd?.windDir ?? 0;
        return (
          <div key={q} className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-500">{q}m</span>
            <span className="text-xs text-slate-300">
              {dirArrow(dir)} {dirName(dir)} {Math.round(speed)} km/h
            </span>
          </div>
        );
      })}
    </div>
  );
}