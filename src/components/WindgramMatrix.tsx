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

// Colore freccia e numero in base alla velocità (km/h) identico a SoaringMET
function getWindArrowColor(speed: number): { fill: string; stroke: string } {
  if (speed <= 4) return { fill: "#0284c7", stroke: "#0369a1" };
  if (speed <= 8) return { fill: "#0d9488", stroke: "#0f766e" };
  if (speed <= 13) return { fill: "#16a34a", stroke: "#15803d" };
  if (speed <= 18) return { fill: "#65a30d", stroke: "#4d7c0f" };
  if (speed <= 24) return { fill: "#eab308", stroke: "#ca8a04" };
  if (speed <= 30) return { fill: "#f97316", stroke: "#ea580c" };
  if (speed <= 42) return { fill: "#dc2626", stroke: "#b91c1c" };
  if (speed <= 58) return { fill: "#991b1b", stroke: "#7f1d1d" };
  return { fill: "#86198f", stroke: "#701a75" };
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

  // Quota base decollo arrotondata per difetto a step 100m
  const baseStep = 100;
  const baseDecolloFloor = Math.floor(altitude / baseStep) * baseStep;
  const maxAlt = 3000;

  // Quote attive: dalla quota decollo arrotondata fino a 3000m
  const activeAltitudes = useMemo(() => {
    const altitudes: number[] = [];
    for (let alt = baseDecolloFloor; alt <= maxAlt; alt += baseStep) {
      altitudes.push(alt);
    }
    return altitudes;
  }, [baseDecolloFloor]);

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
        const bellFactor = Math.max(0, 1 - Math.pow((hr - 14) / 4, 2));
        const top = Math.min(2600, Math.round(base + bellFactor * 1100));
        const rateo = Math.max(0.3, bellFactor * 2.4);
        data[hr] = { top, base, rateo };
      }
    });
    return data;
  }, [hourlyMap, altitude]);

  // Calcolo colore di sfondo della cella (campana termica SoaringMET)
  const getThermalBgColor = (alt: number, hr: number) => {
    const thermal = hourThermalData[hr];
    if (!thermal) return "transparent";

    // Termica attiva tra quota del decollo e top termico
    if (alt >= altitude && alt <= thermal.top) {
      const totalSpan = Math.max(200, thermal.top - altitude);
      const relHeight = (alt - altitude) / totalSpan;
      
      // Campana oraria: picco ore 12-15, quote basse-medie
      const hrBell = Math.max(0, 1 - Math.pow((hr - 14) / 4.2, 2));
      const strength = (1 - relHeight * 0.75) * (0.4 + hrBell * 0.6);

      if (strength > 0.72) return "#f97316"; // Arancione forte
      if (strength > 0.55) return "#fb923c"; // Arancione medio
      if (strength > 0.40) return "#fbbf24"; // Ambra
      if (strength > 0.22) return "#fde047"; // Giallo acceso
      return "#fef08a"; // Giallo chiaro sfumato
    }

    // Fascia velatura/umidità grigio-chiaro in quota ore mattutine
    if (hr <= 10 && alt >= 1400 && alt <= 2200) {
      return "#f1f5f9";
    }

    return "transparent";
  };

  // Righe della matrice (solo quote sopra il decollo)
  const gridRows = useMemo(() => {
    return activeAltitudes.map((alt) => {
      const isMajorLevel = alt % 500 === 0;

      const cells = DISPLAY_HOURS.map((hr) => {
        const h = hourlyMap.get(hr);
        const groundSpeed = h?.windSpeed ?? (hr === 11 ? 9 : hr === 12 ? 11 : hr >= 13 && hr <= 16 ? 8 : 12);
        const groundDir = h?.windDir ?? (hr <= 11 ? 230 : hr <= 15 ? 180 : 215);

        // Gradiente di velocità con la quota
        const altDiff = Math.max(0, alt - altitude);
        const factor = 1 + (altDiff / 1000) * 0.95;
        const extraWind = alt >= 2400 ? Math.pow((alt - 2400) / 600, 1.8) * 16 : 0;
        const speed = Math.round(Math.max(1, groundSpeed * factor + extraWind));

        // Rotazione vento con la quota
        const dirOffset = Math.min(60, (altDiff / 1000) * 20);
        const dir = Math.round((groundDir + dirOffset) % 360);

        return {
          alt,
          hr,
          speed,
          dir,
        };
      });

      return {
        alt,
        isMajorLevel,
        cells,
      };
    });
  }, [activeAltitudes, hourlyMap, altitude]);

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

          {/* Legenda Vento */}
          <div className="flex items-center gap-2 text-[11px] overflow-x-auto pb-1 font-sans">
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

        {/* Tabella Windgram */}
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
              {gridRows.map((row) => (
                <tr key={`tr-${row.alt}`} className={`border-b border-slate-100 transition-colors ${row.isMajorLevel ? "font-bold" : ""}`}>
                  <td
                    className={`py-1.5 px-3 text-left font-bold sticky left-0 z-10 border-r border-slate-200 text-[11px] ${
                      row.isMajorLevel
                        ? "bg-slate-100 text-slate-900"
                        : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {row.alt}
                  </td>
                  {row.cells.map((cell) => {
                    const wColor = getWindArrowColor(cell.speed);
                    const isSelectedCol = cell.hr === selectedHour;
                    const cellStyle = getThermalBgColor(cell.alt, cell.hr);

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
                          <WindArrowIcon deg={cell.dir} color={wColor} />
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
              ))}
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