"use client";

import React, { useState, useCallback } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { TabNav, type Tab } from "@/components/TabNav";
import SiteHeader from "@/components/SiteHeader";
import DayForecastPopup from "@/components/DayForecastPopup";
import { DayDetailPopup } from "@/components/DayDetailPopup";
import SidebarDecolli from "@/components/SidebarDecolli";
import { TabContent } from "@/components/TabContent";
import { useMeteoData, useRealTimeHour } from "@/hooks/useMeteoData";
import { MapPin, Menu } from "lucide-react";

const Index = () => {
  const [siteId, setSiteId] = useState("");
  const [tab, setTab] = useState<Tab>("meteo");
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(useRealTimeHour());
  const [showPopup, setShowPopup] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    globalLoading,
    globalError,
    weatherMap,
    enrichedDaily,
    dateLabels,
    dateLabelsObj,
    dayData,
    currentHourData,
    currentSite,
    thermalAI,
    aiData,
    aiMeteoAnalysis,
    termicheHourly,
    fetchAllDecolli,
  } = useMeteoData(siteId, dayIdx, hour);

  const handleSiteSelect = useCallback((id: string) => {
    setSiteId(id);
    setDayIdx(0);
    setHour(new Date().getHours());
  }, []);

  const handleDayDetailClick = useCallback((idx: number) => {
    setDayIdx(idx);
    setShowDayDetail(true);
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  if (globalLoading) return <LoadingScreen />;
  if (globalError) return <ErrorScreen message={globalError} onRetry={handleRetry} />;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 text-slate-100">
      <div className="pointer-events-none fixed -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -right-32 w-96 h-96 bg-green-500/8 rounded-full blur-3xl" />

      <header className="relative z-10 px-4 py-5 border-b-2 border-green-500/40 bg-gradient-to-r from-slate-800/95 via-green-900/20 to-slate-800/95 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl md:text-4xl drop-shadow-lg animate-bounce">🐰</span>
            <div className="border-2 border-green-500/40 rounded-xl px-4 py-3 bg-slate-800/60 backdrop-blur-sm shadow-inner">
              <h1 className="text-2xl md:text-3xl font-extrabold text-green-400 tracking-tight text-center drop-shadow-sm">
                Meteo dei <span className="text-green-300">Conigli</span>
              </h1>
              <p className="text-sm md:text-base text-green-200/90 font-medium text-center tracking-wide mt-0.5">
                🪂 Previsioni per volo libero · 9:00–19:00 · aggiornato ogni minuto
              </p>
            </div>
            <span className="text-3xl md:text-4xl drop-shadow-lg md:block hidden animate-bounce" style={{ animationDelay: "150ms" }}>
              🐰
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-32 mt-4 md:flex md:gap-4 md:items-start md:justify-center">
        <SidebarDecolli
          selected={siteId}
          current={currentHourData}
          onSelect={handleSiteSelect}
          weatherMap={weatherMap}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 min-w-0 max-w-2xl mx-auto">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-sm text-slate-200 font-medium">
              {new Date().toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              <span className="ml-2 text-blue-300 font-bold">
                {String(hour).padStart(2, "0")}:{String(new Date().getMinutes()).padStart(2, "0")}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden px-3 py-2 rounded-xl text-xs font-bold border border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
              >
                <Menu className="w-4 h-4 mr-1 inline" /> Decolli
              </button>
            </div>
          </div>

          {currentSite && currentHourData && (
            <div className="mb-2.5">
              <SiteHeader site={currentSite} current={currentHourData} />
            </div>
          )}

          <TabNav tab={tab} onTabChange={setTab} />

          <TabContent
            tab={tab}
            currentHourData={currentHourData}
            dayIdx={dayIdx}
            hour={hour}
            enrichedDaily={enrichedDaily}
            dateLabels={dateLabels}
            dateLabelsObj={dateLabelsObj}
            thermalAI={thermalAI}
            aiData={aiData}
            aiMeteoAnalysis={aiMeteoAnalysis}
            termicheHourly={termicheHourly}
            dayData={dayData}
            currentSite={currentSite}
            onDaySelect={setDayIdx}
            onDayDetailClick={handleDayDetailClick}
            onHourChange={setHour}
          />

          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setShowPopup(true)}
              className="text-sm border border-slate-500/60 text-slate-200 hover:bg-slate-700 bg-slate-800/80 px-5 py-2.5 rounded-xl transition-colors"
            >
              <MapPin className="w-4 h-4 mr-2 inline" />
              Dettaglio orario {currentSite?.name} (9:00–19:00)
            </button>
          </div>

          {showPopup && currentHourData && (
            <DayForecastPopup
              data={dayData}
              dayLabel={dateLabels[dayIdx] || ""}
              onClose={() => setShowPopup(false)}
              selectedHour={hour}
              onHourSelect={(h) => {
                setHour(h);
                setShowPopup(false);
              }}
            />
          )}

          {showDayDetail && enrichedDaily[dayIdx] && (
            <DayDetailPopup
              dayData={dayData}
              daily={enrichedDaily[dayIdx]}
              dayLabel={dateLabels[dayIdx] || ""}
              altitude={currentSite?.altitude || 0}
              onClose={() => setShowDayDetail(false)}
              onHourSelect={(h) => {
                setHour(h);
                setShowDayDetail(false);
              }}
            />
          )}
        </div>
      </div>

      <footer className="relative z-10 fixed bottom-0 left-0 right-0 text-center py-3 border-t border-green-500/30 bg-slate-800/80 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-8">
          <p className="text-xs text-slate-300">Basato su dati Open-Meteo · previsioni 9:00–19:00</p>
          <p className="text-xs text-slate-300">© {new Date().getFullYear()} Meteo dei Conigli</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;