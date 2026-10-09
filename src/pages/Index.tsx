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

  const { mergedDecolli, lastUpdate: aggressiveLastUpdate, error: aggressiveError, updating: aggressiveUpdating, loadWeather: loadAggressiveWeather } = useThreeSourceWeather();

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

      <main className="app-main flex-1 w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5">
        {site && (
          <section id="overview" className="overview-section">
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
          </section>
        )}
        <div className="dashboard-layout">
          {/* SIDEBAR */}
          <aside id="decollli" className="dashboard-sidebar w-full lg:w-80 shrink-0 space-y-3">
            <UpdateTimer
              lastUpdate={aggressiveLastUpdate ?? lastUpdate}
              countdown={countdown}
              updating={updating || aggressiveUpdating}
              onRefresh={() => { loadWeather(); loadAggressiveWeather(); setFetchStarted(false); }}
            />

            <DecolliCard
              decolli={mergedDecolli}
              selectedId={selectedId}
              selectedDay={selectedDay}
              onRefresh={() => { loadAggressiveWeather(); }}
              isUpdating={aggressiveUpdating}
              error={aggressiveError}
              onSelect={(item) => {
                setSelectedId(item.id);
                setSelectedHour(new Date().getHours());
              }}
            />
          </aside>

          {/* MAIN CONTENT */}
          <div className="dashboard-content flex-1 min-w-0 space-y-5">
            {site && (
              <>
                <section className="forecast-section">
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
                </section>

                <HourlyTable
                  dayData={filteredDayData}
                  altitude={site.elevation_m}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                  dayLabel={dateLabel}
                  siteName={site.site_name}
                />

                <div id="windgram-section" className="windgram-section bg-slate-800/30 border border-emerald-500/30 rounded-2xl p-4">
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

                <div id="details-section" className="details-section"><TabNav activeTab={activeTab} onTabChange={setActiveTab} /></div>

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
      <nav className="mobile-bottom-nav" aria-label="Navigazione rapida">
        <a href="#overview" aria-label="Home"><span>⌂</span><small>Home</small></a>
        <a href="#decollli" aria-label="Decolli"><span>⌖</span><small>Decolli</small></a>
        <a href="#windgram-section" aria-label="Windgram"><span>〰</span><small>Windgram</small></a>
        <button type="button" onClick={() => { setActiveTab("analisi"); document.getElementById("details-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-label="Analisi"><span>◉</span><small>Analisi</small></button>
      </nav>
      <Footer />
      <DiagnosticaPanel />
    </div>
  );
}
