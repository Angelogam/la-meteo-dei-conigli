"use client";

import React, { useState } from "react";
import Logo from "./components/Logo";
import MeteoWidget from "./components/MeteoWidget";
import TabNav from "./components/TabNav";
import VentiTab from "./components/VentiTab";
import TermicheTab from "./components/TermicheTab";
import AnalisiTab from "./components/AnalisiTab";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("meteo");
  const [dayData, setDayData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [site, setSite] = useState<any>(null);
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  const handleDataLoaded = (data: any) => {
    setDayData(data.dayData || []);
    setHourlyData(data.hourlyData || []);
    setCurrent(data.current || null);
    setSite(data.site || null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-4xl mx-auto">
      <div className="space-y-4">
        <Logo />
        
        {/* Mostra sempre i dati meteo */}
        <MeteoWidget
          onDataLoaded={handleDataLoaded}
          units={units}
          onUnitsChange={setUnits}
        />

        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-4">
          {activeTab === "meteo" && (
            <div className="grid grid-cols-1 gap-4">
              <VentiTab
                dayData={dayData}
                site={site}
                hourlyData={hourlyData}
                current={current}
                units={units}
              />
              <TermicheTab
                dayData={dayData}
                site={site}
                hourlyData={hourlyData}
                current={current}
              />
              <AnalisiTab
                dayData={dayData}
                site={site}
                hourlyData={hourlyData}
                current={current}
              />
            </div>
          )}
          {activeTab === "venti" && (
            <VentiTab
              dayData={dayData}
              site={site}
              hourlyData={hourlyData}
              current={current}
              units={units}
            />
          )}
          {activeTab === "termiche" && (
            <TermicheTab
              dayData={dayData}
              site={site}
              hourlyData={hourlyData}
              current={current}
            />
          )}
          {activeTab === "analisi" && (
            <AnalisiTab
              dayData={dayData}
              site={site}
              hourlyData={hourlyData}
              current={current}
            />
          )}
        </div>
      </div>
    </div>
  );
}