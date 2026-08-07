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
    
        // Check for rain or thunder in the day (9-19) to adjust score
        const hasRain = oreVolo.some(h => (h.precipitation ?? 0) > 0.1); // > 0.1 mm/h
        const hasThunder = oreVolo.some(h => h.weatherCode >= 95);
    
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

    // If there's rain or thunder, cap the score to avoid "Eccellente" when weather is poor
    if (hasRain || hasThunder) {
      if (score > 6) score = 6; // Max BUONA if rain/thunder
    }

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
    </div>
  );
}