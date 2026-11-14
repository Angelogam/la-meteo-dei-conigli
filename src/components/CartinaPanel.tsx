"use client";

/**
 * Scheda di volo del decollo — la finestra a scomparsa della cartina grande:
 * - verdetto + badge relazione vento + avvisi di sicurezza (coda/sottovento ecc.)
 * - ANALISI AEROLOGICA: banner di instabilità (Stabile → Debole → Moderata → Forte → Cross),
 *   grafico orario con la SCALA DELL'INSTABILITÀ (blu = aria buona, giallo/arancio = instabile,
 *   rosso = molto instabile → termiche super forti, ottime per il cross) e legenda
 * - schede dati capibili: zero termico, base nubi, CAPE, temp/rugiada, turbolenza, temporali
 * - rosa dei venti con la direzione in parole ("Vento da Nord-Nord Ovest")
 * Ogni barra del grafico è cliccabile: aggiorna l'ora della cartina e tutti i dati del pannello.
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Flame, GripVertical, MapPin, Sun, X } from "lucide-react";
import type { CartinaDecollo, HourEval } from "@/components/CartinaMeteo";
import type { HourlyPoint } from "@/services/threeSourceWeather";
import CartinaSky from "@/components/CartinaSky";

export interface PanelHour {
  hour: number;
  rateo: number;
  classe: "is-good" | "is-fair" | "is-bad";
  wind: number | null;
  gusts: number | null;
  point?: HourlyPoint;
}

export interface PanelSnapshot {
  item: CartinaDecollo;
  eval: HourEval | null;
  point?: HourlyPoint | null;
}

interface CartinaPanelProps {
  snapshot: PanelSnapshot | null;
  hours: PanelHour[];
  hour: number;
  onClose: () => void;
  onPickHour: (h: number) => void;
  onUse: () => void;
}

const REL_LABEL: Record<string, string> = {
  frontale: "IN FRONTE",
  diagonale: "DIAGONALE",
  laterale: "LATERALE",
  di_coda: "IN CODA",
  sconosciuto: "",
};

/* Direzione in parole complete (per la rosa dei venti) */
const DIR_FULL: Record<string, string> = {
  N: "Nord", NNE: "Nord-Nord Est", NE: "Nord-Est", ENE: "Est-Nord Est",
  E: "Est", ESE: "Est-Sud Est", SE: "Sud-Est", SSE: "Sud-Sud Est",
  S: "Sud", SSO: "Sud-Sud Ovest", SO: "Sud-Ovest", OSO: "Ovest-Sud Ovest",
  O: "Ovest", ONO: "Ovest-Nord Ovest", NO: "Nord-Ovest", NNO: "Nord-Nord Ovest",
};

function cardinal(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "–";
  return ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"][
    Math.round((((deg % 360) + 360) % 360) / 22.5) % 16
  ];
}

/* ============ SCALA DELL'INSTABILITÀ (il cuore del pannello) ============
 * blu → aria stabile / termiche deboli: poco buono
 * giallo → convezione moderata: si vola
 * arancio → instabilità forte: ascendenze sostenute
 * rosso → aria molto instabile: termiche super forti, ottime per il cross
 * Le soglie seguono il rateo (m/s) che alimenta anche l'altezza delle barre. */

type InstLevel = "is-stable" | "is-weak" | "is-moderate" | "is-strong" | "is-cross";

interface InstRead {
  level: InstLevel;
  label: string;
  fill: string; // gradiente per la barra
  flat: string; // colore pieno per legenda/banner
}

const INST: Record<InstLevel, { label: string; flat: string }> = {
  "is-stable": { label: "Stabile", flat: "#5a6f88" },
  "is-weak": { label: "Debole", flat: "#38bdf8" },
  "is-moderate": { label: "Moderata", flat: "#facc15" },
  "is-strong": { label: "Forte", flat: "#fb923c" },
  "is-cross": { label: "Cross", flat: "#f87171" },
};

