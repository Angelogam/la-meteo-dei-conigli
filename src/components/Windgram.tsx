"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";

interface WindgramProps {
  hourlyData: HourData[];
  site: { name: string; alt: number; lat: number; lon: number };
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

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

function generaQuote(alt: number): number[] {
  const partenza = Math.floor(alt / 500) * 500;
  const quote: number[] = [];
  for (let q = partenza; q <= 4000; q += 500) { quote.push(q); }
  return quote;
}

function stimaVento(hd: HourData, quota: number): { speed: number; dir: number } | null {
  const surfaceSpeed = hd.windSpeed;
  const surfaceDir = hd.windDir;
  if (surfaceSpeed > 0) {
    const h = Math.max(quota, 10);
    const speed = Math.round(Math.min(surfaceSpeed * Math.pow(h / 10, 0.143), surfaceSpeed * 1.5) * 10) / 10;
    const rot = Math.round((quota / 250) * 2);
    const dir = ((surfaceDir + rot) % 360 + 360) % 360;
    return { speed: Math.max(speed, 0.5), dir: Math.round(dir) };
  }
  return null;
}

export default function Windgram({ hourlyData, site, selectedHour }: WindgramProps) {
  const oggi = new Date();
  const oggiStr = oggi.toDateString();
  const oreOggi = useMemo(() => hourlyData.filter(h => new Date(h.time).toDateString() === oggiStr), [hourlyData, oggiStr]);
  const hd = useMemo(() => oreOggi.find(h => h.time.getHours() === selectedHour) || null, [oreOggi, selectedHour]);
  const quote = useMemo(() => generaQuote(site.alt), [site.alt]);
  const righe = useMemo(() => {
    if (!hd) return [];
    return quote.map(q => { const s = stimaVento(hd, q); return s ? { q, speed: s.speed, dir: s.dir } : null; }).filter(Boolean) as { q: number; speed: number; dir: number }[];
  }, [hd, quote]);

  if (!hd || righe.length === 0) return null;

  return (
    <div className="text-xs text-slate-400">
      Riga {righe[0].q}m — {righe[0].speed} km/h — {dirArrow(righe[0].dir)} {dirName(righe[0].dir)}
    </div>
  );
}