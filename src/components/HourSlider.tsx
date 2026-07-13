"use client";

import React from "react";
import { Clock, Sunrise, Sunset, Sparkles } from "lucide-react";

interface HourSliderProps {
  selectedHour: number;
  onChange: (hour: number) => void;
}

export default function HourSlider({
  selectedHour,
  onChange,
}: HourSliderProps) {
  // Calcola percentuale per gradiente
  const percent = ((selectedHour - 6) / (21 - 6)) * 100;

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30 mb-4 card-hover relative overflow-hidden">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none" />
      
      <Sunrise className="w-4 h-4 text-amber-400 shrink-0 relative z-10" />
      <input
        type="range"
        min={6}
        max={21}
        value={selectedHour}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-2 rounded-full appearance-none bg-slate-700 accent-orange-400 cursor-pointer relative z-10"
        style={{
          background: `linear-gradient(to right, #fb923c ${percent}%, #334155 ${percent}%)`,
        }}
      />
      <Sunset className="w-4 h-4 text-orange-400 shrink-0 relative z-10" />
      <div className="flex items-center gap-1.5 relative z-10">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-sm font-bold text-orange-300 w-12 text-right tabular-nums text-glow">
          {String(selectedHour).padStart(2, "0")}:00
        </span>
      </div>
    </div>
  );
}