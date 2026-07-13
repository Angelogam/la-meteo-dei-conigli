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
import VentiQuotaTab from "@/components/VentiQuotaTab";
import ThermalDayGraph from "@/components/ThermalDayGraph";

const Page = () => {
  const {
    selectedId, setSelectedId,
    meteoData, loading, updating, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, refreshProgress,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    allWeatherData,
  } = useWeatherData();

  const alert = currentData ? getWeatherAlert(currentData, thermalDelta) : null;
  const stabilityIndex = currentData
    ? getStabilityIndex(currentData.temperature, currentData.humidity, currentData.cloudCover)
    : { label: "--", color: "#64748b" };

  const windProfile = useMemo(() => {
    if (!currentData) return [];
    const raw = getWindProfile(currentData.windSpeed, currentData.windDir);
    return raw.map((w: any) => {
      const dir = w.dir ?? 0;
      const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      return {
        alt: w.alt ?? w.height ?? 0,
        speed: w.speed ?? 0,
        dir,
        dirName: dirs[Math.round(dir / 45) % 8],
      };
    });
  }, [currentData]);

  const windProfileForWeatherDashboard = useMemo(() => {
    return windProfile.map(w => ({ height: w.alt, speed: w.speed, dir: w.dir }));
  }, [windProfile]);

  if (loading && !meteoData) {
    return <LoadingScreen />;
  }

  if (error && !meteoData) {
    return <ErrorScreen error={error} onRetry={loadWeather} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-6">
          <aside className="order-2 lg:order-1">
            <DecolloList
              decolli={DECOLLI.map(d => ({
                id: d.id,
                name: d.name,
                valley: d.valley,
                exposure: d.exposure,
                alt: d.altitude,
              }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
              currentData={allWeatherData[selectedId] || currentData}
              allWeatherData={allWeatherData}
            />
          </aside>

          <div className="order-1 lg:order-2 space-y-5">
            <SiteHeader
              name={site.name}
              exposure={site.exposure}
              valley={site.valley}
              alt={site.altitude}
              currentData={currentData}
            />

            {updating && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-900/30 border border-emerald-500/30 text-xs text-emerald-300 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Aggiornamento dati per {DECOLLI.length} decolli...
              </div>
            )}

            <PrevisioniGiornaliere
              enrichedDaily={enrichedDaily}
              dateLabels={dateLabels}
              currentData={currentData}
              dayData={dayData}
              site={{ name: site.name, altitude: site.altitude, exposure: site.exposure }}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />

            {alert && <AlertBanner alert={alert} />}

            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

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
                <VentiQuotaTab
                  dayData={dayData}
                  selectedHour={selectedHour}
                  altitude={site.altitude}
                  siteName={site.name}
                />
              </>
            )}

            {activeTab === "termiche" && (
              <>
                <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />
                <ThermalDayGraph
                  dayData={dayData}
                  altitude={site.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                  thermalDelta={thermalDelta}
                />
                <VentiQuotaTab
                  dayData={dayData}
                  selectedHour={selectedHour}
                  altitude={site.altitude}
                  siteName={site.name}
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

export default Page;