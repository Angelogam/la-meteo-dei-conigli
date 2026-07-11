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

// Calcola volabilità in percentuale e rischio temporale in base ai dati meteo
const calcolaVolabilita = (data: HourData): { percentuale: number; rischioTemporale: string } => {
  const { weatherCode, windSpeed, precipitationProbability, windGusts } = data;
  
  // Partiamo da 100%
  let score = 100;
  let rischioTemporale = "Assente";
  
  // Penalità per pioggia/neve (weatherCode)
  if (weatherCode >= 61 && weatherCode <= 67) score -= 40; // Pioggia
  if (weatherCode >= 71 && weatherCode <= 77) score -= 30; // Neve
  if (weatherCode >= 80 && weatherCode <= 82) score -= 35; // Rovesci
  if (weatherCode >= 95) { // Temporale
    score -= 50;
    rischioTemporale = "Alto";
  }
  if (weatherCode >= 96) score -= 20; // Grandine
  
  // Vento troppo forte o troppo debole
  if (windSpeed < 8) score -= 20;
  if (windSpeed > 40) score -= 40;
  if (windSpeed > 50) score -= 30;
  
  // Raffiche
  if (windGusts && windGusts > 50) score -= 20;
  
  // Probabilità di precipitazione
  if (precipitationProbability) {
    if (precipitationProbability > 70) {
      score -= 30;
      if (rischioTemporale === "Assente") rischioTemporale = "Medio";
    } else if (precipitationProbability > 40) {
      score -= 15;
    }
  }
  
  // Nebbia (weatherCode 45, 48)
  if (weatherCode === 45 || weatherCode === 48) {
    score -= 35;
    if (rischioTemporale === "Assente") rischioTemporale = "Medio";
  }
  
  return {
    percentuale: Math.max(0, Math.min(100, score)),
    rischioTemporale
  };
};

const volabilitaColor = (p: number) => {
  if (p >= 70) return "#4caf50";
  if (p >= 40) return "#ff9800";
  return "#f44336";
};

export const SiteList = ({ selected, current, onSelect, weatherMap = {} }: SiteListProps) => {
  return (
    <div className="bg-gray-300/80 rounded-2xl border border-gray-400/60 p-3 backdrop-blur md:h-[calc(100vh-180px)] overflow-hidden">
      <h3 className="text-xl text-red-600 mb-3 font-bold">Decolli</h3>
      <div className="overflow-y-auto h-[calc(100%-40px)] pr-1">
        {DECOLLI.map((d) => {
          const sel = d.id === selected;
          const wData = weatherMap[d.id];
          const data = wData || (sel && current ? current : null);
          const vol = data ? calcolaVolabilita(data) : null;
          const temp = data ? Math.round(data.temperature) : null;
          const windSpeed = data ? Math.round(data.windSpeed) : null;

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
              {vol && (
                <div className="flex justify-center items-center gap-3 my-1.5">
                  <span
                    className="text-base font-bold text-white px-3 py-1 rounded-full"
                    style={{ background: volabilitaColor(vol.percentuale) }}
                  >
                    {vol.percentuale}%
                  </span>
                  {temp !== null && (
                    <span className="text-base font-bold text-orange-600">{temp}°C</span>
                  )}
                </div>
              )}
              {vol && vol.rischioTemporale !== "Assente" && (
                <div className="flex justify-center mb-1">
                  <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                    ⚡ Rischio {vol.rischioTemporale}
                  </span>
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