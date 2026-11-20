"use client";

/**
 * REPORT VOLO — finestra flottante con il bollettino completo per il decollo
 * selezionato e il giorno scelto, sincronizzata con la pagina:
 * - il decollo segue la selezione (click su card, pin o liretta);
 * - il selettore giorno è lo stesso della pagina (Oggi / Domani / Dopodomani);
 * - l'ora selezionata (timeline del report o delle card orarie) pilota tutte le
 *   sezioni: tempo al decollo, copertura nuvole, vento, termiche, profilo in quota.
 * Dati deterministici da Open-Meteo (vedi services/reportGiornata.ts) — il report
 * esce sempre pieno di dati, senza dipendere dal sounding.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity, ArrowUp, Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSnow, CloudSun,
  Cloudy, Droplet, Droplets, Gauge, Info, MountainSnow, Sun, Thermometer, Timer, TrendingUp, Wind, X,
} from "lucide-react";
import type { Decollo } from "@/data/decolli";
import {
  fetchReportGiornata, testoGiornata, dateLabel, cardinal,
  type ReportGiornata as ReportData, type ReportOra,
} from "@/services/reportGiornata";
import "./report-volo.css";
import WmoGlyph from "./WmoGlyph";
import RadarMappa from "./RadarMappa";
import { RingGauge, SemiGauge, WindRose } from "./gauge";

interface ReportVoloProps {
  open: boolean;
  onClose: () => void;
  item: Decollo;
  selectedDay: number;
  onSelectDay: (d: number) => void;
  selectedHour: number;
  onHourSelect: (h: number) => void;
  onSelect: (item: Decollo) => void;
  decolli: Decollo[];
  /** inline: renderizzato come sezione della pagina (tab Report) invece che finestra flottante. */
  inline?: boolean;
}

const POS_KEY = "rvo-panel-pos";
const SIZE_KEY = "rvo-panel-size";

function wmoLabel(code: number | null): string {
  if (code == null) return "N/D";
  if (code <= 1) return "Sereno";
  if (code === 2) return "Poco nuvoloso";
  if (code === 3 || code === 45 || code === 48) return "Coperto";
  if (code >= 51 && code <= 57) return "Pioviggine";
  if (code >= 61 && code <= 67) return "Pioggia";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Neve";
  if (code >= 80 && code <= 82) return "Rovesci";
  if (code >= 95) return "Temporale";
  return "Variabile";
}

function cloudIcon(pct: number | null, size = 26) {
  if (pct == null) return <Cloud size={size} />;
  if (pct <= 15) return <Sun size={size} className="rv-sun" />;
  if (pct <= 45) return <CloudSun size={size} />;
  if (pct <= 75) return <Cloud size={size} />;
  return <Cloudy size={size} />;
}

function cloudLabel(pct: number | null): string {
  if (pct == null) return "N/D";
  if (pct <= 15) return "Sereno";
  if (pct <= 45) return "Nuvole passaggere";
  if (pct <= 75) return "Nuvoloso";
  return "Coperto";
}

function loadJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as T; } catch { /* ignora */ }
  return fallback;
}
function saveJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignora */ }
}

/** Il giudice imparziale: la risposta in 30 secondi, con i motivi in lingua pilota.
 * Fermo, non allarmistico; basato sui dati del giorno (finestra, vento, pioggia,
 * temporali, turbolenza). Le soglie sono prudenziali: la sicurezza prima di tutto. */
type Verdetto = { livello: string; cls: "ok" | "mid" | "no"; motivi: string[] };

function calcolaVerdetto(data: ReportData): Verdetto {
  const hours = data.hours.filter((o) => o.hour >= 8 && o.hour <= 19);
  if (!hours.length) {
    return { livello: "DATI IN COMPLETAMENTO", cls: "mid", motivi: ["il modello non ha ancora restituito le ore diurne: rileggi tra poco"] };
  }
  const windMaxO = hours.reduce((a, b) => ((b.wind ?? 0) > (a.wind ?? 0) ? b : a), hours[0]);
  const windMax = windMaxO.wind ?? 0;
  const gustMax = Math.max(0, ...hours.map((o) => o.gust ?? 0));
  const rainMax = Math.max(0, ...hours.map((o) => o.rain ?? 0));
  const probMax = Math.max(0, ...hours.map((o) => o.prob ?? 0));
  const bestIndice = data.bestWindow?.indice ?? 0;
  const turbMarcata = data.turbolenza.some((t) => t.livello === "MARCATA");
  const baseMedia = hours.map((o) => o.baseNubi).filter((v): v is number => v != null);

  const motivi: string[] = [];
  if (data.bestWindow) {
    motivi.push(`finestra di volo ${String(data.bestWindow.from).padStart(2, "0")}:00–${String(data.bestWindow.to).padStart(2, "0")}:00, volabilità media ${bestIndice.toFixed(1).replace(".", ",")}/10`);
  }
  motivi.push(
    `vento fino a ${Math.round(windMax)} km/h da ${cardinal(windMaxO.dir)}${windMaxO.windRel && windMaxO.windRel !== "sconosciuto" ? ` — ${windMaxO.windRel}` : ""}${gustMax > windMax + 2 ? `, raffiche ${Math.round(gustMax)}` : ""}`,
  );
  if (baseMedia.length) {
    motivi.push(`base dei cumuli intorno a ${Math.round(baseMedia.reduce((a, b) => a + b, 0) / baseMedia.length).toLocaleString("it-IT")} m, ascendenze fino a +${data.rateoMax.toFixed(1).replace(".", ",")} m/s`);
  }
  if (data.temporali) motivi.push("temporali possibili: tieni d'occhio lo sviluppo dei cumuli e pianifica il rientro prima che crescano");
  else if (probMax >= 50) motivi.push(`pioggia probabile (${probMax}%): organizza il rientro con margine`);

  const staATerra = rainMax > 1.5 || windMax > 38 || bestIndice < 3.5 || (data.temporali && probMax >= 65);
  const siVola = !staATerra && bestIndice >= 6 && windMax <= 25 && !data.temporali && rainMax < 0.3 && probMax < 40 && !turbMarcata;

  if (staATerra) {
    return { livello: "RESTA A TERRA", cls: "no", motivi };
  }
  if (siVola) {
    return { livello: "SI VOLA", cls: "ok", motivi };
  }
  const motiviCautela = turbMarcata
    ? [...motivi, "aria mossa nel pomeriggio (turbolenza marcata): vela vulnerabile, valuta il vello"]
    : motivi;
  return { livello: "POSSIBILE, CON CAUTELA", cls: "mid", motivi: motiviCautela };
}

