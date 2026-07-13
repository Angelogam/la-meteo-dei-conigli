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
          {/* Coniglio sinistro con parapendio */}
          <div className="hidden sm:flex flex-col items-center animate-float-left absolute left-4">
            <div className="relative">
              <svg className="w-14 h-14" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Vela del parapendio */}
                <path d="M10 30 Q40 5 70 30" stroke="#4ade80" strokeWidth="3" fill="url(#grad1)" opacity="0.9"/>
                <path d="M15 30 L40 15 L65 30" stroke="#facc15" strokeWidth="1.5" fill="none" opacity="0.6"/>
                {/* Fettucce */}
                <line x1="32" y1="28" x2="40" y2="48" stroke="#fcd34d" strokeWidth="2"/>
                <line x1="48" y1="28" x2="40" y2="48" stroke="#fcd34d" strokeWidth="2"/>
                {/* Coniglio sotto */}
                <circle cx="40" cy="52" r="5" fill="#f97316" opacity="0.9"/>
                <text x="40" y="56" textAnchor="middle" fontSize="14" fill="#fff9c4">🐰</text>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a7f3d0"/>
                    <stop offset="100%" stopColor="#34d399"/>
                  </linearGradient>
                </defs>
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

          {/* Coniglio destro con parapendio */}
          <div className="hidden sm:flex flex-col items-center animate-float-right absolute right-4">
            <div className="relative">
              <svg className="w-14 h-14" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Vela del parapendio */}
                <path d="M10 30 Q40 5 70 30" stroke="#fbbf24" strokeWidth="3" fill="url(#grad2)" opacity="0.9"/>
                <path d="M15 30 L40 15 L65 30" stroke="#fef08a" strokeWidth="1.5" fill="none" opacity="0.6"/>
                {/* Fettucce */}
                <line x1="32" y1="28" x2="40" y2="48" stroke="#fde68a" strokeWidth="2"/>
                <line x1="48" y1="28" x2="40" y2="48" stroke="#fde68a" strokeWidth="2"/>
                {/* Coniglio sotto */}
                <circle cx="40" cy="52" r="5" fill="#f59e0b" opacity="0.9"/>
                <text x="40" y="56" textAnchor="middle" fontSize="14" fill="#fff9c4">🐰</text>
                <defs>
                  <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fde68a"/>
                    <stop offset="100%" stopColor="#fbbf24"/>
                  </linearGradient>
                </defs>
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