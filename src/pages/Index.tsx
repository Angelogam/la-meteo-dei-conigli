"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { DECOLLI } from "@/data/decolli";
import { useWeatherData } from "@/hooks/useWeatherData";
import SezioneMeteo from "@/components/SezioneMeteo";
import AnalisiGiornata from "@/components/AnalisiGiornata";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiTab from "@/components/VentiTab";
import Windgram from "@/components/Windgram";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";
import SiteHeader from "@/components/SiteHeader";
import HourSlider from "@/components/HourSlider";
import ThermalChart from "@/components/ThermalChart";
import UpdateTimer from "@/components/UpdateTimer";
import { MadeWithDyad } from "@/components/made-with-dyad";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import type { HourData } from "@/types/meteo";

function IndexPage() {
  const {
    selectedId, setSelectedId,
    loading, updating, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown,
    site, dayData, currentData,
    thermalDelta, enrichedDaily, dateLabels,
    loadWeather, hourlyData, allHourlyData,
    activeModel, currentCape,
  } = useWeatherData();

  const siteFull = {
    alt: site.altitude,
    lat: site.lat,
    lon: site.lon,
    name: site.name,
    exposure: site.exposure,
  };

  // Variabili per evitare errori TypeScript
  const hasData = dayData && dayData.length > 0;
  const weatherError = error;

  if (loading && !hasData) {
    return <LoadingScreen />;
  }

  if (error && !hasData) {
    return <ErrorScreen error={error} onRetry={loadWeather} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Header />

      <main className="max-w-7xl mx-auto px-3 md:px-6 py-4 space-y-4">
        {/* Site Header */}
        <SiteHeader
          name={site.name}
          exposure={site.exposure}
          valley={site.valley}
          alt={site.altitude}
          currentData={currentData}
        />

        {/* Update Timer */}
        <UpdateTimer
          lastUpdate={lastUpdate}
          countdown={countdown}
          updating={updating}
          onRefresh={loadWeather}
        />

        {/* Day selector */}
        <div className="flex items-center gap-2 bg-slate-800/40 rounded-2xl p-1 border border-slate-700/30">
          {["Oggi", "Domani", "Dopodomani"].map((label, idx) => (
            <button
              key={label}
              onClick={() => setSelectedDay(idx)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedDay === idx
                  ? "bg-gradient-to-r from-emerald-600/60 to-emerald-500/40 text-white shadow-sm border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab navigation */}
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Hour slider */}
        <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />

        {/* Tab content */}
        {activeTab === "meteo" && (
          <>
            <AnalisiGiornata
              currentData={currentData}
              dayData={dayData}
              thermalDelta={thermalDelta}
              cape={currentCape}
              dailyForecasts={enrichedDaily}
              cloudCover={currentData?.cloudCover ?? 0}
              reportDate={dateLabels[selectedDay] || ""}
            />
            <MeteoTab
              currentData={currentData}
              dayData={dayData}
              site={{ alt: site.altitude, name: site.name }}
              thermalDelta={thermalDelta}
              stabilityIndex={{ label: "Stabile", color: "#4fc3f7" }}
              modelName={activeModel}
              cape={currentCape?.cape ?? null}
              liftedIndex={currentCape?.liftedIndex ?? null}
              cin={currentCape?.cin ?? null}
            />
          </>
        )}

        {activeTab === "venti" && (
          <VentiTab
            currentData={currentData}
            dayData={dayData}
            hourlyData={hourlyData}
            targetHour={selectedHour}
            lat={site.lat}
            lon={site.lon}
            selectedDay={selectedDay}
          />
        )}

        {activeTab === "windgram" && (
          <Windgram
            hourlyData={hourlyData}
            site={siteFull}
            selectedHour={selectedHour}
            onHourSelect={setSelectedHour}
          />
        )}

        {activeTab === "termiche" && (
          <>
            {hasData && dayData && dayData.length > 0 && (
              <ThermalChart
                hourlyData={dayData as HourData[]}
                selectedHour={selectedHour}
                siteAltitude={site.altitude}
                selectedDay={selectedDay}
              />
            )}
            <TermicheTab
              currentData={currentData}
              dayData={dayData}
              site={siteFull}
              hourlyData={hourlyData}
            />
          </>
        )}

        {activeTab === "analisi" && (
          <AnalisiTab
            currentData={currentData}
            dayData={dayData}
            site={siteFull}
          />
        )}

        {/* Nessun dato */}
        {!hasData && (
          <div className="text-center py-12 text-slate-400">
            {weatherError ? (
              <p className="text-red-400 text-sm font-semibold">
                Connessione fallita — impossibile ottenere i dati meteo
              </p>
            ) : (
              <p className="text-yellow-400 text-sm">
                Nessun dato meteo disponibile per {site?.name || "questo decollo"}.
                Verifica la connessione o riprova.
              </p>
            )}
          </div>
        )}
      </main>

      <MadeWithDyad />
    </div>
  );
}

export default IndexPage;