"use client";

/**
 * Confronto meteo tra decolli — finestra flottante (portal in body) con 4 slot
 * a scelta dall'elenco: indice di volabilità, vento, termiche, base nubi, temp,
 * pioggia, nuvolosità e zero termico affiancati, con la colonna migliore
 * evidenziata («Meglio volare qui»).
 * Dati: per i siti «vetrina» usa il batch meteo già caricato; per tutti gli
 * altri calcola al volo la previsione Open-Meteo dell'ora corrente con lo
 * stesso indice di volabilità delle card. Trascinabile dalla barra del titolo,
 * ridimensionabile dall'angolo; posizione, dimensione e scelta dei siti
 * restano salvate nel browser.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Scale, X } from "lucide-react";
import type { Decollo } from "@/data/decolli";
import type { AggressiveWeatherData } from "@/components/DecolliCard";
import { calcolaIndiceVolabilita, esposizioneToGradi } from "@/utils/indiceVolabilita";
import { fetchHourly } from "@/lib/openMeteoClient";

type CardItem = Decollo & { aggressiveWeather?: AggressiveWeatherData | null };

interface ConfrontoDecolliProps {
  decolli: CardItem[];
  open: boolean;
  onClose: () => void;
  onSelect: (item: Decollo) => void;
  onOpenInfo: (item: Decollo) => void;
  selectedId?: string;
}

const POS_KEY = "cmp-panel-pos";
const SIZE_KEY = "cmp-panel-size";
const PICKS_KEY = "cmp-sites";
const MIN_W = 560;
const MIN_H = 320;
const HOURLY_PARAMS =
  "temperature_2m,dew_point_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cape,weather_code,freezing_level_height";

function cardinal(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "N/D";
  return ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"][
    Math.round((((deg % 360) + 360) % 360) / 22.5) % 16
  ];
}

/* Stato del cielo in italiano dal codice WMO */
function wmoLabel(code: number | null | undefined): string {
  if (code == null) return "N/D";
  if (code <= 1) return "Sereno";
  if (code === 2) return "Variabile";
  if (code === 3) return "Coperto";
  if (code === 45 || code === 48) return "Nebbia";
  if (code >= 51 && code <= 57) return "Pioviggine";
  if (code >= 61 && code <= 67) return "Pioggia";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Rovesci";
  if (code === 85 || code === 86) return "Nevicate";
  if (code >= 95) return "Temporale";
  return "N/D";
}

/* "+1,2 m/s" → 1.2 (spareggio tra indici pari: vince la termica più forte) */
function parseMs(v: string | number | null | undefined): number {
  const m = /([+-]?[0-9]+(?:[.,][0-9]+)?)/.exec(String(v ?? ""));
  return m ? Number.parseFloat(m[1].replace(",", ".")) : -999;
}

function num(v: string | number | null | undefined, unit: string, digits = 0): string {
  if (v === null || v === undefined || v === "" || v === "N/D" || v === "--") return "N/D";
  const n = Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + unit;
}

/* Lettura unificata per la colonna di confronto (batch o calcolo live) */
interface CmpRead {
  indice: number | null;
  label?: string;
  wind: number | null;
  gusts: number | null;
  dir: number | null;
  temp: number | null;
  rain: number | null;
  cloud: number | null;
  baseNubi: string | null;
  termiche: string | null;
  freezing: number | null;
  stato: string | null;
  thermMs: number;
}

function batchRead(w: AggressiveWeatherData): CmpRead {
  const n = (v: string | number | null | undefined): number | null => {
    if (v === null || v === undefined || v === "" || v === "N/D" || v === "--") return null;
    const x = Number.parseFloat(String(v));
    return Number.isFinite(x) ? x : null;
  };
  return {
    indice: w.indice != null ? Number(w.indice) : null,
    label: w.indiceLabel,
    wind: n(w.wind),
    gusts: null,
    dir: n(w.dir),
    temp: n(w.temp),
    rain: n(w.rain),
    cloud: n(w.cloud),
    baseNubi: w.baseNubi || null,
    termiche: w.termiche || null,
    freezing: w.freezingLevel != null ? Number(w.freezingLevel) : null,
    stato: w.stato || null,
    thermMs: parseMs(w.termiche),
  };
}

