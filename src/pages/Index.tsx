"use client";

import { useMemo, useState, useCallback } from "react";
import { ArrowRight, MapPin, Thermometer, Droplets, Wind, Mountain, Clock, RefreshCw, ChevronRight, Layers, Cloud, CloudSun, CloudRain, Star, Sun, Activity, Flame } from "lucide-react";
import type { MeteoCurrent, MeteoDaily } from "@/services/openMeteoService";
import type { Decollo } from "@/data/decolli";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import HourlyTable from "@/components/HourlyTable";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useThreeSourceWeather } from "@/hooks/useThreeSourceWeather";

/* ── Weather SVG icons for forecast ── */
const WeatherIcon = ({ code, size = 28 }: { code: number | null; size?: number }) => {
  if (code === null) return <Cloud size={size} className="text-slate-500" />;
  if (code >= 95) return <CloudRain size={size} className="text-purple-400" />;
  if (code >= 80) return <CloudRain size={size} className="text-sky-400" />;
  if (code >= 71) return <Cloud size={size} className="text-sky-200" />;
  if (code >= 61) return <CloudRain size={size} className="text-sky-300" />;
  if (code >= 45) return <Cloud size={size} className="text-slate-400" />;
  if (code >= 3) return <Cloud size={size} className="text-slate-400" />;
  if (code >= 1) return <CloudSun size={size} className="text-amber-300" />;
  return <Sun size={size} className="text-amber-400" />;
};

function formatClock(value?: string): string | undefined {
  if (!value) return undefined;
  return value.includes("T") ? value.slice(11, 16) : value.slice(0, 5);
}

