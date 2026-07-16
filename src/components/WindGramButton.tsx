"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, X } from "lucide-react";
import WindGramReal from "./WindGramPro";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface WindGramButtonProps {
  dayData: HourData[];
  siteAltitude: number;
  siteName?: string;
}

export default function WindGramButton({ dayData, siteAltitude, siteName }: WindGramButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const windGramData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    const hours: string[] = [];
    const gradient: number[] = [];
    const windSpeed: number[] = [];
    const cloudBase: number[] = [];
    const zeroThermic: number[] = [];
    const thermalTop: number[] = [];
    const cloudCover: number[] = [];
    const windDir: number[] = [];

    const ore = dayData
      .filter((h) => {
        const hh = h.time.getHours();
        return hh >= 8 && hh <= 19;
      })
      .sort((a, b) => a.time.getHours() - b.time.getHours());

    if (ore.length === 0) return null;

    const dataStr = ore[0].time.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    for (const h of ore) {
      hours.push(`${String(h.time.getHours()).padStart(2, "0")}:00`);

      // Gradiente reale
      let grad = 0.98;
      if (h.temp80m != null) {
        grad = ((h.temperature - h.temp80m) / 78) * 100;
      } else if (h.temp120m != null) {
        grad = ((h.temperature - h.temp120m) / 118) * 100;
      }
      gradient.push(Math.round(grad * 100) / 100);

      windSpeed.push(Math.round(h.windSpeed));
      cloudCover.push(h.cloudCover);
      windDir.push(h.windDir);

      // Base nuvole (LCL)
      const spread = h.temperature - h.dewPoint;
      const base = Math.max(200, Math.min(3000, Math.round(spread * 125)));
      cloudBase.push(base + siteAltitude);

      // Zero termico
      const zero = Math.max(0, Math.round(siteAltitude + h.temperature / 0.0098));
      zeroThermic.push(zero);

      // Top termico da calcolaTermiche
      const termiche = calcolaTermiche(h, siteAltitude);
      thermalTop.push(termiche.top);
    }

    return {
      hours,
      gradient,
      windSpeed,
      cloudBase,
      zeroThermic,
      thermalTop,
      cloudCover,
      windDir,
      date: dataStr,
      location: siteName || "",
    };
  }, [dayData, siteAltitude, siteName]);

  if (!windGramData || windGramData.hours.length < 3) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 shadow-lg shadow-orange-500/20 transition-all"
      >
        <BarChart3 className="w-4 h-4" />
        WindGram
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <WindGramReal data={windGramData} />
          </div>
        </div>
      )}
    </>
  );
}