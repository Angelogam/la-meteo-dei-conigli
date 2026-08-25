with > in JSX text content for shear and gradient legend">
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Wind, Loader2, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Mountain, Cloud, Sun, TrendingUp } from "lucide-react";

interface ProfiloVentoVerticaleProps {
  siteAlt: number;
  siteName?: string;
  lat?: number;
  lon?: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
}

const PRESSURE_LEVELS = [
  { hpa: 500, alt: 5800, label: "500 hPa" },
  { hpa: 550, alt: 5000, label: "550 hPa" },
  { hpa: 600, alt: 4400, label: "600 hPa" },
  { hpa: 650, alt: 3750, label: "650 hPa" },
  { hpa: 700, alt: 3100, label: "700 hPa" },
  { hpa: 750, alt: 2500, label: "750 hPa" },
  { hpa: 800, alt: 1950, label: "800 hPa" },
  { hpa: 850, alt: 1450, label: "850 hPa" },
];

const ALT_TICKS = [6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500];

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16] || "N";
}

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

export default function ProfiloVentoVerticale({ siteAlt, siteName, lat = 44.2587, lon = 7.7943, selectedHour = 12, onHourSelect }: ProfiloVentoVerticaleProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchWindProfile = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,wind_speed_925hPa,wind_direction_925hPa,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_600hPa,wind_direction_600hPa,wind_speed_500hPa,wind_direction_500hPa,temperature_2m,temperature_80m,temperature_120m,cloud_cover,precipitation,freezing_level_height,cape,lifted_index,convective_inhibition&timezone=Europe/Rome&forecast_days=2`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (mounted) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Errore caricamento profilo vento");
          setLoading(false);
        }
      }
    };

    fetchWindProfile();
    return () => { mounted = false; };
  }, [lat, lon]);

  // Estrae i dati per l'ora selezionata
  const hourData = useMemo(() => {
    if (!data?.hourly?.time) return null;
    const times: string[] = data.hourly.time;
    const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === selectedHour);
    if (idx === -1) return null;

    const h = data.hourly;
    const t = h.temperature_2m[idx] ?? 15;
    const dew = h.dew_point_2m?.[idx] ?? (t - 8);
    const cloud = h.cloud_cover?.[idx] ?? 30;
    const precip = h.precipitation?.[idx] ?? 0;
    const freeze = h.freezing_level_height?.[idx] ?? (siteAlt + (t / 0.0098) * 100);
    const cape = h.cape?.[idx] ?? 0;

    // Venti reali per livello
    const levels = [
      { hpa: "surface", alt: siteAlt, speed: h.wind_speed_10m[idx], dir: h.wind_direction_10m[idx], gust: h.wind_gusts_10m[idx] },
      { hpa: "80m", alt: siteAlt + 80, speed: h.wind_speed_80m[idx], dir: h.wind_direction_80m[idx] },
      { hpa: "120m", alt: siteAlt + 120, speed: h.wind_speed_120m[idx], dir: h.wind_direction_120m[idx] },
      { hpa: "180m", alt: siteAlt + 180, speed: h.wind_speed_180m[idx], dir: h.wind_direction_180m[idx] },
      { hpa: "925hPa", alt: 760, speed: h.wind_speed_925hPa[idx], dir: h.wind_direction_925hPa[idx] },
      { hpa: "850hPa", alt: 1450, speed: h.wind_speed_850hPa[idx], dir: h.wind_direction_850hPa[idx] },
      { hpa: "700hPa", alt: 3100, speed: h.wind_speed_700hPa[idx], dir: h.wind_direction_700hPa[idx] },
      { hpa: "600hPa", alt: 4400, speed: h.wind_speed_600hPa[idx], dir: h.wind_direction_600hPa[idx] },
      { hpa: "500hPa", alt: 5800, speed: h.wind_speed_500hPa[idx], dir: h.wind_direction_500hPa[idx] },
    ].filter(l => l.speed != null && !isNaN(l.speed) && l.dir != null && !isNaN(l.dir));

    // Calcola base termica (LCL)
    const spread = Math.max(1, t - dew);
    const cloudBase = Math.round(siteAlt + spread * 125);
    const thermalTop = Math.min(3600, cloudBase + Math.min(700, 1.5 * 220));

    return {
      hour: selectedHour,
      temp: t,
      dew: dew,
      cloud: cloud,
      precip: precip,
      freeze: Math.round(freeze),
      cape: cape,
      levels,
      cloudBase,
      thermalTop,
      spread,
    };
  }, [data, selectedHour, siteAlt]);

  if (loading) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          <span className="text-sm font-bold text-white">Caricamento profilo vento...</span>
        </div>
      </div>
    );
  }

  if (error || !hourData) {
    return (
      <div className="bg-slate-800/40 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error || "Nessun dato vento disponibile"}</span>
        </div>
      </div>
    );
  }

  const { hour, temp, cloud, precip, freeze, cape, levels, cloudBase, thermalTop, spread } = hourData;

  // Calcola shear e gradiente
  let shearMax = 0;
  let gradienteVento = 0;
  if (levels.length >= 2) {
    const sorted = [...levels].sort((a, b) => a.alt - b.alt);
    for (let i = 1; i < sorted.length; i++) {
      const dAlt = sorted[i].alt - sorted[i - 1].alt;
      const dSpeed = Math.abs(sorted[i].speed - sorted[i - 1].speed);
      if (dAlt > 0) {
        const shear = dSpeed / (dAlt / 100);
        if (shear > shearMax) shearMax = shear;
      }
    }
    // Gradiente medio
    let gradTot = 0, coppie = 0;
    for (let i = 1; i < sorted.length; i++) {
      const dq = sorted[i].alt - sorted[i - 1].alt;
      const dv = sorted[i].speed - sorted[i - 1].speed;
      if (dq > 0) { gradTot += dv / dq; coppie++; }
    }
    gradienteVento = coppie > 0 ? gradTot / coppie : 0;
  }

  const windDirSurface = levels[0]?.dir ?? 0;
  const windSpeedSurface = levels[0]?.speed ?? 0;

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-white">
            Profilo vento verticale {siteName ? `· ${siteName}` : ""}
          </h4>
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
            {String(hour).padStart(2, "0")}:00
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-700/30 pt-3">
          {/* Sintesi condizioni */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="text-slate-500">Temp / Dew</div>
              <div className="font-bold text-amber-300">{Math.round(temp)}° / {Math.round(dew)}°C</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="text-slate-500">Vento suolo</div>
              <div className="font-bold text-cyan-300">{Math.round(windSpeedSurface)} km/h {getWindArrow(windDirSurface)} {getDirAbbrev(windDirSurface)}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="text-slate-500">Zero termico</div>
              <div className="font-bold text-sky-300">{freeze}m</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="text-slate-500">Base termiche</div>
              <div className="font-bold text-emerald-300">{cloudBase}m</div>
            </div>
          </div>

          {/* Indicatori shear e gradiente */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-2 py-1 rounded bg-slate-900/50 border ${shearMax > 5 ? "border-red-500/40 text-red-300" : shearMax > 2 ? "border-amber-500/40 text-amber-300" : "border-emerald-500/40 text-emerald-300"}`}>
              Shear max: {shearMax.toFixed(1)} km/h/100m
            </span>
            <span className={`px-2 py-1 rounded bg-slate-900/50 border ${gradienteVento > 0.5 ? "border-amber-500/40 text-amber-300" : "border-emerald-500/40 text-emerald-300"}`}>
              Gradiente: {gradienteVento > 0 ? "+" : ""}{gradienteVento.toFixed(3)} km/h/m
            </span>
            <span className={`px-2 py-1 rounded bg-slate-900/50 border ${cape > 1000 ? "border-red-500/40 text-red-300" : cape > 500 ? "border-amber-500/40 text-amber-300" : "border-emerald-500/40 text-emerald-300"}`}>
              CAPE: {Math.round(cape)} J/kg
            </span>
            <span className={`px-2 py-1 rounded bg-slate-900/50 border ${cloud > 70 ? "border-amber-500/40 text-amber-300" : "border-emerald-500/40 text-emerald-300"}`}>
              Nuvole: {Math.round(cloud)}%
            </span>
          </div>

          {/* Tabella profilo verticale */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/30 text-slate-500">
                  <th className="p-2 text-left">Quota</th>
                  <th className="p-2 text-left">Livello</th>
                  <th className="p-2 text-left">Vento</th>
                  <th className="p-2 text-left">Dir</th>
                  <th className="p-2 text-left">Raffiche</th>
                  <th className="p-2 text-left">Shear</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((l, i) => {
                  const isSurface = i === 0;
                  let shear = 0;
                  if (i > 0) {
                    const dAlt = l.alt - levels[i - 1].alt;
                    const dSpeed = Math.abs(l.speed - levels[i - 1].speed);
                    if (dAlt > 0) shear = dSpeed / (dAlt / 100);
                  }
                  return (
                    <tr key={l.hpa} className={`border-b border-slate-700/20 ${isSurface ? "bg-emerald-900/20" : ""}`}>
                      <td className="p-2 font-mono font-bold text-white">{l.alt}m</td>
                      <td className="p-2 text-slate-400">{l.hpa}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <span className={getSpeedColor(l.speed)} font-bold>{Math.round(l.speed)}</span>
                          <span className="text-slate-500">km/h</span>
                          <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (l.speed / 50) * 100)}%`, backgroundColor: getSpeedBarColor(l.speed) }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-sky-300">{getWindArrow(l.dir)} {getDirAbbrev(l.dir)}</td>
                      <td className="p-2 text-slate-400">{l.gust ? Math.round(l.gust) : "—"} km/h</td>
                      <td className="p-2">{i > 0 ? `${shear.toFixed(1)} km/h/100m` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda shear */}
          <div className="text-[10px] text-slate-500 flex items-center gap-4">
            <span>Shear: <span className="text-emerald-300">≤2</span> debole · <span className="text-amber-300">2-5</span> moderato · <span className="text-red-300">>5</span> forte</span>
            <span>Gradiente: <span className="text-emerald-300">≤0.3</span> omogeneo · <span className="text-amber-300">>0.5</span> marcato</span>
          </div>
        </div>
      )}
    </div>
  );
}