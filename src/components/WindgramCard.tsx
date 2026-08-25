"use client";

import React from "react";
import WindgramMatrix from "@/components/WindgramMatrix";
import type { HourData } from "@/types/meteo";

interface WindgramCardProps {
  dayData?: HourData[];
  siteName?: string;
  altitude?: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
}

export function WindgramCard({
  dayData = [],
  siteName = "Malanotte",
  altitude = 1740,
  selectedHour = 13,
  onHourSelect,
}: WindgramCardProps) {
  return (
    <WindgramMatrix
      dayData={dayData}
      siteName={siteName}
      altitude={altitude}
      selectedHour={selectedHour}
      onHourSelect={onHourSelect}
    />
  );
}

export default WindgramCard;