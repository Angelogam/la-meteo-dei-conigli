"use client";

import React, { useState, useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { Mountain, Wind, Clock, MapPin, Gauge } from "lucide-react";

interface WindgramMatrixProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
}

// Quote da 4000m scendendo fino a 1000m (step 100m o 200m per leggibilità compatta)
const ALTITUDES = [
  4000, 3800, 3600, 3400, 3200, 3000, 2800, 2600, 2400, 2200, 2000, 1800, 1600, 1400, 1200, 1000, 800, 600,
];

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

// Colore freccia e testo in base alla velocità del vento (km/h)
function getWindColor(speed: number): { text: string; bg?: string } {
  if (speed <= 4) return { text: "#2b8a3e" }; // verde scuro
  if (speed <= 8) return { text: "#12b886" }; // verde ciano
  if (speed <= 14) return { text: "#82c91e" }; // verde lime
  if (speed <= 20) return { text: "#fab005" }; // giallo oro
  if (speed <= 28) return { text: "#fd7e14" }; // arancio
  if (speed <= 36) return { text: "#e03131" }; // rosso
  if (speed <= 48) return { text: "#c92a2a" }; // rosso scuro
  if (speed <= 60) return { text: "#862e9c" }; // viola scuro
  return { text: "#5f3dc4" }; // bordeaux / violaceo
}

// Simbolo freccia freccia rotata in base alla direzione di provenienza
function WindArrow({ deg, color }: { deg: number; color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className="shrink-0 transition-transform duration-200"
      style={{ transform: `rotate(${deg}deg)` }}
    >
      <path
        d="M12 2L16 10H13V22H11V10H8L12 2Z"
        fill={color}
      />
    </svg>
  );
}

