"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { TabNav } from "@/components/TabNav";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import VentiQuotaTab from "@/components/VentiQuotaTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import SiteHeader from "@/components/SiteHeader";
import DayForecastPopup from "@/components/DayForecastPopup";
import { DayDetailPopup } from "@/components/DayDetailPopup";
import { fetchMeteo, fetchWindProfiles, filterFlightHours, enrDaily, calcThermal } from "@/utils/meteo";
import { DECOLLI } from "@/data/decolli";
import { generaAnalisiReale } from "@/utils/analisi";
import { generateAiAnalysis } from "@/utils/meteoAI";
import { calcThermalReal } from "@/utils/termiche";
import type { MeteoData, HourData, AiAnalysis, WindProfile } from "@/types/meteo";
import SidebarDecolli from "@/components/SidebarDecolli";
import { Button } from "@/components/ui/button";
import { MapPin, CloudSun, ArrowRight } from "lucide-react";

type Tab = "meteo" | "venti" | "quota" | "termiche" | "analisi";

interface DecolloMeteo {
  site: typeof DECOLLI[0];
  data: MeteoData | null;
  loading: boolean;
  error: string | null;
  windProfiles: WindProfile[];
  windProfilesLoading: boolean;
}

function useRealTimeHour(): number {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const tick = () => setH(new Date().getHours());
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);
  return h;
}

