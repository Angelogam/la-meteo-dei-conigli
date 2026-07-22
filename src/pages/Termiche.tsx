"use client";

import React from "react";
import GraficoTermicoPro from "@/components/GraficoTermicoPro";

export default function Termiche() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <GraficoTermicoPro
          data={[
            { hour: "08", speed: 0.8, base: 1800, top: 2100 },
            { hour: "09", speed: 0.8, base: 1850, top: 2150 },
            { hour: "10", speed: 0.9, base: 1900, top: 2200 },
            { hour: "11", speed: 1.0, base: 1950, top: 2250 },
            { hour: "12", speed: 1.2, base: 2040, top: 2520 },
            { hour: "13", speed: 1.3, base: 2130, top: 2650 },
            { hour: "14", speed: 1.3, base: 2180, top: 2700 },
            { hour: "15", speed: 1.4, base: 2240, top: 2750 },
            { hour: "16", speed: 1.5, base: 2300, top: 2800 },
            { hour: "17", speed: 1.1, base: 2200, top: 2600 },
            { hour: "18", speed: 1.0, base: 2100, top: 2500 },
            { hour: "19", speed: 0.9, base: 2000, top: 2400 },
          ]}
        />
      </div>
    </div>
  );
}