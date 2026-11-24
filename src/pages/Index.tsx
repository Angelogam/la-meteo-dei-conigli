"use client";

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Activity, FileDown, FileText, Home, Mountain, Thermometer, Wind } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import HeroFotografico from "@/components/HeroFotografico";
import PilotBrainHero from "@/components/verdetto/PilotBrainHero";
import { calcolaVerdettoInterim } from "@/components/verdetto/verdettoInterim";
import UpdateTimer from "@/components/UpdateTimer";
import SponsorStrip from "@/components/SponsorStrip";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import TabNav from "@/components/TabNav";
/* Revisione critica 23/11 (punto 9): le sezioni sotto la piega si caricano
   al bisogno — lazy loading + rendering on demand. */
const WebcamNearby = lazy(() => import("@/components/WebcamNearby"));
const CartinaMeteo = lazy(() => import("@/components/CartinaMeteo"));
const Cartina3D = lazy(() => import("@/components/cartina3d/Cartina3D"));
const VentiInterpolatiTab = lazy(() => import("@/components/VentiInterpolatiTab"));
const TermicheTab = lazy(() => import("@/components/TermicheTab"));
const AnalisiMeteo = lazy(() => import("@/components/AnalisiMeteo"));
const ReportVolo = lazy(() => import("@/components/ReportVolo"));
const ReportAICard = lazy(() => import("@/components/ReportAICard"));
const ServiziDecollo = lazy(() => import("@/components/ServiziDecollo"));
const DiagnosticaPanel = lazy(() => import("@/components/DiagnosticaPanel"));
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent } from "@/services/openMeteoService";
import { generateForecast } from "@/utils/ForecastAnalyzer";
import { dirName as dirNomeBreve } from "@/utils/dirName";
import type { PromoData } from "@/components/HeroFotografico";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useThreeSourceWeather } from "@/hooks/useThreeSourceWeather";

function formatClock(value?: string): string | undefined {
  if (!value) return undefined;
  return value.includes("T") ? value.slice(11, 16) : value.slice(0, 5);
}

/* Placeholder leggero mentre la sezione lazy si carica */
function SezioneInCarico() {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 px-4 py-7 text-center text-sm text-slate-400">
      Carico la sezione…
    </div>
  );
}

/* Rendering on demand REALE (revisione critica 23/11, FAIL#7): la sezione pesante
   si monta solo quando si avvicina al viewport — è lì che parte il download del
   suo chunk (React.lazy). Niente più «tutte montate all'avvio». */
