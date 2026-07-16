"use client";

import React, { useEffect, useState } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import DecolloList from "@/components/DecolloList";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import MeteoTab from "@/components/MeteoTab";
import VentiTab from "@/components/VentiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";
import WindGramButton from "@/components/WindGramButton";
import { Menu, X, MapPin, Mountain } from "lucide-react";

const Index = () => {
  const {
    selectedId, setSelectedId,
    loading, updating, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown,
    site, dayData, currentData,
    thermalDelta, enrichedDaily, dateLabels,
    loadWeather, allDailyData, allHourlyData,
    activeModel, currentCape,
  } = useWeatherData();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading && !dayData.length) {
    return <LoadingScreen />;
  }

  if (error && !dayData.length) {
    return <ErrorScreen error={error} onRetry={loadWeather} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-6 py-4 md:py-6">
        {/* Sidebar mobile toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800/80 border border-slate-700/50 text-white mb-3 w-full"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="flex-1 text-left">{site?.name || "Decolli"} <span className="text-slate-500">· {site?.altitude}m</span></span>
          <Mountain className="w-4 h-4 text-amber-400" />
        </button>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Sidebar decolli */}
          <aside className={`${
            sidebarOpen ? "fixed inset-0 z-40 bg-slate-950/95 p-4 overflow-auto" : "hidden"
          } md:block md:w-72 lg:w-80 shrink-0`}>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden w-full mb-3 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-bold"
              >
                ✕ Chiudi
              </button>
            )}
            <DecolloList
              decolli={DECOLLI}
              selectedId={selectedId}
              onSelect={(id) => { setSelectedId(id); setSidebarOpen(false); }}
              allDailyData={allDailyData}
              allHourlyData={allHourlyData}
            />
          </aside>

          {/* Contenuto principale */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header del sito */}
            <SiteHeader
              name={site.name}
              exposure={site.exposure}
              valley={site.valley}
              alt={site.altitude}
              currentData={currentData}
            />

            {/* Timer aggiornamento */}
            <UpdateTimer
              lastUpdate={lastUpdate}
              countdown={countdown}
              updating={updating}
              onRefresh={loadWeather}
            />

            {/* WindGramButton con dayData, selectedDay, lat/lon */}
            <div className="flex justify-end">
              <WindGramButton
                dayData={dayData}
                siteAltitude={site.altitude}
                siteName={site.name}
                lat={site.lat}
                lon={site.lon}
                selectedDay={selectedDay}
              />
            </div>

            {/* Previsioni Giornaliere */}
            <PrevisioniGiornaliere
              enrichedDaily={enrichedDaily}
              dateLabels={dateLabels}
              currentData={currentData}
              dayData={dayData}
              site={{
                name: site.name,
                altitude: site.altitude,
                exposure: site.exposure,
              }}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />

            {/* Selettore tab */}
            <div className="space-y-3">
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
                  site={{ alt: site.altitude }}
                  thermalDelta={thermalDelta}
                  stabilityIndex={{ label: "Stabile", color: "#4fc3f7" }}
                  modelName={activeModel}
                  cape={currentCape?.cape ?? null}
                  liftedIndex={currentCape?.liftedIndex ?? null}
                  cin={currentCape?.cin ?? null}
                />
              )}
              {activeTab === "venti" && (
                <VentiTab
                  currentData={currentData}
                  dayData={dayData}
                  lat={site.lat}
                  lon={site.lon}
                  selectedDay={selectedDay}
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
                  site={{ alt: site.altitude, lat: site.lat, lon: site.lon, name: site.name, exposure: site.exposure }}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MadeWithDyad />
    </div>
  );
};

export default Index;