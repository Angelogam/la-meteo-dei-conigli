"use client";

/**
 * Confronto meteo tra decolli — finestra flottante (portal in body) con 4 slot
 * a scelta dall'elenco: indice di volabilità, vento, termiche, base nubi, temp,
 * pioggia, nuvolosità e zero termico affiancati, con la colonna migliore
 * evidenziata («Meglio volare qui»). Trascinabile dalla barra del titolo,
 * ridimensionabile dall'angolo; posizione, dimensione e scelta dei siti
 * restano salvate nel browser.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Scale, X } from "lucide-react";
import type { Decollo } from "@/data/decolli";
import type { AggressiveWeatherData } from "@/components/DecolliCard";

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

function cardinal(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "N/D";
  return ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"][
    Math.round((((deg % 360) + 360) % 360) / 22.5) % 16
  ];
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

/* Scelta predefinita: il decollo selezionato + i primi siti con dati meteo */
function initialPicks(decolli: CardItem[], selectedId?: string): string[] {
  const saved = loadJSON<string[]>(PICKS_KEY, []);
  const valid = saved.filter((id) => decolli.some((d) => d.id === id));
  const withData = decolli.filter((d) => d.aggressiveWeather && d.aggressiveWeather.indice != null).map((d) => d.id);
  const seed = [selectedId, ...withData, ...decolli.map((d) => d.id)];
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
  const cls = indice <= 4 ? "is-good" : indice <= 6 ? "is-fair" : "is-bad";
  return (
    <span className={"cmp-index " + cls} title="Indice di volabilità: 1 = perfetto, 10 = pericoloso">
      <strong>{indice}/10</strong>
      {label && <em>{label}</em>}
    </span>
  );
}

export default function ConfrontoDecolli({ decolli, open, onClose, onSelect, onOpenInfo, selectedId }: ConfrontoDecolliProps) {
  const [picks, setPicks] = useState<string[]>(() => initialPicks(decolli, selectedId));
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => loadJSON(POS_KEY, null));
  const [size, setSize] = useState<{ w: number; h: number } | null>(() => loadJSON(SIZE_KEY, null));
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const rzRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => { saveJSON(PICKS_KEY, picks); }, [picks]);

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

  /* Il migliore: indice più basso; a parità di indice vince la termica più forte */
  const bestId = useMemo(() => {
    let best: { id: string; indice: number; therm: number } | null = null;
    for (const c of chosen) {
      const w = c?.aggressiveWeather;
      if (!c || !w || w.indice == null) continue;
      const therm = parseMs(w.termiche);
      if (!best || w.indice < best.indice || (w.indice === best.indice && therm > best.therm)) {
        best = { id: c.id, indice: w.indice, therm };
      }
    }
    return best?.id ?? null;
  }, [chosen]);

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

  const hasAnyData = chosen.some((c) => c?.aggressiveWeather && c.aggressiveWeather.indice != null);

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
            const w = c?.aggressiveWeather ?? null;
            const isBest = c != null && c.id === bestId;
            return (
              <div className={"cmp-col" + (isBest ? " is-best" : "")} key={i}>
                {isBest && <span className="cmp-best-badge" title="Condizioni complessive migliori tra i decolli scelti">★ Meglio volare qui</span>}
                {c ? (
                  <>
                    <strong className="cmp-name" title={c.location_name || c.valley || ""}>{c.site_name || c.name}</strong>
                    <span className="cmp-meta">{c.location_name || c.valley || "—"} · {Number(c.elevation_m ?? c.altitude ?? 0).toLocaleString("it-IT")} m</span>
                    <div className="cmp-row"><IndexChip indice={w && w.indice != null ? w.indice : null} label={w?.indiceLabel} /></div>
                    <dl className="cmp-data">
                      <div><dt>Stato</dt><dd>{w?.stato || "N/D"}</dd></div>
                      <div><dt>Vento</dt><dd>{num(w?.wind, " km/h")} · da {cardinal(w && w.dir != null ? Number(w.dir) : null)}</dd></div>
                      <div><dt>Termiche</dt><dd>{w?.termiche || "N/D"}</dd></div>
                      <div><dt>Base nubi</dt><dd>{w?.baseNubi || "N/D"}</dd></div>
                      <div><dt>Temp</dt><dd>{num(w?.temp, "°")}</dd></div>
                      <div><dt>Pioggia</dt><dd>{num(w?.rain, " mm", 1)}</dd></div>
                      <div><dt>Nuvolosità</dt><dd>{num(w?.cloud, "%")}</dd></div>
                      <div><dt>Zero termico</dt><dd>{w && w.freezingLevel != null ? Math.round(Number(w.freezingLevel)).toLocaleString("it-IT") + " m" : "N/D"}</dd></div>
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
          Confronto sulle condizioni attuali del batch meteo (indice di volabilità 1 = perfetto, 10 = pericoloso;
          a parità di indice vince chi ha le termiche più forti). Verifica sempre anche il bollettino di dettaglio
          del singolo decollo prima di volare.
        </p>
        {!hasAnyData && <p className="cmp-note is-warn">Nessuno dei decolli scelti ha ancora dati meteo: riprova tra poco.</p>}
      </div>
    </div>,
    document.body,
  );
}
