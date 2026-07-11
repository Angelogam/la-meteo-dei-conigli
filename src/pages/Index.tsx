"use client";

import { useState, useEffect, useMemo, useCallback, createContext, useContext } from "react";
import { DECOLLI } from "@/data/decolli";
import { fetchMeteoHourly } from "@/utils/meteo";
import { genAI } from "@/utils/analisi";
import { calcThermal } from "@/utils/meteo";
import type { HourData, MeteoData, AiAnalysis, ThermalData } from "@/types/meteo";
import { SiteHeader } from "@/components/SiteHeader";
import { TabNav } from "@/components/TabNav";
import { SiteList } from "@/components/SiteList";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

// Contesto per condividere i dati meteo
export const MeteoContext = createContext<{
  allHourly: Record<string, HourData[]>;
  currentMap: Record<string, HourData>;
  hour: number;
  setHour: (h: number) => void;
}>({
  allHourly: {},
  currentMap: {},
  hour: 12,
  setHour: () => {},
});

export default function Index() {
  const [data, setData] = useState<Record<string, MeteoData>>({});
  const [allHourly, setAllHourly] = useState<Record<string, HourData[]>>({});
  const [currentMap, setCurrentMap] = useState<Record<string, HourData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("malanotte");
  const [hour, setHour] = useState<number>(new Date().getHours());

  // Fetch meteo per tutti i decolli
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(
      DECOLLI.map((d) =>
        fetchMeteoHourly(d.lat, d.lon)
          .then((hourly) => ({
            id: d.id,
            hourly,
          }))
          .catch((e) => ({
            id: d.id,
            hourly: [] as HourData[],
            error: e.message,
          }))
      )
    )
      .then((results) => {
        if (cancelled) return;
        const hourlyMap: Record<string, HourData[]> = {};
        const errorMsg = results.find((r) => "error" in r && r.error) as { error: string } | undefined;
        for (const r of results) {
          hourlyMap[r.id] = (r as any).hourly || [];
        }
        setAllHourly(hourlyMap);
        // Calcola currentMap
        const cmap: Record<string, HourData> = {};
        const h = new Date().getHours();
        for (const r of results) {
          const hdata = (r as any).hourly as HourData[];
          cmap[r.id] = hdata.find((x: HourData) => x.time.getHours() === h) || hdata[0];
        }
        setCurrentMap(cmap);
        if (errorMsg) setError(errorMsg.error);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Aggiorna currentMap quando cambia hour
  useEffect(() => {
    if (!Object.keys(allHourly).length) return;
    const cmap: Record<string, HourData> = {};
    for (const [id, hdata] of Object.entries(allHourly)) {
      if (hdata.length) {
        cmap[id] = hdata.find((x) => x.time.getHours() === hour) || hdata[0];
      }
    }
    setCurrentMap(cmap);
  }, [hour, allHourly]);

  const selected = DECOLLI.find((d) => d.id === selectedId) || DECOLLI[0];
  const dayData = useMemo(() => allHourly[selectedId] || [], [allHourly, selectedId]);
  const current = useMemo(() => currentMap[selectedId] || null, [currentMap, selectedId]);
  const thermal = useMemo(() => (dayData.length ? calcThermal(dayData, selected.altitude) : null), [dayData, selected.altitude]);
  const aiData = useMemo(() => genAI(dayData, selected, thermal), [dayData, selected, thermal]);
  const [activeTab, setActiveTab] = useState<Tab>("meteo");

  if (loading) return <LoadingScreen />;
  if (error && !Object.keys(allHourly).length) return <ErrorScreen message={error} />;

  return (
    <MeteoContext.Provider value={{ allHourly, currentMap, hour, setHour }}>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-100 via-indigo-50 to-sky-50">
        <div className="flex-1 w-full mx-auto px-2 sm:px-3 py-2 max-w-[1400px]">
          <Header />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Sidebar sinistra: lista decolli */}
            <div className="md:col-span-1">
              <SiteList
                selected={selectedId}
                current={current}
                onSelect={setSelectedId}
                weatherMap={currentMap}
                allHourlyData={allHourly}
              />
            </div>

            {/* Colonna centrale: dettaglio decollo */}
            <div className="md:col-span-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-300/60 p-4 mb-3">
                {current && <SiteHeader site={selected} current={current} />}

                <TabNav tab={activeTab} onTabChange={setActiveTab} />

                {activeTab === "meteo" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/70 px-4 py-3 rounded-lg border border-gray-200">
                        <span className="text-gray-500 font-medium">Vento</span>
                        <div className="text-lg font-bold text-gray-800">
                          {current ? `${Math.round(current.windSpeed)} km/h` : "--"}
                        </div>
                      </div>
                      <div className="bg-white/70 px-4 py-3 rounded-lg border border-gray-200">
                        <span className="text-gray-500 font-medium">Pioggia</span>
                        <div className="text-lg font-bold text-gray-800">
                          {current ? `${current.precipitation.toFixed(1)} mm` : "--"}
                        </div>
                      </div>
                      <div className="bg-white/70 px-4 py-3 rounded-lg border border-gray-200">
                        <span className="text-gray-500 font-medium">Umidit&agrave;</span>
                        <div className="text-lg font-bold text-gray-800">
                          {current ? `${Math.round(current.humidity)}%` : "--"}
                        </div>
                      </div>
                      <div className="bg-white/70 px-4 py-3 rounded-lg border border-gray-200">
                        <span className="text-gray-500 font-medium">Pressione</span>
                        <div className="text-lg font-bold text-gray-800">
                          {current ? `${Math.round(current.pressure)} hPa` : "--"}
                        </div>
                      </div>
                      <div className="bg-white/70 px-4 py-3 rounded-lg border border-gray-200">
                        <span className="text-gray-500 font-medium">Zero Termico</span>
                        <div className="text-lg font-bold text-gray-800">
                          {current ? `${Math.round(current.temperature / 0.0098)} m` : "--"}
                        </div>
                      </div>
                      <div className="bg-white/70 px-4 py-3 rounded-lg border border-gray-200">
                        <span className="text-gray-500 font-medium">Base Nuvole</span>
                        <div className="text-lg font-bold text-gray-800">
                          {thermal ? `${thermal.cloudBase} m` : "--"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "venti" && (
                  <div className="py-2 text-sm text-gray-700 font-medium">
                    Sezione venti in sviluppo...
                  </div>
                )}

                {activeTab === "termiche" && (
                  <div className="py-2">
                    {thermal && (
                      <div className="bg-white/70 px-4 py-3 rounded-lg border border-gray-200 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Base termiche</span>
                          <span className="font-bold text-gray-800">{thermal.cloudBase} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Plafond</span>
                          <span className="font-bold text-gray-800">{thermal.thermalTop} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Indice termico</span>
                          <span className="font-bold text-amber-600">{thermal.soarIdx}/10</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "analisi" && (
                  <div className="space-y-3 text-sm">
                    {aiData ? (
                      <>
                        <div className="bg-white/70 p-4 rounded-lg border border-gray-200 prose prose-sm max-w-none">
                          <h4 className="text-red-600 font-bold text-base mb-2">☀️ Situazione Generale</h4>
                          <div className="whitespace-pre-wrap font-medium text-gray-800">{aiData.general}</div>
                        </div>
                        <div className="bg-white/70 p-4 rounded-lg border border-gray-200">
                          <h4 className="text-orange-600 font-bold text-base mb-2">🔥 Profilo Termico</h4>
                          <div className="whitespace-pre-wrap font-medium text-gray-800">{aiData.thermal}</div>
                        </div>
                        <div className="bg-white/70 p-4 rounded-lg border border-gray-200">
                          <h4 className="text-sky-600 font-bold text-base mb-2">💨 Vento</h4>
                          <div className="whitespace-pre-wrap font-medium text-gray-800">{aiData.wind}</div>
                        </div>
                        <div className="bg-white/70 p-4 rounded-lg border border-gray-200">
                          <h4 className="text-indigo-600 font-bold text-base mb-2">🕐 Evoluzione</h4>
                          <div className="whitespace-pre-wrap font-medium text-gray-800">{aiData.hourly}</div>
                        </div>
                        <div className="bg-white/70 p-4 rounded-lg border border-gray-200">
                          <h4 className="text-purple-600 font-bold text-base mb-2">🔍 Interpretazione</h4>
                          <div className="whitespace-pre-wrap font-medium text-gray-800">{aiData.advice}</div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500 font-medium">
                        Dati non disponibili per l&apos;analisi
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </MeteoContext.Provider>
  );
}