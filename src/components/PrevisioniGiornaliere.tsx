"use client";

import React, { useMemo } from "react";
import {
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, CloudFog,
  Calendar
} from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: any[];
  dateLabels?: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure?: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
}
// ... keep rest of file unchanged
</dyad-watch>

No, that approach is fragile — I need to write the whole file for the changes to be applied properly. But actually the issues are just 2: `dateLabels` required, and `alt` vs `altitude` on the site prop. Let me fix Index.tsx to pass `alt` as a computed prop and add `dateLabels`.

<dyad-write path="src/pages/Index.tsx" description="Fix — passa dateLabels, usa site.altitudine al posto di site.alt per il calcolo alt">
"use client";

import React, { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TermicheGrafico from "@/components/TermicheGrafico";
import MeteoTab from "@/components/MeteoTab";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import { useWeatherData } from "@/hooks/useWeatherData";

import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";

export default function Index() {
  const {
    selectedId, setSelectedId,
    loading, updating, error,
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
    allDailyData,
    allHourlyData,
    activeModel,
    currentCape,
  } = useWeatherData();

  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const windProfile = useMemo(() => {
    if (!currentData) return undefined;
    return currentData.windProfile;
  }, [currentData]);

  const stabilityIndex = useMemo(() => {
    if (!currentData) return { label: "N/D", color: "#64748b" };
    const ws = currentData.windSpeed || 0;
    const cc = currentData.cloudCover || 0;
    const hum = currentData.humidity || 50;
    const capeVal = currentCape?.cape ?? 0;
    const liVal = currentCape?.liftedIndex ?? 0;
    if (capeVal > 800 || liVal < -4) return { label: "Instabile", color: "#f87171" };
    if (capeVal > 300 || ws > 20 || hum > 70) return { label: "Moderato", color: "#fbbf24" };
    if (cc < 20 && ws > 5 && ws < 15) return { label: "Stabile", color: "#4ade80" };
    return { label: "Molto stabile", color: "#22d3ee" };
  }, [currentData, currentCape]);

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
  };

  const siteForPrevisioni = useMemo(() => ({
    name: site?.name || "Decollo",
    altitude: site?.altitude || 1000,
    exposure: site?.exposure,
  }), [site]);

  const siteForMeteo = useMemo(() => ({
    alt: site?.altitude || 1000,
    name: site?.name,
  }), [site]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} onRetry={loadWeather} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Previsioni Giornaliere */}
        <PrevisioniGiornaliere
          enrichedDaily={enrichedDaily}
          dateLabels={dateLabels}
          currentData={currentData}
          dayData={dayData}
          site={siteForPrevisioni}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
        />

        {/* Tabs principali */}
        <Tabs defaultValue="meteo" className="w-full">
          <TabsList className="w-full justify-center">
            <TabsTrigger value="meteo">Meteo</TabsTrigger>
            <TabsTrigger value="termiche">Termiche</TabsTrigger>
            <TabsTrigger value="vento">Vento</TabsTrigger>
          </TabsList>

          <TabsContent value="meteo">
            <MeteoTab
              currentData={currentData}
              dayData={dayData}
              site={siteForMeteo}
              thermalDelta={thermalDelta}
              stabilityIndex={stabilityIndex}
              modelName={activeModel}
              cape={currentCape?.cape ?? null}
              liftedIndex={currentCape?.liftedIndex ?? null}
              cin={currentCape?.cin ?? null}
            />
          </TabsContent>

          <TabsContent value="termiche">
            <TermicheGrafico
              dayData={dayData}
              alt={site?.altitude ?? 1000}
              siteName={site?.name}
              windProfile={windProfile}
            />
          </TabsContent>

          <TabsContent value="vento">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
              <p className="text-lg font-bold text-sky-300">Vento in arrivo nella prossima versione</p>
              <p className="text-sm text-slate-400 mt-2">I dati vento sono già disponibili nelle tab Meteo e Termiche</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}