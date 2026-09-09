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
  siteName?: string;
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
  siteName,
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

    // Wave Index: differenza direzione vento 10m vs 850hPa
    const windDirs10m: number[] = oreVolo.map(h => h.windDir || 0);
    const windDirs850: number[] = (dayData as any[]).filter((h: any) => {
      const ora = new Date(h.time).getHours();
      return ora >= 9 && ora <= 19;
    }).map((h: any) => h.windDir850 ?? h.wind_direction_850hPa ?? null).filter(Boolean);

    let waveDiffDeg: number | null = null;
    if (windDirs10m.length > 0 && windDirs850.length > 0) {
      const avg10 = windDirs10m.reduce((a, b) => a + b, 0) / windDirs10m.length;
      const avg850 = windDirs850.reduce((a, b) => a + b, 0) / windDirs850.length;
      waveDiffDeg = Math.round(Math.abs(avg850 - avg10) > 180 ? 360 - Math.abs(avg850 - avg10) : Math.abs(avg850 - avg10));
    }

    // Turbulence Index: (gusts - wind) / wind * 100
    const gustRatios: number[] = oreVolo
      .map(h => {
        const ratio = h.windGusts && h.windSpeed > 0 ? (h.windGusts - h.windSpeed) / h.windSpeed : 0;
        return Math.max(0, ratio);
      });
    const avgGustRatio = gustRatios.length > 0 ? gustRatios.reduce((a, b) => a + b, 0) / gustRatios.length : 0;
    const turbulenceLevel: "bassa" | "moderata" | "alta" = avgGustRatio > 0.4 ? "alta" : avgGustRatio > 0.2 ? "moderata" : "bassa";

    // Flight Window
    let windowStart = best.ora;
    let windowEnd = best.ora;
    for (const t of termichePerOra) {
      if (t.rateo >= 0.5) {
        if (t.ora < windowStart) windowStart = t.ora;
        if (t.ora > windowEnd) windowEnd = t.ora;
      }
    }
    const flightWindowStr = (haTemporali || pioggiaTot > 0.3 || ventoMax > 30) ? null : `${String(windowStart).padStart(2, "0")}:00–${String(windowEnd).padStart(2, "0")}:00`;

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
      waveDiffDeg,
      turbulenceLevel,
      gustRatio: avgGustRatio,
      flightWindow: flightWindowStr,
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
          siteName={siteName}
          rainHours={rainHours}
          thunderstormHours={thunderstormHours}
          waveIndex={flightScore.waveDiffDeg != null ? (flightScore.waveDiffDeg < 30 ? "forte" : flightScore.waveDiffDeg < 60 ? "medio" : flightScore.waveDiffDeg < 90 ? "debole" : "assente") : undefined}
          waveDiffDeg={flightScore.waveDiffDeg}
          turbulenceIndex={flightScore.turbulenceLevel}
          gustRatio={flightScore.gustRatio}
          flightWindow={flightScore.flightWindow}
        />
      )}

      <HourlyTable
        dayData={dayData}
        altitude={altitude}
        selectedHour={selectedHour}
        onHourSelect={onHourSelect}
        dayLabel={dayLabel}
        siteName={siteName}
      />
    </div>
  );
}