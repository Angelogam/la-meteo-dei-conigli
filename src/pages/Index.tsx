"use client";

import React, { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import SplashScreen from "@/components/SplashScreen";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import WeatherDashboard from "@/components/WeatherDashboard";
import TabNav from "@/components/TabNav";
import SidebarToggle from "@/components/SidebarToggle";
import WeatherWidget from "@/components/WeatherWidget";
import ThermalTimeline from "@/components/ThermalTimeline";
import DecolloComparison from "@/components/DecolloComparison";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import SiteMapView from "@/components/SiteMapView";
import ForecastCarousel from "@/components/ForecastCarousel";
import WindCompass from "@/components/WindCompass";
import RadarChart from "@/components/RadarChart";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import { getStabilityIndex } from "@/utils/weatherHelpers";
import { avviaVerificaContinua, diagnosticaCompleta } from "@/utils/mantenimentoAuto";
import { Loader2, Sparkles, Activity, CheckCircle, AlertTriangle } from "lucide-react";

const MeteoTab = lazy(() => import("@/components/MeteoTab"));
const VentiInterpolatiTab = lazy(() => import("@/components/VentiInterpolatiTab"));
const TermicheTab = lazy(() => import("@/components/TermicheTab"));
const AnalisiMeteo = lazy(() => import("@/components/AnalisiMeteo"));
const DiagnosticaPanel = lazy(() => import("@/components/DiagnosticaPanel"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-16 text-slate-400">
    <Loader2 className="w-6 h-6 animate-spin mr-2" />
    <span>Caricamento...</span>
  </div>
);

export default function Index() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState<{ ok: boolean; count: number; label: string } | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    avviaVerificaContinua(60000);
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

  const handleSelectDecollo = (item: any) => {
    const id = nomeToId[item.nome];
    if (id) {
      setSelectedId(id);
      setSelectedHour(new Date().getHours());
      setSidebarOpen(false);
    }
  };

  const forecastData = useMemo(() => {
    return enrichedDaily.slice(0, 5).map((d, i) => {
      const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
      const date = new Date(d.date);
      const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
      const icon = d.weatherCode >= 95 ? "⛈️" : d.weatherCode >= 80 ? "🌧️" : d.weatherCode >= 61 ? "🌧️" : d.weatherCode >= 51 ? "🌦️" : d.weatherCode >= 45 ? "🌫️" : d.weatherCode >= 20 ? "☁️" : d.weatherCode >= 10 ? "⛅" : "☀️";
      return {
        day: i === 0 ? "Oggi" : i === 1 ? "Domani" : days[date.getDay()],
        date: `${date.getDate()} ${months[date.getMonth()]}`,
        icon,
        tempMax: d.temperatureMax,
        tempMin: d.temperatureMin,
        windMax: d.windSpeedMax,
        precip: d.precipitationSum,
        description: d.weatherDescription,
      };
    });
  }, [enrichedDaily]);

  const radarData = useMemo(() => {
    if (!currentData) return [];
    return [
      { label: "Vento", value: Math.min(10, Math.round((currentData.windSpeed / 25) * 10)), max: 10 },
      { label: "Temp", value: Math.min(10, Math.round(((currentData.temperature - 5) / 30) * 10)), max: 10 },
      { label: "Sole", value: Math.min(10, Math.round(((100 - currentData.cloudCover) / 100) * 10)), max: 10 },
      { label: "Term.", value: Math.min(10, Math.round((thermalDelta / 15) * 10)), max: 10 },
      { label: "Stab.", value: Math.min(10, Math.max(2, Math.round(((currentData.pressure - 990) / 50) * 10))), max: 10 },
    ];
  }, [currentData, thermalDelta]);

  const comparisonData = useMemo(() => {
    return DECOLLI.slice(0, 5).map(d => ({
      id: d.id,
      nome: d.name,
      temp: currentData?.temperature ?? 20,
      vento: currentData?.windSpeed ?? 10,
      ventoDir: "S",
      nuvole: currentData?.cloudCover ?? 30,
      alt: d.altitude,
      score: Math.min(10, Math.max(1, Math.round(5 + (d.altitude > 1000 ? 2 : -1) + (currentData?.windSpeed ? (currentData.windSpeed >= 5 && currentData.windSpeed <= 15 ? 2 : currentData.windSpeed > 25 ? -2 : 0) : 0)))),
    }));
  }, [currentData]);

  const timelineData = useMemo(() => {
    return dayData
      .filter(h => {
        const hh = h.time.getHours();
        return hh >= 8 && hh <= 19;
      })
      .map(h => ({
        ora: h.time.getHours(),
        rateo: Math.min(4, Math.max(0.1, (h.temperature - (h.dewPoint || h.temperature - 8)) * 0.25 + (h.windSpeed >= 5 && h.windSpeed <= 15 ? 0.4 : 0))),
        temp: h.temperature,
        vento: h.windSpeed,
      }));
  }, [dayData]);

  const mapSites = useMemo(() => {
    return DECOLLI.slice(0, 15).map(d => ({
      id: d.id,
      nome: d.name,
      lat: d.lat,
      lon: d.lon,
      alt: d.altitude,
      valle: d.valley,
    }));
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (weatherLoading && !currentData) {
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

  const tabContent: Record<string, React.ReactNode> = {
    meteo: (
      <Suspense fallback={<TabFallback />}>
        <MeteoTab currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, name: site!.name }} thermalDelta={thermalDelta} stabilityIndex={stabilityIndex} modelName={activeModel} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />
      </Suspense>
    ),
    venti: (
      <Suspense fallback={<TabFallback />}>
        <VentiInterpolatiTab lat={site!.lat} lon={site!.lon} quotaDecollo={site!.altitude} selectedDay={selectedDay} oraCorrente={selectedHour} onOraChange={setSelectedHour} siteName={site!.name} />
      </Suspense>
    ),
    termiche: (
      <Suspense fallback={<TabFallback />}>
        <TermicheTab currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name }} />
      </Suspense>
    ),
    analisi: (
      <Suspense fallback={<TabFallback />}>
        <AnalisiMeteo currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name, exposure: site!.exposure }} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />
      </Suspense>
    ),
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <ThemeToggle />
      <NotificationBell />
      <Header />

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
          </div>
        )}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-8">
        <div className="flex flex-col lg:flex-row gap-6 relative">
          <SidebarToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 bg-slate-950/70 z-30" onClick={() => setSidebarOpen(false)} />
          )}

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
                <span className="text-slate-400">✕</span>
              </button>
            </div>
            <UpdateTimer lastUpdate={lastUpdate} countdown={countdown} updating={updating} onRefresh={loadWeather} />
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs text-emerald-300 truncate">{site?.name ?? "Decollo"}</span>
              <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                {countdown > 0 ? `${Math.round(countdown/1000)}s` : ""}
                {updating && <Loader2 className="w-3 h-3 inline animate-spin ml-1" />}
              </span>
            </div>

            {currentData && (
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex flex-col items-center">
                <WindCompass windDir={currentData.windDir} windSpeed={currentData.windSpeed} gustSpeed={currentData.windGusts || 0} size={100} />
              </div>
            )}

            <DecolliCard decolli={decolliList} selectedId={selectedId} selectedDay={selectedDay} onSelect={handleSelectDecollo} />
          </aside>

          <div className="flex-1 min-w-0 space-y-8">
            {hasData ? (
              <>
                <SiteHeader name={site!.name} exposure={site!.exposure} valley={site!.valley} alt={site!.altitude} currentData={currentData} />
                <WeatherWidget data={currentData} altitude={site!.altitude} siteName={site!.name} />

                {radarData.length > 0 && (
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 flex flex-col items-center">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Qualità del volo
                    </h3>
                    <RadarChart values={radarData} size={220} />
                  </div>
                )}

                <ForecastCarousel forecasts={forecastData} selectedDay={selectedDay} onDaySelect={setSelectedDay} />
                <ThermalTimeline hourlyData={timelineData} selectedHour={selectedHour} onHourSelect={setSelectedHour} />

                <WeatherDashboard dayData={dayData} altitude={site!.altitude} selectedHour={selectedHour} onHourSelect={setSelectedHour} dayLabel={dateLabels[selectedDay] ?? ""} />

                <TabNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSidebarOpen(false); }} />
                {tabContent[activeTab]}

                <DecolloComparison decolli={comparisonData} />
                <SiteMapView sites={mapSites} />
              </>
            ) : (
              <div className="text-center py-24 text-slate-400">
                <div className="text-6xl mb-6">🐰</div>
                <p className="text-xl font-bold text-white mb-2">Nessun dato meteo disponibile</p>
                <p className="text-sm text-slate-500">Verifica la connessione o riprova.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <Suspense fallback={null}>
        <DiagnosticaPanel />
      </Suspense>
    </div>
  );
}