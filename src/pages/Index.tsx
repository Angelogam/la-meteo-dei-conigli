"use client";

import React, { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolloList from "@/components/DecolloList";
import { DECOLLI } from "@/data/decolli";
import { useWeatherData } from "@/hooks/useWeatherData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MeteoTab from "@/components/MeteoTab";
import VentiTab from "@/components/VentiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import HourSlider from "@/components/HourSlider";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import AlertBanner from "@/components/AlertBanner";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import DebugMeteo from "@/components/DebugMeteo";
import {
  getWeatherAlert,
  getStabilityIndex,
  getWindProfile,
  getWindDirection,
  WindLevel,
} from "@/utils/weatherHelpers";
import { CloudSun, Sparkles, AlertTriangle, Bug } from "lucide-react";

const Page = () => {
  const {
    selectedId,
    setSelectedId,
    loading,
    updating,
    error,
    selectedDay,
    setSelectedDay,
    selectedHour,
    setSelectedHour,
    activeTab,
    setActiveTab,
    lastUpdate,
    countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    allWeatherData,
  } = useWeatherData();

  const [showDebug, setShowDebug] = useState(false);

  const alert = useMemo(() => {
    if (!currentData) return { level: "info", message: "Caricamento...", icon: "ℹ️" };
    return getWeatherAlert(currentData, thermalDelta);
  }, [currentData, thermalDelta]);

  const stabilityIndex = useMemo(() => {
    if (!currentData) return { label: "N/D", color: "#64748b" };
    return getStabilityIndex(currentData.temperature, currentData.humidity, currentData.cloudCover);
  }, [currentData]);

  const windProfile = useMemo((): WindLevel[] => {
    if (!currentData) return [];
    return getWindProfile(currentData.windSpeed, currentData.windDir, currentData.windProfile);
  }, [currentData]);

  const windProfileSimple: WindLevel[] = useMemo(() => {
    if (!currentData) return [];
    const ground: WindLevel = {
      alt: 10,
      speed: currentData.windSpeed,
      dir: currentData.windDir,
      dirName: getWindDirection(currentData.windDir),
    };
    return [ground, ...windProfile];
  }, [currentData, windProfile]);

  if (loading && !dayData.length) return <LoadingScreen />;
  if (error && !dayData.length) return <ErrorScreen error={error} onRetry={loadWeather} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white flex flex-col">
      {showDebug && <DebugMeteo />}
      <Header />

      <main className="flex-1 container mx-auto px-3 py-4 md:px-6 lg:px-8">
        {/* Mobile: sidebar con decolli scorrevole */}
        <div className="lg:hidden mb-4">
          <DecolloList
            decolli={DECOLLI}
            selectedId={selectedId}
            onSelect={setSelectedId}
            currentData={currentData}
            allWeatherData={allWeatherData}
          />
        </div>

        <button
          onClick={() => setShowDebug(!showDebug)}
          className="fixed bottom-4 right-4 z-50 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2"
        >
          <Bug className="w-4 h-4" />
          DEBUG
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-6">
          {/* Sidebar - visibile solo su desktop */}
          <aside className="hidden lg:block space-y-3">
            <DecolloList
              decolli={DECOLLI}
              selectedId={selectedId}
              onSelect={setSelectedId}
              currentData={currentData}
              allWeatherData={allWeatherData}
            />
          </aside>

          {/* Main content */}
          <div className="space-y-5">
            <SiteHeader
              name={site.name}
              exposure={site.exposure}
              valley={site.valley}
              alt={site.altitude}
              currentData={currentData}
            />

            <AlertBanner alert={alert} />

            <UpdateTimer
              lastUpdate={lastUpdate}
              countdown={countdown}
              updating={updating}
              onRefresh={loadWeather}
            />

            <div className="space-y-4">
              <PrevisioniGiornaliere
                enrichedDaily={enrichedDaily}
                dateLabels={dateLabels}
                currentData={currentData}
                dayData={dayData}
                site={{ name: site.name, altitude: site.altitude, exposure: site.exposure }}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
              <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v: any) => setActiveTab(v)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-4 gap-1 bg-slate-800/60 rounded-xl p-1 border border-slate-700/30 text-sm">
                <TabsTrigger value="meteo" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-sky-500/30 data-[state=active]:to-sky-600/20 data-[state=active]:text-white whitespace-nowrap">
                  <CloudSun className="w-4 h-4 mr-1 shrink-0" /> Meteo
                </TabsTrigger>
                <TabsTrigger value="venti" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/30 data-[state=active]:to-cyan-600/20 data-[state=active]:text-white whitespace-nowrap">
                  <Sparkles className="w-4 h-4 mr-1 shrink-0" /> Venti
                </TabsTrigger>
                <TabsTrigger value="termiche" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500/30 data-[state=active]:to-orange-600/20 data-[state=active]:text-white whitespace-nowrap">
                  <Sparkles className="w-4 h-4 mr-1 shrink-0" /> Termiche
                </TabsTrigger>
                <TabsTrigger value="analisi" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500/30 data-[state=active]:to-purple-600/20 data-[state=active]:text-white whitespace-nowrap">
                  <AlertTriangle className="w-4 h-4 mr-1 shrink-0" /> Analisi
                </TabsTrigger>
              </TabsList>

              <TabsContent value="meteo" className="mt-4">
                <MeteoTab
                  currentData={currentData}
                  dayData={dayData}
                  site={{ alt: site.altitude }}
                  thermalDelta={thermalDelta}
                  stabilityIndex={stabilityIndex}
                />
              </TabsContent>

              <TabsContent value="venti" className="mt-4">
                <VentiTab
                  currentData={currentData}
                  dayData={dayData}
                  windProfile={windProfileSimple}
                />
              </TabsContent>

              <TabsContent value="termiche" className="mt-4">
                <TermicheTab
                  currentData={currentData}
                  dayData={dayData}
                  site={{ alt: site.altitude, lat: site.lat, lon: site.lon }}
                  thermalDelta={thermalDelta}
                  thermalStrength={stabilityIndex}
                  hourlyData={dayData}
                  selectedHour={selectedHour}
                  selectedDay={selectedDay}
                />
              </TabsContent>

              <TabsContent value="analisi" className="mt-4">
                <AnalisiTab
                  currentData={currentData}
                  site={{ name: site.name, alt: site.altitude }}
                  thermalDelta={thermalDelta}
                  selectedDateLabel={dateLabels[selectedDay]}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Page;