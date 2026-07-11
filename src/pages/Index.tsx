"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchMeteoHourly, fetchMeteoDaily, enrDaily } from "@/utils/meteo";
import { generateAiAnalysis } from "@/utils/meteoAI";
import type { HourData, DailyData, ThermalData, PressureGradient, AiAnalysis } from "@/types/meteo";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import { Loader2, AlertTriangle } from "lucide-react";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

export default function Home() {
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(12);
  const [activeTab, setActiveTab] = useState<Tab>("meteo");
  const [hourlyRaw, setHourlyRaw] = useState<HourData[]>([]);
  const [dailyRaw, setDailyRaw] = useState<DailyData[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Ottieni posizione
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalizzazione non supportata dal browser.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
      },
      (err) => {
        setError("Impossibile ottenere la posizione. " + err.message);
        setLoading(false);
      }
    );
  }, []);

  // Fetch dati meteo
  useEffect(() => {
    if (lat === null || lon === null) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchMeteoHourly(lat, lon), fetchMeteoDaily(lat, lon)])
      .then(([h, d]) => {
        setHourlyRaw(h);
        setDailyRaw(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [lat, lon]);

  // Dati arricchiti
  const enrichedDaily = useMemo(() => {
    if (!dailyRaw.length || !hourlyRaw.length) return [];
    return enrDaily(dailyRaw, hourlyRaw);
  }, [dailyRaw, hourlyRaw]);

  // Labels date
  const dateLabels = useMemo(() => {
    return enrichedDaily.map((d) => {
      const dt = new Date(d.time);
      return dt.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
    });
  }, [enrichedDaily]);

  // Dato corrente
  const current = useMemo(() => {
    if (!hourlyRaw.length) return null;
    return hourlyRaw.find((h) => h.time.getHours() === hour) || hourlyRaw[0];
  }, [hourlyRaw, hour]);

  // Thermal data
  const thermal = useMemo((): ThermalData | null => {
    if (!current) return null;
    const diff = current.temperature - (current.temperature - (100 - current.humidity) / 5);
    const cloudBase = Math.max(0, Math.round(diff * 125));
    const thermalTop = cloudBase + 800 + Math.round(Math.random() * 400);
    const soarIdx = Math.min(10, Math.max(1, Math.round((current.temperature - 10) / 3 + Math.random() * 2)));
    return { cloudBase, thermalTop, soarIdx };
  }, [current]);

  // Pressure gradient
  const pressureGrad = useMemo((): PressureGradient => {
    if (!hourlyRaw.length) return { grad: 0, desc: "Stabile" };
    const idxNow = hourlyRaw.findIndex((h) => h.time.getHours() === hour);
    if (idxNow < 2) return { grad: 0, desc: "Stabile" };
    const p0 = hourlyRaw[idxNow - 1]?.pressure ?? hourlyRaw[0].pressure;
    const p1 = hourlyRaw[idxNow]?.pressure ?? p0;
    const diff = Math.round((p1 - p0) * 10) / 10;
    return {
      grad: diff,
      desc: diff > 2 ? "In aumento (alta pressione)" : diff < -2 ? "In calo (bassa pressione)" : "Stabile",
    };
  }, [hourlyRaw, hour]);

  // AI Analysis con il nuovo generatore
  const aiData = useMemo((): AiAnalysis | null => {
    if (!hourlyRaw.length || !enrichedDaily[dayIdx]) return null;
    return generateAiAnalysis(hourlyRaw, dayIdx) as unknown as AiAnalysis;
  }, [hourlyRaw, dayIdx, enrichedDaily]);

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "meteo", label: "Meteo", emoji: "🌤️" },
    { key: "venti", label: "Venti", emoji: "💨" },
    { key: "termiche", label: "Termiche", emoji: "🌡️" },
    { key: "analisi", label: "Analisi AI", emoji: "🤖" },
  ];

  const handleDaySelect = (idx: number) => {
    setDayIdx(idx);
    setExpanded(true);
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 via-white to-sky-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <div className="text-sm font-semibold text-gray-600">Caricamento dati meteo...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 via-white to-red-50">
        <div className="bg-white/90 p-6 rounded-2xl border-2 border-red-300 shadow-lg max-w-sm text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <div className="text-sm font-bold text-red-700 mb-1">Errore</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-blue-50 to-sky-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">
            ✈️ Meteo Volo
          </h1>
          <div className="text-xs font-semibold text-gray-500">
            {lat?.toFixed(2)}, {lon?.toFixed(2)}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Tab navigation */}
        <div className="flex gap-1 mb-4 bg-white/80 rounded-2xl p-1 border-2 border-gray-300 shadow-sm">
          {tabs.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={
                "flex-1 py-2.5 px-1 rounded-xl text-xs font-extrabold transition-all duration-200 " +
                (activeTab === key
                  ? "bg-red-500 text-white shadow-md scale-105"
                  : "text-gray-600 hover:bg-gray-100")
              }
            >
              <span className="block">{emoji}</span>
              <span className="block mt-0.5">{label}</span>
            </button>
          ))}
        </div>

        {/* Contenuto */}
        <div className="transition-all duration-300">
          {activeTab === "meteo" && (
            <MeteoTab
              current={current}
              dayIdx={dayIdx}
              hour={hour}
              enrichedDaily={enrichedDaily}
              dateLabels={dateLabels}
              thermal={thermal}
              pressureGrad={pressureGrad}
              aiData={aiData}
              onDaySelect={handleDaySelect}
              onHourChange={handleHourChange}
            />
          )}
          {activeTab === "venti" && (
            <VentiTab dayData={hourlyRaw} />
          )}
          {activeTab === "termiche" && (
            <TermicheTab aiData={aiData} />
          )}
          {activeTab === "analisi" && (
            <AnalisiTab aiData={aiData} />
          )}
        </div>
      </main>
    </div>
  );
}