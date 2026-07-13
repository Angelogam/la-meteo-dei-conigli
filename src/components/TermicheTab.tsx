"use client";

import React, { useMemo } from "react";
import GraficoTermiche from "@/components/GraficoTermiche";
import type { HourData, CurrentData, DailyData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface TermicheTabProps {
  currentData: CurrentData | null;
  dayData: DailyData | null;
  site: { alt: number };
  thermalDelta?: number;
  thermalStrength?: number;
  hourlyData?: HourData[];
  selectedHour: number;
  selectedDay: number;
}

export default function TermicheTab({
  currentData,
  dayData,
  site,
  thermalDelta,
  thermalStrength,
  hourlyData,
  selectedHour,
  selectedDay,
}: TermicheTabProps) {
  // Calcola i dati termici reali per ogni ora (8-19)
  const hourlyTermiche = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + selectedDay);
    
    // Filtra i dati per il giorno selezionato
    const dayHours = (hourlyData || []).filter((d: any) => {
      const t = new Date(d.time);
      return t.getFullYear() === targetDate.getFullYear() &&
             t.getMonth() === targetDate.getMonth() &&
             t.getDate() === targetDate.getDate();
    });

    // Ore locali (Italia, UTC+1) da mostrare
    const HOURS_LOCAL = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 – 19:00

    return HOURS_LOCAL.map((localHour) => {
      // Trova il dato meteo reale per quest'ora
      const weatherData = dayHours.find((d: any) => {
        const t = new Date(d.time);
        return t.getHours() === localHour;
      });

      if (!weatherData) {
        return {
          hour: localHour,
          termiche: {
            forza: 0,
            rateo: 0,
            label: "N/D",
            top: 0,
            base: 0,
            gradienteReale: 0,
          },
        };
      }

      const termiche = calcolaTermiche(weatherData, site.alt);
      
      return {
        hour: localHour,
        termiche,
      };
    });
  }, [hourlyData, site.alt, selectedDay]);

  return (
    <div className="space-y-6">
      {/* Riepilogo condizioni */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <h3 className="text-sm font-semibold mb-3 text-slate-300">Riepilogo termiche</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/40 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-400 block">Delta termico</span>
            <span className="text-lg font-bold text-orange-300">
              {thermalDelta !== undefined ? `${thermalDelta.toFixed(1)}°C` : "—"}
            </span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-400 block">Forza termiche</span>
            <span className="text-lg font-bold text-orange-300">
              {thermalStrength !== undefined
                ? thermalStrength > 3
                  ? "Forte"
                  : thermalStrength > 2
                  ? "Buona"
                  : thermalStrength > 1
                  ? "Moderata"
                  : "Debole"
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Grafico quote termiche con dati meteo reali */}
      {hourlyTermiche.length > 0 && (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
          <GraficoTermiche
            hourly={hourlyTermiche}
            oraCorrente={selectedHour}
          />
        </div>
      )}

      {/* Nessun dato */}
      {hourlyTermiche.length === 0 && (
        <div className="bg-slate-800/40 rounded-xl p-8 border border-slate-700/30 text-center">
          <span className="text-sm text-slate-500">Nessun dato orario disponibile per il calcolo delle termiche.</span>
        </div>
      )}
    </div>
  );
}