"use client";

import React, { useState, useEffect } from "react";
import { Thermometer, Wind, ArrowUp, Gauge, TrendingUp, Loader2, AlertCircle } from "lucide-react";

interface ProfiloVentoVerticaleProps {
  siteAlt: number;
  siteName?: string;
  lat?: number;
  lon?: number;
}

interface LivelloVento {
  height: number;
  speed: number;
  dir: number;
}

// Standard levels we want from Open-Meteo (in meters)
const LIVELLI: { height: number; speedKey: string; dirKey: string }[] = [
  { height: 10, speedKey: "wind_speed_10m", dirKey: "wind_direction_10m" },
  { height: 80, speedKey: "wind_speed_80m", dirKey: "wind_direction_80m" },
  { height: 120, speedKey: "wind_speed_120m", dirKey: "wind_direction_120m" },
  { height: 180, speedKey: "wind_speed_180m", dirKey: "wind_direction_180m" },
  { height: 300, speedKey: "wind_speed_300m", dirKey: "wind_direction_300m" },
  { height: 600, speedKey: "wind_speed_600m", dirKey: "wind_direction_600m" },
  { height: 1000, speedKey: "wind_speed_1000m", dirKey: "wind_direction_1000m" },
  { height: 1500, speedKey: "wind_speed_1500m", dirKey: "wind_direction_1500m" },
  { height: 2000, speedKey: "wind_speed_2000m", dirKey: "wind_direction_2000m" },
  { height: 2500, speedKey: "wind_speed_2500m", dirKey: "wind_direction_2500m" },
  { height: 3000, speedKey: "wind_speed_3000m", dirKey: "wind_direction_3000m" },
];

