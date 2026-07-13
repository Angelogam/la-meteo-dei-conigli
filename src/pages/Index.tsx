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
  getWindDirection,
  WindLevel,
} from "@/utils/weatherHelpers";
import { CloudSun, Sparkles, AlertTriangle, Bug } from "lucide-react";
import type { HourData } from "@/types/meteo";

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
    allDailyData,
    allHourlyData,
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

  const windProfileSimple: WindLevel[] = useMemo(() => {
    if (!currentData) return [];
    return [{
      alt: 10,
      speed: currentData.windSpeed,
      dir: currentData.windDir,
      dirName: getWindDirection(currentData.windDir),
    }];
  }, [currentData]);

  const hourlyDataForTermiche: HourData[] = useMemo(() => {
    if (!dayData.length) return [];
    return dayData.map(h => ({
      time: h.time,
      temperature: h.temperature,
      humidity: h.humidity,
      dewPoint: h.dewPoint,
      apparentTemp: h.apparentTemp,
      precipitation: h.precipitation,
      weatherCode: h.weatherCode,
      cloudCover: h.cloudCover,
      windSpeed: h.windSpeed,
      windDir: h.windDir,
      windGusts: h.windGusts,
      pressure: h.pressure,
      uvIndex: h.uvIndex,
      temp80m: h.temp80m,
      temp120m: h.temp120m,
      precipitationProba: 0,
      rain: h.precipitation > 0 ? h.precipitation : 0,
      showers: 0,
      snowfall: 0,
      surfacePressure: h.pressure,
      cloudCoverLow: 0,
      cloudCoverMid: 0,
      cloudCoverHigh: 0,
      evapotranspiration: 0,
      et0: 0,
      vapourPressureDeficit: 0,
      soilTemp: 15,
      soilMoisture: 0.3,
      shortwaveRadiation: 0,
      directRadiation: 0,
      diffuseRadiation: 0,
      directNormalIrradiance: 0,
      terrestrialRadiation: 0,
      sunshineDuration: 0,
      windProfile: undefined,
      soil_temperature: 15,
      soil_moisture: 0.3,
    }));
  }, [dayData]);

  if (loading && !dayData.length) return <LoadingScreen />;
  if (error && !dayData.length) return <ErrorScreen error={error} onRetry={loadWeather} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white flex flex-col">
      {showDebug && <DebugMeteo />}
      <Header />

      <main className="flex-1 container mx-auto px-3 py-4 md:px-6 lg:px-8">
        <div className="lg:hidden mb-4">
          <DecolloList
            decolli={DECOLLI}
            selectedId={selectedId}
            onSelect={setSelectedId}
            allDailyData={allDailyData}
            allHourlyData={allHourlyData}
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
          <aside className="hidden lg:block space-y-3">
            <DecolloList
              decolli={DECOLLI}
              selectedId={selectedId}
              onSelect={setSelectedId}
              allDailyData={allDailyData}
              allHourlyData={allHourlyData}
            />
          </aside>

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
                <TabsTrigger value="meteo">Meteo</TabsTrigger>
                <TabsTrigger value="venti">Venti</TabsTrigger>
                <TabsTrigger value="termiche">Termiche</TabsTrigger>
                <TabsTrigger value="analisi">Analisi</TabsTrigger>
              </TabsList>

              <TabsContent value="meteo" className="mt-4">
                <MeteoTab currentData={currentData} dayData={dayData} site={{ alt: site.altitude }} thermalDelta={thermalDelta} stabilityIndex={stabilityIndex} />
              </TabsContent>

              <TabsContent value="venti" className="mt-4">
                <VentiTab currentData={currentData} dayData={dayData} windProfile={windProfileSimple} />
              </TabsContent>

              <TabsContent value="termiche" className="mt-4">
                <TermicheTab currentData={currentData} dayData={dayData} site={{ alt: site.altitude, lat: site.lat, lon: site.lon }} thermalDelta={thermalDelta} thermalStrength={stabilityIndex} hourlyData={hourlyDataForTermiche} selectedHour={selectedHour} selectedDay={selectedDay} />
              </TabsContent>

              <TabsContent value="analisi" className="mt-4">
                <AnalisiTab currentData={currentData} site={{ name: site.name, alt: site.altitude }} thermalDelta={thermalDelta} selectedDateLabel={dateLabels[selectedDay]} />
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