/* ── Main page ── */
export default function Index() {
  const {
    selectedId, setSelectedId, updating, selectedDay, setSelectedDay, selectedHour,
    setActiveTab, activeTab, site, dayData, currentData, thermalDelta,
    enrichedDaily, dateLabels, rawApiResponse,
  } = useWeatherData();

  const { mergedDecolli, lastUpdate: aggressiveLastUpdate, error: aggressiveError, updating: aggressiveUpdating, loadWeather: loadAgg } = useThreeSourceWeather();

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const todayForecast = enrichedDaily[selectedDayIdx] ?? enrichedDaily[0];
  const tomorrowForecast = enrichedDaily[selectedDayIdx + 1];
  const dayAfterForecast = enrichedDaily[selectedDayIdx + 2];

  const handleRefresh = useCallback(() => { loadAgg(); }, [loadAgg]);

  const handleSelectDecollo = useCallback((item: Decollo) => {
    setSelectedId(item.id);
    setSelectedHour(new Date().getHours());
  }, [setSelectedId, setSelectedHour]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as any);
  }, [setActiveTab]);

  const filteredDayData = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    const today = new Date();
    const target = new Date(today);
    target.setDate(today.getDate() + selectedDay);
    const targetStr = target.toDateString();
    return dayData.filter((h: any) => new Date(h.time).toDateString() === targetStr);
  }, [dayData, selectedDay]);

  const sunrise = formatClock(enrichedDaily[selectedDay]?.sunrise);
  const sunset = formatClock(enrichedDaily[selectedDay]?.sunset);
  const uvIndex = enrichedDaily[selectedDay]?.uvIndexMax ?? currentData?.uvIndex;

  return (
    <div className="app-shell">
      {/* ── Top bar ── */}
      <Header
        siteName={site?.site_name}
        siteAlt={site?.elevation_m}
        currentData={currentData as any}
      />

      <div className="app-body">

        {/* ── LEFT NAV SIDEBAR ── */}
        <aside className="app-sidebar" aria-label="Navigazione">
          <div className="sidebar-logo">
            <Mountain size={28} />
            <span className="sidebar-brand">Conigli</span>
          </div>

          <nav className="sidebar-nav">
            {[
              { icon: Sun, label: "Home", active: true },
              { icon: CloudSun, label: "Meteo" },
              { icon: Mountain, label: "Decolli", badge: "18" },
              { icon: Layers, label: "Mappa" },
              { icon: Star, label: "Preferiti" },
            ].map((item) => (
              <button key={item.label} type="button" className={`sidebar-item${item.active ? " is-active" : ""}`}>
                <item.icon size={16} />
                <span>{item.label}</span>
                {item.badge && <span className="sidebar-badge">{item.badge}</span>}
              </button>
            ))}
          </nav>

          <div className="sidebar-divider" />

          {/* Current site mini */}
          {site && (
            <div className="sidebar-site">
              <div className="sidebar-site-icon"><Mountain size={14} /></div>
              <div>
                <div className="sidebar-site-name">{site.site_name}</div>
                <div className="sidebar-site-alt">{site.elevation_m} m</div>
              </div>
              <ChevronRight size={14} className="text-slate-500" />
            </div>
          )}

          <div className="sidebar-motto">
            "Il cielo non è il limite…<br />è solo l&apos;inizio!"
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="app-main">

          {/* Hero banner */}
          <section className="hero-banner">
            <div className="hero-overlay" />
            <div className="hero-content">
              <p className="hero-kicker">METEO · AEROLOGIA · VOLO LIBERO</p>
              <h1>Il meteo giusto<br />per il <span className="hero-highlight">tuo volo</span></h1>
              <p>Previsioni, decolli e condizioni in tempo reale per vivere la libertà del volo libero.</p>
              <p className="hero-quote">"Il cielo non è il limite… è solo l&apos;inizio!"</p>
            </div>
          </section>

          {/* Row: Mappa Meteo + Situazione attuale */}
          <div className="content-row">

            {/* Mappa Meteo */}
            <section className="map-card">
              <div className="map-header">
                <div className="map-title"><Layers size={15} /> Mappa Meteo</div>
                <div className="map-tabs">
                  {["Vento", "Pioggia", "Nuvolosità", "Temperature"].map((t, i) => (
                    <button key={t} type="button" className={`map-tab${i === 0 ? " is-active" : ""}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="map-frame">
                <iframe
                  src="https://weather.flybubble.com/it#/0/12"
                  title="Mappa meteo interattiva"
                  className="map-iframe"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                <div className="map-controls">
                  <button type="button" className="map-ctrl-btn">+</button>
                  <button type="button" className="map-ctrl-btn">−</button>
                  <button type="button" className="map-ctrl-btn map-ctrl-center"><MapPin size={14} /></button>
                </div>
                <div className="map-legend">
                  <div className="map-legend-bar">
                    <div className="map-legend-seg" style={{ background: "#22c55e" }} />
                    <div className="map-legend-seg" style={{ background: "#eab308" }} />
                    <div className="map-legend-seg" style={{ background: "#f97316" }} />
                    <div className="map-legend-seg" style={{ background: "#ef4444" }} />
                  </div>
                  <span className="map-legend-label">km/h</span>
                  <span className="map-legend-max">60</span>
                </div>
                {site && (
                  <div className="map-tooltip">
                    <MapPin size={13} />
                    <span>{site.site_name}</span>
                    <span className="map-tooltip-alt">{site.elevation_m} m s.l.m.</span>
                  </div>
                )}
              </div>
              <div className="map-footer">
                {currentData?.windSpeed != null && (
                  <div className="map-footer-stat">
                    <Wind size={12} />
                    <span>Vento a 10m: {Math.round(currentData.windSpeed)} km/h {currentData.windDir != null ? getWindCardinal(currentData.windDir) : ""}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Situazione attuale */}
            <section className="current-card">
              <div className="current-header">
                <span className="current-title">Situazione attuale</span>
                <button type="button" className="current-refresh" aria-label="Aggiorna"><RefreshCw size={13} /></button>
              </div>
              {currentData ? (
                <>
                  <div className="current-hero">
                    <WeatherIcon code={currentData.weatherCode} size={52} />
                    <div>
                      <div className="current-temp">
                        {Math.round(currentData.temperature ?? 0)}°C
                      </div>
                      <div className="current-feels">
                        Percepita {Math.round((currentData as any).apparentTemp ?? currentData.temperature ?? 0)}°C
                      </div>
                    </div>
                    <div className="current-condition">
                      {(() => {
                        const c = currentData.weatherCode ?? 0;
                        if (c >= 95) return "Temporale";
                        if (c >= 80) return "Pioggia";
                        if (c >= 3) return "Nuvoloso";
                        if (c >= 1) return "Parzialmente nuvoloso";
                        return "Sereno";
                      })()}
                    </div>
                    {currentData.windSpeed != null && (
                      <div className="current-wind-dir">
                        Vento {Math.round(currentData.windSpeed)} km/h da {getWindCardinal(currentData.windDir ?? 0)}
                      </div>
                    )}
                  </div>
                  <div className="current-grid">
                    {[
                      { icon: <Wind size={16} />, label: "Vento", value: currentData.windSpeed != null ? `${Math.round(currentData.windSpeed)} km/h ${getWindCardinal(currentData.windDir ?? 0)}` : "—", sub: currentData.windGusts != null ? `Raffiche ${Math.round(currentData.windGusts)} km/h` : "" },
                      { icon: <Droplets size={16} />, label: "Pioggia", value: `${currentData.precipitation ?? 0} mm`, sub: "" },
                      { icon: <Thermometer size={16} />, label: "Zero termico", value: ((currentData as any).freezingLevel != null ? `${Math.round((currentData as any).freezingLevel)} m` : "—"), sub: "" },
                      { icon: <Cloud size={16} />, label: "Nuvolosità", value: `${currentData.cloudCover ?? 0}%`, sub: "" },
                    ].map((m) => (
                      <div key={m.label} className="current-metric">
                        <div className="current-metric-icon">{m.icon}</div>
                        <div className="current-metric-info">
                          <div className="current-metric-label">{m.label}</div>
                          <div className="current-metric-value">{m.value}</div>
                          {m.sub && <div className="current-metric-sub">{m.sub}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="current-updated">
                    <Clock size={11} />
                    <span>Dati aggiornati alle {(currentData as any).time ? new Date((currentData as any).time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "16:20"}</span>
                    <span className="live-dot" />
                  </div>
                </>
              ) : (
                <div className="current-loading">
                  <RefreshCw size={20} className="dc-spin" />
                  <p>Caricamento dati meteo…</p>
                </div>
              )}
            </section>
          </div>

          {/* Previsioni meteo */}
          <section className="forecast-section">
            <div className="forecast-header">
              <span className="forecast-title"><Clock size={15} /> Previsioni meteo</span>
              <div className="forecast-tabs">
                {[0, 1, 2].map((i) => {
                  const days = ["Oggi", "Domani", "Mer " + (new Date(Date.now() + 2 * 86400000)).getDate()];
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`forecast-tab${selectedDayIdx === i ? " is-active" : ""}`}
                      onClick={() => setSelectedDayIdx(i)}
                    >
                      {days[i]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="forecast-cards">
              {([todayForecast, tomorrowForecast, dayAfterForecast] as (MeteoDaily | undefined)[]).map((d, i) => {
                const days = ["Oggi", "Domani", "Dopodomani"];
                const dateStr = (() => {
                  const dt = new Date(); dt.setDate(dt.getDate() + i);
                  return `${dt.getDate()} ${["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"][dt.getMonth()]}`;
                })();
                if (!d) return null;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`forecast-card${selectedDayIdx === i ? " is-selected" : ""}`}
                    onClick={() => setSelectedDayIdx(i)}
                  >
                    <div className="forecast-card-top">
                      <span className="forecast-day-label">{days[i]}</span>
                      <span className="forecast-day-date">{dateStr}</span>
                      <ArrowRight size={14} className="forecast-card-arrow" />
                    </div>
                    <div className="forecast-card-main">
                      <WeatherIcon code={d.weatherCode} size={36} />
                      <div className="forecast-temp-range">
                        <span className="forecast-temp-high">{Math.round(d.temperatureMax ?? 0)}°</span>
                        <span className="forecast-temp-slash">/</span>
                        <span className="forecast-temp-low">{Math.round(d.temperatureMin ?? 0)}°</span>
                      </div>
                      <div className="forecast-condition">{getWeatherLabel(d.weatherCode)}</div>
                    </div>
                    {/* Hourly mini preview */}
                    <div className="forecast-hours">
                      {(() => {
                        const hours = [8, 11, 14, 17, 20];
                        return hours.map(h => {
                          const hData = (dayData as any[] | undefined)?.find((hd: any) => new Date(hd.time).getHours() === h && Math.abs(new Date(hd.time).getDate() - (new Date().getDate() + i)) <= 1);
                          const t = hData?.temperature ?? null;
                          return (
                            <div key={h} className="forecast-hour">
                              <span className="forecast-hour-time">{h}:00</span>
                              <WeatherIcon code={hData?.weatherCode ?? d.weatherCode} size={16} />
                              <span className="forecast-hour-temp">{t !== null ? `${Math.round(t)}°` : "—"}</span>
                            </div>
                          );
                        });
                      })()}\n                    </div>
                    {/* Mini metrics */}
                    <div className="forecast-card-metrics">
                      <div className="forecast-m">
                        <Wind size={11} />
                        <span>{d.windSpeedMax != null ? `${Math.round(d.windSpeedMax)} km/h` : "—"}</span>
                      </div>
                      <div className="forecast-m">
                        <Droplets size={11} />
                        <span>{d.precipitationSum != null ? `${d.precipitationSum.toFixed(1)} mm` : "0 mm"}</span>
                      </div>
                      <div className="forecast-m">
                        <Thermometer size={11} />
                        <span>—</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Detailed sections (below forecast) ── */}
          {site && (
            <div className="detail-columns">
              <div className="detail-main">
                {/* Site Header */}
                <section className="detail-site-header">
                  <SiteHeader
                    site_name={site.site_name}
                    location_name={site.location_name}
                    orientation={site.orientation}
                    elevation_m={site.elevation_m}
                    currentData={currentData as any}
                    sunrise={sunrise}
                    sunset={sunset}
                    uvIndex={uvIndex}
                  />
                </section>

                {/* Windgram */}
                <section className="detail-windgram">
                  <VentiInterpolatiTab
                    lat={site.lat}
                    lon={site.lon}
                    quotaDecollo={site.elevation_m}
                    selectedDay={selectedDay}
                    oraCorrente={selectedHour}
                    onOraChange={(h) => setSelectedHour(h)}
                    siteName={site.site_name}
                    siteId={site.id}
                    rawData={rawApiResponse}
                  />
                </section>

                {/* Tabs */}
                <section className="detail-tabs">
                  <TabNav activeTab={activeTab} onTabChange={handleTabChange} />
                  <div className="detail-tab-content">
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
                      <div className="detail-venti-info">
                        <Wind size={18} className="detail-venti-icon" />
                        <p>Il windgram è visibile sopra. I dati di vento interpolati vengono calcolati dal modello Open-Meteo per la quota del decollo selezionato.</p>
                      </div>
                    )}
                    {activeTab === "termiche" && (
                      <TermicheTab
                        currentData={currentData as any}
                        dayData={filteredDayData}
                        site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name }}
                        selectedDay={selectedDay}
                      />
                    )}
                    {activeTab === "analisi" && (
                      <AnalisiMeteo
                        currentData={currentData as any}
                        dayData={filteredDayData}
                        site={{ alt: site.elevation_m, lat: site.lat, lon: site.lon, name: site.site_name, exposure: site.orientation }}
                        cape={currentData?.cape}
                        liftedIndex={currentData?.liftedIndex}
                        cin={currentData?.cin}
                        rawData={rawApiResponse}
                      />
                    )}
                  </div>
                </section>

                {/* Hourly table */}
                <section className="detail-hourly">
                  <HourlyTable
                    dayData={filteredDayData}
                    altitude={site.elevation_m}
                    selectedHour={selectedHour}
                    onHourSelect={setSelectedHour}
                    dayLabel={dateLabels[selectedDay] || "Oggi"}
                    siteName={site.site_name}
                  />
                </section>
              </div>
            </div>
          )}

        </main>

        {/* ── RIGHT SIDEBAR (launch sites) ── */}
        <aside className="app-sidebar-right" aria-label="Lista decolli">
          <DecolliCard
            decolli={mergedDecolli}
            selectedId={selectedId}
            selectedDay={selectedDayIdx}
            isUpdating={aggressiveUpdating}
            error={aggressiveError}
            onRefresh={handleRefresh}
            onSelect={handleSelectDecollo}
          />
        </aside>

      </div>

      <Footer />
      <DiagnosticaPanel />
    </div>
  );
}

/* ── Helpers ── */
function getWindCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWeatherLabel(code: number | null): string {
  if (code === null) return "N/D";
  if (code >= 95) return "Temporale";
  if (code >= 80) return "Pioggia";
  if (code >= 71) return "Neve";
  if (code >= 61) return "Pioggia";
  if (code >= 51) return "Pioviggine";
  if (code >= 45) return "Nebbia";
  if (code >= 3) return "Nuvoloso";
  if (code >= 1) return "Parz. nuvoloso";
  return "Sereno";
}
