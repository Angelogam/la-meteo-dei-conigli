"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import Windgram from "@/components/Windgram";
import RasoftWindgram from "@/components/RasoftWindgram";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import WeatherDashboard from "@/components/WeatherDashboard";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useMeteoCompleto } from "@/hooks/useMeteoCompleto";
import { useThreeSourceWeather } from "@/hooks/useThreeSourceWeather";
import { DECOLLI } from "@/data/decolli";
import { avviaVerificaContinua } from "@/utils/mantenimentoAuto";
import { Activity } from "lucide-react";

export default function Index() {
  const [appMounted, setAppMounted] = useState(false);
  const [fetchStarted, setFetchStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAppMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!appMounted) return;
    avviaVerificaContinua(60000);
  }, [appMounted]);

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

  const { currentCape, activeModel } = useMemo(() => ({
    currentCape: currentData ? { cape: currentData.cape ?? 0, liftedIndex: currentData.liftedIndex ?? 0, cin: currentData.cin ?? 0 } : null,
    activeModel: "Open-Meteo" as const,
  }), [currentData]);

  const { mergedDecolli, loading: aggressiveLoading, lastUpdate: aggressiveLastUpdate } = useThreeSourceWeather();

  const { tempoTrascorso } = useMeteoCompleto(
    site?.lat ?? DECOLLI[0].lat,
    site?.lon ?? DECOLLI[0].lon,
    site?.elevation_m ?? DECOLLI[0].elevation_m
  );

  const [isOfflineMode, setIsOfflineMode] = useState(false);

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
    const mesi = [
      "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
    ];
    return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  }, [selectedDay]);

  const showCards = true;

  useEffect(() => {
    if (!appMounted || fetchStarted) return;
    setFetchStarted(true);
    loadWeather();
  }, [appMounted, fetchStarted, loadWeather]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* ★★★ 飞行雷达气象站 - 核心功能恢复 ★★★ */}
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6" style={{ marginTop: 80 }}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── SIDEBAR ─── */}
          <aside className="w-full lg:w-80 shrink-0 space-y-3">
            {/* Timer aggiornamento */}
            <UpdateTimer
              lastUpdate={aggressiveLastUpdate ?? lastUpdate}
              countdown={countdown}
              updating={updating}
              onRefresh={() => { loadWeather(); setFetchStarted(false); }}
            />

            {/* Info decollo corrente */}
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-emerald-500/25 rounded-2xl px-4 py-3 overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-emerald-300 truncate">{site?.site_name ?? "Decollo"}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Open-Meteo + 3 fonti · {tempoTrascorso}s ago</div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shadow-sm shadow-sky-400/60" style={{ animationDelay: '0.3s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shadow-sm shadow-violet-400/60" style={{ animationDelay: '0.6s' }} />
                </div>
              </div>
            </div>

            {/* Lista decolli */}
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

          {/* ─── MAIN CONTENT ─── */}
          <div className="flex-1 min-w-0 space-y-6">
            {showCards && site && (
              <>
                {isOfflineMode && (
                  <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-300">
                      ⚠️ Dati offline (API non raggiungibile) - Stima automatica attiva
                    </span>
                  </div>
                )}

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

                {/* Previsioni orarie */}
                <WeatherDashboard
                  dayData={dayData}
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
                    modelName={activeModel}
                    selectedHour={selectedHour}
                    selectedDay={selectedDay}
                    cape={currentCape?.cape}
                    liftedIndex={currentCape?.liftedIndex}
                    cin={currentCape?.cin}
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
                      cape={currentCape?.cape}
                      liftedIndex={currentCape?.liftedIndex}
                      cin={currentCape?.cin}
                      rawData={rawApiResponse}
                    />
                  </div>
                )}
              </>
            )}
            {!showCards && (
              <div className="text-center py-12 text-slate-400">
                <p>Nessun dato meteo disponibile per {site?.site_name ?? "questo decollo"}. Verifica la connessione o riprova.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <DiagnosticaPanel />
    </div>
  );
}
