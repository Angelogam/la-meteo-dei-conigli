"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle, Cloud, CloudRain, CloudSnow, Flame, Info, Layers, MapPin, Search, Snowflake, Sun, Thermometer, Wind, Zap,
} from "lucide-react";
import type { Decollo } from "@/data/decolli";
import { calcolaIndiceVolabilita, esposizioneToGradi } from "@/utils/indiceVolabilita";
import type { HourlyPoint } from "@/services/threeSourceWeather";

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
  /** Serie oraria Open-Meteo (3 giorni) per timeline interattiva, bussola e windgram. */
  hourly?: HourlyPoint[];
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
    if (code === 2) return { icon: ICONA_STATO.variabile, label: "Variabile" };
    if (code === 3) return { icon: ICONA_STATO.coperto, label: "Coperto" };
  }
  return getStatoDisplay(weather?.stato);
}

function getIndexClass(index: number): "is-good" | "is-fair" | "is-bad" {
  // Indice inverso: valori bassi = condizioni migliori (2 = "Perfetto").
  return index <= 4 ? "is-good" : index <= 6 ? "is-fair" : "is-bad";
}

/* ============================================================
   Card decolli — scheda essenziale per IDENTIFICARE il decollo
   e leggere l'indicazione di base (verdetto, termiche, vento).
   Il grafico animato completo sta nella scheda Termiche:
   "Il volo della giornata" (TermicheDayFlight).
   ============================================================ */

type Classe = "is-good" | "is-fair" | "is-bad";

const REL_META: Record<string, { label: string; cls: Classe }> = {
  frontale: { label: "In fronte", cls: "is-good" },
  diagonale: { label: "Diagonale", cls: "is-good" },
  laterale: { label: "Laterale", cls: "is-fair" },
  di_coda: { label: "In coda", cls: "is-bad" },
  sconosciuto: { label: "Vento N/D", cls: "is-fair" },
};

interface OraValutata {
  hour: number;
  indice: number;
  label: string;
  classe: Classe;
  wind: number | null;
  gusts: number | null;
  dir: number | null;
  temp: number | null;
  rain: number | null;
  cloud: number | null;
  baseNubiM: number | null;
  rateo: number | null;
  rel: string;
  freezing: number | null;
  code: number | null;
  motivi: string[];
}

function dateKeyFor(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function hourOf(time: string): number {
  const m = /T(\d{2})/.exec(time);
  return m ? Number(m[1]) : -1;
}

function evaluateHour(point: HourlyPoint, quota: number, esposizione: string): OraValutata {
  const temp = point.temp ?? 12;
  const res = calcolaIndiceVolabilita({
    windSpeed: point.wind ?? 0,
    windGusts: point.gusts ?? undefined,
    windDir: point.dir ?? esposizioneToGradi(esposizione),
    esposizione,
    temperature: temp,
    dewPoint: point.dew ?? temp - 3,
    cloudCover: point.cloud ?? 50,
    precipitation: point.rain ?? 0,
    weatherCode: point.code ?? undefined,
    cape: point.cape ?? undefined,
    quota,
  });
  return {
    hour: hourOf(point.time),
    indice: res.indice,
    label: res.label,
    classe: getIndexClass(res.indice),
    wind: point.wind,
    gusts: point.gusts,
    dir: point.dir,
    temp: point.temp,
    rain: point.rain,
    cloud: point.cloud,
    baseNubiM: res.baseNubiM,
    rateo: res.rateoTermicoMs,
    rel: res.windRelativo,
    freezing: point.freezing,
    code: point.code,
    motivi: res.motivi.slice(0, 2),
  };
}

function longestRun(hours: OraValutata[], classe: Classe): { start: number; end: number } | null {
  let best: { start: number; end: number; len: number } | null = null;
  let cur: OraValutata[] = [];
  const flush = () => {
    if (cur.length && (!best || cur.length > best.len)) best = { start: cur[0].hour, end: cur[cur.length - 1].hour, len: cur.length };
    cur = [];
  };
  for (const h of hours) {
    if (h.classe === classe) cur.push(h);
    else flush();
  }
  flush();
  return best ? { start: best.start, end: best.end } : null;
}

function pickBestWindow(hours: OraValutata[]): { start: number; end: number } | null {
  const day = hours.filter((h) => h.hour >= 5 && h.hour <= 21);
  if (!day.length) return null;
  return longestRun(day, "is-good") ?? longestRun(day, "is-fair");
}

/* ---------- Testata comune delle card ---------- */

type CardItem = Decollo & { aggressiveWeather?: AggressiveWeatherData | null };

function HeadBlock({ item, selected, index }: { item: CardItem; selected: boolean; index: number | null }) {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
  return (
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
            <span className="dxc-coords" title={"Coordinate GPS del decollo: " + lat.toFixed(4) + ", " + lon.toFixed(4)}>
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </span>
          )}
        </span>
      </div>
      <div className="dxc-badges">
        {index !== null && (
          <span className={"dxc-index " + getIndexClass(index)} title="Indice di volabilità: 1 = perfetto, 10 = pericoloso">
            <small>Indice</small>
            <strong>{index}/10</strong>
            <span className="dxc-index-bar"><span style={{ width: Math.max(6, index * 10) + "%" }} /></span>
          </span>
        )}
        {selected && <span className="dxc-selected-chip"><span aria-hidden="true">✓</span> Selezionato</span>}
      </div>
    </div>
  );
}

