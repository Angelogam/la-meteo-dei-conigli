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
import { useMeteoCompleto } from "@/hooks/useMeteoCompleto";
import { DECOLLI } from "@/data/decolli";
import { getStabilityIndex } from "@/utils/weatherHelpers";
import { Activity } from "lucide-react";
import type { MeteoHourly, MeteoCurrent } from "@/services/weatherService";

export default function Index() {
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
    activeModel,
    currentCape,
  } = useWeatherData();

  const {
    riepilogo: riepilogoAvanzato,
    loading: analisiLoading,
    hourlyData: hourlyDataAvanzati,
    currentData: currentDataAvanzato,
    tempoTrascorso,
  } = useMeteoCompleto(
    site?.lat ?? DECOLLI[0].lat,
    site?.lon ?? DECOLLI[0].lon,
    site?.altitude ?? DECOLLI[0].altitude
  );

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature || 20,
    currentData?.humidity || 50,
    currentData?.cloudCover || 30
  );

  const meteoHourlyForAnalysis: MeteoHourly[] = React.useMemo(() => {
    const data = hourlyDataAvanzati.length > 0 ? hourlyDataAvanzati : hourlyData;
    if (!data || data.length === 0) return [];
    return data.map(h => ({
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
  }, [hourlyData, hourlyDataAvanzati]);

  const meteoCurrentForAnalysis: MeteoCurrent | null = React.useMemo(() => {
    const data = currentDataAvanzato || currentData;
    if (!data) return null;
    return {
      time: data.time,
      temperature: data.temperature,
      humidity: data.humidity,
      apparentTemp: data.apparentTemp,
      isDay: data.isDay ?? 1,
      precipitation: data.precipitation,
      weatherCode: data.weatherCode,
      cloudCover: data.cloudCover,
      pressure: data.pressure,
      surfacePressure: data.surfacePressure,
      windSpeed: data.windSpeed,
      windDir: data.windDir,
      windGusts: data.windGusts,
    };
  }, [currentData, currentDataAvanzato]);

  if (weatherLoading && (!hourlyData || hourlyData.length === 0)) {
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

  const decolliList = DECOLLI.map(d => ({
    nome: d.name,
    valle: d.valley,
    quota: d.altitude,
    direzione: d.exposure,
  }));

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
              updating={updating || analisiLoading} 
              onRefresh={loadWeather} 
            />
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300">Analisi in tempo reale</span>
              <span className="text-[10px] text-slate-500 ml-auto">{tempoTrascorso}s</span>
            </div>
            {riepilogoAvanzato && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Confidenza media</span>
                  <span className={`font-bold ${
                    riepilogoAvanzato.mediaConfidenza >= 0.8 ? "text-green-400" :
                    riepilogoAvanzato.mediaConfidenza >= 0.6 ? "text-amber-400" :
                    "text-red-400"
                  }`}>
                    {Math.round(riepilogoAvanzato.mediaConfidenza * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Margine d'errore</span>
                  <span className="text-amber-300 font-bold">{riepilogoAvanzato.medioErrore}%</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">CAPE medio</span>
                  <span className="text-purple-300 font-bold">{riepilogoAvanzato.medioCape} J/kg</span>
                </div>
              </div>
            )}
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
    </div>
  );
}