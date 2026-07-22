"use client";

import React, { useMemo } from "react";
import type { MeteoHourly } from "@/services/weatherService";
import { calcolaTermiche } from "@/utils/termiche";

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

function stimaVento(hd: MeteoHourly, quota: number): { speed: number; dir: number } | null {
  const profilo = hd.windProfile || [];
  const surfaceSpeed = hd.windSpeed;
  const surfaceDir = hd.windDir;

  if (profilo.length > 0) {
    const ordinato = [...profilo].sort((a, b) => a.height - b.height);
    const esatto = ordinato.find(l => Math.abs(l.height - quota) <= 100);
    if (esatto) return { speed: esatto.speed, dir: esatto.dir };
  }

  if (profilo.length >= 2) {
    const ordinato = [...profilo].sort((a, b) => a.height - b.height);
    const sotto = ordinato.filter(l => l.height <= quota).pop();
    const sopra = ordinato.filter(l => l.height >= quota).shift();
    if (sotto && sopra && sotto !== sopra) {
      const ratio = (quota - sotto.height) / (sopra.height - sotto.height);
      const speed = Math.round((sotto.speed + (sopra.speed - sotto.speed) * ratio) * 10) / 10;
      let dDiff = sopra.dir - sotto.dir;
      if (dDiff > 180) dDiff -= 360;
      if (dDiff < -180) dDiff += 360;
      const dir = ((sotto.dir + dDiff * ratio) % 360 + 360) % 360;
      return { speed, dir };
    }
    const ultimo = sotto || sopra || ordinato[ordinato.length - 1];
    if (quota > ultimo.height) {
      const speed = Math.round(Math.min(ultimo.speed * Math.pow(quota / ultimo.height, 0.143), ultimo.speed * 1.4) * 10) / 10;
      return { speed, dir: ultimo.dir };
    }
  }

  if (profilo.length === 1) {
    const p = profilo[0];
    if (quota > p.height) {
      const speed = Math.round(Math.min(p.speed * Math.pow(quota / p.height, 0.143), p.speed * 1.4) * 10) / 10;
      return { speed, dir: p.dir };
    }
    const speed = Math.round(Math.max(p.speed * Math.pow(quota / p.height, 0.143), surfaceSpeed * 0.5) * 10) / 10;
    return { speed, dir: surfaceDir };
  }

  if (surfaceSpeed > 0) {
    const h = Math.max(quota, 10);
    const speed = Math.round(Math.min(surfaceSpeed * Math.pow(h / 10, 0.143), surfaceSpeed * 1.5) * 10) / 10;
    return { speed: Math.max(speed, 0.5), dir: surfaceDir };
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

  const maxSpeed = Math.max(...righe.map(r => r.speed), 5);

  const termiche = hd ? calcolaTermiche(
    {
      time: hd.time, temperature: hd.temperature, humidity: hd.humidity,
      dewPoint: hd.dewPoint, apparentTemp: hd.apparentTemp,
      precipitationProba: hd.precipitationProbability, precipitation: hd.precipitation,
      rain: hd.precipitation > 0 && hd.weatherCode >= 61 && hd.weatherCode <= 67 ? hd.precipitation : 0,
      showers: 0, snowfall: 0, weatherCode: hd.weatherCode,
      pressure: 1013, surfacePressure: 1013, cloudCover: hd.cloudCover,
      cloudCoverLow: 0, cloudCoverMid: 0, cloudCoverHigh: 0,
      evapotranspiration: 0, et0: 0, vapourPressureDeficit: 0,
      windSpeed: hd.windSpeed, windDir: hd.windDir, windGusts: hd.windGusts,
      soilTemp: 0, soilMoisture: 0, uvIndex: hd.uvIndex,
      temp80m: null, temp120m: null,
      shortwaveRadiation: hd.shortwaveRadiation,
      directRadiation: 0, diffuseRadiation: 0, directNormalIrradiance: 0,
      terrestrialRadiation: 0, sunshineDuration: 0,
    },
    site.alt
  ) : null;

  const haDati = hd && righe.length > 0;

  if (!haDati) {
    return null;
  }

  return (
    <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl overflow-hidden">
      {/* GRAFICO - COMPATTO */}
      <div className="p-3">
        {/* Intestazione colonne */}
        <div className="grid grid-cols-[4rem_3.5rem_1.2fr_1.8fr] gap-2 mb-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
          <span>Quota</span>
          <span className="text-center">km/h</span>
          <span>Velocità</span>
          <span>Direzione</span>
        </div>

        <div className="space-y-1">
          {righe.map((r) => {
            const w = Math.max(6, (r.speed / (maxSpeed + 5)) * 240);
            const isDecollo = Math.abs(r.q - site.alt) <= 100;

            return (
              <div
                key={r.q}
                className={`grid grid-cols-[4rem_3.5rem_1.2fr_1.8fr] gap-2 items-center py-1.5 rounded-lg ${
                  isDecollo ? "bg-amber-900/20 -mx-2 px-2 border border-amber-700/30" : ""
                }`}
              >
                {/* Quota */}
                <span className={`text-xs font-mono font-bold ${
                  isDecollo ? "text-amber-400" : "text-slate-400"
                }`}>
                  {r.q} m
                </span>

                {/* Velocità km/h */}
                <div className="flex justify-center">
                  <span className="text-xs font-mono font-bold bg-white text-gray-900 px-2.5 py-1 rounded-md shadow-sm">
                    {r.speed}
                  </span>
                </div>

                {/* Barra velocità */}
                <div className="h-5 bg-slate-800/60 rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{ width: `${w}px`, background: speedColor(r.speed) }}
                  />
                  {isDecollo && (
                    <div className="absolute inset-0 border border-amber-400/50 rounded-md pointer-events-none" />
                  )}
                </div>

                {/* Direzione */}
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-extrabold drop-shadow-lg ${
                    r.speed > 22 ? "text-red-400" : r.speed > 15 ? "text-orange-300" : "text-sky-300"
                  }`}>
                    {dirArrow(r.dir)}
                  </span>
                  <span className={`text-xs font-bold tracking-wider ${
                    r.speed > 22 ? "text-red-400" : r.speed > 15 ? "text-orange-300" : "text-sky-300"
                  }`}>
                    {dirName(r.dir)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}