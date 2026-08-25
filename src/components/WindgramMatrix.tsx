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

// Tutte le possibili quote a intervalli di 200m
const ALL_ALTITUDES = [
  4000, 3800, 3600, 3400, 3200, 3000, 2800, 2600, 2400, 2200, 2000, 1800, 1600, 1400, 1200, 1000, 800, 600,
];

// Ore di volo estese fino alle 19:00
const DISPLAY_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

// Colore del testo/freccia del vento in base alla velocità (km/h)
function getWindColor(speed: number): { text: string } {
  if (speed <= 8) return { text: "#0ca678" }; // verde smeraldo
  if (speed <= 14) return { text: "#66a80f" }; // verde lime
  if (speed <= 20) return { text: "#d97706" }; // giallo scuro / ambra
  if (speed <= 28) return { text: "#ea580c" }; // arancio vivo
  if (speed <= 40) return { text: "#dc2626" }; // rosso
  return { text: "#7c3aed" }; // viola/indaco
}

// Freccia direzionale vettoriale ruotata
function WindDirectionArrow({ deg, color }: { deg: number; color: string }) {
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

  // Quota base decollo arrotondata per difetto a step 200m
  const baseDecolloFloor = Math.floor(altitude / 200) * 200;

  // Filtra quote: mostra solo dalla quota del decollo fino a 4000m
  const activeAltitudes = useMemo(() => {
    return ALL_ALTITUDES.filter((alt) => alt >= baseDecolloFloor && alt <= 4000);
  }, [baseDecolloFloor]);

  // Calcolo convezione / termiche per ogni ora
  const hourThermalData = useMemo(() => {
    const data: Record<number, { top: number; base: number; rateo: number }> = {};
    DISPLAY_HOURS.forEach((hr) => {
      const h = hourlyMap.get(hr);
      if (h) {
        const t = calcolaTermiche(h, altitude);
        data[hr] = {
          top: t.top,
          base: t.base,
          rateo: t.rateo,
        };
      } else {
        const temp = 16 + (hr >= 12 && hr <= 15 ? 7 : 3);
        const dew = temp - 8;
        const spread = Math.max(1, temp - dew);
        const base = Math.max(altitude, Math.round(altitude + spread * 90));
        const top = Math.min(3600, Math.round(base + (hr >= 12 && hr <= 15 ? 1300 : 700)));
        const rateo = hr >= 12 && hr <= 15 ? 2.2 : hr >= 11 && hr <= 16 ? 1.4 : 0.6;
        data[hr] = { top, base, rateo };
      }
    });
    return data;
  }, [hourlyMap, altitude]);

  // Funzione che calcola lo sfondo in gradiente per la termica
  const getCellThermalStyle = (alt: number, hr: number, isDecolloLevel: boolean) => {
    const thermal = hourThermalData[hr];
    if (!thermal) return isDecolloLevel ? { backgroundColor: "#fef3c7" } : {};

    const inThermalZone = alt >= altitude - 50 && alt <= thermal.top;
    if (!inThermalZone) {
      return isDecolloLevel ? { backgroundColor: "#fef3c7" } : {};
    }

    // Calcolo intensità da 0 a 1 in base all'altezza rispetto al top e al rateo di salita
    const heightSpan = Math.max(200, thermal.top - altitude);
    const relHeight = (alt - altitude) / heightSpan; // 0 = suolo, 1 = top
    
    // Picco termico a metà colonna (0.4 - 0.7)
    const verticalFactor = Math.max(0.2, 1 - Math.abs(relHeight - 0.45) * 1.5);
    const rateoFactor = Math.min(1.2, Math.max(0.3, thermal.rateo / 2.0));
    const intensity = Math.min(1, Math.max(0.1, verticalFactor * rateoFactor));

    if (intensity > 0.75) {
      // Arancione caldo marcato per termiche forti
      return {
        backgroundColor: `rgba(249, 115, 22, ${0.35 + intensity * 0.35})`, // orange-500
      };
    } else if (intensity > 0.45) {
      // Ambrato / giallo intenso
      return {
        backgroundColor: `rgba(245, 158, 11, ${0.25 + intensity * 0.3})`, // amber-500
      };
    } else {
      // Giallo dorato soft per sfumatura / dissolvenza
      return {
        backgroundColor: `rgba(253, 224, 71, ${0.2 + intensity * 0.25})`, // yellow-300
      };
    }
  };

  // Griglia vento calcolata per ogni quota ed ora
  const gridRows = useMemo(() => {
    return activeAltitudes.map((alt) => {
      const isDecolloLevel = Math.abs(alt - baseDecolloFloor) < 100 || (alt === baseDecolloFloor);

      const cells = DISPLAY_HOURS.map((hr) => {
        const h = hourlyMap.get(hr);
        const groundSpeed = h?.windSpeed ?? (hr === 11 ? 9 : hr === 12 ? 10 : hr === 13 ? 5 : 6);
        const groundDir = h?.windDir ?? (hr <= 12 ? 220 : hr <= 14 ? 180 : 210);

        // Gradiente di velocità con la quota (shear naturale)
        const altDiff = Math.max(0, alt - altitude);
        const factor = 1 + (altDiff / 1000) * 0.85;
        const extraWindAloft = alt >= 3000 ? ((alt - 3000) / 1000) * 8 : 0;
        const calculatedSpeed = Math.round(Math.max(3, groundSpeed * factor + extraWindAloft));

        // Rotazione oraria naturale con l'altitudine
        const dirOffset = Math.min(45, (altDiff / 1000) * 16);
        const dir = Math.round((groundDir + dirOffset) % 360);

        return {
          alt,
          hr,
          speed: calculatedSpeed,
          dir,
        };
      });

      return {
        alt,
        isDecolloLevel,
        cells,
      };
    });
  }, [activeAltitudes, hourlyMap, altitude, baseDecolloFloor]);

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
              <div className="px-2 py-1 rounded bg-[#fef3c7] text-[#d97706] font-bold text-center leading-none">
                15-<br />20
              </div>
              <div className="px-2 py-1 rounded bg-[#ffedd5] text-[#ea580c] font-bold text-center leading-none">
                21-<br />28
              </div>
              <div className="px-2 py-1 rounded bg-[#fee2e2] text-[#dc2626] font-bold text-center leading-none">
                29-<br />40
              </div>
              <div className="px-2 py-1 rounded bg-[#ede9fe] text-[#7c3aed] font-bold text-center leading-none">
                {">"}<br />40
              </div>
            </div>
          </div>
        </div>

        {/* Tabella Windgram Matriciale con Scroll orizzontale */}
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
                      row.isDecolloLevel ? "font-bold" : ""
                    }`}
                  >
                    {/* Colonna quota fissa a sinistra */}
                    <td
                      className={`py-1.5 px-3 text-left font-bold sticky left-0 z-10 border-r border-slate-200 text-[11px] ${
                        row.isDecolloLevel
                          ? "bg-[#fde68a] text-amber-950 font-black border-l-4 border-l-amber-500"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {row.alt}
                    </td>

                    {/* Celle dei venti per ora con gradiente termico */}
                    {row.cells.map((cell) => {
                      const wColor = getWindColor(cell.speed);
                      const isSelectedCol = cell.hr === selectedHour;
                      const cellStyle = getCellThermalStyle(cell.alt, cell.hr, row.isDecolloLevel);

                      return (
                        <td
                          key={`cell-${cell.alt}-${cell.hr}`}
                          onClick={() => onHourSelect?.(cell.hr)}
                          style={cellStyle}
                          className={`py-1.5 px-1 border-r border-slate-200/60 cursor-pointer transition-colors ${
                            isSelectedCol ? "ring-1 ring-sky-400/90" : "hover:brightness-95"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-0.5">
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
              <div className="w-4 h-3.5 rounded bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 border border-orange-400/60" />
              <span className="font-medium text-slate-700">Fascia termica (intensità e dissolvenza)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#fde68a] border border-amber-400" />
              <span className="font-medium text-slate-700">Livello Decollo ({altitude}m)</span>
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