function instabilita(rateo: number | null | undefined): InstRead {
  const r = rateo ?? 0;
  if (r <= 0.18) return { level: "is-stable", ...INST["is-stable"], fill: "linear-gradient(180deg, #7d90a8, #47566b)" };
  if (r < 0.8) return { level: "is-weak", ...INST["is-weak"], fill: "linear-gradient(180deg, #7dd3fc, #2f96d8)" };
  if (r < 1.5) return { level: "is-moderate", ...INST["is-moderate"], fill: "linear-gradient(180deg, #fde047, #eab308)" };
  if (r < 2.4) return { level: "is-strong", ...INST["is-strong"], fill: "linear-gradient(180deg, #fdba74, #f97316)" };
  return { level: "is-cross", ...INST["is-cross"], fill: "linear-gradient(180deg, #fca5a5, #ef4444)" };
}

/* Banner di instabilità: classificazione parlata dell'ora selezionata */
function bannerInstabilita(rateo: number | null | undefined, cape: number | null | undefined) {
  const r = rateo ?? 0;
  if (r >= 2.4)
    return {
      level: "is-cross",
      strong: "CROSS",
      text: "Aria molto instabile: termiche super forti, ottime per il cross." +
        ((cape ?? 0) >= 800 ? " Energia in più dal CAPE: occhio allo sviluppo nuvoloso e ai temporali." : " Attenzione allo sviluppo nuvoloso e ai temporali."),
    };
  if (r >= 1.5)
    return {
      level: "is-strong",
      strong: "FORTE",
      text: "Instabilità marcata: ascendenze sostenute e guadagni rapidi. Il vento in quota può rinforzare nel pomeriggio.",
    };
  if (r >= 0.8)
    return {
      level: "is-moderate",
      strong: "MODERATA",
      text: "Convezione avviata: bolle regolari e volabile con buon margine. Ideale per la quota e per allenarsi.",
    };
  if (r >= 0.18)
    return {
      level: "is-weak",
      strong: "DEBOLE",
      text: "Termiche timide: serve pazienza e precisione. Meglio i pendii più esposti al sole.",
    };
  return {
    level: "is-stable",
    strong: "STABILE",
    text: "Aria stabile: niente bolle utilizzabili, si vola in discesa. Meglio riposare o studiare il decollo.",
  };
}

/* Stato del cielo in italiano dal codice WMO */
function statoLabel(code: number | null | undefined): string {
  if (code == null) return "—";
  if (code <= 1) return "Sereno";
  if (code === 2) return "Poco nuvoloso";
  if (code === 3) return "Coperto";
  if (code === 45 || code === 48) return "Nebbia";
  if (code >= 51 && code <= 57) return "Pioviggine";
  if (code >= 61 && code <= 67) return "Pioggia";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Rovesci";
  if (code === 85 || code === 86) return "Nevicate";
  if (code >= 95) return "Temporale";
  return "—";
}

/* CAPE in parole */
function capeRead(cape: number | null | undefined): { label: string; cls: string } {
  const c = cape ?? 0;
  if (c < 100) return { label: "Stabile", cls: "is-stable" };
  if (c < 300) return { label: "Debole", cls: "is-weak" };
  if (c < 800) return { label: "Moderata", cls: "is-moderate" };
  if (c < 1500) return { label: "Forte", cls: "is-strong" };
  return { label: "Estrema", cls: "is-cross" };
}

/* Temporali: livello di rischio per l'ora */
function stormRead(cape: number | null | undefined, rain: number | null | undefined, code: number | null | undefined) {
  if (code != null && code >= 95) return { label: "In atto", cls: "is-cross", sub: "Temporale segnalato su quest'ora: a terra, subito." };
  const c = cape ?? 0;
  const r = rain ?? 0;
  if (c >= 1000 && (r > 0.2 || (code != null && code >= 61)))
    return { label: "Alto", cls: "is-cross", sub: "Sviluppi possibili: tieni d'occhio i cumuli torreggianti." };
  if (c >= 300 || r > 0.5)
    return { label: "Medio", cls: "is-strong", sub: "Qualche rovescio isolato non è da escludere." };
  return { label: "Basso", cls: "is-stable", sub: "Nessuno sviluppo atteso su quest'ora." };
}

