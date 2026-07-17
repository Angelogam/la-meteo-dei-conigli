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

export default function Windgram({ hourlyData, site, selectedHour, onHourSelect }: WindgramProps) {
  const oggi = new Date();
  const oggiStr = oggi.toDateString();

  const oreOggi = useMemo(() => {
    return hourlyData.filter(h => h.time.toDateString() === oggiStr);
  }, [hourlyData, oggiStr]);

  const hd = useMemo(() => {
    return oreOggi.find(h => h.time.getHours() === selectedHour) || null;
  }, [oreOggi, selectedHour]);

  // Usa direttamente il windProfile reale, filtrando quote >= decollo
  const righe = useMemo(() => {
    if (!hd || !hd.windProfile || hd.windProfile.length === 0) return [];
    return hd.windProfile
      .filter(l => l.height >= site.alt - 50 && l.speed > 0)
      .sort((a, b) => a.height - b.height);
  }, [hd, site.alt]);

  const maxSpeed = Math.max(...righe.map(r => r.speed), 5);

  const termiche = hd ? calcolaTermiche(
    {
      time: hd.time,
      temperature: hd.temperature,
      humidity: hd.humidity,
      dewPoint: hd.dewPoint,
      apparentTemp: hd.apparentTemp,
      precipitationProba: hd.precipitationProbability,
      precipitation: hd.precipitation,
      rain: hd.precipitation > 0 && hd.weatherCode >= 61 && hd.weatherCode <= 67 ? hd.precipitation : 0,
      showers: 0, snowfall: 0,
      weatherCode: hd.weatherCode,
      pressure: 1013, surfacePressure: 1013,
      cloudCover: hd.cloudCover,
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

  if (!hd || righe.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-6 text-center">
        <p className="text-slate-400 mb-2">Nessun dato vento in quota per le {String(selectedHour).padStart(2, "0")}:00</p>
        <p className="text-xs text-slate-500 mt-4">Vento al suolo: {hd?.windSpeed ?? "?"} km/h da {hd ? dirName(hd.windDir) : "?"}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl overflow-hidden">
      {/* Selettore ore */}
      <div className="flex gap-1 overflow-x-auto p-3 bg-slate-800/30 border-b border-slate-700/30">
        {ORE.map(ora => {
          const isActive = ora === selectedHour;
          const haDati = oreOggi.some(h => h.time.getHours() === ora);
          return (
            <button
              key={ora}
              onClick={() => onHourSelect(ora)}
              disabled={!haDati}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                isActive
                  ? "bg-emerald-600/30 border-emerald-400/50 text-emerald-200"
                  : haDati
                  ? "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:text-slate-200"
                  : "bg-slate-800/20 border-slate-700/20 text-slate-600 cursor-not-allowed"
              }`}
            >
              {String(ora).padStart(2, "0")}:00
            </button>
          );
        })}
      </div>

      {/* Info bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 bg-slate-800/20 text-xs text-slate-300 border-b border-slate-700/20">
        <span className="font-bold text-white text-sm">{site.name}</span>
        <span className="text-slate-500">·</span>
        <span>{String(selectedHour).padStart(2, "0")}:00</span>
        <span className="text-slate-500">·</span>
        <span>Decollo {site.alt}m</span>
        <span className="text-slate-500">·</span>
        <span>Suolo: {hd.windSpeed} km/h {dirName(hd.windDir)}</span>
        {termiche && termiche.rateo > 0 && (
          <>
            <span className="text-slate-500">·</span>
            <span className="text-amber-300">↑ {termiche.rateo.toFixed(1)} m/s</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-300">Base {termiche.base}m</span>
            <span className="text-slate-500">·</span>
            <span className="text-orange-300">Top {termiche.top}m</span>
          </>
        )}
      </div>

      {/* GRAFICO */}
      <div className="p-4">
        <div className="grid grid-cols-[3.5rem_3rem_1.2fr_1.5fr] gap-2 mb-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <span>Quota</span>
          <span className="text-center">km/h</span>
          <span className="text-center">Velocità</span>
          <span>Direzione</span>
        </div>

        <div className="space-y-1">
          {righe.map((r) => {
            const w = Math.max(4, (r.speed / (maxSpeed + 5)) * 200);
            const isDecollo = Math.abs(r.height - site.alt) <= 100;

            return (
              <div
                key={r.height}
                className={`grid grid-cols-[3.5rem_3rem_1.2fr_1.5fr] gap-2 items-center py-1.5 rounded ${
                  isDecollo ? "bg-amber-900/15 -mx-2 px-2" : ""
                }`}
              >
                {/* Quota */}
                <span className={`text-xs font-mono font-bold ${
                  isDecollo ? "text-amber-400" : "text-slate-400"
                }`}>
                  {r.height}m
                </span>

                {/* Velocità km/h */}
                <div className="flex justify-center">
                  <span className="text-xs font-mono font-bold bg-white text-gray-900 px-2 py-0.5 rounded">
                    {r.speed}
                  </span>
                </div>

                {/* Barra velocità */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-4 bg-slate-800/60 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${w}px`, background: speedColor(r.speed) }}
                    />
                  </div>
                </div>

                {/* Direzione */}
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${
                    r.speed > 22 ? "text-red-400" : r.speed > 15 ? "text-orange-300" : "text-sky-300"
                  }`}>
                    {dirArrow(r.dir)}
                  </span>
                  <span className={`text-sm font-bold ${
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

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 border-t border-slate-700/30 bg-slate-800/20 text-[10px] text-slate-500">
        <span className="text-slate-400 font-bold text-xs">Legenda:</span>
        {[
          { label: "≤5", color: "#10b981" },
          { label: "6-10", color: "#84cc16" },
          { label: "11-15", color: "#eab308" },
          { label: "16-22", color: "#f97316" },
          { label: "23-30", color: "#ef4444" },
          { label: ">30", color: "#dc2626" },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            <span>{l.label} km/h</span>
          </span>
        ))}
        <span className="text-slate-600 ml-auto">Dati reali Open-Meteo · Decollo {site.alt}m</span>
      </div>
    </div>
  );
}
