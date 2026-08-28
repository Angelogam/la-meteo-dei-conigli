"use client";

import React from "react";
import WindgramMatrix from "@/components/WindgramMatrix";
import type { HourData } from "@/types/meteo";

interface WindgramProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
  selectedDay?: number;
  dateLabel?: string;
  lat?: number;
  lon?: number;
}

export default function Windgram({
  dayData,
  siteName,
  altitude,
  selectedHour = 13,
  onHourSelect,
  selectedDay = 0,
  dateLabel = "",
  lat,
  lon,
}: WindgramProps) {
  return (
    <div className="w-full">
      <WindgramMatrix
        dayData={dayData}
        siteName={siteName}
        altitude={altitude}
        selectedHour={selectedHour}
        onHourSelect={onHourSelect}
        selectedDay={selectedDay}
        dateLabel={dateLabel}
        lat={lat}
        lon={lon}
      />
    </div>
  );
}