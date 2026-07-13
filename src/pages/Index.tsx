"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { Sparkles, Navigation, CloudSun, RefreshCw, Loader2, Clock, Timer, TrendingUp, Wind, Thermometer, ChevronDown } from "lucide-react";

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
  const mainRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 overflow-x-hidden">
      {/* Particle background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500 blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-orange-500 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-emerald-500/20">
        <div className="max-w-8xl mx-auto px-3 md:px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-700/20 border border-emerald-400/40 flex items-center justify-center animate-pulse-glow">
              <Navigation className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-white neon-green tracking-tight">
                METEO CONIGLI
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                Volo libero Piemonte
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-1 ring-emerald-400/30" />
              <span className="text-[10px] text-slate-300 font-bold tracking-wider uppercase">Live</span>
              <span className="text-[10px] text-slate-500">·</span>
              <span className="text-[10px] text-slate-400 tabular-nums">{lastUpdateStr}</span>
            </div>
            <button
              onClick={loadWeather}
              disabled={updating}
              className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:bg-slate-700/60 hover:border-emerald-500/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-300 ${updating ? "animate-spin" : ""} ${animRefresh ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Progress bar refresh */}
        <div className="h-0.5 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 transition-all duration-700"
            style={{ width: updating ? "100%" : `${refreshProgress}%`, opacity: updating ? 1 : 0.4 }}
          />
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-8xl mx-auto p-3 md:p-5 lg:p-6" ref={mainRef}>
        <div className="flex flex-col lg:flex-row gap-5">

          {/* ===== SIDEBAR DECOLLI ===== */}
          <div className="w-full lg:w-80 shrink-0">
            <DecolloList
              decolli={DECOLLI.map(d => ({ id: d.id, name: d.name, valley: d.valley, exposure: d.exposure, alt: d.altitude }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
              currentData={currentData}
            />
          </div>

          {/* ===== CONTENUTO PRINCIPALE ===== */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Updating indicator */}
            {updating && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-900/30 to-amber-900/20 border border-emerald-500/30 animate-pulse">
                <Loader2 className="w-4 h-4 text-emerald-300 animate-spin" />
                <span className="text-sm font-bold text-emerald-200 tracking-wide">Aggiornamento in corso...</span>
                <span className="ml-auto text-[10px] text-emerald-300/70 font-mono bg-emerald-900/40 px-2 py-0.5 rounded-lg">
                  {countdownMin}m
                </span>
              </div>
            )}

            {/* ===== PREVISIONI GIORNALIERE ===== */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border-2 border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/10">
              <div className="bg-gradient-to-r from-emerald-800/60 to-amber-800/30 px-5 py-3 border-b border-emerald-500/20 flex items-center justify-between">
                <h2 className="text-sm md:text-base font-black text-white tracking-tight flex items-center gap-2">
                  <CloudSun className="w-5 h-5 text-yellow-300" />
                  PREVISIONI GIORNALIERE — {dateLabels[selectedDay]?.toUpperCase() || "OGGI"} {currentDateStr}
                </h2>
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-twinkle" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-twinkle" style={{ animationDelay: '0.5s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-twinkle" style={{ animationDelay: '1s' }} />
                </div>
              </div>
              <div className="p-4 md:p-5">
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

            {/* ===== SEZIONE DETTAGLIO ===== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-black text-white tracking-tight uppercase neon-green">
                  Dettaglio orario
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/30 to-transparent" />
              </div>

              <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

              <div className="bg-slate-900/60 border-2 border-slate-700/40 rounded-2xl p-4 md:p-6 shadow-xl">
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

              {/* Hour slider */}
              <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />
            </div>

            {/* ===== FOOTER ===== */}
            <div className="text-center py-4 border-t border-slate-700/20">
              <p className="text-[10px] text-slate-600 tracking-wider uppercase font-medium">
                Basato su dati Open-Meteo · {new Date().getFullYear()} · Meteo Conigli
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
</dyad-check>