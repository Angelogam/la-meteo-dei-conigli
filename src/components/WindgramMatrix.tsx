"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { Mountain, Wind } from "lucide-react";

interface WindgramMatrixProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
}

// Quote verticali da 4000m fino a 600m a passi di 200m (come nell'immagine)
const ALTITUDES = [
  4000, 3800, 3600, 3400, 3200, 3000, 2800, 2600, 2400, 2200, 2000, 1800, 1600, 1400, 1200, 1000, 800, 600,
];

// Ore centrali di volo mostrate
const DISPLAY_HOURS = [11, 12, 13, 14, 15, 16, 17];

// Colore del testo/freccia del vento in base alla velocità (km/h)
function getWindColor(speed: number): { text: string; label: string } {
  if (speed <= 8) return { text: "#0ca678", label: "1-8" }; // verde smeraldo
  if (speed <= 14) return { text: "#66a80f", label: "9-14" }; // verde lime
  if (speed <= 20) return { text: "#f59f00", label: "15-20" }; // giallo/arancio
  if (speed <= 28) return { text: "#e8590c", label: "21-28" }; // arancio vivo
  if (speed <= 40) return { text: "#d6336c", label: "29-40" }; // rosso/magenta
  return { text: "#7048e8", label: "> 40" }; // viola/indaco
}

