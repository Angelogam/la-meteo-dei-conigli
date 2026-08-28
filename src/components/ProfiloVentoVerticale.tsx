"use client";

import React, { useState, useMemo } from "react";
import { Wind, Loader2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useWindProfile } from "@/hooks/useWindProfile";

interface ProfiloVentoVerticaleProps {
  siteAlt: number;
  siteName?: string;
  lat?: number;
  lon?: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
  selectedDay?: number;
}

function getWindArrow(deg: number): string {
  const arrows = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
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

/** Genera step di 250m dalla quota decollo (arrotondata giù al multiplo di 250) fino a 4000m */
function buildAltitudes(siteAlt: number): number[] {
  const STEP = 250;
  const MAX_ALT = 4000;
  const base = Math.floor(siteAlt / STEP) * STEP;
  const arr: number[] = [];
  for (let alt = base; alt <= MAX_ALT; alt += STEP) {
    arr.push(alt);
  }
  return arr;
}

/** Calcola shear (km/h ogni 100m) tra due livelli */
function calcShear(higher: { alt: number; speed: number }, lower: { alt: number; speed: number }): number {
  const dAlt = higher.alt - lower.alt;
  if (dAlt <= 0) return 0;
  return Math.abs(higher.speed - lower.speed) / (dAlt / 100);
}

/** Trova il livello reale più vicino in quota */
function findClosestLevel<T extends { alt: number }>(levels: T[], targetAlt: number): T | null {
  if (!levels.length) return null;
  return levels.reduce((best, l) =>
    Math.abs(l.alt - targetAlt) < Math.abs(best.alt - targetAlt) ? l : best
  , levels[0]);
}

/** Trova interpolazione lineare tra due livelli reali (in quota) */
function interpolateBetween(
  lower: { alt: number; speed: number; dir: number; gust?: number },
  upper: { alt: number; speed: number; dir: number; gust?: number },
  targetAlt: number
) {
  const dAlt = upper.alt - lower.alt;
  if (dAlt <= 0) {
    return { speed: lower.speed, dir: lower.dir, gust: lower.gust };
  }
  const ratio = (targetAlt - lower.alt) / dAlt;
  const speed = lower.speed + ratio * (upper.speed - lower.speed);

  // Interpolazione direzione con gestione wrap 0-360
  let diffDir = upper.dir - lower.dir;
  if (diffDir > 180) diffDir -= 360;
  if (diffDir < -180) diffDir += 360;
  let dir = lower.dir + diffDir * ratio;
  dir = ((dir % 360) + 360) % 360;

  const gust =
    lower.gust != null && upper.gust != null
      ? lower.gust + ratio * (upper.gust - lower.gust)
      : lower.gust ?? upper.gust;

  return { speed, dir, gust };
}

/** Dato calcolato per una riga della tabella */
interface RowData {
  alt: number;
  speed: number;
  dir: number;
  gust: number | null;
  source: "real" | "interpolated" | "below-lowest" | "above-highest";
  baseLevel: { alt: number; speed: number; dir: number; gust?: number } | null;
  upperLevel: { alt: number; speed: number; dir: number; gust?: number } | null;
}

export default function ProfiloVentoVerticale({
  siteAlt,
  siteName,
  lat = 44.2587,
  lon = 7.7943,
  selectedHour = 12,
  onHourSelect,
  selectedDay = 0,
}: ProfiloVentoVerticaleProps) {
  // HOOKS FIRST - unconditional
  const { data, loading, error } = useWindProfile({
    lat,
    lon,
    siteAlt,
    selectedHour,
    selectedDay,
  });
  const [expanded, setExpanded] = useState(true);

  // Costruisci step di quote dalla quota decollo (arrotondata al multiplo di 250) fino a 4000m
  const altitudes = useMemo(() => buildAltitudes(siteAlt), [siteAlt]);

  // Genera righe della tabella: per ogni quota, calcola vento (reale o interpolato)
  const rows = useMemo<RowData[]>(() => {
    if (!data?.levels || data.levels.length === 0) return [];

    const sortedLevels = [...data.levels].sort((a, b) => a.alt - b.alt);
    const minAlt = sortedLevels[0].alt;
    const maxAlt = sortedLevels[sortedLevels.length - 1].alt;

    return altitudes.map((targetAlt) => {
      // Caso 1: quota coincide esattamente con un livello reale
      const exact = sortedLevels.find((l) => l.alt === targetAlt);
      if (exact) {
        return {
          alt: targetAlt,
          speed: Math.round(exact.speed),
          dir: Math.round(exact.dir),
          gust: exact.gust != null ? Math.round(exact.gust) : null,
          source: "real" as const,
          baseLevel: null,
          upperLevel: null,
        };
      }

      // Caso 2: targetAlt è SOTTO il livello reale più basso -> usa quel livello
      if (targetAlt < minAlt) {
        const lower = sortedLevels[0];
        return {
          alt: targetAlt,
          speed: Math.round(lower.speed),
          dir: Math.round(lower.dir),
          gust: lower.gust != null ? Math.round(lower.gust) : null,
          source: "below-lowest" as const,
          baseLevel: null,
          upperLevel: null,
        };
      }

      // Caso 3: targetAlt è SOPRA il livello reale più alto -> N/D
      if (targetAlt > maxAlt) {
        return {
          alt: targetAlt,
          speed: 0,
          dir: 0,
          gust: null,
          source: "above-highest" as const,
          baseLevel: null,
          upperLevel: null,
        };
      }

      // Caso 4: interpolazione lineare tra due livelli reali
      const lower = [...sortedLevels].reverse().find((l) => l.alt < targetAlt);
      const upper = sortedLevels.find((l) => l.alt > targetAlt);

      if (lower && upper) {
        const interp = interpolateBetween(lower, upper, targetAlt);
        return {
          alt: targetAlt,
          speed: Math.round(interp.speed),
          dir: Math.round(interp.dir),
          gust: interp.gust != null ? Math.round(interp.gust) : null,
          source: "interpolated" as const,
          baseLevel: lower,
          upperLevel: upper,
        };
      }

      return {
        alt: targetAlt,
        speed: 0,
        dir: 0,
        gust: null,
        source: "above-highest" as const,
        baseLevel: null,
        upperLevel: null,
      };
    });
  }, [data?.levels, altitudes]);

  // EARLY RETURNS AFTER ALL HOOKS
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

  if (error || !data) {
    return (
      <div className="bg-slate-800/40 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error || "Nessun dato vento disponibile"}</span>
        </div>
      </div>
    );
  }

  const { hour, temp, dew, cloud, freeze, cape, cloudBase, levels } = data;

  // Calcola shear su tutte le righe (in ordine di quota crescente)
  const rowsAsc = useMemo(() => [...rows].sort((a, b) => a.alt - b.alt), [rows]);
  const shears = useMemo(() => {
    return rowsAsc.map((row, i) => {
      if (i === 0) return 0;
      return calcShear(row, rowsAsc[i - 1]);
    });
  }, [rowsAsc]);

  // Calcola shear max e gradiente
  let shearMax = 0;
  shears.forEach((s) => {
    if (s > shearMax) shearMax = s;
  });

  let gradienteVento = 0;
  if (levels.length >= 2) {
    const sorted = [...levels].sort((a, b) => a.alt - b.alt);
    let gradTot = 0, coppie = 0;
    for (let i = 1; i < sorted.length; i++) {
      const dq = sorted[i].alt - sorted[i - 1].alt;
      const dv = sorted[i].speed - sorted[i - 1].speed;
      if (dq > 0) {
        gradTot += dv / dq;
        coppie++;
      }
    }
    gradienteVento = coppie > 0 ? gradTot / coppie : 0;
  }

  const windDirSurface = levels[0]?.dir ?? 0;
  const windSpeedSurface = levels[0]?.speed ?? 0;

  // Format quota con etichetta decollo
  const decolloBase = Math.floor(siteAlt / 250) * 250;
  const isDecolloRow = (alt: number) => alt === decolloBase;

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-white">
            Profilo vento verticale {siteName ? ` · ${siteName}` : ""}
          </h4>
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
            {String(hour).padStart(2, "0")}:00
          </span>
          <span className="text-[10px] text-slate-500">
            step 250m · {decolloBase}m → 4000m
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-700/30 pt-3">
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

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/30 text-slate-500">
                  <th className="p-2 text-left">Quota</th>
                  <th className="p-2 text-left">Fonte</th>
                  <th className="p-2 text-left">Vento</th>
                  <th className="p-2 text-left">Dir</th>
                  <th className="p-2 text-left">Raffiche</th>
                  <th className="p-2 text-left">Shear</th>
                </tr>
              </thead>
              <tbody>
                {/* Righe in ordine decrescente di quota: dal top (4000m) al decollo */}
                {[...rowsAsc].reverse().map((row) => {
                  const isDecollo = isDecolloRow(row.alt);
                  // Calcola shear rispetto alla riga sopra (in quota più alta)
                  const idxAsc = rowsAsc.findIndex((r) => r.alt === row.alt);
                  const shear = idxAsc > 0 ? shears[idxAsc] : 0;
                  const sourceLabel =
                    row.source === "real" ? "📍 Open-Meteo" :
                    row.source === "interpolated" ? "🔄 Interp." :
                    row.source === "below-lowest" ? "⬇ Sotto" :
                    "—";
                  const sourceColor =
                    row.source === "real" ? "text-emerald-300" :
                    row.source === "interpolated" ? "text-sky-300" :
                    "text-slate-500";
                  return (
                    <tr
                      key={`row-${row.alt}`}
                      className={`border-b border-slate-700/20 ${isDecollo ? "bg-emerald-900/30 border-l-2 border-l-emerald-400" : ""}`}
                    >
                      <td className="p-2 font-mono font-bold text-white whitespace-nowrap">
                        {row.alt}m{isDecollo && " 🪂"}
                      </td>
                      <td className={`p-2 text-[10px] ${sourceColor}`}>{sourceLabel}</td>
                      <td className="p-2">
                        {row.source === "above-highest" ? (
                          <span className="text-slate-500 text-[10px]">—</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className={getSpeedColor(row.speed)}>{row.speed}</span>
                            <span className="text-slate-500">km/h</span>
                            <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (row.speed / 50) * 100)}%`,
                                  backgroundColor: getSpeedBarColor(row.speed),
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-2 font-mono text-sky-300">
                        {row.source === "above-highest" ? "—" : (
                          <>{getWindArrow(row.dir)} {getDirAbbrev(row.dir)}</>
                        )}
                      </td>
                      <td className="p-2 text-slate-400">
                        {row.gust != null ? `${row.gust} km/h` : "—"}
                      </td>
                      <td className="p-2 text-[10px] text-slate-400">
                        {idxAsc > 0 && row.source !== "above-highest" ? `${shear.toFixed(1)} km/h/100m` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>📍 = dato reale Open-Meteo (10m, 80m, 120m, 180m, 925/850/700/600/500 hPa)</span>
            <span>🔄 = interpolazione lineare tra due livelli reali</span>
            <span>Shear: <span className="text-emerald-300">≤2</span> debole · <span className="text-amber-300">2-5</span> moderato · <span className="text-red-300">≥5</span> forte</span>
          </div>
        </div>
      )}
    </div>
  );
}