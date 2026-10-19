"use client";

import React, { useMemo, useState } from "react";
import { Clock, Layers, AlertTriangle, Sun, Cloud, CloudRain, Zap, Info, Search, MapPin } from "lucide-react";
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
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export default function DecolliCard({
  decolli, selectedId, onSelect, selectedDay = 0, isUpdating = false, error,
}: DecolliCardProps) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const dt = getDateTime(selectedDay);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("it-IT");
    return decolli.filter((item) => !q || [
      item.site_name, item.location_name, item.orientation, item.elevation_m,
    ].some((value) => String(value ?? "").toLocaleLowerCase("it-IT").includes(q)));
  }, [decolli, query]);
  const visible = showAll || query.trim() ? filtered : filtered.slice(0, 6);
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
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca decollo, valle o esposizione…" aria-label="Cerca un decollo" />
        </label>
        <span className="launch-compare-update"><Clock aria-hidden="true" size={13} />{dt.date}{isUpdating ? " · aggiornamento…" : " · aggiornamento periodico"}</span>
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
          const status = getStatoDisplay(weather?.stato);
          const base = weather?.baseNubi;
          return (
            <button
              type="button"
              role="listitem"
              key={item.id}
              onClick={() => onSelect(item)}
              aria-pressed={selected}
              className={"launch-compare-row" + (selected ? " is-selected" : "")}
            >
              <span className="launch-compare-site">
                <span className="launch-compare-site-name">{item.site_name || item.name}</span>
                <span className="launch-compare-site-meta"><MapPin size={12} aria-hidden="true" />{item.location_name || item.valley} <span>·</span> {item.orientation || item.exposure} <span>·</span> {item.elevation_m || item.altitude} m</span>
              </span>
              <span className="launch-compare-weather">
                <span className="launch-compare-condition">{status.icon}<span>{status.label}</span></span>
                <strong className="launch-compare-wind">{wind === null ? "—" : wind.toFixed(0) + " km/h"}</strong>
                <span className="launch-compare-direction">{direction === null ? "—" : getCardinalDir(direction)}</span>
                <span className="launch-compare-temp">{temp === null ? "—" : temp.toFixed(0) + "°"}</span>
                <span className="launch-compare-base" title="Base nubi stimata"><Layers size={12} aria-hidden="true" />{base || "—"}</span>
                {index !== null && <span className={"launch-compare-index " + (index >= 8 ? "is-high" : index >= 5 ? "is-mid" : "is-low")} title="Indice sintetico indicativo">{index}/10</span>}
              </span>
              {selected && <span className="launch-compare-selected">Selezionato</span>}
            </button>
          );
        })}
        {!visible.length && <p className="launch-compare-empty">Nessun decollo corrisponde alla ricerca.</p>}
      </div>
      {!query.trim() && filtered.length > 6 && (
        <button type="button" className="launch-compare-toggle" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Mostra meno" : "Mostra tutti i " + filtered.length + " decolli"}
        </button>
      )}
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
