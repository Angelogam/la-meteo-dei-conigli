"use client";

import React, { useMemo, useEffect, useState } from "react";
import type { HourData } from "@/types/meteo";
import { Mountain, Wind } from "lucide-react";

interface WindgramMatrixProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
  selectedDay?: number;
  dateLabel?: string;
}

// Ore mostrate nel grafico (estese 8:00 - 19:00)
const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/**
 * Mappa i livelli di pressione Open-Meteo (hPa) alle quote reali (m)
 * secondo l'International Standard Atmosphere.
 * Open-Meteo restituisce il vento a questi livelli: 1000/925/850/700/600/500/300 hPa
 */
const PRESSURE_LEVEL_TO_ALT: Record<string, number> = {
  "1000": 110,
  "925": 760,
  "850": 1457,
  "700": 3012,
  "600": 4206,
  "500": 5574,
  "300": 9164,
};

// Colore freccia e numero in base alla velocità (km/h) - scala SoaringMET
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
      <svg width="22" height="16" viewBox="0 0 40 28" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        <path d="M8 20 Q8 12 14 12 Q18 8 24 10 Q30 8 34 14 Q38 18 32 20 L8 20 Z" fill="#1e293b" fillOpacity="1"/>
        <ellipse cx="18" cy="14" rx="6" ry="4" fill="#334155" fillOpacity="1"/>
        <ellipse cx="14" cy="12" rx="4" ry="3" fill="#0f172a" fillOpacity="0.6"/>
      </svg>
      <span className="text-[9px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] bg-black/60 px-1 rounded">
        {cloudCover}%
      </span>
    </div>
  );
}

/**
 * Costruisce i livelli reali di vento per un'ora specifica dai dati Open-Meteo
 * FONTE DATI: https://api.open-meteo.com/v1/forecast
 * Parametri usati: wind_speed_10m, wind_direction_10m + livelli di pressione hPa
 */
function buildRealWindLevels(h: HourData, siteAltitude: number): { alt: number; speed: number; dir: number }[] {
  const levels: { alt: number; speed: number; dir: number }[] = [];

  // 1. Superficie (10m AGL) - quota = altitudine sito
  if (h.windSpeed !== undefined && h.windDir !== undefined &&
      h.windSpeed !== null && h.windDir !== null) {
    levels.push({
      alt: siteAltitude,
      speed: Number(h.windSpeed),
      dir: Number(h.windDir)
    });
  }

  // 2. Livelli di pressione REALI da Open-Meteo (fino a 700 hPa = ~3000m)
  const pressureLevelKeys = [
    { hPa: "1000", alt: 110 },
    { hPa: "925",  alt: 760 },
    { hPa: "850",  alt: 1457 },
    { hPa: "700",  alt: 3012 },
  ];

  for (const pl of pressureLevelKeys) {
    const speed = (h as any)[`windSpeed${pl.hPa}`];
    const dir = (h as any)[`windDir${pl.hPa}`];
    if (speed !== undefined && dir !== undefined &&
        speed !== null && dir !== null &&
        !isNaN(Number(speed)) && !isNaN(Number(dir))) {
      levels.push({
        alt: pl.alt,
        speed: Number(speed),
        dir: Number(dir)
      });
    }
  }

  // 3. Estendi sopra i 3000m con la legge del power law
  // v(z2) = v(z1) * (z2/z1)^0.143 (esponente medio alpino)
  const ground = levels.find(l => l.alt === siteAltitude);
  const ref700 = levels.find(l => Math.abs(l.alt - 3012) < 50);

  if (ground && ref700) {
    // sopra 3000m
    const upperAlts = [3500, 4000];
    for (const alt of upperAlts) {
      // interpola linearmente fra 700hPa e l'ultimo dato (o estrapola)
      const ratio = (alt - 3012) / 1000;
      const speed = ref700.speed * (1 + ratio * 0.15);
      const dir = ref700.dir;
      levels.push({ alt, speed, dir });
    }
  } else if (ground) {
    // fallback: power law dal suolo
    const upperAlts = [3500, 4000];
    for (const alt of upperAlts) {
      const speed = ground.speed * Math.pow(alt / Math.max(1, siteAltitude), 0.143);
      levels.push({ alt, speed, dir: ground.dir });
    }
  }

  // Ordina per quota CRESCENTE e rimuovi duplicati (stessa quota)
  const unique = new Map<number, { alt: number; speed: number; dir: number }>();
  for (const l of levels) {
    if (!unique.has(l.alt)) unique.set(l.alt, l);
  }
  return Array.from(unique.values()).sort((a, b) => a.alt - b.alt);
}

