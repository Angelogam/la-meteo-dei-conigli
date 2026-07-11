"use client";

import { DECOLLI, Decollo } from "@/data/decolli";
import { wic } from "@/utils/meteo";
import type { HourData } from "@/types/meteo";
import { useMemo } from "react";

interface SiteListProps {
  selected: string;
  current: HourData | null;
  onSelect: (id: string) => void;
  weatherMap?: Record<string, HourData>;
}

const diffColor = (d: number) => d <= 2 ? "#4caf50" : d <= 3 ? "#ff9800" : "#f44336";
const diffLabel = (d: number) => d <= 2 ? "Facile" : d <= 3 ? "Medio" : "Difficile";

export const SiteList = ({ selected, current, onSelect, weatherMap }: SiteListProps) => {
  return (
    <div className="bg-gray-300/80 rounded-2xl border border-gray-400/60 p-3 backdrop-blur md:h-[calc(100vh-180px)] overflow-hidden">
      <h3 className="text-lg text-red-600 mb-3 font-bold">Decolli</h3>
      <div className="overflow-y-auto h-[calc(100%-40px)] pr-1">
        {DECOLLI.map((d) => {
          const sel = d.id === selected;
          const cw = weatherMap?.[d.id]
            ? wic(weatherMap[d.id].weatherCode, weatherMap[d.id].isDay)
            : sel && current
            ? wic(current.weatherCode, current.isDay)
            : "";
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={
                "w-full text-left rounded-xl p-2.5 mb-1.5 cursor-pointer transition-colors " +
                (sel
                  ? "bg-gray-200 border border-gray-500 shadow-sm"
                  : "bg-white/70 border border-gray-300 hover:bg-white/90")
              }
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-gray-800">{d.name}</span>
                <span className="text-xs text-gray-500">{d.valley}</span>
              </div>
              <div className="flex justify-center my-1">
                <span className="text-3xl">{cw}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>{d.exposure}</span>
                <span></span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold text-white"
                  style={{ background: diffColor(d.difficulty) }}
                >
                  {diffLabel(d.difficulty)}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold text-white"
                  style={{ background: "#2196f3" }}
                >
                  {d.altitude}m
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};