/* ---------- Fallback offline: griglia compatta come prima della fase B ---------- */

function FallbackCard({ item, selected, onSelect, idx }: { item: CardItem; selected: boolean; onSelect: (item: Decollo) => void; idx: number }) {
  const weather = item.aggressiveWeather;
  const wind = numberOrNull(weather?.wind);
  const temp = numberOrNull(weather?.temp);
  const direction = numberOrNull(weather?.dir);
  const index = numberOrNull(weather?.indice);
  const status = getWeatherStatus(weather);
  const base = weather?.baseNubi;
  const freezingLevel = numberOrNull(weather?.freezingLevel);
  return (
    <button
      type="button"
      role="listitem"
      key={item.id}
      onClick={() => onSelect(item)}
      aria-pressed={selected}
      className={"dxc-card" + (selected ? " is-selected" : "")}
      style={{ "--dxc-i": String(Math.min(idx, 11)) } as React.CSSProperties}
    >
      <HeadBlock item={item} selected={selected} index={index} />
      <div className="dxc-condition">
        <span className="dxc-chip dxc-chip-condition">{status.icon}</span>
        <span className="dxc-cond-text">
          <span className="dxc-value">{status.label}</span>
          <span className="dxc-label">Condizioni ora</span>
        </span>
        {weather?.termiche && <span className="dxc-cond-therm"><Flame size={12} aria-hidden="true" />{weather.termiche}</span>}
      </div>
      <div className="dxc-grid">
        <span className="dxc-tile">
          <span className="dxc-chip dxc-chip-wind"><Wind aria-hidden="true" /></span>
          <span className="dxc-tile-text">
            <span className="dxc-value">{wind === null ? "N/D" : wind.toFixed(0) + " km/h"}</span>
            <span className="dxc-label">Vento {direction === null ? "" : getCardinalDir(direction).split("-")[0]}</span>
          </span>
        </span>
        <span className="dxc-tile">
          <span className="dxc-chip dxc-chip-temp"><Thermometer aria-hidden="true" /></span>
          <span className="dxc-tile-text">
            <span className="dxc-value">{temp === null ? "N/D" : temp.toFixed(0) + "°C"}</span>
            <span className="dxc-label">Temperatura</span>
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
          <span className="dxc-chip dxc-chip-freeze"><Snowflake aria-hidden="true" /></span>
          <span className="dxc-tile-text">
            <span className="dxc-value">{freezingLevel === null ? "N/D" : Math.round(freezingLevel).toLocaleString("it-IT") + " m"}</span>
            <span className="dxc-label">Zero termico</span>
          </span>
        </span>
      </div>
    </button>
  );
}

