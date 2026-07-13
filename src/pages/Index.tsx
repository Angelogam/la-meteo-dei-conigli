"use client";

import React, { useMemo } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import DecolloList from "@/components/DecolloList";
import SiteHeader from "@/components/SiteHeader";
import TabNav from "@/components/TabNav";
import HourSlider from "@/components/HourSlider";
import MeteoTab from "@/components/MeteoTab";
import VentiTab from "@/components/VentiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import WeatherDashboard from "@/components/WeatherDashboard";
import AlertBanner from "@/components/AlertBanner";
import DayInfoPanel from "@/components/DayInfoPanel";
import { getWeatherAlert, getWindProfile, getStabilityIndex } from "@/utils/weatherHelpers";

export const Page = () => {
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
    loadWeather,
    allWeatherData,
  } = useWeatherData();

  if (loading && !meteoData) {
    return <LoadingScreen />;
  }

  if (error && !meteoData) {
    return <ErrorScreen error={error} onRetry={loadWeather} />;
  }

  const alert = currentData ? getWeatherAlert(currentData, thermalDelta) : null;
  const stabilityIndex = currentData ? getStabilityIndex(currentData.temperature, currentData.humidity, currentData.cloudCover) : { label: "--", color: "#64748b" };

  const windProfile = useMemo(() => {
    const raw = currentData ? getWindProfile(currentData.windSpeed, currentData.windDir) : [];
    return raw.map((w: any) => ({
      height: w.alt ?? w.height ?? 0,
      speed: w.speed ?? 0,
      dir: w.dir ?? 0,
    }));
  }, [currentData]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-6">
          {/* Sidebar sinistra — Lista decolli */}
          <aside className="order-2 lg:order-1">
            <DecolloList
              decolli={DECOLLI.map(d => ({ id: d.id, name: d.name, valley: d.valley, exposure: d.exposure, alt: d.altitude }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
              currentData={allWeatherData[selectedId] || currentData}
              allWeatherData={allWeatherData}
            />
          </aside>

          {/* Contenuto principale */}
          <div className="order-1 lg:order-2 space-y-5">
            {/* Header del decollo selezionato */}
            <SiteHeader
              name={site.name}
              exposure={site.exposure}
              valley={site.valley}
              alt={site.altitude}
              currentData={currentData}
            />

            {/* Aggiornamento dati */}
            {updating && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-900/30 border border-emerald-500/30 text-xs text-emerald-300 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Aggiornamento dati per {DECOLLI.length} decolli...
              </div>
            )}

            {!updating && (
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[10px] text-slate-500">
                  Ultimo aggiornamento: {lastUpdate.toLocaleTimeString("it-IT")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${refreshProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 tabular-nums">{countdown}m</span>
                </div>
              </div>
            )}

            {/* Previsioni giornaliere (oggi/domani/dopodomani) */}
            <PrevisioniGiornaliere
              enrichedDaily={enrichedDaily}
              dateLabels={dateLabels}
              currentData={currentData}
              dayData={dayData}
              site={{ name: site.name, altitude: site.altitude, exposure: site.exposure }}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />

            {/* Alert meteo */}
            {alert && <AlertBanner alert={alert} />}

            {/* Tab navigazione */}
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Contenuto del tab selezionato */}
            {activeTab === "meteo" && (
              <>
                <MeteoTab
                  currentData={currentData}
                  dayData={dayData}
                  site={{ alt: site.altitude }}
                  thermalDelta={thermalDelta}
                  stabilityIndex={stabilityIndex}
                />
                <DayInfoPanel
                  currentData={currentData}
                  dayData={dayData}
                  site={{ name: site.name, alt: site.altitude }}
                  selectedDate={dateLabels[selectedDay]}
                />
              </>
            )}

            {activeTab === "venti" && (
              <>
                <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />
                <VentiTab
                  currentData={currentData}
                  dayData={dayData}
                  windProfile={windProfile}
                />
              </>
            )}

            {activeTab === "termiche" && (
              <>
                <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />
                <WeatherDashboard
                  dayData={dayData}
                  altitude={site.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                  windProfile={windProfile}
                  groundSpeed={currentData?.windSpeed}
                  groundDir={currentData?.windDir}
                />
              </>
            )}

            {activeTab === "analisi" && (
              <>
                <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />
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
                <AnalisiTab
                  currentData={currentData}
                  site={{ name: site.name, alt: site.altitude }}
                  thermalDelta={thermalDelta}
                  selectedDateLabel={dateLabels[selectedDay]}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <MadeWithDyad />
    </div>
  );
};