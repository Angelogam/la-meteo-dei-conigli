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

export default function Page() {
  const {
    selectedId,
    setSelectedId,
    meteoData,
    loading,
    error,
    selectedDay,
    setSelectedDay,
    selectedHour,
    setSelectedHour,
    activeTab,
    setActiveTab,
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

  if (loading && !meteoData) return <LoadingScreen />;
  if (error && !meteoData) return <ErrorScreen error={error} onRetry={loadWeather} />;

  const siteWithAlt = {
    alt: site.altitude,
    name: site.name,
    exposure: site.exposure,
    valley: site.valley,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-emerald-500/20 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center">
              <CloudSun className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-300 to-lime-300 bg-clip-text text-transparent">
                Meteo dei Conigli
              </h1>
              <p className="text-[10px] text-slate-500">Previsioni per volo libero</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <RefreshCcw className="w-3 h-3" />
              {lastUpdate.toLocaleTimeString("it-IT")}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5">
          {/* Sidebar decolli */}
          <div className="md:sticky md:top-24">
            <DecolloList
              decolli={DECOLLI.map((d) => ({
                id: d.id,
                name: d.name,
                valley: d.valley,
                exposure: d.exposure,
                alt: d.altitude,
              }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
              currentData={currentData}
            />
          </div>

          {/* Pannello principale */}
          <div className="bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-emerald-500/20 p-5 shadow-xl shadow-emerald-500/5">
            <SiteHeader
              name={siteWithAlt.name}
              exposure={siteWithAlt.exposure}
              valley={siteWithAlt.valley}
              alt={siteWithAlt.alt}
              currentData={currentData}
            />

            {currentData && <AlertBanner alert={weatherAlert} />}

            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

            <DaySelector
              enrichedDaily={enrichedDaily}
              dateLabels={dateLabels}
              selectedDay={selectedDay}
              onSelect={(idx) => {
                setSelectedDay(idx);
                setSelectedHour(12);
              }}
            />

            <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />

            {activeTab === "meteo" && currentData && (
              <MeteoTab
                currentData={currentData}
                dayData={dayData}
                site={siteWithAlt}
                thermalDelta={thermalDelta}
                stabilityIndex={stabilityIndex}
              />
            )}

            {activeTab === "venti" && currentData && (
              <VentiTab
                currentData={currentData}
                dayData={dayData}
                windProfile={windProfile}
              />
            )}

            {activeTab === "termiche" && currentData && (
              <TermicheTab
                currentData={currentData}
                dayData={dayData}
                site={siteWithAlt}
                thermalDelta={thermalDelta}
                thermalStrength={thermalStrength}
              />
            )}

            {activeTab === "analisi" && currentData && (
              <AnalisiTab
                currentData={currentData}
                site={siteWithAlt}
                thermalDelta={thermalDelta}
                thermalStrength={thermalStrength}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 mt-8">
        <p className="text-center text-[10px] text-slate-600">
          🐰 Vola sicuro e divertiti! 🪂 · Dati da Open-Meteo · Aggiornamento automatico ogni 30 min
        </p>
      </footer>
    </div>
  );
}