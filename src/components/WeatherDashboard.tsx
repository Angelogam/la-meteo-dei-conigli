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
      const ora = new Date(h.time).getHours();
      return ora >= 9 && ora <= 19;
    });

    if (oreVolo.length === 0) return null;

    // Controllo maltempo e pioggia
    const pioggiaTot = oreVolo.reduce((s, h) => s + (h.precipitation || 0), 0);
    const oreConPioggia = oreVolo.filter(h => (h.precipitation || 0) > 0.3).length;
    const haTemporali = oreVolo.some(h => (h.weatherCode >= 95 && h.weatherCode <= 99) || h.weatherCode === 82);
    const ventoMax = Math.max(...oreVolo.map(h => h.windSpeed || 0));

    const termichePerOra = oreVolo.map(h => ({
      ...calcolaTermiche(h, altitude),
      ora: new Date(h.time).getHours(),
    }));

    const ratei = termichePerOra.map(t => t.rateo);
    const mediaRateo = ratei.reduce((s, v) => s + v, 0) / ratei.length;
    const maxRateo = Math.max(...ratei);
    const oreAttive = termichePerOra.filter(t => t.rateo >= 0.3).length;

    let score = 0;
    let label = "";
    let thermalLabel = "";

    // SE C'È PIOGGIA O TEMPORALE: IL VOLO È NEGATO
    if (haTemporali) {
      score = 0;
      label = "TEMPORALE";
      thermalLabel = "Pericolo fulmini ⛈️";
    } else if (pioggiaTot > 1.5 || oreConPioggia >= 2) {
      score = 0;
      label = "PIOGGIA";
      thermalLabel = "Volo sconsigliato 🌧️";
    } else if (pioggiaTot > 0.3) {
      score = 2;
      label = "ROVESCI";
      thermalLabel = "Precipitazioni sparse 🌦️";
    } else if (ventoMax > 30) {
      score = 2;
      label = "VENTO FORTE";
      thermalLabel = "Raffiche critiche 💨";
    } else {
      // Condizioni asciutte
      if (mediaRateo >= 3) score = 9;
      else if (mediaRateo >= 2.5) score = 8;
      else if (mediaRateo >= 2) score = 7;
      else if (mediaRateo >= 1.5) score = 6;
      else if (mediaRateo >= 1) score = 5;
      else if (mediaRateo >= 0.7) score = 4;
      else if (mediaRateo >= 0.4) score = 3;
      else if (mediaRateo >= 0.2) score = 2;
      else score = 1;

      if (score >= 8) label = "ECCELLENTE";
      else if (score >= 6) label = "BUONA";
      else if (score >= 4) label = "DISCRETA";
      else if (score >= 2) label = "MEDIOCRE";
      else label = "SCARSA";

      if (mediaRateo >= 3) thermalLabel = "Forte 🔥";
      else if (mediaRateo >= 2) thermalLabel = "Buona 🪂";
      else if (mediaRateo >= 1) thermalLabel = "Moderata 🌤️";
      else if (mediaRateo >= 0.3) thermalLabel = "Debole 🌥️";
      else thermalLabel = "Assenti ❄️";
    }

    const best = termichePerOra.reduce((b, t) => t.rateo > b.rateo ? t : b, termichePerOra[0]);

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

  const rainHours = useMemo(() => {
    return dayData
      .filter(h => (h.precipitation || 0) > 0.2)
      .map(h => new Date(h.time).getHours())
      .sort((a, b) => a - b);
  }, [dayData]);

  const thunderstormHours = useMemo(() => {
    return dayData
      .filter(h => (h.weatherCode >= 95 && h.weatherCode <= 99) || h.weatherCode === 82)
      .map(h => new Date(h.time).getHours())
      .sort((a, b) => a - b);
  }, [dayData]);

  return (
    <div className="space-y-4">
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
          rainHours={rainHours}
          thunderstormHours={thunderstormHours}
        />
      )}

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