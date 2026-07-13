"use client";

import React from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import DecolloList from "@/components/DecolloList";
import SiteHeader from "@/components/SiteHeader";
import AlertBanner from "@/components/AlertBanner";
import TabNav from "@/components/TabNav";
import DaySelector from "@/components/DaySelector";
import HourSlider from "@/components/HourSlider";
import MeteoTab from "@/components/MeteoTab";
import VentiTab from "@/components/VentiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";
import { RefreshCcw, CloudSun } from "lucide-react";

export function Page() {
  const {
    selectedId, setSelectedId,
    meteoData, loading, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    windProfile,
    weatherAlert,
    stabilityIndex,
    thermalStrength,
    loadWeather,
  } = useWeatherData();

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={loadWeather} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-emerald-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun className="w-6 h-6 text-emerald-300" />
            <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-emerald-200 to-lime-200 bg-clip-text text-transparent tracking-tight">
              Meteo dei Conigli
            </h1>
          </div>
          <button
            onClick={loadWeather}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-800/40 transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-80 shrink-0">
            <DecolloList
              decolli={DECOLLI.map(d => ({ id: d.id, name: d.name, valley: d.valley, exposure: d.exposure, alt: d.altitude }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
              currentData={currentData}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <SiteHeader
              name={site.name}
              exposure={site.exposure}
              valley={site.valley}
              alt={site.altitude}
              currentData={currentData}
            />

            <AlertBanner alert={weatherAlert} />

            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

            <DaySelector
              enrichedDaily={enrichedDaily}
              dateLabels={dateLabels}
              selectedDay={selectedDay}
              onSelect={setSelectedDay}
            />

            <HourSlider
              selectedHour={selectedHour}
              onChange={setSelectedHour}
            />

            <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-4">
              {activeTab === "meteo" && (
                <MeteoTab
                  currentData={currentData}
                  dayData={dayData}
                  site={{ alt: site.altitude }}
                  thermalDelta={thermalDelta}
                  stabilityIndex={stabilityIndex}
                />
              )}
              {activeTab === "venti" && (
                <VentiTab
                  currentData={currentData}
                  dayData={dayData}
                  windProfile={windProfile}
                />
              )}
              {activeTab === "termiche" && (
                <TermicheTab
                  currentData={currentData}
                  dayData={dayData}
                  site={{ alt: site.altitude }}
                  thermalDelta={thermalDelta}
                  thermalStrength={thermalStrength}
                />
              )}
              {activeTab === "analisi" && (
                <AnalisiTab
                  currentData={currentData}
                  site={{ name: site.name, alt: site.altitude }}
                  thermalDelta={thermalDelta}
                  thermalStrength={thermalStrength}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}