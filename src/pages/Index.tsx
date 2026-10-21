"use client";

import { useMemo } from "react";
import ParagliderHero from "@/components/ParagliderHero";
import { Activity, ArrowDownRight, CalendarDays, CloudSun, Home, Mountain, Thermometer, Wind } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import HourlyTable from "@/components/HourlyTable";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent } from "@/services/openMeteoService";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useThreeSourceWeather } from "@/hooks/useThreeSourceWeather";

function formatClock(value?: string): string | undefined {
  if (!value) return undefined;
  return value.includes("T") ? value.slice(11, 16) : value.slice(0, 5);
}

export default function Index() {
  const {
    selectedId,
    setSelectedId,
    updating,
    selectedDay,
    setSelectedDay,
    selectedHour,
    setSelectedHour,
    activeTab,
    setActiveTab,
    lastUpdate,
    countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    rawApiResponse,
  } = useWeatherData();

  const {
    mergedDecolli,
    lastUpdate: aggressiveLastUpdate,
    error: aggressiveError,
    updating: aggressiveUpdating,
    loadWeather: loadAggressiveWeather,
  } = useThreeSourceWeather();

  const filteredDayData = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    const oggi = new Date();
    const target = new Date(oggi);
    target.setDate(oggi.getDate() + selectedDay);
    const targetStr = target.toDateString();
    return dayData.filter((h) => new Date(h.time).toDateString() === targetStr);
  }, [dayData, selectedDay]);

  const dateLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  }, [selectedDay]);


  return (
    <div className="flight-website-shell min-h-screen">
      <Header />
      <div className="flight-app-body">
        <aside className="flight-nav-rail" aria-label="Navigazione principale">
          <div className="flight-nav-caption">NAVIGAZIONE</div>
          <nav className="flight-primary-nav">
            <button type="button" className="flight-nav-item" onClick={() => document.getElementById("overview")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <Home aria-hidden="true" /><span>Home</span>
            </button>
            <button type="button" className={"flight-nav-item " + (activeTab === "meteo" ? "is-active" : "")} aria-pressed={activeTab === "meteo"} onClick={() => { setActiveTab("meteo"); document.getElementById("details-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <CloudSun aria-hidden="true" /><span>Meteo</span>
            </button>
            <button type="button" className={"flight-nav-item " + (activeTab === "venti" ? "is-active" : "")} aria-pressed={activeTab === "venti"} onClick={() => { setActiveTab("venti"); document.getElementById("windgram-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <Wind aria-hidden="true" /><span>Venti</span>
            </button>
            <button type="button" className={"flight-nav-item " + (activeTab === "termiche" ? "is-active" : "")} aria-pressed={activeTab === "termiche"} onClick={() => { setActiveTab("termiche"); document.getElementById("details-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <Thermometer aria-hidden="true" /><span>Termiche</span>
            </button>
            <button type="button" className={"flight-nav-item " + (activeTab === "analisi" ? "is-active" : "")} aria-pressed={activeTab === "analisi"} onClick={() => { setActiveTab("analisi"); document.getElementById("details-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <Activity aria-hidden="true" /><span>Analisi</span>
            </button>
          </nav>
          <div className="flight-nav-divider" />
          <div className="flight-nav-caption">DECOLLO ATTIVO</div>
          <div className="flight-nav-current">
            <span className="flight-nav-current-icon"><Mountain aria-hidden="true" /></span>
            <strong>{site?.site_name ?? "Carico dati…"}</strong>
            {site && <small>{site.elevation_m.toLocaleString("it-IT")} m s.l.m.</small>}
            <span className="flight-live-indicator"><i /> Dati meteo</span>
          </div>
          <div className="flight-nav-motto">Il cielo non è il limite.<br />È solo l’inizio.</div>
        </aside>

        <div className="flight-page-column">
          <main className="app-main flight-page flex-1 w-full min-w-0 max-w-none mx-auto px-3 sm:px-4 xl:px-6 py-4 space-y-4">
            <section className="flight-page-titlebar flight-hero-banner flight-premium-cover" aria-labelledby="dashboard-intro-title">
              <ParagliderHero />
              <div>
                <div className="dashboard-intro-kicker"><span className="dashboard-intro-kicker-dot" aria-hidden="true" />METEO · AEROLOGIA · VOLO LIBERO</div>
                <h1 id="dashboard-intro-title">Il tuo briefing di volo.</h1>
                <p>Grafici meteo, vento in quota e condizioni dei decolli.</p>
              </div>
              <div className="flight-page-actions">
                <div className="dashboard-date-chip">
                  <CalendarDays aria-hidden="true" />
                  <span className="dashboard-date-copy"><small>Giorno selezionato</small><strong>{dateLabel}</strong></span>
                </div>
                <button type="button" className="dashboard-intro-cta" onClick={() => { setActiveTab("venti"); document.getElementById("windgram-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                  <Wind aria-hidden="true" /><span>Esplora i venti</span><ArrowDownRight aria-hidden="true" />
                </button>
              </div>
            </section>


            {site && (
              <section id="overview" className="overview-section">
                <SiteHeader
                  site_name={site.site_name}
                  location_name={site.location_name}
                  orientation={site.orientation}
                  elevation_m={site.elevation_m}
                  currentData={currentData}
                  sunrise={formatClock(enrichedDaily[selectedDay]?.sunrise)}
                  sunset={formatClock(enrichedDaily[selectedDay]?.sunset)}
                  uvIndex={enrichedDaily[selectedDay]?.uvIndexMax ?? currentData?.uvIndex}
                />
              </section>
            )}

            {site && (
              <section className="forecast-section flight-forecast-module min-w-0">
                <PrevisioniGiornaliere
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  currentData={currentData}
                  dayData={dayData}
                  site={{ name: site.site_name, altitude: site.elevation_m, exposure: site.orientation }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  nomeDecollo={site.site_name}
                />
              </section>
            )}

            {site && (
              <div className="flight-top-dashboard-grid">
                <div className="flight-primary-column">
                  <section className="flybubble-panel flybubble-live-map" aria-labelledby="flybubble-heading">
                    <header className="flybubble-panel-header">
                      <div className="flybubble-panel-icon" aria-hidden="true"><Wind /></div>
                      <div className="flybubble-panel-title">
                        <p className="flybubble-panel-kicker">MAPPA METEO INTERATTIVA</p>
                        <h2 id="flybubble-heading">Flybubble Weather</h2>
                        <p>Vento, attività termica e panoramica delle condizioni per il volo libero.</p>
                      </div>
                      <a className="flybubble-open-link" href="https://weather.flybubble.com/it#/0/12" target="_blank" rel="noreferrer">Apri a schermo intero <ArrowDownRight aria-hidden="true" /></a>
                    </header>
                    <div className="flybubble-frame-wrap">
                      <iframe className="flybubble-frame" src="https://weather.flybubble.com/it#/0/12" title="Mappa interattiva Flybubble Weather" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                    </div>
                    <div className="flybubble-panel-footer">
                      <span>Servizio esterno Flybubble. La copertura dei siti e delle previsioni può variare in base all’area.</span>
                      <a href="https://weather.flybubble.com/it#/0/12" target="_blank" rel="noreferrer">Apri Flybubble <ArrowDownRight aria-hidden="true" /></a>
                    </div>
                  </section>
              <section id="windgram-section" className="launch-windgram-top min-w-0" aria-label="Windgram aerologico del decollo selezionato">
                <VentiInterpolatiTab
                  lat={site.lat}
                  lon={site.lon}
                  quotaDecollo={site.elevation_m}
                  selectedDay={selectedDay}
                  oraCorrente={selectedHour}
                  onOraChange={setSelectedHour}
                  siteName={site.site_name}
                  siteId={site.id}
                  rawData={rawApiResponse}
                />
              </section>
            <div className="dashboard-layout flight-panels-grid">
              <div className="flight-desk-main dashboard-content min-w-0">
                {site && (
                  <>
                    <section id="details-section" className="details-section scroll-mt-4">
                      <div className="flight-subsection-heading"><div><span>STRUMENTI DI ANALISI</span><h2>Meteo e aerologia</h2></div><small>Seleziona una scheda</small></div>
                      <TabNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); if (tab === "venti") document.getElementById("windgram-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
                    </section>

                    <section className="flight-tab-content min-w-0" aria-live="polite">
                      {activeTab === "meteo" && (
                        <MeteoTab
                          currentData={currentData}
                          dayData={filteredDayData}
                          site={{ alt: site.elevation_m, name: site.site_name }}
                          thermalDelta={thermalDelta}
                          modelName="Open-Meteo"
                          selectedHour={selectedHour}
                          selectedDay={selectedDay}
                          cape={currentData?.cape}
                          liftedIndex={currentData?.liftedIndex}
                          cin={currentData?.cin}
                        />
                      )}
                      {activeTab === "venti" && (
                        <div className="launch-windgram-shortcut" role="status">
                          <Wind aria-hidden="true" />
                          <div>
                            <strong>Il windgram aerologico è già in alto</strong>
                            <p>Il profilo verticale e le masse d’aria colorate corrispondono al decollo selezionato nella tua API.</p>
                          </div>
                          <button type="button" onClick={() => document.getElementById("windgram-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                            Vai al windgram
                          </button>
                        </div>
                      )}
                      {activeTab === "termiche" && (
                        <TermicheTab currentData={currentData} dayData={filteredDayData} site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name }} selectedDay={selectedDay} />
                      )}
                      {activeTab === "analisi" && (
                        <AnalisiMeteo currentData={currentData} dayData={filteredDayData} site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name, exposure: site.orientation }} cape={currentData?.cape} liftedIndex={currentData?.liftedIndex} cin={currentData?.cin} rawData={rawApiResponse} />
                      )}
                    </section>

                    <section className="flight-hourly-section min-w-0">
                      <div className="flight-subsection-heading"><div><span>DETTAGLIO ORARIO</span><h2>Previsioni ora per ora</h2></div><small>{dateLabel}</small></div>
                      <HourlyTable dayData={filteredDayData} altitude={site.elevation_m} selectedHour={selectedHour} onHourSelect={setSelectedHour} dayLabel={dateLabel} siteName={site.site_name} />
                    </section>
                  </>
                )}
              </div>


            </div>
                </div>
                <aside id="flight-site-list" className="flight-launch-sidebar" aria-label="Selezione del decollo">
                  <DecolliCard
                    decolli={mergedDecolli}
                    selectedId={selectedId}
                    selectedDay={selectedDay}
                    isUpdating={aggressiveUpdating}
                    error={aggressiveError}
                    onSelect={(item) => { setSelectedId(item.id); setSelectedHour(new Date().getHours()); }}
                  />
                </aside>
              </div>
            )}
          </main>

          <nav className="mobile-bottom-nav" aria-label="Navigazione rapida">
            <a href="#overview" aria-label="Home"><span>⌂</span><small>Home</small></a>
            <a href="#flight-site-list" aria-label="Decolli"><span>⌖</span><small>Decolli</small></a>
            <a href="#windgram-section" aria-label="Windgram"><span>〰</span><small>Windgram</small></a>
            <button type="button" onClick={() => { setActiveTab("analisi"); document.getElementById("details-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-label="Analisi"><span>◉</span><small>Analisi</small></button>
          </nav>
          <Footer />
        </div>
      </div>
      <DiagnosticaPanel />
    </div>
  );
}