"use client";

import React from "react";
import Windgram from "./Windgram";
import { MapPin } from "lucide-react";

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
}

export default function DettaglioGiornoContent({
  site,
  selectedDay,
  selectedHour,
  onHourSelect,
}: DettaglioGiornoContentProps) {
  return (
    <div className="space-y-3">
      {/* Windgram */}
      <Windgram
        hourlyData={[]}
        site={site}
        selectedHour={selectedHour}
        onHourSelect={onHourSelect}
      />
    </div>
  );
}