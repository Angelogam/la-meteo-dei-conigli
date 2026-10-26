"use client";

import React, { useMemo, useState } from "react";
import { Clock, Cloud, CloudRain, CloudSnow, Flame, Info, Layers, MapPin, Navigation, Search, Snowflake, Sun, Thermometer, Wind, Zap, AlertTriangle } from "lucide-react";
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

function getIndexClass(index: number): string {
  // Indice inverso: valori bassi = condizioni migliori (2 = "Perfetto").
  return index <= 4 ? "is-good" : index <= 6 ? "is-fair" : "is-bad";
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
    <section className="dxc-panel" aria-labelledby="dxc-title">
      <header className="dxc-header">
        <div>
          <p className="dxc-kicker">SITI MONITORATI</p>
          <h2 className="dxc-title" id="dxc-title">Confronta i decolli</h2>
          <p className="dxc-description">Scegli un sito per aggiornare mappa e previsioni. Il confronto è sintetico, non è un giudizio di sicurezza.</p>
        </div>
        <div className="dxc-count">
          <strong>{decolli.length}</strong>
          <span>decolli</span>
          <small>{loadedCount} con dati</small>
        </div>
      </header>

      <div className="dxc-tools">
        <label className="dxc-search">
          <Search aria-hidden="true" size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca decollo, valle o esposizione…" aria-label="Cerca un decollo" />
        </label>
        <span className="dxc-update"><Clock aria-hidden="true" size={12} />{dt.date}</span>
      </div>
      {error && <p className="dxc-message is-error">{error}</p>}
      {!loadedCount && !isUpdating && <p className="dxc-message">I dati comparativi di alcuni siti non sono disponibili in questo momento; le previsioni del sito selezionato restano separate.</p>}

      <div className="dxc-rows" role="list" aria-label="Elenco dei decolli">
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
          const lat = Number(item.lat);
          const lon = Number(item.lon);
          const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
          return (
            <button
              type="button"
              role="listitem"
              key={item.id}
              onClick={() => onSelect(item)}
              aria-pressed={selected}
              className={"dxc-card" + (selected ? " is-selected" : "")}
            >
              <div className="dxc-card-head">
                <div className="dxc-site-block">
                  <span className="dxc-site-name">{item.site_name || item.name}</span>
                  <span className="dxc-site-meta">
                    <MapPin size={11} aria-hidden="true" />
                    <span>{item.location_name || item.valley || "Località non indicata"}</span>
                    <span className="dxc-altitude">{item.elevation_m || item.altitude} m s.l.m.</span>
                  </span>
                  <span className="dxc-site-sub">
                    <span>Esposizione {item.orientation || item.exposure || "N/D"}</span>
                    {hasCoords && (
                      <span className="dxc-coords" title={`Coordinate GPS del decollo: ${lat.toFixed(4)}, ${lon.toFixed(4)}`}>
                        {lat.toFixed(4)}, {lon.toFixed(4)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="dxc-badges">
                  {index !== null && (
                    <span className={"dxc-index " + getIndexClass(index)} title="Indice sintetico indicativo">
                      <small>Indice</small>
                      <strong>{index}/10</strong>
                      <span className="dxc-index-bar"><span style={{ width: Math.max(6, index * 10) + "%" }} /></span>
                    </span>
                  )}
                  {selected && <span className="dxc-selected-chip"><span aria-hidden="true">✓</span> Selezionato</span>}
                </div>
              </div>

              <div className="dxc-condition">
                <span className="dxc-chip dxc-chip-condition">{status.icon}</span>
                <span className="dxc-cond-text">
                  <span className="dxc-value">{status.label}</span>
                  <span className="dxc-label">Condizioni</span>
                </span>
              </div>

              <div className="dxc-grid">
                <span className="dxc-tile">
                  <span className="dxc-chip dxc-chip-temp"><Thermometer aria-hidden="true" /></span>
                  <span className="dxc-tile-text">
                    <span className="dxc-value">{temp === null ? "N/D" : temp.toFixed(0) + "°C"}</span>
                    <span className="dxc-label">Temperatura</span>
                  </span>
                </span>
                <span className="dxc-tile">
                  <span className="dxc-chip dxc-chip-wind"><Wind aria-hidden="true" /></span>
                  <span className="dxc-tile-text">
                    <span className="dxc-value">{wind === null ? "N/D" : wind.toFixed(0) + " km/h"}</span>
                    <span className="dxc-label">Vento</span>
                  </span>
                </span>
                <span className="dxc-tile">
                  <span className="dxc-chip dxc-chip-dir">
                    <Navigation aria-hidden="true" style={direction === null ? undefined : { transform: "rotate(" + direction + "deg)" }} />
                  </span>
                  <span className="dxc-tile-text">
                    <span className="dxc-value is-dir">{direction === null ? "N/D" : getCardinalDir(direction)}</span>
                    <span className="dxc-label">Direzione</span>
                  </span>
                </span>
                <span className="dxc-tile">
                  <span className="dxc-chip dxc-chip-rain"><CloudRain aria-hidden="true" /></span>
                  <span className="dxc-tile-text">
                    <span className="dxc-value">{rain === null ? "N/D" : rain <= 0.1 ? "No pioggia" : rain.toFixed(1) + " mm"}</span>
                    <span className="dxc-label">Pioggia</span>
                  </span>
                </span>
                <span className="dxc-tile">
                  <span className="dxc-chip dxc-chip-cloud"><Cloud aria-hidden="true" /></span>
                  <span className="dxc-tile-text">
                    <span className="dxc-value">{cloud === null ? "N/D" : Math.round(cloud) + "%"}</span>
                    <span className="dxc-label">Nuvolosità</span>
                  </span>
                </span>
                <span className="dxc-tile">
                  <span className="dxc-chip dxc-chip-base"><Layers aria-hidden="true" /></span>
                  <span className="dxc-tile-text">
                    <span className="dxc-value">{base || "N/D"}</span>
                    <span className="dxc-label">Base nubi</span>
                  </span>
                </span>
                <span className="dxc-tile">
                  <span className="dxc-chip dxc-chip-thermal"><Flame aria-hidden="true" /></span>
                  <span className="dxc-tile-text">
                    <span className="dxc-value">{weather?.termiche || "N/D"}</span>
                    <span className="dxc-label">Termiche</span>
                  </span>
                </span>
                <span className="dxc-tile">
                  <span className="dxc-chip dxc-chip-freeze"><Snowflake aria-hidden="true" /></span>
                  <span className="dxc-tile-text">
                    <span className="dxc-value">{freezingLevel === null ? "N/D" : Math.round(freezingLevel).toLocaleString("it-IT") + " m"}</span>
                    <span className="dxc-label">Zero termico</span>
                  </span>
                </span>
              </div>
            </button>
          );
        })}
        {!visible.length && <p className="dxc-empty">Nessun decollo corrisponde alla ricerca.</p>}
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
