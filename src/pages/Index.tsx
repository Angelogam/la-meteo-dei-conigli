"use client";

import React, { useEffect, useMemo } from "react";
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
import MeteoTesterPanel from "@/components/MeteoTesterPanel";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import MeteoCardOraria from "@/components/MeteoCardOraria";
import MeteoAnalisi from "@/components/MeteoAnalisi";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useMeteoCompleto } from "@/hooks/useMeteoCompleto";
import { DECOLLI } from "@/data/decolli";
import { getStabilityIndex } from "@/utils/weatherHelpers";
import { calcolaTermiche } from "@/utils/termiche";
import { avviaVerificaContinua } from "@/utils/mantenimentoAuto";
import { Activity } from "lucide-react";

export default function Index() {
  useEffect(() => { avviaVerificaContinua(60000); }, []);

  const {
    selectedId, setSelectedId, loading: weatherLoading, updating,
    selectedDay, setSelectedDay, selectedHour, setSelectedHour,
    activeTab, setActiveTab, lastUpdate, countdown, site, dayData,
    currentData, thermalDelta, enrichedDaily, dateLabels, loadWeather,
    allHourlyData, activeModel, currentCape,
  } = useWeatherData();

  const { tempoTrascorso } = useMeteoCompleto(
    site?.lat ?? DECOLLI[0].lat,
    site?.lon ?? DECOLLI[0].lon,
    site?.altitude ?? DECOLLI[0].altitude,
  );

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature || 20,
    currentData?.humidity || 50,
    currentData?.cloudCover || 30,
  );

  const decolliList = useMemo(
    () => DECOLLI.map((d) => ({ nome: d.name, valle: d.valley, quota: d.altitude, direzione: d.exposure })),
    [],
  );

  const nomeToId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const d of DECOLLI) m[d.name] = d.id;
    return m;
  }, []);

  // Calcola i dati delle fasce orarie a partire da dayData (dati reali Open-Meteo)
  const fasceOrarie = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    const morning = dayData.filter((h) => { const hh = new Date(h.time).getHours(); return hh >= 6 && hh <= 11; });
    const afternoon = dayData.filter((h) => { const hh = new Date(h.time).getHours(); return hh >= 12 && hh <= 17; });
    const evening = dayData.filter((h) => { const hh = new Date(h.time).getHours(); return hh >= 18 && hh <= 23; });

    // Funzione helper per calcolare i dati di una fascia oraria
    const calcFascia = (hours: typeof dayData) => {
      if (hours.length === 0) return null;

      const temps = hours.map((h) => h.temperature).filter((t) => t != null);
      const winds = hours.map((h) => h.windSpeed).filter((w) => w != null);
      const clouds = hours.map((h) => h.cloudCover).filter((c) => c != null);
      const hums = hours.map((h) => h.humidity).filter((u) => u != null);

      if (temps.length === 0) return null;

      const tempSum = temps.reduce((s, t) => s + t, 0);
      const windSum = winds.reduce((s, w) => s + w, 0);
      const humSum = hums.reduce((s, u) => s + u, 0);
      const cloudSum = clouds.reduce((s, c) => s + c, 0);

      const tempMedia = Math.round(tempSum / temps.length);
      const tempMax = Math.round(Math.max(...temps));
      const windMedia = winds.length > 0 ? Math.round(windSum / winds.length) : 0;
      const cloudMedia = clouds.length > 0 ? Math.round(cloudSum / clouds.length) : 0;
      const humMedia = hums.length > 0 ? Math.round(humSum / hums.length) : 0;

      const tPerOra = hours.map((h) => calcolaTermiche(h, site?.altitude ?? 1000));
      const rateoMedia = tPerOra.length > 0
        ? Math.round((tPerOra.reduce((s, t) => s + t.rateo, 0) / tPerOra.length) * 10) / 10
        : 0;

      // Calcola direzione dominante
      const dirs = hours.map((h) => h.windDir).filter((d) => d != null);
      const dirCount: Record<number, number> = {};
      for (const d of dirs) {
        const r = Math.round(d / 45) * 45;
        dirCount[r] = (dirCount[r] || 0) + 1;
      }
      let dirDominante = "N", maxCount = 0;
      const cardDirs: Record<number, string> = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
      for (const [deg, count] of Object.entries(dirCount)) {
        if (count > maxCount) { maxCount = count; dirDominante = cardDirs[Number(deg)] || "N"; }
      }

      // Giudizio
      let giudizio = "Condizioni normali";
      if (windMedia >= 5 && windMedia <= 15 && cloudMedia < 50 && rateoMedia >= 0.8) giudizio = "Buono per volo";
      else if (windMedia > 20 || rateoMedia < 0.3) giudizio = "Sconsigliato";
      else if (cloudMedia > 70) giudizio = "Cielo coperto";

      // Base/Top medi dalla fascia
      const idxCentrale = Math.floor(tPerOra.length / 2);
      const baseMedia = tPerOra.length > 0 ? Math.round(tPerOra[idxCentrale]?.base ?? 1500) : 1500;
      const topMedia = tPerOra.length > 0 ? Math.round(tPerOra[idxCentrale]?.top ?? 2000) : 2000;
      const precipitazioneTot = hours.reduce((s, h) => s + (h.precipitation || 0), 0);

      return {
        giudizio,
        ventoDir: dirDominante,
        vento: windMedia,
        temperatura: tempMedia,
        tempMax,
        termiche: rateoMedia.toFixed(1) + " m/s",
        rateo: rateoMedia,
        base: baseMedia,
        top: topMedia,
        umidita: humMedia,
        nuvole: cloudMedia,
        pioggiaTot: precipitazioneTot,
      };
    };

    return {
      mattina: calcFascia(morning),
      pomeriggio: calcFascia(afternoon),
      sera: calcFascia(evening),
    };
  }, [dayData, site]);

  if (weatherLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm">Caricamento previsioni per {site?.name || "decollo..."}</p>
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            <UpdateTimer lastUpdate={lastUpdate} countdown={countdown} updating={updating} onRefresh={loadWeather} />
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300">{site?.name || "Decollo"} — Dati reali Open-Meteo</span>
              <span className="text-[10px] text-slate-500 ml-auto">{tempoTrascorso}s</span>
            </div>
            <DecolliCard
              decolli={decolliList}
              selectedId={selectedId}
              onSelect={(item) => { const id = nomeToId[item.nome]; if (id) { setSelectedId(id); setSelectedHour(new Date().getHours()); } }}
              weatherMap={allHourlyData}
            />
          </aside>
          <div className="flex-1 min-w-0 space-y-6">
            {hasData && (
              <>
                <SiteHeader name={site!.name} exposure={site!.exposure} valley={site!.valley} alt={site!.altitude} currentData={currentData} />
                <PrevisioniGiornaliere enrichedDaily={enrichedDaily} dateLabels={dateLabels} currentData={currentData} dayData={dayData} site={{ name: site!.name, altitude: site!.altitude, exposure: site!.exposure }} selectedDay={selectedDay} onSelectDay={setSelectedDay} nomeDecollo={site!.name} />
                <WeatherDashboard dayData={dayData} altitude={site!.altitude} selectedHour={selectedHour} onHourSelect={setSelectedHour} dayLabel={dateLabels[selectedDay] || ""} />
                <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

                {activeTab === "meteo" && (
                  <MeteoTab currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, name: site!.name }} thermalDelta={thermalDelta} stabilityIndex={stabilityIndex} modelName={activeModel} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />
                )}

                {activeTab === "venti" && <VentiInterpolatiTab lat={site!.lat} lon={site!.lon} quotaDecollo={site!.altitude} selectedDay={selectedDay} oraCorrente={selectedHour} onOraChange={setSelectedHour} siteName={site!.name} />}
                {activeTab === "termiche" && <TermicheTab currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name }} />}
                {activeTab === "analisi" && <AnalisiMeteo currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name, exposure: site!.exposure }} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />}

                {/* FASCE ORARIE REALI DA OPEN-METEO */}
                {fasceOrarie && (
                  <section className="flex flex-col gap-4 mt-4">
                    {fasceOrarie.mattina && (
                      <MeteoCardOraria
                        fascia="Mattina (6-11)"
                        data={{
                          temp: fasceOrarie.mattina.temperatura,
                          tempMax: fasceOrarie.mattina.tempMax,
                          vento: fasceOrarie.mattina.vento,
                          direzione: fasceOrarie.mattina.ventoDir,
                          base: fasceOrarie.mattina.base,
                          top: fasceOrarie.mattina.top,
                          umidita: fasceOrarie.mattina.umidita,
                          pioggia: fasceOrarie.mattina.pioggiaTot,
                          pressione: currentData?.pressure ?? 1013,
                          score: Math.round(Math.min(10,
                            ((fasceOrarie.mattina.vento >= 5 && fasceOrarie.mattina.vento <= 15 ? 3 : 0) +
                            ((fasceOrarie.mattina.pioggiaTot ?? 0) < 0.5 ? 2 : 0) +
                            (fasceOrarie.mattina.umidita < 70 ? 1 : 0) +
                            (fasceOrarie.mattina.rateo >= 0.5 ? 2 : 0))
                          )),
                          migliorOra: "10:00",
                          piccoTermico: fasceOrarie.mattina.rateo,
                          commentoVolo: fasceOrarie.mattina.giudizio === "Buono per volo"
                            ? "Termiche regolari, vento ideale per decollare."
                            : "Condizioni non ottimali, valutare con attenzione."
                        }}
                      />
                    )}
                    {fasceOrarie.pomeriggio && (
                      <MeteoCardOraria
                        fascia="Pomeriggio (12-17)"
                        data={{
                          temp: fasceOrarie.pomeriggio.temperatura,
                          tempMax: fasceOrarie.pomeriggio.tempMax,
                          vento: fasceOrarie.pomeriggio.vento,
                          direzione: fasceOrarie.pomeriggio.ventoDir,
                          base: fasceOrarie.pomeriggio.base,
                          top: fasceOrarie.pomeriggio.top,
                          umidita: fasceOrarie.pomeriggio.umidita,
                          pioggia: fasceOrarie.pomeriggio.pioggiaTot,
                          pressione: currentData?.pressure ?? 1013,
                          score: Math.round(Math.min(10,
                            ((fasceOrarie.pomeriggio.vento >= 5 && fasceOrarie.pomeriggio.vento <= 15 ? 3 : 0) +
                            ((fasceOrarie.pomeriggio.pioggiaTot ?? 0) < 0.5 ? 2 : 0) +
                            (fasceOrarie.pomeriggio.umidita < 70 ? 1 : 0) +
                            Math.min(3, fasceOrarie.pomeriggio.rateo * 2))
                          )),
                          migliorOra: "14:00",
                          piccoTermico: fasceOrarie.pomeriggio.rateo,
                          commentoVolo: fasceOrarie.pomeriggio.giudizio === "Buono per volo"
                            ? "Condizioni stabili, buona finestra di volo."
                            : "Vento o nuvolosità potrebbero limitare il volo."
                        }}
                      />
                    )}
                    {fasceOrarie.sera && (
                      <MeteoCardOraria
                        fascia="Sera (18-23)"
                        data={{
                          temp: fasceOrarie.sera.temperatura,
                          tempMax: fasceOrarie.sera.tempMax,
                          vento: fasceOrarie.sera.vento,
                          direzione: fasceOrarie.sera.ventoDir,
                          base: fasceOrarie.sera.base,
                          top: fasceOrarie.sera.top,
                          umidita: fasceOrarie.sera.umidita,
                          pioggia: fasceOrarie.sera.pioggiaTot,
                          pressione: currentData?.pressure ?? 1013,
                          score: Math.max(0, Math.round(Math.min(10,
                            ((fasceOrarie.sera.pioggiaTot ?? 0) < 0.5 ? 3 : 0) +
                            ((currentData?.windSpeed ?? 0) < 15 ? 1 : 0)
                          ))),
                          migliorOra: "18:00",
                          piccoTermico: 0.1,
                          commentoVolo: fasceOrarie.sera.giudizio === "Buono per volo"
                            ? "Condizioni stabili, perfette per rientro."
                            : "Attenzione: termiche in calo, vento in diminuzione."
                        }}
                      />
                    )}
                  </section>
                )}
              </>
            )}
            {!hasData && (
              <div className="text-center py-12 text-slate-400">
                <p>Nessun dato meteo disponibile per {site?.name || "questo decollo"}. Verifica la connessione o riprova.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MeteoTesterPanel />
      <DiagnosticaPanel />
    </div>
  );
}