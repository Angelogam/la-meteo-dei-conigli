"use client";
import React, { useEffect, useState, useMemo } from "react";
import { DECOLLI, Decollo } from "@/data/decolli";
import { fetchMeteo, getWindProfile, calcThermal } from "@/utils/meteo";
import { genAI } from "@/utils/analisi";
import type { HourData, DailyData, MeteoData, ThermalData, AiAnalysis, PressureGradient } from "@/types/meteo";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SiteList } from "@/components/SiteList";
import { SiteHeader } from "@/components/SiteHeader";
import { TabNav } from "@/components/TabNav";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";

type TabId = "meteo" | "venti" | "termiche" | "analisi";

export default function Index() {
  const [selected, setSelected] = useState(DECOLLI[0].id);
  const [meteo, setMeteo] = useState<MeteoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(12);
  const [tab, setTab] = useState<TabId>("meteo");
  const [aiData, setAiData] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const site = DECOLLI.find((x) => x.id === selected) ?? DECOLLI[0];

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setMeteo(await fetchMeteo(site.lat, site.lon));
      } catch (e: any) {
        setError(e.message || "Errore caricamento dati");
      } finally {
        setLoading(false);
      }
    })();
  }, [selected]);

  const dayData = useMemo(() => {
    if (!meteo) return [];
    const start = new Date();
    start.setDate(start.getDate() + dayIdx);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return meteo.hourly.filter((h) => h.time >= start && h.time < end);
  }, [meteo, dayIdx]);

  const current = useMemo(
    () => (dayData.length > 0 ? dayData[Math.min(hour, dayData.length - 1)] : null),
    [dayData, hour]
  );

  const thermal = useMemo(
    () => (dayData.length > 0 ? calcThermal(dayData, site.altitude || 1500) : null),
    [dayData, site.altitude]
  );

  const windProfile = useMemo(
    () => (current ? getWindProfile(current.windSpeed, current.windDir) : null),
    [current]
  );

  useEffect(() => {
    if (!meteo || !dayData.length) return;
    setAiLoading(true);
    const t = setTimeout(() => {
      setAiData(genAI(dayData, site, thermal, windProfile));
      setAiLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [dayData, thermal, windProfile, site]);

  const enrichedDaily = useMemo(() => {
    if (!meteo?.daily) return [];
    return meteo.daily.map((d, i) => {
      const hh = meteo.hourly.filter(
        (h) =>
          h.time.getDate() === d.date.getDate() &&
          h.time.getMonth() === d.date.getMonth()
      );
      const temps = hh.map((h) => h.temperature).filter((t) => t != null);
      const delta = temps.length > 0
        ? Math.round(Math.max(...temps) - Math.min(...temps))
        : 0;
      return { ...d, delta, idx: i };
    });
  }, [meteo]);

  const dateLabels = enrichedDaily.map((d) =>
    d.date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  );

  const pressureGrad = useMemo(() => {
    if (dayData.length < 2) return { grad: 0, desc: "Dati insufficienti" };
    const g = dayData[dayData.length - 1].pressure - dayData[0].pressure;
    return {
      grad: Math.round(g * 10) / 10,
      desc: g > 3 ? "In aumento" : g < -3 ? "In diminuzione" : "Stabile",
    };
  }, [dayData]);

  const handleSiteSelect = (id: string) => {
    setSelected(id);
    setHour(12);
    setDayIdx(0);
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg,#6b6b6b 0%,#8a8a8a 30%,#707070 60%,#959595 100%)",
        color: "#1a1a1a",
        minHeight: "100vh",
        fontFamily: "'Segoe UI',sans-serif",
      }}
    >
      <Header />
      <div className="grid md:grid-cols-[260px_1fr] gap-4 max-w-7xl mx-auto px-2.5">
        <SiteList
          selected={selected}
          current={current}
          onSelect={handleSiteSelect}
        />
        <div className="bg-gray-100/80 rounded-2xl border border-gray-400/60 p-4 md:max-h-[calc(100vh-180px)] overflow-y-auto backdrop-blur-sm shadow-md">
          {current && site && (
            <>
              <SiteHeader site={site} current={current} />
              <TabNav tab={tab} onTabChange={setTab} />

              {tab === "meteo" && (
                <MeteoTab
                  current={current}
                  dayIdx={dayIdx}
                  hour={hour}
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  thermal={thermal}
                  pressureGrad={pressureGrad}
                  aiData={aiData}
                  onDaySelect={(i) => {
                    setDayIdx(i);
                    setHour(12);
                  }}
                  onHourChange={setHour}
                />
              )}
              {tab === "venti" && <VentiTab dayData={dayData} />}
              {tab === "termiche" && <TermicheTab aiData={aiData} />}
              {tab === "analisi" && (
                <AnalisiTab aiData={aiData} aiLoading={aiLoading} />
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}