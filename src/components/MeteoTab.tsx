"use client";

import React from "react";
import {
  CloudSun, ArrowUp, TrendingUp,
  Sun, Eye, AlertTriangle, Thermometer, Calendar, MapPin
} from "lucide-react";

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number; name?: string };
  thermalDelta: number;
  stabilityIndex: { label: string; color: string };
  modelName?: string;
  cape?: number;
  liftedIndex?: number;
  cin?: number;
}

export default function MeteoTab({
  currentData, dayData, site, thermalDelta, stabilityIndex, modelName, cape, liftedIndex, cin
}: MeteoTabProps) {
  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <CloudSun className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato meteo per {site?.name || "questo decollo"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{site?.name || "Decollo"}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</span>
            <span className="text-slate-600">·</span>
            <span>{site?.alt || 0}m</span>
          </div>
        </div>
      </div>
    </div>
  );
}