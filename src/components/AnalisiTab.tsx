"use client";

import React from "react";
import DayInfoPanel from "@/components/DayInfoPanel";

interface AnalisiTabProps {
  currentData: any;
  site: { name: string; alt: number };
  thermalDelta?: number;
  thermalStrength?: number;
  selectedDateLabel?: string;
}

export default function AnalisiTab({ currentData, site, thermalDelta, thermalStrength, selectedDateLabel }: AnalisiTabProps) {
  const dayData = {
    tempMax: currentData?.tempMax,
    tempMin: currentData?.tempMin,
    windMax: currentData?.windMax,
    thermalMax: currentData?.thermalMax,
    thermalAvg: currentData?.thermalAvg,
    rainProb: currentData?.rainProb,
    uvIndex: currentData?.uvIndex,
  };

  return (
    <div>
      <DayInfoPanel
        currentData={currentData}
        dayData={dayData}
        site={site}
        selectedDate={selectedDateLabel}
      />
    </div>
  );
}