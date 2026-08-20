"use client";

import React from "react";
import ProfessionalWindgram from "./ProfessionalWindgram";

interface WindgramProps {
  hourlyData?: any[];
  site: { name: string; alt: number; lat: number; lon: number };
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
}

export default function Windgram({ site }: WindgramProps) {
  return (
    <ProfessionalWindgram
      latitude={site.lat}
      longitude={site.lon}
      altitude={site.alt}
      siteName={site.name}
    />
  );
}