export default function ReportVolo({
  open, onClose, item, selectedDay, onSelectDay, selectedHour, onHourSelect, onSelect, decolli, inline = false,
}: ReportVoloProps) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => loadJSON(POS_KEY, null));
  const [size, setSize] = useState<{ w: number; h: number } | null>(() => loadJSON(SIZE_KEY, null));
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const rzRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const itemId = item?.id;

  useEffect(() => {
    if (!open || !item) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetchReportGiornata(
      { lat: item.lat, lon: item.lon, quota: Number(item.elevation_m ?? item.altitude ?? 0) || 0, esposizione: item.orientation || item.exposure || "" },
      selectedDay,
    )
      .then((d) => { if (alive) { setData(d); if (!d) setError("Il modello non ha restituito dati per questo decollo."); } })
      .catch(() => { if (alive) setError("Connessione ai modelli meteo non riuscita: riprova tra poco."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // il refetch avviene al cambio di sito (itemId), non a ogni nuova istanza dell'oggetto
  }, [open, itemId, selectedDay]);

  if (!open) return null;

  const quota = Number(item.elevation_m ?? item.altitude ?? 0) || 0;
  const oraSel: ReportOra | null = data?.hours.find((o) => o.hour === selectedHour) ?? null;
  const profilo = data?.profili.get(selectedHour) ?? [];
  const testo = data ? testoGiornata(data, quota, item.site_name || item.name) : "";
  const uvLabel = oraSel?.uv == null ? "raggio UV" : oraSel.uv < 3 ? "basso" : oraSel.uv < 6 ? "moderato" : oraSel.uv < 8 ? "alto" : "molto alto";
  const visLabel = oraSel?.visibility == null ? "visibilità orizzontale" : oraSel.visibility >= 20000 ? "ottima" : oraSel.visibility >= 10000 ? "buona" : oraSel.visibility >= 5000 ? "modesta" : "limitata";
  const photo = (item as { photo?: { url?: string } }).photo?.url;
  const espo = item.orientation || item.exposure || "—";

  const onHeadPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    if ((ev.target as HTMLElement).closest("button, select")) return;
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { dx: ev.clientX - rect.left, dy: ev.clientY - rect.top };
    setPos({ x: rect.left, y: rect.top });
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  };
  const onHeadPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const el = boxRef.current;
    setPos({
      x: Math.min(Math.max(8, ev.clientX - d.dx), Math.max(8, window.innerWidth - (el?.offsetWidth ?? 1040) - 8)),
      y: Math.min(Math.max(8, ev.clientY - d.dy), Math.max(8, window.innerHeight - (el?.offsetHeight ?? 660) - 8)),
    });
  };
  const onHeadPointerUp = () => { dragRef.current = null; setPos((p) => { saveJSON(POS_KEY, p); return p; }); };
  const onRzPointerDown = (ev: React.PointerEvent<HTMLSpanElement>) => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rzRef.current = { x: ev.clientX, y: ev.clientY, w: rect.width, h: rect.height };
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  };
  const onRzPointerMove = (ev: React.PointerEvent<HTMLSpanElement>) => {
    const r = rzRef.current;
    if (!r) return;
    setSize({
      w: Math.min(Math.max(720, r.w + (ev.clientX - r.x)), Math.max(720, window.innerWidth - 16)),
      h: Math.min(Math.max(420, r.h + (ev.clientY - r.y)), Math.max(420, window.innerHeight - 16)),
    });
  };
  const onRzPointerUp = () => { rzRef.current = null; };

  const st: React.CSSProperties = {};
  if (pos) { st.left = pos.x; st.top = pos.y; st.right = "auto"; }
  if (size) { st.width = size.w; st.height = size.h; }

  const timeline = (data?.hours ?? []).filter((o) => o.hour >= 6 && o.hour <= 20);
  const flyHours = (data?.hours ?? []).filter((o) => o.hour >= 8 && o.hour <= 19 && o.rateo != null);
  const maxRateo = Math.max(0.5, ...(data?.hours ?? []).map((o) => o.rateo ?? 0));

  // finestra pioggia: le 7 ore dalla selezione (curva e gocce "pioggia in arrivo")
  const rainHours = (data?.hours ?? []).filter((o) => o.hour >= selectedHour && o.hour <= selectedHour + 6);
  const rainNext = rainHours.find((o) => (o.rain ?? 0) > 0.1);
  const rainPath = (() => {
    const vals = rainHours.map((o) => Math.min(3, o.rain ?? 0));
    if (vals.length < 2) return "M 0,52 L 200,52";
    const step = 200 / (vals.length - 1);
    return "M " + vals.map((v, i) => `${(i * step).toFixed(1)},${(52 - (v / 3) * 44).toFixed(1)}`).join(" L ");
  })();

  // linee temperatura/percepita sopra la barra oraria: fascia 55–85% dell'altezza
  const tempsAll = timeline.map((o) => o.temp).filter((v): v is number => v != null);
  const appsAll = timeline.map((o) => o.apparent).filter((v): v is number => v != null);
  const loT = Math.min(...(tempsAll.length ? tempsAll : [0]), ...(appsAll.length ? appsAll : [0]));
  const hiT = Math.max(...(tempsAll.length ? tempsAll : [1]), ...(appsAll.length ? appsAll : [1]));
  const yBand = (v: number) => 55 + (1 - (v - loT) / Math.max(1, hiT - loT)) * 30;
  const tempPoints = timeline.map((o, i) => `${(i + 0.5).toFixed(2)},${(o.temp != null ? yBand(o.temp) : 85).toFixed(1)}`).join(" ");
  const appPoints = timeline.map((o, i) => `${(i + 0.5).toFixed(2)},${(o.apparent != null ? yBand(o.apparent) : 85).toFixed(1)}`).join(" ");

  const percepitaLabel = oraSel?.apparent != null && oraSel.temp != null
    ? Math.abs(oraSel.apparent - oraSel.temp) < 1
      ? "come l'aria reale"
      : oraSel.apparent > oraSel.temp ? "l'aria si sente più calda" : "si sente più fresca: vento e umidità"
    : "con vento e umidità in conto";

  const verdetto = data ? calcolaVerdetto(data) : null;

  const closeBtn = (
    <button type="button" className="cmap-close cmap-close-float" onClick={onClose} title="Chiudi il report" aria-label="Chiudi il report">
      <X size={14} aria-hidden="true" />
    </button>
  );
  const rzHandle = (
    <span className="cmap-rz is-se" title="Trascina dall'angolo per ridimensionare" aria-hidden="true" onPointerDown={onRzPointerDown} onPointerMove={onRzPointerMove} onPointerUp={onRzPointerUp} onPointerCancel={onRzPointerUp} />
  );
  const heroHandlers = inline ? {} : { onPointerDown: onHeadPointerDown, onPointerMove: onHeadPointerMove, onPointerUp: onHeadPointerUp, onPointerCancel: onHeadPointerUp };

  const inner = (
    <>
      {/* HERO con la foto reale del decollo + scena meteo animata dell'ora selezionata */}
      <div className={"rv-hero" + (photo ? " has-photo" : "")} style={photo ? { backgroundImage: `linear-gradient(180deg, rgba(7,17,31,.5), rgba(7,17,31,.94)), url(${photo})` } : undefined}>
        <div className="rv-hero-head" {...heroHandlers}>
          <span className="rv-daychip">{selectedDay === 0 ? "OGGI" : selectedDay === 1 ? "DOMANI" : "DOPODOMANI"}</span>
          <div className="rv-hero-title">
            <h2>Report meteo</h2>
            <strong>{item.site_name || item.name}</strong>
            <small>{dateLabel(selectedDay)} · decollo {quota.toLocaleString("it-IT")} m · esp. {espo}</small>
          </div>
          <WmoGlyph code={oraSel?.code ?? null} size={112} className="rv-hero-glyph" label={oraSel ? wmoLabel(oraSel.code) : undefined} />
          <div className="rv-hero-selects">
            <select value={selectedDay} onChange={(e) => onSelectDay(Number(e.target.value))} aria-label="Scegli il giorno del report">
              <option value={0}>Oggi</option>
              <option value={1}>Domani</option>
              <option value={2}>Dopodomani</option>
            </select>
            <select value={item.id} onChange={(e) => { const d = decolli.find((x) => x.id === e.target.value); if (d) onSelect(d); }} aria-label="Scegli il decollo del report">
              {[...decolli].sort((a, b) => (a.site_name || a.name).localeCompare(b.site_name || b.name, "it-IT")).map((d) => (
                <option key={d.id} value={d.id}>{d.site_name || d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rv-body">
        {loading && <p className="rv-status">Calcolo del bollettino dai modelli in corso…</p>}
        {error && !loading && <p className="rv-status is-err">{error}</p>}

        {!loading && data && (
          <>
            {/* VERDETTO — la risposta in 30 secondi, in lingua pilota */}
            {verdetto && (
              <div className={"rv-verdetto is-" + verdetto.cls}>
                <div className="rv-verdetto-main">
                  <strong className="rv-verdetto-word">{verdetto.livello}</strong>
                  <span className="rv-verdetto-win">{data.bestWindow ? `finestra di volo ${String(data.bestWindow.from).padStart(2, "0")}:00 – ${String(data.bestWindow.to).padStart(2, "0")}:00` : "finestra da valutare ora per ora"}</span>
                </div>
                <ul className="rv-verdetto-motivi">
                  {verdetto.motivi.slice(0, 4).map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
            )}

            {/* DASHBOARD BENTO — card compatte uguali tra loro, come la carta di riferimento */}
            <div className="rv-grid">
              <div className="rv-card rv-card-solid rv-today">
                <span className="rv-k">{selectedDay === 0 ? "Oggi" : selectedDay === 1 ? "Domani" : "Dopodomani"} · {wmoLabel(oraSel?.code ?? null)}</span>
                <div className="rv-today-flex">
                  <WmoGlyph code={oraSel?.code ?? null} size={64} />
                  <div className="rv-today-vals">
                    <strong className="rv-today-range">{data.tempMax != null ? Math.round(data.tempMax) + "°" : "—"} <i>/</i> {data.tempMin != null ? Math.round(data.tempMin) + "°" : "—"}</strong>
                    <span className="rv-today-sub">massima / minima</span>
                    <span className="rv-today-sub">{oraSel?.temp != null ? `ora ${Math.round(oraSel.temp)}° · percepita ${oraSel?.apparent != null ? Math.round(oraSel.apparent) + "°" : "—"}` : "—"}</span>
                  </div>
                </div>
              </div>

              <div className="rv-card rv-card-solid rv-press">
                <span className="rv-k">Pressione</span>
                <div className="rv-press-flex">
                  <strong className="rv-press-val">{oraSel?.pressure != null ? Math.round(oraSel.pressure) : "—"}<small> hPa</small></strong>
                  <SemiGauge value={oraSel?.pressure ?? null} size={112} />
                </div>
              </div>

              <div className="rv-card rv-card-solid rv-vola">
                <span className="rv-k"><Info size={13} aria-hidden="true" /> Volabilità</span>
                <div className="rv-vola-hero">
                  <RingGauge
                    value={oraSel?.indice ?? null} min={0} max={10} size={86} gradientId="gg-vola"
                    from={oraSel?.indice != null && oraSel.indice >= 7 ? "#6ee7b7" : oraSel?.indice != null && oraSel.indice >= 5 ? "#fcd34d" : "#fca5a5"}
                    to={oraSel?.indice != null && oraSel.indice >= 7 ? "#10b981" : oraSel?.indice != null && oraSel.indice >= 5 ? "#f59e0b" : "#ef4444"}
                  />
                  <div className="rv-vola-head">
                    <strong className="rv-vola-num">{oraSel?.indice != null ? `${oraSel.indice}/10` : "—"}</strong>
                    <em>{oraSel?.indiceLabel ?? "volabilità"}</em>
                  </div>
                </div>
                <div className="rv-vola-facts">
                  {[
                    { k: "Termiche", v: oraSel?.rateo != null && oraSel.rateo > 0 ? "+" + oraSel.rateo.toFixed(1).replace(".", ",") : "0", f: Math.min(1, (oraSel?.rateo ?? 0) / 4), c: "#fb923c" },
                    { k: "Vento", v: oraSel?.wind != null ? String(Math.round(oraSel.wind)) : "—", f: Math.min(1, (oraSel?.wind ?? 0) / 40), c: "#38bdf8" },
                    { k: "Raffiche", v: oraSel?.gust != null ? String(Math.round(oraSel.gust)) : "—", f: Math.min(1, (oraSel?.gust ?? 0) / 55), c: "#a78bfa" },
                    { k: "Pioggia", v: oraSel?.prob != null ? oraSel.prob + "%" : "—", f: Math.min(1, (oraSel?.prob ?? 0) / 100), c: "#60a5fa" },
                    { k: "Nuvole", v: oraSel?.cloud != null ? oraSel.cloud + "%" : "—", f: Math.min(1, (oraSel?.cloud ?? 0) / 100), c: "#94a3b8" },
                    { k: "UV", v: oraSel?.uv != null ? oraSel.uv.toFixed(1).replace(".", ",") : "—", f: Math.min(1, (oraSel?.uv ?? 0) / 11), c: "#facc15" },
                  ].map((f) => (
                    <div key={f.k} className="rv-vf">
                      <b>{f.v}</b>
                      <span className="rv-vf-bar"><i style={{ height: `${Math.max(4, f.f * 100)}%`, background: f.c }} /></span>
                      <em>{f.k}</em>
                    </div>
                  ))}
                </div>
              </div>

            {/* PIOGGIA IN ARRIVO — curva e gocce delle prossime ore, stile dashboard */}
              <div className="rv-card rv-card-solid rv-raincard rv-span2">
                <span className="rv-k">{rainNext ? "Pioggia in arrivo" : "Cielo asciutto"}</span>
                <div className="rv-rain-flex">
                  <div className="rv-rain-drops" aria-hidden="true">
                    {rainHours.map((o) => (
                      <span key={o.hour} className={"rv-drop" + ((o.rain ?? 0) > 0 ? " is-wet" : "")}>
                        <Droplet size={o.rain != null && o.rain > 0.2 ? 17 : 13} strokeWidth={2.2} />
                        <em>{String(o.hour).padStart(2, "0")}</em>
                      </span>
                    ))}
                  </div>
                  <svg className="rv-rain-curve" viewBox="0 0 200 56" preserveAspectRatio="none" aria-hidden="true">
                    <defs><linearGradient id="rv-rainfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(96,165,250,.5)" /><stop offset="1" stopColor="rgba(96,165,250,0)" /></linearGradient></defs>
                    <path d={rainPath} fill="url(#rv-rainfill)" />
                    <path d={rainPath} fill="none" stroke="#60a5fa" strokeWidth="2" />
                  </svg>
                </div>
                <p className="rv-rain-note">{rainNext ? `prossima pioggia ~${String(rainNext.hour).padStart(2, "0")}:00 · ${rainNext.rain?.toFixed(1).replace(".", ",")} mm/h` : "nessuna pioggia nelle prossime ore — il velio resta asciutto"}</p>
              </div>

              <div className="rv-card rv-card-solid rv-accent-wind">
                <span className="rv-k">Vento al decollo</span>
                <div className="rv-wind-flex">
                  <div className="rv-wind-txt">
                    <strong className="rv-wind-val">{oraSel?.wind != null ? Math.round(oraSel.wind) + " km/h" : "—"}</strong>
                    <span className="rv-wind-rel">{oraSel?.windRel && oraSel.windRel !== "sconosciuto" ? oraSel.windRel : oraSel?.dir != null ? `da ${cardinal(oraSel.dir)}` : "direzione —"}</span>
                    <small className="rv-wind-sub">{oraSel?.gust != null ? `raffiche ${Math.round(oraSel.gust)} km/h` : "raffiche —"}</small>
                  </div>
                  <WindRose dir={oraSel?.dir ?? null} size={84} />
                </div>
              </div>

              <div className="rv-card rv-card-solid rv-accent-therm">
                <span className="rv-k">Percepita sul decollo</span>
                <div className="rv-wind-flex">
                  <div className="rv-wind-txt">
                    <strong className="rv-wind-val">{oraSel?.apparent != null ? Math.round(oraSel.apparent) + "°" : "—"}</strong>
                    <span className="rv-wind-rel">{oraSel?.temp != null ? `aria ${Math.round(oraSel.temp)}°` : "—"}</span>
                    <small className="rv-wind-sub">{percepitaLabel}</small>
                  </div>
                  <RingGauge value={oraSel?.apparent ?? null} min={-10} max={35} size={84} from="#fca5a5" to="#ef4444" gradientId="gg-ap" />
                </div>
              </div>

            {/* PREVISIONI ORA PER ORA — barra grande leggibile, colonna cliccabile */}
            <div className="rv-card rv-card-solid rv-hbar-card rv-span2">
              <span className="rv-k"><Timer size={13} aria-hidden="true" /> Previsioni ora per ora <small className="rv-k-hint">tocca un'ora: si aggiornano tutte le card</small></span>
              <div className="rv-hbar-scroll">
                <div className="rv-hbar" style={{ "--cols": Math.max(4, timeline.length) } as React.CSSProperties}>
                  {timeline.length > 1 && (
                    <svg className="rv-hlines" viewBox={`0 0 ${timeline.length} 100`} preserveAspectRatio="none" aria-hidden="true">
                      <polyline className="is-app" points={appPoints} />
                      <polyline className="is-temp" points={tempPoints} />
                    </svg>
                  )}
                  {timeline.map((o) => (
                    <button
                      type="button" key={o.hour}
                      className={"rv-hcol" + (o.hour === selectedHour ? " is-sel" : "")}
                      onClick={() => onHourSelect(o.hour)}
                      title={`${String(o.hour).padStart(2, "0")}:00 — ${wmoLabel(o.code)} · vento ${o.wind != null ? Math.round(o.wind) : "—"} km/h da ${cardinal(o.dir)}${o.gust != null ? ` · raffiche ${Math.round(o.gust)}` : ""}${o.prob != null ? ` · pioggia ${o.prob}%` : ""}`}
                    >
                      <b className="rv-htime">{String(o.hour).padStart(2, "0")}:00</b>
                      <span className={"rv-hprob" + ((o.prob ?? 0) >= 60 ? " is-heavy" : (o.prob ?? 0) >= 30 ? " is-some" : "")}><Droplet size={11} aria-hidden="true" />{o.prob != null ? o.prob + "%" : "—"}</span>
                      <em className="rv-htemp">{o.temp != null ? Math.round(o.temp) + "°" : "—"}</em>
                      <span className="rv-hglyph"><WmoGlyph code={o.code} size={46} /></span>
                      <span className="rv-hwind">
                        {o.dir != null && <ArrowUp size={11} style={{ transform: `rotate(${o.dir + 180}deg)` }} aria-hidden="true" />}
                        <i>{o.wind != null ? Math.round(o.wind) : "—"}</i>
                        <em>km/h</em>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rv-hlegend" aria-hidden="true">
                <span><i className="is-temp" /> temperatura</span>
                <span><i className="is-app" /> percepita</span>
                <span className="rv-hl-ico"><Droplet size={10} /> prob. pioggia</span>
                <span className="rv-hl-ico"><ArrowUp size={10} /> vento km/h</span>
              </div>
            </div>

              <div className="rv-stack">
                <div className="rv-card rv-card-solid rv-accent-alt">
                  <span className="rv-k">Visibilità</span>
                  <div className="rv-mini-flex">
                    <div className="rv-wind-txt">
                      <strong className="rv-wind-val">{oraSel?.visibility != null ? (oraSel.visibility / 1000).toFixed(1).replace(".", ",") + " km" : "—"}</strong>
                      <small className="rv-wind-sub">{visLabel} · orizzonte verso l&apos;atterraggio</small>
                    </div>
                    <RingGauge value={oraSel?.visibility != null ? Math.min(oraSel.visibility, 30000) : 0} min={0} max={30000} size={64} from="#67e8f9" to="#3b82f6" gradientId="gg-vis" />
                  </div>
                </div>
                <div className="rv-card rv-card-solid rv-accent-rain">
                  <span className="rv-k">Precipitazione</span>
                  <div className="rv-mini-flex">
                    <div className="rv-wind-txt">
                      <strong className="rv-wind-val">{oraSel?.rain != null ? oraSel.rain.toFixed(1).replace(".", ",") + " mm/h" : "—"}</strong>
                      <small className="rv-wind-sub">{oraSel?.prob != null ? `probabilità ${oraSel.prob}%` : "probabilità —"}</small>
                    </div>
                    <RingGauge value={oraSel?.rain ?? 0} min={0} max={4} size={64} from="#93c5fd" to="#1d4ed8" gradientId="gg-rain" />
                  </div>
                </div>
              </div>

              {/* RADAR TEMPORALI — carta radar reale animata centrata sul decollo */}
              <div className="rv-card rv-card-solid rv-radarc rv-span3">
                <span className="rv-k"><Activity size={13} aria-hidden="true" /> Radar temporali in tempo reale <small className="rv-k-hint">ultimi 60 min + proiezione · trascina la carta per spostarla, +/− per lo zoom</small></span>
                <RadarMappa lat={item.lat} lon={item.lon} nome={item.site_name || item.name} quota={quota} />
                <p className="rv-note">Le celle pioggia/temporale in arrivo si vedono prima che raggiungano l&apos;area di volo — i frame arancioni sono la proiezione della prossima mezz&apos;ora. Radar © RainViewer.</p>
              </div>
            </div>{/* chiude rv-grid */}

            {/* SEZIONI TEMATICHE — metriche correlate raggruppate per la decisione di volo */}
            <div className="rv-sez">
              <div className="rv-sez-head">
                <Sun size={19} className="rv-sez-ico rv-sun" aria-hidden="true" />
                <h4>Il cielo al decollo</h4>
                <span className="rv-sez-time">ore {String(selectedHour).padStart(2, "0")}:00</span>
              </div>
              <div className="rv-sez-grid rv-cols-2">
                <div className="rv-card rv-scene">
                  <div className="rv-scene-txt">
                    <div className="rv-v rv-big rv-v-scene">
                      <strong className="rv-temp">{oraSel?.temp != null ? Math.round(oraSel.temp) + "°" : "—"}</strong>
                      <strong className="rv-label">{oraSel ? wmoLabel(oraSel.code) : "—"}</strong>
                    </div>
                    <div className="rv-chips rv-chips-scene">
                      <span className="rv-chipv">Pioggia {oraSel?.rain != null ? oraSel.rain.toFixed(1).replace(".", ",") : "—"} mm/h</span>
                      <span className="rv-chipv">Prob. {oraSel?.prob != null ? oraSel.prob + "%" : "—"}</span>
                      <span className="rv-chipv">Rugiada {oraSel?.dew != null ? Math.round(oraSel.dew) + "°" : "—"}</span>
                      <span className="rv-chipv">Percepita {oraSel?.apparent != null ? Math.round(oraSel.apparent) + "°" : "—"}</span>
                      {data.tempMin != null && data.tempMax != null && <span className="rv-chipv">Giornata {Math.round(data.tempMin)}–{Math.round(data.tempMax)} °C</span>}
                      <span className="rv-chipv">Umidità {oraSel?.humidity != null ? Math.round(oraSel.humidity) + "%" : "—"}</span>
                    </div>
                  </div>
                  <WmoGlyph code={oraSel?.code ?? null} size={164} className="rv-scene-glyph" label={oraSel ? wmoLabel(oraSel.code) : undefined} />
                </div>

                <div className="rv-card rv-card-solid rv-accent-cloud">
                  <span className="rv-k">{cloudIcon(oraSel?.cloud ?? null, 15)} Copertura nuvole</span>
                  <div className="rv-v rv-big">{cloudIcon(oraSel?.cloud ?? null)} <strong>{oraSel?.cloud != null ? oraSel.cloud + "%" : "—"}</strong><em className="rv-v-note">{cloudLabel(oraSel?.cloud ?? null)}</em></div>
                  <div className="rv-layers">
                    <span className="rv-layer"><i>Nuvole alte</i><b style={{ width: `${oraSel?.cloudHigh ?? 0}%` }} /><em>{oraSel?.cloudHigh != null ? oraSel.cloudHigh + "%" : "—"}</em></span>
                    <span className="rv-layer"><i>Nuvole medie</i><b style={{ width: `${oraSel?.cloudMid ?? 0}%` }} /><em>{oraSel?.cloudMid != null ? oraSel.cloudMid + "%" : "—"}</em></span>
                    <span className="rv-layer"><i>Nuvole basse</i><b style={{ width: `${oraSel?.cloudLow ?? 0}%` }} /><em>{oraSel?.cloudLow != null ? oraSel.cloudLow + "%" : "—"}</em></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rv-sez">
              <div className="rv-sez-head">
                <Gauge size={19} className="rv-sez-ico" aria-hidden="true" />
                <h4>Termiche &amp; quote</h4>
              </div>
              <div className="rv-sez-grid">
                <div className="rv-card rv-card-solid rv-accent-therm">
                  <span className="rv-k">Le termiche dell&apos;ora</span>
                  <div className="rv-mets rv-mets-4">
                    <div className="rv-met"><span>Rateo max giornata</span><b>{data.rateoMax > 0.2 ? "+" + data.rateoMax.toFixed(1).replace(".", ",") + " m/s" : "debole"}</b><small className="rv-met-sub">{data.rateoOraMax != null ? `picco alle ${String(data.rateoOraMax).padStart(2, "0")}:00` : "picco —"}</small></div>
                    <div className="rv-met"><span>Base cumuli</span><b>{oraSel?.baseNubi != null ? oraSel.baseNubi.toLocaleString("it-IT") + " m" : "—"}</b><small className="rv-met-sub">{oraSel?.baseNubi != null ? `${Math.round(oraSel.baseNubi - quota).toLocaleString("it-IT")} m di soglia dal decollo` : "soglia —"}</small></div>
                    <div className="rv-met"><span>Zero termico</span><b>{oraSel?.freezing != null ? Math.round(oraSel.freezing).toLocaleString("it-IT") + " m" : "—"}</b><small className="rv-met-sub">{oraSel?.freezing != null ? `${Math.round(oraSel.freezing - quota).toLocaleString("it-IT")} m sopra il decollo` : "— m sopra il decollo"}</small></div>
                    <div className="rv-met"><span>Quota max utile</span><b>{data.topRange ? data.topRange[1].toLocaleString("it-IT") + " m" : "—"}</b><small className="rv-met-sub">{data.topRange ? `range base ${data.topRange[0].toLocaleString("it-IT")}–${data.topRange[1].toLocaleString("it-IT")} m` : "range —"}</small></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rv-sez">
              <div className="rv-sez-head">
                <Timer size={19} className="rv-sez-ico" aria-hidden="true" />
                <h4>La decisione di volo</h4>
              </div>
              <div className="rv-sez-grid rv-cols-3">
                <div className="rv-card rv-card-solid rv-accent-ok">
                  <span className="rv-k">Volo veleggiato</span>
                  <div className="rv-v"><strong className={data.veleggiata.livello === "OTTIME" || data.veleggiata.livello === "BUONE" ? "rv-ok" : data.veleggiata.livello === "MEDIATE" ? "rv-mid" : "rv-no"}>{data.veleggiata.livello.toLowerCase()}</strong></div>
                  <p className="rv-sub">{data.veleggiata.motivo}</p>
                </div>

                <div className="rv-card rv-card-solid rv-accent-window">
                  <span className="rv-k">Finestra migliore</span>
                  <div className="rv-v"><strong className="rv-val-xl">{data.bestWindow ? `${String(data.bestWindow.from).padStart(2, "0")}:00 – ${String(data.bestWindow.to).padStart(2, "0")}:00` : "—"}</strong></div>
                  <p className="rv-sub">{data.bestWindow ? `indice medio ${data.bestWindow.indice.toFixed(1).replace(".", ",")}/10${data.bestWindow.quota ? ` · base cumuli ${data.bestWindow.quota.toLocaleString("it-IT")} m` : ""}` : "—"}</p>
                </div>

                <div className="rv-card rv-card-solid rv-accent-turb">
                  <span className="rv-k">Rischi della giornata</span>
                  <div className="rv-turb-grid">
                    {data.turbolenza.map((t) => (
                      <span key={t.fascia} className="rv-turb-cell"><i>{t.fascia}</i><b className={t.livello === "MARCATA" ? "rv-no" : t.livello === "MODERATA" ? "rv-mid" : "rv-ok"}>{t.livello.toLowerCase()}</b></span>
                    ))}
                  </div>
                  <div className="rv-mets rv-mets-2">
                    <div className="rv-met"><span>Pioggia totale</span><b>{data.pioggiaTotale != null ? data.pioggiaTotale.toFixed(1).replace(".", ",") + " mm" : "—"}</b></div>
                    <div className="rv-met"><span>Temporali</span><b className={data.temporali ? "rv-no" : "rv-ok"}>{data.temporali ? "possibili" : "assenti"}</b></div>
                  </div>
                </div>
              </div>
            </div>

            {/* TERMICHE A SALIRE DURANTE LA GIORNATA */}
            <div className="rv-block">
              <h3><TrendingUp size={14} aria-hidden="true" /> Termiche a salire <small>ascendenza stimata (m/s) e base cumuli, ore 8–19</small></h3>
              <svg className="rv-chart" viewBox="0 0 600 132" preserveAspectRatio="none" aria-hidden="true">
                {(() => {
                  if (!flyHours.length) return null;
                  const bw = 600 / flyHours.length;
                  const maxR = Math.max(1, ...flyHours.map((o) => o.rateo ?? 0));
                  const bases = flyHours.map((o) => o.baseNubi ?? null).filter((v): v is number => v != null);
                  const minB = bases.length ? Math.min(...bases) : 0;
                  const maxB = bases.length ? Math.max(...bases) : 1;
                  const yB = (b: number) => (maxB > minB ? 112 - ((b - minB) / Math.max(1, maxB - minB)) * 62 : 112);
                  return (
                    <>
                      {flyHours.map((o, i) => {
                        const hgt = ((o.rateo ?? 0) / maxR) * 56;
                        return (
                          <g key={o.hour}>
                            <rect x={i * bw + bw * 0.18} y={116 - hgt} width={bw * 0.64} height={Math.max(1.5, hgt)} rx={2}
                              fill={o.hour === selectedHour ? "#fbbf24" : "rgba(251,191,36,.4)"} />
                            {o.baseNubi != null && <circle cx={i * bw + bw / 2} cy={yB(o.baseNubi)} r={2.6} fill="#7dd3fc" />}
                          </g>
                        );
                      })}
                      {flyHours.map((o, i) => (o.hour % 3 === 0) && (
                        <text key={"t" + o.hour} x={i * bw + bw / 2} y={130} fill="#8ba2b6" fontSize="9" textAnchor="middle">{String(o.hour).padStart(2, "0")}</text>
                      ))}
                    </>
                  );
                })()}
              </svg>
              <p className="rv-legend"><b className="rv-chip rv-chip-therm" /> rateo termico (m/s) · <b className="rv-chip rv-chip-base" /> base cumuli (m s.l.m.)</p>
            </div>

            {/* VENTI IN QUOTA — step 250 m dal decollo fino a 4000 m s.l.m. */}
            <div className="rv-block">
              <h3><Wind size={14} aria-hidden="true" /> Venti in quota <small>step 250 m dal decollo fino a 4000 m · ore {String(selectedHour).padStart(2, "0")}:00</small></h3>
              <div className="rv-profile" role="table" aria-label="Profilo verticale di vento e temperatura">
                <div className="rv-prow rv-phead" role="row">
                  <span>Quota</span><span>Dir.</span><span>Vento</span><span>Gradi</span><span aria-hidden="true" />
                </div>
                {profilo.length ? [...profilo].reverse().map((row) => (
                  <div key={row.z} className={"rv-prow" + (row.shear ? " is-shear" : "")} role="row">
                    <span className="rv-pz"><b>{row.z.toLocaleString("it-IT")} m</b>{row.agl > 0 && <i>+{row.agl}</i>}</span>
                    <span className="rv-pd">{row.card}</span>
                    <span className="rv-ps">{row.speed != null ? <em className={row.speed >= 40 ? "is-strong" : row.speed >= 25 ? "is-mid" : ""}>{Math.round(row.speed)} km/h</em> : "—"}</span>
                    <span className="rv-pt">{row.temp != null ? Math.round(row.temp) + "°C" : "—"}</span>
                    <span className="rv-pa" aria-hidden="true">
                      {row.dir != null && <ArrowUp size={13} style={{ transform: `rotate(${row.dir + 180}deg)` }} />}
                    </span>
                  </div>
                )) : <p className="rv-sub">Profilo verticale non disponibile per quest'ora.</p>}
              </div>
              <p className="rv-legend"><span className="rv-shearmark" /> strato con salto di vento ≥ 20 km/h tra due livelli (possibili turbolenze)</p>
            </div>

            {/* TESTO ESPLICATIVO */}
            <div className="rv-block">
              <h3><Droplets size={14} aria-hidden="true" /> Le possibilità della giornata</h3>
              <p className="rv-testo">{testo}</p>
              <p className="rv-note">Previsioni Open-Meteo elaborate nel browser per {item.site_name || item.name} · il report si aggiorna con l'ora e il giorno selezionati · verifica sempre le osservazioni sul posto prima di volare.</p>
            </div>
          </>
        )}
      </div>
    </>
  );

  if (inline) {
    return (
      <div className="rv-window rv-inline" data-testid="report-volo" role="region" aria-label="Report volo della giornata">
        {inner}
      </div>
    );
  }

  return createPortal(
    <div ref={boxRef} className="rv-window" data-testid="report-volo" style={st} role="dialog" aria-label="Report volo della giornata">
      {closeBtn}
      {rzHandle}
      {inner}
    </div>,
    document.body,
  );
}
