"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { TabNav, type Tab } from "@/components/TabNav";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import VentiQuotaTab from "@/components/VentiQuotaTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import SiteHeader from "@/components/SiteHeader";
import DayForecastPopup from "@/components/DayForecastPopup";
import { DayDetailPopup } from "@/components/DayDetailPopup";
import SidebarDecolli from "@/components/SidebarDecolli";
import { fetchMeteo, fetchWindProfiles, filterFlightHours, enrDaily, calcThermal } from "@/utils/meteo";
import { generaAnalisiReale } from "@/utils/analisi";
import { generateAiAnalysis } from "@/utils/meteoAI";
import { generaTermicheOrarie } from "@/utils/termiche";
import { DECOLLI, type Decollo } from "@/data/decolli";
import type { MeteoData, HourData, AiAnalysis, WindProfile } from "@/types/meteo";
import { MapPin, Menu } from "lucide-react";

interface DecolloMeteo {
  site: Decollo;
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

const nomiGiorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

/** Filtra gli HourData per una data specifica */
function filterByDate(data: HourData[], targetDate: Date): HourData[] {
  return data.filter((h) => {
    const hd = h.time;
    return (
      hd.getDate() === targetDate.getDate() &&
      hd.getMonth() === targetDate.getMonth() &&
      hd.getFullYear() === targetDate.getFullYear()
    );
  });
}

/** Confronta due date (ignorando ora) */
function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

const Index = () => {
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
  const [dayIdx, setDayIdx] = useState(0); // 0=oggi, 1=domani, 2=dopodomani, ...
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

  // ---- DATA TARGET in base a dayIdx ----
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayIdx);
    return d;
  }, [dayIdx]);

  // ---- DATI per il giorno selezionato ----
  // Filtra gli hourly per la data target
  const dayData = useMemo((): HourData[] => {
    return filterByDate(hourly, targetDate);
  }, [hourly, targetDate]);

  // Current hour: l'ora selezionata all'interno del dayData
  const currentHourData = useMemo((): HourData | null => {
    if (!dayData.length) return null;
    // Cerca l'ora esatta selezionata
    const found = dayData.find((h) => h.time.getHours() === hour);
    return found || dayData[0] || null;
  }, [dayData, hour]);

  const currentSite = useMemo(
    () => DECOLLI.find((s) => s.id === siteId) || DECOLLI[0],
    [siteId]
  );

  // ---- Label del giorno selezionato ----
  const selectedDayLabel = useMemo(() => {
    const d = targetDate;
    const nomeGiorno = nomiGiorni[d.getDay()];
    return `${nomeGiorno} ${d.getDate()} ${mesi[d.getMonth()]}`;
  }, [targetDate]);

  // ---- EnrichedDaily per il giorno selezionato ----
  const enrichedForDay = useMemo(() => {
    if (!dayData.length) return [];
    const maxTemp = Math.max(...dayData.map(h => h.temperature));
    const minTemp = Math.min(...dayData.map(h => h.temperature));
    const avgWind = dayData.reduce((s, h) => s + h.windSpeed, 0) / dayData.length;
    const maxWind = Math.max(...dayData.map(h => h.windSpeed));
    const avgCloud = dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;
    const precipitationSum = dayData.reduce((s, h) => s + h.precipitation, 0);

    return [{
      date: targetDate,
      tempMax: maxTemp,
      tempMin: minTemp,
      weatherCode: dayData[0]?.weatherCode ?? 0,
      precipitationSum,
      avgWind,
      maxWind,
      avgCloud,
    }];
  }, [dayData, targetDate]);

  // ---- Dati per tutti i giorni (per i pulsanti del MeteoTab) ----
  const allDaysLabels = useMemo(() => {
    const labels: { value: number; label: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const nomeGiorno = i === 0 ? "Oggi" : nomiGiorni[d.getDay()];
      labels.push({
        value: i,
        label: i === 0 ? "Oggi" : `${nomeGiorno} ${d.getDate()} ${mesi[d.getMonth()]}`,
      });
    }
    return labels;
  }, []);

  // ---- Calcoli vari ----
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

  // TERMICHE ORARIE
  const termicheHourly = useMemo(() => {
    if (!dayData.length) return [];
    return generaTermicheOrarie(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const handleSiteSelect = useCallback((id: string) => {
    setSiteId(id);
    setDayIdx(0);
    setHour(new Date().getHours());
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  const handleRetry = useCallback(() => {
    setGlobalLoading(true);
    setGlobalError(null);
    fetchAllDecolli();
  }, [fetchAllDecolli]);

  const handleDaySelect = useCallback((idx: number) => {
    setDayIdx(idx);
    if (idx > 0) {
      setHour(12); // mezzogiorno per i giorni futuri
    } else {
      setHour(new Date().getHours());
    }
  }, []);

  const handleHourChange = useCallback((h: number) => {
    setHour(h);
  }, []);

  // ---- CONDITIONAL RETURN ----
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
                🪂 Previsioni per volo libero &middot; 9:00&ndash;19:00 &middot; aggiornato ogni minuto
              </p>
            </div>
            <span
              className="text-3xl md:text-4xl drop-shadow-lg md:block hidden animate-bounce"
              style={{ animationDelay: "150ms" }}
            >
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
              {selectedDayLabel}
              <span className="ml-2 text-blue-300 font-bold">
                {String(hour).padStart(2, "0")}:00
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={toggleSidebar}
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

          <div className="bg-slate-700/70 backdrop-blur-sm rounded-2xl p-4 md:p-5 border border-slate-500/60 shadow-xl mt-2.5 text-slate-100 content-enter">
            {tab === "meteo" && currentHourData && (
              <MeteoTab
                current={currentHourData}
                dayIdx={dayIdx}
                hour={hour}
                enrichedDaily={enrichedForDay}
                dateLabels={[selectedDayLabel]}
                thermal={thermalAI}
                pressureGrad={{ grad: 0, desc: "Non disponibile" }}
                aiData={aiData as unknown as AiAnalysis | null}
                onDaySelect={handleDaySelect}
                onDayDetailClick={(idx) => { setDayIdx(idx); setShowDayDetail(true); }}
                onHourChange={handleHourChange}
                termicheHourly={termicheHourly}
                giorniAvanti={allDaysLabels}
                fetchGiorno={() => {}}
              />
            )}

            {tab === "venti" && <VentiTab dayData={dayData} selectedHour={hour} />}

            {tab === "quota" && (
              <VentiQuotaTab
                dayData={dayData}
                selectedHour={hour}
                altitude={currentSite.altitude}
                siteName={currentSite.name}
              />
            )}

            {tab === "termiche" && (
              <TermicheTab
                dayData={dayData}
                altitude={currentSite.altitude}
                selectedHour={hour}
              />
            )}

            {tab === "analisi" && aiMeteoAnalysis && (
              <AnalisiTab aiData={aiMeteoAnalysis as unknown as AiAnalysis} selectedHour={hour} />
            )}
            {tab === "analisi" && !aiMeteoAnalysis && (
              <div className="text-sm text-slate-300 p-4 text-center">
                Nessuna analisi disponibile per questa giornata.
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setShowPopup(true)}
              className="text-sm border border-slate-500/60 text-slate-200 hover:bg-slate-700 bg-slate-800/80 px-5 py-2.5 rounded-xl transition-colors"
            >
              <MapPin className="w-4 h-4 mr-2 inline" />
              Dettaglio orario {currentSite?.name} (9:00&ndash;19:00)
            </button>
          </div>

          {showPopup && (
            <DayForecastPopup
              data={dayData}
              dayLabel={selectedDayLabel}
              onClose={() => setShowPopup(false)}
              selectedHour={hour}
              onHourSelect={(h) => {
                setHour(h);
                setShowPopup(false);
              }}
            />
          )}

          {showDayDetail && enrichedForDay[0] && (
            <DayDetailPopup
              dayData={dayData}
              daily={enrichedForDay[0]}
              dayLabel={selectedDayLabel}
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

      <footer className="relative z-10 fixed bottom-0 left-0 right-0 text-center py-3 border-t border-green-500/30 bg-slate-800/80 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-8">
          <p className="text-xs text-slate-300">
            Basato su dati Open-Meteo &middot; previsioni 9:00&ndash;19:00
          </p>
          <p className="text-xs text-slate-300">
            &copy; {new Date().getFullYear()} Meteo dei Conigli
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;