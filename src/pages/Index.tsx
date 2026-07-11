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
import { ArrowUpDown, Wind, Thermometer, Cloud, Droplets, Gauge, Sun, MapPin, Info, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";

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

  // Popup toggle
  const togglePopup = useCallback(() => setShowPopup((p) => !p), []);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;
  if (!meteoData) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 text-white">
      {/* Header */}
      <header className="px-4 py-5 border-b border-white/10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl md:text-4xl animate-bounce">🐰</span>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-orange-400 tracking-tight">
                  Meteo dei Conigli
                </h1>
                <p className="text-[10px] md:text-xs text-blue-300/70 font-medium">
                  Previsioni per volo libero — SHV FSVL Style
                </p>
              </div>
            </div>
            <span className="text-2xl md:text-3xl animate-pulse">🪂</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-3 pb-24">
        {/* Site selector */}
        <section className="mt-4 mb-3">
          <SiteSection
            selected={siteId}
            current={currentHourData}
            onSelect={handleSiteSelect}
            weatherMap={weatherMap}
          />
        </section>

        {/* Current site info */}
        {currentSite && currentHourData && (
          <div className="mb-3">
            <SiteHeader site={currentSite} current={currentHourData} />
          </div>
        )}

        {/* Tab navigation */}
        <TabNav tab={tab} onTabChange={setTab} />

        {/* Tab content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
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
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePopup}
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
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 text-center py-2.5 border-t border-white/10 bg-gray-950/90 backdrop-blur-sm z-40">
        <div className="max-w-3xl mx-auto px-3 flex items-center justify-between">
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