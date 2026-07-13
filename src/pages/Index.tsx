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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
      {/* Header */}
      <header className="border-b border-emerald-500/30 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-center relative">
          {/* Coniglio sinistro con paracadute — accanto al titolo */}
          <div className="flex flex-col items-center mr-2 animate-float-left">
            <div className="relative w-12 h-14 flex items-center justify-center">
              {/* Paracadute colorato a strisce */}
              <svg viewBox="0 0 50 60" className="w-10 h-12" xmlns="http://www.w3.org/2000/svg">
                {/* Cupola principale */}
                <path d="M5 25 Q25 0 45 25 L5 25Z" fill="#ef4444" />
                {/* Striscia gialla */}
                <path d="M12 22 Q25 5 38 22 L34 17 Q25 8 16 17Z" fill="#facc15" />
                {/* Striscia verde */}
                <path d="M20 35 Q25 28 30 35 L28 30 Q25 26 22 30Z" fill="#22c55e" />
                {/* Fettucce */}
                <line x1="25" y1="25" x2="25" y2="45" stroke="#fcd34d" strokeWidth="1.5" />
                <line x1="18" y1="28" x2="25" y2="45" stroke="#fcd34d" strokeWidth="1.5" />
                <line x1="32" y1="28" x2="25" y2="45" stroke="#fcd34d" strokeWidth="1.5" />
                {/* Coniglio */}
                <text x="25" y="52" textAnchor="middle" fontSize="16">🐰</text>
              </svg>
            </div>
          </div>

          {/* Titolo centrale */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-2">
              <CloudSun className="w-6 h-6 text-emerald-300" />
              <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-emerald-200 to-lime-200 bg-clip-text text-transparent tracking-tight">
                Meteo dei Conigli
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">Previsioni per volo libero</p>
          </div>

          {/* Coniglio destro con paracadute — accanto al titolo */}
          <div className="flex flex-col items-center ml-2 animate-float-right">
            <div className="relative w-12 h-14 flex items-center justify-center">
              {/* Paracadute colorato a strisce */}
              <svg viewBox="0 0 50 60" className="w-10 h-12" xmlns="http://www.w3.org/2000/svg">
                {/* Cupola principale */}
                <path d="M5 25 Q25 0 45 25 L5 25Z" fill="#ef4444" />
                {/* Striscia gialla */}
                <path d="M12 22 Q25 5 38 22 L34 17 Q25 8 16 17Z" fill="#facc15" />
                {/* Striscia verde */}
                <path d="M20 35 Q25 28 30 35 L28 30 Q25 26 22 30Z" fill="#22c55e" />
                {/* Fettucce */}
                <line x1="25" y1="25" x2="25" y2="45" stroke="#fcd34d" strokeWidth="1.5" />
                <line x1="18" y1="28" x2="25" y2="45" stroke="#fcd34d" strokeWidth="1.5" />
                <line x1="32" y1="28" x2="25" y2="45" stroke="#fcd34d" strokeWidth="1.5" />
                {/* Coniglio */}
                <text x="25" y="52" textAnchor="middle" fontSize="16">🐰</text>
              </svg>
            </div>
          </div>

          {/* Refresh mobile */}
          <div className="sm:hidden absolute right-4">
            <span className="text-sm text-slate-400 flex items-center gap-1.5">
              <RefreshCcw className="w-4 h-4" />
              {lastUpdate.toLocaleTimeString("it-IT")}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
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
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-emerald-500/25 p-6 shadow-xl shadow-emerald-500/5">
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
        <p className="text-center text-sm text-slate-500">
          🐰 Vola sicuro e divertiti! 🪂 · Dati da Open-Meteo · Aggiornamento ogni 30 min
        </p>
      </footer>
    </div>
  );
}