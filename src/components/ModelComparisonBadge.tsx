"use client";

import { Radio, Sigma } from "lucide-react";

interface ModelComparisonBadgeProps {
  confidence: number; // 0-100
  dominantModel: "GFS" | "ICON" | "AROME";
  lastUpdate: string;
}

const modelInfo = {
  GFS: { icon: "🇺🇸", label: "GFS", sublabel: "NOAA USA", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" },
  ICON: { icon: "🇩🇪", label: "ICON", sublabel: "DWD Germania", color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30" },
  AROME: { icon: "🇫🇷", label: "AROME", sublabel: "Météo-France", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
};

export default function ModelComparisonBadge({ confidence, dominantModel, lastUpdate }: ModelComparisonBadgeProps) {
  const m = modelInfo[dominantModel];
  const confColor = confidence > 80 ? "text-emerald-400" : confidence > 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl border ${m.border} ${m.bg}`}>
      {/* Modello dominante */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{m.icon}</span>
        <div>
          <p className={`font-black text-sm ${m.color}`}>{m.label}</p>
          <p className="text-slate-500 text-[10px] leading-none">{m.sublabel}</p>
        </div>
      </div>

      <div className="w-px h-8 bg-slate-700" />

      {/* Confidence */}
      <div className="flex items-center gap-2">
        <Sigma className="w-4 h-4 text-slate-400" />
        <div>
          <p className={`font-black text-sm ${confColor}`}>
            {confidence > 80 ? "Alta" : confidence > 50 ? "Media" : "Bassa"}
          </p>
          <p className="text-slate-500 text-[10px] leading-none">Confronto modelli</p>
        </div>
      </div>

      <div className="w-px h-8 bg-slate-700" />

      {/* Ultimo aggiornamento */}
      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
        <Radio className="w-3 h-3 animate-pulse" />
        <span>{lastUpdate}</span>
      </div>
    </div>
  );
}
