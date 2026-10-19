"use client";

import { useMemo } from "react";
import { Activity, ArrowDownRight, CalendarDays, CloudSun, Compass, Eye, Home, MapPin, Mountain, Sun, Thermometer, Wind } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import HourlyTable from "@/components/HourlyTable";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import DayStoryboard from "@/components/DayStoryboard";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import ProfessionalWindgram from "@/components/ProfessionalWindgram";
import DailyThermalChart from "@/components/DailyThermalChart";
import { Card, CardContent } from "@/components/ui/card";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import Windgram from "@/components/Windgram";
import RasoftWindgram from "@/components/RasoftWindgram";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
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

  const current = currentData as any;
  const currentTemp = typeof current?.temperature === "number" ? current.temperature : null;
  const currentDewPoint = typeof current?.dewPoint === "number" ? current.dewPoint : null;
  const cloudBaseEstimate = site && currentTemp !== null && currentDewPoint !== null
    ? site.elevation_m + Math.round(Math.max(0, currentTemp - currentDewPoint) * 125)
    : null;
  const quickParams = [
    { label: "CAPE", value: typeof current?.cape === "number" ? String(Math.round(current.cape)) + " J/kg" : "N/D", note: "Instabilità convettiva" },
    { label: "Base cumuli · stima", value: cloudBaseEstimate !== null ? cloudBaseEstimate.toLocaleString("it-IT") + " m" : "N/D", note: "Stima da temperatura e rugiada" },
    { label: "Zero termico", value: typeof current?.freezingLevel === "number" ? Math.round(current.freezingLevel).toLocaleString("it-IT") + " m" : "N/D", note: "Quota prevista" },
    { label: "Vento a 80 m", value: typeof current?.windSpeed80m === "number" ? String(Math.round(current.windSpeed80m)) + " km/h" : "N/D", note: "Modello meteo" },
    { label: "Vento a 120 m", value: typeof current?.windSpeed120m === "number" ? String(Math.round(current.windSpeed120m)) + " km/h" : "N/D", note: "Modello meteo" },
    { label: "Indice UV", value: typeof current?.uvIndex === "number" ? String(Math.round(current.uvIndex)) : "N/D", note: "Valore previsto" },
  ];

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
            <button type="button" className={"flight-nav-item " + (activeTab === "meteo" ? "is-active" : "")} aria-pressed={activeTab === "meteo"} onClick={() => { setActiveTab("meteo"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <CloudSun aria-hidden="true" /><span>Meteo</span>
            </button>
            <button type="button" className={"flight-nav-item " + (activeTab === "venti" ? "is-active" : "")} aria-pressed={activeTab === "venti"} onClick={() => { setActiveTab("venti"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <Wind aria-hidden="true" /><span>Venti</span>
            </button>
            <button type="button" className={"flight-nav-item " + (activeTab === "termiche" ? "is-active" : "")} aria-pressed={activeTab === "termiche"} onClick={() => { setActiveTab("termiche"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <Thermometer aria-hidden="true" /><span>Termiche</span>
            </button>
            <button type="button" className={"flight-nav-item " + (activeTab === "analisi" ? "is-active" : "")} aria-pressed={activeTab === "analisi"} onClick={() => { setActiveTab("analisi"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
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
            <section className={"flight-page-titlebar " + (activeTab === "venti" ? "alpium-titlebar" : "")} aria-labelledby="dashboard-intro-title">
              <div>
                <div className="dashboard-intro-kicker"><span className="dashboard-intro-kicker-dot" aria-hidden="true" />{activeTab === "venti" ? "WINDGRAM · PROFILO VERTICALE · TERMICHE" : "METEO · AEROLOGIA · VOLO LIBERO"}</div>
                <h1 id="dashboard-intro-title">{activeTab === "venti" ? "Il vento, quota per quota." : "Il tuo briefing di volo."}</h1>
                <p>{activeTab === "venti" ? "Analisi oraria del vento in quota e dell'evoluzione termica, in una vista dedicata." : "Grafici meteo, vento in quota e condizioni dei decolli."}</p>
              </div>
              <div className="flight-page-actions">
                <div className="dashboard-date-chip">
                  <CalendarDays aria-hidden="true" />
                  <span className="dashboard-date-copy"><small>Giorno selezionato</small><strong>{dateLabel}</strong></span>
                </div>
                <button type="button" className="dashboard-intro-cta" onClick={() => {
                  const nextTab = activeTab === "venti" ? "meteo" : "venti";
                  setActiveTab(nextTab);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}>
                  {activeTab === "venti" ? <><CloudSun aria-hidden="true" /><span>Torna al meteo</span></> : <><Wind aria-hidden="true" /><span>Esplora i venti</span><ArrowDownRight aria-hidden="true" /></>}
                </button>
              </div>
            </section>

            {activeTab !== "venti" && site && (
              <section className="flight-brief-strip" aria-label="Riepilogo rapido delle condizioni di volo">
                <div className="flight-brief-heading">
                  <span>BRIEFING RAPIDO</span>
                  <small>{dateLabel} · {String(selectedHour).padStart(2, "0")}:00</small>
                </div>
                <div className="flight-brief-metrics">
                  <article className="flight-brief-metric">
                    <span className="flight-brief-icon flight-brief-icon-temp"><Thermometer aria-hidden="true" /></span>
                    <div><small>Temperatura</small><strong>{currentTemp !== null ? currentTemp.toLocaleString("it-IT", { maximumFractionDigits: 1 }) + " °C" : "N/D"}</strong><em>Al decollo</em></div>
                  </article>
                  <article className="flight-brief-metric">
                    <span className="flight-brief-icon flight-brief-icon-wind"><Wind aria-hidden="true" /></span>
                    <div><small>Vento al suolo</small><strong>{typeof current?.windSpeed === "number" ? Math.round(current.windSpeed) + " km/h" : "N/D"}</strong><em>{typeof current?.windDir === "number" ? Math.round(current.windDir) + "° di direzione" : "Direzione non disponibile"}</em></div>
                  </article>
                  <article className="flight-brief-metric">
                    <span className="flight-brief-icon flight-brief-icon-cloud"><Mountain aria-hidden="true" /></span>
                    <div><small>Base cumuli · stima</small><strong>{cloudBaseEstimate !== null ? cloudBaseEstimate.toLocaleString("it-IT") + " m" : "N/D"}</strong><em>Quota indicativa</em></div>
                  </article>
                  <article className="flight-brief-metric">
                    <span className="flight-brief-icon flight-brief-icon-cape"><Activity aria-hidden="true" /></span>
                    <div><small>Instabilità CAPE</small><strong>{typeof current?.cape === "number" ? Math.round(current.cape).toLocaleString("it-IT") + " J/kg" : "N/D"}</strong><em>Indice del modello</em></div>
                  </article>
                </div>
                <p>Riepilogo indicativo: verifica sempre vento, meteo locale e bollettini ufficiali prima del decollo.</p>
              </section>
            )}

            {activeTab !== "venti" && site && (
              <section id="overview" className="overview-section">
                <SiteHeader
                  site_name={site.site_name}
                  location_name={site.location_name}
                  orientation={site.orientation}
                  elevation_m={site.elevation_m}
                  currentData={currentData as any}
                  sunrise={formatClock(enrichedDaily[selectedDay]?.sunrise)}
                  sunset={formatClock(enrichedDaily[selectedDay]?.sunset)}
                  uvIndex={enrichedDaily[selectedDay]?.uvIndexMax ?? currentData?.uvIndex}
                />
              </section>
            )}

            <div className="dashboard-layout flight-panels-grid">
              <div className="flight-desk-main dashboard-content min-w-0">
                {site && activeTab !== "venti" && (
                  <>
                    <DayStoryboard dayData={filteredDayData} siteName={site.site_name} selectedHour={selectedHour} onHourSelect={setSelectedHour} />
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

                    <section id="windgram-section" className="windgram-section windgram-featured min-w-0 overflow-hidden rounded-2xl p-3 sm:p-4">
                      <Windgram
                        dayData={filteredDayData}
                        siteName={site.site_name}
                        altitude={site.elevation_m}
                        selectedHour={selectedHour}
                        onHourSelect={setSelectedHour}
                        selectedDay={selectedDay}
                        dateLabel={dateLabel}
                        lat={site.lat}
                        lon={site.lon}
                        fallbackData={filteredDayData}
                        rawData={rawApiResponse}
                      />
                    </section>



                    {site.id === "montoso-decollo-basso" && (
                      <section className="flight-aux-chart min-w-0">
                        <RasoftWindgram latitude={site.lat} longitude={site.lon} altitude={site.elevation_m} siteName="Montoso Alto" selectedDay={selectedDay} />
                      </section>
                    )}

                    <section id="details-section" className="details-section scroll-mt-4">
                      <div className="flight-subsection-heading"><div><span>STRUMENTI DI ANALISI</span><h2>Meteo e aerologia</h2></div><small>Seleziona una scheda</small></div>
                      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
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
                      {activeTab === "termiche" && (
                        <TermicheTab currentData={currentData as any} dayData={filteredDayData} site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name }} selectedDay={selectedDay} />
                      )}
                      {activeTab === "analisi" && (
                        <AnalisiMeteo currentData={currentData as any} dayData={filteredDayData} site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name, exposure: site.orientation }} cape={currentData?.cape} liftedIndex={currentData?.liftedIndex} cin={currentData?.cin} rawData={rawApiResponse} />
                      )}
                    </section>

                    <section className="flight-hourly-section min-w-0">
                      <div className="flight-subsection-heading"><div><span>DETTAGLIO ORARIO</span><h2>Previsioni ora per ora</h2></div><small>{dateLabel}</small></div>
                      <HourlyTable dayData={filteredDayData} altitude={site.elevation_m} selectedHour={selectedHour} onHourSelect={setSelectedHour} dayLabel={dateLabel} siteName={site.site_name} />
                    </section>
                  </>
                )}

                {site && activeTab === "venti" && (
                  <div className="alpium-wind-page">
                    <section id="details-section" className="details-section alpium-tabs-section scroll-mt-4">
                      <div className="flight-subsection-heading">
                        <div><span>STRUMENTI DI ANALISI</span><h2>Profilo aerologico</h2></div>
                        <small>{dateLabel} · {site.elevation_m.toLocaleString("it-IT")} m</small>
                      </div>
                      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
                    </section>

                    <section className="alpium-summary-grid" aria-label="Riepilogo meteo del decollo">
                      <article className="alpium-summary-card">
                        <span>DECOLLO</span>
                        <strong>{site.site_name}</strong>
                        <small>{site.elevation_m.toLocaleString("it-IT")} m s.l.m.</small>
                      </article>
                      <article className="alpium-summary-card">
                        <span>VENTO AL SUOLO</span>
                        <strong>{typeof current?.windSpeed === "number" ? Math.round(current.windSpeed) + " km/h" : "N/D"}</strong>
                        <small>{typeof current?.windDir === "number" ? Math.round(current.windDir) + "° di provenienza" : "Direzione non disponibile"}</small>
                      </article>
                      <article className="alpium-summary-card">
                        <span>RAFFICHE</span>
                        <strong>{typeof current?.windGusts === "number" ? Math.round(current.windGusts) + " km/h" : "N/D"}</strong>
                        <small>Previsione al decollo</small>
                      </article>
                      <article className="alpium-summary-card">
                        <span>CAPE</span>
                        <strong>{typeof current?.cape === "number" ? Math.round(current.cape).toLocaleString("it-IT") + " J/kg" : "N/D"}</strong>
                        <small>Indice convettivo del modello</small>
                      </article>
                    </section>

                    <Card className="alpium-windgram-panel">
                      <CardContent className="alpium-windgram-panel-content">
                        <div className="alpium-windgram-viewport">
                          <SectionErrorBoundary title="Il windgram verticale non è riuscito a caricarsi">
                            <ProfessionalWindgram
                              latitude={site.lat}
                              longitude={site.lon}
                              altitude={site.elevation_m}
                              siteName={site.site_name}
                              selectedDay={selectedDay}
                              rawData={rawApiResponse}
                            />
                          </SectionErrorBoundary>
                        </div>
                      </CardContent>
                    </Card>

                    <DailyThermalChart
                      dayData={filteredDayData}
                      altitude={site.elevation_m}
                      siteName={site.site_name}
                      dateLabel={dateLabel}
                    />

                    <section className="alpium-hourly-panel">
                      <div className="alpium-hourly-heading">
                        <div><span className="alpium-section-kicker">DATI ORARI</span><h2>Previsioni del decollo</h2></div>
                        <small>{dateLabel}</small>
                      </div>
                      <HourlyTable dayData={filteredDayData} altitude={site.elevation_m} selectedHour={selectedHour} onHourSelect={setSelectedHour} dayLabel={dateLabel} siteName={site.site_name} />
                    </section>
                  </div>
                )}
              </div>

              <aside className="dashboard-sidebar flight-right-rail" aria-label="Riepilogo del decollo">
                <UpdateTimer
                  lastUpdate={aggressiveLastUpdate ?? lastUpdate}
                  countdown={countdown}
                  updating={updating || aggressiveUpdating}
                  onRefresh={() => { loadWeather(); loadAggressiveWeather(); }}
                />

                {site && (
                  <section className="flight-side-card flight-site-info-card" aria-labelledby="flight-site-info-title">
                    <div className="flight-side-card-heading">
                      <div><span>IL DECOLLO</span><h2 id="flight-site-info-title">Dati del sito</h2></div>
                      <span className="flight-side-live"><i />Attivo</span>
                    </div>
                    <dl className="flight-site-data">
                      <div><dt><MapPin aria-hidden="true" />Coordinate</dt><dd>{site.lat.toFixed(4)}, {site.lon.toFixed(4)}</dd></div>
                      <div><dt><Mountain aria-hidden="true" />Altitudine</dt><dd>{site.elevation_m.toLocaleString("it-IT")} m s.l.m.</dd></div>
                      <div><dt><Compass aria-hidden="true" />Esposizione</dt><dd>{site.orientation || "N/D"}</dd></div>
                      <div><dt><Sun aria-hidden="true" />Alba · tramonto</dt><dd>{formatClock(enrichedDaily[selectedDay]?.sunrise) ?? "N/D"} · {formatClock(enrichedDaily[selectedDay]?.sunset) ?? "N/D"}</dd></div>
                      <div><dt><Eye aria-hidden="true" />Visibilità</dt><dd>{typeof current?.visibility === "number" ? (current.visibility >= 10000 ? "10+ km" : (current.visibility / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 }) + " km") : "N/D"}</dd></div>
                      <div><dt><Wind aria-hidden="true" />Vento attuale</dt><dd>{typeof current?.windSpeed === "number" ? Math.round(current.windSpeed) + " km/h" : "N/D"}{typeof current?.windDir === "number" ? " · " + Math.round(current.windDir) + "°" : ""}</dd></div>
                    </dl>
                  </section>
                )}

                <section id="flight-site-list" className="flight-site-list">
                  <DecolliCard
                    decolli={mergedDecolli}
                    selectedId={selectedId}
                    selectedDay={selectedDay}
                    isUpdating={aggressiveUpdating}
                    error={aggressiveError}
                    onSelect={(item) => { setSelectedId(item.id); setSelectedHour(new Date().getHours()); }}
                  />
                </section>

                <section className="flight-side-card flight-parameters-card" aria-labelledby="flight-parameters-title">
                  <div className="flight-side-card-heading"><div><span>PROFILO AEROLOGICO</span><h2 id="flight-parameters-title">Parametri di volo</h2></div><Activity aria-hidden="true" /></div>
                  <div className="flight-quick-params">
                    {quickParams.map((item) => (
                      <div className="flight-quick-param" key={item.label}>
                        <span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small>
                      </div>
                    ))}
                  </div>
                  <p className="flight-param-note">Le stime non sostituiscono il controllo sul posto e i bollettini ufficiali.</p>
                </section>
              </aside>
            </div>
          </main>

          <nav className="mobile-bottom-nav" aria-label="Navigazione rapida">
            <a href="#overview" aria-label="Home"><span>⌂</span><small>Home</small></a>
            <a href="#flight-site-list" aria-label="Decolli"><span>⌖</span><small>Decolli</small></a>
            <a href="#windgram-section" aria-label="Windgram"><span>〰</span><small>Windgram</small></a>
            <button type="button" onClick={() => { setActiveTab("analisi"); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Analisi"><span>◉</span><small>Analisi</small></button>
          </nav>
          <Footer />
        </div>
      </div>
      <DiagnosticaPanel />
    </div>
  );
}