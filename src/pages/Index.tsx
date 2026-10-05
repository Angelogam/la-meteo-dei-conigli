"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import HourlyTable from "@/components/HourlyTable";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import Windgram from "@/components/Windgram";
import RasoftWindgram from "@/components/RasoftWindgram";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useThreeSourceWeather } from "@/hooks/useThreeSourceWeather";
import { DECOLLI } from "@/data/decolli";

export default function Index() {
  const [appMounted, setAppMounted] = useState(false);
  const [fetchStarted, setFetchStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAppMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const {
    selectedId,
    setSelectedId,
    loading: weatherLoading,
    updating,
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
    rawApiResponse,
  } = useWeatherData();

  const { mergedDecolli, lastUpdate: aggressiveLastUpdate } = useThreeSourceWeather();

  const filteredDayData = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    const oggi = new Date();
    const target = new Date(oggi);
    target.setDate(oggi.getDate() + selectedDay);
    const targetStr = target.toDateString();
    return dayData.filter((h) => {
      const d = new Date(h.time);
      return d.toDateString() === targetStr;
    });
  }, [dayData, selectedDay]);

  const dateLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  }, [selectedDay]);

  useEffect(() => {
    if (!appMounted || fetchStarted) return;
    setFetchStarted(true);
    loadWeather();
  }, [appMounted, fetchStarted, loadWeather]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6" style={{ marginTop: 80 }}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* SIDEBAR */}
          <aside className="w-full lg:w-80 shrink-0 space-y-3">
            <UpdateTimer
              lastUpdate={aggressiveLastUpdate ?? lastUpdate}
              countdown={countdown}
              updating={updating}
              onRefresh={() => { loadWeather(); setFetchStarted(false); }}
            />

            <DecolliCard
              decolli={mergedDecolli}
              selectedId={selectedId}
              selectedDay={selectedDay}
              onSelect={(item) => {
                setSelectedId(item.id);
                setSelectedHour(new Date().getHours());
              }}
            />
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0 space-y-6">
            {site && (
              <>
                <SiteHeader
                  site_name={site.site_name}
                  location_name={site.location_name}
                  orientation={site.orientation}
                  elevation_m={site.elevation_m}
                  currentData={currentData as any}
                  sunrise={enrichedDaily[selectedDay]?.sunrise?.slice(0, 5)}
                  sunset={enrichedDaily[selectedDay]?.sunset?.slice(0, 5)}
                  uvIndex={enrichedDaily[selectedDay]?.uvIndexMax ?? currentData?.uvIndex}
                />

                <PrevisioniGiornaliere
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  currentData={currentData}
                  dayData={dayData}
                  site={{ name: site.site_name, altitude: site.elevation_m, exposure: site.orientation }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  nomeDecollo={site.site_name}
                />

                <HourlyTable
                  dayData={filteredDayData}
                  altitude={site.elevation_m}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                  dayLabel={dateLabel}
                  siteName={site.site_name}
                />

                <div className="bg-slate-800/30 border border-emerald-500/30 rounded-2xl p-4">
                  <Windgram
                    dayData={filteredDayData}
                    siteName={site.site_name}
                    altitude={site.elevation_m}
                    selectedHour={selectedHour}
                    onHourSelect={setSelectedHour}
                    selectedDay={selectedDay}
                    dateLabel={dateLabel}
                    lat={site.lat}
                    lon={site.lon}
                    fallbackData={filteredDayData}
                    rawData={rawApiResponse}
                  />
                </div>

                {site.id === "montoso-decollo-basso" && (
                  <RasoftWindgram
                    latitude={site.lat}
                    longitude={site.lon}
                    altitude={site.elevation_m}
                    siteName="Montoso Alto"
                    selectedDay={selectedDay}
                  />
                )}

                <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

                {activeTab === "meteo" && (
                  <MeteoTab
                    currentData={currentData}
                    dayData={filteredDayData}
                    site={{ alt: site.elevation_m, name: site.site_name }}
                    thermalDelta={thermalDelta}
                    modelName="Open-Meteo"
                    selectedHour={selectedHour}
                    selectedDay={selectedDay}
                    cape={currentData?.cape}
                    liftedIndex={currentData?.liftedIndex}
                    cin={currentData?.cin}
                  />
                )}

                {activeTab === "venti" && (
                  <VentiInterpolatiTab
                    lat={site.lat}
                    lon={site.lon}
                    quotaDecollo={site.elevation_m}
                    selectedDay={selectedDay}
                    oraCorrente={selectedHour}
                    onOraChange={setSelectedHour}
                    siteName={site.site_name}
                    rawData={rawApiResponse}
                  />
                )}
                {activeTab === "termiche" && (
                  <TermicheTab
                    currentData={currentData as any}
                    dayData={filteredDayData}
                    site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name }}
                    selectedDay={selectedDay}
                  />
                )}
                {activeTab === "analisi" && (
                  <div className="space-y-6">
                    <AnalisiMeteo
                      currentData={currentData as any}
                      dayData={filteredDayData}
                      site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name, exposure: site.orientation }}
                      cape={currentData?.cape}
                      liftedIndex={currentData?.liftedIndex}
                      cin={currentData?.cin}
                      rawData={rawApiResponse}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <DiagnosticaPanel />
    </div>
  );
}
