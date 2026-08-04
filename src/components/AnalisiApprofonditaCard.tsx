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
import ProfiloVentoVerticale from "./ProfiloVentoVerticale";
import type { AnalisiApprofondita } from "@/utils/analisiApprofondita";

export default function AnalisiApprofonditaCard() {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">Analisi Approfondita</h3>
      <p className="text-slate-400 text-sm">Dettagli analisi</p>
    </div>
  );
}