import React from "react";
import { DECOLLI } from "@/data/decolli";
import { useWeatherData } from "@/hooks/useWeatherData";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";

export default function SezioneMeteo() {
  const {
    selectedId,
    setSelectedId,
    loading,
    updating,
    selectedDay,
    setSelectedDay,
    selectedHour,
    setSelectedHour,
    activeTab,
    setActiveTab,
    lastUpdate,
    countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    activeModel,
    currentCape,
  } = useWeatherData();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-slate-800/40 rounded-2xl p-1 border border-slate-700/30">
        {["oggi", "domani", "dopodomani"].map((l, i) => (
          <button
            key={l}
            onClick={() => setSelectedDay(i)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              selectedDay === i
                ? "bg-gradient-to-r from-emerald-600/60 to-emerald-500/40 text-white shadow-sm border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {(["meteo", "venti", "termiche", "analisi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === t
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === "meteo" && (
        <MeteoTab
          currentData={currentData}
          dayData={dayData}
          site={{ alt: site?.altitude ?? 0, name: site?.name }}
          thermalDelta={thermalDelta}
          stabilityIndex={{ label: "Stabile", color: "#4fc3f7" }}
          modelName={activeModel}
          cape={currentCape?.cape ?? null}
          liftedIndex={currentCape?.liftedIndex ?? null}
          cin={currentCape?.cin ?? null}
        />
      )}
      {activeTab === "venti" && (
        <VentiInterpolatiTab />
      )}
      {activeTab === "termiche" && (
        <TermicheTab />
      )}
      {activeTab === "analisi" && (
        <AnalisiTab />
      )}
    </div>
  );
}