"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { SiteSection } from "@/components/SiteSection";
import { TabNav } from "@/components/TabNav";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import { SiteHeader } from "@/components/SiteHeader";
import { DayForecastPopup } from "@/components/DayForecastPopup";
import { fetchMeteo, wic, wa, wd, enrDaily, getZeroTermico, calcThermal, getWindProfile, calcTurbulence } from "@/utils/meteo";
import { DECOLLI } from "@/data/decolli";
import { genAI } from "@/utils/analisi";
import { generateAiAnalysis } from "@/utils/meteoAI";
import type { MeteoData, HourData, DailyData, ThermalData, AiAnalysis } from "@/types/meteo";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ArrowUpDown, Wind, Thermometer, Cloud, Droplets, Gauge, Sun, MapPin, Info, ChevronDown, Menu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import SidebarDecolli from "@/components/SidebarDecolli";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

interface EnrichedDay extends DailyData {
  delta: number;
  idx: number;
}

function useNowHour(): number {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setH(new Date().getHours()), 60000);
    return () => clearInterval(id);
  }, []);
  return h;
}

function Index() {
  const [meteoData, setMeteoData] = useState<MeteoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState(DECOLLI[0]?.id || "");
  const [tab, setTab] = useState<Tab>("meteo");
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(useNowHour());
  const [showPopup, setShowPopup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMeteo(DECOLLI[0].lat, DECOLLI[0].lon);
      setMeteoData(data);
    } catch (e: any) {
      setError(e?.message || "Errore di caricamento meteo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hourly = meteoData?.hourly || [];
  const daily = meteoData?.daily || [];

  // Crea mappa weather per decolli (simulata)
  const weatherMap = useMemo(() => {
    const map: Record<string, HourData> = {};
    for (const site of DECOLLI) {
      map[site.id] = hourly.find((h) => h.time.getHours() === hour) || hourly[0];
    }
    return map;
  }, [hourly, hour]);

  const enrichedDaily = useMemo(() => enrDaily(daily, hourly), [daily, hourly]);

  const dateLabels = useMemo(() => {
    return daily.map((d) =>
      d.date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })
    );
  }, [daily]);

  const getDayData = useCallback(
    (idx: number): HourData[] => {
      if (!hourly.length) return [];
      const targetDate = daily[idx]?.date;
      if (!targetDate) return [];
      return hourly.filter((h) => {
        const hd = h.time;
        return hd.getDate() === targetDate.getDate() && hd.getMonth() === targetDate.getMonth() && hd.getFullYear() === targetDate.getFullYear();
      });
    },
    [hourly, daily]
  );

  const dayData = useMemo(() => getDayData(dayIdx), [getDayData, dayIdx]);

  const currentHourData = useMemo(() => {
    return hourly.find((h) => h.time.getHours() === hour) || hourly[0];
  }, [hourly, hour]);

  const currentSite = useMemo(() => DECOLLI.find((s) => s.id === siteId) || DECOLLI[0], [siteId]);

  const thermal = useMemo(() => {
    if (!dayData.length) return null;
    return calcThermal(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const aiData = useMemo(() => {
    if (!dayData.length) return null;
    return genAI(dayData, { altitude: currentSite.altitude }, thermal);
  }, [dayData, currentSite.altitude, thermal]);

  const aiMeteoAnalysis = useMemo(() => {
    return generateAiAnalysis(dayData, dayIdx);
  }, [dayData, dayIdx]);

  // Site selection handler
  const handleSiteSelect = useCallback((id: string) => {
    setSiteId(id);
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;
  if (!meteoData) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 text-white">
      {/* Header */}
      <header className="px-4 py-4 border-b border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl md:text-3xl animate-bounce">🐰</span>
              <div>
                <h1 className="text-lg md:text-xl font-extrabold text-orange-400 tracking-tight">
                  Meteo dei Conigli
                </h1>
                <p className="text-[10px] md:text-xs text-blue-300/70 font-medium">
                  Previsioni per volo libero
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl md:text-2xl animate-pulse">🪂</span>
              <button
                onClick={toggleSidebar}
                className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
                aria-label="Apri decolli"
              >
                <Menu className="w-5 h-5 text-orange-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content: layout a due colonne su desktop */}
      <div className="max-w-5xl mx-auto px-3 pb-28 mt-3 md:flex md:gap-3 md:items-start">
        {/* Colonna principale */}
        <div className="flex-1 min-w-0">
          {/* Current site info compatta */}
          {currentSite && currentHourData && (
            <div className="mb-2.5">
              <SiteHeader site={currentSite} current={currentHourData} />
            </div>
          )}

          {/* Tab navigation */}
          <TabNav tab={tab} onTabChange={setTab} />

          {/* Tab content */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-white/10 mt-2.5">
            {tab === "meteo" && currentHourData && (
              <MeteoTab
                current={currentHourData}
                dayIdx={dayIdx}
                hour={hour}
                enrichedDaily={enrichedDaily}
                dateLabels={dateLabels}
                thermal={thermal}
                pressureGrad={{ grad: 0, desc: "Non disponibile" }}
                aiData={aiData}
                onDaySelect={setDayIdx}
                onHourChange={setHour}
              />
            )}

            {tab === "venti" && (
              <VentiTab dayData={dayData} />
            )}

            {tab === "termiche" && (
              <TermicheTab aiData={aiMeteoAnalysis as unknown as AiAnalysis} />
            )}

            {tab === "analisi" && aiMeteoAnalysis && (
              <AnalisiTab aiData={aiMeteoAnalysis as unknown as AiAnalysis} />
            )}
            {tab === "analisi" && !aiMeteoAnalysis && (
              <div className="text-sm text-gray-400 p-4 text-center">
                Nessuna analisi disponibile per questa giornata.
              </div>
            )}
          </div>

          {/* Hourly popup button */}
          <div className="mt-3 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPopup(true)}
              className="text-xs border-white/20 text-blue-300 hover:bg-white/10"
            >
              <MapPin className="w-3 h-3 mr-1" />
              Dettaglio orario {currentSite?.name}
            </Button>
          </div>

          {/* DayForecastPopup */}
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
        </div>

        {/* Sidebar decolli - visibile sempre su desktop, overlay su mobile */}
        <SidebarDecolli
          selected={siteId}
          current={currentHourData}
          onSelect={handleSiteSelect}
          weatherMap={weatherMap}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 text-center py-2 border-t border-white/10 bg-gray-950/90 backdrop-blur-sm z-40">
        <div className="max-w-5xl mx-auto px-3 flex items-center justify-between">
          <p className="text-[10px] text-blue-300/50">
            Basato su dati Open-Meteo
          </p>
          <p className="text-[10px] text-blue-300/50">
            &copy; {new Date().getFullYear()} Meteo dei Conigli
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Index;