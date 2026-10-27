"use client";

import React from "react";
import WindgramMatrix from "@/components/WindgramMatrix";
import AlpiumWindgram from "@/components/AlpiumWindgram";
import type { HourData } from "@/types/meteo";

interface WindgramCardProps {
  dayData?: HourData[];
  siteName?: string;
  altitude?: number;
  lat?: number;
  lon?: number;
  selectedDay?: number;
  dateLabel?: string;
  variant?: "matrix" | "alpium";
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
}

export function WindgramCard({
  dayData = [],
  siteName = "Malanotte",
  altitude = 1740,
  lat = 44.2587,
  lon = 7.7943,
  selectedDay = 0,
  dateLabel,
  variant = "matrix",
  selectedHour = 13,
  onHourSelect,
}: WindgramCardProps) {
  if (variant === "alpium") {
    return (
      <AlpiumWindgram
        siteName={siteName}
        siteAlt={altitude}
        lat={lat}
        lon={lon}
        selectedDay={selectedDay}
        dayData={dayData}
        dateLabel={dateLabel}
      />
    );
  }

  return (
    <WindgramMatrix
      dayData={dayData}
      siteName={siteName}
      altitude={altitude}
      lat={lat}
      lon={lon}
      selectedDay={selectedDay}
      dateLabel={dateLabel}
      selectedHour={selectedHour}
      onHourSelect={onHourSelect}
    />
  );
}

export default WindgramCard;
