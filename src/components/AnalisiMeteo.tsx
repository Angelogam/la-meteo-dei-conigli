import React from "react";
import {
  Sun,
  Thermometer,
  Wind,
  Cloud,
  CloudRain,
  CloudLightning,
  TrendingUp,
  Activity,
  Eye,
  Droplets,
  Gauge,
  Zap,
  Info,
  Calendar,
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaAnalisiApprofondita } from "@/utils/analisiApprofondita";

export default function AnalisiMeteo() {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Sun className="w-4 h-4" />
        Analisi Meteo
      </h3>
      <p className="text-slate-400 text-sm">Analisi approfondita</p>
    </div>
  );
}