/**
 * Interpola linearmente il vento a una qualsiasi quota intermedia
 * a partire dai livelli reali Open-Meteo.
 */
function interpolateWindAtAltitude(
  targetAlt: number,
  realLevels: { alt: number; speed: number; dir: number }[]
): { speed: number; dir: number } | null {
  if (realLevels.length === 0) return null;
  if (realLevels.length === 1) {
    return { speed: Math.round(realLevels[0].speed), dir: Math.round(realLevels[0].dir) };
  }

  const sorted = [...realLevels].sort((a, b) => a.alt - b.alt);

  // target sotto il primo livello → estrapola dal basso
  if (targetAlt <= sorted[0].alt) {
    return { speed: Math.round(sorted[0].speed), dir: Math.round(sorted[0].dir) };
  }

  // target sopra l'ultimo livello → estrapola leggermente
  if (targetAlt >= sorted[sorted.length - 1].alt) {
    const top = sorted[sorted.length - 1];
    return { speed: Math.round(top.speed), dir: Math.round(top.dir) };
  }

  // Interpolazione lineare fra i due livelli più vicini
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].alt <= targetAlt && sorted[i + 1].alt >= targetAlt) {
      const lower = sorted[i];
      const upper = sorted[i + 1];

      const ratio = (targetAlt - lower.alt) / (upper.alt - lower.alt);
      const speed = lower.speed + ratio * (upper.speed - lower.speed);

      // Interpolazione circolare della direzione (gestisce 359° → 1°)
      let diffDir = upper.dir - lower.dir;
      if (diffDir > 180) diffDir -= 360;
      if (diffDir < -180) diffDir += 360;
      let dir = lower.dir + diffDir * ratio;
      dir = ((dir % 360) + 360) % 360;

      return { speed, dir: Math.round(dir) };
    }
  }

  return { speed: Math.round(sorted[0].speed), dir: Math.round(sorted[0].dir) };
}

