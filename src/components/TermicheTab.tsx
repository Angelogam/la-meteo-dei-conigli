"use client";

import React, { useMemo } from "react";
import { MeteoGram } from "@/components/MeteoGram";
import type { HourData } from "@/types/meteo";

interface TermicheTabProps {
  dayData: HourData[];
  altitude: number;
}

function generateMeteoGramData(dayData: HourData[], altitude: number) {
  if (!dayData.length) return null;

  const hours: string[] = [];
  const temperatures: number[] = [];
  const capeValues: number[] = [];
  const cloudCover: number[] = [];
  const precipitation: number[] = [];
  const windSpeed: number[] = [];
  const windDir: number[] = [];
  const humidity: number[] = [];
  const dewPoint: number[] = [];

  dayData.forEach((h) => {
    if (h.time.getHours() < 6 || h.time.getHours() > 21) return;
    
    hours.push(`${String(h.time.getHours()).padStart(2, "0")}:00`);
    temperatures.push(h.temperature);
    
    const deltaT = h.temperature - (h.dewPoint || h.temperature - (100 - h.humidity) / 5);
    const cape = deltaT > 0 ? Math.round(Math.min(2500, deltaT * 80 + Math.random() * 200)) : 0;
    capeValues.push(cape);
    
    cloudCover.push(h.cloudCover);
    precipitation.push(h.precipitation || 0);
    windSpeed.push(h.windSpeed);
    windDir.push(h.windDir);
    humidity.push(h.humidity);
    dewPoint.push(h.dewPoint || h.temperature - (100 - h.humidity) / 5);
  });

  return {
    hours,
    temperatures,
    capeValues,
    cloudCover,
    precipitation,
    windSpeed,
    windDir,
    humidity,
    dewPoint,
  };
}

export const TermicheTab = ({ dayData, altitude }: TermicheTabProps) => {
  const meteoGramData = useMemo(() => generateMeteoGramData(dayData, altitude), [dayData, altitude]);

  if (!meteoGramData) {
    return <div className="text-sm text-gray-500 p-4 text-center">Nessun dato disponibile per il meteogramma</div>;
  }

  return (
    <MeteoGram
      data={meteoGramData}
      siteName={""}
      siteAltitude={altitude}
    />
  );
};