export default function WindgramMatrix({
  dayData,
  siteName,
  altitude,
  selectedHour = 13,
  onHourSelect,
}: WindgramMatrixProps) {
  const currentActualHour = new Date().getHours();

  // Mappa i dati orari
  const hourlyMap = useMemo(() => {
    const map = new Map<number, HourData>();
    if (dayData) {
      dayData.forEach((h) => {
        const d = new Date(h.time);
        map.set(d.getHours(), h);
      });
    }
    return map;
  }, [dayData]);

  // Calcola per ogni ora lo sviluppo convettivo / termico (top e base)
  const hourConvection = useMemo(() => {
    const conv: Record<number, { top: number; base: number; rateo: number }> = {};

    HOURS.forEach((hr) => {
      const h = hourlyMap.get(hr);
      const temp = h?.temperature ?? (15 + (hr >= 10 && hr <= 17 ? 8 : 2));
      const dew = h?.dewPoint ?? temp - 8;
      const spread = Math.max(1, temp - dew);
      const cloud = h?.cloudCover ?? 20;

      // Attivazione termica dalle 10 alle 18
      const isDayThermal = hr >= 10 && hr <= 18;
      const thermalFactor = isDayThermal ? Math.sin(((hr - 10) / 8) * Math.PI) : 0;
      
      const base = Math.max(altitude, Math.round(altitude + spread * 100));
      const top = Math.round(base + thermalFactor * 1200);
      const rateo = isDayThermal ? Math.max(0.5, spread * 0.2 * thermalFactor) : 0;

      conv[hr] = { top, base, rateo };
    });

    return conv;
  }, [hourlyMap, altitude]);

  // Stima vento interpolato per ogni quota e ogni ora
  const gridData = useMemo(() => {
    return ALTITUDES.map((alt) => {
      const isUnderGround = alt < altitude - 100;

      const hourCells = HOURS.map((hr) => {
        const h = hourlyMap.get(hr);
        const groundSpeed = h?.windSpeed ?? 8;
        const groundDir = h?.windDir ?? 180;
        const gust = h?.windGusts ?? groundSpeed * 1.3;

        // Se è sotto il terreno del decollo
        if (isUnderGround) {
          return {
            alt,
            hr,
            underGround: true,
            speed: 0,
            dir: 0,
            isThermalLayer: false,
          };
        }

        // Calcolo gradiente verticale del vento in quota
        const altDiff = Math.max(0, alt - altitude);
        // Vento aumenta con la quota (shear standard alpino)
        const factor = 1 + (altDiff / 1000) * 0.65;
        const rawSpeed = groundSpeed * factor + (alt > 2500 ? (alt - 2500) * 0.012 : 0);
        const speed = Math.round(Math.min(95, Math.max(1, rawSpeed)));

        // Piccola rotazione oraria con la quota (veering)
        const dirOffset = Math.min(45, (altDiff / 1000) * 15);
        const dir = Math.round((groundDir + dirOffset) % 360);

        // Controllo se questo punto è nella colonna termica convettiva (giallo/arancio)
        const conv = hourConvection[hr];
        const isThermalLayer = alt >= altitude - 50 && alt <= (conv?.top ?? altitude);

        return {
          alt,
          hr,
          underGround: false,
          speed,
          dir,
          isThermalLayer,
          rateo: conv?.rateo ?? 0,
        };
      });

      return {
        alt,
        isUnderGround,
        hourCells,
      };
    });
  }, [hourlyMap, altitude, hourConvection]);

  return (
    <div className="w-full bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-xl overflow-hidden font-sans select-none">
      {/* Header compatto */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-sky-600" />
          <h3 className="text-base font-bold text-slate-900">
            Windgram &mdash; <span className="text-sky-700">{siteName}</span>
          </h3>
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <Mountain className="w-3.5 h-3.5 text-amber-600" />
            Decollo {altitude}m slm
          </span>
        </div>

        {/* Scala Vento Rapida */}
        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono overflow-x-auto">
          <span className="font-semibold text-slate-500 uppercase">Vento (km/h):</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">1-8</span>
          <span className="px-1.5 py-0.5 rounded bg-lime-100 text-lime-800 font-bold">9-14</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">15-20</span>
          <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold">21-28</span>
          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">29-40</span>
          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">{"> 40"}</span>
        </div>
      </div>

      {/* Griglia Scrollabile Orizzontalmente */}
      <div className="overflow-x-auto p-2">
        <div
          className="grid gap-[1px] bg-slate-300 border border-slate-300 text-center text-[11px] min-w-[780px]"
          style={{
            gridTemplateColumns: `56px repeat(${HOURS.length}, minmax(36px, 1fr))`,
          }}
        >
          {/* Header RIGA: Quota e Ore */}
          <div className="bg-slate-200 text-slate-700 font-bold py-2 flex items-center justify-center sticky left-0 z-20 shadow-sm text-xs">
            Quota
          </div>
          {HOURS.map((hr) => {
            const isHighlight = hr === selectedHour;
            const isNow = hr === currentActualHour;
            return (
              <div
                key={`h-${hr}`}
                onClick={() => onHourSelect?.(hr)}
                className={`py-1.5 font-bold cursor-pointer transition-colors flex flex-col items-center justify-center ${
                  isHighlight
                    ? "bg-sky-100 text-sky-900 ring-2 ring-sky-500 z-10"
                    : isNow
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{hr}h</span>
                {isNow && <span className="text-[8px] leading-none text-emerald-700 font-normal">ora</span>}
              </div>
            );
          })}

          {/* RIGHE DELLE QUOTE (da 4000m a scendere) */}
          {gridData.map((row) => {
            return (
              <React.Fragment key={`row-${row.alt}`}>
                {/* Colonna quota a sinistra fissa */}
                <div
                  className={`py-1 px-1 font-bold text-[10px] flex items-center justify-center sticky left-0 z-10 border-r border-slate-300 ${
                    row.isUnderGround
                      ? "bg-slate-300 text-slate-500"
                      : row.alt === Math.round(altitude / 100) * 100 || Math.abs(row.alt - altitude) < 100
                      ? "bg-amber-100 text-amber-900 border-l-4 border-amber-500"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {row.alt}
                </div>

                {/* Celle orarie */}
                {row.hourCells.map((cell) => {
                  if (cell.underGround) {
                    return (
                      <div
                        key={`cell-${cell.alt}-${cell.hr}`}
                        className="bg-slate-200/90 flex items-center justify-center min-h-[26px]"
                      />
                    );
                  }

                  const windStyle = getWindColor(cell.speed);
                  const isHighlightCol = cell.hr === selectedHour;

                  // Sfondo in base a termica / convezione (Giallo / Arancio sfumato)
                  let cellBg = "bg-white";
                  if (cell.isThermalLayer) {
                    if (cell.rateo >= 1.5) {
                      cellBg = "bg-amber-200"; // termica buona
                    } else if (cell.rateo >= 0.8) {
                      cellBg = "bg-amber-100"; // termica media
                    } else {
                      cellBg = "bg-yellow-50"; // termica debole
                    }
                  }

                  return (
                    <div
                      key={`cell-${cell.alt}-${cell.hr}`}
                      onClick={() => onHourSelect?.(cell.hr)}
                      className={`p-1 flex items-center justify-center gap-1 cursor-pointer transition-all min-h-[26px] ${cellBg} ${
                        isHighlightCol ? "ring-1 ring-sky-400" : "hover:brightness-95"
                      }`}
                    >
                      <WindArrow deg={cell.dir} color={windStyle.text} />
                      <span
                        className="font-bold text-[10.5px] tabular-nums tracking-tighter"
                        style={{ color: windStyle.text }}
                      >
                        {cell.speed}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Didascalia e legenda in basso */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-200 border border-amber-300" />
            <span>Fascia termica convettiva attiva</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300" />
            <span>Terreno / Sottosuolo ({altitude}m)</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Freccia: direzione vento &bull; Numero: velocità in km/h &bull; Clicca un'ora per selezionarla
        </div>
      </div>
    </div>
  );
}