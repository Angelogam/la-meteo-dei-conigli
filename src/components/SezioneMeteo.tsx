"use client";

import React, { useState, useMemo } from "react";
import { DECOLLI } from "@/data/decolli";
import { useWeatherData } from "@/hooks/useWeatherData";
import MeteoTab from "./MeteoTab";
import VentiTab from "./VentiTab";
import TermicheTab from "./TermicheTab";
import AnalisiTab from "./AnalisiTab";

export default function SezioneMeteo() {
  const {
    selectedId, setSelectedId,
    dayData,
    currentData,
    hourlyData,
    dailyData,
    thermalDelta,
    enrichedDaily,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
  } = useWeatherData();

  const site = DECOLLI.find(d => d.id === selectedId);
  if (!site) return null;

  return (
    <div className="space-y-3">
      {/* Tabs giorno */}
      <div className="flex items-center gap-2 bg-slate-800/40 rounded-2xl p-1 border border-slate-700/30">
        {["oggi", "domani", "dopodomani"].map((label, idx) => (
          <button
            key={label}
            onClick={() => setSelectedDay(idx)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              selectedDay === idx
                ? "bg-gradient-to-r from-emerald-600/60 to-emerald-500/40 text-white shadow-sm border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5">
        {[
          { id: "meteo" as const, label: "Meteo" },
          { id: "venti" as const, label: "Venti" },
          { id: "termiche" as const, label: "Termiche" },
          { id: "analisi" as const, label: "Analisi" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenuto */}
      {activeTab === "meteo" && (
        <MeteoTab 
          currentData={currentData} 
          dayData={dayData} 
          site={{ alt: site.altitude }}
          thermalDelta={thermalDelta}
          stabilityIndex={{ label: "Stabile", color: "#4caf50" }}
        />
      )}
      {activeTab === "venti" && (
        <VentiTab 
          currentData={currentData} 
          dayData={dayData} 
          windProfile={[]} 
          hourlyData={hourlyData} 
          targetHour={12} 
        />
      )}
      {activeTab === "termiche" && (
        <TermicheTab 
          currentData={currentData} 
          dayData={dayData} 
          site={{ alt: site.altitude, lat: site.lat, lon: site.lon }} 
        />
      )}
      {activeTab === "analisi" && (
        <AnalisiTab 
          currentData={currentData} 
          dayData={dayData}
          windProfile={[]}
          hourlyData={hourlyData}
          targetHour={12}
          site={{ alt: site.altitude, lat: site.lat, lon: site.lon }}
        />
      )}
    </div>
  );
}