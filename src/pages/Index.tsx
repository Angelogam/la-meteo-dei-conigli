"use client";

import React, { useEffect } from "react";
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
import { Activity } from "lucide-react";
import { avviaVerificaContinua } from "@/utils/mantenimentoAuto";
import FinestraSemplice from "@/components/FinestraSemplice";

function IndexPage() {
  useEffect(() => {
    avviaVerificaContinua(60000);
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

  const { loading: analisiLoading, tempoTrascorso } = useMeteoCompleto(
    site?.lat ?? DECOLLI[0].lat,
    site?.lon ?? DECOLLI[0].lon,
    site?.altitude ?? DECOLLI[0].altitude,
  );

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature || 20,
    currentData?.humidity || 50,
    currentData?.cloudCover || 30,
  );

  if (weatherLoading && (!hourlyData || hourlyData.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm">Caricamento previsioni per {site?.name || "decollo..."}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasData = Boolean(site && currentData && dayData.length > 0);

  const decolliList = DECOLLI.map((d) => ({
    nome: d.name,
    valle: d.valley,
    quota: d.altitude,
    direzione: d.exposure,
  }));

  const nomeToId: Record<string, string> = {};
  DECOLLI.forEach((d) => {
    nomeToId[d.name] = d.id;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            <UpdateTimer
              lastUpdate={lastUpdate}
              countdown={countdown}
              updating={updating}
              onRefresh={loadWeather}
            />
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300">
                {site?.name || "Decollo"} — Analisi in tempo reale
              </span>
              <span className="text-[10px] text-slate-500 ml-auto">{tempoTrascorso}s</span>
            </div>
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
          </aside>
          <div className="flex-1 min-w-0 space-y-6">
            {hasData && (
              <>
                <SiteHeader
                  name={site!.name}
                  exposure={site!.exposure}
                  valley={site!.valley}
                  alt={site!.altitude}
                  currentData={currentData}
                />
                <PrevisioniGiornaliere
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  currentData={currentData}
                  dayData={dayData}
                  site={{
                    name: site!.name,
                    altitude: site!.altitude,
                    exposure: site!.exposure,
                  }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  nomeDecollo={site!.name}
                />
                <WeatherDashboard
                  dayData={dayData}
                  altitude={site!.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                  dayLabel={dateLabels[selectedDay] || ""}
                />
                <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
                {activeTab === "meteo" && (
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
                    site={{
                      name: site!.name,
                      alt: site!.altitude,
                      lat: site!.lat,
                      lon: site!.lon,
                    }}
                    selectedHour={selectedHour}
                    onHourSelect={setSelectedHour}
                  />
                )}
                {activeTab === "termiche" && (
                  <TermicheTab
                    currentData={currentData}
                    dayData={dayData}
                    site={{
                      alt: site!.altitude,
                      lat: site!.lat,
                      lon: site!.lon,
                      name: site!.name,
                    }}
                    hourlyData={hourlyData}
                  />
                )}
                {activeTab === "analisi" && (
                  <AnalisiMeteo
                    currentData={currentData}
                    dayData={dayData}
                    site={{
                      alt: site!.altitude,
                      lat: site!.lat,
                      lon: site!.lon,
                      name: site!.name,
                      exposure: site!.exposure,
                    }}
                    cape={currentCape?.cape}
                    liftedIndex={currentCape?.liftedIndex}
                    cin={currentCape?.cin}
                  />
                )}

                {/* BLOCCO FINESTRE METEO */}
                {currentData && (
                  <div className="space-y-4">
                    <FinestraSemplice
                      titolo="Mattina — Malanotte (21/07)"
                      giudizio="Buono per volo tranquillo"
                      vento="NW 9 km/h"
                      temperatura="16–17°C"
                      termiche="0.3 m/s (deboli)"
                      finestra="9:30 – 11:30"
                      umidita="55%"
                      pressione="1015 hPa"
                      cielo="Cumuli sparsi"
                      note="Base intorno ai 2000 m, possibili cumuli sparsi."
                    />
                    <FinestraSemplice
                      titolo="Pomeriggio — Malanotte (21/07)"
                      giudizio="Giornata stabile, aria secca"
                      vento="S 6 km/h"
                      temperatura="19–20°C"
                      termiche="0.1 m/s (molto deboli)"
                      finestra="14:00 – 17:00"
                      umidita="45%"
                      pressione="1016 hPa"
                      cielo="Sereno"
                      note="Base 2100–2400 m, condizioni regolari."
                    />
                    <FinestraSemplice
                      titolo="Sera — Malanotte (21/07)"
                      giudizio="Buono per restituzione"
                      vento="NW 8 km/h"
                      temperatura="17–19°C"
                      termiche="0.2 m/s (residue)"
                      finestra="18:00 – 20:00"
                      umidita="50%"
                      pressione="1015 hPa"
                      cielo="Poco nuvoloso"
                      note="Base 2000–2300 m, aria più umida."
                    />
                  </div>
                )}
              </>
            )}
            {!hasData && (
              <div className="text-center py-12 text-slate-400">
                <p>
                  Nessun dato meteo disponibile per {site?.name || "questo decollo"}.
                  Verifica la connessione o riprova.
                </p>
              </div>
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

export default IndexPage;