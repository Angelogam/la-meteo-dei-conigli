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
import { Sparkles, Navigation, CloudSun } from "lucide-react";

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

  const selectedDateLabel = dateLabels?.[selectedDay] || undefined;

  // Ottieni tutti i dati orari
  const hourlyData = meteoData?.hourly;

  const lastUpdateStr = lastUpdate?.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }) || "--:--";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 particle-bg">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <svg className="w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <path d="M0,600 L200,400 L400,520 L600,300 L800,450 L1000,250 L1200,380 L1440,200 L1440,900 L0,900 Z" fill="#f97316" opacity="0.8"/>
          <path d="M0,700 L300,500 L500,650 L700,450 L900,580 L1100,380 L1300,500 L1440,350 L1440,900 L0,900 Z" fill="#d97706" opacity="0.5"/>
        </svg>
      </div>

      <header className="relative text-center py-5 md:py-6 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-gradient-to-b from-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-center gap-3 md:gap-6 relative z-10">
          <div className="hidden sm:flex flex-col items-center animate-float-slow">
            <div className="relative icon-neon">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-2 border-orange-400/30 flex items-center justify-center">
                <span className="text-xl md:text-2xl" role="img" aria-label="coniglio">🐰</span>
              </div>
              <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-300 animate-twinkle" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500/25 to-amber-500/15 border border-orange-400/30 flex items-center justify-center animate-bounce-gentle">
                <Navigation className="w-4 h-4 md:w-6 md:h-6 text-orange-400 icon-neon" />
              </div>
              <h1 className="text-xl md:text-3xl font-extrabold text-gradient-orange drop-shadow-lg animate-fade-in-up">
                Meteo dei Conigli
              </h1>
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500/25 to-amber-500/15 border border-orange-400/30 flex items-center justify-center animate-bounce-gentle" style={{ animationDelay: '0.3s' }}>
                <CloudSun className="w-4 h-4 md:w-6 md:h-6 text-orange-400 icon-neon" />
              </div>
            </div>
            <p className="text-xs md:text-sm font-medium text-slate-400 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
              Previsioni per volo libero sui migliori decolli del Piemonte
              <span className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-center animate-float-slow" style={{ animationDelay: '1.5s' }}>
            <div className="relative icon-neon">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-2 border-orange-400/30 flex items-center justify-center">
                <span className="text-xl md:text-2xl" role="img" aria-label="coniglio">🐰</span>
              </div>
              <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-300 animate-twinkle" style={{ animationDelay: '1s' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex sm:hidden items-center justify-center gap-4 mt-3">
          {[0, 0.2, 0.4].map((delay, i) => (
            <div key={i} className="animate-bounce-gentle" style={{ animationDelay: `${delay}s` }}>
              <span className="text-xl" role="img" aria-label="coniglio">🐰</span>
            </div>
          ))}
        </div>

        <div className="absolute top-2 right-3 md:top-3 md:right-6 text-[10px] text-slate-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span>Aggiornato {lastUpdateStr}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-80 shrink-0">
            <DecolloList
              decolli={DECOLLI.map(d => ({ id: d.id, name: d.name, valley: d.valley, exposure: d.exposure, alt: d.altitude }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
              currentData={currentData}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-4">
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

            <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-4 md:p-5 animate-scale-in">
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
                  hourlyData={hourlyData}
                  selectedHour={selectedHour}
                  selectedDay={selectedDay}
                />
              )}
              {activeTab === "analisi" && (
                <AnalisiTab
                  currentData={currentData}
                  site={{ name: site.name, alt: site.altitude }}
                  thermalDelta={thermalDelta}
                  selectedDateLabel={selectedDateLabel}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}