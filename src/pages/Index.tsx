"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { TabNav } from "@/components/TabNav";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import SiteHeader from "@/components/SiteHeader";
import DayForecastPopup from "@/components/DayForecastPopup";
import { fetchMeteo, fetchMeteoHourly, enrDaily, calcThermal } from "@/utils/meteo";
import { DECOLLI } from "@/data/decolli";
import { genAI } from "@/utils/analisi";
import { generateAiAnalysis } from "@/utils/meteoAI";
import type { MeteoData, HourData, AiAnalysis } from "@/types/meteo";
import useEmblaCarousel from "embla-carousel-react";
import SidebarDecolli from "@/components/SidebarDecolli";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

interface DecolloMeteo {
  site: typeof DECOLLI[0];
  data: MeteoData | null;
  loading: boolean;
  error: string | null;
}

function useRealTimeHour(): number {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const tick = () => setH(new Date().getHours());
    const id = setInterval(tick, 10000); // aggiorna ogni 10s per avere ora precisa
    return () => clearInterval(id);
  }, []);
  return h;
}

function Index() {
  const [decolliMeteo, setDecolliMeteo] = useState<Record<string, DecolloMeteo>>(() => {
    const map: Record<string, DecolloMeteo> = {};
    for (const site of DECOLLI) {
      map[site.id] = { site, data: null, loading: true, error: null };
    }
    return map;
  });
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState(DECOLLI[0]?.id || "");
  const [tab, setTab] = useState<Tab>("meteo");
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(useRealTimeHour());
  const [showPopup, setShowPopup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch dati per TUTTI i decolli
  const fetchAllDecolli = useCallback(async () => {
    const results = await Promise.allSettled(
      DECOLLI.map(async (site) => {
        const data = await fetchMeteo(site.lat, site.lon);
        return { id: site.id, data };
      })
    );

    setDecolliMeteo((prev) => {
      const next = { ...prev };
      for (const result of results) {
        if (result.status === "fulfilled") {
          next[result.value.id] = {
            ...next[result.value.id],
            data: result.value.data,
            loading: false,
            error: null,
          };
        } else {
          const failedId = DECOLLI.find((s) =>
            result.reason?.message?.includes(s.id)
          )?.id;
          if (failedId) {
            next[failedId] = {
              ...next[failedId],
              loading: false,
              error: result.reason?.message || "Errore sconosciuto",
            };
          }
        }
      }
      return next;
    });
    setGlobalLoading(false);
    setGlobalError(null);
  }, []);

  // Polling ogni 60 secondi + primo fetch
  useEffect(() => {
    fetchAllDecolli();
    const interval = setInterval(fetchAllDecolli, 60000);
    return () => clearInterval(interval);
  }, [fetchAllDecolli]);

  // Dati del decollo selezionato
  const selectedDecollo = decolliMeteo[siteId];
  const meteoData = selectedDecollo?.data;
  const loading = selectedDecollo?.loading ?? true;
  const error = selectedDecollo?.error;

  const hourly = meteoData?.hourly || [];
  const daily = meteoData?.daily || [];

  // Mappa weather per sidebar (usando dati reali, ora corrente)
  const weatherMap = useMemo(() => {
    const map: Record<string, HourData> = {};
    for (const [id, dm] of Object.entries(decolliMeteo)) {
      if (dm?.data?.hourly) {
        const found = dm.data.hourly.find(
          (h) => h.time.getHours() === hour
        );
        if (found) map[id] = found;
      }
    }
    return map;
  }, [decolliMeteo, hour]);

  const enrichedDaily = useMemo(() => enrDaily(daily, hourly), [daily, hourly]);

  const dateLabels = useMemo(() => {
    return daily.map((d) =>
      d.date.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    );
  }, [daily]);

  const getDayData = useCallback(
    (idx: number): HourData[] => {
      if (!hourly.length) return [];
      const targetDate = daily[idx]?.date;
      if (!targetDate) return [];
      return hourly.filter((h) => {
        const hd = h.time;
        return (
          hd.getDate() === targetDate.getDate() &&
          hd.getMonth() === targetDate.getMonth() &&
          hd.getFullYear() === targetDate.getFullYear()
        );
      });
    },
    [hourly, daily]
  );

  const dayData = useMemo(() => getDayData(dayIdx), [getDayData, dayIdx]);

  const currentHourData = useMemo(() => {
    return hourly.find((h) => h.time.getHours() === hour) || hourly[0];
  }, [hourly, hour]);

  const currentSite = useMemo(
    () => DECOLLI.find((s) => s.id === siteId) || DECOLLI[0],
    [siteId]
  );

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

  const handleSiteSelect = useCallback((id: string) => {
    setSiteId(id);
    // Reimposta giorno e ora sul nuovo decollo
    setDayIdx(0);
    setHour(new Date().getHours());
  }, []);

  const toggleSidebar = useCallback(
    () => setSidebarOpen((p) => !p),
    []
  );

  const handleRetry = useCallback(() => {
    setGlobalLoading(true);
    setGlobalError(null);
    fetchAllDecolli();
  }, [fetchAllDecolli]);

  if (globalLoading) return <LoadingScreen />;
  if (globalError) return <ErrorScreen message={globalError} onRetry={handleRetry} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 text-slate-100">
      {/* Header */}
      <header className="px-4 py-5 border-b border-orange-600 bg-gradient-to-r from-slate-800/90 via-orange-900/40 to-slate-800/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl md:text-5xl drop-shadow-lg animate-bounce">🐰</span>
            <div className="border-2 border-green-600 rounded-xl px-5 py-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-orange-400 tracking-tight text-center drop-shadow-sm">
                Meteo dei <span className="text-orange-300">Conigli</span>
              </h1>
              <p className="text-xs md:text-sm text-orange-200/90 font-medium text-center tracking-wide">
                🪂 Previsioni per volo libero · aggiornato ogni minuto
              </p>
            </div>
            <span className="text-4xl md:text-5xl drop-shadow-lg md:block hidden animate-bounce" style={{ animationDelay: "150ms" }}>🐰</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-3 pb-28 mt-4 md:flex md:gap-3 md:items-start md:justify-center">
        {/* Sidebar decolli */}
        <SidebarDecolli
          selected={siteId}
          current={currentHourData}
          onSelect={handleSiteSelect}
          weatherMap={weatherMap}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Colonna principale */}
        <div className="flex-1 min-w-0 max-w-2xl mx-auto">
          {/* Ora reale */}
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 font-medium">
              {new Date().toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              <span className="ml-2 text-blue-300">
                {String(hour).padStart(2, "0")}:{String(new Date().getMinutes()).padStart(2, "0")}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={toggleSidebar}
                className="md:hidden px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
              >
                ☰ Decolli
              </button>
            </div>
          </div>

          {/* Current site info */}
          {currentSite && currentHourData && (
            <div className="mb-2.5">
              <SiteHeader site={currentSite} current={currentHourData} />
            </div>
          )}

          {/* Tab navigation */}
          <TabNav tab={tab} onTabChange={setTab} />

          {/* Tab content */}
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-slate-600 shadow-lg mt-2.5 text-slate-200">
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

            {tab === "venti" && <VentiTab dayData={dayData} />}

            {tab === "termiche" && (
              <TermicheTab aiData={aiMeteoAnalysis as unknown as AiAnalysis} />
            )}

            {tab === "analisi" && aiMeteoAnalysis && (
              <AnalisiTab aiData={aiMeteoAnalysis as unknown as AiAnalysis} />
            )}
            {tab === "analisi" && !aiMeteoAnalysis && (
              <div className="text-sm text-slate-400 p-4 text-center">
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
              className="text-xs border-slate-500 text-slate-200 hover:bg-slate-700 bg-slate-800/80"
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
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 text-center py-2 border-t border-slate-600 bg-slate-800/80 backdrop-blur-sm z-40">
        <div className="max-w-5xl mx-auto px-3 flex items-center justify-center gap-8">
          <p className="text-[10px] text-slate-400">
            Basato su dati Open-Meteo · aggiornato ogni minuto
          </p>
          <p className="text-[10px] text-slate-400">
            &copy; {new Date().getFullYear()} Meteo dei Conigli
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Index;