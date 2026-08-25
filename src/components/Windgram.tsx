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
}

export default function Windgram({
  dayData,
  siteName,
  altitude,
  selectedHour = 13,
  onHourSelect,
}: WindgramProps) {
  return (
    <div className="w-full">
      <WindgramMatrix
        dayData={dayData}
        siteName={siteName}
        altitude={altitude}
        selectedHour={selectedHour}
        onHourSelect={onHourSelect}
      />
    </div>
  );
}