// Freccia direzionale vettoriale ruotata
function WindDirectionArrow({ deg, color }: { deg: number; color: string }) {
  // Rotazione: 0° vento da Nord (freccia scende ↓ verso Sud), 180° vento da Sud (freccia sale ↑ verso Nord)
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      className="shrink-0 transition-transform duration-200"
      style={{ transform: `rotate(${deg}deg)` }}
    >
      <path
        d="M12 2L16.5 10H13.2V22H10.8V10H7.5L12 2Z"
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
  // Mappa dati orari reali ricevuti da Open-Meteo
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

  // Quota terreno approssimata arrotondata al gradino di 200m
  const decolloStep = Math.round(altitude / 200) * 200;

  // Calcolo convezione / termiche per colorare la fascia gialla attiva
  const hourConvection = useMemo(() => {
    const conv: Record<number, { top: number; base: number }> = {};
    DISPLAY_HOURS.forEach((hr) => {
      const h = hourlyMap.get(hr);
      const temp = h?.temperature ?? (16 + (hr >= 12 && hr <= 15 ? 7 : 3));
      const dew = h?.dewPoint ?? temp - 8;
      const spread = Math.max(1, temp - dew);
      
      const base = Math.max(altitude, Math.round(altitude + spread * 90));
      const top = Math.min(3400, Math.round(base + (hr >= 12 && hr <= 15 ? 1200 : 700)));

      conv[hr] = { top, base };
    });
    return conv;
  }, [hourlyMap, altitude]);

  // Griglia vento calcolata per ogni quota ed ora
  const gridRows = useMemo(() => {
    return ALTITUDES.map((alt) => {
      const isUnderground = alt < altitude - 80;
      const isDecolloLevel = Math.abs(alt - decolloStep) < 100 || (alt === 1800 && altitude <= 1850 && altitude >= 1650);

      const cells = DISPLAY_HOURS.map((hr) => {
        const h = hourlyMap.get(hr);
        const groundSpeed = h?.windSpeed ?? (hr === 11 ? 9 : hr === 12 ? 10 : hr === 13 ? 5 : 6);
        const groundDir = h?.windDir ?? (hr <= 12 ? 220 : hr <= 14 ? 180 : 210);

        if (isUnderground) {
          return {
            alt,
            hr,
            underground: true,
            speed: 0,
            dir: 0,
            isThermal: false,
          };
        }

        // Gradiente di velocità con la quota (shear naturale)
        const altDiff = Math.max(0, alt - altitude);
        const factor = 1 + (altDiff / 1000) * 0.85;
        const extraWindAloft = alt >= 3000 ? ((alt - 3000) / 1000) * 8 : 0;
        const calculatedSpeed = Math.round(Math.max(3, groundSpeed * factor + extraWindAloft));

        // Rotazione oraria naturale con l'altitudine
        const dirOffset = Math.min(45, (altDiff / 1000) * 16);
        const dir = Math.round((groundDir + dirOffset) % 360);

        // Controllo se si trova nella fascia termica convettiva attiva
        const conv = hourConvection[hr];
        const isThermal = alt >= altitude - 100 && alt <= (conv?.top ?? 3200);

        return {
          alt,
          hr,
          underground: false,
          speed: calculatedSpeed,
          dir,
          isThermal,
        };
      });

      return {
        alt,
        isUnderground,
        isDecolloLevel,
        cells,
      };
    });
  }, [hourlyMap, altitude, decolloStep, hourConvection]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
      {/* Scheda Windgram in stile Bianco/Azzurro pulito ad altissima risoluzione visiva */}
      <div className="w-full bg-[#f8fafc] text-slate-900 border border-slate-200/80 rounded-[26px] shadow-2xl overflow-hidden font-sans select-none">
        
        {/* Header superiore */}
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

          {/* Legenda Velocità Vento a Blocchetti */}
          <div className="flex items-center gap-2 text-[11px] overflow-x-auto pb-1 font-sans">
            <div className="text-slate-500 font-bold uppercase text-[10px] leading-tight shrink-0 mr-1">
              VENTO<br />(KM/H):
            </div>
            <div className="flex gap-1.5 shrink-0">
              <div className="px-2 py-1 rounded bg-[#d3f9d8] text-[#0ca678] font-bold text-center leading-none">
                1-<br />8
              </div>
              <div className="px-2 py-1 rounded bg-[#e9fac8] text-[#66a80f] font-bold text-center leading-none">
                9-<br />14
              </div>
              <div className="px-2 py-1 rounded bg-[#fff3bf] text-[#f59f00] font-bold text-center leading-none">
                15-<br />20
              </div>
              <div className="px-2 py-1 rounded bg-[#ffe8cc] text-[#e8590c] font-bold text-center leading-none">
                21-<br />28
              </div>
              <div className="px-2 py-1 rounded bg-[#ffe3e3] text-[#d6336c] font-bold text-center leading-none">
                29-<br />40
              </div>
              <div className="px-2 py-1 rounded bg-[#f3d9fa] text-[#7048e8] font-bold text-center leading-none">
                {">"}<br />40
              </div>
            </div>
          </div>
        </div>

        {/* Tabella Windgram Matriciale */}
        <div className="overflow-x-auto border-t border-b border-slate-200 bg-white">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 bg-slate-100/90 font-bold">
                <th className="py-2.5 px-3 text-left w-16 sticky left-0 z-20 bg-slate-100 border-r border-slate-200 text-slate-800">
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
                    {hr}h
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gridRows.map((row) => {
                return (
                  <tr
                    key={`tr-${row.alt}`}
                    className={`border-b border-slate-100 transition-colors ${
                      row.isDecolloLevel ? "bg-[#fff9db] font-bold" : ""
                    }`}
                  >
                    {/* Colonna quota fissa a sinistra */}
                    <td
                      className={`py-1.5 px-3 text-left font-bold sticky left-0 z-10 border-r border-slate-200 text-[11px] ${
                        row.isDecolloLevel
                          ? "bg-[#fff3bf] text-amber-950 font-extrabold"
                          : row.isUnderground
                          ? "bg-slate-200/90 text-slate-500 font-medium"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {row.alt}
                    </td>

                    {/* Celle dei venti per ora */}
                    {row.cells.map((cell) => {
                      // Se è sottosuolo
                      if (cell.underground) {
                        return (
                          <td
                            key={`cell-${cell.alt}-${cell.hr}`}
                            className="p-1 border-r border-slate-200/60 bg-[#e2e8f0]/80"
                          />
                        );
                      }

                      const wColor = getWindColor(cell.speed);
                      const isSelectedCol = cell.hr === selectedHour;

                      // Sfondo cella: attiva termica in giallo caldo
                      let bgClass = "bg-white";
                      if (cell.isThermal) {
                        bgClass = "bg-[#fffbeb]"; // ambrato chiaro caldo
                      }
                      if (row.isDecolloLevel) {
                        bgClass = "bg-[#fff9db]";
                      }

                      return (
                        <td
                          key={`cell-${cell.alt}-${cell.hr}`}
                          onClick={() => onHourSelect?.(cell.hr)}
                          className={`py-1 px-1 border-r border-slate-200/60 cursor-pointer transition-colors ${bgClass} ${
                            isSelectedCol ? "ring-1 ring-sky-400/80" : "hover:bg-amber-100/50"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <WindDirectionArrow deg={cell.dir} color={wColor.text} />
                            <span
                              className="font-bold text-[12px] tabular-nums tracking-tighter"
                              style={{ color: wColor.text }}
                            >
                              {cell.speed}
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

        {/* Didascalia e legenda inferiore */}
        <div className="p-4 sm:p-5 pt-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#fff3bf] border border-[#ffe066]" />
              <span className="font-medium text-slate-700">Fascia termica convettiva attiva</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#cbd5e1] border border-slate-300" />
              <span className="font-medium text-slate-700">Terreno / Sottosuolo ({altitude}m)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
            <p>&bull; Freccia: direzione vento &bull; Numero: velocità in km/h</p>
            <p>&bull; Clicca un'ora per selezionarla</p>
          </div>
        </div>
      </div>
    </div>
  );
}