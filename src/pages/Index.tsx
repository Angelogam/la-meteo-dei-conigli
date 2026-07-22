"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import Windgram from "@/components/Windgram";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import MeteoTesterPanel from "@/components/MeteoTesterPanel";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useMeteoCompleto } from "@/hooks/useMeteoCompleto";
import { DECOLLI } from "@/data/decolli";
import { getStabilityIndex } from "@/utils/weatherHelpers";
import { Activity, ChevronDown, Sparkles } from "lucide-react";
import { avviaVerificaContinua } from "@/utils/mantenimentoAuto";
import FinestraSemplice from "@/components/FinestraSemplice";
import MeteoCardOraria from "@/components/MeteoCardOraria";
import MeteoAnalisi from "@/components/MeteoAnalisi";
import HourlyTable from "@/components/HourlyTable";
import { motion, AnimatePresence } from "framer-motion";

export default function Index() {
  // Avvia verifica continua all'avvio
  useEffect(() => {
    avviaVerificaContinua(60000); // ogni 60 secondi
  }, []);

  const {
    selectedId, setSelectedId,
    loading: weatherLoading,
    updating,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    hourlyData,
    allHourlyData,
    allDailyData,
    activeModel,
    currentCape,
  } = useWeatherData();

  const {
    loading: analisiLoading,
    tempoTrascorso,
  } = useMeteoCompleto(
    site?.lat ?? DECOLLI[0].lat,
    site?.lon ?? DECOLLI[0].lon,
    site?.altitude ?? DECOLLI[0].altitude,
  );

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature || 20,
    currentData?.humidity || 50,
    currentData?.cloudCover || 30,
  );

  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const hasData = Boolean(site && currentData && dayData.length > 0);

  const decolliList = useMemo(() => DECOLLI.map(d => ({
    nome: d.name,
    valle: d.valley,
    quota: d.altitude,
    direzione: d.exposure,
  })), []);

  const nomeToId = useMemo(() => {
    const map: Record<string, string> = {};
    DECOLLI.forEach(d => { map[d.name] = d.id; });
    return map;
  }, []);

  if (weatherLoading && (!hourlyData || hourlyData.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <Sparkles className="w-6 h-6 text-emerald-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 text-base font-semibold">Caricamento previsioni</p>
              <p className="text-slate-500 text-sm mt-1">{site?.name || "Decollo in aggiornamento..."}</p>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Sfondo animato sottile */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />
      </div>

      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Decolli */}
          <AnimatePresence mode="wait">
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={`w-full lg:w-80 shrink-0 space-y-4 ${
                sidebarCollapsed ? "lg:w-16" : ""
              } transition-all duration-300`}
            >
              <div className="flex items-center gap-2">
                <UpdateTimer
                  lastUpdate={lastUpdate}
                  countdown={countdown}
                  updating={updating}
                  onRefresh={loadWeather}
                />
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="bg-gradient-to-r from-emerald-900/30 to-slate-800/40 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-300 font-medium">
                    {site?.name || "Decollo"}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-auto">
                    {tempoTrascorso}s
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <DecolliCard
                  decolli={decolliList}
                  selectedId={selectedId}
                  onSelect={(item) => {
                    const id = nomeToId[item.nome];
                    if (id) {
                      setSelectedId(id);
                      setSelectedHour(new Date().getHours());
                    }
                  }}
                  weatherMap={allHourlyData}
                />
              </motion.div>
            </motion.aside>
          </AnimatePresence>

          {/* Contenuto principale */}
          <div className="flex-1 min-w-0 space-y-6">
            {hasData ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedId + selectedDay}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  {/* SiteHeader con animazione */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SiteHeader
                      name={site!.name}
                      exposure={site!.exposure}
                      valley={site!.valley}
                      alt={site!.altitude}
                      currentData={currentData}
                    />
                  </motion.div>

                  {/* Previsioni Giornaliere */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <PrevisioniGiornaliere
                      enrichedDaily={enrichedDaily}
                      dateLabels={dateLabels}
                      currentData={currentData}
                      dayData={dayData}
                      site={{ name: site!.name, altitude: site!.altitude, exposure: site!.exposure }}
                      selectedDay={selectedDay}
                      onSelectDay={setSelectedDay}
                      nomeDecollo={site!.name}
                    />
                  </motion.div>

                  {/* WeatherDashboard (FlightScore + HourlyTable) */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <WeatherDashboard
                      dayData={dayData}
                      altitude={site!.altitude}
                      selectedHour={selectedHour}
                      onHourSelect={setSelectedHour}
                      dayLabel={dateLabels[selectedDay] || ""}
                    />
                  </motion.div>

                  {/* Separatore elegante */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700/30" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                        Analisi Dettagliata
                      </span>
                    </div>
                  </div>

                  {/* Tab Navigator */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
                  </motion.div>

                  {/* Contenuto dei tab con animazione */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab + selectedDay + selectedHour}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
                      {activeTab === "meteo" && (
                        <div className="space-y-4">
                          <MeteoTab
                            currentData={currentData}
                            dayData={dayData}
                            site={{ alt: site!.altitude, name: site!.name }}
                            thermalDelta={thermalDelta}
                            stabilityIndex={stabilityIndex}
                            modelName={activeModel}
                            cape={currentCape?.cape}
                            liftedIndex={currentCape?.liftedIndex}
                            cin={currentCape?.cin}
                          />
                          <MeteoAnalisi
                            data={{
                              giorno: new Date().toLocaleDateString("it-IT", { weekday: "long" }),
                              data: new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }),
                              decollo: site!.name,
                              meteo: currentData?.weatherCode != null && currentData.weatherCode >= 95 ? "pioggia" : currentData?.weatherCode != null && currentData.weatherCode >= 20 ? "nuvoloso" : "sole",
                              ventoDecollo: Math.round(currentData?.windSpeed ?? 0),
                              ventoAtterraggio: Math.round((currentData?.windSpeed ?? 0) * 0.7),
                              raffiche: Math.round(currentData?.windGusts ?? 0),
                              baseNuvole: Math.round(((currentData?.temperature ?? 15) - (currentData?.dewPoint ?? 5)) * 125 + site!.altitude),
                              topTermiche: Math.round(((currentData?.temperature ?? 15) - (currentData?.dewPoint ?? 5)) * 125 + site!.altitude + 500),
                              forzaTermica: 5,
                              turbolenza: (currentData?.windGusts ?? 0) > 30 ? "Forte" : (currentData?.windGusts ?? 0) > 20 ? "Moderata" : "Leggera",
                              cape: currentCape?.cape ?? 500,
                              liftedIndex: currentCape?.liftedIndex ?? -2,
                              umidita: Math.round(currentData?.humidity ?? 50),
                              pressione: Math.round(currentData?.pressure ?? 1013),
                              nuvolosita: Math.round(currentData?.cloudCover ?? 30),
                              uvIndex: Math.round(currentData?.uvIndex ?? 5),
                              deltaT: Math.round(thermalDelta ?? 8),
                              gradiente: 0.98,
                              zeroTermico: Math.round(site!.altitude + (currentData?.temperature ?? 15) / 0.0098 + 200),
                            }}
                          />
                        </div>
                      )}
                      {activeTab === "venti" && (
                        <VentiInterpolatiTab
                          lat={site!.lat}
                          lon={site!.lon}
                          quotaDecollo={site!.altitude}
                          selectedDay={selectedDay}
                          oraCorrente={selectedHour}
                          onOraChange={setSelectedHour}
                          siteName={site!.name}
                        />
                      )}
                      {activeTab === "windgram" && (
                        <Windgram
                          hourlyData={hourlyData}
                          site={{ name: site!.name, alt: site!.altitude, lat: site!.lat, lon: site!.lon }}
                          selectedHour={selectedHour}
                          onHourSelect={setSelectedHour}
                        />
                      )}
                      {activeTab === "termiche" && (
                        <TermicheTab
                          currentData={currentData}
                          dayData={dayData}
                          site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name }}
                          hourlyData={hourlyData}
                        />
                      )}
                      {activeTab === "analisi" && (
                        <AnalisiMeteo
                          currentData={currentData}
                          dayData={dayData}
                          site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name, exposure: site!.exposure }}
                          cape={currentCape?.cape}
                          liftedIndex={currentCape?.liftedIndex}
                          cin={currentCape?.cin}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Finestre di Volo (Mattina, Pomeriggio, Sera) */}
                  <div className="space-y-3 mt-6">
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700/30" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                          Finestre di Volo
                        </span>
                      </div>
                    </div>

                    <FinestraSemplice
                      titolo={`Mattina — ${site!.name} (${new Date().toLocaleDateString("it-IT", { day: "numeric", month: "short" })})`}
                      giudizio="Volo possibile"
                      vento={`${Math.round(currentData?.windSpeed ?? 0)} km/h`}
                      temperatura={`${Math.round((currentData?.temperature ?? 15) - 3)}–${Math.round(currentData?.temperature ?? 15)}°C`}
                      termiche={`${((currentData?.temperature ?? 15) - (currentData?.dewPoint ?? 5)) * 0.15 > 0.3 ? "0.3–0.8" : "< 0.3"} m/s`}
                      finestra="9:00 – 11:30"
                      note="Base intorno ai 2000 m, cumuli in sviluppo."
                    />
                    <FinestraSemplice
                      titolo={`Pomeriggio — ${site!.name} (${new Date().toLocaleDateString("it-IT", { day: "numeric", month: "short" })})`}
                      giudizio="Finestra migliore"
                      vento={`${Math.round((currentData?.windSpeed ?? 0) * 0.8)} km/h`}
                      temperatura={`${Math.round(currentData?.temperature ?? 15)}–${Math.round((currentData?.temperature ?? 15) + 2)}°C`}
                      termiche={`${((currentData?.temperature ?? 15) - (currentData?.dewPoint ?? 5)) * 0.2 > 0.5 ? "0.5–1.2" : "0.2–0.5"} m/s`}
                      finestra="12:00 – 16:30"
                      note="Base 2200–2500 m, termiche nel picco."
                    />
                    <FinestraSemplice
                      titolo={`Sera — ${site!.name} (${new Date().toLocaleDateString("it-IT", { day: "numeric", month: "short" })})`}
                      giudizio="Rientro tranquillo"
                      vento={`${Math.round((currentData?.windSpeed ?? 0) * 0.6)} km/h`}
                      temperatura={`${Math.round((currentData?.temperature ?? 15) - 2)}–${Math.round(currentData?.temperature ?? 15)}°C`}
                      termiche="< 0.3 m/s"
                      finestra="17:00 – 19:30"
                      note="Termiche residue, aria più stabile."
                    />
                  </div>

                  {/* Card Orarie */}
                  <div className="space-y-3 mt-2">
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700/30" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                          Andamento Orario
                        </span>
                      </div>
                    </div>

                    <MeteoCardOraria
                      fascia="Mattina"
                      data={{
                        temp: Math.round((currentData?.temperature ?? 15) - 2),
                        tempMax: Math.round(currentData?.temperature ?? 17),
                        vento: Math.round(currentData?.windSpeed ?? 8),
                        direzione: "—",
                        base: Math.round(((currentData?.temperature ?? 15) - (currentData?.dewPoint ?? 5)) * 120 + site!.altitude),
                        top: Math.round(((currentData?.temperature ?? 15) - (currentData?.dewPoint ?? 5)) * 120 + site!.altitude + 400),
                        umidita: Math.round(currentData?.humidity ?? 60),
                        pioggia: currentData?.precipitation ?? 0,
                        pressione: Math.round(currentData?.pressure ?? 1013),
                        score: 7,
                        migliorOra: "10:30",
                        piccoTermico: 0.4,
                        commentoVolo: "Termiche regolari, vento gestibile.",
                      }}
                    />
                    <MeteoCardOraria
                      fascia="Pomeriggio"
                      data={{
                        temp: Math.round(currentData?.temperature ?? 19),
                        tempMax: Math.round((currentData?.temperature ?? 19) + 2),
                        vento: Math.round((currentData?.windSpeed ?? 8) * 0.9),
                        direzione: "—",
                        base: Math.round(((currentData?.temperature ?? 19) - (currentData?.dewPoint ?? 6)) * 120 + site!.altitude),
                        top: Math.round(((currentData?.temperature ?? 19) - (currentData?.dewPoint ?? 6)) * 120 + site!.altitude + 600),
                        umidita: Math.min(100, Math.round((currentData?.humidity ?? 60) - 5)),
                        pioggia: 0,
                        pressione: Math.round(currentData?.pressure ?? 1013),
                        score: 8,
                        migliorOra: "14:00",
                        piccoTermico: 0.6,
                        commentoVolo: "Finestra ottimale, termiche al picco.",
                      }}
                    />
                    <MeteoCardOraria
                      fascia="Sera"
                      data={{
                        temp: Math.round((currentData?.temperature ?? 17) - 2),
                        tempMax: Math.round(currentData?.temperature ?? 17),
                        vento: Math.round((currentData?.windSpeed ?? 8) * 0.6),
                        direzione: "—",
                        base: Math.round(((currentData?.temperature ?? 17) - (currentData?.dewPoint ?? 5)) * 120 + site!.altitude),
                        top: Math.round(((currentData?.temperature ?? 17) - (currentData?.dewPoint ?? 5)) * 120 + site!.altitude + 300),
                        umidita: Math.min(100, Math.round((currentData?.humidity ?? 60) + 10)),
                        pioggia: 0,
                        pressione: Math.round((currentData?.pressure ?? 1013)),
                        score: 7,
                        migliorOra: "18:00",
                        piccoTermico: 0.2,
                        commentoVolo: "Condizioni tranquille per atterraggio.",
                      }}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 text-slate-400"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-base font-medium text-slate-300">Nessun dato meteo disponibile</p>
                <p className="text-sm text-slate-500 mt-1">
                  {site?.name ? `Verifica la connessione per ${site.name}` : "Seleziona un decollo per iniziare"}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MeteoTesterPanel />
      <DiagnosticaPanel />
    </div>
  );
}