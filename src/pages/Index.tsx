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
import DayInfoPanel from "@/components/DayInfoPanel";

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
      {/* Header con titolo centrale e parapendio laterali */}
      <header className="text-center py-4 border-b border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-center gap-3 md:gap-6">
          {/* Coniglio sinistro con paracadute colorato piccolo */}
          <div className="hidden sm:flex flex-col items-center animate-float-left">
            <div className="relative">
              <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 6C14 6 2 16 2 30h8c0-10 10-16 22-16s22 6 22 16h8c0-14-12-24-30-24z" fill="#f97316" opacity="0.8"/>
                <path d="M12 30C12 20 20 14 32 14s20 6 20 16" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.5"/>
                <path d="M22 30C22 22 26 16 32 16s10 6 10 14" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6"/>
                <path d="M8 30C8 22 16 14 32 14s24 8 24 16" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.4"/>
                <line x1="32" y1="30" x2="32" y2="46" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.7"/>
                <circle cx="32" cy="48" r="3" fill="#f97316" opacity="0.9"/>
              </svg>
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-lg animate-hop">🐰</span>
            </div>
          </div>

          {/* Titolo centrale */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center justify-center gap-2.5">
              <span className="text-2xl md:text-3xl animate-bounce">🪂</span>
              <span className="text-xl md:text-3xl font-extrabold bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent drop-shadow-lg">
                Meteo dei Conigli
              </span>
              <span className="text-2xl md:text-3xl animate-pulse">🪂</span>
            </div>
            <p className="text-xs md:text-sm font-medium text-slate-400">
              Previsioni per volo libero - Open-Meteo - SHV FSVL Style
            </p>
          </div>

          {/* Coniglio destro con paracadute colorato piccolo */}
          <div className="hidden sm:flex flex-col items-center animate-float-right">
            <div className="relative">
              <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 6C14 6 2 16 2 30h8c0-10 10-16 22-16s22 6 22 16h8c0-14-12-24-30-24z" fill="#f97316" opacity="0.8"/>
                <path d="M12 30C12 20 20 14 32 14s20 6 20 16" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.5"/>
                <path d="M22 30C22 22 26 16 32 16s10 6 10 14" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6"/>
                <path d="M8 30C8 22 16 14 32 14s24 8 24 16" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.4"/>
                <line x1="32" y1="30" x2="32" y2="46" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.7"/>
                <circle cx="32" cy="48" r="3" fill="#f97316" opacity="0.9"/>
              </svg>
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-lg animate-hop" style={{ animationDelay: '0.3s' }}>🐰</span>
            </div>
          </div>
        </div>

        {/* Conigli mobili separati per mobile */}
        <div className="flex sm:hidden items-center justify-center gap-3 mt-2">
          <span className="text-xl animate-hop">🐰</span>
          <span className="text-lg text-orange-400 font-bold">🪂</span>
          <span className="text-xl animate-hop" style={{ animationDelay: '0.3s' }}>🐰</span>
        </div>
      </header>

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

            <DayInfoPanel
              currentData={currentData}
              dayData={dayData}
              site={{ name: site.name, alt: site.altitude }}
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