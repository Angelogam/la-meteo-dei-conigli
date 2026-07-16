"use client";

import React, { useState } from "react";
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
import MeteoTesterPanel from "@/components/MeteoTesterPanel";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import { getWeatherAlert, getStabilityIndex } from "@/utils/weatherHelpers";
import ValidazionePrevisioni from "@/components/ValidazionePrevisioni";
import { ShieldCheck } from "lucide-react";
import type { MeteoHourly, MeteoCurrent } from "@/services/weatherService";

// Palette meteo basata sul vento (colori visivi)
function getWeatherMeta(vento: number): { iconaMeteo: string; coloreMeteo: string } {
  if (vento <= 8) return { iconaMeteo: "☀️", coloreMeteo: "#00c853" };
  if (vento <= 12) return { iconaMeteo: "🌤️", coloreMeteo: "#64dd17" };
  if (vento <= 16) return { iconaMeteo: "⛅", coloreMeteo: "#ffeb3b" };
  if (vento <= 20) return { iconaMeteo: "🌤️", coloreMeteo: "#ff9800" };
  if (vento <= 25) return { iconaMeteo: "☁️", coloreMeteo: "#f44336" };
  return { iconaMeteo: "💨", coloreMeteo: "#d32f2f" };
}

export default function Index() {
  const {
    selectedId, setSelectedId,
    loading,
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
    allDailyData,
    allHourlyData,
    activeModel,
    currentCape,
  } = useWeatherData();

  const [showValidation, setShowValidation] = useState(false);

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature || 20,
    currentData?.humidity || 50,
    currentData?.cloudCover || 30
  );

  const weatherAlert = getWeatherAlert(currentData, thermalDelta);

  // Converte l'hourlyData nel formato MeteoHourly per l'analisi avanzata
  const meteoHourlyForAnalysis: MeteoHourly[] = React.useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];
    return hourlyData.map(h => ({
      time: h.time,
      temperature: h.temperature,
      humidity: h.humidity,
      dewPoint: h.dewPoint,
      apparentTemp: h.apparentTemp,
      precipitation: h.precipitation,
      precipitationProbability: h.precipitationProba,
      weatherCode: h.weatherCode,
      cloudCover: h.cloudCover,
      windSpeed: h.windSpeed,
      windDir: h.windDir,
      windGusts: h.windGusts,
      uvIndex: h.uvIndex,
      shortwaveRadiation: h.shortwaveRadiation,
      cape: h.cape ?? 0,
      cin: h.cin ?? 0,
      liftedIndex: h.liftedIndex ?? 0,
      temp80m: h.temp80m ?? 0,
      temp120m: h.temp120m ?? 0,
      windProfile: h.windProfile || [],
    }));
  }, [hourlyData]);

  const meteoCurrentForAnalysis: MeteoCurrent | null = React.useMemo(() => {
    if (!currentData) return null;
    return {
      time: currentData.time,
      temperature: currentData.temperature,
      humidity: currentData.humidity,
      apparentTemp: currentData.apparentTemp,
      isDay: currentData.isDay ?? 1,
      precipitation: currentData.precipitation,
      weatherCode: currentData.weatherCode,
      cloudCover: currentData.cloudCover,
      pressure: currentData.pressure,
      surfacePressure: currentData.surfacePressure,
      windSpeed: currentData.windSpeed,
      windDir: currentData.windDir,
      windGusts: currentData.windGusts,
    };
  }, [currentData]);

  if (showValidation) {
    return (
      <>
        <ValidazionePrevisioni />
        <button
          onClick={() => setShowValidation(false)}
          className="fixed top-4 right-4 z-[10000] bg-red-900/60 hover:bg-red-800 text-white px-4 py-2 rounded-xl text-sm font-bold border border-red-500/50 shadow-2xl"
        >
          Chiudi validazione
        </button>
      </>
    );
  }

  if (loading && (!hourlyData || hourlyData.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm">Caricamento previsioni...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasData = site && currentData && dayData.length > 0;

  // Costruisce la lista decolli da passare a DecolliCard - usa i veri nomi dei decolli
  const decolliList = DECOLLI.map(d => ({
    nome: d.name,
    valle: d.valley,
    quota: d.altitude,
    direzione: d.exposure,
  }));

  // Mappa nome -> id per DecolliCard
  const nomeToId: Record<string, string> = {};
  DECOLLI.forEach(d => { nomeToId[d.name] = d.id; });

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
                  site={{ name: site!.name, altitude: site!.altitude, exposure: site!.exposure }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />

                <WeatherDashboard
                  dayData={dayData}
                  altitude={site!.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                />

                <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

                {activeTab === "meteo" && (
                  <MeteoTab
                    currentData={currentData}
                    dayData={dayData}
                    site={{ alt: site!.altitude }}
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
                  />
                )}

                {activeTab === "termiche" && (
                  <TermicheTab
                    currentData={currentData}
                    dayData={dayData}
                    site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon }}
                    hourlyData={meteoHourlyForAnalysis}
                    current={meteoCurrentForAnalysis || undefined}
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
              </>
            )}

            {!hasData && (
              <div className="text-center py-12 text-slate-400">
                <p>Nessun dato meteo disponibile. Verifica la connessione o riprova.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MeteoTesterPanel />

      <button
        onClick={() => setShowValidation(true)}
        className="fixed bottom-4 left-4 z-50 bg-amber-800/80 hover:bg-amber-700 text-amber-200 border border-amber-500/40 rounded-full p-3 shadow-2xl shadow-amber-500/10"
        title="Confronta previsioni con climatologia storica"
      >
        <ShieldCheck className="w-5 h-5" />
      </button>
    </div>
  );
}