/* Turbolenza: rapporto raffiche/vento */
function turbRead(gusts: number | null | undefined, wind: number | null | undefined) {
  if (gusts == null || wind == null) return { label: "N/D", cls: "is-stable", sub: "Dati raffiche non disponibili." };
  const delta = Math.max(0, gusts - wind);
  const ratio = wind >= 5 ? gusts / wind : 0;
  if (wind < 5) return { label: "Aria ferma", cls: "is-stable", sub: "Vento sotto 5 km/h: nessuna raffica significativa." };
  if (delta < 10) return { label: "Lieve", cls: "is-stable", sub: `Raffiche ÷ vento = ${ratio.toFixed(1)}× (molto sotto la soglia)` };
  if (delta < 18) return { label: "Moderata", cls: "is-moderate", sub: `Raffiche ÷ vento = ${ratio.toFixed(1)}× (giri da gestire in avvicinamento)` };
  return { label: "Forte", cls: "is-cross", sub: `Raffiche ÷ vento = ${ratio.toFixed(1)}× (sopra 2× giri bruschi)` };
}

/* Miglior finestra contigua della giornata (somma massima di rateo) e ore realmente buone.
 * Soglia 0.8 m/s = "Moderata" della scala: convezione utilizzabile, non solo brusio. */
const GOOD_MS = 0.8;
function bestWindow(hours: PanelHour[]): { start: number; end: number; good: number } | null {
  const usable = hours.filter((h) => h.rateo >= GOOD_MS);
  if (!usable.length) return null;
  let bestSum = -1;
  let best: { start: number; end: number } | null = null;
  let cur: { start: number; end: number; sum: number } | null = null;
  for (const h of hours) {
    if (h.rateo >= GOOD_MS) {
      cur = cur ? { ...cur, end: h.hour, sum: cur.sum + h.rateo } : { start: h.hour, end: h.hour, sum: h.rateo };
    } else {
      if (cur && cur.sum > bestSum) {
        bestSum = cur.sum;
        best = { start: cur.start, end: cur.end };
      }
      cur = null;
    }
  }
  if (cur && cur.sum > bestSum) best = { start: cur.start, end: cur.end };
  if (!best) return null;
  return { ...best, good: usable.length };
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtMs = (v: number) => "+" + v.toFixed(1).replace(".", ",") + " m/s";

/* ---------- Finestra flottante trascinabile e ridimensionabile ----------
 * La scheda vive a livello di viewport (portal in document.body): niente contenitori
 * che la tagliano. Si trascina dalla barra del titolo e si allarga/restringe dalle
 * maniglie sul bordo (lato destro, lato basso, angolo); posizione e dimensione
 * restano salvate. */
const POS_KEY = "cmap-panel-pos";
const SIZE_KEY = "cmap-panel-size";

type XY = { x: number; y: number };
type WH = { w: number; h: number };

const MIN_W = 280;
const MIN_H = 220;

function loadPos(): XY | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<XY>;
    if (typeof p.x === "number" && typeof p.y === "number") return { x: p.x, y: p.y };
  } catch { /* posizione assente o corrotta: si riparte da quella di default */ }
  return null;
}

