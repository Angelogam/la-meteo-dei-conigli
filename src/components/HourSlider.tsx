"use client";

import React from "react";
import { Clock, Sunrise, Sunset } from "lucide-react";

interface HourSliderProps {
  selectedHour: number;
  onChange: (hour: number) => void;
}

export default function HourSlider({
  selectedHour,
  onChange,
}: HourSliderProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30 mb-4">
      <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
      <input
        type="range"
        min={6}
        max={21}
        value={selectedHour}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none bg-slate-700 accent-emerald-400 cursor-pointer"
        style={{
          background: `linear-gradient(to right, #34d399 ${((selectedHour - 6) / (21 - 6)) * 100}%, #334155 ${((selectedHour - 6) / (21 - 6)) * 100}%)`,
        }}
      />
      <span className="text-sm font-bold text-emerald-300 w-12 text-right tabular-nums">
        {String(selectedHour).padStart(2, "0")}:00
      </span>
    </div>
  );
}