"use client";

import React, { useEffect } from "react";
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

export default function Index() {
  // Avvia verifica continua all'avvio
  useEffect(() => {
    avviaVerificaContinua(60000); // ogni 60 secondi
  }, []);

  const {
    selectedId, setSelectedId,
    loading: weatherLoading,
    updating,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    hourlyData,
    allHourlyData,
    allDailyData,
    activeModel,
    currentCape,
  } = useWeatherData();

  const {
    loading: analisiLoading,
    tempoTrascorso,
  } = useMeteoCompleto(
    site?.lat ?? DECOLLI[0].lat,
    site?.lon ?? DECOLLI[0].lon,
    site?.altitude ?? DECOLLI[0].altitude,
  );

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature || 20,
    currentData?.humidity || 50,
    currentData?.cloudCover || 30,
  );

  const decolliList = DECOLLI.map(d => ({
    nome: d.name,
    valle: d.valley,
    quota: d.altitude,
    direzione: d.exposure,
  }));

  const nomeToId: Record<string, string> = {};
  DECOLLI.forEach(d => { nomeToId[d.name] = d.id; });

  // =====================
  // DATI PER FINESTRE SEMPLICI (Mattina/Pomeriggio/Sera) — reali da Open-Meteo
  // =====================
  const fasceOrarie = React.useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    const morning = dayData.filter(h => {
      const hh = new Date(h.time).getHours();
      return hh >= 6 && hh <= 11;
    });
    const afternoon = dayData.filter(h => {
      const hh = new Date(h.time).getHours();
      return hh >= 12 && hh <= 17;
    });
    const evening = dayData.filter(h => {
      const hh = new Date(h.time).getHours();
      return hh >= 18 && hh <= 23;
    });

    const calcFascia = (hours: any[], label: string) => {
      if (hours.length === 0) return null;

      const temps = hours.map((h: any) => h.temperature).filter((t: any) => t != null);
      const winds = hours.map((h: any) => h.windSpeed).filter((w: any) => w != null);
      const clouds = hours.map((h: any) => h.cloudCover).filter((c: any) => c != null);
      const hums = hours.map((h: any) => h.humidity).filter((u: any) => u != null);

      const tempMedia = Math.round(temps.reduce((s: number, t: number) => s + t, 0) / temps.length);
      const tempMax = Math.round(Math.max(...temps));
      const windMedia = Math.round(winds.reduce((s: number, w: number) => s + w, 0) / winds.length);
      const cloudMedia = Math.round(clouds.reduce((s: number, c: number) => s + c, 0) / clouds.length);
      const humMedia = Math.round(hums.reduce((s: number, u: number) => s + u, 0) / hums.length);

      const termichePerOra = hours.map((h: any) => calcolaTermiche(h, site?.altitude ?? 1000));
      const ratei = termichePerOra.map((t: any) => t.rateo);
      const rateoMedia = ratei.reduce((s: number, r: number) => s + r, 0) / ratei.length;
      const rateoMax = Math.max(...ratei);
      const basi = termichePerOra.map((t: any) => t.base);
      const top = termichePerOra.map((t: any) => t.top);
      const baseMedia = Math.round(basi.reduce((s: number, b: number) => s + b, 0) / basi.length);
      const topMedia = Math.round(top.reduce((s: number, t: number) => s + t, 0) / top.length);

      let termicheLabel = "Assenti ❌";
      if (rateoMedia >= 0.8) termicheLabel = `${rateoMedia.toFixed(1)} m/s (deboli)`;
      if (rateoMedia >= 1.5) termicheLabel = `${rateoMedia.toFixed(1)} m/s (moderate)`;
      if (rateoMedia >= 2.5) termicheLabel = `${rateoMedia.toFixed(1)} m/s (buone)`;

      // Direzione vento (calcolo direzione dominante)
      const dirs = hours.map((h: any) => h.windDir).filter((d: any) => d != null);
      const dirCount: Record<number, number> = {};
      for (const d of dirs) {
        const rounded = Math.round(d / 45) * 45;
        dirCount[rounded] = (dirCount[rounded] || 0) + 1;
      }
      let dirDominante = "N";
      let maxCount = 0;
      const cardDirs: Record<number, string> = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
      for (const [deg, count] of Object.entries(dirCount)) {
        if (count > maxCount) {
          maxCount = count;
          dirDominante = cardDirs[Number(deg)] || "N";
        }
      }

      // Giudizio
      let giudizio = "Condizioni normali";
      if (windMedia >= 5 && windMedia <= 15 && cloudMedia < 50 && rateoMedia >= 0.8) {
        giudizio = "Buono per volo";
      } else if (windMedia > 20 || rateoMedia < 0.3) {
        giudizio = "Sconsigliato";
      } else if (cloudMedia > 70) {
        giudizio = "Cielo coperto";
      }

      return {
        label,
        giudizio,
        ventoDir: dirDominante,
        vento: windMedia,
        temperatura: `${tempMedia}°C`,
        tempMax: tempMax,
        termiche: termicheLabel,
        rateo: rateoMedia,
        base: baseMedia,
        top: topMedia,
        umidita: humMedia,
        nuvole: cloudMedia,
      };
    };

    return {
      mattina: calcFascia(morning, "Mattina"),
      pomeriggio: calcFascia(afternoon, "Pomeriggio"),
      sera: calcFascia(evening, "Sera"),
    };
  }, [dayData, site]);

  if (weatherLoading && (!hourlyData || hourlyData.length === 0)) {
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
            <UpdateTimer
              lastUpdate={lastUpdate}
              countdown={countdown}
              updating={updating}
              onRefresh={loadWeather}
            />
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300">
                {site?.name || "Decollo"} — Dati reali Open-Meteo
              </span>
              <span className="text-[10px] text-slate-500 ml-auto">{tempoTrascorso}s</span>
            </div>
            <DecolliCard
              decolli={decolliList}
              selectedId={selectedId}
              onSelect={(item) => {
                const id = nomeToId[item.nome];
                if (id) {
                  setSelectedId(id);
                  setSelectedHour(new Date().getHours());
                }
              }}
              weatherMap={allHourlyData}
            />
          </aside>
          <div className="flex-1 min-w-0 space-y-6">
            {hasData && (
              <>
                <SiteHeader
                  name={site!.name}
                  exposure={site!.exposure}
                  valley={site!.valley}
                  alt={site!.altitude}
                  currentData={currentData}
                />

                {/* PREVISIONI GIORNALIERE — 3 card oggi/domani/dopodomani */}
                <PrevisioniGiornaliere
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  currentData={currentData}
                  dayData={dayData}
                  site={{ name: site!.name, altitude: site!.altitude, exposure: site!.exposure }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  nomeDecollo={site!.name}
                />

                {/* FLIGHT SCORE + TABELLA ORARIA */}
                <WeatherDashboard
                  dayData={dayData}
                  altitude={site!.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                  dayLabel={dateLabels[selectedDay] || ""}
                />

                {/* TAB NAVIGATION */}
                <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

                {/* TAB METEO — riepilogo dettagliato */}
                {activeTab === "meteo" && (
                  <>
                    <MeteoTab
                      currentData={currentData}
                      dayData={dayData}
                      site={{ alt: site!.altitude, name: site!.name }}
                      thermalDelta={thermalDelta}
                      stabilityIndex={stabilityIndex}
                      modelName={activeModel}
                      cape={currentCape?.cape}
                      liftedIndex={currentCape?.liftedIndex}
                      cin={currentCape?.cin}
                    />

                    {/* METEO ANALISI — analisi completa */}
                    {fasceOrarie?.mattina && (
                      <MeteoAnalisi
                        data={{
                          giorno: dateLabels[selectedDay] || "Giorno",
                          data: new Date().toLocaleDateString("it-IT"),
                          decollo: site!.name,
                          meteo: (currentData?.weatherCode ?? 0) <= 2 ? "sole" : (currentData?.weatherCode ?? 0) >= 61 ? "pioggia" : "nuvoloso",
                          ventoDecollo: fasceOrarie.mattina.vento,
                          ventoAtterraggio: fasceOrarie.sera?.vento ?? fasceOrarie.mattina.vento,
                          raffiche: currentData?.windGusts ?? Math.round((currentData?.windSpeed ?? 0) * 1.4),
                          baseNuvole: fasceOrarie.mattina.base,
                          topTermiche: fasceOrarie.mattina.top,
                          forzaTermica: Math.min(10, Math.max(0, Math.round((fasceOrarie.mattina.rateo / 4) * 10))),
                          turbolenza: (currentData?.windGusts ?? 0) > 30 ? "Forte" : (currentData?.windGusts ?? 0) > 20 ? "Moderata" : "Leggera",
                          cape: currentCape?.cape ?? 0,
                          liftedIndex: currentCape?.liftedIndex ?? 0,
                          umidita: currentData?.humidity ?? 50,
                          pressione: currentData?.pressure ?? 1013,
                          nuvolosita: currentData?.cloudCover ?? 30,
                          uvIndex: currentData?.uvIndex ?? 3,
                          deltaT: thermalDelta,
                          gradiente: 0.98,
                          zeroTermico: site!.altitude + Math.round((currentData?.temperature ?? 15) / 0.0098) + 200,
                        }}
                      />
                    )}
                  </>
                )}

                {/* TAB VENTI */}
                {activeTab === "venti" && (
                  <VentiInterpolatiTab
                    lat={site!.lat}
                    lon={site!.lon}
                    quotaDecollo={site!.altitude}
                    selectedDay={selectedDay}
                    oraCorrente={selectedHour}
                    onOraChange={setSelectedHour}
                    siteName={site!.name}
                  />
                )}

                {/* TAB TERMICHE */}
                {activeTab === "termiche" && (
                  <TermicheTab
                    currentData={currentData}
                    dayData={dayData}
                    site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name }}
                    hourlyData={hourlyData}
                  />
                )}

                {/* TAB ANALISI */}
                {activeTab === "analisi" && (
                  <AnalisiMeteo
                    currentData={currentData}
                    dayData={dayData}
                    site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name, exposure: site!.exposure }}
                    cape={currentCape?.cape}
                    liftedIndex={currentCape?.liftedIndex}
                    cin={currentCape?.cin}
                  />
                )}

                {/* ===== FINESTRE ORARIE (Mattina/Pomeriggio/Sera) ===== */}
                {fasceOrarie && (
                  <div className="space-y-4">
                    {fasceOrarie.mattina && (
                      <FinestraSemplice
                        titolo={`${fasceOrarie.mattina.label} — ${site!.name} (${dateLabels[selectedDay] || ""})`}
                        giudizio={fasceOrarie.mattina.giudizio}
                        vento={`${fasceOrarie.mattina.ventoDir} ${fasceOrarie.mattina.vento} km/h`}
                        temperatura={fasceOrarie.mattina.temperatura}
                        termiche={fasceOrarie.mattina.termiche}
                        finestra={`6:00 – 11:00`}
                        note={`Base ${fasceOrarie.mattina.base}m · Top ${fasceOrarie.mattina.top}m · Nuvole ${fasceOrarie.mattina.nuvole}% · Umidità ${fasceOrarie.mattina.umidita}%`}
                      />
                    )}
                    {fasceOrarie.pomeriggio && (
                      <FinestraSemplice
                        titolo={`${fasceOrarie.pomeriggio.label} — ${site!.name} (${dateLabels[selectedDay] || ""})`}
                        giudizio={fasceOrarie.pomeriggio.giudizio}
                        vento={`${fasceOrarie.pomeriggio.ventoDir} ${fasceOrarie.pomeriggio.vento} km/h`}
                        temperatura={fasceOrarie.pomeriggio.temperatura}
                        termiche={fasceOrarie.pomeriggio.termiche}
                        finestra={`12:00 – 17:00`}
                        note={`Base ${fasceOrarie.pomeriggio.base}m · Top ${fasceOrarie.pomeriggio.top}m · Nuvole ${fasceOrarie.pomeriggio.nuvole}% · Umidità ${fasceOrarie.pomeriggio.umidita}%`}
                      />
                    )}
                    {fasceOrarie.sera && (
                      <FinestraSemplice
                        titolo={`${fasceOrarie.sera.label} — ${site!.name} (${dateLabels[selectedDay] || ""})`}
                        giudizio={fasceOrarie.sera.giudizio}
                        vento={`${fasceOrarie.sera.ventoDir} ${fasceOrarie.sera.vento} km/h`}
                        temperatura={fasceOrarie.sera.temperatura}
                        termiche={fasceOrarie.sera.termiche}
                        finestra={`18:00 – 23:00`}
                        note={`Base ${fasceOrarie.sera.base}m · Top ${fasceOrarie.sera.top}m · Nuvole ${fasceOrarie.sera.nuvole}% · Umidità ${fasceOrarie.sera.umidita}%`}
                      />
                    )}
                  </div>
                )}

                {/* ===== CARD ORARIE (dettaglio Mattina/Pomeriggio/Sera) ===== */}
                {fasceOrarie && (
                  <section className="flex flex-col gap-4 mt-4">
                    {fasceOrarie.mattina && (
                      <MeteoCardOraria
                        fascia="Mattina"
                        data={{
                          temp: Math.round(currentData?.temperature ?? 16),
                          tempMax: fasceOrarie.mattina.tempMax,
                          vento: fasceOrarie.mattina.vento,
                          direzione: fasceOrarie.mattina.ventoDir,
                          base: fasceOrarie.mattina.base,
                          top: fasceOrarie.mattina.top,
                          umidita: fasceOrarie.mattina.umidita,
                          pioggia: currentData?.precipitation ?? 0,
                          pressione: currentData?.pressure ?? 1013,
                          score: Math.min(10, Math.max(0, Math.round((fasceOrarie.mattina.rateo / 4) * 10))),
                          migliorOra: "10:30",
                          piccoTermico: fasceOrarie.mattina.rateo,
                          commentoVolo: fasceOrarie.mattina.giudizio === "Buono per volo"
                            ? "Termiche regolari, vento ideale per decollare."
                            : "Condizioni non ottimali, valuta con attenzione.",
                        }}
                      />
                    )}
                    {fasceOrarie.pomeriggio && (
                      <MeteoCardOraria
                        fascia="Pomeriggio"
                        data={{
                          temp: Math.round(currentData?.temperature ?? 19),
                          tempMax: fasceOrarie.pomeriggio.tempMax,
                          vento: fasceOrarie.pomeriggio.vento,
                          direzione: fasceOrarie.pomeriggio.ventoDir,
                          base: fasceOrarie.pomeriggio.base,
                          top: fasceOrarie.pomeriggio.top,
                          umidita: fasceOrarie.pomeriggio.umidita,
                          pioggia: currentData?.precipitation ?? 0,
                          pressione: currentData?.pressure ?? 1013,
                          score: Math.min(10, Math.max(0, Math.round((fasceOrarie.pomeriggio.rateo / 4) * 10))),
                          migliorOra: "14:00",
                          piccoTermico: fasceOrarie.pomeriggio.rateo,
                          commentoVolo: fasceOrarie.pomeriggio.giudizio === "Buono per volo"
                            ? "Condizioni stabili, buona finestra di volo."
                            : "Vento o nuvolosità potrebbero limitare il volo.",
                        }}
                      />
                    )}
                    {fasceOrarie.sera && (
                      <MeteoCardOraria
                        fascia="Sera"
                        data={{
                          temp: Math.round(currentData?.temperature ?? 17),
                          tempMax: fasceOrarie.sera.tempMax,
                          vento: fasceOrarie.sera.vento,
                          direzione: fasceOrarie.sera.ventoDir,
                          base: fasceOrarie.sera.base,
                          top: fasceOrarie.sera.top,
                          umidita: fasceOrarie.sera.umidita,
                          pioggia: currentData?.precipitation ?? 0,
                          pressione: currentData?.pressure ?? 1013,
                          score: Math.min(10, Math.max(0, Math.round((fasceOrarie.sera.rateo / 4) * 10))),
                          migliorOra: "18:00",
                          piccoTermico: fasceOrarie.sera.rateo,
                          commentoVolo: fasceOrarie.sera.giudizio === "Buono per volo"
                            ? "Condizioni stabili, perfette per restituzione."
                            : "Attenzione: termiche in calo.",
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