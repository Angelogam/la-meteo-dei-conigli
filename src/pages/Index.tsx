"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import WeatherDashboard from "@/components/WeatherDashboard";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import SidebarToggle from "@/components/SidebarToggle";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import { getStabilityIndex } from "@/utils/weatherHelpers";
import { avviaVerificaContinua, diagnosticaCompleta } from "@/utils/mantenimentoAuto";
import { Activity, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";

export default function Index() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState<{ ok: boolean; count: number; label: string } | null>(null);

  useEffect(() => {
    avviaVerificaContinua(60000);
    // Prima verifica sul caricamento
    diagnosticaCompleta().then(report => {
      if (report.ok) {
        setDiagnosticStatus({ ok: true, count: 0, label: "Tutto ok" });
      } else {
        setDiagnosticStatus({ ok: false, count: report.errori.length, label: `${report.errori.length} problemi` });
      }
    });
  }, []);

  const {
    selectedId, setSelectedId, loading: weatherLoading, updating,
    selectedDay, setSelectedDay, selectedHour, setSelectedHour,
    activeTab, setActiveTab, lastUpdate, countdown, site, dayData,
    currentData, thermalDelta, enrichedDaily, dateLabels, loadWeather,
    activeModel, currentCape,
  } = useWeatherData();

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature ?? 20,
    currentData?.humidity ?? 50,
    currentData?.cloudCover ?? 30,
  );

  const decolliList = useMemo(
    () => DECOLLI.map((d) => ({ id: d.id, nome: d.name, valle: d.valley, quota: d.altitude, direzione: d.exposure, lat: d.lat, lon: d.lon })),
    [],
  );

  const nomeToId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const d of DECOLLI) m[d.name] = d.id;
    return m;
  }, []);

  // Chiudi sidebar su selezione decollo (mobile)
  const handleSelectDecollo = (item: any) => {
    const id = nomeToId[item.nome];
    if (id) {
      setSelectedId(id);
      setSelectedHour(new Date().getHours());
      setSidebarOpen(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      
      {/* Badge diagnostica nell'header */}
      <div className="max-w-7xl mx-auto w-full px-3 md:px-6 pt-2">
        {diagnosticStatus && (
          <div className={`flex items-center gap-2 text-[10px] px-3 py-1.5 rounded-lg border ${
            diagnosticStatus.ok
              ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-300"
              : "bg-orange-900/20 border-orange-500/30 text-orange-300"
          }`}>
            {diagnosticStatus.ok ? (
              <CheckCircle className="w-3 h-3 shrink-0" />
            ) : (
              <AlertTriangle className="w-3 h-3 shrink-0" />
            )}
            <span className="font-medium">Diagnostica: {diagnosticStatus.label}</span>
            {!diagnosticStatus.ok && (
              <span className="text-orange-200">— Verifica in corso...</span>
            )}
          </div>
        )}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 relative">
          {/* Sidebar mobile toggle */}
          <SidebarToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

          {/* Overlay mobile */}
          {sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-slate-950/70 z-30"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar — collassabile su mobile */}
          <aside className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed lg:sticky top-0 lg:top-0 left-0 z-40 lg:z-auto
            w-72 lg:w-80 h-full lg:h-auto
            overflow-y-auto
            bg-slate-950 lg:bg-transparent
            p-4 lg:p-0
            transition-transform duration-300 ease-in-out
            shrink-0 space-y-4
          `}>
            <div className="flex items-center justify-between lg:hidden mb-4">
              <span className="text-sm font-bold text-white">Decolli</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-800">
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <UpdateTimer
              lastUpdate={lastUpdate}
              countdown={countdown}
              updating={updating}
              onRefresh={loadWeather}
            />
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs text-emerald-300 truncate">{site?.name ?? "Decollo"} — Dati reali Open-Meteo</span>
              <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                {countdown > 0 ? `${Math.round(countdown/1000)}s` : ""}
                {updating && <Loader2 className="w-3 h-3 inline animate-spin ml-1" />}
              </span>
            </div>
            <DecolliCard
              decolli={decolliList}
              selectedId={selectedId}
              selectedDay={selectedDay}
              onSelect={handleSelectDecollo}
            />
          </aside>

          {/* Contenuto principale */}
          <div className="flex-1 min-w-0 space-y-6">
            {hasData && (
              <>
                <SiteHeader name={site!.name} exposure={site!.exposure} valley={site!.valley} alt={site!.altitude} currentData={currentData} />
                <PrevisioniGiornaliere enrichedDaily={enrichedDaily} dateLabels={dateLabels} currentData={currentData} dayData={dayData} site={{ name: site!.name, altitude: site!.altitude, exposure: site!.exposure }} selectedDay={selectedDay} onSelectDay={setSelectedDay} nomeDecollo={site!.name} />
                <WeatherDashboard dayData={dayData} altitude={site!.altitude} selectedHour={selectedHour} onHourSelect={setSelectedHour} dayLabel={dateLabels[selectedDay] ?? ""} />
                <TabNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSidebarOpen(false); }} />

                {activeTab === "meteo" && (
                  <MeteoTab currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, name: site!.name }} thermalDelta={thermalDelta} stabilityIndex={stabilityIndex} modelName={activeModel} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />
                )}

                {activeTab === "venti" && (
                  <VentiInterpolatiTab lat={site!.lat} lon={site!.lon} quotaDecollo={site!.altitude} selectedDay={selectedDay} oraCorrente={selectedHour} onOraChange={setSelectedHour} siteName={site!.name} />
                )}
                {activeTab === "termiche" && (
                  <TermicheTab currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name }} />
                )}
                {activeTab === "analisi" && (
                  <AnalisiMeteo currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name, exposure: site!.exposure }} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />
                )}
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
      <DiagnosticaPanel />
    </div>
  );
}