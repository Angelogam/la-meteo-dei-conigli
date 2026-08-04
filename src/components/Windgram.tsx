"use client";

import React from "react";
import type { HourData } from "@/types/meteo";
import { getVoloStatus } from "@/utils/volo";

interface WindgramProps {
  data: HourData[];
  quotaDecollo: number;
}

export default function Windgram({ data, quotaDecollo }: WindgramProps) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-cyan-300 mb-3">Windgram</h3>
      <div className="space-y-2">
        {data.slice(0, 12).map((h, i) => {
          const status = getVoloStatus(h);
          return (
            <div key={i} className="flex items-center justify-between text-xs text-slate-300">
              <span className="w-12 h-4">{String(h.time.getHours()).padStart(2, "0")}:00</span>
              <span>{h.windSpeed} km/h</span>
              <span>{status.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}