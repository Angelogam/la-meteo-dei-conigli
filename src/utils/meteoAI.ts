"use client";

import type { HourData } from "@/types/meteo";

const TEMP_GRADIENT = 0.98;

const calcCloudBase = (temp: number, dewPoint: number) => (temp - dewPoint) * 125;

export const generateAiAnalysis = (
  hourlyData: HourData[],
  dayIdx: number
) => {
  if (!hourlyData || hourlyData.length === 0) return null;
  // ... rest of the function stays the same
  return {
    thermal: "Analisi termica...",
    altitude: "Venti in quota...",
    hourly: "Evoluzione oraria...",
    thunderstorm: "Nessun rischio temporali.",
  };
};