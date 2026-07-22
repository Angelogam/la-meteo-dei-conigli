"use client";

import React from "react";
import GraficoTermicoPro from "@/components/GraficoTermicoPro";

export default function Termiche() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <GraficoTermicoPro
          data={[
            { hour: "08", speed: 0.3, base: 1600, top: 1800 },
            { hour: "09", speed: 0.6, base: 1700, top: 1950 },
            { hour: "10", speed: 0.9, base: 1800, top: 2100 },
            { hour: "11", speed: 1.3, base: 1900, top: 2300 },
            { hour: "12", speed: 1.6, base: 2000, top: 2500 },
            { hour: "13", speed: 1.8, base: 2100, top: 2700 },
            { hour: "14", speed: 1.7, base: 2150, top: 2650 },
            { hour: "15", speed: 1.4, base: 2050, top: 2500 },
            { hour: "16", speed: 1.1, base: 1950, top: 2350 },
            { hour: "17", speed: 0.8, base: 1850, top: 2200 },
            { hour: "18", speed: 0.5, base: 1750, top: 2000 },
            { hour: "19", speed: 0.2, base: 1650, top: 1800 },
          ]}
        />
      </div>
    </div>
  );
}