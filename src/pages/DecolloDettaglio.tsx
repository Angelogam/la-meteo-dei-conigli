"use client";

/**
 * PAGINA DETTAGLIO DECOLLO — /decollo/:id
 * Tutte le informazioni del decollo in una pagina dedicata (non nel pannello
 * laterale, per non appesantire la finestra principale): foto della fonte,
 * descrizione in italiano, dati operativi, atterraggio, galleria, webcam
 * verificate e sintesi meteo a 3 giorni.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Camera, ExternalLink, Flag, Layers, MapPin, Mountain,
  Navigation, PlaneLanding, Star, Thermometer, Users, Wind, Zap,
} from "lucide-react";
import { DECOLLO_MAP, AREA_LABELS, type Decollo } from "@/data/decolli";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import WebcamNearby from "@/components/WebcamNearby";
import "../decpl-dettaglio.css";

interface MiniMeteo {
  current: {
    temperature: number | null;
    windSpeed: number | null;
    windGusts: number | null;
    windDir: number | null;
    code: number | null;
  };
  days: {
    date: string;
    tMax: number | null;
    tMin: number | null;
    rain: number | null;
    wind: number | null;
    gusts: number | null;
    dir: number | null;
  }[];
}

const CODE_ICON: Record<number, string> = { 0: "☀", 1: "🌤", 2: "⛅", 3: "☁", 45: "🌫", 48: "🌫", 51: "🌦", 53: "🌦", 55: "🌦", 61: "🌧", 63: "🌧", 65: "🌧", 71: "🌨", 73: "🌨", 75: "❄", 80: "🌦", 81: "🌧", 82: "🌧", 95: "⛈", 96: "⛈", 99: "⛈" };

function dirCardinale(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "—";
  const settori = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return settori[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function verdictDay(g: MiniMeteo["days"][number]): { label: string; cls: string } {
  if (g.gusts != null && g.gusts > 40) return { label: "Vento troppo forte", cls: "is-bad" };
  if ((g.rain ?? 0) > 3) return { label: "Pioggia probabile", cls: "is-bad" };
  if ((g.rain ?? 0) > 0.6 || (g.gusts ?? 0) > 28) return { label: "Finestre limitate", cls: "is-mid" };
  if ((g.wind ?? 0) > 18) return { label: "Brezza sostenuta", cls: "is-mid" };
  return { label: "Giornata favorevole", cls: "is-good" };
}

function espostaGiudizio(d: Decollo): string {
  const rating = d.rating ?? 0;
  if (rating >= 5) return "Sito top della community";
  if (rating >= 4) return "Sito molto apprezzato";
  if (rating >= 3) return "Sito consolidato";
  if (rating >= 1) return "Sito secondario da verificare in loco";
  return "Sito poco documentato";
}

export default function DecolloDettaglio() {
  const { id } = useParams<{ id: string }>();
  const site = id ? DECOLLO_MAP[id] : undefined;

  const [meteo, setMeteo] = useState<MiniMeteo | null>(null);
  const [meteoState, setMeteoState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!site) return;
    const controller = new AbortController();
    setMeteoState("loading");
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}` +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant" +
      "&current=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code" +
      "&timezone=Europe%2FRome&forecast_days=3";
    fetch(url, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((j) => {
        const days = (j?.daily?.time ?? []).map((t: string, i: number) => ({
          date: t,
          tMax: j.daily.temperature_2m_max?.[i] ?? null,
          tMin: j.daily.temperature_2m_min?.[i] ?? null,
          rain: j.daily.precipitation_sum?.[i] ?? null,
          wind: j.daily.wind_speed_10m_max?.[i] ?? null,
          gusts: j.daily.wind_gusts_10m_max?.[i] ?? null,
          dir: j.daily.wind_direction_10m_dominant?.[i] ?? null,
        }));
        setMeteo({
          current: {
            temperature: j?.current?.temperature_2m ?? null,
            windSpeed: j?.current?.wind_speed_10m ?? null,
            windGusts: j?.current?.wind_gusts_10m ?? null,
            windDir: j?.current?.wind_direction_10m ?? null,
            code: j?.current?.weather_code ?? null,
          },
          days,
        });
        setMeteoState("ok");
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setMeteoState("error");
      });
    return () => controller.abort();
  }, [site]);

  const gallery = useMemo(() => site?.photos ?? (site?.photo ? [site.photo] : []), [site]);

  if (!site) {
    return (
      <div className="flight-website-shell min-h-screen">
        <Header />
        <div className="flight-app-body is-single">
          <div className="flight-page-column">
            <main className="dcd-main">
              <div className="dcd-missing">
                <Mountain aria-hidden="true" />
                <h1>Decollo non trovato</h1>
                <p>Il decollo «{id}» non è presente nella banca dati.</p>
                <Link to="/" className="dcd-cta is-primary"><ArrowLeft aria-hidden="true" /> Torna al meteo</Link>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  const area = site.province ? AREA_LABELS[site.province] : site.regione;
  const quota = site.elevation_m ?? site.altitude;
  const orient = site.orientation || site.exposure || "";
  const landing = site.landing;
  const rating = site.rating ?? null;

  return (
    <div className="flight-website-shell min-h-screen">
      <Header />
      <div className="flight-app-body is-single">
        <div className="flight-page-column">
          <main className="dcd-main app-main flight-page w-full min-w-0 mx-auto px-3 sm:px-4 xl:px-6 py-4 space-y-4">
            <nav className="dcd-topbar" aria-label="Navigazione">
              <Link to="/" className="dcd-back"><ArrowLeft size={15} aria-hidden="true" /> Torna al meteo</Link>
              <span className="dcd-crumb">{area ?? "Decollo"} · dettaglio</span>
            </nav>

            {/* HERO */}
            <section className={"dcd-hero" + (gallery.length ? "" : " dcd-hero--nophoto")}>
              {gallery[0] && (
                <img className="dcd-hero-img" src={gallery[0].url} alt={"Foto del decollo " + site.site_name} referrerPolicy="no-referrer" />
              )}
              <div className="dcd-hero-scrim" aria-hidden="true" />
              <div className="dcd-hero-inner">
                <p className="dcd-hero-kicker">
                  <MapPin size={12} aria-hidden="true" />
                  {site.location_name || site.valle || site.regione || "Località non indicata"}
                  {area && <span className="dcd-hero-area">{area}</span>}
                </p>
                <h1 className="dcd-hero-title">{site.site_name || site.name}</h1>
                <div className="dcd-hero-facts">
                  <span className="dcd-hero-chip"><Mountain size={13} aria-hidden="true" /> {quota.toLocaleString("it-IT")} m s.l.m.</span>
                  {orient && <span className="dcd-hero-chip"><Navigation size={13} aria-hidden="true" /> Esposizione {orient}</span>}
                  {rating != null && rating > 0 && (
                    <span className="dcd-hero-chip is-rating" title={espostaGiudizio(site)}>
                      <Star size={13} aria-hidden="true" /> {rating}/6 · {espostaGiudizio(site)}
                    </span>
                  )}
                  {site.frequenza && <span className="dcd-hero-chip"><Users size={13} aria-hidden="true" /> {site.frequenza}</span>}
                </div>
                <div className="dcd-hero-actions">
                  <Link to={"/?site=" + site.id} className="dcd-cta is-primary"><Wind aria-hidden="true" /> Apri il briefing meteo completo</Link>
                  <a
                    className="dcd-cta"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lon}`}
                    target="_blank" rel="noopener noreferrer"
                  ><Flag aria-hidden="true" /> Indicazioni stradali</a>
                </div>
              </div>
            </section>

            {/* DATI OPERATIVI */}
            <section className="dcd-section">
              <div className="dcd-section-head"><h2>Dati operativi</h2></div>
              <div className="dcd-factgrid">
                <div className="dcd-fact">
                  <span className="dcd-fact-icon"><Mountain aria-hidden="true" /></span>
                  <span className="dcd-fact-label">Quota decollo</span>
                  <span className="dcd-fact-value">{quota.toLocaleString("it-IT")} m</span>
                </div>
                <div className="dcd-fact">
                  <span className="dcd-fact-icon"><Navigation aria-hidden="true" /></span>
                  <span className="dcd-fact-label">Esposizione</span>
                  <span className="dcd-fact-value">{orient || "variabile"}</span>
                </div>
                <div className="dcd-fact">
                  <span className="dcd-fact-icon"><MapPin aria-hidden="true" /></span>
                  <span className="dcd-fact-label">Coordinate</span>
                  <span className="dcd-fact-value is-mono">{site.lat.toFixed(4)}, {site.lon.toFixed(4)}</span>
                </div>
                <div className="dcd-fact">
                  <span className="dcd-fact-icon"><Flag aria-hidden="true" /></span>
                  <span className="dcd-fact-label">Area</span>
                  <span className="dcd-fact-value">
                    {area ?? "—"}
                    {site.regione && area && site.regione.toLowerCase() !== area.toLowerCase() ? ` · ${site.regione}` : ""}
                    {!area && site.regione ? site.regione : ""}
                  </span>
                </div>
                <div className={"dcd-fact" + (landing ? "" : " is-missing")}>
                  <span className="dcd-fact-icon"><PlaneLanding aria-hidden="true" /></span>
                  <span className="dcd-fact-label">Atterraggio</span>
                  <span className="dcd-fact-value">
                    {landing ? (
                      <>
                        {landing.name}{landing.quota_m ? ` · ${landing.quota_m.toLocaleString("it-IT")} m` : ""}
                        {landing.distKm != null && <small> {landing.distKm} km dal decollo</small>}
                        {landing.quota_m && landing.quota_m < quota && <small> dislivello ~{(quota - landing.quota_m).toLocaleString("it-IT")} m</small>}
                      </>
                    ) : "da verificare in loco"}
                  </span>
                </div>
                <div className="dcd-fact">
                  <span className="dcd-fact-icon"><Layers aria-hidden="true" /></span>
                  <span className="dcd-fact-label">Fonte dati</span>
                  <span className="dcd-fact-value">{site.source ?? "ParaglidingSpots"}</span>
                </div>
              </div>
            </section>

            {/* DESCRIZIONE */}
            <section className="dcd-section">
              <div className="dcd-section-head"><h2>Descrizione del decollo</h2></div>
              <p className="dcd-desc">{site.descrizione ?? site.note ?? "Descrizione non disponibile: consulta le fonti locali."}</p>
              {site.description && (
                <details className="dcd-orig">
                  <summary>Testo originale della fonte (paraglidingspots.com)</summary>
                  <p>{site.description}</p>
                </details>
              )}
            </section>

            {/* GALLERIA */}
            {gallery.length > 1 && (
              <section className="dcd-section">
                <div className="dcd-section-head"><h2>Photo gallery</h2><small>{gallery.length} foto dalla fonte</small></div>
                <div className="dcd-gallery">
                  {gallery.slice(1, 7).map((p, i) => (
                    <a key={p.url} className="dcd-gallery-item" href={p.url} target="_blank" rel="noopener noreferrer">
                      <img src={p.url} alt={"Foto " + (i + 2) + " del decollo " + site.site_name} loading="lazy" referrerPolicy="no-referrer" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* SINTESI METEO */}
            <section className="dcd-section">
              <div className="dcd-section-head">
                <h2>Sintesi meteo a 3 giorni</h2>
                <small>Open-Meteo · modello grigliato sul punto decollo</small>
              </div>
              {meteoState === "loading" && <div className="dcd-meteo-state">Carico il modello meteo…</div>}
              {meteoState === "error" && <div className="dcd-meteo-state">Modello non disponibile: apri il briefing completo per il dettaglio orario.</div>}
              {meteoState === "ok" && meteo && (
                <>
                  <div className="dcd-now">
                    <span className="dcd-now-icon">{CODE_ICON[meteo.current.code ?? 3] ?? "☁"}</span>
                    <span className="dcd-now-temp">{meteo.current.temperature != null ? Math.round(meteo.current.temperature) + "°C" : "—"}</span>
                    <span className="dcd-now-wind">
                      <Wind size={13} aria-hidden="true" />
                      {meteo.current.windSpeed != null ? Math.round(meteo.current.windSpeed) + " km/h " + dirCardinale(meteo.current.windDir) : "vento N/D"}
                      {meteo.current.windGusts != null && <small> raffiche {Math.round(meteo.current.windGusts)}</small>}
                    </span>
                    <span className="dcd-now-live">ora corrente sul decollo</span>
                  </div>
                  <div className="dcd-days">
                    {meteo.days.map((g, i) => {
                      const v = verdictDay(g);
                      const label = new Date(g.date + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
                      return (
                        <div key={g.date} className={"dcd-day " + v.cls}>
                          <span className="dcd-day-name">{i === 0 ? "Oggi" : i === 1 ? "Domani" : label}</span>
                          <span className="dcd-day-temp">
                            {g.tMax != null ? Math.round(g.tMax) + "°" : "—"}
                            {g.tMin != null ? <small> / {Math.round(g.tMin)}°</small> : null}
                          </span>
                          <span className="dcd-day-wind">
                            <Wind size={11} aria-hidden="true" />
                            {g.wind != null ? Math.round(g.wind) : "—"} km/h {dirCardinale(g.dir)}
                            {g.gusts != null && <small> r.{Math.round(g.gusts)}</small>}
                          </span>
                          <span className="dcd-day-rain">{(g.rain ?? 0) > 0 ? (g.rain as number).toFixed(1) + " mm" : "asciutto"}</span>
                          <span className="dcd-day-verdict">{v.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="dcd-meteo-foot">
                <Link to={"/?site=" + site.id} className="dcd-cta is-primary is-small">
                  <Thermometer aria-hidden="true" /> Briefing completo: orari, windgram, termiche
                </Link>
              </div>
            </section>

            {/* WEBCAM */}
            <section className="dcd-section">
              <div className="dcd-section-head"><h2>Webcam e mappe</h2></div>
              <WebcamNearby siteId={site.id} siteName={site.site_name ?? site.name} latitude={site.lat} longitude={site.lon} compact />
              <div className="dcd-maplinks">
                <a href={`https://www.windy.com/?${site.lat},${site.lon},12`} target="_blank" rel="noopener noreferrer" className="dcd-cta is-small"><Camera aria-hidden="true" /> Windy al decollo</a>
                <a href={`https://www.openstreetmap.org/?mlat=${site.lat}&mlon=${site.lon}#map=14/${site.lat}/${site.lon}`} target="_blank" rel="noopener noreferrer" className="dcd-cta is-small"><MapPin aria-hidden="true" /> OpenStreetMap</a>
              </div>
            </section>

            {/* CREDITI */}
            <section className="dcd-credits">
              <span><Zap size={12} aria-hidden="true" /> Dati e foto: paraglidingspots.com{site.pspId ? ` (placemark #${site.pspId})` : ""} · quote OpenTopoData (EU-DEM) · geocodifica OpenStreetMap/Nominatim</span>
              {site.club?.name && <span>Club di riferimento: {site.club.name}</span>}
            </section>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
