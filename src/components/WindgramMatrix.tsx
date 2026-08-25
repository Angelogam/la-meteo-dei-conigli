"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { Mountain, Wind } from "lucide-react";
import { calcolaTermiche } from "@/utils/termiche";

interface WindgramMatrixProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
}

// Ore mostrate nel grafico (estese 8:00 - 19:00)
const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

// Livelli di pressione reali Open-Meteo con quota approssimativa standard
const PRESSURE_LEVELS = [
  { hpa: 1000, alt: 100,   label: "1000 hPa" },
  { hpa: 925,  alt: 750,  label: "925 hPa" },
  { hpa: 850,  alt: 1450, label: "850 hPa" },
  { hpa: 700,  alt: 3100, label: "700 hPa" },
  { hpa: 500,  alt: 5600, label: "500 hPa" },
];

// Colore freccia e numero in base alla velocità (km/h) identico a SoaringMET
function getWindArrowColor(speed: number): { fill: string; stroke: string; text: string } {
  if (speed <= 4) return { fill: "#0284c7", stroke: "#0369a1", text: "#0284c7" };
  if (speed <= 8) return { fill: "#0d9488", stroke: "#0f766e", text: "#0d9488" };
  if (speed <= 13) return { fill: "#16a34a", stroke: "#15803d", text: "#16a34a" };
  if (speed <= 18) return { fill: "#65a30d", stroke: "#4d7c0f", text: "#65a30d" };
  if (speed <= 24) return { fill: "#eab308", stroke: "#ca8a04", text: "#ca8a04" };
  if (speed <= 30) return { fill: "#f97316", stroke: "#ea580c", text: "#ea580c" };
  if (speed <= 42) return { fill: "#dc2626", stroke: "#b91c1c", text: "#dc2626" };
  if (speed <= 58) return { fill: "#991b1b", stroke: "#7f1d1d", text: "#991b1b" };
  return { fill: "#86198f", stroke: "#701a75", text: "#86198f" };
}

// Freccia sagomata identica al windgram originale
function WindArrowIcon({ deg, color }: { deg: number; color: { fill: string; stroke: string } }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className="shrink-0"
      style={{ transform: `rotate(${deg}deg)` }}
    >
      <path
        d="M12 2L17 10H13.5V22H10.5V10H7L12 2Z"
        fill={color.fill}
        stroke={color.stroke}
        strokeWidth="1"
      />
    </svg>
  );
}

// Icona nuvola cumulo con percentuale
function CloudIcon({ cloudCover }: { cloudCover: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="20" height="14" viewBox="0 0 40 28" className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
        <path d="M8 20 Q8 12 14 12 Q18 8 24 10 Q30 8 34 14 Q38 18 32 20 L8 20 Z" fill="currentColor" fillOpacity="0.95"/>
        <ellipse cx="18" cy="14" rx="6" ry="4" fill="currentColor" fillOpacity="0.7"/>
      </svg>
      <span className="text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        {cloudCover}%
      </span>
    </div>
  );
}

// Interpolazione lineare tra due livelli
function interpolateWind(
  alt: number,
  lower: { alt: number; speed: number; dir: number } | null,
  upper: { alt: number; speed: number; dir: number } | null
): { speed: number; dir: number } | null {
  if (!lower && !upper) return null;
  if (!lower) return { speed: Math.round(upper!.speed), dir: Math.round(upper!.dir) };
  if (!upper) return { speed: Math.round(lower.speed), dir: Math.round(lower.dir) };
  
  const ratio = (alt - lower.alt) / (upper.alt - lower.alt);
  const speed = lower.speed + ratio * (upper.speed - lower.speed);
  
  let diffDir = upper.dir - lower.dir;
  if (diffDir > 180) diffDir -= 360;
  if (diffDir < -180) diffDir += 360;
  const dir = ((lower.dir + diffDir * ratio) % 360 + 360) % 360;
  
  return { speed: Math.round(speed), dir: Math.round(dir) };
}

