"use client";

import React from "react";
import Windgram from "./Windgram";
import type { HourData } from "@/types/meteo";

interface DettaglioGiornoContentProps {
  site: {
    name: string;
    alt: number;
    lat: number;
    lon: number;
  };
  selectedDay: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  dayData?: HourData[];
}

export default function DettaglioGiornoContent({
  site,
  selectedDay,
  selectedHour,
  onHourSelect,
  dayData = [],
}: DettaglioGiornoContentProps) {
  return (
    <div className="space-y-3">
      {/* Windgram */}
      <Windgram
        dayData={dayData}
        siteName={site.name}
        altitude={site.alt}
        selectedHour={selectedHour}
      />
    </div>
  );
}