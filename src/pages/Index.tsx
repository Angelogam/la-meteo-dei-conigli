"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import TabNav from "@/components/TabNav";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import { avviaVerificaContinua } from "@/utils/mantenimentoAuto";
import { Activity } from "lucide-react";
import AlpiumBriefing from "@/components/AlpiumBriefing";

export default function Index() {
  useEffect(() => { avviaVerificaContinua(60000); }, []);

  const {
    selectedId, setSelectedId, loading: weatherLoading, updating,
    selectedDay, setSelectedDay, selectedHour, setSelectedHour,
    activeTab, setActiveTab, lastUpdate, countdown, site, dayData,
    currentData, thermalDelta, enrichedDaily, dateLabels, loadWeather,
    activeModel, currentCape,
  } = useWeatherData();

  const decolliList = useMemo(
    () => DECOLLI.map((d) => ({ id: d.id, nome: d.name, valle: d.valley, quota: d.altitude, direzione: d.exposure, lat: d.lat, lon: d.lon })),
    [],
  );

  const nomeToId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const d of DECOLLI) m[d.name] = d.id;
    return m;
  }, []);

  if (weatherLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm">Caricamento previsioni per {site?.name ?? "decollo..."}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasData = Boolean(site && currentData && dayData.length > 0);
  const siteConfig = site ? { name: site.name, lat: site.lat, lon: site.lon, altitude: site.altitude, exposure: site.exposure } : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            <UpdateTimer lastUpdate={lastUpdate} countdown={countdown} updating={updating} onRefresh={loadWeather} />
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300 truncate">{site?.name ?? "Decollo"} — Briefing Alpium</span>
              <span className="text-[10px] text-slate-500 ml-auto">Open-Meteo</span>
            </div>
            <DecolliCard
              decolli={decolliList}
              selectedId={selectedId}
              selectedDay={selectedDay}
              onSelect={(item) => { const id = nomeToId[item.nome]; if (id) { setSelectedId(id); setSelectedHour(new Date().getHours()); } }}
            />
          </aside>
          <div className="flex-1 min-w-0 space-y-6">
            {hasData && siteConfig && (
              <>
                <SiteHeader
                  name={site!.name}
                  exposure={site!.exposure}
                  valley={site!.valley}
                  alt={site!.altitude}
                  currentData={currentData}
                  selectedHour={selectedHour}
                />
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
                
                {/* NUOVO BRIEFING COMPLETO STILE ALPIUM */}
                <AlpiumBriefing 
                  site={siteConfig} 
                  selectedDay={selectedDay} 
                />
              </>
            )}
            {!hasData && (
              <div className="text-center py-12 text-slate-400">
                <p>Nessun dato meteo disponibile per {site?.name ?? "questo decollo"}. Verifica la connessione o riprova.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}