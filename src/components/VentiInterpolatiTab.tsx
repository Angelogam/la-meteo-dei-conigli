"use client";

import React from "react";
import { Wind, Calendar, TrendingUp, Gauge } from "lucide-react";

interface VentiInterpolatiTabProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  oraCorrente: number;
  onOraChange: (hour: number) => void;
  siteName: string;
}

export default function VentiInterpolatiTab({
  lat,
  lon,
  quotaDecollo,
  selectedDay,
  oraCorrente,
  onOraChange,
  siteName,
}: VentiInterpolatiTabProps) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Wind className="w-4 h-4" />
        Venti interpolati - {siteName}
      </h3>
      <p className="text-slate-400 text-sm">Dati vento interpolati per quota {quotaDecollo}m</p>
    </div>
  );
}