"use client";

import React from "react";
import VentiTab from "./VentiTab";
import TermicheTab from "./TermicheTab";

interface AnalisiTabProps {
  currentData: any;
  dayData: any[];
  windProfile?: any[];
  /** Dati orari del giorno selezionato (per vento e termiche) */
  hourlyData?: any[];
  /** Ora di riferimento (default 12) */
  targetHour?: number;
}

export default function AnalisiTab({ currentData, dayData, windProfile = [], hourlyData, targetHour = 12 }: AnalisiTabProps) {
  return (
    <div className="space-y-6">
      <TermicheTab currentData={currentData} dayData={dayData} />
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