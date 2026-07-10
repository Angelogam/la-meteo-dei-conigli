"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { DECOLLI, type Decollo } from "@/data/decolli";
import {
  fetchMeteoCompleta,
  calculateThermalProfile,
  getWindProfile,
} from "@/utils/meteoUtils";
import { generateAIAnalysis } from "@/utils/meteoAnalisi";

import MeteoHeader from "@/components/MeteoHeader";
import SiteList from "@/components/SiteList";
import SiteHeader from "@/components/SiteHeader";
import TabNavigation from "@/components/TabNavigation";
import DaySelector from "@/components/DaySelector";
import HourSelector from "@/components/HourSelector";
import MeteoGrid from "@/components/MeteoGrid";
import PressureCard from "@/components/PressureCard";
import WindAnalysis from "@/components/WindAnalysis";
import WindProfile from "@/components/WindProfile";
import HourlyWind from "@/components/HourlyWind";
import AIAnalysisBlock from "@/components/AIAnalysisBlock";
import AIAnalysisFull from "@/components/AIAnalysisFull";
import ThunderstormAlert from "@/components/ThunderstormAlert";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import MeteoFooter from "@/components/MeteoFooter";

/* ============================
   INTERFACCE TIPO
   ============================ */

interface HourData {
  time: Date;
  temperature: number;
  dewPoint: number;
  humidity: number;
  cloudCover: number;
  precipitation: number;
  visibility: number;
  windSpeed: number;
  windGust: number;
  windDir: number;
  wind80m: number | null;
  windDir80m: number | null;
  wind120m: number | null;
  windDir120m: number | null;
  uvIndex: number;
  isDay: number;
  weatherCode: number;
  pressure: number;
}

interface DailyData {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  sunrise: Date;
  sunset: Date;
  uvMax: number;
  precipitationSum: number;
  precipitationHours: number;
  windMax: number;
  windDirDominant: number;
}

interface MeteoData {
  hourly: HourData[];
  daily: DailyData[];
}

/* ============================
   APP PRINCIPALE
   ============================ */

