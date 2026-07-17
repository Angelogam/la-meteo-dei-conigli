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

const QUOTE_FISSE = [300, 600, 1000, 1500, 2000, 2500, 3000];

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

function speedLabel(speed: number): string {
  if (speed <= 5) return "Calma";
  if (speed <= 10) return "Debole";
  if (speed <= 15) return "Moderato";
  if (speed <= 22) return "Fresco";
  if (speed <= 30) return "Forte";
  return "Burrasca";
}

/** Prende il profilo vento per quest'ora e lo organizza per le quote fisse */
function getWindAtQuota(hd: MeteoHourly, quotaDecollo: number) {
  const result: { q: number; speed: number; dir: number; fonte: string }[] = [];

  // Mappa height -> {speed, dir} dal windProfile
  const profiloMap = new Map<number, { speed: number; dir: number }>();
  if (hd.windProfile) {
    for (const l of hd.windProfile) {
      profiloMap.set(l.height, { speed: l.speed, dir: l.dir });
    }
  }

  // Per ogni quota fissa, cerca il livello più vicino
  for (const q of QUOTE_FISSE) {
    // Cerca diretta
    if (profiloMap.has(q)) {
      const p = profiloMap.get(q)!;
      result.push({ q, speed: p.speed, dir: p.dir, fonte: "reale" });
      continue;
    }

    // Interpola tra i due livelli più vicini
    const heights = [...profiloMap.keys()].sort((a, b) => a - b);
    const sotto = heights.filter(h => h <= q).pop();
    const sopra = heights.filter(h => h >= q).shift();

    if (sotto !== undefined && sopra !== undefined && sotto !== sopra) {
      const ps = profiloMap.get(sotto)!;
      const pp = profiloMap.get(sopra)!;
      const ratio = (q - sotto) / (sopra - sotto);
      const speed = Math.round((ps.speed + (pp.speed - ps.speed) * ratio) * 10) / 10;
      // Interpolazione direzione con attenzione all'avvolgimento
      let dDiff = pp.dir - ps.dir;
      if (dDiff > 180) dDiff -= 360;
      if (dDiff < -180) dDiff += 360;
      const dir = ((ps.dir + dDiff * ratio) % 360 + 360) % 360;
      result.push({ q, speed, dir, fonte: "interp" });
    } else if (sotto !== undefined) {
      const ps = profiloMap.get(sotto)!;
      const ratio = q / sotto;
      const speed = Math.round(ps.speed * ratio * 10) / 10;
      result.push({ q, speed, dir: ps.dir, fonte: "estrap" });
    } else if (sopra !== undefined) {
      const pp = profiloMap.get(sopra)!;
      result.push({ q, speed: pp.speed, dir: pp.dir, fonte: "estrap" });
    }
  }

  return result;
}

