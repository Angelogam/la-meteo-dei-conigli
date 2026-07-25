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

  return (
    <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl overflow-hidden">
      {/* Titolo finestra */}
      <div className="px-4 pt-4 pb-0">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Windgram · Dati meteo
        </h3>
      </div>

      {/* Selettore ore - ancora più compatto */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 pt-1.5 bg-slate-800/30 border-b border-slate-700/30">
        {ORE.map(ora => {
          const isActive = ora === selectedHour;
          const haDatiOra = oreOggi.some(h => h.time.getHours() === ora);
          return (
            <button
              key={ora}
              onClick={() => onHourSelect(ora)}
              disabled={!haDatiOra}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide transition-all border ${
                isActive
                  ? "bg-emerald-600/30 border-emerald-400/60 text-emerald-200 shadow-sm scale-105"
                  : haDatiOra
                  ? "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700/40"
                  : "bg-slate-800/20 border-slate-700/20 text-slate-600 cursor-not-allowed"
              }`}
            >
              {String(ora).padStart(2, "0")}:00
            </button>
          );
        })}
      </div>

      {/* Info bar - ancora più compatta */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-1.5 bg-slate-800/20 text-xs text-slate-300 border-b border-slate-700/20">
        <span className="font-bold text-white">{site.name}</span>
        <span className="text-slate-600">·</span>
        <span>{String(selectedHour).padStart(2, "0")}:00</span>
        <span className="text-slate-600">·</span>
        <span>Decollo {site.alt}m</span>
        <span className="text-slate-600">·</span>
        <span>Suolo: <strong>{hd?.windSpeed ?? "?"}</strong> km/h <strong>{hd ? dirName(hd.windDir) : "?"}</strong></span>
        {termiche && termiche.rateo > 0 && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-amber-300 font-semibold">↑ {termiche.rateo.toFixed(1)} m/s</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-300 font-semibold">Base {termiche.base}m</span>
            <span className="text-slate-600">·</span>
            <span className="text-orange-300 font-semibold">Top {termiche.top}m</span>
          </>
        )}
      </div>

      {!haDati ? (
        <div className="p-10 text-center">
          <p className="text-slate-400 text-lg">Nessun dato vento disponibile per le {String(selectedHour).padStart(2, "0")}:00</p>
          <p className="text-sm text-slate-600 mt-3">Seleziona un'altra ora o attendi l'aggiornamento.</p>
        </div>
      ) : (
        <>
          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-t border-slate-700/30 bg-slate-800/20 text-xs text-slate-500">
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
                <span className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                <span className="text-slate-300 text-xs">{l.label} km/h</span>
              </span>
            ))}
            <span className="text-slate-600 ml-auto text-xs">Open-Meteo · Decollo {site.alt}m</span>
          </div>
        </>
      )}
    </div>
  );
}