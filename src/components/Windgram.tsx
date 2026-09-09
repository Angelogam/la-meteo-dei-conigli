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
  fallbackData?: HourData[];
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
  fallbackData,
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
        lat={lat ?? DEFAULT_LAT}
        lon={lon ?? DEFAULT_LON}
        fallbackData={fallbackData}
      />
    </div>
  );
}

// Passa lat/lon come default se non forniti
const DEFAULT_LAT = 44.2587;
const DEFAULT_LON = 7.7943;