export default function Windgram({ hourlyData, site, selectedHour, onHourSelect }: WindgramProps) {
  const oggi = new Date();
  const oggiStr = oggi.toDateString();

  // Trova i dati per oggi
  const oreOggi = useMemo(() => {
    return hourlyData.filter(h => h.time.toDateString() === oggiStr);
  }, [hourlyData, oggiStr]);

  // Dati per l'ora selezionata
  const hd = useMemo(() => {
    return oreOggi.find(h => h.time.getHours() === selectedHour) || null;
  }, [oreOggi, selectedHour]);

  // Profilo vento per l'ora selezionata
  const righe = useMemo(() => {
    if (!hd) return [];
    return getWindAtQuota(hd, site.alt);
  }, [hd, site.alt]);

  // Calcola la massima velocità per la scala
  const maxSpeed = Math.max(...righe.map(r => r.speed), 5);

  // Termiche per l'ora selezionata
  // Converti MeteoHourly in HourData per calcolaTermiche
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
        <p className="text-xs text-slate-600">Seleziona un'altra ora o attendi l'aggiornamento dei dati.</p>
      </div>
    );
  }

  // Scala barra velocità: larghezza max 240px
  const scala = (s: number) => Math.max(4, (s / (maxSpeed + 5)) * 240);

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

      {/* Barra informazioni superiori */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 bg-slate-800/20 text-xs text-slate-300 border-b border-slate-700/20">
        <span className="font-bold text-white text-sm">{site.name}</span>
        <span className="text-slate-500">·</span>
        <span>{String(selectedHour).padStart(2, "0")}:00</span>
        <span className="text-slate-500">·</span>
        <span>Decollo {site.alt}m</span>
        <span className="text-slate-500">·</span>
        <span>Vento suolo: {hd.windSpeed} km/h {dirName(hd.windDir)}</span>
        {termiche && termiche.rateo > 0 && (
          <>
            <span className="text-slate-500">·</span>
            <span className="text-amber-300 font-medium">↑ {termiche.rateo.toFixed(1)} m/s</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-300">Base {termiche.base}m</span>
            <span className="text-slate-500">·</span>
            <span className="text-orange-300">Top {termiche.top}m</span>
          </>
        )}
      </div>

      {/* GRAFICO PRINCIPALE */}
      <div className="p-4">
        {/* Intestazione */}
        <div className="grid grid-cols-[3.5rem_2.5rem_1fr_0.5rem_2rem_1.5fr] gap-1 mb-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider items-end">
          <span>Quota</span>
          <span className="text-right">km/h</span>
          <span>Velocità</span>
          <span />
          <span className="text-center">Dir</span>
          <span>Direzione vento</span>
        </div>

        {/* Righe */}
        <div className="space-y-1">
          {righe.map((r) => {
            const w = scala(r.speed);
            const quotaRelativa = r.q - site.alt;
            const isDecollo = r.q <= site.alt + 100 && r.q >= site.alt - 100;

            return (
              <div
                key={r.q}
                className={`grid grid-cols-[3.5rem_2.5rem_1fr_0.5rem_2rem_1.5fr] gap-1 items-center py-1 rounded ${
                  isDecollo ? "bg-amber-900/15 -mx-2 px-2" : ""
                }`}
              >
                {/* Quota */}
                <span className={`text-xs font-mono font-bold ${
                  isDecollo ? "text-amber-400" : "text-slate-400"
                }`}>
                  {r.q}m
                </span>

                {/* Numero velocità */}
                <span className={`text-xs font-mono font-bold text-right ${
                  r.speed > 22 ? "text-red-400" : r.speed > 15 ? "text-orange-300" : "text-slate-300"
                }`}>
                  {r.speed}
                </span>

                {/* Barra velocità */}
                <div className="h-5 bg-slate-800/60 rounded overflow-hidden relative flex items-center">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${Math.max(w, 4)}px`,
                      background: speedColor(r.speed),
                      opacity: 0.85,
                    }}
                  />
                  {isDecollo && (
                    <div className="absolute inset-0 border border-amber-400/40 rounded pointer-events-none" />
                  )}
                </div>

                {/* Spazio separatore */}
                <div className="w-px h-5 bg-slate-600/30 mx-auto" />

                {/* Freccia direzione */}
                <div className="flex items-center justify-center">
                  <span className={`text-base ${
                    r.speed > 22 ? "text-red-400" : r.speed > 15 ? "text-orange-300" : "text-sky-300"
                  }`}>
                    {dirArrow(r.dir)}
                  </span>
                </div>

                {/* Indicatore direzione + nome */}
                <div className="flex items-center gap-2">
                  {/* Barra direzione */}
                  <div className="flex-1 h-4 bg-slate-800/60 rounded overflow-hidden relative">
                    {/* Riferimenti cardinali */}
                    <div className="absolute inset-0 flex">
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                        <div
                          key={a}
                          className="flex-1 border-r border-slate-700/20 last:border-r-0 flex items-center justify-center text-[7px] text-slate-600"
                        >
                          {dirName(a)}
                        </div>
                      ))}
                    </div>
                    {/* Marker direzione */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]"
                      style={{ left: `${((((r.dir % 360) + 360) % 360) / 360) * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-sky-400/20 border border-sky-400 flex items-center justify-center"
                      style={{ left: `calc(${((((r.dir % 360) + 360) % 360) / 360) * 100}% - 7px)` }}
                    >
                      <span className="text-[7px] font-bold text-sky-200">{dirArrow(r.dir)}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-sky-300 shrink-0 w-8 text-right font-mono">
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
          { label: "≤5", color: "#10b981", desc: "Calma" },
          { label: "6-10", color: "#84cc16", desc: "Debole" },
          { label: "11-15", color: "#eab308", desc: "Moderato" },
          { label: "16-22", color: "#f97316", desc: "Fresco" },
          { label: "23-30", color: "#ef4444", desc: "Forte" },
          { label: ">30", color: "#dc2626", desc: "Burrasca" },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            <span>{l.label}</span>
            <span className="text-slate-600">({l.desc})</span>
          </span>
        ))}
        <span className="text-slate-600 ml-auto">Dati Open-Meteo · km/h · Decollo {site.alt}m</span>
      </div>
    </div>
  );
}
