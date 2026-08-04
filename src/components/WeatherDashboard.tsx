"use client";

import React from "react";
import type { HourData } from "@/types/meteo";
import HourlyTable from "@/components/HourlyTable";

interface WeatherDashboardProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  dayLabel: string;
}

export default function WeatherDashboard({ dayData, altitude, selectedHour, onHourSelect, dayLabel }: WeatherDashboardProps) {
  if (!dayData || dayData.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-center">
        <p className="text-slate-400">Nessun dato disponibile</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">Dashboard meteo</h3>
      <HourlyTable data={dayData} />
    </div>
  );
}