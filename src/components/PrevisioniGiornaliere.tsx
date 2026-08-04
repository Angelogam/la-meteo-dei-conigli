"use client";

import React, { useMemo } from "react";
import { Calendar, Thermometer, Umbrella, Sun, Wind } from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: any[];
  dateLabels: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure?: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
  nomeDecollo?: string;
}

export default function PrevisioniGiornaliere({ enrichedDaily, dateLabels, currentData, dayData, site, selectedDay, onSelectDay, nomeDecollo }: PrevisioniGiornaliereProps) {
  if (!enrichedDaily || enrichedDaily.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-base">Caricamento previsioni...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-4 py-2 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-emerald-300">{site?.name ?? "Decollo"} — Dati reali Open-Meteo</span>
      </div>
    </div>
  );
}