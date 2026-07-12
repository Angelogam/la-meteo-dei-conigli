"use client";

import React, { useEffect, useState, useMemo } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { TabNav, type Tab } from "@/components/TabNav";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import VentiQuotaTab from "@/components/VentiQuotaTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import SiteHeader from "@/components/SiteHeader";
import DayForecastPopup from "@/components/DayForecastPopup";
import { DayDetailPopup } from "@/components/DayDetailPopup";
import SidebarDecolli from "@/components/SidebarDecolli";
import { fetchMeteo, calcThermal } from "@/utils/meteo";
import { generaAnalisiReale } from "@/utils/analisi";
import { generateAiAnalysis } from "@/utils/meteoAI";
import { generaTermicheOrarie } from "@/utils/termiche";
import { DECOLLI } from "@/data/decolli";
import type { HourData, AiAnalysis } from "@/types/meteo";
import { Menu } from "lucide-react";

function useRealTimeHour(): number {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setH(new Date().getHours()), 10000);
    return () => clearInterval(id);
  }, []);
  return h;
}

const nomiGiorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

interface AllData {
  hourly: HourData[];
}

const Index = () => {
  const [allData, setAllData] = useState<Record<string, AllData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState(DECOLLI[0]?.id || "");
  const [tab, setTab] = useState<Tab>("meteo");
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(useRealTimeHour());
  const [showPopup, setShowPopup] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const doFetch = async () => {
      try {
        const results: Record<string, AllData> = {};
        for (const site of DECOLLI) {
          const data = await fetchMeteo(site.lat, site.lon);
          results[site.id] = { hourly: data.hourly };
        }
        if (active) {
          setAllData(results);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Errore sconosciuto");
          setLoading(false);
        }
      }
    };

    doFetch();
    return () => { active = false; };
  }, []);

  const selectedSite = DECOLLI.find((s) => s.id === siteId) || DECOLLI[0];
  const hourlyRaw = allData[siteId]?.hourly || [];

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayIdx);
    return d;
  }, [dayIdx]);

  const dayData = useMemo((): HourData[] => {
    return hourlyRaw.filter((h) => {
      const hd = h.time;
      const hh = hd.getHours();
      return (
        hd.getDate() === targetDate.getDate() &&
        hd.getMonth() === targetDate.getMonth() &&
        hd.getFullYear() === targetDate.getFullYear() &&
        hh >= 9 && hh <= 19
      );
    });
  }, [hourlyRaw, targetDate]);

  const currentHourData = useMemo((): HourData | null => {
    return dayData.find((h) => h.time.getHours() === hour) || null;
  }, [dayData, hour]);

  const weatherMap: Record<string, HourData> = useMemo(() => {
    const map: Record<string, HourData> = {};
    for (const [id, data] of Object.entries(allData)) {
      const found = data.hourly.find((h) => {
        const hh = h.time.getHours();
        if (dayIdx === 0) return hh === hour;
        return hh === 12;
      });
      if (found) map[id] = found;
    }
    return map;
  }, [allData, hour, dayIdx]);

  const allDaysLabels = useMemo(() => {
    const labels: { value: number; label: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      labels.push({
        value: i,
        label: i === 0 ? "Oggi" : `${nomiGiorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`,
      });
    }
    return labels;
  }, []);

  const selectedDayLabel = useMemo(() => {
    const d = targetDate;
    return `${nomiGiorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  }, [targetDate]);

  const enrichedForDay = useMemo(() => {
    if (!dayData.length) return [];
    const maxTemp = Math.max(...dayData.map(h => h.temperature));
    const minTemp = Math.min(...dayData.map(h => h.temperature));
    const avgWind = dayData.reduce((s, h) => s + h.windSpeed, 0) / dayData.length;
    const maxWind = Math.max(...dayData.map(h => h.windSpeed));
    const avgCloud = dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;
    const precipitationSum = dayData.reduce((s, h) => s + h.precipitation, 0);
    return [{
      date: targetDate,
      tempMax: maxTemp,
      tempMin: minTemp,
      weatherCode: dayData[0]?.weatherCode ?? 0,
      precipitationSum,
      avgWind,
      maxWind,
      avgCloud,
    }];
  }, [dayData, targetDate]);

  const thermalAI = useMemo(() => calcThermal(dayData, selectedSite.altitude), [dayData, selectedSite.altitude]);
  const aiData = useMemo(() => generaAnalisiReale(dayData, selectedSite.altitude), [dayData, selectedSite.altitude]);
  const aiMeteoAnalysis = useMemo(() => generateAiAnalysis(dayData, dayIdx), [dayData, dayIdx]);
  const termicheHourly = useMemo(() => generaTermicheOrarie(dayData, selectedSite.altitude), [dayData, selectedSite.altitude]);

  const handleSiteSelect = (id: string) => {
    setSiteId(id);
    setDayIdx(0);
    setHour(new Date().getHours());
    setSidebarOpen(false);
  };

  const handleDaySelect = (idx: number) => {
    setDayIdx(idx);
    setHour(idx === 0 ? new Date().getHours() : 12);
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 text-slate-100">
      <header className="relative z-10 px-4 py-5 border-b-2 border-green-500/40 bg-gradient-to-r from-slate-800/95 via-green-900/20 to-slate-800/95 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl md:text-4xl drop-shadow-lg animate-bounce">🐰</span>
            <div className="border-2 border-green-500/40 rounded-xl px-4 py-3 bg-slate-800/60 backdrop-blur-sm shadow-inner">
              <h1 className="text-2xl md:text-3xl font-extrabold text-green-400 tracking-tight text-center drop-shadow-sm">
                Meteo dei <span className="text-green-300">Conigli</span>
              </h1>
              <p className="text-sm md:text-base text-green-200/90 font-medium text-center tracking-wide mt-0.5">
                🪂 Previsioni per volo libero &middot; 9:00&ndash;19:00 &middot; Open-Meteo &middot; SHV FSVL Style
              </p>
            </div>
            <span className="text-3xl md:text-4xl drop-shadow-lg md:block hidden animate-bounce" style={{ animationDelay: "150ms" }}>🐰</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-32 mt-4 md:flex md:gap-4 md:items-start">
        <SidebarDecolli
          selected={siteId}
          current={currentHourData}
          onSelect={handleSiteSelect}
          weatherMap={weatherMap}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 min-w-0 max-w-2xl mx-auto">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-sm text-slate-200 font-medium">
              {selectedDayLabel} <span className="text-blue-300 font-bold">{String(hour).padStart(2, "0")}:00</span>
            </div>
            <button onClick={() => setSidebarOpen(true)} className="md:hidden px-3 py-2 rounded-xl text-xs font-bold border border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600">
              <Menu className="w-4 h-4 mr-1 inline" /> Decolli
            </button>
          </div>

          {selectedSite && currentHourData && <SiteHeader site={selectedSite} current={currentHourData} />}

          <TabNav tab={tab} onTabChange={setTab} />

          <div className="bg-slate-700/70 backdrop-blur-sm rounded-2xl p-4 md:p-5 border border-slate-500/60 shadow-xl mt-2.5">
            {tab === "meteo" && currentHourData && (
              <MeteoTab
                current={currentHourData}
                dayIdx={dayIdx}
                hour={hour}
                enrichedDaily={enrichedForDay}
                dateLabels={[selectedDayLabel]}
                thermal={thermalAI}
                pressureGrad={{ grad: 0, desc: "Non disp." }}
                aiData={aiData as unknown as AiAnalysis | null}
                onDaySelect={handleDaySelect}
                onDayDetailClick={(i) => { setDayIdx(i); setShowDayDetail(true); }}
                onHourChange={setHour}
                termicheHourly={termicheHourly}
                giorniAvanti={allDaysLabels}
                fetchGiorno={() => {}}
              />
            )}
            {tab === "venti" && <VentiTab dayData={dayData} selectedHour={hour} />}
            {tab === "quota" && <VentiQuotaTab dayData={dayData} selectedHour={hour} altitude={selectedSite.altitude} siteName={selectedSite.name} />}
            {tab === "termiche" && <TermicheTab dayData={dayData} altitude={selectedSite.altitude} selectedHour={hour} />}
            {tab === "analisi" && aiMeteoAnalysis && <AnalisiTab aiData={aiMeteoAnalysis as unknown as AiAnalysis} selectedHour={hour} />}
            {tab === "analisi" && !aiMeteoAnalysis && <div className="text-sm text-slate-300 text-center p-4">Nessuna analisi disponibile.</div>}
          </div>

          <div className="mt-4 flex justify-center">
            <button onClick={() => setShowPopup(true)} className="text-sm border border-slate-500/60 text-slate-200 hover:bg-slate-700 bg-slate-800/80 px-5 py-2.5 rounded-xl">
              Dettaglio orario ({selectedSite?.name})
            </button>
          </div>

          {showPopup && (
            <DayForecastPopup
              data={dayData}
              dayLabel={selectedDayLabel}
              onClose={() => setShowPopup(false)}
              selectedHour={hour}
              onHourSelect={(h) => { setHour(h); setShowPopup(false); }}
            />
          )}
          {showDayDetail && enrichedForDay[0] && (
            <DayDetailPopup
              dayData={dayData}
              daily={enrichedForDay[0]}
              dayLabel={selectedDayLabel}
              altitude={selectedSite.altitude}
              onClose={() => setShowDayDetail(false)}
              onHourSelect={(h) => { setHour(h); setShowDayDetail(false); }}
            />
          )}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 text-center py-3 border-t border-green-500/30 bg-slate-800/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-8">
          <p className="text-xs text-slate-300">Open-Meteo &middot; previsioni 9:00&ndash;19:00</p>
          <p className="text-xs text-slate-300">&copy; {new Date().getFullYear()} Meteo dei Conigli</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;