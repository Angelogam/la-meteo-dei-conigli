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

// Quote verticali da 3000m fino a 600m a intervalli di 100m (più denso e fedele al grafico SoaringMET)
const ALTITUDES = [
  3000, 2900, 2800, 2700, 2600, 2500, 2400, 2300, 2200, 2100, 2000,
  1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500,
];

// Ore mostrate nel grafico (estese 8:00 - 19:00)
const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

// Colore freccia e numero in base alla velocità (km/h) identico a SoaringMET
function getWindArrowColor(speed: number): { fill: string; stroke: string } {
  if (speed <= 4) return { fill: "#0284c7", stroke: "#0369a1" }; // azzurro/ciano
  if (speed <= 8) return { fill: "#0d9488", stroke: "#0f766e" }; // verde petrolio/teal
  if (speed <= 13) return { fill: "#16a34a", stroke: "#15803d" }; // verde brillante
  if (speed <= 18) return { fill: "#65a30d", stroke: "#4d7c0f" }; // verde mela
  if (speed <= 24) return { fill: "#eab308", stroke: "#ca8a04" }; // giallo oro
  if (speed <= 30) return { fill: "#f97316", stroke: "#ea580c" }; // arancione
  if (speed <= 42) return { fill: "#dc2626", stroke: "#b91c1c" }; // rosso
  if (speed <= 58) return { fill: "#991b1b", stroke: "#7f1d1d" }; // rosso scuro
  return { fill: "#86198f", stroke: "#701a75" }; // prugna / magenta scuro (> 58 km/h)
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

  // Quota base decollo
  const baseDecollo = altitude;

  // Calcolo convezione / profilo termico per ogni ora
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
        const temp = 16 + (hr >= 12 && hr <= 15 ? 7 : hr >= 11 && hr <= 17 ? 4 : 1);
        const dew = temp - 8;
        const spread = Math.max(1, temp - dew);
        const base = Math.max(altitude, Math.round(altitude + spread * 85));
        // Profilo a campana classica
        const bellFactor = Math.max(0, 1 - Math.pow((hr - 14) / 4, 2));
        const top = Math.min(2600, Math.round(base + bellFactor * 1100));
        const rateo = Math.max(0.3, bellFactor * 2.4);
        data[hr] = { top, base, rateo };
      }
    });
    return data;
  }, [hourlyMap, altitude]);

  // Calcolo colore di sfondo della cella (campana termica SoaringMET sfumata in giallo/arancio)
  const getThermalBgColor = (alt: number, hr: number, isUnderground: boolean) => {
    if (isUnderground) {
      return "#d1d5db"; // Grigio terreno uniforme come nell'immagine
    }

    const therm = hourThermalData[hr];
    if (!therm) return "transparent";

    // Termica attiva tra quota del decollo e top termico
    if (alt >= baseDecollo && alt <= therm.top) {
      const totalSpan = Math.max(100, therm.top - baseDecollo);
      const relHeight = (alt - baseDecollo) / totalSpan; // 0 = fondo, 1 = cima top

      // Campana oraria
      const hrBell = Math.max(0, 1 - Math.pow((hr - 14) / 4.2, 2));
      const strength = (1 - relHeight * 0.75) * (0.4 + hrBell * 0.6);

      if (strength > 0.72) {
        return "#f97316"; // Arancione forte vivo (#f97316)
      } else if (strength > 0.55) {
        return "#fb923c"; // Arancione medio caldo
      } else if (strength > 0.40) {
        return "#fbbf24"; // Giallo-arancio / ambra
      } else if (strength > 0.22) {
        return "#fde047"; // Giallo acceso
      } else {
        return "#fef08a"; // Giallo chiaro sfumato
      }
    }

    // Fascia velatura / umidità grigio-chiaro in quota prima della termica
    if (hr <= 10 && alt >= 1400 && alt <= 2200) {
      return "#f1f5f9";
    }

    return "transparent";
  };

  // Righe della matrice
  const gridRows = useMemo(() => {
    return ALTITUDES.map((alt) => {
      const isUnderground = alt < baseDecollo - 50;
      const isMajorLevel = alt % 500 === 0;

      const cells = DISPLAY_HOURS.map((hr) => {
        const h = hourlyMap.get(hr);
        const groundSpeed = h?.windSpeed ?? (hr === 11 ? 9 : hr === 12 ? 11 : hr >= 13 && hr <= 16 ? 8 : 12);
        const groundDir = h?.windDir ?? (hr <= 11 ? 230 : hr <= 15 ? 180 : 215);

        if (isUnderground) {
          return {
            alt,
            hr,
            underground: true,
            speed: 0,
            dir: 0,
          };
        }

        // Gradiente di velocità con la quota
        const altDiff = Math.max(0, alt - baseDecollo);
        const factor = 1 + (altDiff / 1000) * 0.95;
        const extraWind = alt >= 2400 ? Math.pow((alt - 2400) / 600, 1.8) * 16 : 0;
        const speed = Math.round(Math.max(1, groundSpeed * factor + extraWind));

        // Rotazione vento con la quota
        const dirOffset = Math.min(60, (altDiff / 1000) * 20);
        const dir = Math.round((groundDir + dirOffset) % 360);

        return {
          alt,
          hr,
          underground: false,
          speed,
          dir,
        };
      });

      return {
        alt,
        isUnderground,
        isMajorLevel,
        cells,
      };
    });
  }, [hourlyMap, baseDecollo]);

  return (
    <div className="w-full bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-xl overflow-hidden font-sans select-none my-4">
      {/* Header compatto */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-sky-600" />
          <h3 className="text-base font-bold text-slate-900">
            Windgram &mdash; <span className="text-sky-600">{siteName}</span>
          </h3>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-300 px-2.5 py-1 rounded-full">
          <Mountain className="w-3.5 h-3.5 text-amber-600" />
          <span>Decollo {altitude}m slm</span>
        </div>
      </div>

      {/* Tabella Windgram Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-300 text-slate-700 bg-slate-100 font-bold">
              <th className="py-2 px-2 text-left w-14 sticky left-0 z-20 bg-slate-100 border-r border-slate-300 text-[11px]">
                m
              </th>
              {DISPLAY_HOURS.map((hr) => (
                <th
                  key={`th-${hr}`}
                  onClick={() => onHourSelect?.(hr)}
                  className={`py-2 px-1.5 font-bold cursor-pointer transition-colors border-r border-slate-200 text-[11px] ${
                    hr === selectedHour
                      ? "bg-sky-100 text-sky-900 ring-1 ring-sky-400"
                      : "hover:bg-slate-200 text-slate-800"
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
                  className="border-b border-slate-200/50"
                  style={{ height: "24px" }}
                >
                  {/* Quota fissa a sinistra */}
                  <td
                    className={`py-0.5 px-2 text-left text-[11px] font-mono sticky left-0 z-10 border-r border-slate-300 ${
                      row.isMajorLevel ? "font-bold text-slate-900 bg-slate-100" : "text-slate-500 bg-slate-50"
                    } ${row.isUnderground ? "bg-[#d1d5db] text-slate-700" : ""}`}
                  >
                    {row.isMajorLevel ? row.alt : ""}
                  </td>

                  {/* Celle matrice per ora */}
                  {row.cells.map((cell) => {
                    const bgColor = getThermalBgColor(cell.alt, cell.hr, cell.underground);
                    const isSelected = cell.hr === selectedHour;

                    if (cell.underground) {
                      return (
                        <td
                          key={`cell-${cell.alt}-${cell.hr}`}
                          className="border-r border-slate-200/40 p-0"
                          style={{ backgroundColor: "#d1d5db" }}
                        />
                      );
                    }

                    const arrowColor = getWindArrowColor(cell.speed);

                    return (
                      <td
                        key={`cell-${cell.alt}-${cell.hr}`}
                        onClick={() => onHourSelect?.(cell.hr)}
                        style={{ backgroundColor: bgColor }}
                        className={`py-0.5 px-0.5 border-r border-slate-200/40 cursor-pointer transition-all ${
                          isSelected ? "ring-1 ring-sky-400/90" : "hover:brightness-95"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-0.5 leading-none">
                          <WindArrowIcon deg={cell.dir} color={arrowColor} />
                          <span
                            className="font-bold text-[11px] font-mono tabular-nums"
                            style={{ color: "#0f172a" }}
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

      {/* Legenda inferiore */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Convezione:</span>
          <div className="flex items-center gap-1 text-[11px]">
            <span className="w-3.5 h-3.5 rounded-sm bg-[#fde047] border border-amber-300" />
            <span>Debole</span>
            <span className="w-3.5 h-3.5 rounded-sm bg-[#fb923c] border border-orange-400 ml-2" />
            <span>Media</span>
            <span className="w-3.5 h-3.5 rounded-sm bg-[#f97316] border border-orange-500 ml-2" />
            <span className="font-bold text-orange-700">Forte</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Vento:</span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> {"<5"}
            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] ml-1" /> 5-13
            <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] ml-1" /> 14-24
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] ml-1" /> 25-30
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] ml-1" /> 31-42
            <span className="w-2.5 h-2.5 rounded-full bg-[#86198f] ml-1" /> {">42"}
          </div>
        </div>
      </div>
    </div>
  );
}