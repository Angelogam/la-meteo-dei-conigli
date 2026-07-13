"use client";

import React from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import DecolloList from "@/components/DecolloList";
import SiteHeader from "@/components/SiteHeader";
import AlertBanner from "@/components/AlertBanner";
import TabNav from "@/components/TabNav";
import DaySelector from "@/components/DaySelector";
import HourSlider from "@/components/HourSlider";
import MeteoTab from "@/components/MeteoTab";
import VentiTab from "@/components/VentiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiTab from "@/components/AnalisiTab";

export default function Page() {
  const {
    selectedId, setSelectedId,
    meteoData, loading, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    windProfile,
    weatherAlert,
    stabilityIndex,
    thermalStrength,
    loadWeather,
  } = useWeatherData();

  if (loading && !meteoData) return <LoadingScreen />;
  if (error && !meteoData) return <ErrorScreen error={error} onRetry={loadWeather} />;

  // Map Decollo to the shape expected by child components
  const siteWithAlt = { alt: site.altitude, name: site.name, exposure: site.exposure, valley: site.valley };

  return (
    <div style={{
      background: "linear-gradient(145deg, #1a2a3a 0%, #0d1b2a 100%)",
      color: "#e8f0f8", minHeight: "100vh", padding: "16px",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <header style={{ textAlign: "center", padding: "16px 0", borderBottom: "2px solid rgba(76, 175, 80, 0.3)", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "2.8rem", display: "inline-block", animation: "hop 1.2s ease-in-out infinite" }}>🐰</span>
          <span style={{ fontSize: "2.2rem", display: "inline-block", animation: "float 2.5s ease-in-out infinite" }}>🪂</span>
          <span style={{
            fontSize: "2.2rem", fontWeight: 800,
            background: "linear-gradient(135deg, #4caf50, #8bc34a)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
          }}>
            Meteo dei Conigli
          </span>
        </div>
        <p style={{ fontSize: "0.9rem", color: "#8899aa", marginTop: "4px" }}>Previsioni per volo libero • Dati in tempo reale da Open-Meteo</p>
        <p style={{ fontSize: "0.75rem", color: "#667788", marginTop: "2px" }}>🔄 Aggiornato: {lastUpdate.toLocaleTimeString("it-IT")}</p>
      </header>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(260px, 320px) 1fr",
        gap: "16px",
        maxWidth: "1440px",
        margin: "0 auto",
      }}>
        <DecolloList
          decolli={DECOLLI.map(d => ({ id: d.id, name: d.name, valley: d.valley, exposure: d.exposure, alt: d.altitude }))}
          selectedId={selectedId}
          onSelect={setSelectedId}
          currentData={currentData}
        />

        <div style={{
          background: "rgba(255,255,255,0.04)", borderRadius: "16px",
          border: "2px solid rgba(76, 175, 80, 0.25)", padding: "16px",
          maxHeight: "calc(100vh - 200px)", overflowY: "auto",
          backdropFilter: "blur(8px)",
        }}>
          <SiteHeader
            name={siteWithAlt.name}
            exposure={siteWithAlt.exposure}
            valley={siteWithAlt.valley}
            alt={siteWithAlt.alt}
            currentData={currentData}
          />

          {currentData && <AlertBanner alert={weatherAlert} />}

          <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

          <DaySelector
            enrichedDaily={enrichedDaily}
            dateLabels={dateLabels}
            selectedDay={selectedDay}
            onSelect={(idx) => { setSelectedDay(idx); setSelectedHour(12); }}
          />

          <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />

          {activeTab === "meteo" && currentData && (
            <MeteoTab
              currentData={currentData}
              dayData={dayData}
              site={siteWithAlt}
              thermalDelta={thermalDelta}
              stabilityIndex={stabilityIndex}
            />
          )}

          {activeTab === "venti" && currentData && (
            <VentiTab
              currentData={currentData}
              dayData={dayData}
              windProfile={windProfile}
            />
          )}

          {activeTab === "termiche" && currentData && (
            <TermicheTab
              currentData={currentData}
              dayData={dayData}
              site={siteWithAlt}
              thermalDelta={thermalDelta}
              thermalStrength={thermalStrength}
            />
          )}

          {activeTab === "analisi" && currentData && (
            <AnalisiTab
              currentData={currentData}
              site={siteWithAlt}
              thermalDelta={thermalDelta}
              thermalStrength={thermalStrength}
            />
          )}
        </div>
      </div>

      <footer style={{ textAlign: "center", marginTop: "20px", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "0.75rem", color: "#667788" }}>🐰 Vola sicuro e divertiti! 🪂 • Dati da Open-Meteo • Aggiornamento automatico ogni 30 min</p>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes hop {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(76, 175, 80, 0.3); border-radius: 4px; }
        * { scrollbar-width: thin; scrollbar-color: rgba(76, 175, 80, 0.3) transparent; }
        @media (max-width: 768px) {
          .mainGrid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}