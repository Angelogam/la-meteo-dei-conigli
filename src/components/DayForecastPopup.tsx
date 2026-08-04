import React from "react";
import { X, Wind, Thermometer, CloudRain, Droplets, Gauge } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { getVoloStatus } from "@/utils/volo";

export default function DayForecastPopup() {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">Previsione giorno</h3>
      <p className="text-slate-400 text-sm">Dettaglio previsione</p>
    </div>
  );
}