export default function WindgramMatrix({
  dayData,
  siteName,
  altitude,
  selectedHour = 13,
  onHourSelect,
  selectedDay = 0,
  dateLabel = "",
}: WindgramMatrixProps) {
  // Mappa ora -> HourData per accesso rapido
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

  // Verifica se abbiamo dati REALI di pressione Open-Meteo per almeno un'ora
  const hasRealPressureData = useMemo(() => {
    const h = hourlyMap.get(12);
    if (!h) return false;
    return !!(
      (h.windSpeed925 !== undefined && h.windSpeed925 !== null) ||
      (h.windSpeed850 !== undefined && h.windSpeed850 !== null) ||
      (h.windSpeed700 !== undefined && h.windSpeed700 !== null)
    );
  }, [hourlyMap]);

  // Quote mostrate nel grafico (step 250m dal decollo a 4000m)
  const baseStep = 250;
  const baseDecolloFloor = Math.floor(altitude / baseStep) * baseStep;
  const maxAlt = 4000;

  const activeAltitudes = useMemo(() => {
    const altitudes: number[] = [];
    for (let alt = maxAlt; alt >= baseDecolloFloor; alt -= baseStep) {
      altitudes.push(alt);
    }
    return altitudes;
  }, [baseDecolloFloor, maxAlt]);

  // Dati termici orari (per la fascia colorata + base cumuli)
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
        const spread = Math.max(1, h.temperature - (h.dewPoint ?? (h.temperature - 8)));
        const lcl = Math.round(altitude + spread * 125);
        data[hr] = {
          top: Math.min(3500, altitude + Math.max(500, spread * 100)),
          base: Math.max(altitude + 100, lcl),
          rateo: Math.max(0.1, spread * 0.15),
          cloudBase: Math.min(lcl, 3500),
          cloudCover: h.cloudCover ?? 30,
        };
      } else {
        data[hr] = {
          top: altitude + 800,
          base: altitude + 200,
          rateo: 0.5,
          cloudBase: altitude + 600,
          cloudCover: 30,
        };
      }
    });
    return data;
  }, [hourlyMap, altitude]);

  // Colore sfondo cella in base alla fascia termica
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

  /**
   * Calcola il vento interpolato per ogni cella (ora, altitudine)
   * FONTE: dati reali Open-Meteo (livelli di pressione) interpolati linearmente.
   * Ogni cella del windgram ottiene così la velocità e direzione del vento
   * specifica per quella quota e quell'ora.
   */
  const windDataByHourAlt = useMemo(() => {
    const result: Record<number, Record<number, { speed: number; dir: number }>> = {};

    DISPLAY_HOURS.forEach((hr) => {
      const h = hourlyMap.get(hr);
      result[hr] = {};

      if (!h) return;

      const realLevels = buildRealWindLevels(h, altitude);
      if (realLevels.length === 0) return;

      activeAltitudes.forEach((alt) => {
        if (alt > 4000) return;
        const interp = interpolateWindAtAltitude(alt, realLevels);
        if (interp) {
          result[hr][alt] = {
            speed: Math.round(interp.speed),
            dir: Math.round(interp.dir),
          };
        }
      });
    });

    return result;
  }, [hourlyMap, activeAltitudes, altitude]);

  // Riga del windgram in cui posizionare la nuvola (base cumuli più vicina)
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

  const dataSourceBadge = hasRealPressureData ? (
    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Dati REALI Open-Meteo (1000/925/850/700 hPa)
    </span>
  ) : null;

  const headerDate = dateLabel || (() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    const giorni = ["DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"];
    const mesi = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];
    return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  })();

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
      <div className="w-full bg-[#f8fafc] text-slate-900 border border-slate-200/80 rounded-[26px] shadow-2xl overflow-hidden font-sans select-none">

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
                <p className="text-sm text-sky-700 font-semibold mt-0.5">{headerDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-sky-100/70 border border-sky-200/80 px-3 py-1.5 rounded-full text-xs font-semibold text-sky-900">
              <Mountain className="w-3.5 h-3.5 text-amber-600" />
              <span>Decollo {altitude}m slm</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mb-2">
            {dataSourceBadge}
          </div>
        </div>

        <div className="overflow-x-auto border-t border-b border-slate-200 bg-white relative">
          {/* RIGA NUVOLE SOPRA L'HEADER - allineata con le colonne ore */}
          <div className="absolute top-0 left-0 right-0 -translate-y-1/2 z-50 pointer-events-none">
            <div className="flex">
              <div className="w-12 flex-shrink-0" />
              {DISPLAY_HOURS.map((hr) => {
                const thermal = hourThermalData[hr];
                if (!thermal) return <div key={hr} className="w-14 flex-shrink-0" />;
                const rowIdx = cloudBaseRow[hr];
                if (rowIdx === undefined || rowIdx < 0 || rowIdx >= activeAltitudes.length) {
                  return <div key={hr} className="w-14 flex-shrink-0" />;
                }
                return (
                  <div key={hr} className="w-14 flex-shrink-0 relative flex justify-center">
                    <CloudIcon cloudCover={thermal.cloudCover} />
                  </div>
                );
              })}
            </div>
          </div>

          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 bg-slate-100/90 font-bold">
                <th className="py-2.5 px-1 text-center w-12 sticky left-0 z-20 bg-slate-100 border-r border-slate-200 text-slate-800 text-[11px]">
                  Quota
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
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{hr}h</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        {(() => {
                          const h = hourlyMap.get(hr);
                          return h ? `${Math.round(h.temperature)}°` : "—";
                        })()}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeAltitudes.map((alt, rowIdx) => {
                const isMajorLevel = alt % 500 === 0;
                const isDecolloLevel = alt === baseDecolloFloor;
                return (
                  <tr key={`tr-${alt}`} className={`border-b border-slate-100 transition-colors ${isMajorLevel ? "font-bold" : ""} ${isDecolloLevel ? "bg-emerald-50" : ""}`}>
                    <td
                      className={`py-1.5 px-1 text-center font-bold sticky left-0 z-10 border-r border-slate-200 text-[11px] tabular-nums whitespace-nowrap ${
                        isMajorLevel
                          ? "bg-slate-100 text-slate-900"
                          : isDecolloLevel
                            ? "bg-emerald-50 text-emerald-900"
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
                              title={w ? `Open-Meteo: ${w.speed} km/h da ${w.dir}°` : "N/D"}
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
            {hasRealPressureData && <p className="text-emerald-600">&bull; Venti REALI da Open-Meteo (interpolati 1000/925/850/700 hPa)</p>}
          </div>
        </div>
      </div>
    </div>
  );
}