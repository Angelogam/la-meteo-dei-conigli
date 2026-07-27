"use client";

import React from "react";
import TermicheAquila from "@/components/ProfiloVerticalePro";

export default function ProfiloVerticale() {
  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <TermicheAquila
        data={[
          { hour: "08:00", speed: 0.7, base: 1800, top: 2100 },
          { hour: "11:00", speed: 0.9, base: 1850, top: 2150 },
          { hour: "13:00", speed: 1.1, base: 1900, top: 2200 },
          { hour: "15:00", speed: 1.3, base: 2000, top: 2300 },
          { hour: "17:00", speed: 1.6, base: 2040, top: 2520 },
          { hour: "19:00", speed: 1.2, base: 1950, top: 2400 },
        ]}
      />
    </div>
  );
}