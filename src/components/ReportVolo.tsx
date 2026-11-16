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
  Cloudy, Droplets, Gauge, MountainSnow, Sun, Thermometer, Timer, TrendingUp, Wind, X,
} from "lucide-react";
import type { Decollo } from "@/data/decolli";
import {
  fetchReportGiornata, testoGiornata, dateLabel, cardinal,
  type ReportGiornata as ReportData, type ReportOra,
} from "@/services/reportGiornata";
import "./report-volo.css";
import WeatherAnimation from "./WeatherAnimation";

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
  const photo = item.photo?.url;
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
        <WeatherAnimation code={oraSel?.code ?? null} size="hero" />
        <div className="rv-hero-head" {...heroHandlers}>
          <span className="rv-daychip">{selectedDay === 0 ? "OGGI" : selectedDay === 1 ? "DOMANI" : "DOPODOMANI"}</span>
          <div className="rv-hero-title">
            <h2>Report meteo</h2>
            <strong>{item.site_name || item.name}</strong>
            <small>{dateLabel(selectedDay)} · decollo {quota.toLocaleString("it-IT")} m · esp. {espo}</small>
          </div>
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
            {/* METEOGRAM ORARIO — righe compatte stile professionale, colonna cliccabile */}
            <div className="rv-block">
              <h3><Timer size={14} aria-hidden="true" /> Meteogram orario <small>clicca una colonna: tutte le card si aggiornano</small></h3>
              <div className="rv-meteo-wrap">
                <div className="rv-meteo" style={{ "--cols": timeline.length } as React.CSSProperties} role="grid" aria-label="Meteogram orario della giornata">
                  <div className="rv-mrow rv-mhead" role="row">
                    <span className="rv-mlabel" aria-hidden="true" />
                    {timeline.map((o) => (
                      <button
                        type="button"
                        key={o.hour}
                        className={"rv-mcol" + (o.hour === selectedHour ? " is-sel" : "")}
                        onClick={() => onHourSelect(o.hour)}
                        title={`${String(o.hour).padStart(2, "0")}:00 — ${wmoLabel(o.code)}`}
                      >
                        <b>{String(o.hour).padStart(2, "0")}</b>
                        <WeatherAnimation code={o.code} size="micro" />
                        <em>{o.temp != null ? Math.round(o.temp) + "°" : "—"}</em>
                      </button>
                    ))}
                  </div>
                  <div className="rv-mrow" role="row">
                    <span className="rv-mlabel">Volo</span>
                    {timeline.map((o) => (
                      <span key={o.hour} className={"rv-mcell" + (o.hour === selectedHour ? " is-sel" : "")} onClick={() => onHourSelect(o.hour)} title={o.indice != null ? `volabilità ${o.indice}/10 ${o.indiceLabel ?? ""}` : undefined}>
                        {o.indice != null ? <b className={o.indice >= 7 ? "rv-ok" : o.indice >= 5 ? "rv-mid" : "rv-no"}>{o.indice}<i>/10</i></b> : <span className="rv-mdash">—</span>}
                      </span>
                    ))}
                  </div>
                  <div className="rv-mrow" role="row">
                    <span className="rv-mlabel">Vento</span>
                    {timeline.map((o) => (
                      <span key={o.hour} className={"rv-mcell" + (o.hour === selectedHour ? " is-sel" : "")} onClick={() => onHourSelect(o.hour)} title={o.wind != null ? `${Math.round(o.wind)} km/h da ${cardinal(o.dir)}${o.gust != null ? ` · raffiche ${Math.round(o.gust)}` : ""}` : undefined}>
                        {o.dir != null && <ArrowUp size={11} className="rv-mdir" style={{ transform: `rotate(${o.dir + 180}deg)` }} />}
                        <b className={o.wind != null ? (o.wind >= 30 ? "rv-no" : o.wind >= 18 ? "rv-mid" : "") : undefined}>{o.wind != null ? Math.round(o.wind) : "—"}</b>
                        <i>{o.gust != null ? Math.round(o.gust) : "—"}</i>
                      </span>
                    ))}
                  </div>
                  <div className="rv-mrow" role="row">
                    <span className="rv-mlabel">Term.</span>
                    {timeline.map((o) => (
                      <span key={o.hour} className={"rv-mcell has-bar" + (o.hour === selectedHour ? " is-sel" : "")} onClick={() => onHourSelect(o.hour)} title={o.rateo != null ? `rateo ${o.rateo.toFixed(1).replace(".", ",")} m/s${o.baseNubi != null ? ` · base ${o.baseNubi.toLocaleString("it-IT")} m` : ""}` : undefined}>
                        <span className="rv-mbar"><span className={(o.rateo ?? 0) >= 2 ? "is-hot" : (o.rateo ?? 0) > 0 ? "is-warm" : ""} style={{ height: `${Math.min(100, ((o.rateo ?? 0) / maxRateo) * 100)}%` }} /></span>
                        <i>{o.rateo != null && o.rateo > 0 ? "+" + o.rateo.toFixed(1).replace(".", ",") : "—"}</i>
                      </span>
                    ))}
                  </div>
                  <div className="rv-mrow" role="row">
                    <span className="rv-mlabel">Nuvole</span>
                    {timeline.map((o) => (
                      <span key={o.hour} className={"rv-mcell has-bar" + (o.hour === selectedHour ? " is-sel" : "")} onClick={() => onHourSelect(o.hour)} title={`nuvole ${o.cloud ?? "N/D"}% · alte ${o.cloudHigh ?? "—"}% · medie ${o.cloudMid ?? "—"}% · basse ${o.cloudLow ?? "—"}%`}>
                        <span className="rv-mbar rv-mbar-c"><span style={{ height: `${Math.min(100, o.cloud ?? 0)}%` }} /></span>
                        <i>{o.cloud != null ? o.cloud + "%" : "—"}</i>
                      </span>
                    ))}
                  </div>
                  <div className="rv-mrow" role="row">
                    <span className="rv-mlabel">Um.</span>
                    {timeline.map((o) => (
                      <span key={o.hour} className={"rv-mcell" + (o.hour === selectedHour ? " is-sel" : "")} onClick={() => onHourSelect(o.hour)} title={`umidità ${o.humidity != null ? Math.round(o.humidity) + "%" : "N/D"} · rugiada ${o.dew != null ? Math.round(o.dew) + "°" : "N/D"}`}>
                        <i className="rv-mval">{o.humidity != null ? Math.round(o.humidity) + "%" : "—"}</i>
                      </span>
                    ))}
                  </div>
                  <div className="rv-mrow" role="row">
                    <span className="rv-mlabel">UV</span>
                    {timeline.map((o) => (
                      <span key={o.hour} className={"rv-mcell" + (o.hour === selectedHour ? " is-sel" : "")} onClick={() => onHourSelect(o.hour)} title={`indice UV ${o.uv != null ? o.uv.toFixed(1).replace(".", ",") : "N/D"}`}>
                        <i className={"rv-mval" + ((o.uv ?? 0) >= 6 ? " rv-no" : (o.uv ?? 0) >= 3 ? " rv-mid" : "")}>{o.uv != null ? o.uv.toFixed(1).replace(".", ",") : "—"}</i>
                      </span>
                    ))}
                  </div>
                  <div className="rv-mrow" role="row">
                    <span className="rv-mlabel">Pioggia</span>
                    {timeline.map((o) => (
                      <span key={o.hour} className={"rv-mcell" + (o.hour === selectedHour ? " is-sel" : "") + ((o.rain ?? 0) > 0 ? " is-wet" : "")} onClick={() => onHourSelect(o.hour)} title={`pioggia ${o.rain != null ? o.rain.toFixed(1).replace(".", ",") : "—"} mm/h`}>
                        <i className="rv-mval">{o.rain != null ? o.rain.toFixed(1).replace(".", ",") : "—"}</i>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="rv-legend">vento in km/h (grassetto) con raffiche in piccolo · term. rateo m/s · valori per l'ora selezionata mostrati nelle card</p>
            </div>

            {/* SEZIONI TEMATICHE — metriche correlate raggruppate per la decisione di volo */}
            <div className="rv-sez">
              <div className="rv-sez-head">
                <Sun size={19} className="rv-sez-ico rv-sun" aria-hidden="true" />
                <h4>Il cielo al decollo</h4>
                <span className="rv-sez-time">ore {String(selectedHour).padStart(2, "0")}:00</span>
              </div>
              <div className="rv-sez-grid rv-cols-2">
                <div className="rv-card rv-scene">
                  <WeatherAnimation code={oraSel?.code ?? null} size="hero" />
                  <div className="rv-v rv-big rv-v-scene">
                    <strong className="rv-temp">{oraSel?.temp != null ? Math.round(oraSel.temp) + "°" : "—"}</strong>
                    <strong className="rv-label">{oraSel ? wmoLabel(oraSel.code) : "—"}</strong>
                  </div>
                  <div className="rv-chips rv-chips-scene">
                    <span className="rv-chipv">Pioggia {oraSel?.rain != null ? oraSel.rain.toFixed(1).replace(".", ",") : "—"} mm/h</span>
                    <span className="rv-chipv">Rugiada {oraSel?.dew != null ? Math.round(oraSel.dew) + "°" : "—"}</span>
                    <span className="rv-chipv">Percepita {oraSel?.apparent != null ? Math.round(oraSel.apparent) + "°" : "—"}</span>
                    {data.tempMin != null && data.tempMax != null && <span className="rv-chipv">Giornata {Math.round(data.tempMin)}–{Math.round(data.tempMax)} °C</span>}
                  </div>
                </div>

                <div className="rv-card rv-card-solid rv-accent-cloud">
                  <span className="rv-k">{cloudIcon(oraSel?.cloud ?? null, 15)} Copertura nuvole</span>
                  <div className="rv-v rv-big">{cloudIcon(oraSel?.cloud ?? null)} <strong>{oraSel?.cloud != null ? oraSel.cloud + "%" : "—"}</strong><em className="rv-v-note">{cloudLabel(oraSel?.cloud ?? null)}</em></div>
                  <div className="rv-layers">
                    <span className="rv-layer"><i>Nuvole alte</i><b style={{ width: `${oraSel?.cloudHigh ?? 0}%` }} /><em>{oraSel?.cloudHigh != null ? oraSel.cloudHigh + "%" : "—"}</em></span>
                    <span className="rv-layer"><i>Nuvole medie</i><b style={{ width: `${oraSel?.cloudMid ?? 0}%` }} /><em>{oraSel?.cloudMid != null ? oraSel.cloudMid + "%" : "—"}</em></span>
                    <span className="rv-layer"><i>Nuvole basse</i><b style={{ width: `${oraSel?.cloudLow ?? 0}%` }} /><em>{oraSel?.cloudLow != null ? oraSel.cloudLow + "%" : "—"}</em></span>
                  </div>
                  <div className="rv-mets">
                    <div className="rv-met"><span>Umidità</span><b>{oraSel?.humidity != null ? Math.round(oraSel.humidity) + "%" : "—"}</b></div>
                    <div className="rv-met"><span>Raggio UV</span><b className={(oraSel?.uv ?? 0) >= 6 ? "rv-no" : (oraSel?.uv ?? 0) >= 3 ? "rv-mid" : undefined}>{oraSel?.uv != null ? oraSel.uv.toFixed(1).replace(".", ",") : "—"}</b></div>
                    <div className="rv-met"><span>Pressione</span><b>{oraSel?.pressure != null ? Math.round(oraSel.pressure) + " hPa" : "—"}</b></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rv-sez">
              <div className="rv-sez-head">
                <Wind size={19} className="rv-sez-ico" aria-hidden="true" />
                <h4>Vento</h4>
              </div>
              <div className="rv-sez-grid rv-cols-2">
                <div className="rv-card rv-card-solid rv-accent-wind">
                  <span className="rv-k">Vento al decollo</span>
                  <div className="rv-wind-big">
                    <span className="rv-windrose rv-windrose-lg" aria-hidden="true">{oraSel?.dir != null ? <ArrowUp size={26} style={{ transform: `rotate(${oraSel.dir + 180}deg)` }} /> : "—"}</span>
                    <div className="rv-wind-main">
                      <strong className="rv-val-xl">{oraSel?.wind != null ? Math.round(oraSel.wind) + " km/h" : "—"}</strong>
                      <span className="rv-dir-line">{oraSel?.dir != null ? `proveniente da ${cardinal(oraSel.dir)} (${oraSel.dir}°)` : "direzione non disponibile"}{oraSel?.gust != null ? ` · raffiche fino a ${Math.round(oraSel.gust)} km/h` : ""}</span>
                    </div>
                  </div>
                  <div className="rv-wind-bar" aria-hidden="true"><span className={(oraSel?.wind ?? 0) >= 40 ? "is-strong" : (oraSel?.wind ?? 0) >= 25 ? "is-mid" : ""} style={{ width: `${Math.min(100, ((oraSel?.wind ?? 0) / 60) * 100)}%` }} /></div>
                  {oraSel?.windRel && <p className="rv-sub">Vento {oraSel.windRel} all&apos;esposizione del decollo</p>}
                </div>

                <div className="rv-card rv-card-solid rv-accent-ok">
                  <span className="rv-k">Volo veleggiato</span>
                  <div className="rv-v"><strong className={data.veleggiata.livello === "OTTIME" || data.veleggiata.livello === "BUONE" ? "rv-ok" : data.veleggiata.livello === "MEDIATE" ? "rv-mid" : "rv-no"}>{data.veleggiata.livello.toLowerCase()}</strong></div>
                  <p className="rv-sub">{data.veleggiata.motivo}</p>
                </div>
              </div>
            </div>

            <div className="rv-sez">
              <div className="rv-sez-head">
                <Gauge size={19} className="rv-sez-ico" aria-hidden="true" />
                <h4>Termiche &amp; quote</h4>
              </div>
              <div className="rv-sez-grid rv-cols-4">
                <div className="rv-card rv-card-solid rv-accent-therm">
                  <span className="rv-k">Ascendenza</span>
                  <div className="rv-v"><strong>{oraSel?.rateo != null && oraSel.rateo > 0 ? "+" + oraSel.rateo.toFixed(1).replace(".", ",") + " m/s" : "assenti"}</strong></div>
                  <p className="rv-sub">{oraSel?.indice != null ? `volabilità ${oraSel.indice}/10 ${oraSel.indiceLabel ?? ""}` : "—"}</p>
                </div>

                <div className="rv-card rv-card-solid rv-accent-cloud">
                  <span className="rv-k">Base cumuli</span>
                  <div className="rv-v"><strong>{oraSel?.baseNubi != null ? oraSel.baseNubi.toLocaleString("it-IT") + " m" : "—"}</strong></div>
                  <p className="rv-sub">{oraSel?.baseNubi != null ? `${Math.round(oraSel.baseNubi - quota).toLocaleString("it-IT")} m di soglia dal decollo` : "—"}</p>
                </div>

                <div className="rv-card rv-card-solid rv-accent-cold">
                  <span className="rv-k">Zero termico</span>
                  <div className="rv-v"><strong>{oraSel?.freezing != null ? Math.round(oraSel.freezing).toLocaleString("it-IT") + " m" : "—"}</strong></div>
                  <p className="rv-sub">{oraSel?.freezing != null ? `${Math.round(oraSel.freezing - quota).toLocaleString("it-IT")} m sopra il decollo` : "—"}</p>
                </div>

                <div className="rv-card rv-card-solid rv-accent-alt">
                  <span className="rv-k">Quota max utile</span>
                  <div className="rv-v"><strong>{data.topRange ? data.topRange[1].toLocaleString("it-IT") + " m" : "—"}</strong></div>
                  <p className="rv-sub">{data.topRange ? `range base ${data.topRange[0].toLocaleString("it-IT")}–${data.topRange[1].toLocaleString("it-IT")} m` : "—"}</p>
                </div>
              </div>
            </div>

            <div className="rv-sez">
              <div className="rv-sez-head">
                <Timer size={19} className="rv-sez-ico" aria-hidden="true" />
                <h4>La decisione di volo</h4>
              </div>
              <div className="rv-sez-grid rv-cols-2">
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
