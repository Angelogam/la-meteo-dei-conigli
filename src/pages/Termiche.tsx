"use client";

import React from "react";
import GraficoTermicoPro from "@/components/GraficoTermicoPro";

<GraficoTermicoPro
  data={[
    { hour: "09", speed: 0.7, base: 1800, top: 2100 },
    { hour: "11", speed: 0.9, base: 1850, top: 2150 },
    { hour: "13", speed: 1.1, base: 1900, top: 2200 },
    { hour: "15", speed: 1.3, base: 2000, top: 2300 },
    { hour: "17", speed: 1.6, base: 2040, top: 2520 },
    { hour: "19", speed: 1.2, base: 1950, top: 2400 },
  ]}
/>