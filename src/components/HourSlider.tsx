"use client";

import React from "react";
import { Clock, Sunrise, Sunset, Sparkles } from "lucide-react";

interface HourSliderProps {
  selectedHour: number;
  onChange: (hour: number) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 – 21:00

export default function HourSlider({ selectedHour, onChange }: HourSliderProps) {
  const percent = ((selectedHour - 6) / (21 - 6)) * 100;

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-slate-700/30 rounded-2xl p-4 relative overflow-hidden animate-slide-up">
      {/* Shimmer */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-30" />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-1.5">
          <Sunrise className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Alba</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Tramonto</span>
          <Sunset className="w-4 h-4 text-orange-400" />
        </div>
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <input
          type="range"
          min={6}
          max={21}
          value={selectedHour}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-2 rounded-full appearance-none bg-slate-700 accent-orange-400 cursor-pointer"
          style={{
            background: `linear-gradient(to right, #fb923c ${percent}%, #475569 ${percent}%)`,
          }}
        />
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-600/30">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm font-black text-orange-300 tabular-nums neon-orange">
            {String(selectedHour).padStart(2, "0")}:00
          </span>
          <Sparkles className="w-3 h-3 text-yellow-400 animate-twinkle" />
        </div>
      </div>

      {/* Hour ticks */}
      <div className="flex justify-between mt-2 px-1 relative z-10">
        {HOURS.filter(h => h % 3 === 0).map((h) => (
          <button
            key={h}
            onClick={() => onChange(h)}
            className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded transition-all ${
              selectedHour === h
                ? "text-orange-300 bg-orange-900/30"
                : "text-slate-600 hover:text-slate-400"
            }`}
          >
            {String(h).padStart(2, "0")}
          </button>
        ))}
      </div>
    </div>
  );
}