export default function Index() {
  const [selected, setSelected] = useState<string>(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<MeteoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"meteo" | "venti" | "termiche" | "analisi">("meteo");

  const site = DECOLLI.find((x) => x.id === selected) as Decollo;

  // Fetch meteo data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMeteoCompleta(site.lat, site.lon);
        setMeteoData(data as MeteoData);
      } catch (err) {
        setError("Errore nel caricamento dei dati meteo");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selected, site.lat, site.lon]);

  // Get data for selected day
  const getDayData = useCallback(() => {
    if (!meteoData) return [];
    const today = new Date();
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() + selectedDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return meteoData.hourly.filter((h) => h.time >= dayStart && h.time < dayEnd);
  }, [meteoData, selectedDay]);

  const dayData = getDayData();

  // Calcola profilo termico
  const thermalProfile = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    return calculateThermalProfile(dayData, site.altitude || 1500);
  }, [dayData, site.altitude]);

  // Dato corrente per l'ora selezionata
  const currentData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    return dayData[Math.min(selectedHour, dayData.length - 1)];
  }, [dayData, selectedHour]);

  // Profilo vento
  const windProfileData = useMemo(() => {
    if (!currentData) return null;
    return getWindProfile(currentData.windSpeed, currentData.windDir, 400, 4000, 250);
  }, [currentData]);

  // Genera analisi AI
  useEffect(() => {
    if (meteoData && dayData && dayData.length > 0) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        const analysis = generateAIAnalysis(
          meteoData as any,
          site,
          dayData as any,
          thermalProfile as any,
          windProfileData as any
        );
        setAiAnalysis(analysis as Record<string, string>);
        setIsAnalyzing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [meteoData, dayData, thermalProfile, windProfileData, site]);

  // Dati giornalieri arricchiti
  const enrichedDailyData = useMemo(() => {
    if (!meteoData || !meteoData.daily) return [];
    return meteoData.daily.map((day, index) => {
      const dayHours = meteoData.hourly.filter(
        (h) =>
          h.time.getDate() === day.date.getDate() &&
          h.time.getMonth() === day.date.getMonth()
      );
      const temps = dayHours
        .map((h) => h.temperature)
        .filter((t) => t !== undefined && t !== null);
      const delta = temps.length > 0
        ? Math.round(Math.max(...temps) - Math.min(...temps))
        : 0;
      return { ...day, thermalDelta: delta, dayIndex: index };
    });
  }, [meteoData]);

  // Etichette date
  const dateLabels = enrichedDailyData.map((d) =>
    d.date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  );

  const hoursRange = Array.from({ length: 11 }, (_, i) => i + 9);

  // Gradiente pressione
  const getPressureGradient = () => {
    if (!dayData || dayData.length < 2)
      return { gradient: 0, description: "Dati insufficienti" };
    const first = dayData[0].pressure;
    const last = dayData[dayData.length - 1].pressure;
    const gradient = last - first;
    let description = "";
    if (gradient > 3) description = "⬆️ Pressione in aumento - miglioramento";
    else if (gradient < -3) description = "⬇️ Pressione in diminuzione - peggioramento";
    else description = "➡️ Pressione stabile";
    return { gradient: Math.round(gradient * 10) / 10, description };
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;

  return (
    <div style={styles.app}>
      <MeteoHeader />

      <div style={styles.grid}>
        <div style={styles.left}>
          <SiteList
            decolli={DECOLLI}
            selected={selected}
            onSelect={setSelected}
            currentData={currentData}
          />
        </div>

        <div style={styles.right}>
          {currentData && site && (
            <>
              <SiteHeader
                site={site}
                weatherCode={currentData.weatherCode}
                isDay={currentData.isDay}
                temperature={currentData.temperature}
              />

              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

              {/* TAB METEO */}
              {activeTab === "meteo" && (
                <>
                  <DaySelector
                    dailyData={enrichedDailyData}
                    dateLabels={dateLabels}
                    selectedDay={selectedDay}
                    onSelect={(index) => {
                      setSelectedDay(index);
                      setSelectedHour(12);
                    }}
                  />
                  <HourSelector
                    selectedHour={selectedHour}
                    onChange={setSelectedHour}
                  />
                  <MeteoGrid
                    temperature={currentData.temperature}
                    thermalDelta={thermalProfile?.thermalDelta || 0}
                    humidity={currentData.humidity}
                    dewPoint={currentData.dewPoint}
                    cloudCover={currentData.cloudCover}
                    precipitation={currentData.precipitation}
                    cloudBase={thermalProfile?.cloudBase ?? null}
                    thermalTop={thermalProfile?.thermalTop ?? null}
                    soarIndex={thermalProfile?.soarIndex ?? null}
                    windSpeed={currentData.windSpeed}
                    windGust={currentData.windGust}
                    windDir={currentData.windDir}
                  />
                  <PressureCard
                    pressure={currentData.pressure}
                    gradient={getPressureGradient()}
                  />
                  {aiAnalysis?.thunderstorm && (
                    <ThunderstormAlert content={aiAnalysis.thunderstorm} />
                  )}
                </>
              )}

              {/* TAB VENTI */}
              {activeTab === "venti" && (
                <>
                  <WindAnalysis
                    windSpeed={currentData.windSpeed}
                    windGust={currentData.windGust}
                    windDir={currentData.windDir}
                    wind80m={currentData.wind80m}
                    windDir80m={currentData.windDir80m}
                    wind120m={currentData.wind120m}
                    windDir120m={currentData.windDir120m}
                  />
                  {windProfileData && (
                    <WindProfile
                      profile={windProfileData}
                      maxSurfaceWind={currentData.windSpeed}
                    />
                  )}
                  <HourlyWind
                    hoursRange={hoursRange}
                    dayData={dayData}
                    getHourData={(hour) =>
                      dayData?.find((h: HourData) => h.time.getHours() === hour)
                    }
                  />
                </>
              )}

              {/* TAB TERMICHE */}
              {activeTab === "termiche" && (
                <>
                  <AIAnalysisBlock
                    title="Analisi Termiche"
                    content={aiAnalysis?.thermal || "Dati non disponibili"}
                    icon="🔥"
                  />
                  <AIAnalysisBlock
                    title="Quote e Plafond"
                    content={aiAnalysis?.altitude || "Dati non disponibili"}
                    icon="🏔️"
                  />
                  <AIAnalysisBlock
                    title="Sviluppo Orario"
                    content={aiAnalysis?.hourly || "Dati non disponibili"}
                    icon="⏰"
                  />
                </>
              )}

              {/* TAB ANALISI */}
              {activeTab === "analisi" && (
                <AIAnalysisFull isAnalyzing={isAnalyzing} analysis={aiAnalysis} />
              )}
            </>
          )}
        </div>
      </div>

      <MeteoFooter />
    </div>
  );
}

/* ============================
   STILI
   ============================ */

const styles: Record<string, React.CSSProperties> = {
  app: {
    background: "linear-gradient(135deg, #0a0e27 0%, #1a1a3e 30%, #16213e 60%, #0d1b2a 100%)",
    color: "#eee",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: "100%",
    overflowX: "hidden",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 340px) 1fr",
    gap: "clamp(15px, 3vw, 20px)",
    maxWidth: "1440px",
    margin: "0 auto",
  },
  left: {
    background: "rgba(255,255,255,0.05)",
    padding: "15px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    height: "calc(100vh - 200px)",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },
  right: {
    background: "rgba(255,255,255,0.05)",
    padding: "clamp(12px, 2vw, 20px)",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    maxHeight: "calc(100vh - 200px)",
    overflowY: "auto",
    backdropFilter: "blur(10px)",
  },
};