function loadSize(): WH | null {
  try {
    const raw = localStorage.getItem(SIZE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<WH>;
    if (typeof s.w === "number" && typeof s.h === "number") return { w: s.w, h: s.h };
  } catch { /* dimensione assente o corrotta: si usa quella di default */ }
  return null;
}

function useFloatingWindow() {
  const [pos, setPos] = useState<XY | null>(loadPos);
  const [size, setSize] = useState<WH | null>(loadSize);
  const boxRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const rzRef = useRef<{ dir: "e" | "s" | "se"; x: number; y: number; w: number; h: number } | null>(null);

  const clampXY = (x: number, y: number) => {
    const el = boxRef.current;
    const w = el?.offsetWidth ?? 406;
    const h = Math.min(el?.offsetHeight ?? 400, window.innerHeight - 16);
    return {
      x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - h - 8)),
    };
  };

  const clampWH = (w: number, h: number) => ({
    w: Math.min(Math.max(MIN_W, w), Math.max(MIN_W, window.innerWidth - 16)),
    h: Math.min(Math.max(MIN_H, h), Math.max(MIN_H, window.innerHeight - 16)),
  });

  /* posizione e dimensione salvate restano dentro lo schermo anche se la finestra cambia */
  useEffect(() => {
    const onWinResize = () => {
      setPos((p) => (p ? clampXY(p.x, p.y) : p));
      setSize((s) => (s ? clampWH(s.w, s.h) : s));
    };
    window.addEventListener("resize", onWinResize);
    return () => window.removeEventListener("resize", onWinResize);
  }, []);

  /* ---- drag dalla barra del titolo ---- */
  const onHandlePointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    if ((ev.target as HTMLElement).closest("button")) return; // il tasto chiudi non trascina
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { dx: ev.clientX - rect.left, dy: ev.clientY - rect.top };
    setPos({ x: rect.left, y: rect.top }); // da questo momento la posizione è esplicita
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  };

  const onHandlePointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setPos(clampXY(ev.clientX - d.dx, ev.clientY - d.dy));
  };

  const onHandlePointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setPos((p) => {
      if (p) {
        try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* storage pieno/bloccato */ }
      }
      return p;
    });
  };

  /* ---- resize dalle maniglie del bordo ---- */
  const onResizePointerDown = (dir: "e" | "s" | "se") => (ev: React.PointerEvent<HTMLSpanElement>) => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rzRef.current = { dir, x: ev.clientX, y: ev.clientY, w: rect.width, h: rect.height };
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    ev.stopPropagation();
  };

  const onResizePointerMove = (ev: React.PointerEvent<HTMLSpanElement>) => {
    const r = rzRef.current;
    if (!r) return;
    const dx = ev.clientX - r.x;
    const dy = ev.clientY - r.y;
    setSize(clampWH(
      r.dir === "s" ? r.w : r.w + dx,
      r.dir === "e" ? r.h : r.h + dy,
    ));
  };

  const onResizePointerUp = () => {
    if (!rzRef.current) return;
    rzRef.current = null;
    setSize((s) => {
      if (s) {
        try { localStorage.setItem(SIZE_KEY, JSON.stringify(s)); } catch { /* storage pieno/bloccato */ }
      }
      return s;
    });
  };

  return {
    boxRef, pos, size,
    onHandlePointerDown, onHandlePointerMove, onHandlePointerUp,
    onResizePointerDown, onResizePointerMove, onResizePointerUp,
  };
}

/* stile combinato posizione + dimensione (solo i valori effettivamente scelti) */
function floatStyle(pos: XY | null, size: WH | null): React.CSSProperties {
  const st: React.CSSProperties = {};
  if (pos) { st.left = pos.x; st.top = pos.y; st.right = "auto"; }
  if (size) { st.width = size.w; st.height = size.h; }
  return st;
}