/* ---------- Card essenziale: verdetto + indicazioni base ---------- */

interface LaunchCardProps {
  item: CardItem;
  selected: boolean;
  onSelect: (item: Decollo) => void;
  selectedDay: number;
  dayKey: string;
  nowHour: number;
  idx: number;
}

function LaunchCard({ item, selected, onSelect, selectedDay, dayKey, nowHour, idx }: LaunchCardProps) {
  const weather = item.aggressiveWeather;
  const quota = Number(item.elevation_m ?? item.altitude ?? 0) || 0;
  const esposizione = item.orientation || item.exposure || "";

  const evaluated = useMemo(() => {
    const hourly = weather?.hourly;
    if (!hourly?.length) return [] as OraValutata[];
    return hourly
      .filter((p) => p.time.startsWith(dayKey))
      .map((p) => evaluateHour(p, quota, esposizione))
      .filter((v) => v.hour >= 0);
  }, [weather, dayKey, quota, esposizione]);

  const best = useMemo(() => pickBestWindow(evaluated), [evaluated]);
  const nearNow = useMemo(() => {
    if (!evaluated.length) return null;
    let bestHour = evaluated[0];
    for (const v of evaluated) {
      if (Math.abs(v.hour - nowHour) < Math.abs(bestHour.hour - nowHour)) bestHour = v;
    }
    return bestHour.hour;
  }, [evaluated, nowHour]);

  if (!weather || !evaluated.length) {
    return <FallbackCard item={item} selected={selected} onSelect={onSelect} idx={idx} />;
  }

  const activeHour = selectedDay === 0 ? nearNow : best?.start ?? nearNow;
  const active = evaluated.find((v) => v.hour === activeHour) ?? evaluated[0];
  const rel = REL_META[active.rel] ?? REL_META.sconosciuto;
  const hourLabel = selectedDay === 0 ? "Adesso" : "Ore " + active.hour;
  const motivi = active.motivi.filter(Boolean).join(" · ");
  const status = getWeatherStatus({ ...weather, weatherCode: active.code });
  const canRise = (active.rateo ?? 0) > 0.2 && active.baseNubiM !== null && active.baseNubiM > quota + 60;
  const windowCls = active.classe === "is-good" ? "is-good" : "is-fair";

  return (
    <button
      type="button"
      role="listitem"
      onClick={() => onSelect(item)}
      aria-pressed={selected}
      className={"dxc-card dxc-brief" + (selected ? " is-selected" : "")}
      style={{ "--dxc-i": String(Math.min(idx, 11)) } as React.CSSProperties}
    >
      <HeadBlock item={item} selected={selected} index={active.indice} />

      <div className={"dxc-verdict " + active.classe}>
        <span className="dxc-verdict-dot" aria-hidden="true" />
        <strong className="dxc-verdict-label dxc-fade" key={"v" + active.hour}>{active.label}</strong>
        <span className={"dxc-relchip " + rel.cls}>{rel.label}</span>
        <span className="dxc-verdict-hour dxc-fade" key={"h" + active.hour}>{hourLabel}</span>
      </div>
      <span className="dxc-motivi"><span className="dxc-fade" key={"m" + active.hour}>{motivi || "Modello Open-Meteo · confronto indicativo, non è un giudizio di sicurezza"}</span></span>

      <div className="dxc-keyrow">
        {best ? (
          <span className={"dxc-window " + windowCls}>
            {best.start === best.end ? "Finestra ore " + best.start : "Finestra " + best.start + "–" + best.end}
          </span>
        ) : (
          <span className="dxc-window is-bad">Nessuna finestra netta</span>
        )}
        <span className={"dxc-therm dxc-fade" + (canRise ? "" : " is-off")} key={"t" + active.hour}>
          <Flame size={11} aria-hidden="true" />
          {canRise ? "Termiche +" + (active.rateo ?? 0).toFixed(1).replace(".", ",") + " m/s" : "Termiche assenti"}
        </span>
        <span className="dxc-state">{status.icon}<em>{status.label}</em></span>
      </div>

      <div className="dxc-grid dxc-foot">
        <span className="dxc-tile">
          <span className="dxc-chip dxc-chip-thermal"><Flame aria-hidden="true" /></span>
          <span className="dxc-tile-text">
            <span className="dxc-value dxc-fade" key={"th" + active.hour}>{canRise ? "+" + (active.rateo ?? 0).toFixed(1).replace(".", ",") + " m/s" : "Assenti"}</span>
            <span className="dxc-label">Termiche</span>
          </span>
        </span>
        <span className="dxc-tile">
          <span className="dxc-chip dxc-chip-wind"><Wind aria-hidden="true" /></span>
          <span className="dxc-tile-text">
            <span className="dxc-value dxc-fade" key={"tw" + active.hour}>{active.wind === null ? "N/D" : Math.round(active.wind) + " km/h"}</span>
            <span className="dxc-label">Vento {active.dir === null ? "" : getCardinalDir(active.dir).split("-")[0]}</span>
          </span>
        </span>
        <span className="dxc-tile">
          <span className="dxc-chip dxc-chip-base"><Layers aria-hidden="true" /></span>
          <span className="dxc-tile-text">
            <span className="dxc-value dxc-fade" key={"tb" + active.hour}>{active.baseNubiM === null ? "N/D" : Math.round(active.baseNubiM).toLocaleString("it-IT") + " m"}</span>
            <span className="dxc-label">Base nubi</span>
          </span>
        </span>
        <span className="dxc-tile">
          <span className="dxc-chip dxc-chip-temp"><Thermometer aria-hidden="true" /></span>
          <span className="dxc-tile-text">
            <span className="dxc-value dxc-fade" key={"tt" + active.hour}>{active.temp === null ? "N/D" : Math.round(active.temp) + "°C"}</span>
            <span className="dxc-label">Temp</span>
          </span>
        </span>
      </div>

      {active.rel === "di_coda" && (active.wind ?? 0) > 12 && (
        <span className="dxc-warning">
          <AlertTriangle size={12} aria-hidden="true" /> Vento in coda al pendio: decollo critico
        </span>
      )}
    </button>
  );
}

