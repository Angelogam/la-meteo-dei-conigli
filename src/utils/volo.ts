"use client";

import type { HourData } from "@/types/meteo";

export type VoloStatus = "ottimo" | "buono" | "discreto" | "rischioso" | "non_volabile" | "temporale" | "pioggia" | "calma";

export interface VoloStatusInfo {
  status: VoloStatus;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export function getVoloStatus(current: HourData | null | undefined): VoloStatusInfo {
  if (!current) {
    return {
      status: "non_volabile",
      label: "N/D",
      icon: "❓",
      color: "bg-slate-700 text-slate-400 border-slate-500",
      description: "Dati non disponibili",
    };
  }

  const { weatherCode, windSpeed, windGusts, precipitation } = current;

  if ([95, 96, 99].includes(weatherCode)) {
    return { status: "temporale", label: "Temporale", icon: "⛈️", color: "bg-purple-900/70 text-purple-200 border-purple-500", description: "Pericolo temporali - non volare" };
  }
  if ([80, 81, 82].includes(weatherCode) || (precipitation && precipitation > 2)) {
    return { status: "pioggia", label: "Pioggia", icon: "🌧️", color: "bg-blue-900/70 text-blue-200 border-blue-500", description: "Precipitazioni in corso" };
  }
  if ([51, 53, 55, 56, 57, 61, 63].includes(weatherCode) || (precipitation && precipitation > 0.5)) {
    return { status: "non_volabile", label: "Non volabile", icon: "🌦️", color: "bg-slate-700 text-slate-300 border-slate-500", description: "Pioggia debole o rovesci" };
  }
  if (windSpeed > 40) {
    return { status: "non_volabile", label: "Vento forte", icon: "💨", color: "bg-red-900/70 text-red-200 border-red-500", description: `Raffiche oltre ${Math.round(windSpeed)} km/h` };
  }
  if (windSpeed < 5) {
    return { status: "calma", label: "Calma", icon: "🌀", color: "bg-gray-700 text-gray-300 border-gray-500", description: "Vento troppo debole" };
  }
  if ((windGusts && windGusts > 35) || windSpeed > 30) {
    return { status: "rischioso", label: "Rischioso", icon: "⚠️", color: "bg-orange-900/70 text-orange-200 border-orange-500", description: `Raffiche fino a ${Math.round(windGusts || windSpeed + 10)} km/h` };
  }
  if (windSpeed >= 18 && windSpeed <= 25) {
    return { status: "discreto", label: "Discreto", icon: "🪁", color: "bg-amber-900/60 text-amber-200 border-amber-500", description: `Vento ${Math.round(windSpeed)} km/h - volo possibile` };
  }
  if (windSpeed >= 9 && windSpeed < 18) {
    return { status: "buono", label: "Buono", icon: "🪂", color: "bg-emerald-900/60 text-emerald-200 border-emerald-500", description: `Vento ${Math.round(windSpeed)} km/h - buone condizioni` };
  }
  if (windSpeed >= 5 && windSpeed < 9) {
    return { status: "ottimo", label: "Ottimo", icon: "🌟", color: "bg-green-900/60 text-green-200 border-green-500", description: `Vento ${Math.round(windSpeed)} km/h - condizioni perfette` };
  }
  return { status: "non_volabile", label: "N/D", icon: "❓", color: "bg-slate-700 text-slate-400 border-slate-500", description: "Dati insufficienti" };
}