export default function CartinaPanel({ snapshot, hours, hour, onClose, onPickHour, onUse }: CartinaPanelProps) {
  const {
    boxRef, pos, size,
    onHandlePointerDown, onHandlePointerMove, onHandlePointerUp,
    onResizePointerDown, onResizePointerMove, onResizePointerUp,
  } = useFloatingWindow();

  if (!snapshot) {
    return (
      <aside
        ref={boxRef}
        className="cmap-panelbox is-empty"
        data-testid="cartina-panel"
        style={floatStyle(pos, null)}
      >
        <button type="button" className="cmap-close" onClick={onClose} aria-label="Chiudi il pannello">
          <X size={14} aria-hidden="true" />
        </button>
        <p className="cmap-empty-title">Tocca un decollo sulla cartina</p>
        <p className="cmap-empty-text">
          Si apre l'analisi aerologica completa: il profilo della risalita con parapendio e cumuli, la colonna
          dei venti fino a 4000 metri, zero termico, base nubi, CAPE, turbolenza e rischio temporali — tocca
          un'ora per cambiare ora.
        </p>
      </aside>
    );
  }

  const { item, eval: e } = snapshot;
  const quota = Number(item.elevation_m ?? item.altitude ?? 0);
  const best = hours.length ? hours.reduce((b, h) => (h.rateo > (b?.rateo ?? -1) ? h : b), hours[0]) : null;
  const win = bestWindow(hours);
  const banner = bannerInstabilita(e?.rateo, e?.cape);
  const turb = turbRead(e?.gusts, e?.wind);
  const storm = stormRead(e?.cape, e?.rain, e?.code);
  const cape = capeRead(e?.cape);
  const relBadge = e ? (REL_LABEL[e.rel] ?? "") : "";
  const dirWord = DIR_FULL[cardinal(e?.dir)] ?? cardinal(e?.dir);

  /* Avvisi di sicurezza in testa al pannello */
  const warns: string[] = [];
  if (e) {
    if (e.rel === "di_coda") warns.push("VENTO DI CODA / SOTTOVENTO — PERICOLOSO");
    else if (e.rel === "laterale") warns.push("VENTO LATERALE — occhio al drift in decollo");
    if (e.wind == null) {
      /* niente */
    } else if (e.wind < 5) warns.push("Vento leggero, decollo a corsa");
    else if (e.wind > 25) warns.push("Vento forte al limite");
    if ((e.gusts ?? 0) - (e.wind ?? 0) >= 18) warns.push("raffiche disordinate");
  }

  const gain = e?.baseNubiM != null ? Math.round(e.baseNubiM) - quota : null;
  const spread = e?.temp != null && e?.dew != null ? Math.round(e.temp - e.dew) : null;

  return (
    <aside
      ref={boxRef}
      className="cmap-panelbox"
      data-testid="cartina-panel"
      style={floatStyle(pos, size)}
    >
      {/* X di chiusura sempre visibile in alto a lato: resta a fuoco anche
          scorrendo il contenuto della scheda */}
      <button
        type="button"
        className="cmap-close cmap-close-float"
        onClick={onClose}
        aria-label={"Chiudi la scheda di " + (item.site_name || item.name)}
        title="Chiudi la scheda"
      >
        <X size={14} aria-hidden="true" />
      </button>
      <span
        className="cmap-rz is-e"
        title="Trascina per allargare o restringere"
        aria-hidden="true"
        onPointerDown={onResizePointerDown("e")}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
      />
      <span
        className="cmap-rz is-s"
        title="Trascina per allargare o restringere"
        aria-hidden="true"
        onPointerDown={onResizePointerDown("s")}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
      />
      <span
        className="cmap-rz is-se"
        title="Trascina dall'angolo per allargare o restringere"
        aria-hidden="true"
        onPointerDown={onResizePointerDown("se")}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
      />
      <div className="cmap-panel-scroll">
      <header
        className="cmap-pb-head"
        title="Trascina dalla barra del titolo per spostare la scheda"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
      >
        <div className="cmap-pb-title">
          <h3>
            <GripVertical size={14} className="cmap-drag-grip" aria-hidden="true" />
            {item.site_name || item.name}
          </h3>
          <p>
            <MapPin size={11} aria-hidden="true" /> {item.location_name || item.valley || "—"} ·{" "}
            {quota.toLocaleString("it-IT")} m · Esp. {item.orientation || item.exposure || "N/D"}
          </p>
        </div>
      </header>

      {!e ? (
        <p className="cmap-pb-nodata">
          <AlertTriangle size={14} aria-hidden="true" /> Dati non disponibili per questo sito in questo momento.
        </p>
      ) : (
        <>
          {/* ---- verdetto + relazione vento + ora ---- */}
          <div className={"cmap-verdict " + e.classe}>
            <i className="cmap-verdict-dot" aria-hidden="true" />
            <strong>{e.label}</strong>
            {relBadge && <em className={"cmap-relbadge is-" + e.rel}>{relBadge}</em>}
            <span>Ore {pad2(e.hour)}:00</span>
          </div>

          {warns.length > 0 && (
            <p className="cmap-warn" data-testid="cartina-warn">
              {warns.slice(0, 2).join(" · ")}
            </p>
          )}

          {/* ---- chips: finestra, termiche, stato del cielo ---- */}
          <div className="cmap-chips">
            {win && (
              <span className="cmap-chip is-win">
                Finestra {win.start === win.end ? pad2(win.start) : pad2(win.start) + "–" + pad2(win.end)}
              </span>
            )}
            <span className={"cmap-chip is-therm" + ((e.rateo ?? 0) > 0.05 ? "" : " is-off")}>
              <Flame size={10} aria-hidden="true" />
              {(e.rateo ?? 0) > 0.05 ? "Termiche " + fmtMs(e.rateo ?? 0) : "Termiche assenti"}
            </span>
            <span className="cmap-chip is-stato">
              <Sun size={10} aria-hidden="true" />
              {statoLabel(e.code)}
            </span>
          </div>

          {/* ---- ANALISI AEROLOGICA ---- */}
          <div className="cmap-analysis" data-testid="cartina-analysis">
            <div className="cmap-analysis-head">
              <span className="cmap-analysis-k">Analisi aerologica · ore</span>
              <span className="cmap-analysis-v">
                <b>{win ? win.good : 0}</b> ore buone oggi
                {win ? " · finestra " + pad2(win.start) + "–" + pad2(win.end) : ""}
              </span>
            </div>

            <p className={"cmap-banner " + banner.level} data-testid="cartina-banner">
              <strong>{banner.strong}</strong> — {banner.text}
            </p>

            {/* ---- IL CIELO: profilo della risalita con parapendio, cumuli e venti in quota ---- */}
            <CartinaSky
              quota={quota}
              rateo={e.rateo ?? 0}
              baseNubi={e.baseNubiM}
              freezing={e.freezing}
              cloud={e.cloud}
              wind={e.wind}
              dir={e.dir}
              point={snapshot.point ?? hours.find((h) => h.hour === hour)?.point ?? null}
              hour={e.hour}
            />

            {/* ---- fascia delle ore: colore = scala dell'instabilità, clic = cambia ora ---- */}
            <div className="cmap-hours" data-testid="cartina-bars">
              {hours.map((h) => {
                const inst = instabilita(h.rateo);
                return (
                  <button
                    type="button"
                    key={h.hour}
                    className={
                      "cmap-bar" +
                      (h.hour === hour ? " is-on" : "") +
                      (best && h.hour === best.hour && h.rateo > 0.05 ? " is-best" : "")
                    }
                    style={{ "--bflat": inst.flat } as React.CSSProperties}
                    onClick={() => onPickHour(h.hour)}
                    title={`${pad2(h.hour)}:00 · ${h.rateo > 0.05 ? fmtMs(h.rateo) : "termiche assenti"} · ${INST[inst.level].label}`}
                    aria-label={`Ore ${h.hour}: ascendenza ${h.rateo.toFixed(1)} metri al secondo, condizione ${INST[inst.level].label}`}
                    aria-pressed={h.hour === hour}
                  >
                    {pad2(h.hour)}
                  </button>
                );
              })}
            </div>

            <div className="cmap-scale" data-testid="cartina-scale">
              {(["is-stable", "is-weak", "is-moderate", "is-strong", "is-cross"] as InstLevel[]).map((lv) => (
                <span className={"cmap-pill " + lv} key={lv}>
                  {INST[lv].label}
                </span>
              ))}
            </div>
            <p className="cmap-bars-help">
              Il parapendio segna la sommità della risalita, i cumuli sono disegnati alla quota di arrivo della
              termica (base nubi) e la linea tratteggiata è lo zero termico. A destra il vento dal decollo a 4000
              m: freccia = dove spinge, valore in km/h, «da NO» = da dove arriva · tocca un'ora per aggiornare la
              scena.
            </p>
          </div>

          {/* ---- schede dati ---- */}
          <div className="cmap-cards">
            <div className="cmap-card">
              <span className="cmap-card-k">Zero termico</span>
              <strong className="cmap-card-v">
                {e.freezing == null ? "N/D" : Math.round(e.freezing).toLocaleString("it-IT") + " "}
                {e.freezing != null && <small>m</small>}
              </strong>
              <p className="cmap-card-s">Sopra questa quota l'umidità ghiaccia: cristalli invece di bolle.</p>
            </div>

            <div className="cmap-card">
              <span className="cmap-card-k">Base nubi</span>
              <strong className="cmap-card-v">
                {e.baseNubiM == null ? "N/D" : Math.round(e.baseNubiM).toLocaleString("it-IT") + " "}
                {e.baseNubiM != null && <small>m</small>}
              </strong>
              <p className="cmap-card-s">
                {gain == null
                  ? "Quota dei cumuli stimata dallo spread."
                  : gain > 0
                    ? "+" + gain.toLocaleString("it-IT") + " m di guadagno sopra il decollo"
                    : "Sotto il decollo: cielo basso, niente margine."}
              </p>
            </div>

            <div className="cmap-card">
              <span className="cmap-card-k">Instabilità (CAPE)</span>
              <strong className="cmap-card-v">
                {e.cape == null ? "N/D" : Math.round(e.cape).toLocaleString("it-IT") + " "}
                {e.cape != null && <small>J/kg</small>}
                {e.cape != null && <em className={"cmap-mini " + cape.cls}>{cape.label}</em>}
              </strong>
              <p className="cmap-card-s">Energia disponibile alle bolle: più è alta, più la salita tira.</p>
            </div>

            <div className="cmap-card">
              <span className="cmap-card-k">Temp · Rugiada</span>
              <strong className="cmap-card-v">
                {e.temp == null ? "N/D" : Math.round(e.temp) + "°"}
                {e.dew != null ? " / " + Math.round(e.dew) + "°" : ""}
              </strong>
              <p className="cmap-card-s">
                {spread == null
                  ? "Spread non disponibile."
                  : "Spread " + spread + "°: " + (spread <= 3
                      ? "spread corto = base bassa, bolle facili"
                      : spread <= 7
                        ? "spread medio: convezione regolare"
                        : "spread ampio = aria secca, base alta")}
              </p>
            </div>

            <div className="cmap-card">
              <span className="cmap-card-k">Turbolenza</span>
              <strong className="cmap-card-v">
                <em className={"cmap-mini is-wide " + turb.cls}>{turb.label}</em>
              </strong>
              <p className="cmap-card-s">{turb.sub}</p>
            </div>

            <div className="cmap-card">
              <span className="cmap-card-k">Temporali · Pioggia</span>
              <strong className="cmap-card-v">
                <em className={"cmap-mini is-wide " + storm.cls}>{storm.label}</em>
              </strong>
              <p className="cmap-card-s">{storm.sub}</p>
            </div>
          </div>

          {/* ---- rosa dei venti ---- */}
          <div className="cmap-windrow" data-testid="cartina-windrow">
            <span className="cmap-mini-compass" aria-hidden="true">
              <i className="cmap-mc-n">N</i>
              <i
                className="cmap-mc-arrow"
                style={{ transform: "rotate(" + (((e.dir ?? 0) + 180) % 360).toFixed(1) + "deg)" }}
              />
            </span>
            <strong>
              {e.dir == null
                ? "Vento non disponibile"
                : "Vento da " + dirWord}
              {e.dir == null ? "" : " · " + Math.round(e.wind ?? 0) + " km/h"}
            </strong>
          </div>
        </>
      )}

      <button type="button" className="cmap-use" onClick={onUse}>
        <MapPin size={13} aria-hidden="true" /> Vai a questo decollo
      </button>
      </div>
    </aside>
  );
}
