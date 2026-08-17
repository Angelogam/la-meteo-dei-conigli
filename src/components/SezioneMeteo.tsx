"use client";

import React from "react";
import { DECOLLI } from "@/data/decolli";
import { useWeatherData } from "@/hooks/useWeatherData";
import MeteoTab from "@/components/MeteoTab";
import VentiTab from "@/components/VentiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";

export default function SezioneMeteo() {
  const {
    selectedId,
    dayData,
    currentData,
    thermalDelta,
    selectedDay, setSelectedDay,
    activeTab, setActiveTab,
    currentCape,
    activeModel,
  } = useWeatherData();

  const site = DECOLLI.find(d => d.id === selectedId);
  if (!site) return null;

  const siteAlt = { alt: site.altitude };
  const siteFull = { alt: site.altitude, lat: site.lat, lon: site.lon, name: site.name, exposure: site.exposure };

  return (
    <div className="space-y-3">
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

      {activeTab === "meteo" && (
        <MeteoTab
          currentData={currentData}
          dayData={dayData}
          site={siteAlt}
          thermalDelta={thermalDelta}
          stabilityIndex={{ label: "Stabile", color: "#4fc3f7" }}
          modelName={activeModel}
          cape={currentCape?.cape ?? null}
          liftedIndex={currentCape?.liftedIndex ?? null}
          cin={currentCape?.cin ?? null}
        />
      )}
      {activeTab === "venti" && (
        <VentiTab currentData={currentData} dayData={dayData} />
      )}
      {activeTab === "termiche" && (
        <TermicheTab currentData={currentData} dayData={dayData} site={siteFull} />
      )}
      {activeTab === "analisi" && (
        <AnalisiTab currentData={currentData} dayData={dayData} site={siteFull} />
      )}
    </div>
  );
}