/* Calcolo live: previsione Open-Meteo dell'ora corrente + indice di volabilità */
async function liveRead(item: Decollo): Promise<CmpRead | null> {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const quota = Number(item.elevation_m ?? item.altitude ?? 0) || 0;
  const esposizione = item.orientation || item.exposure || "";
  const today = new Date().toISOString().split("T")[0];
  const raw = await fetchHourly(lat, lon, HOURLY_PARAMS, today, today);
  const h = (raw as { hourly?: Record<string, Array<number | string | null> | undefined> }).hourly;
  const times = (h?.time as string[] | undefined) ?? [];
  if (!times.length) return null;
  const nowH = new Date().getHours();
  let idx = times.findIndex((t) => /T(\d{2})/.test(t) && Number(/T(\d{2})/.exec(t)?.[1]) === nowH);
  if (idx < 0) idx = Math.min(times.length - 1, Math.max(0, nowH));
  const at = (k: string): number | null => {
    const v = h?.[k]?.[idx];
    return v == null ? null : Number(v);
  };
  const temp = at("temperature_2m");
  const res = calcolaIndiceVolabilita({
    windSpeed: at("wind_speed_10m") ?? 0,
    windGusts: at("wind_gusts_10m") ?? undefined,
    windDir: at("wind_direction_10m") ?? esposizioneToGradi(esposizione),
    esposizione,
    temperature: temp ?? 12,
    dewPoint: at("dew_point_2m") ?? (temp ?? 12) - 3,
    cloudCover: at("cloud_cover") ?? 50,
    precipitation: at("precipitation") ?? 0,
    weatherCode: at("weather_code") ?? undefined,
    cape: at("cape") ?? undefined,
    quota,
  });
  const rateo = res.rateoTermicoMs;
  return {
    indice: res.indice,
    label: res.label,
    wind: at("wind_speed_10m"),
    gusts: at("wind_gusts_10m"),
    dir: at("wind_direction_10m"),
    temp,
    rain: at("precipitation"),
    cloud: at("cloud_cover"),
    baseNubi: res.baseNubiM != null ? Math.round(res.baseNubiM).toLocaleString("it-IT") + " m" : null,
    termiche: rateo > 0.05 ? "+" + rateo.toFixed(1).replace(".", ",") + " m/s" : "Assenti",
    freezing: at("freezing_level_height"),
    stato: wmoLabel(at("weather_code")),
    thermMs: rateo ?? -999,
  };
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* assente o corrotto: si usa il fallback */ }
  return fallback;
}

function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage pieno/bloccato */ }
}

function clampXY(x: number, y: number, w: number, h: number) {
  return {
    x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - w - 8)),
    y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - h - 8)),
  };
}

function clampWH(w: number, h: number) {
  return {
    w: Math.min(Math.max(MIN_W, w), Math.max(MIN_W, window.innerWidth - 16)),
    h: Math.min(Math.max(MIN_H, h), Math.max(MIN_H, window.innerHeight - 16)),
  };
}

/* Scelta predefinita: il decollo selezionato + i primi siti dell'elenco */
function initialPicks(decolli: CardItem[], selectedId?: string): string[] {
  const saved = loadJSON<string[]>(PICKS_KEY, []);
  const valid = saved.filter((id) => decolli.some((d) => d.id === id));
  const seed = [selectedId, ...decolli.map((d) => d.id)];
  const picks: string[] = [];
  for (const id of [...valid, ...seed]) {
    if (picks.length >= 4) break;
    if (id && !picks.includes(id) && decolli.some((d) => d.id === id)) picks.push(id);
  }
  while (picks.length < 4) picks.push("");
  return picks;
}

function IndexChip({ indice, label }: { indice: number | null; label?: string }) {
  if (indice == null) return <span className="cmp-index is-na">N/D</span>;
  // scala pilota condivisa: alto = buono
  const cls = indice >= 7 ? "is-good" : indice >= 5 ? "is-fair" : "is-bad";
  return (
    <span className={"cmp-index " + cls} title="Indice di volabilità: 10 = volo ideale, 1 = pericoloso">
      <strong>{indice}/10</strong>
      {label && <em>{label}</em>}
    </span>
  );
}

