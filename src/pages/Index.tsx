"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolloList from "@/components/DecolloList";
import SiteHeader from "@/components/SiteHeader";
import AlertBanner from "@/components/AlertBanner";
import UpdateTimer from "@/components/UpdateTimer";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import WeatherDashboard from "@/components/WeatherDashboard";
import DayForecastPopup from "@/components/DayForecastPopup";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiTab from "@/components/VentiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";
import SezioneMeteo from "@/components/SezioneMeteo";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import { getWeatherAlert, getStabilityIndex } from "@/utils/weatherHelpers";
import type { HourData } from "@/types/meteo";

export default function Index() {
  const {
    selectedId, setSelectedId,
    loading, updating, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    hourlyData,
    dailyData,
    allDailyData,
    allHourlyData,
  } = useWeatherData();

  const [detailOpen, setDetailOpen] = useState(false);

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature || 20,
    currentData?.humidity || 50,
    currentData?.cloudCover || 30
  );

  const weatherAlert = getWeatherAlert(currentData, thermalDelta);

  if (loading && !hourlyData?.length) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            <UpdateTimer 
              lastUpdate={lastUpdate} 
              countdown={countdown} 
              updating={updating} 
              onRefresh={loadWeather} 
            />
            <DecolloList
              decolli={DECOLLI}
              selectedId={selectedId}
              onSelect={(id) => { setSelectedId(id); setSelectedHour(new Date().getHours()); }}
              allDailyData={allDailyData}
              allHourlyData={allHourlyData}
            />
          </aside>

          <div className="flex-1 min-w-0 space-y-6">
            {site && currentData && dayData && (
              <>
                <SiteHeader
                  name={site.name}
                  exposure={site.exposure}
                  valley={site.valley}
                  alt={site.altitude}
                  currentData={currentData}
                />

                {weatherAlert && (
                  <AlertBanner alert={{
                    level: weatherAlert.level,
                    message: weatherAlert.message,
                    icon: weatherAlert.icon,
                  }} />
                )}

                <PrevisioniGiornaliere
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  currentData={currentData}
                  dayData={dayData as HourData[]}
                  site={{ name: site.name, altitude: site.altitude, exposure: site.exposure }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />

                <WeatherDashboard
                  dayData={dayData as HourData[]}
                  altitude={site.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                />

                <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

                {activeTab === "meteo" && (
                  <MeteoTab
                    currentData={currentData}
                    dayData={dayData as HourData[]}
                    site={{ alt: site.altitude }}
                    thermalDelta={thermalDelta}
                    stabilityIndex={stabilityIndex}
                  />
                )}

                {activeTab === "venti" && (
                  <VentiTab
                    currentData={currentData}
                    dayData={dayData as HourData[]}
                    windProfile={[]}
                    hourlyData={hourlyData}
                    targetHour={12}
                  />
                )}

                {activeTab === "termiche" && (
                  <TermicheTab
                    currentData={currentData}
                    dayData={dayData as HourData[]}
                    site={{ alt: site.altitude, lat: site.lat, lon: site.lon }}
                  />
                )}

                {activeTab === "analisi" && (
                  <AnalisiTab
                    currentData={currentData}
                    dayData={dayData as HourData[]}
                    windProfile={[]}
                    hourlyData={hourlyData}
                    targetHour={12}
                    site={{ alt: site.altitude, lat: site.lat, lon: site.lon }}
                  />
                )}
              </>
            )}

            {(!site || !currentData) && <SezioneMeteo />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}