"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchMeteoHourly, fetchMeteoDaily, enrDaily, calcThermal, wic } from "@/utils/meteo";
import type { HourData, DailyData, ThermalData } from "@/types/meteo";
import { DECOLLI, type Decollo } from "@/data/decolli";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SiteList } from "@/components/SiteList";
import { SiteHeader } from "@/components/SiteHeader";
import { TabNav } from "@/components/TabNav";
import { MeteoTab } from "../components/MeteoTab";
import { VentiTab } from "../components/VentiTab";
import { TermicheTab } from "../components/TermicheTab";
import { AnalisiTab } from "../components/AnalisiTab";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { generaAnalisiReale } from "@/utils/analisi";
import WindgramChart from "@/components/WindgramChart";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

const dateLabels = ["Oggi", "Domani", "Tra 2gg", "Tra 3gg", "Tra 4gg", "Tra 5gg", "Tra 6gg"];

export const Index = () => {
  const [selectedSite, setSelectedSite] = useState<string>("malanotte");
  const [hourlyData, setHourlyData] = useState<HourData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(() => Math.min(Math.max(new Date().getHours(), 8), 18));
  const [tab, setTab] = useState<Tab>("meteo");

  const site = DECOLLI.find((d) => d.id === selectedSite) || DECOLLI[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hourly, daily] = await Promise.all([
        fetchMeteoHourly(site.lat, site.lon),
        fetchMeteoDaily(site.lat, site.lon),
      ]);
      setHourlyData(hourly);
      setDailyData(daily);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, [site.lat, site.lon]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dayHours = useMemo(() => {
    if (!hourlyData.length || !dailyData.length) return [];
    const day = dailyData[dayIdx];
    if (!day) return [];
    const dayStart = new Date(day.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    return hourlyData.filter((h) => {
      const t = h.time.getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });
  }, [hourlyData, dailyData, dayIdx]);

  const currentHourData = useMemo(() => {
    return dayHours.find((h) => h.time.getHours() === hour) || dayHours[0] || null;
  }, [dayHours, hour]);

  const thermal = useMemo(() => {
    if (!dayHours.length) return null;
    return calcThermal(dayHours, site.altitude);
  }, [dayHours, site.altitude]);

  const enrichedDaily = useMemo(() => {
    return enrDaily(dailyData, hourlyData);
  }, [dailyData, hourlyData]);

  const aiData = useMemo(() => {
    return generaAnalisiReale(dayHours, site.altitude);
  }, [dayHours, site.altitude]);

  const weatherMap = useMemo(() => {
    const map: Record<string, HourData> = {};
    DECOLLI.forEach((d) => {
      // placeholder: reuse first hour of site data
      map[d.id] = currentHourData || dayHours[0] || ({} as HourData);
    });
    return map;
  }, [currentHourData, dayHours]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={loadData} />;
  if (!currentHourData) return <ErrorScreen message="Nessun dato disponibile per l'ora selezionata" onRetry={loadData} />;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-50 to-white">
      <Header />

      <div className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 pb-8 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar siti */}
        <aside className="order-2 md:order-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
            <SiteList
              selected={selectedSite}
              current={currentHourData}
              onSelect={setSelectedSite}
              weatherMap={weatherMap}
            />
          </div>
        </aside>

        {/* Main */}
        <main className="order-1 md:order-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-5">
            <SiteHeader site={site} current={currentHourData} />
            <TabNav tab={tab} onTabChange={setTab} />

            {tab === "meteo" && (
              <MeteoTab
                current={currentHourData}
                dayIdx={dayIdx}
                hour={hour}
                enrichedDaily={enrichedDaily}
                dateLabels={dateLabels}
                thermal={thermal}
                pressureGrad={{ grad: 0, desc: "N/A" }}
                aiData={aiData}
                onDaySelect={setDayIdx}
                onHourChange={setHour}
              />
            )}

            {tab === "venti" && (
              <div>
                <WindgramChart dayData={dayHours} altitude={site.altitude} siteName={site.name} />
                <div className="mt-4">
                  <VentiTab dayData={dayHours} />
                </div>
              </div>
            )}

            {tab === "termiche" && (
              <TermicheTab dayData={dayHours} altitude={site.altitude} />
            )}

            {tab === "analisi" && (
              <AnalisiTab aiData={aiData} />
            )}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};