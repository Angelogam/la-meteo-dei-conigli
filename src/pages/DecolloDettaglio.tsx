"use client";

/**
 * PAGINA DETTAGLIO DECOLLO — /decollo/:id
 * Layout personalizzato a sfondo chiaro (indipendente dal tema scuro del sito):
 * - hero con foto, dati chiave e rosa delle esposizioni;
 * - colonna contenuti (descrizione reale, dati operativi, sintesi meteo);
 * - colonna laterale con CARTINA Leaflet per arrivarci, CLUB con telefono
 *   (recapiti pubblici verificati) e box "come arrivare";
 * - isola scura webcam; crediti fonti.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Camera, Check, Copy, ExternalLink, Flag, Layers, Mail, MapPin,
  MessageCircle, Mountain, Navigation, Phone, PlaneLanding, Star, Thermometer,
  Users, Wind,
} from "lucide-react";
import { DECOLLO_MAP, AREA_LABELS, type Decollo } from "@/data/decolli";
import { clubContattoForName, clubPiuVicino } from "@/data/club-contatti";
import CartinaDecollo from "@/components/CartinaDecollo";
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

function toDMS(v: number, isLat: boolean): string {
  const dir = isLat ? (v >= 0 ? "N" : "S") : (v >= 0 ? "E" : "O");
  const abs = Math.abs(v);
  const d = Math.floor(abs);
  const mF = (abs - d) * 60;
  const m = Math.floor(mF);
  const s = Math.round((mF - m) * 60);
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}" ${dir}`;
}

const SETTORI: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSO: 202.5, SO: 225, SSW: 202.5, SW: 225, WSW: 247.5, O: 270, W: 270,
  WNW: 292.5, NO: 315, NW: 315, NNO: 337.5, NNW: 337.5,
};

/** Rosa delle esposizioni: evidenzia i quadranti aperti al decollo. */
function RosaEsposizione({ orient, size = 30 }: { orient: string; size?: number }) {
  const tokens = orient.split(/[/\s]+/).map((t) => t.trim().toUpperCase()).filter((t) => t in SETTORI);
  const active = new Set(tokens.map((t) => SETTORI[t]));
  const wedge = (center: number) => {
    const r = 15.5;
    const a1 = ((center - 22.5) * Math.PI) / 180;
    const a2 = ((center + 22.5) * Math.PI) / 180;
    const x1 = 18 + r * Math.sin(a1), y1 = 18 - r * Math.cos(a1);
    const x2 = 18 + r * Math.sin(a2), y2 = 18 - r * Math.cos(a2);
    return `M18 18 L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  };
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true" className="dxd-rose">
      {Array.from({ length: 8 }, (_, i) => i * 45).map((c) => (
        <path key={c} d={wedge(c)} className={active.has(c) ? "is-on" : ""} />
      ))}
      <circle cx="18" cy="18" r="2.1" className="dxd-rose-dot" />
    </svg>
  );
}

function telHref(tel: string): string {
  return "tel:" + tel.replace(/[^+\d]/g, "");
}
function waHref(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  const intl = digits.startsWith("39") ? digits : "39" + digits;
  return "https://wa.me/" + intl;
}

export default function DecolloDettaglio() {
  const { id } = useParams<{ id: string }>();
  const site = id ? DECOLLO_MAP[id] : undefined;

  const [meteo, setMeteo] = useState<MiniMeteo | null>(null);
  const [meteoState, setMeteoState] = useState<"loading" | "ok" | "error">("loading");
  const [copied, setCopied] = useState(false);
  const [heroFail, setHeroFail] = useState<Set<string>>(new Set());

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

  const copyCoords = () => {
    if (!site) return;
    const text = `${site.lat.toFixed(5)}, ${site.lon.toFixed(5)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }).catch(() => {});
    }
  };

  if (!site) {
    return (
      <div className="dxd-page min-h-screen">
        <div className="dxd-main">
          <div className="dxd-missing">
            <Mountain aria-hidden="true" />
            <h1>Decollo non trovato</h1>
            <p>Il decollo «{id}» non è presente nella banca dati.</p>
            <Link to="/" className="dxd-btn is-primary"><ArrowLeft aria-hidden="true" /> Torna al meteo</Link>
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
  const origDesc = (site.description ?? "").trim();

  // club: contatti verificati dal registro, con fallback «club più vicino»
  const contatto = clubContattoForName(site.club?.name);
  const clubName = contatto?.name ?? site.club?.name;
  const clubUrl = contatto?.url ?? site.club?.url;
  const vicino = !site.club && !contatto ? clubPiuVicino(site.lat, site.lon) : undefined;

  const heroImgUrl = gallery[0]?.url;
  const heroImg = heroImgUrl && !heroFail.has(heroImgUrl) ? heroImgUrl : undefined;
  const quotaTxt = quota != null ? quota.toLocaleString("it-IT") + " m s.l.m." : "quota N/D";

  return (
    <div className="dxd-page min-h-screen">
      {/* HEADER CHIARO PERSONALIZZATO */}
      <header className="dxd-header">
        <Link to="/" className="dxd-brand">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 19 L10 6 L14 13 L16 10 L21 19 Z" fill="currentColor" opacity=".9" /></svg>
          La Meteo dei Conigli
        </Link>
        <nav className="dxd-header-nav" aria-label="Navigazione sito">
          <Link to="/" className="dxd-header-link">Briefing meteo</Link>
          <Link to="/termiche" className="dxd-header-link is-secondary">Cartina termiche</Link>
        </nav>
      </header>

      <main className="dxd-main">
        <nav className="dxd-topbar" aria-label="Navigazione">
          <Link to="/" className="dxd-back"><ArrowLeft size={15} aria-hidden="true" /> Torna al meteo</Link>
          <span className="dxd-crumb">{area ?? "Decollo"} · dettaglio</span>
        </nav>

        {/* HERO */}
        <section className={"dxd-hero" + (heroImg ? " has-photo" : "")}>
          {heroImg && (
            <img className="dxd-hero-img" src={heroImg} alt={"Foto del decollo " + (site.site_name || site.name)} referrerPolicy="no-referrer" onError={() => setHeroFail((prev) => new Set(prev).add(heroImg))} />
          )}
          {!heroImg && (
            <svg className="dxd-hero-art" viewBox="0 0 600 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <path d="M0 300 L90 170 L150 240 L230 120 L320 300 Z" fill="#0e7a5f" opacity=".08" />
              <path d="M180 300 L300 90 L380 210 L440 150 L560 300 Z" fill="#0e7a5f" opacity=".12" />
              <path d="M420 300 L500 180 L600 260 L600 300 Z" fill="#12a37c" opacity=".10" />
            </svg>
          )}
          <div className="dxd-hero-inner">
            <p className="dxd-hero-kicker">
              <MapPin size={13} aria-hidden="true" />
              {site.location_name || site.valle || site.regione || "Località non indicata"}
              {area && <span className="dxd-hero-area">{area}</span>}
            </p>
            <h1 className="dxd-hero-title">{site.site_name || site.name}</h1>
            <div className="dxd-hero-facts">
              <span className="dxd-hero-chip"><Mountain size={13} aria-hidden="true" /> {quotaTxt}</span>
              {orient && (
                <span className="dxd-hero-chip is-rose" title={"Esposizione " + orient}>
                  <RosaEsposizione orient={orient} size={22} />
                  Esposizione {orient}
                </span>
              )}
              {rating != null && rating > 0 && (
                <span className="dxd-hero-chip is-rating" title={espostaGiudizio(site)}>
                  <Star size={13} aria-hidden="true" /> {rating}/6 · {espostaGiudizio(site)}
                </span>
              )}
              {site.frequenza && <span className="dxd-hero-chip"><Users size={13} aria-hidden="true" /> {site.frequenza}</span>}
            </div>
            <div className="dxd-hero-actions">
              <Link to={"/?site=" + site.id} className="dxd-btn is-primary"><Wind aria-hidden="true" /> Briefing meteo completo</Link>
              <a
                className="dxd-btn"
                href={`https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lon}`}
                target="_blank" rel="noopener noreferrer"
              ><Flag aria-hidden="true" /> Indicazioni stradali</a>
            </div>
          </div>
        </section>

        <div className="dxd-layout">
          {/* ------- COLONNA CONTENUTI ------- */}
          <div className="dxd-content">
            {/* DESCRIZIONE */}
            <section className="dxd-card">
              <div className="dxd-card-head"><h2>Il decollo</h2></div>
              <p className="dxd-desc">{site.descrizione ?? site.note ?? "Descrizione non disponibile: consulta le fonti locali."}</p>
              {origDesc && (
                <details className="dxd-orig">
                  <summary>Testo originale della fonte (paraglidingspots.com)</summary>
                  <p>«{origDesc}»</p>
                </details>
              )}
              {gallery.length > 1 && (
                <div className="dxd-gallery">
                  {gallery.slice(1, 7).map((p, i) => (
                    <a key={p.url} className="dxd-gallery-item" href={p.url} target="_blank" rel="noopener noreferrer">
                      <img src={p.url} alt={"Foto " + (i + 2) + " del decollo " + (site.site_name || site.name)} loading="lazy" referrerPolicy="no-referrer" />
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* DATI OPERATIVI */}
            <section className="dxd-card">
              <div className="dxd-card-head"><h2>Dati operativi</h2><small>fonte: {site.source ?? "ParaglidingSpots"}</small></div>
              <div className="dxd-factgrid">
                <div className="dxd-fact">
                  <span className="dxd-fact-icon"><Mountain aria-hidden="true" /></span>
                  <span className="dxd-fact-label">Quota decollo</span>
                  <span className="dxd-fact-value">{quota != null ? quota.toLocaleString("it-IT") + " m" : "N/D"}</span>
                </div>
                <div className="dxd-fact">
                  <span className="dxd-fact-icon"><Navigation aria-hidden="true" /></span>
                  <span className="dxd-fact-label">Esposizione</span>
                  <span className="dxd-fact-value is-flex">{orient ? <RosaEsposizione orient={orient} size={26} /> : null}{orient || "variabile"}</span>
                </div>
                <div className="dxd-fact">
                  <span className="dxd-fact-icon"><Flag aria-hidden="true" /></span>
                  <span className="dxd-fact-label">Area</span>
                  <span className="dxd-fact-value">
                    {area ?? "—"}
                    {site.regione && area && site.regione.toLowerCase() !== area.toLowerCase() ? ` · ${site.regione}` : ""}
                    {!area && site.regione ? site.regione : ""}
                  </span>
                </div>
                <div className={"dxd-fact" + (landing ? "" : " is-missing")}>
                  <span className="dxd-fact-icon"><PlaneLanding aria-hidden="true" /></span>
                  <span className="dxd-fact-label">Atterraggio</span>
                  <span className="dxd-fact-value">
                    {landing ? (
                      <>
                        {landing.name}{landing.quota_m ? ` · ${landing.quota_m.toLocaleString("it-IT")} m` : ""}
                        {landing.distKm != null && <small> {landing.distKm} km dal decollo</small>}
                        {landing.quota_m && quota != null && landing.quota_m < quota && <small> dislivello ~{(quota - landing.quota_m).toLocaleString("it-IT")} m</small>}
                      </>
                    ) : "da verificare in loco"}
                  </span>
                </div>
                <div className="dxd-fact">
                  <span className="dxd-fact-icon"><MapPin aria-hidden="true" /></span>
                  <span className="dxd-fact-label">Coordinate decollo</span>
                  <span className="dxd-fact-value is-mono">{site.lat.toFixed(4)}, {site.lon.toFixed(4)}</span>
                </div>
                <div className="dxd-fact">
                  <span className="dxd-fact-icon"><Layers aria-hidden="true" /></span>
                  <span className="dxd-fact-label">Fonte dati</span>
                  <span className="dxd-fact-value">{site.source ?? "ParaglidingSpots"}</span>
                </div>
              </div>
            </section>

            {/* SINTESI METEO */}
            <section className="dxd-card">
              <div className="dxd-card-head">
                <h2>Sintesi meteo a 3 giorni</h2>
                <small>Open-Meteo · modello grigliato sul punto decollo</small>
              </div>
              {meteoState === "loading" && <div className="dxd-meteo-state">Carico il modello meteo…</div>}
              {meteoState === "error" && <div className="dxd-meteo-state">Modello non disponibile: apri il briefing completo per il dettaglio orario.</div>}
              {meteoState === "ok" && meteo && (
                <>
                  <div className="dxd-now">
                    <span className="dxd-now-icon">{CODE_ICON[meteo.current.code ?? 3] ?? "☁"}</span>
                    <span className="dxd-now-temp">{meteo.current.temperature != null ? Math.round(meteo.current.temperature) + "°C" : "—"}</span>
                    <span className="dxd-now-wind">
                      <Wind size={13} aria-hidden="true" />
                      {meteo.current.windSpeed != null ? Math.round(meteo.current.windSpeed) + " km/h " + dirCardinale(meteo.current.windDir) : "vento N/D"}
                      {meteo.current.windGusts != null && <small> raffiche {Math.round(meteo.current.windGusts)}</small>}
                    </span>
                    <span className="dxd-now-live">ora corrente sul decollo</span>
                  </div>
                  <div className="dxd-days">
                    {meteo.days.map((g, i) => {
                      const v = verdictDay(g);
                      const label = new Date(g.date + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
                      return (
                        <div key={g.date} className={"dxd-day " + v.cls}>
                          <span className="dxd-day-name">{i === 0 ? "Oggi" : i === 1 ? "Domani" : label}</span>
                          <span className="dxd-day-temp">
                            {g.tMax != null ? Math.round(g.tMax) + "°" : "—"}
                            {g.tMin != null ? <small> / {Math.round(g.tMin)}°</small> : null}
                          </span>
                          <span className="dxd-day-wind">
                            <Wind size={11} aria-hidden="true" />
                            {g.wind != null ? Math.round(g.wind) : "—"} km/h {dirCardinale(g.dir)}
                            {g.gusts != null && <small> r.{Math.round(g.gusts)}</small>}
                          </span>
                          <span className="dxd-day-rain">{(g.rain ?? 0) > 0 ? (g.rain as number).toFixed(1) + " mm" : "asciutto"}</span>
                          <span className="dxd-day-verdict">{v.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="dxd-meteo-foot">
                <Link to={"/?site=" + site.id} className="dxd-btn is-primary is-small">
                  <Thermometer aria-hidden="true" /> Briefing completo: orari, windgram, termiche
                </Link>
              </div>
            </section>

            {/* WEBCAM — isola scura (componente nativo scuro) */}
            <section className="dxd-dark">
              <div className="dxd-dark-head">
                <h2><Camera size={16} aria-hidden="true" /> Webcam della zona</h2>
                <a href={`https://www.windy.com/?${site.lat},${site.lon},12`} target="_blank" rel="noopener noreferrer" className="dxd-dark-link">
                  Windy al decollo <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
              <WebcamNearby siteId={site.id} siteName={site.site_name ?? site.name} latitude={site.lat} longitude={site.lon} compact />
            </section>
          </div>

          {/* ------- COLONNA LATERALE ------- */}
          <aside className="dxd-rail">
            {/* CARTINA */}
            <section className="dxd-card">
              <div className="dxd-card-head"><h2>Cartina per arrivarci</h2></div>
              <CartinaDecollo
                lat={site.lat}
                lon={site.lon}
                name={site.site_name || site.name}
                landing={landing ? { name: landing.name, lat: landing.lat, lon: landing.lon, quota_m: landing.quota_m } : null}
              />
              <div className="dxd-btnrow">
                <a
                  className="dxd-btn is-primary is-small"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lon}`}
                  target="_blank" rel="noopener noreferrer"
                ><Flag aria-hidden="true" /> Indicazioni stradali</a>
                <a
                  className="dxd-btn is-small"
                  href={`https://www.openstreetmap.org/?mlat=${site.lat}&mlon=${site.lon}#map=14/${site.lat}/${site.lon}`}
                  target="_blank" rel="noopener noreferrer"
                ><MapPin aria-hidden="true" /> OpenStreetMap</a>
              </div>
            </section>

            {/* CLUB */}
            <section className="dxd-card is-club">
              <div className="dxd-card-head"><h2>Club di riferimento</h2><Users size={15} aria-hidden="true" className="dxd-head-ico" /></div>
              {clubName ? (
                <>
                  <p className="dxd-club-name">{clubName}</p>
                  {contatto && <p className="dxd-club-zona">{contatto.zona}</p>}
                  <div className="dxd-club-actions">
                    {(contatto?.tel || site.club?.tel) && (
                      <a className="dxd-btn is-primary" href={telHref(contatto?.tel ?? site.club?.tel ?? "")}>
                        <Phone aria-hidden="true" /> {contatto?.tel ?? site.club?.tel}
                      </a>
                    )}
                    {(contatto?.tel2 || site.club?.tel2) && (
                      <a className="dxd-btn" href={telHref(contatto?.tel2 ?? site.club?.tel2 ?? "")}>
                        <Phone aria-hidden="true" /> {contatto?.tel2 ?? site.club?.tel2}
                        {(contatto?.tel2Label ?? site.club?.tel2Label) && <em>{contatto?.tel2Label ?? site.club?.tel2Label}</em>}
                      </a>
                    )}
                    {(contatto?.whatsapp || site.club?.whatsapp) && (
                      <a className="dxd-btn is-whatsapp" href={waHref(contatto?.whatsapp ?? site.club?.whatsapp ?? "")} target="_blank" rel="noopener noreferrer">
                        <MessageCircle aria-hidden="true" /> WhatsApp
                      </a>
                    )}
                    {(contatto?.email || site.club?.email) && (
                      <a className="dxd-btn" href={"mailto:" + (contatto?.email ?? site.club?.email)}>
                        <Mail aria-hidden="true" /> Email
                      </a>
                    )}
                    {clubUrl && (
                      <a className="dxd-btn" href={clubUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink aria-hidden="true" /> Sito del club
                      </a>
                    )}
                  </div>
                  {contatto && <p className="dxd-club-fonte">Recapiti pubblici verificati: {contatto.fonte}</p>}
                </>
              ) : vicino ? (
                <>
                  <p className="dxd-club-note">Nessun club ufficiale mappato per questo decollo: il club con contatti pubblici più vicino è</p>
                  <p className="dxd-club-name">{vicino.club.name}</p>
                  <p className="dxd-club-zona">{vicino.club.zona} · ~{Math.round(vicino.distKm)} km in linea d'aria</p>
                  <div className="dxd-club-actions">
                    {vicino.club.tel && <a className="dxd-btn is-primary" href={telHref(vicino.club.tel)}><Phone aria-hidden="true" /> {vicino.club.tel}</a>}
                    {vicino.club.whatsapp && <a className="dxd-btn is-whatsapp" href={waHref(vicino.club.whatsapp)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> WhatsApp</a>}
                    {vicino.club.url && <a className="dxd-btn" href={vicino.club.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> Sito del club</a>}
                  </div>
                  <p className="dxd-club-fonte">Recapiti pubblici verificati: {vicino.club.fonte}</p>
                </>
              ) : (
                <p className="dxd-club-note">
                  Nessun club con contatti pubblici noto per questo decollo: prima del volo informati presso una scuola di volo locale o la federazione della zona.
                </p>
              )}
            </section>

            {/* COME ARRIVARE */}
            <section className="dxd-card">
              <div className="dxd-card-head"><h2>Come arrivare</h2></div>
              <div className="dxd-coord">
                <span className="dxd-coord-label">Coordinate decimali</span>
                <span className="dxd-coord-value is-mono">{site.lat.toFixed(5)}, {site.lon.toFixed(5)}</span>
                <button type="button" className="dxd-copy" onClick={copyCoords} aria-label="Copia le coordinate">
                  {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                  {copied ? "Copiato!" : "Copia"}
                </button>
              </div>
              <div className="dxd-coord">
                <span className="dxd-coord-label">Gradi-minuti-secondi</span>
                <span className="dxd-coord-value is-mono">{toDMS(site.lat, true)} · {toDMS(site.lon, false)}</span>
              </div>
              {landing && Number.isFinite(landing.lat) && (
                <div className="dxd-coord">
                  <span className="dxd-coord-label">Atterraggio · {landing.name}</span>
                  <span className="dxd-coord-value is-mono">{landing.lat.toFixed(5)}, {landing.lon.toFixed(5)}</span>
                </div>
              )}
              <p className="dxd-hint">
                L'ultimo tratto è spesso una pista rurale: usa la cartina per il punto esatto e chiedi in locale l'accesso consentito.
              </p>
            </section>
          </aside>
        </div>

        {/* CREDITI */}
        <footer className="dxd-credits">
          <span>Dati e foto: paraglidingspots.com{site.pspId ? ` (placemark #${site.pspId})` : ""} · quote OpenTopoData (EU-DEM) · geocodifica OpenStreetMap/Nominatim · cartina Leaflet + tile OpenStreetMap/OpenTopoMap</span>
          <span>La Meteo dei Conigli · volo libero in Italia e Alpi</span>
        </footer>
      </main>
    </div>
  );
}
