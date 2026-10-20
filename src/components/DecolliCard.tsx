"use client";

import React, { useMemo, useState } from "react";
import { Clock, Layers, AlertTriangle, Sun, Cloud, CloudRain, CloudSnow, Zap, Info, Search, MapPin, Thermometer, Wind, ArrowRight, Star } from "lucide-react";
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

// Immagini hero per i decolli (montagna / parapendio da Unsplash)
const HERO_IMAGES: Record<string, string> = {
  "Malanotte": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&h=140&fit=crop&q=80",
  "Colle di Tenda": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=140&fit=crop&q=80",
  "Boves": "https://images.unsplash.com/photo-1464822759023-fed622ff2c8b?w=200&h=140&fit=crop&q=80",
  "Monte Male": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&h=140&fit=crop&q=80",
  "Iretta": "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda29?w=200&h=140&fit=crop&q=80",
  "Pratoni di Val Mala": "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=200&h=140&fit=crop&q=80",
  "Monte Birrone": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200&h=140&fit=crop&q=80",
  "Colle dell'Agnello": "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=200&h=140&fit=crop&q=80",
  "Pian Munè": "https://images.unsplash.com/photo-1485594050903-8e8ee5322c03?w=200&h=140&fit=crop&q=80",
  "Martiniana Po": "https://images.unsplash.com/photo-1491555103944-8c2a772256e7?w=200&h=140&fit=crop&q=80",
  "Rucas Alto": "https://images.unsplash.com/photo-1465056836900-8f1e940b3fc9?w=200&h=140&fit=crop&q=80",
  "Montoso": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&h=140&fit=crop&q=80",
  "Monte Vandalino": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=140&fit=crop&q=80",
  "Pian dell'Alpe": "https://images.unsplash.com/photo-1500534623283-312a7ada7f2e?w=200&h=140&fit=crop&q=80",
  "Roletto": "https://images.unsplash.com/photo-1470071459604-3b5e3267c02b?w=200&h=140&fit=crop&q=80",
  "Piossasco": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=140&fit=crop&q=80",
  "Truccetti": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=140&fit=crop&q=80",
  "Val della Torre": "https://images.unsplash.com/photo-1446329813274-7c9036bd9a1f?w=200&h=140&fit=crop&q=80",
  "Rocca Canavese": "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=200&h=140&fit=crop&q=80",
  "Santa Elisabetta": "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=200&h=140&fit=crop&q=80",
  "Monte Cavallaria": "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=200&h=140&fit=crop&q=80",
  "Andrate": "https://images.unsplash.com/photo-1464822759023-fed622ff2c8b?w=200&h=140&fit=crop&q=80",
};

function getHeroImage(name: string): string {
  const key = Object.keys(HERO_IMAGES).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? HERO_IMAGES[key] : "https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&h=140&fit=crop&q=80";
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
          const rain = numberOrNull(weather?.rain);
          const cloud = numberOrNull(weather?.cloud);
          const freezingLevel = numberOrNull(weather?.freezingLevel);
          const estimatedFreezingLevel = freezingLevel ?? (temp !== null ? Math.round(item.elevation_m + temp * 125) : null);
          return (
            <button
              type="button"
              role="listitem"
              key={item.id}
              onClick={() => onSelect(item)}
              aria-pressed={selected}
              className={"launch-compare-row" + (selected ? " is-selected" : "")}
            >
              {/* Thumbnail immagine */}
              <div className="launch-compare-thumb">
                <img src={getHeroImage(item.site_name || item.name)} alt={item.site_name || item.name} loading="lazy" />
                {selected && <span className="launch-compare-thumb-dot" aria-hidden="true" />}
              </div>
              {/* Info principale */}
              <div className="launch-compare-info">
                <div className="launch-compare-info-top">
                  <span className="launch-compare-name">{item.site_name || item.name}</span>
                  <span className="launch-compare-altitude">{item.elevation_m || item.altitude} m s.l.m.</span>
                </div>
                <div className="launch-compare-metrics">
                  <span className="launch-compare-metric" title="Pioggia">
                    <CloudRain size={11} aria-hidden="true" />
                    <span>{rain === null ? "—" : rain.toFixed(1)} mm</span>
                  </span>
                  <span className="launch-compare-metric" title="Nuvolosità">
                    <Cloud size={11} aria-hidden="true" />
                    <span>{cloud === null ? "—" : Math.round(cloud) + " %"}</span>
                  </span>
                  <span className="launch-compare-metric" title="Zero termico">
                    <Thermometer size={11} aria-hidden="true" />
                    <span>{estimatedFreezingLevel === null ? "—" : estimatedFreezingLevel + " m"}</span>
                  </span>
                </div>
              </div>
              {/* Freccia + stella */}
              <div className="launch-compare-actions">
                <button type="button" className="launch-compare-star" aria-label="Aggiungi ai preferiti">
                  <Star size={14} aria-hidden="true" />
                </button>
                <ArrowRight size={15} className="launch-compare-arrow" aria-hidden="true" />
              </div>
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