function SezioneAlBisogno({ children, altezzaMinima = 340 }: { children: React.ReactNode; altezzaMinima?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [vicino, setVicino] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || vicino) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVicino(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [vicino]);
  return (
    <div ref={ref} style={vicino ? undefined : { minHeight: altezzaMinima }}>
      {vicino ? (
        children
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-slate-700/40 bg-slate-800/20 px-4 text-sm text-slate-500" style={{ minHeight: altezzaMinima }}>
          Sezione pronta: si carica quando scorri fino a qui
        </div>
      )}
    </div>
  );
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
    hourlyData,
    currentData,
    enrichedDaily,
    dateLabels,
    loadWeather,
    rawApiResponse,
    loadingError,
    isOfflineMode,
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

  // LIVELLO 1 — LA DECISIONE: verdetto dall'unico dato già in dashboard (R3).
  // Interim: usa le utility decisionali esistenti (calcolaIndiceVolabilità +
  // validaVentoPerDecollo); la fase F2 (Decision Engine + banca dati in
  // docs/cervello-pilota/) sostituirà questo adattatore senza toccare il
  // componente PilotBrainHero.
  const verdetto = useMemo(
    () =>
      calcolaVerdettoInterim({
        siteName: site?.site_name,
        elevation: site?.elevation_m,
        orientation: site?.orientation,
        current: currentData,
        hourly: filteredDayData,
        sunset: enrichedDaily[selectedDay]?.sunset,
        lastUpdate,
      }),
    [site, currentData, filteredDayData, enrichedDaily, selectedDay, lastUpdate],
  );

  /* Dati REALI per il bollettino nella hero (stesse fonti della pagina:
     Open-Meteo corrente + orari del giorno scelto + verdetto di generateForecast). */
  const promoData = useMemo<PromoData | null>(() => {
    if (!site) return null;
    const base = new Date();
    base.setDate(base.getDate() + selectedDay);
    const key = base.toDateString();
    const rows = hourlyData.filter((h) => h.time instanceof Date && h.time.toDateString() === key);
    const pool = rows.length ? rows : hourlyData.filter((h) => h.time instanceof Date && h.time.getHours() >= 9 && h.time.getHours() <= 18);
    const central = pool.find((h) => h.time.getHours() === 13) ?? pool[Math.floor(pool.length / 2)] ?? null;
    const gusts = pool.map((h) => h.windGusts).filter((g): g is number => typeof g === "number");
    const gustMax = gusts.length ? Math.max(...gusts) : currentData?.windGusts ?? null;
    const zero = enrichedDaily[selectedDay]?.freezingLevel ?? central?.freezingLevel ?? null;
    const cur = currentData;
    const w = (dir: number | null | undefined, spd: number | null | undefined, label: string, note: string) =>
      dir != null && spd != null
        ? { q: label, v: `${dirNomeBreve(dir)} · ${Math.round(spd)}`, s: note, deg: Math.round(dir), spd: Math.round(spd) }
        : null;
    /* Con Oggi selezionato la prima riga è l'osservazione live; con Domani/
       Dopodomani tutte le righe vengono dal modello del giorno richiesto. */
    const wind = [
      selectedDay === 0 && cur
        ? w(cur.windDir, cur.windSpeed, "sul decollo", "ora corrente")
        : central
          ? w(central.windDir, central.windSpeed, "sul decollo", `modello · ore ${String(central.time.getHours()).padStart(2, "0")}:00`)
          : null,
      central ? w(central.windDir850, central.windSpeed850, "a 1.500 m", "sul modello") : null,
      central ? w(central.windDir700, central.windSpeed700, "a 3.000 m", "sul modello") : null,
    ];
    const forecast = generateForecast(site.site_name, cur, pool.length ? pool : hourlyData, enrichedDaily[selectedDay] ? [enrichedDaily[selectedDay]] : []);
    return {
      site: site.site_name,
      elev: site.elevation_m,
      dateLabel: base.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase()),
      wind: wind.filter((x): x is NonNullable<typeof x> => x != null),
      zero: zero != null ? Math.round(zero) : null,
      volabile: forecast.probabilities.flyable,
      gust: gustMax != null ? `${Math.round(gustMax)} km/h` : undefined,
      /* UN SOLO GIUDIZIO (revisione critica 23/11 FAIL#5/#9): l'hero mostra il
         verdetto del Pilot Brain — non una seconda valutazione parallela. */
      verdict: verdetto
        ? verdetto.esito === "GO"
          ? "GO"
          : verdetto.esito === "ATTESA"
            ? "ATTENZIONE"
            : "NO GO"
        : forecast.semaforo,
    };
  }, [site, currentData, hourlyData, enrichedDaily, selectedDay, verdetto]);


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
              <FileText aria-hidden="true" /><span>Report</span>
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
            <button
              type="button"
              className="flight-nav-item flight-nav-report"
              title="Produce il report del decollo: 2 pagine A4 in anteprima, poi scaricabili in PDF, PNG, JPG o WhatsApp"
              onClick={() => {
                setActiveTab("analisi");
                document.getElementById("details-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                window.setTimeout(() => window.dispatchEvent(new CustomEvent("meteo-dei-conigli:export-report")), 650);
              }}
            >
              <FileDown aria-hidden="true" /><span>Produce report (2 pagine)</span>
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
            {/* stato dati onesto (24/11): il sito non può sembrare rotto in silenzio */}
            {(loadingError || isOfflineMode) && (
              <div role="status" className="rounded-2xl border border-attesa/60 bg-attesa/10 px-4 py-3 text-sm font-semibold text-attesa">
                {loadingError ?? "Dati in cache — modello non raggiungibile"}
                {isOfflineMode ? " · il sito riprova da solo ogni 15 minuti." : ""}
              </div>
            )}
            {/* 1 · TITOLO E SINTESI RAPIDA — l'hero fotografica resta l'ingresso
                (revisione critica 23/11 punto 1: il Pilot Brain NON è la schermata principale) */}
            <HeroFotografico
              siteName={site?.site_name}
              elevation={site?.elevation_m}
              temperature={currentData?.temperature ?? undefined}
              windSpeed={currentData?.windSpeed ?? undefined}
              windDir={currentData?.windDir ?? undefined}
              promo={promoData}
              isLoading={!site}
            />

            <SponsorStrip />

            {/* 2 · SINTESI RAPIDA DEL DECOLLO ATTIVO */}
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
                <UpdateTimer
                  lastUpdate={lastUpdate}
                  countdown={countdown}
                  updating={updating || aggressiveUpdating}
                  onRefresh={() => {
                    void loadWeather();
                    void loadAggressiveWeather();
                  }}
                />
              </section>
            )}

            {/* 2b · BARRA TEMPORALE — i giorni dominano la navigazione
                (revisione critica 23/11 FAIL#4): resta appiccicata in alto per
                tutta la pagina, sempre visibile mentre scorri. */}
            <div className="day-picker-big day-picker-page" role="group" aria-label="Scegli il giorno del briefing">
              {(["OGGI", "DOMANI", "DOPODOMANI", "+3", "+4"] as const).map((tabName, idx) => (
                <button
                  key={tabName}
                  type="button"
                  aria-pressed={selectedDay === idx}
                  onClick={() => setSelectedDay(idx)}
                  className={"day-picker-big-btn" + (selectedDay === idx ? " is-selected" : "")}
                >
                  <span className="day-picker-big-label">{tabName}</span>
                  <span className="day-picker-big-date">{dateLabels[idx] ?? ""}</span>
                </button>
              ))}
            </div>

            {/* 3 · PILOT BRAIN BRIEFING — le risposte operative, sotto la decisione */}
            {verdetto && (
              <PilotBrainHero
                verdetto={verdetto}
                onChecklist={() => document.getElementById("flight-site-list")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                onBriefing={() => document.getElementById("details-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              />
            )}

            {/* 4 · MAPPA INTERATTIVA DEI DECOLLI */}
            {site && (
              <div className="flight-subsection-heading" aria-label="Mappa interattiva dei decolli">
                <div>
                  <span>MAPPA INTERATTIVA</span>
                  <h2>Decolli d'Italia</h2>
                </div>
                <small>Tocca un decollo per aggiornare tutta la pagina</small>
              </div>
            )}
            {site && (
              <Suspense fallback={<SezioneInCarico />}>
                <SezioneAlBisogno>
                  <CartinaMeteo
                    decolli={mergedDecolli}
                    selectedId={selectedId}
                    syncDay={selectedDay}
                    syncHour={selectedHour}
                    onSelect={(item) => { setSelectedId(item.id); setSelectedHour(new Date().getHours()); }}
                  />
                </SezioneAlBisogno>
              </Suspense>
            )}

            {/* 5 · PREVISIONI DEI PROSSIMI GIORNI */}
            {site && (
              <section className="forecast-section flight-forecast-module min-w-0">
                <PrevisioniGiornaliere
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  currentData={currentData}
                  forecastHours={hourlyData}
                  site={{ name: site.site_name, altitude: site.elevation_m, exposure: site.orientation, lat: site.lat, lon: site.lon }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  nomeDecollo={site.site_name}
                />
              </section>
            )}

            {/* 6 · WEBCAM E SERVIZI ATTORNO AL DECOLLO */}
            {site && (
              <Suspense fallback={<SezioneInCarico />}>
                <SezioneAlBisogno>
                  <WebcamNearby
                    siteId={site.id}
                    siteName={site.site_name}
                    latitude={site.lat}
                    longitude={site.lon}
                  />
                </SezioneAlBisogno>
              </Suspense>
            )}
            {site && (
              <Suspense fallback={null}>
                <SezioneAlBisogno altezzaMinima={120}>
                  <ServiziDecollo nome={site.site_name} lat={site.lat} lon={site.lon} />
                </SezioneAlBisogno>
              </Suspense>
            )}

            {/* 7 · LIVELLO 3 — STRUMENTI AVANZATI */}
            {site && (
              <div className="flight-subsection-heading" aria-label="Strumenti avanzati">
                <div>
                  <span>LIVELLO 3 · STRUMENTI AVANZATI</span>
                  <h2>Terrain 3D, vento in quota, report e analisi</h2>
                </div>
                <small>Approfondimento dopo la decisione</small>
              </div>
            )}

            {site && (
              <div className="flight-top-dashboard-grid">
                <div className="flight-primary-column">
                  <Suspense fallback={<SezioneInCarico />}>
                    <SezioneAlBisogno>
                      <Cartina3D
                        decolli={mergedDecolli}
                        selectedId={selectedId}
                        hour={selectedHour}
                        day={selectedDay}
                        onSelect={(item) => { setSelectedId(item.id); setSelectedHour(new Date().getHours()); }}
                      />
                    </SezioneAlBisogno>
                  </Suspense>
                  <Suspense fallback={<SezioneInCarico />}>
              {/* l'ancora vive sul wrapper SEMPRE presente: prima del caricamento
                  on-demand il pulsante «Venti» deve comunque trovare il bersaglio */}
              <div id="windgram-section" className="scroll-mt-4 min-w-0">
              <SezioneAlBisogno>
              <section className="launch-windgram-top min-w-0" aria-label="Profilo del vento del decollo selezionato">
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
              </SezioneAlBisogno>
              </div>
                  </Suspense>
            <div className="dashboard-layout flight-panels-grid">
              <div className="flight-desk-main dashboard-content min-w-0">
                {site && (
                  <>
                    <section id="details-section" className="details-section scroll-mt-4">
                      <div className="flight-subsection-heading"><div><span>REPORT DELLA GIORNATA</span><h2>Il briefing del pilota</h2></div><small>Seleziona una scheda</small></div>
                      <TabNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); if (tab === "venti") document.getElementById("windgram-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
                    </section>

                    <section className="flight-tab-content min-w-0" aria-live="polite">
                      {activeTab === "meteo" && site && (
                        <Suspense fallback={<SezioneInCarico />}>
                          <ReportVolo
                            inline
                            open
                            onClose={() => setActiveTab("meteo")}
                            item={site}
                            selectedDay={selectedDay}
                            onSelectDay={setSelectedDay}
                            selectedHour={selectedHour}
                            onHourSelect={setSelectedHour}
                            onSelect={(d) => { setSelectedId(d.id); }}
                            decolli={mergedDecolli}
                          />
                        </Suspense>
                        /* Il doppio report esportabile è stato tolto da questa
                           scheda (revisione critica 23/11, punto 8): l'unico
                           prodotto esportabile sta in Analisi (ReportAICard). */
                      )}
                      {activeTab === "venti" && (
                        <div className="launch-windgram-shortcut" role="status">
                          <Wind aria-hidden="true" />
                          <div>
                            <strong>Il profilo del vento è già in alto</strong>
                            <p>Il profilo verticale e le masse d’aria colorate corrispondono al decollo selezionato.</p>
                          </div>
                          <button type="button" onClick={() => document.getElementById("windgram-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                            Vai al windgram
                          </button>
                        </div>
                      )}
                      {activeTab === "termiche" && (
                        <Suspense fallback={<SezioneInCarico />}>
                          <TermicheTab currentData={currentData} dayData={filteredDayData} site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name }} selectedDay={selectedDay} />
                        </Suspense>
                      )}
                      {activeTab === "analisi" && (
                        <div className="analisi-tab-layout">
                          <aside className="analisi-side" aria-label="Report scaricabili per i decolli">
                            <div className="analisi-side-heading">
                              <h3>Analisi</h3>
                              <p>Scarica un report per i decolli</p>
                              <button
                                type="button"
                                className="analisi-export-btn"
                                title="Esporta il report in PDF A4: locandina + informazioni del volo"
                                onClick={() => window.dispatchEvent(new CustomEvent("meteo-dei-conigli:export-report"))}
                              >
                                <FileDown size={16} aria-hidden="true" />
                                Genera un report esportabile
                              </button>
                            </div>
                            {site && (
                              <Suspense fallback={<SezioneInCarico />}>
                                <ReportAICard
                                  siteName={site.site_name}
                                  elevation={site.elevation_m}
                                  lat={site.lat}
                                  lon={site.lon}
                                  current={currentData}
                                  hourly={hourlyData}
                                  rawData={rawApiResponse}
                                  daily={enrichedDaily}
                                  selectedDay={selectedDay}
                                  onSelectDay={setSelectedDay}
                                />
                              </Suspense>
                            )}
                          </aside>
                          <div className="analisi-main">
                            <Suspense fallback={<SezioneInCarico />}>
                              <AnalisiMeteo currentData={currentData} dayData={filteredDayData} site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name, exposure: site.orientation }} cape={currentData?.cape} liftedIndex={currentData?.liftedIndex} cin={currentData?.cin} rawData={rawApiResponse} />
                            </Suspense>
                          </div>
                        </div>
                      )}
                    </section>

                    <div className="flight-report-cta">
                      <span>Il meteogram orario — vento, raffiche, termiche, nuvole, umidità, UV e indice di volabilità ora per ora — è nella scheda Report</span>
                      <button
                        type="button"
                        onClick={() => { setActiveTab("meteo"); document.getElementById("details-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                      >
                        Apri il report della giornata
                      </button>
                    </div>
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
      <Suspense fallback={null}>
        <DiagnosticaPanel />
      </Suspense>
    </div>
  );
}