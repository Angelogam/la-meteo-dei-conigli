"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Clock, Layers, AlertTriangle, Sun, Cloud, CloudRain, CloudSnow, Zap, Info, Search, MapPin, Thermometer, Wind } from "lucide-react";
import type { Decollo } from "@/data/decolli";

export interface AggressiveWeatherData {
  temp: string | number;
  rain: string | number;
  cloud: string | number;
  wind: string | number;
  dir: string | number;
  stato: string;
  baseNubi: string;
  termiche: string;
  indice: number | null;
  indiceLabel: string;
  freezingLevel?: number | null;
  weatherCode?: number | null;
  fonte: string;
}

interface DecolliCardProps {
  decolli: (Decollo & { aggressiveWeather?: AggressiveWeatherData | null })[];
  selectedId: string;
  onSelect: (item: Decollo) => void;
  selectedDay?: number;
  isUpdating?: boolean;
  error?: string | null;
}

const ICONA_STATO: Record<string, React.ReactNode> = {
  sereno: <Sun className="h-4 w-4 text-amber-400" />,
  variabile: <Cloud className="h-4 w-4 text-amber-300" />,
  nuvoloso: <Cloud className="h-4 w-4 text-slate-400" />,
  pioggia: <CloudRain className="h-4 w-4 text-blue-400" />,
  temporale: <Zap className="h-4 w-4 text-purple-400" />,
  coperto: <Cloud className="h-4 w-4 text-slate-400" />,
  neve: <CloudSnow className="h-4 w-4 text-sky-200" />,
  offline: <AlertTriangle className="h-4 w-4 text-slate-500" />,
  "n/d": <Info className="h-4 w-4 text-slate-400" />,
  errore: <AlertTriangle className="h-4 w-4 text-red-400" />,
};

function numberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "" || value === "N/D" || value === "--") return null;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function getStatoDisplay(stato?: string | null) {
  if (!stato) return { icon: ICONA_STATO["n/d"], label: "N/D" };
  const key = stato.toLowerCase().trim();
  if (key === "error") return { icon: ICONA_STATO.errore, label: "Errore" };
  return { icon: ICONA_STATO[key] ?? ICONA_STATO.offline, label: stato };
}

function getCardinalDir(deg: number): string {
  return ["Nord", "Nord-Nord Est", "Nord Est", "Est-Nord Est", "Est", "Est-Sud Est", "Sud Est", "Sud-Sud Est", "Sud", "Sud-Sud Ovest", "Sud Ovest", "Ovest-Sud Ovest", "Ovest", "Ovest-Nord Ovest", "Nord Ovest", "Nord-Nord Ovest"][Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

function getWeatherStatus(weather: AggressiveWeatherData | null | undefined) {
  const code = weather?.weatherCode;
  if (code !== null && code !== undefined) {
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: ICONA_STATO.neve, label: "Neve" };
    if ([95, 96, 99].includes(code)) return { icon: ICONA_STATO.temporale, label: "Temporale" };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: ICONA_STATO.pioggia, label: "Pioggia" };
    if ([0, 1].includes(code)) return { icon: ICONA_STATO.sereno, label: "Sereno" };
    if (code === 2) return { icon: ICONA_STATO.variabile, label: "Parzialmente nuvoloso" };
    if (code === 3) return { icon: ICONA_STATO.coperto, label: "Coperto" };
  }
  return getStatoDisplay(weather?.stato);
}

function LaunchPhoto({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const [photo, setPhoto] = useState<{ url: string; title: string; page: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { let cancelled = false; if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const params = new URLSearchParams({ action: 'query', generator: 'geosearch', ggscoord: lat + '|' + lon, ggsradius: '5000', ggsnamespace: '6', ggslimit: '10', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '420', format: 'json', origin: '*' });
    fetch('https://commons.wikimedia.org/w/api.php?' + params.toString()).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => { const pages = Object.values(data && data.query && data.query.pages || {}) as any[]; const match = pages.find((p) => p && (p.thumbnail && p.thumbnail.source || p.imageinfo && p.imageinfo[0] && (p.imageinfo[0].thumburl || p.imageinfo[0].url))); if (!cancelled && match) { const info = match.imageinfo && match.imageinfo[0] || {}; setPhoto({ url: match.thumbnail && match.thumbnail.source || info.thumburl || info.url, title: String(info.extmetadata && info.extmetadata.ObjectName && info.extmetadata.ObjectName.value || match.title || name).replace(/<[^>]*>/g, ''), page: info.descriptionurl || 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(String(match.title || '').replace(/ /g, '_')) }); } }).catch(() => {}).finally(() => { if (!cancelled) setLoaded(true); }); return () => { cancelled = true; }; }, [lat, lon, name]);
  if (!photo) return <div className="launch-photo-fallback" aria-label={'Foto non disponibile per ' + name}><MapPin size={21} aria-hidden="true" /><span>{loaded ? 'Foto non trovata vicino al GPS' : 'Cerco foto vicino al GPS…'}</span></div>;
  return <a className="launch-photo-link" href={photo.page} target="_blank" rel="noreferrer" title={'Apri la foto originale: ' + photo.title} onClick={(event) => event.stopPropagation()}><img className="launch-photo-image" src={photo.url} alt={'Paesaggio vicino al decollo ' + name} loading="lazy" /><span className="launch-photo-credit">Wikimedia Commons</span></a>;
}