function getWindArrow(deg: number): string {
  if (deg == null) return "";
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

function getDirAbbrev(deg: number): string {
  if (deg == null) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getSpeedColor(speed: number): string {
  if (speed <= 8) return "text-emerald-400";
  if (speed <= 15) return "text-lime-400";
  if (speed <= 22) return "text-amber-400";
  if (speed <= 30) return "text-orange-400";
  return "text-red-400";
}

function getBarColor(speed: number): string {
  if (speed <= 8) return "bg-emerald-400";
  if (speed <= 15) return "bg-lime-400";
  if (speed <= 22) return "bg-amber-400";
  if (speed <= 30) return "bg-orange-400";
  return "bg-red-400";
}

// Interpolates wind profile for any altitude
function interpolaProfilo(profilo: LivelloVento[], quota: number): { speed: number; dir: number } {
  if (!profilo || profilo.length === 0) return { speed: 0, dir: 0 };

  // Sort by height
  const ordinato = [...profilo].sort((a, b) => a.height - b.height);

  // Below first level
  if (quota <= ordinato[0].height) {
    return { speed: ordinato[0].speed, dir: ordinato[0].dir };
  }

  // Above last level - extrapolate with power law (realistic)
  const ultimo = ordinato[ordinato.length - 1];
  if (quota >= ultimo.height) {
    const alpha = 0.2; // Realistic exponent for troposphere
    const speed = Math.round(ultimo.speed * Math.pow(quota / ultimo.height, alpha));
    return { speed, dir: ultimo.dir };
  }

  // Linear interpolation between two closest levels
  for (let i = 0; i < ordinato.length - 1; i++) {
    const a = ordinato[i];
    const b = ordinato[i + 1];

    if (quota >= a.height && quota <= b.height) {
      const ratio = (quota - a.height) / (b.height - a.height);
      const speed = Math.round(a.speed + ratio * (b.speed - a.speed));

      // Handle wind direction wrapping (e.g. 350° -> 10°)
      let dDiff = b.dir - a.dir;
      if (dDiff > 180) dDiff -= 360;
      if (dDiff < -180) dDiff += 360;
      const dir = ((a.dir + dDiff * ratio) % 360 + 360) % 360;

      return { speed, dir };
    }
  }

  return { speed: 0, dir: 0 };
}

export default function ProfiloVentoVerticale({ siteAlt, siteName, lat, lon }: ProfiloVentoVerticaleProps) {
  const [profiloReale, setProfiloReale] = useState<LivelloVento[]>([]);
  const [loadingApi, setLoadingApi] = useState(true);
  const [errorApi, setErrorApi] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lon) {
      setLoadingApi(false);
      setErrorApi("Coordinate non disponibili");
      return;
    }

    let attivo = true;
    setLoadingApi(true);
    setErrorApi(null);

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: LIVELLI.flatMap(l => [l.speedKey, l.dirKey]).join(","),
      timezone: "Europe/Rome",
      forecast_days: "1",
    });

    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (!attivo) return;
        const times: string[] = json.hourly?.time || [];
        // Find 13:00 UTC (peak heating) or use first available
        let idx = times.findIndex(t => new Date(t + "Z").getHours() === 13);
        if (idx === -1) idx = 0;

        const livelli: LivelloVento[] = LIVELLI
          .map(l => ({
            height: l.height,
            speed: Math.round(Number(json.hourly?.[l.speedKey]?.[idx]) || 0),
            dir: Math.round(Number(json.hourly?.[l.dirKey]?.[idx]) || 0),
          }))
          .filter(l => l.speed >= 0); // Allow 0 wind

        setProfiloReale(livelli);
        setLoadingApi(false);
      })
      .catch(err => {
        if (!attivo) return;
        setErrorApi(err instanceof Error ? err.message : "Errore caricamento dati");
        setLoadingApi(false);
      });

    return () => {
      attivo = false;
    };
  }, [lat, lon]);

  if (loadingApi) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
        Caricamento profilo vento reale...
      </div>
    );
  }

  if (errorApi || profiloReale.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <AlertCircle className="w-5 h-5 mr-2 text-amber-400" />
        {errorApi || "Nessun dato vento disponibile"}
      </div>
    );
  }

  // Calculate values for display
  const maxSpeed = Math.max(...profiloReale.map(l => l.speed), 1);
  const ventoDecollo = profiloReale.find(l => l.height <= siteAlt + 50) || profiloReale[0];
  const ventoQuota = profiloReale[profiloReale.length - 1];

  // Generate altitude steps for table (from site altitude to 3000m)
  const quote: number[] = [];
  const partenza = Math.floor(siteAlt / 250) * 250;
  for (let q = partenza; q <= 3000; q += 250) quote.push(q);
  if (!quote.includes(siteAlt)) {
    quote.push(siteAlt);
    quote.sort((a, b) => a - b);
  }

  const righe = quote.map(q => {
    const { speed, dir } = interpolaProfilo(profiloReale, q);
    // Temperature lapse rate: 0.98°C/100m (dry adiabatic)
    const tempDelta = ((q - siteAlt) / 100) * 0.98;
    const temp = Math.round((15 - tempDelta) * 10) / 10; // Assuming 15°C at sea level for simplicity
    
    return { quota: q, temp, speed, dir };
  });

  // Get interpretation text
  const getInterpretazione = () => {
    const windShear = ventoQuota.speed - ventoDecollo.speed;
    if (windShear < 5) return "Vento quasi costante con quota - Eccellente per termiche stabili e prevedibili";
    if (windShear < 15) return "Vento aumenta moderatamente con quota - Buone termiche, possibile leggera turbolenza in quota";
    return "Vento aumenta significativamente con quota - Possibile turbolenza moderata, termiche irregolari";
  };

  return (
    <div className="space-y-4">
      {/* Data source badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold bg-emerald-900/15 border-emerald-500/30 text-emerald-300">
        <Wind className="w-4 h-4" />
        Profilo vento REALE da Open-Meteo ({profiloReale.length} livelli: 10m–3000m)
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            Gradiente termico
          </div>
          <div className="text-base font-bold text-white">0.98°C/100m</div>
          <div className="text-[10px] text-slate-400">Adiabatico secco</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Thermometer className="w-3 h-3 text-amber-400" />
            Temp. superficie
          </div>
          <div className="text-base font-bold text-amber-300">15°C</div>
          <div className="text-[10px] text-slate-400">Stima standard</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ArrowUp className="w-3 h-3 text-cyan-400" />
            Vento al suolo
          </div>
          <div className="text-base font-bold text-cyan-300">{ventoDecollo.speed} km/h</div>
          <div className="text-[10px] text-slate-400">
            da {getDirAbbrev(ventoDecollo.dir)} ({ventoDecollo.dir}°)
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Gauge className="w-3 h-3 text-purple-400" />
            Vento a 3000m
          </div>
          <div className="text-base font-bold text-purple-300">{ventoQuota.speed} km/h</div>
          <div className="text-[10px] text-slate-400">
            da {getDirAbbrev(ventoQuota.dir)} ({ventoQuota.dir}°)
          </div>
        </div>
      </div>

      {/* Vertical profile table */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/30">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">Profilo verticale · {siteName || "Decollo"}</span>
          <span className="text-[10px] text-slate-500 ml-auto">
            {siteAlt}m → 3000m (dati reali interpolati)
          </span>
        </div>
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-900/90 z-10">
              <tr className="border-b border-slate-700/30 text-slate-500">
                <th className="p-2 text-left w-14">Quota</th>
                <th className="p-2 text-left w-20">Temp</th>
                <th className="p-2 text-left">Vento</th>
                <th className="p-2 text-left w-16">Dir</th>
                <th className="p-2 text-left w-16">°</th>
              </tr>
            </thead>
            <tbody>
              {righe.map(r => {
                const isDecollo = Math.abs(r.quota - siteAlt) < 100;
                return (
                  <tr key={r.quota} className={`border-b border-slate-700/20 transition-colors hover:bg-slate-700/30 ${isDecollo ? "bg-emerald-900/20" : ""}`}>
                    <td className="p-2 font-mono font-bold text-white whitespace-nowrap">
                      {r.quota}m{isDecollo && <span className="text-[8px] text-emerald-400 ml-1">🪂</span>}
                    </td>
                    <td className={`p-2 font-mono whitespace-nowrap ${r.temp > 15 ? "text-amber-300" : r.temp > 5 ? "text-yellow-300" : "text-cyan-300"}`}>
                      {r.temp}°C
                    </td>
                    <td className="p-2 flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${getBarColor(r.speed)}`} style={{ width: `${Math.min((r.speed / maxSpeed) * 100, 100)}%` }}></div>
                      <span className="font-mono text-white">{r.speed} km/h</span>
                    </td>
                    <td className="p-2 text-center text-white">{getDirAbbrev(r.dir)}</td>
                    <td className="p-2 text-center text-white">{r.dir}°</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interpretation */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="text-slate-500">Interpretazione volo</div>
        </div>
        <div className="text-white font-bold mt-0.5">
          {getInterpretazione()}
        </div>
      </div>
    </div>
  );
}