export default function WindgramMatrix({
  dayData,
  siteName,
  altitude,
  selectedHour = 13,
  onHourSelect,
}: WindgramMatrixProps) {
  // Mappa dati orari da Open-Meteo
  const hourlyMap = useMemo(() => {
    const map = new Map<number, HourData>();
    if (dayData && dayData.length > 0) {
      dayData.forEach((h) => {
        const d = new Date(h.time);
        map.set(d.getHours(), h);
      });
    }
    return map;
  }, [dayData]);

  // Verifica se abbiamo dati reali ai livelli di pressione
  const hasRealPressureData = useMemo(() => {
    const h = hourlyMap.get(12);
    if (!h) return false;
    return !!(
      h.windSpeed925 !== undefined && h.windDir925 !== undefined ||
      h.windSpeed850 !== undefined && h.windDir850 !== undefined ||
      h.windSpeed700 !== undefined && h.windDir700 !== undefined ||
      h.windSpeed500 !== undefined && h.windDir500 !== undefined
    );
  }, [hourlyMap]);

  // STEP 250m - Quota base decollo arrotondata per difetto
  const baseStep = 250;
  const baseDecolloFloor = Math.floor(altitude / baseStep) * baseStep;
  const maxAlt = 4000; // MAX 4000m per visualizzazione

  // Quote attive: dalla quota decollo arrotondata fino a 4000m (invertite: 4000 in alto, decollo in basso)
  const activeAltitudes = useMemo(() => {
    const altitudes: number[] = [];
    for (let alt = maxAlt; alt >= baseDecolloFloor; alt -= baseStep) {
      altitudes.push(alt);
    }
    return altitudes;
  }, [baseDecolloFloor, maxAlt]);

  // Calcolo convezione / profilo termico per ogni ora + BASE CUMULI (LCL)
  const hourThermalData = useMemo(() => {
    const data: Record<number, { 
      top: number; 
      base: number; 
      rateo: number;
      cloudBase: number;
      cloudCover: number;
    }> = {};
    DISPLAY_HOURS.forEach((hr) => {
      const h = hourlyMap.get(hr);
      if (h) {
        const t = calcolaTermiche(h, altitude);
        const spread = Math.max(1, h.temperature - (h.dewPoint ?? (h.temperature - 8)));
        const lcl = Math.round(altitude + spread * 125);
        data[hr] = {
          top: t.top,
          base: t.base,
          rateo: t.rateo,
          cloudBase: Math.min(lcl, 3500),
          cloudCover: h.cloudCover ?? 30,
        };
      } else {
        const temp = 16 + (hr >= 12 && hr <= 15 ? 7 : hr >= 11 && hr <= 17 ? 4 : 1);
        const dew = temp - 8;
        const spread = Math.max(1, temp - dew);
        const base = Math.max(altitude, Math.round(altitude + spread * 85));
        const lcl = Math.round(altitude + spread * 125);
        const bellFactor = Math.max(0, 1 - Math.pow((hr - 14) / 4, 2));
        const top = Math.min(3500, Math.round(base + bellFactor * 1100));
        const rateo = Math.max(0.3, bellFactor * 2.4);
        data[hr] = {
          top,
          base,
          rateo,
          cloudBase: Math.min(lcl, 3500),
          cloudCover: 30,
        };
      }
    });
    return data;
  }, [hourlyMap, altitude]);

  // Calcolo colore di sfondo della cella (campana termica SoaringMET)
  const getThermalBgColor = (alt: number, hr: number): string => {
    const thermal = hourThermalData[hr];
    if (!thermal) return "transparent";

    if (alt >= altitude && alt <= thermal.top) {
      const totalSpan = Math.max(200, thermal.top - altitude);
      const relHeight = (alt - altitude) / totalSpan;
      const hrBell = Math.max(0, 1 - Math.pow((hr - 14) / 4.2, 2));
      const strength = (1 - relHeight * 0.75) * (0.4 + hrBell * 0.6);

      if (strength > 0.72) return "#f97316";
      if (strength > 0.55) return "#fb923c";
      if (strength > 0.40) return "#fbbf24";
      if (strength > 0.22) return "#fde047";
      return "#fef08a";
    }

    if (hr <= 10 && alt >= 1400 && alt <= 2200) {
      return "#f1f5f9";
    }
    return "transparent";
  };

  // Costruisce i dati vento REALI per ogni ora e quota (interpolati dai livelli di pressione)
  const windDataByHourAlt = useMemo(() => {
    const result: Record<number, Record<number, { speed: number; dir: number }>> = {};
    
    DISPLAY_HOURS.forEach((hr) => {
      const h = hourlyMap.get(hr);
      result[hr] = {};
      
      if (!h) return;

      // Raccolta livelli reali disponibili per quest'ora
      const realLevels: { alt: number; speed: number; dir: number }[] = [];
      
      // Superficie (10m)
      if (h.windSpeed !== undefined && h.windDir !== undefined) {
        realLevels.push({ alt: Math.max(0, altitude - 50), speed: h.windSpeed, dir: h.windDir });
      }
      
      // Livelli di pressione reali Open-Meteo
      if (h.windSpeed925 !== undefined && h.windDir925 !== undefined) {
        realLevels.push({ alt: 750, speed: h.windSpeed925, dir: h.windDir925 });
      }
      if (h.windSpeed850 !== undefined && h.windDir850 !== undefined) {
        realLevels.push({ alt: 1450, speed: h.windSpeed850, dir: h.windDir850 });
      }
      if (h.windSpeed700 !== undefined && h.windDir700 !== undefined) {
        realLevels.push({ alt: 3100, speed: h.windSpeed700, dir: h.windDir700 });
      }
      if (h.windSpeed500 !== undefined && h.windDir500 !== undefined) {
        realLevels.push({ alt: 5600, speed: h.windSpeed500, dir: h.windDir500 });
      }
      
      // Ordina per quota
      realLevels.sort((a, b) => a.alt - b.alt);
      
      if (realLevels.length === 0) return;
      
      // Interpola per ogni quota attiva
      activeAltitudes.forEach((alt) => {
        if (alt > 4000) return; // Non mostriamo sopra 4000m
        
        const interp = interpolateWindAtAltitude(alt, realLevels);
        if (interp) {
          result[hr][alt] = interp;
        }
      });
    });
    
    return result;
  }, [hourlyMap, activeAltitudes, altitude]);

  // Funzione helper per interpolazione
  function interpolateWindAtAltitude(
    targetAlt: number,
    levels: { alt: number; speed: number; dir: number }[]
  ): { speed: number; dir: number } | null {
    if (levels.length === 0) return null;
    if (levels.length === 1) return { speed: Math.round(levels[0].speed), dir: Math.round(levels[0].dir) };
    
    // Trova i due livelli che racchiudono la quota target
    let lower = levels[0];
    let upper = levels[levels.length - 1];
    
    for (let i = 0; i < levels.length - 1; i++) {
      if (levels[i].alt <= targetAlt && levels[i + 1].alt >= targetAlt) {
        lower = levels[i];
        upper = levels[i + 1];
        break;
      }
      if (targetAlt < levels[0].alt) {
        return { speed: Math.round(levels[0].speed), dir: Math.round(levels[0].dir) };
      }
    }
    
    if (targetAlt > levels[levels.length - 1].alt) {
      return { speed: Math.round(levels[levels.length - 1].speed), dir: Math.round(levels[levels.length - 1].dir) };
    }
    
    return interpolateWind(targetAlt, lower, upper);
  }

  // Per ogni ora, trova la riga (quota) più vicina alla cloud base
  const cloudBaseRow = useMemo(() => {
    const map: Record<number, number> = {};
    DISPLAY_HOURS.forEach((hr) => {
      const thermal = hourThermalData[hr];
      if (!thermal) return;
      let bestIdx = 0;
      let bestDiff = Infinity;
      activeAltitudes.forEach((a, idx) => {
        const diff = Math.abs(a - thermal.cloudBase);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = idx;
        }
      });
      map[hr] = bestIdx;
    });
    return map;
  }, [hourThermalData, activeAltitudes]);

  // Badge indicatore fonte dati
  const dataSourceBadge = hasRealPressureData ? (
    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Dati reali Open-Meteo (925/850/700/500 hPa)
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Estrapolato da superficie (mancano livelli pressione)
    </span>
  );

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
      <div className="w-full bg-[#f8fafc] text-slate-900 border border-slate-200/80 rounded-[26px] shadow-2xl overflow-hidden font-sans select-none">
        
        {/* Header */}
        <div className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-100 text-sky-600">
                <Wind className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Windgram &mdash; <span className="text-sky-600">{siteName}</span>
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-sky-100/70 border border-sky-200/80 px-3 py-1.5 rounded-full text-xs font-semibold text-sky-900">
              <Mountain className="w-3.5 h-3.5 text-amber-600" />
              <span>Decollo {altitude}m slm</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mb-2">
            {dataSourceBadge}
            
            {/* Legenda Vento */}
            <div className="flex items-center gap-2 text-[11px] overflow-x-auto pb-1 font-sans shrink-0">
              <div className="text-slate-500 font-bold uppercase text-[10px] leading-tight shrink-0 mr-1">
                VENTO<br />(KM/H):
              </div>
              <div className="flex gap-1.5 shrink-0">
                <div className="px-2 py-1 rounded bg-[#d3f9d8] text-[#0ca678] font-bold text-center leading-none">1-<br />8</div>
                <div className="px-2 py-1 rounded bg-[#e9fac8] text-[#66a80f] font-bold text-center leading-none">9-<br />14</div>
                <div className="px-2 py-1 rounded bg-[#fef3c7] text-[#d97706] font-bold text-center leading-none">15-<br />20</div>
                <div className="px-2 py-1 rounded bg-[#ffedd5] text-[#ea580c] font-bold text-center leading-none">21-<br />28</div>
                <div className="px-2 py-1 rounded bg-[#fee2e2] text-[#dc2626] font-bold text-center leading-none">29-<br />40</div>
                <div className="px-2 py-1 rounded bg-[#ede9fe] text-[#7c3aed] font-bold text-center leading-none">{">"}<br />40</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabella Windgram - Quote a SINISTRA, 4000m in alto, decollo in basso */}
        <div className="overflow-x-auto border-t border-b border-slate-200 bg-white relative">
          {/* RIGA NUVOLE SOPRA L'HEADER - nuvole alla base cumuli per ogni ora */}
          <div className="absolute top-0 left-0 right-0 -translate-y-1/2 z-50 pointer-events-none">
            <div className="flex overflow-x-auto">
              <div className="w-16 flex-shrink-0" /> {/* Spazio colonna quote */}
              {DISPLAY_HOURS.map((hr) => {
                const thermal = hourThermalData[hr];
                if (!thermal) return <div key={hr} className="w-14 flex-shrink-0" />;
                const rowIdx = cloudBaseRow[hr];
                if (rowIdx === undefined || rowIdx < 0 || rowIdx >= activeAltitudes.length) {
                  return <div key={hr} className="w-14 flex-shrink-0" />;
                }
                return (
                  <div key={hr} className="w-14 flex-shrink-0 relative">
                    <CloudIcon cloudCover={thermal.cloudCover} />
                  </div>
                );
              })}
            </div>
          </div>

          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 bg-slate-100/90 font-bold">
                <th className="py-2.5 px-3 text-left w-16 sticky left-0 z-20 bg-slate-100 border-r border-slate-200 text-slate-800">
                  Quota (m)
                </th>
                {DISPLAY_HOURS.map((hr) => (
                  <th
                    key={`th-${hr}`}
                    onClick={() => onHourSelect?.(hr)}
                    className={`py-2.5 px-2 font-bold cursor-pointer transition-colors border-r border-slate-200/60 ${
                      hr === selectedHour
                        ? "bg-sky-100 text-sky-900 ring-1 ring-sky-400"
                        : "hover:bg-slate-200/60 text-slate-800"
                    }`}
                  >
                    {hr}h
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeAltitudes.map((alt, rowIdx) => {
                const isMajorLevel = alt % 500 === 0;
                return (
                  <tr key={`tr-${alt}`} className={`border-b border-slate-100 transition-colors ${isMajorLevel ? "font-bold" : ""}`}>
                    {/* Colonna quota a SINISTRA */}
                    <td
                      className={`py-1.5 px-3 text-left font-bold sticky left-0 z-10 border-r border-slate-200 text-[11px] ${
                        isMajorLevel
                          ? "bg-slate-100 text-slate-900"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {alt}
                    </td>
                    {DISPLAY_HOURS.map((hr) => {
                      const w = windDataByHourAlt[hr]?.[alt];
                      const wColor = w ? getWindArrowColor(w.speed) : { fill: "#94a3b8", stroke: "#64748b", text: "#94a3b8" };
                      const isSelectedCol = hr === selectedHour;
                      const bgColor = getThermalBgColor(alt, hr);
                      const showCloud = cloudBaseRow[hr] === rowIdx;

                      return (
                        <td
                          key={`cell-${alt}-${hr}`}
                          onClick={() => onHourSelect?.(hr)}
                          style={{ backgroundColor: bgColor }}
                          className={`py-1.5 px-1 border-r border-slate-200/60 cursor-pointer transition-colors relative ${
                            isSelectedCol ? "ring-1 ring-sky-400/90" : "hover:brightness-95"
                          }`}
                        >
                          {showCloud && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 z-20 pointer-events-none">
                              <CloudIcon cloudCover={hourThermalData[hr]?.cloudCover ?? 30} />
                            </div>
                          )}
                          <div className="flex items-center justify-center gap-0.5">
                            {w && <WindArrowIcon deg={w.dir} color={wColor} />}
                            <span
                              className="font-bold text-[12px] tabular-nums tracking-tighter"
                              style={{ color: wColor.text }}
                            >
                              {w ? w.speed : "—"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legenda inferiore */}
        <div className="p-4 sm:p-5 pt-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3.5 rounded bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 border border-orange-400/60" />
              <span className="font-medium text-slate-700">Fascia termica (intensità e dissolvenza)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#fde68a] border border-amber-400" />
              <span className="font-medium text-slate-700">Livello Decollo ({altitude}m)</span>
            </div>
            <div className="flex items-center gap-2">
              <CloudIcon cloudCover={50} />
              <span className="font-medium text-slate-700">Base cumuli + % nuvolosità</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
            <p>&bull; Freccia: direzione vento &bull; Numero: velocità in km/h</p>
            <p>&bull; Clicca un'ora per selezionarla</p>
            <p>&bull; Nuvoletta = base cumuli (LCL) con copertura %</p>
            {hasRealPressureData && <p className="text-emerald-600">&bull; Venti REALI da Open-Meteo (interpolati 925/850/700/500 hPa)</p>}
          </div>
        </div>
      </div>
    </div>
  );
}