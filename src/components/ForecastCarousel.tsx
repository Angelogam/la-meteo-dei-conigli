"use client";

import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, Thermometer, Umbrella, Wind } from "lucide-react";

interface DayForecast {
  day: string;
  date: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  windMax: number;
  precip: number;
  description: string;
}

interface ForecastCarouselProps {
  forecasts: DayForecast[];
  selectedDay: number;
  onDaySelect: (idx: number) => void;
}

export default function ForecastCarousel({ forecasts, selectedDay, onDaySelect }: ForecastCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 200;
      scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  if (!forecasts || forecasts.length === 0) return null;

  return (
    <div className="relative">
      <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center hover:bg-slate-700 transition-all shadow-lg -ml-3">
        <ChevronLeft className="w-4 h-4 text-slate-300" />
      </button>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide px-1">
        {forecasts.map((f, i) => {
          const isSelected = i === selectedDay;
          return (
            <button
              key={i}
              onClick={() => onDaySelect(i)}
              className={`snap-start shrink-0 w-44 rounded-2xl p-4 border-2 transition-all duration-200 text-left ${
                isSelected
                  ? "bg-emerald-900/40 border-emerald-500 shadow-lg shadow-emerald-500/10"
                  : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600/80"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-400" : "text-slate-500"}`} />
                  <span className={`text-xs font-bold ${isSelected ? "text-emerald-300" : "text-slate-300"}`}>{f.day}</span>
                </div>
                <span className="text-[10px] text-slate-500">{f.date}</span>
              </div>

              {/* Icona + temperatura */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{f.icon}</span>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-white">{Math.round(f.tempMax)}°</div>
                  <div className="text-xs text-slate-500">{Math.round(f.tempMin)}°</div>
                </div>
              </div>

              {/* Descrizione */}
              <div className="text-[10px] text-slate-400 mb-2">{f.description}</div>

              {/* Dettagli */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-700/30">
                <span className="flex items-center gap-1">
                  <Wind className="w-3 h-3 text-sky-400" />
                  {Math.round(f.windMax)} km/h
                </span>
                <span className="flex items-center gap-1">
                  <Umbrella className="w-3 h-3 text-blue-400" />
                  {f.precip.toFixed(0)} mm
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={() => scroll("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center hover:bg-slate-700 transition-all shadow-lg -mr-3">
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </button>
    </div>
  );
}