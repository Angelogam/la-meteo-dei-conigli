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
import FinestraSemplice from "@/components/FinestraSemplice";
import MeteoCardOraria from "@/components/MeteoCardOraria";
import MeteoAnalisi from "@/components/MeteoAnalisi";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useMeteoCompleto } from "@/hooks/useMeteoCompleto";
import { DECOLLI } from "@/data/decolli";
import { getStabilityIndex } from "@/utils/weatherHelpers";
import { calcolaTermiche } from "@/utils/termiche";
import { avviaVerificaContinua } from "@/utils/mantenimentoAuto";
import { Activity } from "lucide-react";

const arrotonda = (n: number) => Math.round(n);

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

  const fasceOrarie = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    const morning = dayData.filter((h) => { const hh = new Date(h.time).getHours(); return hh >= 6 && hh <= 11; });
    const afternoon = dayData.filter((h) => { const hh = new Date(h.time).getHours(); return hh >= 12 && hh <= 17; });
    const evening = dayData.filter((h) => { const hh = new Date(h.time).getHours(); return hh >= 18 && hh <= 23; });

    const calcFascia = (hours: typeof dayData) => {
      if (hours.length === 0) return null;
      const temps = hours.map((h) => h.temperature).filter((t) => t != null);
      const winds = hours.map((h) => h.windSpeed).filter((w) => w != null);
      const clouds = hours.map((h) => h.cloudCover).filter((c) => c != null);
      const hums = hours.map((h) => h.humidity).filter((u) => u != null);
      if (temps.length === 0) return null;

      const tempMedia = arrotonda(temps.reduce((s, t) => s + t, 0) / temps.length);
      const tempMax = arrotonda(Math.max(...temps));
      const windMedia = winds.length > 0 ? arrotonda(winds.reduce((s, w) => s + w, 0) / winds.length) : 0;
      const cloudMedia = clouds.length > 0 ? arrotonda(clouds.reduce((s, c) => s + c, 0) / clouds.length) : 0;
      const humMedia = hums.length > 0 ? arrotonda(hums.reduce((s, u) => s + u, 0) / hums.length) : 0;

      const tPerOra = hours.map((h) => calcolaTermiche(h, site?.altitude ?? 1000));
      const rateoMedia = tPerOra.length > 0 ? tPerOra.reduce((s, t) => s + t.rateo, 0) / tPerOra.length : 0;
      const baseMedia = tPerOra.length > 0 ? arrotonda(tPerOra.reduce((s, t) => s + t.base, 0) / tPerOra.length) : 0;
      const topMedia = tPerOra.length > 0 ? arrotonda(tPerOra.reduce((s, t) => s + t.top, 0) / tPerOra.length) : 0;

      let termicheLabel = "Assenti ❌";
      if (rateoMedia >= 2.5) termicheLabel = String(arrotonda(rateoMedia)) + " m/s (buone)";
      else if (rateoMedia >= 1.5) termicheLabel = String(arrotonda(rateoMedia)) + " m/s (moderate)";
      else if (rateoMedia >= 0.8) termicheLabel = String(arrotonda(rateoMedia)) + " m/s (deboli)";

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

      let giudizio = "Condizioni normali";
      if (windMedia >= 5 && windMedia <= 15 && cloudMedia < 50 && rateoMedia >= 0.8) giudizio = "Buono per volo";
      else if (windMedia > 20 || rateoMedia < 0.3) giudizio = "Sconsigliato";
      else if (cloudMedia > 70) giudizio = "Cielo coperto";

      return {
        giudizio,
        ventoDir: dirDominante,
        vento: windMedia,
        temperatura: String(tempMedia) + "\u00b0C",
        tempMax,
        termiche: termicheLabel,
        rateo: rateoMedia,
        base: baseMedia,
        top: topMedia,
        umidita: humMedia,
        nuvole: cloudMedia,
      };
    };

    return { mattina: calcFascia(morning), pomeriggio: calcFascia(afternoon), sera: calcFascia(evening) };
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
                  <>
                    <MeteoTab currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, name: site!.name }} thermalDelta={thermalDelta} stabilityIndex={stabilityIndex} modelName={activeModel} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />
                    {fasceOrarie?.mattina && (
                      <MeteoAnalisi data={{
                        giorno: dateLabels[selectedDay] || "Giorno", data: new Date().toLocaleDateString("it-IT"), decollo: site!.name,
                        meteo: (currentData?.weatherCode ?? 0) <= 2 ? "sole" : (currentData?.weatherCode ?? 0) >= 61 ? "pioggia" : "nuvoloso",
                        ventoDecollo: fasceOrarie.mattina.vento, ventoAtterraggio: fasceOrarie.sera?.vento ?? fasceOrarie.mattina.vento,
                        raffiche: arrotonda(currentData?.windGusts ?? (currentData?.windSpeed ?? 0) * 1.4),
                        baseNuvole: fasceOrarie.mattina.base, topTermiche: fasceOrarie.mattina.top,
                        forzaTermica: Math.min(10, Math.max(0, arrotonda((fasceOrarie.mattina.rateo / 4) * 10))),
                        turbolenza: (currentData?.windGusts ?? 0) > 30 ? "Forte" : (currentData?.windGusts ?? 0) > 20 ? "Moderata" : "Leggera",
                        cape: arrotonda(currentCape?.cape ?? 0), liftedIndex: currentCape?.liftedIndex ?? 0,
                        umidita: currentData?.humidity ?? 50, pressione: arrotonda(currentData?.pressure ?? 1013),
                        nuvolosita: currentData?.cloudCover ?? 30, uvIndex: currentData?.uvIndex ?? 3,
                        deltaT: thermalDelta, gradiente: 0.98,
                        zeroTermico: site!.altitude + arrotonda((currentData?.temperature ?? 15) / 0.0098) + 200,
                      }} />
                    )}
                  </>
                )}

                {activeTab === "venti" && <VentiInterpolatiTab lat={site!.lat} lon={site!.lon} quotaDecollo={site!.altitude} selectedDay={selectedDay} oraCorrente={selectedHour} onOraChange={setSelectedHour} siteName={site!.name} />}
                {activeTab === "termiche" && <TermicheTab currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name }} />}
                {activeTab === "analisi" && <AnalisiMeteo currentData={currentData} dayData={dayData} site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name, exposure: site!.exposure }} cape={currentCape?.cape} liftedIndex={currentCape?.liftedIndex} cin={currentCape?.cin} />}

                {fasceOrarie && (
                  <section className="flex flex-col gap-4 mt-4">
                    {fasceOrarie.mattina && <MeteoCardOraria fascia="Mattina" data={{ temp: arrotonda(currentData?.temperature ?? 16), tempMax: fasceOrarie.mattina.tempMax, vento: fasceOrarie.mattina.vento, direzione: fasceOrarie.mattina.ventoDir, base: fasceOrarie.mattina.base, top: fasceOrarie.mattina.top, umidita: fasceOrarie.mattina.umidita, pioggia: currentData?.precipitation ?? 0, pressione: arrotonda(currentData?.pressure ?? 1013), score: Math.min(10, Math.max(0, arrotonda((fasceOrarie.mattina.rateo / 4) * 10))), migliorOra: "10:30", piccoTermico: arrotonda(fasceOrarie.mattina.rateo), commentoVolo: fasceOrarie.mattina.giudizio === "Buono per volo" ? "Termiche regolari, vento ideale per decollare." : "Condizioni non ottimali, valuta con attenzione." }} />}
                    {fasceOrarie.pomeriggio && <MeteoCardOraria fascia="Pomeriggio" data={{ temp: arrotonda(currentData?.temperature ?? 19), tempMax: fasceOrarie.pomeriggio.tempMax, vento: fasceOrarie.pomeriggio.vento, direzione: fasceOrarie.pomeriggio.ventoDir, base: fasceOrarie.pomeriggio.base, top: fasceOrarie.pomeriggio.top, umidita: fasceOrarie.pomeriggio.umidita, pioggia: currentData?.precipitation ?? 0, pressione: arrotonda(currentData?.pressure ?? 1013), score: Math.min(10, Math.max(0, arrotonda((fasceOrarie.pomeriggio.rateo / 4) * 10))), migliorOra: "14:00", piccoTermico: arrotonda(fasceOrarie.pomeriggio.rateo), commentoVolo: fasceOrarie.pomeriggio.giudizio === "Buono per volo" ? "Condizioni stabili, buona finestra di volo." : "Vento o nuvolosit\u00e0 potrebbero limitare il volo." }} />}
                    {fasceOrarie.sera && <MeteoCardOraria fascia="Sera" data={{ temp: arrotonda(currentData?.temperature ?? 17), tempMax: fasceOrarie.sera.tempMax, vento: fasceOrarie.sera.vento, direzione: fasceOrarie.sera.ventoDir, base: fasceOrarie.sera.base, top: fasceOrarie.sera.top, umidita: fasceOrarie.sera.umidita, pioggia: currentData?.precipitation ?? 0, pressione: arrotonda(currentData?.pressure ?? 1013), score: Math.min(10, Math.max(0, arrotonda((fasceOrarie.sera.rateo / 4) * 10))), migliorOra: "18:00", piccoTermico: arrotonda(fasceOrarie.sera.rateo), commentoVolo: fasceOrarie.sera.giudizio === "Buono per volo" ? "Condizioni stabili, perfette per restituzione." : "Attenzione: termiche in calo." }} />}
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