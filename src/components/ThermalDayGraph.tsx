"use client";

import React from "react";
import type { HourData } from "@/types/meteo";

interface ThermalDayGraphProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  thermalDelta: number;
}

export default function ThermalDayGraph(_props: ThermalDayGraphProps) {
  return null;
}