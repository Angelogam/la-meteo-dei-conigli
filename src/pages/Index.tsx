"use client";

import { useState, useEffect, useMemo } from "react";
import { DECOLLI } from "@/data/decolli";
import { fetchMeteoHourly } from "@/utils/meteo";
import { genAI } from "@/utils/analisi";
import { calcThermal } from "@/utils/meteo";
import type { HourData, AiAnalysis, ThermalData, DailyData } from "@/types/meteo";
import { SiteHeader } from "@/components/SiteHeader";
import { TabNav } from "@/components/TabNav";
import { SiteList } from "@/components/SiteList";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import { enrDaily, getZeroTermico } from "@/utils/meteo";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export default function Index() {
  const [allHourly, setAllHourly] = useState<Record<string, HourData[]>>({});
  const [currentMap, setCurrentMap] = useState<Record<string, HourData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("malanotte");
  const [hour, setHour] = useState<number>(new Date().getHours());
  const [dayIdx, setDayIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("meteo");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(
      DECOLLI.map((d) =>
        fetchMeteoHourly(d.lat, d.lon)
          .then((hourly) => ({ id: d.id, hourly }))
          .catch((e) => ({ id: d.id, hourly: [] as HourData[], error: e.message }))
      )
    ).then((results) => {
      if (cancelled) return;
      const hourlyMap: Record<string, HourData[]> = {};
      const errResult = results.find((r) => "error" in r && r.error) as { error: string } | undefined;
      for (const r of results) {
        hourlyMap[r.id] = (r as any).hourly || [];
      }
      setAllHourly(hourlyMap);
      const cmap: Record<string, HourData> = {};
      const h = new Date().getHours();
      for (const r of results) {
        const hdata = (r as any).hourly as HourData[];
        cmap[r.id] = hdata.find((x: HourData) => new Date(x.time).getHours() === h) || hdata[0];
      }
      setCurrentMap(cmap);
      if (errResult) setError(errResult.error);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!Object.keys(allHourly).length) return;
    const cmap: Record<string, HourData> = {};
    for (const [id, hdata] of Object.entries(allHourly)) {
      if (hdata.length) {
        cmap[id] = hdata.find((x) => new Date(x.time).getHours() === hour) || hdata[0];
      }
    }
    setCurrentMap(cmap);
  }, [hour, allHourly]);

  const selected = DECOLLI.find((d) => d.id === selectedId) || DECOLLI[0];
  const dayData = useMemo(() => allHourly[selectedId] || [], [allHourly, selectedId]);
  const current = useMemo(() => currentMap[selectedId] || null, [currentMap, selectedId]);

  const daily = useMemo(() => {
    if (!dayData.length) return [];
    const days: DailyData[] = [];
    const seen = new Set<string>();
    for (const h of dayData) {
      const dateKey = h.time.toISOString().slice(0, 10);
      if (seen.has(dateKey)) continue;
      seen.add(dateKey);
      const dayHours = dayData.filter((x) => x.time.toISOString().slice(0, 10) === dateKey);
      const temps = dayHours.map((x) => x.temperature);
      const maxTemp = Math.max(...temps);
      const minTemp = Math.min(...temps);
      const prec = dayHours.reduce((s, x) => s + x.precipitation, 0);
      const codes = dayHours.map((x) => x.weatherCode);
      const mode = codes.sort((a, b) => codes.filter((c) => c === a).length - codes.filter((c) => c === b).length).pop() || 0;
      days.push({
        date: new Date(dayHours[0].time),
        tempMax: maxTemp,
        tempMin: minTemp,
        weatherCode: mode,
        precipitationSum: prec,
      });
    }
    return days;
  }, [dayData]);

  const enrichedDaily = useMemo(() => enrDaily(daily, dayData), [daily, dayData]);

  const dateLabels = useMemo(() => {
    return enrichedDaily.map((d) => {
      const dt = new Date(d.date);
      const today = new Date();
      const diff = Math.round((dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) return "Oggi";
      if (diff === 1) return "Domani";
      if (diff === -1) return "Ieri";
      return `${DAY_NAMES[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}`;
    });
  }, [enrichedDaily]);

  const thermal = useMemo(() => (dayData.length ? calcThermal(dayData, selected.altitude) : null), [dayData, selected.altitude]);
  const aiData = useMemo(() => genAI(dayData, selected, thermal), [dayData, selected, thermal]);

  if (error) {
    return <ErrorScreen message={error} onRetry={() => window.location.reload()} />;
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 w-full mx-auto px-1 sm:px-3 py-2 max-w-[1600px]">
        <Header />

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3">
          <div className="w-full">
            <SiteList
              selected={selectedId}
              current={current}
              onSelect={setSelectedId}
              weatherMap={currentMap}
            />
          </div>

          <div className="w-full">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-5 mb-3">
              {current && <SiteHeader site={selected} current={current} />}

              <TabNav tab={activeTab} onTabChange={setActiveTab} />

              {activeTab === "meteo" && current && (
                <MeteoTab
                  current={current}
                  dayIdx={dayIdx}
                  hour={hour}
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  thermal={thermal}
                  pressureGrad={{ grad: 0, desc: "Stabile" }}
                  aiData={aiData}
                  onDaySelect={setDayIdx}
                  onHourChange={setHour}
                />
              )}

              {activeTab === "venti" && (
                <VentiTab dayData={dayData} />
              )}

              {activeTab === "termiche" && (
                <TermicheTab aiData={aiData} />
              )}

              {activeTab === "analisi" && (
                <AnalisiTab aiData={aiData} />
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}