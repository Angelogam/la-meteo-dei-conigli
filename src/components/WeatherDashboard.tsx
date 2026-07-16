"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import HourlyTable from "@/components/HourlyTable";
import FlightScore from "@/components/FlightScore";
import { calcolaTermiche } from "@/utils/termiche";

interface WeatherDashboardProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  windProfile?: { height: number; speed: number; dir: number }[];
  groundSpeed?: number;
  groundDir?: number;
  dayLabel?: string;
}

function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
}

export default function WeatherDashboard({
  dayData,
  altitude,
  selectedHour,
  onHourSelect,
  dayLabel,
}: WeatherDashboardProps) {
  const flightScore = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    const oreVolo = dayData.filter(h => {
      const ora = h.time.getHours();
      return ora >= 9 && ora <= 19;
    });

    if (oreVolo.length === 0) return null;

    const termichePerOra = oreVolo.map(h => ({
      ...calcolaTermiche(h, altitude),
      ora: h.time.getHours(),
    }));

    const ratei = termichePerOra.map(t => t.rateo);
    const mediaRateo = ratei.reduce((s, v) => s + v, 0) / ratei.length;
    const maxRateo = Math.max(...ratei);
    const oreAttive = termichePerOra.filter(t => t.rateo >= 0.3).length;

    let score = 0;
    if (mediaRateo >= 3) score = 9;
    else if (mediaRateo >= 2.5) score = 8;
    else if (mediaRateo >= 2) score = 7;
    else if (mediaRateo >= 1.5) score = 6;
    else if (mediaRateo >= 1) score = 5;
    else if (mediaRateo >= 0.7) score = 4;
    else if (mediaRateo >= 0.4) score = 3;
    else if (mediaRateo >= 0.2) score = 2;
    else if (mediaRateo > 0) score = 1;
    else score = 0;

    const best = termichePerOra.reduce((best, t) => t.rateo > best.rateo ? t : best, termichePerOra[0]);

    let label = "";
    if (score >= 8) label = "ECCELLENTE";
    else if (score >= 6) label = "BUONA";
    else if (score >= 4) label = "DISCRETA";
    else if (score >= 2) label = "MEDIOCRE";
    else label = "SCARSA";

    let thermalLabel = "";
    if (mediaRateo >= 3) thermalLabel = "Forte 🔥";
    else if (mediaRateo >= 2) thermalLabel = "Buona 🪂";
    else if (mediaRateo >= 1) thermalLabel = "Moderata 🌤️";
    else if (mediaRateo >= 0.3) thermalLabel = "Debole 🌥️";
    else thermalLabel = "Assenti ❄️";

    return {
      score: Math.round(score * 10) / 10,
      label,
      bestHour: best.ora,
      bestRateo: best.rateo,
      oreAttive,
      totaleOre: oreVolo.length,
      thermalLabel,
      mediaRateo: Math.round(mediaRateo * 10) / 10,
      maxRateo: Math.round(maxRateo * 10) / 10,
    };
  }, [dayData, altitude]);

  const oggi = useMemo(() => {
    const data = dayData && dayData.length > 0 ? dayData[0].time : new Date();
    return formatDate(data);
  }, [dayData]);

  return (
    <div className="space-y-4">
      {/* Flight Score */}
      {flightScore && (
        <FlightScore
          score={flightScore.score}
          label={flightScore.label}
          bestHour={flightScore.bestHour}
          bestRateo={flightScore.bestRateo}
          oreAttive={flightScore.oreAttive}
          totaleOre={flightScore.totaleOre}
          thermalLabel={flightScore.thermalLabel}
          dayLabel={dayLabel || oggi}
        />
      )}

      {/* Tabella oraria 9-19 */}
      <HourlyTable
        dayData={dayData}
        altitude={altitude}
        selectedHour={selectedHour}
        onHourSelect={onHourSelect}
        dayLabel={dayLabel}
      />

      {/* Riepilogo rapido */}
      {flightScore && (
        <div className="card bg-slate-800/40 border border-slate-700/30 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Media termiche</div>
              <div className="text-lg font-bold text-amber-300">{flightScore.mediaRateo} <span className="text-xs text-slate-400">m/s</span></div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Picco termico</div>
              <div className="text-lg font-bold text-green-300">{flightScore.maxRateo} <span className="text-xs text-slate-400">m/s</span></div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Ore volabili</div>
              <div className="text-lg font-bold text-sky-300">{flightScore.oreAttive}/{flightScore.totaleOre}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Migliore ora</div>
              <div className="text-lg font-bold text-purple-300">{String(flightScore.bestHour).padStart(2, "0")}:00</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}