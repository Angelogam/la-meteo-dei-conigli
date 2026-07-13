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
import HourSlider from "@/components/HourSlider";
import MeteoTab from "@/components/MeteoTab";
import VentiTab from "@/components/VentiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import { Sparkles, Navigation, CloudSun } from "lucide-react";

function formatDate(date: any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

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
  const currentDay = enrichedDaily?.[selectedDay];
  const currentDateStr = currentDay ? formatDate(currentDay.date) : "";

  // Ottieni tutti i dati orari
  const hourlyData = meteoData?.hourly;

  // Prepara site con lat/lon per TermicheTab
  const siteConCoordinate = {
    alt: site.altitude,
    lat: site.lat,
    lon: site.lon,
  };

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

      <div className="max-w-8xl mx-auto p-3 md:p-5 lg:p-6">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Sidebar decolli */}
          <div className="w-full md:w-80 shrink-0">
            <DecolloList
              decolli={DECOLLI.map(d => ({ id: d.id, name: d.name, valley: d.valley, exposure: d.exposure, alt: d.altitude }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
              currentData={currentData}
            />
          </div>

          {/* Contenuto principale */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* PREVISIONI GIORNALIERE — con selezione giorni integrata */}
            <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/40 border-2 border-emerald-500/30 rounded-3xl overflow-hidden shadow-xl shadow-emerald-500/10">
              <div className="bg-gradient-to-r from-emerald-800/40 to-amber-800/20 px-5 py-3 border-b border-emerald-500/20">
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <CloudSun className="w-5 h-5 text-yellow-300" />
                  PREVISIONI GIORNALIERE — {dateLabels[selectedDay]?.toUpperCase() || "OGGI"} {currentDateStr}
                </h2>
              </div>
              <div className="p-4">
                <PrevisioniGiornaliere
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  currentData={currentData}
                  dayData={dayData}
                  site={site}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
              </div>
            </div>

            {/* Sezione dettaglio con tab */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-white tracking-tight">DETTAGLIO</h2>
              </div>

              <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

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
                    site={siteConCoordinate}
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
    </div>
  );
}