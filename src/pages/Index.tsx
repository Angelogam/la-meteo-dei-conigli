"use client";

import React, { useState, useEffect } from "react";
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
import { Sparkles, Navigation, CloudSun, RefreshCw, Loader2, Clock, Timer } from "lucide-react";

function formatDate(date: any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function Page() {
  const {
    selectedId, setSelectedId,
    meteoData, loading, updating, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown, refreshProgress,
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

  const [animRefresh, setAnimRefresh] = useState(false);

  useEffect(() => {
    if (updating) {
      setAnimRefresh(true);
    } else {
      const timeout = setTimeout(() => setAnimRefresh(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [updating]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={loadWeather} />;

  const selectedDateLabel = dateLabels?.[selectedDay] || undefined;
  const currentDay = enrichedDaily?.[selectedDay];
  const currentDateStr = currentDay ? formatDate(currentDay.date) : "";

  const hourlyData = meteoData?.hourly;

  const siteConCoordinate = {
    alt: site.altitude,
    lat: site.lat,
    lon: site.lon,
  };

  const lastUpdateStr = lastUpdate?.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }) || "--:--";

  const countdownMin = Math.floor(countdown);
  const countdownSec = Math.round((countdown - Math.floor(countdown)) * 60);

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

        {/* INDICATORE REFRESH + COUNTDOWN — GRANDE E VISIBILE */}
        <div className="absolute top-2 right-3 md:top-4 md:right-6 flex items-center gap-3">
          <div className={`
            flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 backdrop-blur-md shadow-xl
            transition-all duration-500
            ${updating
              ? "bg-emerald-900/40 border-emerald-400/60 shadow-emerald-400/20"
              : "bg-slate-900/60 border-slate-600/40 hover:border-emerald-500/40 hover:bg-slate-800/60"
            }
          `}>
            {/* BOTTONE REFRESH */}
            <button
              onClick={loadWeather}
              disabled={updating}
              className={`
                p-2 rounded-xl transition-all duration-300
                ${updating
                  ? "bg-emerald-500/20 text-emerald-300 cursor-not-allowed"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 border border-slate-600/30 hover:border-emerald-500/30"
                }
              `}
              title="Aggiorna ora"
            >
              <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 ${updating ? "animate-spin" : ""} ${animRefresh ? "animate-spin" : ""}`} />
            </button>

            {/* PALLINO + STATO */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className={`
                    w-3 h-3 rounded-full
                    ${updating ? "bg-yellow-400 animate-pulse ring-2 ring-yellow-400/30" : "bg-emerald-400 ring-2 ring-emerald-400/20"}
                  `} />
                  <span className="text-sm md:text-base font-bold text-white tracking-tight">
                    {updating ? "AGGIORNAMENTO IN CORSO" : "DATI IN TEMPO REALE"}
                  </span>
                </div>
                <span className="text-[11px] md:text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Ultimo aggiornamento: {lastUpdateStr}
                </span>
              </div>

              {/* DIVISORE */}
              <div className="w-px h-10 bg-slate-600/40 mx-1" />

              {/* COUNTDOWN GRANDE */}
              <div className="flex items-center gap-2">
                <Timer className={`w-5 h-5 ${countdownMin <= 5 ? "text-amber-400 animate-pulse" : "text-slate-400"}`} />
                <div className="flex flex-col">
                  {updating ? (
                    <span className="text-base md:text-lg font-black text-emerald-300 tabular-nums">
                      Caricamento...
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl md:text-3xl font-black tabular-nums drop-shadow-lg ${
                        countdownMin <= 5 ? "text-amber-300" : countdownMin <= 10 ? "text-yellow-300" : "text-emerald-200"
                      }`}>
                        {countdownMin}
                      </span>
                      <span className="text-sm md:text-base font-bold text-slate-400">min</span>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 font-medium">Prossimo aggiornamento</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra di progresso refresh */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 transition-all duration-700 ease-linear"
            style={{
              width: updating ? "100%" : `${refreshProgress}%`,
              opacity: updating ? 1 : 0.6,
            }}
          />
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
            {/* Indicatore updating compatto */}
            {updating && (
              <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-500/30 text-yellow-300 text-sm animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-bold">Aggiornamento previsioni in corso...</span>
                <span className="ml-auto text-xs text-yellow-400/70 font-mono tabular-nums bg-yellow-900/30 px-3 py-1 rounded-lg">
                  00:{String(countdownSec).padStart(2, "0")}
                </span>
              </div>
            )}

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