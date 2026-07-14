"use client";

import React from "react";
import VentiTab from "./VentiTab";
import TermicheTab from "./TermicheTab";

interface AnalisiTabProps {
  currentData: any;
  dayData: any[];
  windProfile?: any[];
  hourlyData?: any[];
  targetHour?: number;
  site?: { alt: number; lat?: number; lon?: number };
}

export default function AnalisiTab({ currentData, dayData, windProfile = [], hourlyData, targetHour = 12, site }: AnalisiTabProps) {
  return (
    <div className="space-y-6">
      <TermicheTab currentData={currentData} dayData={dayData} site={site} />
      <VentiTab 
        currentData={currentData} 
        dayData={dayData} 
        windProfile={windProfile} 
        hourlyData={hourlyData} 
        targetHour={targetHour} 
      />
    </div>
  );
}