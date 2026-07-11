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

export const SiteList = ({ selected, current, onSelect, weatherMap = {} }: SiteListProps) => {
  return (
    <div className="bg-gray-300/80 rounded-2xl border border-gray-400/60 p-3 backdrop-blur md:h-[calc(100vh-180px)] overflow-hidden">
      <h3 className="text-xl text-red-600 mb-3 font-bold">Decolli</h3>
      <div className="overflow-y-auto h-[calc(100%-40px)] pr-1">
        {DECOLLI.map((d) => {
          const sel = d.id === selected;
          const wData = weatherMap[d.id];
          const icon = wData ? wic(wData.weatherCode, wData.isDay) : (sel && current ? wic(current.weatherCode, current.isDay) : "");
          const temp = wData ? Math.round(wData.temperature) : (sel && current ? Math.round(current.temperature) : null);
          const windSpeed = wData ? Math.round(wData.windSpeed) : (sel && current ? Math.round(current.windSpeed) : null);

          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={
                "w-full text-left rounded-xl p-3 mb-2 cursor-pointer transition-colors " +
                (sel
                  ? "bg-gray-200 border border-gray-500 shadow-sm"
                  : "bg-white/70 border border-gray-300 hover:bg-white/90")
              }
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-base text-gray-800">{d.name}</span>
                <span className="text-sm text-gray-500">{d.valley}</span>
              </div>
              {icon && (
                <div className="flex justify-center items-center gap-2 my-1.5">
                  <span className="text-4xl">{icon}</span>
                  {temp !== null && (
                    <span className="text-base font-bold text-orange-600">{temp}°C</span>
                  )}
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600 mt-1 font-medium">
                <span>{d.exposure}</span>
                <span>{d.altitude}m</span>
              </div>
              <div className="flex justify-between text-xs mt-1.5 items-center">
                <span
                  className="text-sm px-2 py-0.5 rounded-full font-semibold text-white"
                  style={{ background: diffColor(d.difficulty) }}
                >
                  {diffLabel(d.difficulty)}
                </span>
                {windSpeed !== null && (
                  <span className="text-sm font-bold text-blue-700">
                    Vento {windSpeed} km/h
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};