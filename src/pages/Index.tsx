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
import { CalendarDays, ChevronRight, CloudSun, MapPin, Menu } from "lucide-react";

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

interface GiornoPrevisione {
  giorno: number;
  label: string;
  data: MeteoData | null;
  loading: boolean;
  error: string | null;
}

const nomiGiorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

function generaGiorniPrevisioni(): GiornoPrevisione[] {
  const giorni: GiornoPrevisione[] = [];
  for (let g = 1; g <= 5; g++) {
    const data = new Date();
    data.setDate(data.getDate() + g);
    const nomeGiorno = nomiGiorni[data.getDay()];
    const label = `${nomeGiorno} ${data.getDate()} ${data.toLocaleDateString("it-IT", { month: "short" })}`;
    giorni.push({ giorno: g, label, data: null, loading: false, error: null });
  }
  return giorni;
}

/** Trova l'indice del giorno corrispondente a una data specifica nell'array daily */
function findDayIndex(dailyDates: Date[], targetDate: Date): number {
  return dailyDates.findIndex((d) => {
    return (
      d.getDate() === targetDate.getDate() &&
      d.getMonth() === targetDate.getMonth() &&
      d.getFullYear() === targetDate.getFullYear()
    );
  });
}

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
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(useRealTimeHour());
  const [showPopup, setShowPopup] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [giorniPrevisioni, setGiorniPrevisioni] = useState<GiornoPrevisione[]>(generaGiorniPrevisioni);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);

  const fetchGiorno = useCallback(async (giorno: number) => {
    setSelectedDayLoading(true);
    setGiorniPrevisioni((prev) =>
      prev.map((g) => (g.giorno === giorno ? { ...g, loading: true, error: null } : g))
    );

    const site = DECOLLI.find((s) => s.id === siteId) || DECOLLI[0];
    try {
      const data = await fetchMeteo(site.lat, site.lon);
      setGiorniPrevisioni((prev) =>
        prev.map((g) => (g.giorno === giorno ? { ...g, data, loading: false } : g))
      );
    } catch (err) {
      setGiorniPrevisioni((prev) =>
        prev.map((g) =>
          g.giorno === giorno ? { ...g, loading: false, error: "Errore caricamento" } : g
        )
      );
    }
    setSelectedDayLoading(false);
  }, [siteId]);

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

  // Giorni avanti (da domani in poi) per il MeteoTab
  const giorniAvanti = useMemo(() => {
    return giorniPrevisioni.map((g) => ({
      value: g.giorno,
      label: g.label,
    }));
  }, [giorniPrevisioni]);

  // ---- DATI PER IL GIORNO SELEZIONATO (dayIdx) ----
  // Quando dayIdx === 0: usa i dati correnti
  // Quando dayIdx > 0: usa i dati precaricati di giorniPrevisioni

  const isFutureDay = dayIdx > 0;
  const previsioneSelezionata = giorniPrevisioni.find((g) => g.giorno === dayIdx);

  // Per i giorni futuri, dobbiamo trovare l'indice corretto nell'array daily
  // Domani (giorno=1) è daily[1] nell'array restituito da Open-Meteo
  const futureDailyIndex = useMemo(() => {
    if (!isFutureDay || !previsioneSelezionata?.data?.daily?.length) return -1;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayIdx);
    return findDayIndex(
      previsioneSelezionata.data.daily.map((d) => d.date),
      targetDate
    );
  }, [isFutureDay, dayIdx, previsioneSelezionata]);

  // DayData: ore 9-19 per il giorno selezionato
  const dayData = useMemo((): HourData[] => {
    if (!isFutureDay) {
      // Oggi: filtra hourly per la data di oggi (daily[0])
      const targetDate = daily[0]?.date;
      if (!targetDate || !hourly.length) return [];
      return hourly.filter((h) => {
        const hd = h.time;
        return (
          hd.getDate() === targetDate.getDate() &&
          hd.getMonth() === targetDate.getMonth() &&
          hd.getFullYear() === targetDate.getFullYear()
        );
      });
    }

    // Giorno futuro
    if (!previsioneSelezionata?.data) return [];
    const prevHourly = filterFlightHours(previsioneSelezionata.data.hourly || []);
    if (!prevHourly.length) return [];

    // Trova la data target usando futureDailyIndex
    if (futureDailyIndex >= 0 && previsioneSelezionata.data.daily[futureDailyIndex]) {
      const targetDate = previsioneSelezionata.data.daily[futureDailyIndex].date;
      return filterByDate(prevHourly, targetDate);
    }

    // Fallback: calcola la data target
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayIdx);
    return filterByDate(prevHourly, targetDate);
  }, [hourly, daily, isFutureDay, previsioneSelezionata, dayIdx, futureDailyIndex]);

  // Current hour data: l'ora selezionata per il giorno selezionato
  const currentHourData = useMemo((): HourData | null => {
    if (!dayData.length) return null;
    // Cerca l'ora esatta selezionata
    const found = dayData.find((h) => h.time.getHours() === hour);
    return found || dayData[0];
  }, [dayData, hour]);

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

  // TERMICHE ORARIE: si aggiornano al variare di dayData
  const termicheHourly = useMemo(() => {
    if (!dayData.length) return [];
    return generaTermicheOrarie(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const previsioneData = previsioneSelezionata?.data;
  const previsioneDailyArr = previsioneData?.daily || [];
  const previsioneHourlyRawArr = previsioneData?.hourly || [];

  const previsioneHourly = useMemo(() => filterFlightHours(previsioneHourlyRawArr), [previsioneHourlyRawArr]);
  // Usa futureDailyIndex per ottenere i dati del giorno corretto
  const previsioneDayData = useMemo(() => {
    if (!previsioneHourly.length) return [];
    if (futureDailyIndex >= 0 && previsioneDailyArr[futureDailyIndex]) {
      const targetDate = previsioneDailyArr[futureDailyIndex].date;
      return filterByDate(previsioneHourly, targetDate);
    }
    return previsioneHourly;
  }, [previsioneHourly, previsioneDailyArr, futureDailyIndex]);
  const previsioneEnriched = useMemo(() => enrDaily(previsioneDailyArr, previsioneHourly), [previsioneDailyArr, previsioneHourly]);

  // Calcola un enrichedDaily per il giorno futuro selezionato
  const futureEnrichedDaily = useMemo(() => {
    if (!isFutureDay || !dayData.length) return enrichedDaily;
    // Per i giorni futuri, crea un enrichedDaily fittizio con i dati del giorno
    const maxTemp = Math.max(...dayData.map(h => h.temperature));
    const minTemp = Math.min(...dayData.map(h => h.temperature));
    const avgWind = dayData.length ? dayData.reduce((s, h) => s + h.windSpeed, 0) / dayData.length : 0;
    const maxWind = dayData.length ? Math.max(...dayData.map(h => h.windSpeed)) : 0;
    const avgCloud = dayData.length ? dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length : 0;
    const precipitationSum = dayData.reduce((s, h) => s + h.precipitation, 0);

    return [{
      date: new Date(),
      tempMax: maxTemp,
      tempMin: minTemp,
      weatherCode: dayData[0]?.weatherCode ?? 0,
      precipitationSum,
      avgWind,
      maxWind,
      avgCloud,
    }];
  }, [isFutureDay, dayData, enrichedDaily, dayIdx]);

  // Label per il giorno selezionato
  const selectedDayLabel = useMemo(() => {
    if (dayIdx === 0) {
      return new Date().toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
    return giorniAvanti.find(g => g.value === dayIdx)?.label || "";
  }, [dayIdx, giorniAvanti]);

  const apriPrevisioneGiorno = useCallback((giorno: number) => {
    const previsione = giorniPrevisioni.find((g) => g.giorno === giorno);
    if (!previsione?.data) {
      fetchGiorno(giorno);
      return;
    }

    setDayIdx(giorno);
    setShowDayDetail(true);
  }, [giorniPrevisioni, fetchGiorno]);

  const handleSiteSelect = useCallback((id: string) => {
    setSiteId(id);
    setDayIdx(0);
    setHour(new Date().getHours());
  }, []);

  const handleDayDetailClick = useCallback((idx: number) => {
    setDayIdx(idx);
    setShowDayDetail(true);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  const handleRetry = useCallback(() => {
    setGlobalLoading(true);
    setGlobalError(null);
    fetchAllDecolli();
  }, [fetchAllDecolli]);

  // Gestione selezione giorno futuro dai pulsanti in MeteoTab
  const handleDaySelectWithFetch = useCallback((idx: number) => {
    if (idx > 0) {
      const gp = giorniPrevisioni.find(g => g.giorno === idx);
      if (!gp?.data) {
        fetchGiorno(idx);
      }
    }
    setDayIdx(idx);
    // Resetta l'ora a 12 (mezzogiorno) per avere un'ora di riferimento valida per il giorno futuro
    if (idx > 0) {
      setHour(12);
    }
  }, [giorniPrevisioni, fetchGiorno]);

  // ---- CONDITIONAL RETURN DOPO TUTTI GLI HOOK ----
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
              {dayIdx === 0
                ? new Date().toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : selectedDayLabel}
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
              <>
                {selectedDayLoading && dayIdx > 0 && (
                  <div className="text-center py-4 text-sm text-blue-300 animate-pulse">
                    Caricamento previsioni per {selectedDayLabel}...
                  </div>
                )}
                <MeteoTab
                  current={currentHourData}
                  dayIdx={dayIdx}
                  hour={hour}
                  enrichedDaily={futureEnrichedDaily}
                  dateLabels={[selectedDayLabel]}
                  thermal={thermalAI}
                  pressureGrad={{ grad: 0, desc: "Non disponibile" }}
                  aiData={aiData as unknown as AiAnalysis | null}
                  onDaySelect={handleDaySelectWithFetch}
                  onDayDetailClick={handleDayDetailClick}
                  onHourChange={setHour}
                  termicheHourly={termicheHourly}
                  giorniAvanti={giorniAvanti}
                  fetchGiorno={fetchGiorno}
                />
              </>
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

          {showPopup && currentHourData && (
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

          {showDayDetail && !previsioneSelezionata?.data && (
            <DayDetailPopup
              dayData={dayData}
              daily={futureEnrichedDaily[0]}
              dayLabel={selectedDayLabel}
              altitude={currentSite.altitude}
              onClose={() => setShowDayDetail(false)}
              onHourSelect={(h) => {
                setHour(h);
                setShowDayDetail(false);
              }}
            />
          )}

          {showDayDetail && previsioneSelezionata?.data && previsioneEnriched[futureDailyIndex] && futureDailyIndex >= 0 && (
            <DayDetailPopup
              dayData={previsioneDayData}
              daily={previsioneEnriched[futureDailyIndex]}
              dayLabel={previsioneSelezionata.label}
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