export default function ConfrontoDecolli({ decolli, open, onClose, onSelect, onOpenInfo, selectedId }: ConfrontoDecolliProps) {
  const [picks, setPicks] = useState<string[]>(() => initialPicks(decolli, selectedId));
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => loadJSON(POS_KEY, null));
  const [size, setSize] = useState<{ w: number; h: number } | null>(() => loadJSON(SIZE_KEY, null));
  const [live, setLive] = useState<Record<string, CmpRead | null>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const rzRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const liveCache = useRef<Map<string, Promise<CmpRead | null>>>(new Map());

  useEffect(() => { saveJSON(PICKS_KEY, picks); }, [picks]);

  /* per i siti fuori dal batch vetrina: previsione live dell'ora corrente */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const run = async () => {
      const jobs: string[] = [];
      for (const id of picks) {
        if (!id) continue;
        const item = decolli.find((d) => d.id === id);
        if (!item) continue;
        const hasBatch = item.aggressiveWeather && item.aggressiveWeather.indice != null;
        if (hasBatch) continue;
        if (liveCache.current.has(id)) continue;
        jobs.push(id);
      }
      if (!jobs.length) return;
      setPending((p) => ({ ...p, ...Object.fromEntries(jobs.map((id) => [id, true])) }));
      await Promise.all(jobs.map(async (id) => {
        const item = decolli.find((d) => d.id === id);
        if (!item) return;
        const pr = liveRead(item).catch(() => null);
        liveCache.current.set(id, pr);
        const res = await pr;
        if (alive) setLive((m) => ({ ...m, [id]: res }));
      }));
      if (alive) setPending((p) => ({ ...p, ...Object.fromEntries(jobs.map((id) => [id, false])) }));
    };
    run();
    return () => { alive = false; };
  }, [picks, decolli, open]);

  useEffect(() => {
    const onResize = () => {
      setSize((s) => (s ? clampWH(s.w, s.h) : s));
      setPos((p) => {
        if (!p) return p;
        const el = boxRef.current;
        return clampXY(p.x, p.y, el?.offsetWidth ?? 900, el?.offsetHeight ?? 560);
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sorted = useMemo(
    () => [...decolli].sort((a, b) => (a.site_name || a.name).localeCompare(b.site_name || b.name, "it-IT")),
    [decolli],
  );
  const chosen = useMemo(
    () => picks.map((id) => (id ? decolli.find((d) => d.id === id) ?? null : null)),
    [picks, decolli],
  );

  /* lettura per colonna: batch se disponibile, altrimenti live calcolata */
  const reads = useMemo<(CmpRead | null)[]>(() => chosen.map((c) => {
    if (!c) return null;
    const w = c.aggressiveWeather;
    if (w && w.indice != null) return batchRead(w);
    return live[c.id] ?? null;
  }), [chosen, live]);

  /* Il migliore: indice più alto (scala pilota: 10 = volo ideale); a parità
     di indice vince la termica più forte. Batch e live ora parlano la stessa
     scala, il confronto è finalmente corretto. */
  const bestId = useMemo(() => {
    let best: { id: string; indice: number; therm: number } | null = null;
    for (let i = 0; i < chosen.length; i++) {
      const c = chosen[i];
      const r = reads[i];
      if (!c || !r || r.indice == null) continue;
      if (!best || r.indice > best.indice || (r.indice === best.indice && r.thermMs > best.therm)) {
        best = { id: c.id, indice: r.indice, therm: r.thermMs };
      }
    }
    return best?.id ?? null;
  }, [chosen, reads]);

  if (!open) return null;

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
    setPos(clampXY(ev.clientX - d.dx, ev.clientY - d.dy, el?.offsetWidth ?? 900, el?.offsetHeight ?? 560));
  };
  const onHeadPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setPos((p) => { saveJSON(POS_KEY, p); return p; });
  };
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
    setSize(clampWH(r.w + (ev.clientX - r.x), r.h + (ev.clientY - r.y)));
  };
  const onRzPointerUp = () => {
    if (!rzRef.current) return;
    rzRef.current = null;
    setSize((s) => { saveJSON(SIZE_KEY, s); return s; });
  };

  const st: React.CSSProperties = {};
  if (pos) { st.left = pos.x; st.top = pos.y; st.right = "auto"; }
  if (size) { st.width = size.w; st.height = size.h; }

  const hasAnyData = reads.some((r) => r && r.indice != null);

  return createPortal(
    <div ref={boxRef} className="cmp-window" data-testid="confronto-decolli" style={st} role="dialog" aria-label="Confronto meteo di 4 decolli">
      <button type="button" className="cmap-close cmap-close-float" onClick={onClose} title="Chiudi il confronto" aria-label="Chiudi il confronto">
        <X size={14} aria-hidden="true" />
      </button>
      <span
        className="cmap-rz is-se"
        title="Trascina dall'angolo per allargare o restringere"
        aria-hidden="true"
        onPointerDown={onRzPointerDown}
        onPointerMove={onRzPointerMove}
        onPointerUp={onRzPointerUp}
        onPointerCancel={onRzPointerUp}
      />

      <div
        className="cmp-head"
        title="Trascina dalla barra del titolo per spostare la finestra"
        onPointerDown={onHeadPointerDown}
        onPointerMove={onHeadPointerMove}
        onPointerUp={onHeadPointerUp}
        onPointerCancel={onHeadPointerUp}
      >
        <h3><Scale size={15} aria-hidden="true" /> Confronta fino a 4 decolli</h3>
        <p>Scegli i siti e guarda dove conviene volare: la colonna migliore è evidenziata in giallo.</p>
      </div>

      <div className="cmp-body">
        <div className="cmp-pickers">
          {[0, 1, 2, 3].map((i) => (
            <label className="cmp-pick" key={i}>
              <span>Decollo {i + 1}</span>
              <select
                value={picks[i]}
                onChange={(ev) => {
                  const id = ev.target.value;
                  setPicks((p) => p.map((v, j) => (j === i ? id : id && v === id ? "" : v)));
                }}
                aria-label={"Scegli il decollo " + (i + 1) + " da confrontare"}
              >
                <option value="">— scegli un decollo —</option>
                {sorted.map((d) => (
                  <option key={d.id} value={d.id} disabled={picks.includes(d.id) && picks[i] !== d.id}>
                    {(d.site_name || d.name)} · {d.location_name || d.valley || ""}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="cmp-grid" data-testid="confronto-grid">
          {chosen.map((c, i) => {
            const r = reads[i];
            const isLoading = c != null && (pending[c.id] === true || (r == null && live[c.id] === undefined && c.aggressiveWeather?.indice == null && (c.aggressiveWeather == null || c.aggressiveWeather.indice == null)));
            const isBest = c != null && c.id === bestId;
            return (
              <div className={"cmp-col" + (isBest ? " is-best" : "")} key={i}>
                {isBest && <span className="cmp-best-badge" title="Condizioni complessive migliori tra i decolli scelti">★ Meglio volare qui</span>}
                {c ? (
                  <>
                    <strong className="cmp-name" title={c.location_name || c.valley || ""}>{c.site_name || c.name}</strong>
                    <span className="cmp-meta">{c.location_name || c.valley || "—"} · {Number(c.elevation_m ?? c.altitude ?? 0).toLocaleString("it-IT")} m</span>
                    <div className="cmp-row">
                      {isLoading ? (
                        <span className="cmp-index is-na">Calcolo meteo…</span>
                      ) : (
                        <IndexChip indice={r?.indice ?? null} label={r?.label} />
                      )}
                    </div>
                    <dl className="cmp-data">
                      <div><dt>Stato</dt><dd>{isLoading ? "…" : r?.stato || "N/D"}</dd></div>
                      <div><dt>Vento</dt><dd>{isLoading ? "…" : r ? num(r.wind, " km/h") + " · da " + cardinal(r.dir) : "N/D"}</dd></div>
                      <div><dt>Termiche</dt><dd>{isLoading ? "…" : r?.termiche || "N/D"}</dd></div>
                      <div><dt>Base nubi</dt><dd>{isLoading ? "…" : r?.baseNubi || "N/D"}</dd></div>
                      <div><dt>Temp</dt><dd>{isLoading ? "…" : r ? num(r.temp, "°") : "N/D"}</dd></div>
                      <div><dt>Pioggia</dt><dd>{isLoading ? "…" : r ? num(r.rain, " mm", 1) : "N/D"}</dd></div>
                      <div><dt>Nuvolosità</dt><dd>{isLoading ? "…" : r ? num(r.cloud, "%") : "N/D"}</dd></div>
                      <div><dt>Zero termico</dt><dd>{isLoading ? "…" : r && r.freezing != null ? Math.round(r.freezing).toLocaleString("it-IT") + " m" : "N/D"}</dd></div>
                    </dl>
                    <div className="cmp-actions">
                      <button type="button" className="cmp-btn" onClick={() => onSelect(c)}>Seleziona sulle mappe</button>
                      <button type="button" className="cmp-btn is-info" onClick={() => onOpenInfo(c)}>Informazioni</button>
                    </div>
                  </>
                ) : (
                  <span className="cmp-empty">Slot vuoto: scegli un decollo qui sopra.</span>
                )}
              </div>
            );
          })}
        </div>

        <p className="cmp-note">
          Confronto all'ora corrente: per i decolli «vetrina» valgono i dati del batch meteo, per gli altri la
          previsione Open-Meteo viene calcolata al momento con lo stesso indice di volabilità (1 = perfetto,
          10 = pericoloso; a parità di indice vince chi ha le termiche più forti). Verifica sempre anche il
          bollettino di dettaglio del singolo decollo prima di volare.
        </p>
        {!hasAnyData && <p className="cmp-note is-warn">Nessun dato ancora disponibile per i decolli scelti: attendi qualche secondo o prova un altro sito.</p>}
      </div>
    </div>,
    document.body,
  );
}
