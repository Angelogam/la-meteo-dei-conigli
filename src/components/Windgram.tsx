"use client";

import React, { useMemo } from "react";
import type { MeteoHourly } from "@/services/weatherService";
import { calcolaTermiche } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";

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
  return DIR_NAMES[((rounded % 360)<dyad-write path="src/components/Windgram.tsx" description="Completing the Windgram fix">
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

function stimaVento(hd: MeteoHourly, quota: number): { speed: number; dir: number } | null {
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

export default function Windgram({ hourlyData, site, selectedHour, onHourSelect }: WindgramProps) {
  const oggi = new Date();
  const oggiStr = oggi.toDateString();

  const oreOggi = useMemo(() => {
    return hourlyData.filter(h => h.time.toDateString() === oggiStr);
  }, [hourlyData, oggiStr]);

  const hd = useMemo(() => {
    return oreOggi.find(h => h.time.getHours() === selectedHour) || null;
  }, [oreOggi, selectedHour]);

  const quote = useMemo(() => generaQuote(site.alt), [site.alt]);

  const righe = useMemo(() => {
    if (!hd) return [];
    const ris: { q: number; speed: number; dir: number }[] = [];
    for (const q of quote) {
      const stimato = stimaVento(hd, q);
      if (stimato && stimato.speed > 0) {
        ris.push({ q, speed: stimato.speed, dir: stimato.dir });
      }
    }
    return ris.sort((a, b) => b.q - a.q);
  }, [hd, quote]);

  if (!hd || righe.length === 0) return null;

  return (
    <div className="text-xs text-slate-400">
      Riga {righe[0].q}m — {righe[0].speed} km/h — {dirArrow(righe[0].dir)} {dirName(righe[0].dir)}
    </div>
  );
}