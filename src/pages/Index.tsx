"use client";

import React, { useEffect, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import WeatherDashboard from "@/components/WeatherDashboard";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import Windgram from "@/components/Windgram";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import ProfiloVentoVerticale from "@/components/ProfiloVentoVerticale";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useMeteoCompleto } from "@/hooks/useMeteoCompleto";
import { useThreeSourceWeather } from "@/hooks/useThreeSourceWeather";
import { DECOLLI } from "@/data/decolli";
import { getStabilityIndex } from "@/utils/weatherHelpers";
import { avviaVerificaContinua } from "@/utils/mantenimentoAuto";
import { Activity, Wind } from "lucide-react";

export default function Index() {
  useEffect(() => { avviaVerificaContinua(60000); }, []);

  const {
    selectedId, setSelectedId, loading: weatherLoading, updating,
    selectedDay, setSelectedDay, selectedHour, setSelectedHour,
    activeTab, setActiveTab, lastUpdate, countdown, site, dayData,
    currentData, thermalDelta, enrichedDaily, dateLabels, loadWeather,
    activeModel, currentCape,
  } = useWeatherData();

  const { mergedDecolli, loading: aggressiveLoading, lastUpdate: aggressiveLastUpdate } = useThreeSourceWeather();

  const { tempoTrascorso } = useMeteoCompleto(
    site?.lat ?? DECOLLI[0].lat,
    site?.lon ?? DECOLLI[0].lon,
    site?.elevation_m ?? DECOLLI[0].elevation_m,
  );

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature ?? 20,
    currentData?.humidity ?? 50,
    currentData?.cloudCover ?? 30,
  );

  const isLoading = weatherLoading || aggressiveLoading;

  const filteredDayData = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    const oggi = new Date();
    const target = new Date(oggi);
    target.setDate(oggi.getDate() + selectedDay);
    return dayData.filter(h => {
      const d = new Date(h.time);
      return d.getDate() === target.getDate() && 
             d.getMonth() === target.getMonth() && 
             d.getFullYear() === target.getFullYear();
    });
  }, [dayData, selectedDay]);

  const dateLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  }, [selectedDay]);

  const hasData = Boolean(site && currentData && dayData.length > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm">Caricamento previsioni per {site?.site_name ?? "decollo..."}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            <UpdateTimer lastUpdate={aggressiveLastUpdate ?? lastUpdate} countdown={countdown} updating={updating} onRefresh={loadWeather} />
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300">{site?.site_name ?? "Decollo"} — Dati reali Open-Meteo + 3 Fonti</span>
              <span className="text-[10px] text-slate-500 ml-auto">{tempoTrascorso}s</span>
            </div>
            <DecolliCard
              decolli={mergedDecolli}
              selectedId={selectedId}
              selectedDay={selectedDay}
              onSelect={(item) => { setSelectedId(item.id); setSelectedHour(new Date().getHours()); }}
            />
          </aside>
          <div className="flex-1 min-w-0 space-y-6">
            {hasData && (
              <>
                <SiteHeader 
                  site_name={site!.site_name}
                  location_name={site!.location_name}
                  orientation={site!.orientation}
                  elevation_m={site!.elevation_m}
                  currentData={currentData} 
                />
                <PrevisioniGiornaliere enrichedDaily={enrichedDaily} dateLabels={dateLabels} currentData={currentData} dayData={dayData} site={{ name: site!.site_name, altitude: site!.elevation_m, exposure: site!.orientation }} selectedDay={selectedDay} onSelectDay={setSelectedDay} nomeDecollo={site!.site_name} />
                
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Wind className="w-5 h-5 text-emerald-400" />
                      Windgram Quote × Ore — {dateLabel}
                    </h3>
                    <span className="text-xs text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {site!.elevation_m}m → 4000m
                    </span>
                  </div>
                  <Windgram 
                    dayData={filteredDayData} 
                    siteName={site!.site_name} 
                    altitude={site!.elevation_m}
                    selectedHour={selectedHour}
                    onHourSelect={setSelectedHour}
                    selectedDay={selectedDay}
                    dateLabel={dateLabel}
                  />
                </div>
                
                <div className="bg-slate-800/30 border border-emerald-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Wind className="w-5 h-5 text-emerald-400" />
                      Profilo Verticale — {dateLabel}
                    </h3>
                    <span className="text-xs text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {site!.elevation_m}m → 4000m
                    </span>
                  </div>
                  <ProfiloVentoVerticale
                    siteAlt={site!.elevation_m}
                    siteName={site!.site_name}
                    lat={site!.lat}
                    lon={site!.lon}
                    selectedHour={selectedHour}
                    onHourSelect={setSelectedHour}
                  />
                </div>
                
                <WeatherDashboard dayData={filteredDayData} altitude={site!.elevation_m} selectedHour={selectedHour} onHourSelect={setSelectedHour} dayLabel={dateLabel} siteName={site!.site_name} />
                <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

                {activeTab === "meteo" && (
                  <MeteoTab currentData={currentData} dayData={filteredDayData} site={{ alt: site!.elevation_m, name: site!.site_name }} thermalDelta={thermalDelta} stabilityIndex={stabilityIndex} modelName={activeModel} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />
                )}

                {activeTab === "venti" && <VentiInterpolatiTab lat={site!.lat} lon={site!.lon} quotaDecollo={site!.elevation_m} selectedDay={selectedDay} oraCorrente={selectedHour} onOraChange={setSelectedHour} siteName={site!.site_name} />}
                {activeTab === "termiche" && <TermicheTab currentData={currentData} dayData={filteredDayData} site={{ alt: site!.elevation_m, lat: site!.lat, lon: site!.lon, name: site!.site_name }} />}
                {activeTab === "analisi" && <AnalisiMeteo currentData={currentData} dayData={filteredDayData} site={{ alt: site!.elevation_m, lat: site!.lat, lon: site!.lon, name: site!.site_name, exposure: site!.orientation }} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />}
              </>
            )}
            {!hasData && (
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