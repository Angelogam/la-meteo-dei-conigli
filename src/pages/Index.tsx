"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DECOLLI } from "@/data/decolli";
import { useWeatherData } from "@/hooks/useWeatherData";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import SiteHeader from "@/components/SiteHeader";
import MeteoAnalisi from "@/components/MeteoAnalisi";
import MeteoTab from "@/components/MeteoTab";
import TabNav from "@/components/TabNav";
import DecolloList from "@/components/DecolloList";
import HourlyTable from "@/components/HourlyTable";
import Windgram from "@/components/Windgram";
import AnalisiTab from "@/components/AnalisiTab";
import TermicheTab from "@/components/TermicheTab";
import VentiTab from "@/components/VentiTab";

const Index = () => {
  const {
    selectedId, setSelectedId,
    loading: loadingAll, error,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    site,
    dayData,
    currentData,
    thermalDelta,
    hourlyData,
    loadWeather,
    allDailyData,
    allHourlyData,
    activeModel,
    currentCape,
  } = useWeatherData();

  const stabilityIndex = { label: "Stabile", color: "#4fc3f7" };

  if (loadingAll && !hourlyData.length) return <LoadingScreen />;
  if (error && !hourlyData.length) return <ErrorScreen error={error} onRetry={loadWeather} />;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 md:px-6 py-4 space-y-4">
        <DecolloList
          decolli={DECOLLI}
          selectedId={selectedId}
          onSelect={setSelectedId}
          allDailyData={allDailyData}
          allHourlyData={allHourlyData}
        />
        {site && (
          <>
            <SiteHeader
              name={site.name}
              exposure={site.exposure}
              valley={site.valley}
              alt={site.altitude}
              currentData={currentData}
            />
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
            {activeTab === "meteo" && (
              <div className="space-y-4">
                <MeteoTab currentData={currentData} dayData={dayData} site={{ alt: site.altitude, name: site.name }} thermalDelta={thermalDelta} stabilityIndex={stabilityIndex} modelName={activeModel} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />
                <MeteoAnalisi data={{ giorno: "Martedì", data: "21 Luglio 2026", decollo: site.name, meteo: "nuvoloso", ventoDecollo: currentData?.windSpeed ?? 9, ventoAtterraggio: Math.round((currentData?.windSpeed ?? 9) * 0.7), raffiche: currentData?.windGusts ?? 46.1, baseNuvole: 250, topTermiche: 1500, forzaTermica: 5.0, turbolenza: "Forte", cape: 2930, liftedIndex: -7.4, umidita: currentData?.humidity ?? 88, pressione: currentData?.pressure ?? 1013, nuvolosita: currentData?.cloudCover ?? 85, uvIndex: 7.3, deltaT: 6, gradiente: 0.98, zeroTermico: 3400 }} />
              </div>
            )}
            {activeTab === "venti" && <VentiTab currentData={currentData} dayData={dayData} hourlyData={hourlyData} targetHour={selectedHour} lat={site.lat} lon={site.lon} selectedDay={selectedDay} />}
            {activeTab === "windgram" && (
              <div className="space-y-4">
                <HourlyTable dayData={dayData} altitude={site.altitude} selectedHour={selectedHour} onHourSelect={setSelectedHour} />
                <Windgram hourlyData={hourlyData} site={{ name: site.name, alt: site.altitude, lat: site.lat, lon: site.lon }} selectedHour={selectedHour} onHourSelect={setSelectedHour} />
              </div>
            )}
            {activeTab === "termiche" && <TermicheTab currentData={currentData} dayData={dayData} site={{ alt: site.altitude, lat: site.lat, lon: site.lon, name: site.name }} hourlyData={hourlyData} />}
            {activeTab === "analisi" && <AnalisiTab currentData={currentData} dayData={dayData} site={{ alt: site.altitude, lat: site.lat, lon: site.lon, name: site.name, exposure: site.exposure }} />}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Index;