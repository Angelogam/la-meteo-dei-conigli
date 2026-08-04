"use client";

import React from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface HourlyTableProps {
  data: HourData[];
}

export default function HourlyTable({ data }: HourlyTableProps) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">Tabella oraria</h3>
      <div className="space-y-2">
        {data.slice(0, 12).map((h, i) => (
          <div key={i} className="flex items-center justify-between text-xs text-slate-300">
            <span>{String(h.time.getHours()).padStart(2, "0")}:00</span>
            <span>{h.temperature}°C</span>
            <span>{h.windSpeed} km/h</span>
          </div>
        ))}
      </div>
    </div>
  );
}