/* ---------- Pannello "Confronta i decolli" ---------- */

export default function DecolliCard({
  decolli, selectedId, onSelect, selectedDay = 0, isUpdating = false, error,
}: DecolliCardProps) {
  const [query, setQuery] = useState("");
  const dt = getDateTime(selectedDay);
  const dayKey = dateKeyFor(selectedDay);
  const nowHour = new Date().getHours();
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("it-IT");
    return decolli.filter((item) => !q || [
      item.site_name, item.location_name, item.orientation, item.elevation_m,
    ].some((value) => String(value ?? "").toLocaleLowerCase("it-IT").includes(q)));
  }, [decolli, query]);
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
          <p className="dxc-description">Schede essenziali per scegliere e identificare il decollo: verdetto di volo, finestra migliore, termiche e vento. Il quadro animato completo — il volo della giornata — è nella scheda Termiche della pagina centrale. Il confronto è indicativo, non è un giudizio di sicurezza.</p>
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
        <span className="dxc-update">{dt.date}</span>
      </div>
      {error && <p className="dxc-message is-error">{error}</p>}
      {!loadedCount && !isUpdating && <p className="dxc-message">I dati comparativi di alcuni siti non sono disponibili in questo momento; le previsioni del sito selezionato restano separate.</p>}

      <div className="dxc-rows" role="list" aria-label="Elenco dei decolli">
        {filtered.map((item, idx) => (
          <LaunchCard
            key={item.id}
            item={item}
            idx={idx}
            selected={item.id === selectedId}
            onSelect={onSelect}
            selectedDay={selectedDay}
            dayKey={dayKey}
            nowHour={nowHour}
          />
        ))}
        {!filtered.length && <p className="dxc-empty">Nessun decollo corrisponde alla ricerca.</p>}
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