export default function DecolliCard({
  decolli, selectedId, onSelect, selectedDay = 0, isUpdating = false, error,
}: DecolliCardProps) {
  const [query, setQuery] = useState("");
  const dt = getDateTime(selectedDay);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("it-IT");
    return decolli.filter((item) => !q || [
      item.site_name, item.location_name, item.orientation, item.elevation_m,
    ].some((value) => String(value ?? "").toLocaleLowerCase("it-IT").includes(q)));
  }, [decolli, query]);
  const visible = filtered;
  const loadedCount = decolli.filter((d) => {
    const status = d.aggressiveWeather?.stato?.toLowerCase();
    return status && !["offline", "errore", "n/d"].includes(status);
  }).length;

  return (
    <section className="launch-list-card launch-compare-panel" aria-labelledby="launch-list-title">
      <header className="launch-compare-header">
        <div>
          <p className="launch-compare-kicker">SITI MONITORATI</p>
          <h2 id="launch-list-title">Confronta i decolli</h2>
          <p className="launch-compare-description">Scegli un sito per aggiornare mappa e previsioni. Il confronto è sintetico, non è un giudizio di sicurezza.</p>
        </div>
        <div className="launch-compare-count">
          <strong>{decolli.length}</strong><span>decolli</span>
          <small>{loadedCount} con dati</small>
        </div>
      </header>

      <div className="launch-compare-tools">
        <label className="launch-compare-search">
          <Search aria-hidden="true" size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca decollo, valle o esposizione…" aria-label="Cerca un decollo" />
        </label>
        <span className="launch-compare-update"><Clock aria-hidden="true" size={11} />{dt.date}</span>
      </div>
      {error && <p className="launch-compare-message is-error">{error}</p>}
      {!loadedCount && !isUpdating && <p className="launch-compare-message">I dati comparativi di alcuni siti non sono disponibili in questo momento; le previsioni del sito selezionato restano separate.</p>}

      <div className="launch-compare-rows" role="list" aria-label="Elenco dei decolli">
        {visible.map((item) => {
          const selected = item.id === selectedId;
          const weather = item.aggressiveWeather;
          const wind = numberOrNull(weather?.wind);
          const temp = numberOrNull(weather?.temp);
          const direction = numberOrNull(weather?.dir);
          const index = numberOrNull(weather?.indice);
          const status = getWeatherStatus(weather);
          const base = weather?.baseNubi;
          const freezingLevel = numberOrNull(weather?.freezingLevel);
          const rain = numberOrNull(weather?.rain);
          const cloud = numberOrNull(weather?.cloud);
          return (
            <button
              type="button"
              role="listitem"
              key={item.id}
              onClick={() => onSelect(item)}
              aria-pressed={selected}
              className={"launch-compare-row" + (selected ? " is-selected" : "")}
            >
              <div className="launch-compare-photo-head"><LaunchPhoto lat={item.lat} lon={item.lon} name={item.site_name || item.name} /><div className="launch-compare-site-header"><span className="launch-compare-site-name">{item.site_name || item.name}</span><span className="launch-compare-site-meta"><MapPin size={12} aria-hidden="true" />{item.location_name || item.valley} · <strong>{item.elevation_m || item.altitude} m s.l.m.</strong></span><span className="launch-compare-site-orientation">Esposizione {item.orientation || item.exposure || "N/D"}</span></div></div>
              <div className="launch-compare-weather-grid">
                <div className="launch-compare-weather-item launch-compare-condition">
                  <span className="launch-compare-icon">{status.icon}</span>
                  <span className="launch-compare-label">{status.label}</span>
                </div>
                <div className="launch-compare-weather-item launch-compare-metric" title="Temperatura attuale">
                  <Thermometer size={9} aria-hidden="true" />
                  <span>{temp === null ? "—" : temp.toFixed(0) + "°"}</span>
                </div>
                <div className="launch-compare-weather-item launch-compare-metric" title="Zero termico">
                  <span aria-hidden="true">❄️</span>
                  <span>{estimatedFreezingLevel === null ? "—" : estimatedFreezingLevel + "m"}</span>
                </div>
                <div className="launch-compare-weather-item launch-compare-wind" title="Velocità del vento">
                  <Wind size={9} aria-hidden="true" />
                  <span>{wind === null ? "—" : wind.toFixed(0) + "k"}</span>
                </div>
                <div className="launch-compare-weather-item launch-compare-direction" title="Direzione del vento">
                  {direction === null ? "—" : getCardinalDir(direction)}
                </div>
                <div className="launch-compare-weather-item launch-compare-base" title="Base nubi">
                  <Layers size={9} aria-hidden="true" />
                  <span>{base || "—"}</span>
                </div>
              </div>
              {index !== null && <span className={"launch-compare-index " + (index >= 8 ? "is-high" : index >= 5 ? "is-mid" : "is-low")} title="Indice sintetico indicativo">{index}/10</span>}
              {selected && <span className="launch-compare-selected">✓</span>}
            </button>
          );
        })}
        {!visible.length && <p className="launch-compare-empty">Nessun decollo corrisponde alla ricerca.</p>}
      </div>
    </section>
  );
}

function getDateTime(selectedDay: number): { date: string; ora: string } {
  const today = new Date();
  const target = new Date(today);
  target.setDate(today.getDate() + selectedDay);
  const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return { date: giorni[target.getDay()] + " " + target.getDate() + " " + mesi[target.getMonth()], ora: today.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) };
}