function Index() {
  const [decolliMeteo, setDecolliMeteo] = useState<Record<string, DecolloMeteo>>(() => {
    const map: Record<string, DecolloMeteo> = {};
    for (const site of DECOLLI) {
      map[site.id] = { site, data: null, loading: true, error: null, windProfiles: [], windProfilesLoading: false };
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
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const fetchWind = useCallback(async (lat: number, lon: number) => {
    setDecolliMeteo((prev) => ({
      ...prev,
      [siteId]: { ...prev[siteId], windProfilesLoading: true },
    }));
    const profiles = await fetchWindProfiles(lat, lon);
    setDecolliMeteo((prev) => ({
      ...prev,
      [siteId]: { ...prev[siteId], windProfiles: profiles, windProfilesLoading: false },
    }));
  }, [siteId]);

  useEffect(() => {
    fetchAllDecolli();
    const interval = setInterval(fetchAllDecolli, 60000);
    return () => clearInterval(interval);
  }, [fetchAllDecolli]);

  const selectedSite = DECOLLI.find((s) => s.id === siteId) || DECOLLI[0];
  useEffect(() => {
    if (selectedSite) {
      fetchWind(selectedSite.lat, selectedSite.lon);
    }
  }, [siteId, selectedSite, fetchWind]);

  const selectedDecollo = decolliMeteo[siteId];
  const meteoData = selectedDecollo?.data;
  const loading = selectedDecollo?.loading ?? true;
  const error = selectedDecollo?.error;
  const windProfiles = selectedDecollo?.windProfiles || [];

  const hourlyRaw = meteoData?.hourly || [];
  const daily = meteoData?.daily || [];

  const hourly = useMemo(() => filterFlightHours(hourlyRaw), [hourlyRaw]);

  const weatherMap = useMemo(() => {
    const map: Record<string, HourData> = {};
    for (const [id, dm] of Object.entries(decolliMeteo)) {
      if (dm?.data?.hourly) {
        const hh = dm.data.hourly.find((h) => {
          const hhh = h.time.getHours();
          return hhh >= 9 && hhh <= 19 && hhh === hour;
        });
        if (hh) map[id] = hh;
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
    const found = hourly.find((h) => h.time.getHours() === hour);
    return found || hourly[0];
  }, [hourly, hour]);

  const currentSite = useMemo(
    () => DECOLLI.find((s) => s.id === siteId) || DECOLLI[0],
    [siteId]
  );

  const thermalAI = useMemo(() => {
    if (!dayData.length) return null;
    return calcThermal(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const aiData = useMemo(() => {
    if (!dayData.length) return null;
    return generaAnalisiReale(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const aiMeteoAnalysis = useMemo(() => {
    return generateAiAnalysis(dayData, dayIdx);
  }, [dayData, dayIdx]);

  const handleSiteSelect = useCallback((id: string) => {
    setSiteId(id);
    setDayIdx(0);
    setHour(new Date().getHours());
  }, []);

  const handleDayDetailClick = useCallback((idx: number) => {
    setDayIdx(idx);
    setShowDayDetail(true);
  }, []);

  const handleApriDomani = useCallback(() => {
    setDayIdx(1);
    setShowDayDetail(true);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  const handleRetry = useCallback(() => {
    setGlobalLoading(true);
    setGlobalError(null);
    fetchAllDecolli();
  }, [fetchAllDecolli]);

  if (globalLoading) return <LoadingScreen />;
  if (globalError) return <ErrorScreen message={globalError} onRetry={handleRetry} />;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="pointer-events-none fixed -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -right-32 w-96 h-96 bg-green-500/8 rounded-full blur-3xl" />

      <header className="relative z-10 px-4 py-5 border-b-2 border-green-500/40 bg-gradient-to-r from-slate-800/95 via-green-900/20 to-slate-800/95 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl md:text-5xl drop-shadow-lg animate-bounce">🐰</span>
            <div className="border-2 border-green-500/40 rounded-xl px-5 py-3 bg-slate-800/60 backdrop-blur-sm shadow-inner">
              <h1 className="text-2xl md:text-3xl font-extrabold text-green-400 tracking-tight text-center drop-shadow-sm">
                Meteo dei <span className="text-green-300">Conigli</span>
              </h1>
              <p className="text-xs md:text-sm text-green-200/90 font-medium text-center tracking-wide">
                🪂 Previsioni per volo libero · 9:00–19:00 · aggiornato ogni minuto
              </p>
            </div>
            <span
              className="text-4xl md:text-5xl drop-shadow-lg md:block hidden animate-bounce"
              style={{ animationDelay: "150ms" }}
            >
              🐰
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-3 pb-28 mt-4 md:flex md:gap-3 md:items-start md:justify-center">
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
            <div className="text-[11px] text-slate-300 font-medium">
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

          {currentSite && currentHourData && (
            <div className="mb-2.5">
              <SiteHeader site={currentSite} current={currentHourData} />
            </div>
          )}

          {/* Pulsante PREVISIONI DOMANI */}
          <div className="mb-3">
            <Button
              onClick={handleApriDomani}
              className="w-full py-4 md:py-3 text-sm md:text-base font-bold rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border border-blue-400 shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02]"
            >
              <CloudSun className="w-5 h-5 mr-2" />
              {daily[1] ? dateLabels[1] : "Domani"} · Previsioni locali 3B Meteo 8:00–20:00
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <TabNav tab={tab} onTabChange={setTab} />

          <div className="bg-slate-700/60 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-slate-600/50 shadow-xl mt-2.5 text-slate-100">
            {tab === "meteo" && currentHourData && (
              <MeteoTab
                current={currentHourData}
                dayIdx={dayIdx}
                hour={hour}
                enrichedDaily={enrichedDaily}
                dateLabels={dateLabels}
                thermal={thermalAI}
                pressureGrad={{ grad: 0, desc: "Non disponibile" }}
                aiData={aiData as unknown as AiAnalysis | null}
               <dyad-write path="src/pages/Index.tsx" description="Completo Index.tsx con il fix per l'errore 5 (cast aiData) e tutto il resto del file">
```tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { TabNav } from "@/components/TabNav";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import VentiQuotaTab from "@/components/VentiQuotaTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import SiteHeader from "@/components/SiteHeader";
import DayForecastPopup from "@/components/DayForecastPopup";
import { DayDetailPopup } from "@/components/DayDetailPopup";
import { fetchMeteo, fetchWindProfiles, filterFlightHours, enrDaily, calcThermal } from "@/utils/meteo";
import { DECOLLI } from "@/data/decolli";
import { generaAnalisiReale } from "@/utils/analisi";
import { generateAiAnalysis } from "@/utils/meteoAI";
import { calcThermalReal } from "@/utils/termiche";
import type { MeteoData, HourData, AiAnalysis, WindProfile } from "@/types/meteo";
import SidebarDecolli from "@/components/SidebarDecolli";
import { Button } from "@/components/ui/button";
import { MapPin, CloudSun, ArrowRight } from "lucide-react";

type Tab = "meteo" | "venti" | "quota" | "termiche" | "analisi";

interface DecolloMeteo {
  site: typeof DECOLLI[0];
  data: MeteoData | null;
  loading: boolean;
  error: string | null;
  windProfiles: WindProfile[];
  windProfilesLoading: boolean;
}

function useRealTimeHour(): number {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const tick = () => setH(new Date().getHours());
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);
  return h;
}

function Index() {
  const [decolliMeteo, setDecolliMeteo] = useState<Record<string, DecolloMeteo>>(() => {
    const map: Record<string, DecolloMeteo> = {};
    for (const site of DECOLLI) {
      map[site.id] = { site, data: null, loading: true, error: null, windProfiles: [], windProfilesLoading: false };
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
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const fetchWind = useCallback(async (lat: number, lon: number) => {
    setDecolliMeteo((prev) => ({
      ...prev,
      [siteId]: { ...prev[siteId], windProfilesLoading: true },
    }));
    const profiles = await fetchWindProfiles(lat, lon);
    setDecolliMeteo((prev) => ({
      ...prev,
      [siteId]: { ...prev[siteId], windProfiles: profiles, windProfilesLoading: false },
    }));
  }, [siteId]);

  useEffect(() => {
    fetchAllDecolli();
    const interval = setInterval(fetchAllDecolli, 60000);
    return () => clearInterval(interval);
  }, [fetchAllDecolli]);

  const selectedSite = DECOLLI.find((s) => s.id === siteId) || DECOLLI[0];
  useEffect(() => {
    if (selectedSite) {
      fetchWind(selectedSite.lat, selectedSite.lon);
    }
  }, [siteId, selectedSite, fetchWind]);

  const selectedDecollo = decolliMeteo[siteId];
  const meteoData = selectedDecollo?.data;
  const loading = selectedDecollo?.loading ?? true;
  const error = selectedDecollo?.error;
  const windProfiles = selectedDecollo?.windProfiles || [];

  const hourlyRaw = meteoData?.hourly || [];
  const daily = meteoData?.daily || [];

  const hourly = useMemo(() => filterFlightHours(hourlyRaw), [hourlyRaw]);

  const weatherMap = useMemo(() => {
    const map: Record<string, HourData> = {};
    for (const [id, dm] of Object.entries(decolliMeteo)) {
      if (dm?.data?.hourly) {
        const hh = dm.data.hourly.find((h) => {
          const hhh = h.time.getHours();
          return hhh >= 9 && hhh <= 19 && hhh === hour;
        });
        if (hh) map[id] = hh;
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
    const found = hourly.find((h) => h.time.getHours() === hour);
    return found || hourly[0];
  }, [hourly, hour]);

  const currentSite = useMemo(
    () => DECOLLI.find((s) => s.id === siteId) || DECOLLI[0],
    [siteId]
  );

  const thermalAI = useMemo(() => {
    if (!dayData.length) return null;
    return calcThermal(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const aiData = useMemo(() => {
    if (!dayData.length) return null;
    return generaAnalisiReale(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const aiMeteoAnalysis = useMemo(() => {
    return generateAiAnalysis(dayData, dayIdx);
  }, [dayData, dayIdx]);

  const handleSiteSelect = useCallback((id: string) => {
    setSiteId(id);
    setDayIdx(0);
    setHour(new Date().getHours());
  }, []);

  const handleDayDetailClick = useCallback((idx: number) => {
    setDayIdx(idx);
    setShowDayDetail(true);
  }, []);

  const handleApriDomani = useCallback(() => {
    setDayIdx(1);
    setShowDayDetail(true);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  const handleRetry = useCallback(() => {
    setGlobalLoading(true);
    setGlobalError(null);
    fetchAllDecolli();
  }, [fetchAllDecolli]);

  if (globalLoading) return <LoadingScreen />;
  if (globalError) return <ErrorScreen message={globalError} onRetry={handleRetry} />;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="pointer-events-none fixed -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -right-32 w-96 h-96 bg-green-500/8 rounded-full blur-3xl" />

      <header className="relative z-10 px-4 py-5 border-b-2 border-green-500/40 bg-gradient-to-r from-slate-800/95 via-green-900/20 to-slate-800/95 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl md:text-5xl drop-shadow-lg animate-bounce">🐰</span>
            <div className="border-2 border-green-500/40 rounded-xl px-5 py-3 bg-slate-800/60 backdrop-blur-sm shadow-inner">
              <h1 className="text-2xl md:text-3xl font-extrabold text-green-400 tracking-tight text-center drop-shadow-sm">
                Meteo dei <span className="text-green-300">Conigli</span>
              </h1>
              <p className="text-xs md:text-sm text-green-200/90 font-medium text-center tracking-wide">
                🪂 Previsioni per volo libero · 9:00–19:00 · aggiornato ogni minuto
              </p>
            </div>
            <span
              className="text-4xl md:text-5xl drop-shadow-lg md:block hidden animate-bounce"
              style={{ animationDelay: "150ms" }}
            >
              🐰
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-3 pb-28 mt-4 md:flex md:gap-3 md:items-start md:justify-center">
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
            <div className="text-[11px] text-slate-300 font-medium">
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

          {currentSite && currentHourData && (
            <div className="mb-2.5">
              <SiteHeader site={currentSite} current={currentHourData} />
            </div>
          )}

          {/* Pulsante PREVISIONI DOMANI */}
          <div className="mb-3">
            <Button
              onClick={handleApriDomani}
              className="w-full py-4 md:py-3 text-sm md:text-base font-bold rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border border-blue-400 shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02]"
            >
              <CloudSun className="w-5 h-5 mr-2" />
              {daily[1] ? dateLabels[1] : "Domani"} · Previsioni locali 3B Meteo 8:00–20:00
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <TabNav tab={tab} onTabChange={setTab} />

          <div className="bg-slate-700/60 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-slate-600/50 shadow-xl mt-2.5 text-slate-100">
            {tab === "meteo" && currentHourData && (
              <MeteoTab
                current={currentHourData}
                dayIdx={dayIdx}
                hour={hour}
                enrichedDaily={enrichedDaily}
                dateLabels={dateLabels}
                thermal={thermalAI}
                pressureGrad={{ grad: 0, desc: "Non disponibile" }}
                aiData={aiData as unknown as AiAnalysis | null}
                onDaySelect={setDayIdx}
                onDayDetailClick={handleDayDetailClick}
                onHourChange={setHour}
              />
            )}

            {tab === "venti" && <VentiTab dayData={dayData} />}

            {tab === "quota" && (
              <VentiQuotaTab
                dayData={dayData}
                selectedHour={hour}
                altitude={currentSite.altitude}
                siteName={currentSite.name}
              />
            )}

            {tab === "termiche" && (
              <TermicheTab dayData={dayData} altitude={currentSite.altitude} />
            )}

            {tab === "analisi" && aiMeteoAnalysis && (
              <AnalisiTab aiData={aiMeteoAnalysis as unknown as AiAnalysis} />
            )}
            {tab === "analisi" && !aiMeteoAnalysis && (
              <div className="text-sm text-slate-300 p-4 text-center">
                Nessuna analisi disponibile per questa giornata.
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPopup(true)}
              className="text-xs border-slate-500/60 text-slate-200 hover:bg-slate-700 bg-slate-800/80"
            >
              <MapPin className="w-3 h-3 mr-1" />
              Dettaglio orario {currentSite?.name} (9:00–19:00)
            </Button>
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

          {showDayDetail && daily[dayIdx] && (
            <DayDetailPopup
              dayData={dayData}
              daily={daily[dayIdx]}
              dayLabel={dateLabels[dayIdx] || ""}
              altitude={currentSite.altitude}
              onClose={() => setShowDayDetail(false)}
              onHourSelect={(h) => {
                setHour(h);
                setShowDayDetail(false);
              }}
            />
          )}
        </div>
      </div>

      <footer className="relative z-10 fixed bottom-0 left-0 right-0 text-center py-2 border-t border-green-500/30 bg-slate-800/80 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto px-3 flex items-center justify-center gap-8">
          <p className="text-[10px] text-slate-300">
            Basato su dati Open-Meteo · previsioni 9:00–19:00
          </p>
          <p className="text-[10px] text-slate-300">
            &copy; {new Date().getFullYear()} Meteo dei Conigli
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Index;