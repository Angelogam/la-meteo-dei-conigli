"use client";

import React from "react";
import { Wind, TrendingUp, ArrowUpDown } from "lucide-react";

interface WindLevel {
  height: number;
  speed: number;
  dir: number;
}

interface WindProfileProps {
  windProfile: WindLevel[];
  groundSpeed?: number;
  groundDir?: number;
}

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "—";
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

// Quote standard da mostrare
const QUOTE_STANDARD = [
  { label: "Suolo (10m)", height: 0 },
  { label: "500m", height: 500 },
  { label: "1000m", height: 1000 },
  { label: "1500m", height: 1500 },
  { label: "2000m", height: 2000 },
  { label: "2500m", height: 2500 },
  { label: "3000m", height: 3000 },
  { label: "3500m", height: 3500 },
  { label: "4000m", height: 4000 },
];

export default function WindProfileComponent({ windProfile, groundSpeed, groundDir }: WindProfileProps) {
  if (!windProfile || windProfile.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Nessun dato vento in quota disponibile.
      </div>
    );
  }

  // Trova la velocità massima per la scala del grafico
  const maxSpeed = Math.max(
    ...windProfile.map(w => w.speed || 0),
    groundSpeed || 0,
    1
  );

  // Costruisce i dati per ogni quota standard
  const rows = QUOTE_STANDARD.map((q) => {
    if (q.height === 0) {
      return {
        alt: 0,
        label: q.label,
        speed: groundSpeed || windProfile[0]?.speed || 0,
        dir: groundDir || windProfile[0]?.dir || 0,
        isGround: true,
      };
    }

    // Trova il livello più vicino per questa quota
    const closest = windProfile.reduce((best, current) => {
      if (!current.speed && !current.dir) return best;
      const bestDiff = Math.abs(best.height - q.height);
      const currentDiff = Math.abs(current.height - q.height);
      return currentDiff < bestDiff && current.speed != null ? current : best;
    }, windProfile[0]);

    return {
      alt: q.height,
      label: q.label,
      speed: closest?.speed || 0,
      dir: closest?.dir || 0,
      isGround: false,
    };
  });

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-slate-700/40 bg-slate-800/30">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/30">
        <Wind className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-bold text-slate-200 tracking-wide">Profilo vento verticale</span>
        <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">
          {windProfile.length} livelli
        </span>
      </div>
      <div className="space-y-0.5">
        {rows.map((r, idx) => {
          const pct = maxSpeed > 0 ? (r.speed / maxSpeed) * 100 : 10;
          const barColor =
            r.speed < 10 ? "bg-green-400" :
            r.speed < 18 ? "bg-lime-400" :
            r.speed < 25 ? "bg-amber-400" :
            r.speed < 35 ? "bg-orange-400" :
            "bg-red-400";

          return (
            <div key={r.alt} className={`grid grid-cols-[100px_1fr_80px] gap-3 items-center py-1.5 ${
              r.isGround ? "bg-slate-700/30 rounded-lg px-2" : ""
            }`}>
              {/* Etichetta quota */}
              <span className={`text-xs font-semibold tabular-nums ${
                r.isGround ? "text-green-300" : "text-slate-300"
              }`}>
                {r.label}
              </span>

              {/* Barra velocità */}
              <div className="flex items-center gap-2">
                <div className="h-6 bg-slate-700/60 rounded-full overflow-hidden flex-1">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-2 transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.max(pct, 15)}%` }}
                  >
                    <span className="text-[10px] text-white font-bold drop-shadow-md tabular-nums">
                      {r.speed.toFixed(1)}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 w-8">km/h</span>
              </div>

              {/* Direzione */}
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-sm tabular-nums font-bold text-slate-200">{getWindDirName(r.dir)}</span>
                <span className="text-sm text-slate-400">{getWindArrow(r.dir)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="px-4 py-2.5 border-t border-slate-700/30 flex flex-wrap gap-3 text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span>{'<'}10 km/h</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-lime-400" />
          <span>10-18</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>18-25</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
          <span>25-35</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span>{'>'}35</span>
        </div>
      </div>
    </div>
  );
}