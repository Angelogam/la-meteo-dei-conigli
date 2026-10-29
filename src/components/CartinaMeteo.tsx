"use client";

/**
 * CARTINA DEI DECOLLI — ispirata a meteo-parapente.com e migliorata:
 * - mappa scura con i 24 decolli del club (marker cliccabili con pannello dettaglio)
 * - livelli sovrapposti: Termiche / Vento / Nuvole / Pioggia (come il menu del sito di riferimento)
 * - scroller di QUOTA per il vento in quota (dati reali a 9 livelli di pressione del modello)
 * - timeline in basso: giorno + cursore orario + PLAY che anima la giornata
 * - legenda della scala colori per ogni livello
 * Tutto con i dati Open-Meteo già scaricati per le card (zero chiamate aggiuntive).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Cloud, CloudRain, Flame, Play, Pause, Wind } from "lucide-react";
import type { Decollo } from "@/data/decolli";
import type { HourlyPoint } from "@/services/threeSourceWeather";
import { calcolaIndiceVolabilita, esposizioneToGradi } from "@/utils/indiceVolabilita";
import CartinaPanel, { type PanelHour } from "@/components/CartinaPanel";
import {
  ensureDem,
  buildFieldGeometry,
  computeField,
  paintField,
  driftPx,
  type FieldGeom,
  type ThermalHour,
} from "@/utils/thermalField";
import "./cartina-meteo.css";

/* ============================== TIPI ============================== */

export interface CartinaWeatherData {
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
  hourly?: HourlyPoint[];
}

export interface CartinaDecollo extends Decollo {
  aggressiveWeather?: CartinaWeatherData | null;
}

type LayerId = "termiche" | "vento" | "nuvole" | "pioggia";
type BaseId = "scuro" | "terreno" | "satellite";

export interface HourEval {
  hour: number;
  indice: number;
  label: string;
  classe: "is-good" | "is-fair" | "is-bad";
  rateo: number | null;
  baseNubiM: number | null;
  rel: string;
  wind: number | null;
  gusts: number | null;
  dir: number | null;
  temp: number | null;
  cloud: number | null;
  rain: number | null;
  freezing: number | null;
  cape: number | null;
  dew: number | null;
  code: number | null;
  quota: number; // quota del decollo (m s.l.m.)
}

interface SiteSnapshot {
  item: CartinaDecollo;
  point: HourlyPoint | null;
  eval: HourEval | null;
}

interface AltStep {
  label: string;
  alt: number | null;
}

interface CartinaMeteoProps {
  decolli: CartinaDecollo[];
  selectedId?: string;
  onSelect?: (item: Decollo) => void;
}

/* ============================ COSTANTI ============================ */

const HOUR_MIN = 6;
const HOUR_MAX = 22;
const REL_LABEL: Record<string, string> = {
  frontale: "In fronte",
  diagonale: "Diagonale",
  laterale: "Laterale",
  di_coda: "In coda",
  sconosciuto: "Vento N/D",
};

const LAYER_TABS: { id: LayerId; label: string; icon: typeof Flame }[] = [
  { id: "termiche", label: "Termiche", icon: Flame },
  { id: "vento", label: "Vento", icon: Wind },
  { id: "nuvole", label: "Nuvole", icon: Cloud },
  { id: "pioggia", label: "Pioggia", icon: CloudRain },
];

const LAYER_NAME: Record<LayerId, string> = {
  termiche: "Campo termico del terreno",
  vento: "Vento in quota",
  nuvole: "Copertura nuvolosa",
  pioggia: "Precipitazioni",
};

/* Note didattiche da manuale di volo (una per livello) */
const LAYER_HINT: Record<LayerId, string> = {
  termiche:
    "Le zone colorate sono i pendii che il sole sta riscaldando: al mattino i versanti E/SE, a mezzogiorno i S, nel pomeriggio gli O/SO. Con il selettore QUOTA il campo si legge all'altezza scelta: salendo le bolle restano vive solo dove la risalita le porta, il resto sbiadisce fino a spegnersi alla base dei cumuli.",
  vento:
    "La freccia mostra dove spinge il vento alla quota scelta, il colore l'intensità. Sul decollo conta il rapporto con l'esposizione: in fronte la termica si rinforza, in coda muore.",
  nuvole:
    "La copertura filtra il sole: con poche nubi le termiche si rinforzano, sopra il 70% il riscaldamento crolla e la convezione si spegne. La base dei cumuli coincide con la base nubi del pannello.",
  pioggia:
    "La pioggia raffredda l'aria e spezza le termiche: dopo i rovesci resta turbolenza e raffiche disordinate. Se il livello è attivo meglio rimandare il decollo.",
};

const BASE_TABS: { id: BaseId; label: string }[] = [
  { id: "scuro", label: "Notturna" },
  { id: "terreno", label: "Terreno" },
  { id: "satellite", label: "Satellite" },
];

/* Scala termiche (m/s) — coerente con l'identità dell'app: freddo = assenti, caldo = forti */
const THERMAL_STOPS: { v: number; c: [number, number, number]; a: number }[] = [
  { v: 0.0, c: [94, 110, 130], a: 0.10 },
  { v: 0.3, c: [59, 130, 246], a: 0.13 },
  { v: 0.8, c: [250, 204, 21], a: 0.20 },
  { v: 1.5, c: [249, 115, 22], a: 0.30 },
  { v: 2.5, c: [239, 68, 68], a: 0.38 },
  { v: 4.2, c: [168, 85, 247], a: 0.46 },
];

/* Scala pioggia (mm/h) */
const RAIN_STOPS: { v: number; c: [number, number, number]; a: number }[] = [
  { v: 0.0, c: [96, 165, 250], a: 0.0 },
  { v: 0.3, c: [96, 165, 250], a: 0.16 },
  { v: 1.0, c: [59, 130, 246], a: 0.28 },
  { v: 3.0, c: [37, 99, 235], a: 0.40 },
  { v: 8.0, c: [67, 56, 202], a: 0.55 },
];

/* ============================ HELPERS ============================= */

const pad2 = (n: number) => String(n).padStart(2, "0");

function dateKeyFor(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function hourOf(time: string): number {
  const m = /T(\d{2})/.exec(time);
  return m ? Number(m[1]) : -1;
}

function getIndexClass(index: number): "is-good" | "is-fair" | "is-bad" {
  return index <= 4 ? "is-good" : index <= 6 ? "is-fair" : "is-bad";
}

function evaluatePoint(point: HourlyPoint, quota: number, esposizione: string): HourEval {
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
    rateo: res.rateoTermicoMs,
    baseNubiM: res.baseNubiM,
    rel: res.windRelativo,
    wind: point.wind,
    gusts: point.gusts,
    dir: point.dir,
    temp: point.temp,
    cloud: point.cloud,
    rain: point.rain,
    freezing: point.freezing,
    cape: point.cape,
    dew: point.dew,
    code: point.code,
    quota,
  };
}

function lerpAngle(a: number | null | undefined, b: number | null | undefined, t: number): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b as number;
  if (b == null) return a;
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

/** Vento interpolato alla quota scelta (m s.l.m.) dal sounding a livelli di pressione. */
export function windAtAltitude(
  point: HourlyPoint | null,
  altM: number | null,
  surfaceWind: number | null,
  surfaceDir: number | null,
): { ws: number | null; wd: number | null } {
  if (!point) return { ws: null, wd: null };
  if (altM === null) return { ws: point.wind ?? surfaceWind, wd: point.dir ?? surfaceDir };
  const levels = (point.levels ?? []).slice().sort((a, b) => a.gh - b.gh);
  if (!levels.length) return { ws: point.wind ?? surfaceWind, wd: point.dir ?? surfaceDir };
  if (altM <= levels[0].gh) return { ws: levels[0].ws, wd: levels[0].wd ?? point.dir ?? surfaceDir };
  for (let i = 0; i < levels.length - 1; i++) {
    const a = levels[i];
    const b = levels[i + 1];
    if (altM >= a.gh && altM <= b.gh) {
      const t = (altM - a.gh) / Math.max(1, b.gh - a.gh);
      return { ws: a.ws + (b.ws - a.ws) * t, wd: lerpAngle(a.wd, b.wd ?? a.wd ?? point.dir, t) };
    }
  }
  const top = levels[levels.length - 1];
  return { ws: top.ws, wd: top.wd ?? point.dir ?? surfaceDir };
}

/* ---- TERMICHE ALLA QUOTA SCELTA (la modalità interattiva di meteo-parapente) ----
 * La bolla parte dal pendio scaldato e muore alla quota di arrivo (base nubi se ci
 * sono cumuli, altrimenti lo zero termico): fino al 45% della salita conserva la
 * forza misurata al suolo, poi decade fino a spegnersi alla base. Così il selettore
 * QUOTA ridefinisce i colori del campo e i valori sui marker, come sul sito di
 * riferimento: in quota le termiche vivono solo dove la risalita le porta. */

/** Quota di arrivo della termica per un sito (m s.l.m.). */
function thermalTopFor(e: HourEval): number {
  const q = e.quota ?? 0;
  const cumuli = e.baseNubiM != null && e.baseNubiM > q + 150 && (e.cloud ?? 0) >= 20;
  if (cumuli) return e.baseNubiM as number;
  if (e.freezing != null && e.freezing > q + 400) return q + (e.freezing - q) * 0.8;
  return Math.min(q + 600, 4000);
}

/** Ascendenza (m/s) percepita alla quota scelta; null = dati assenti. */
function thermalAtAltitude(e: HourEval | null, alt: number | null): number | null {
  if (!e || e.rateo == null) return null;
  if (alt == null) return e.rateo;
  const q = e.quota ?? 0;
  if (alt <= q) return e.rateo * (alt < q ? 0.45 : 1);
  const top = thermalTopFor(e);
  const t = (alt - q) / Math.max(400, top - q);
  if (t >= 1) return 0;
  const f = t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55;
  return Math.max(0, e.rateo * f);
}

function sampleStops(stops: { v: number; c: [number, number, number]; a: number }[], v: number) {
  if (v <= stops[0].v) return { color: stops[0].c.join(","), alpha: stops[0].a };
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (v >= a.v && v <= b.v) {
      const t = (v - a.v) / (b.v - a.v || 1);
      return {
        color: a.c.map((ch, k) => Math.round(ch + (b.c[k] - ch) * t)).join(","),
        alpha: a.a + (b.a - a.a) * t,
      };
    }
  }
  const last = stops[stops.length - 1];
  return { color: last.c.join(","), alpha: last.a };
}

function windSpeedClass(kmh: number): string {
  if (kmh < 15) return "is-w1";
  if (kmh < 25) return "is-w2";
  if (kmh < 35) return "is-w3";
  return "is-w4";
}

function heatRadius(zoom: number): number {
  return Math.max(34, Math.min(120, 23 * Math.pow(1.9, zoom - 8)));
}

const CARDINALI = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
function cardinal(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "–";
  return CARDINALI[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

const MARKER_HTML = (name: string) =>
  `<div class="cmap-marker" role="button" tabindex="-1">` +
  `<span class="cmap-pin">` +
  `<span class="cmap-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="21" height="21"><path d="M12 2.5 L18.5 15.5 L12 12.2 L5.5 15.5 Z"/></svg></span>` +
  `<i class="cmap-dot"></i>` +
  `<b class="cmap-speed">–</b>` +
  `</span>` +
  `<span class="cmap-tag">${name}</span>` +
  `</div>`;

/* ============================ COMPONENTE =========================== */

export default function CartinaMeteo({ decolli, selectedId, onSelect }: CartinaMeteoProps) {
  const [layer, setLayer] = useState<LayerId>("termiche");
  const [base, setBase] = useState<BaseId>("terreno"); // base chiara: i colori del campo leggono come su Meteo-Parapente
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(() => Math.min(15, Math.max(10, new Date().getHours())));
  const [altIndex, setAltIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [panelSiteId, setPanelSiteId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const baseLayersRef = useRef<Partial<Record<BaseId, L.TileLayer>>>({});
  const baseOverlayRef = useRef<Partial<Record<BaseId, L.TileLayer | null>>>({});
  const rafRef = useRef(0);

  const dayKey = useMemo(() => dateKeyFor(day), [day]);

  /* --- campo termico sul terreno (sistema Meteo-Parapente) --- */
  const geomRef = useRef<FieldGeom | null>(null);
  const fieldCacheRef = useRef<Map<string, { values: Float32Array; max: number; windKmh: number; windDir: number }>>(new Map());
  const demReadyRef = useRef(false);
  const demBusyRef = useRef(false);
  const demQueuedRef = useRef(false);
  const dayKeyRef = useRef(dayKey);
  dayKeyRef.current = dayKey;
  const hourRef = useRef(hour);
  hourRef.current = hour;
  const peakRef = useRef<HTMLSpanElement | null>(null);
  const [demState, setDemState] = useState<"loading" | "ready" | "off">("loading");

  /* --- istantanea di tutti i siti all'ora selezionata --- */
  const snapshots = useMemo<SiteSnapshot[]>(
    () =>
      decolli.map((item) => {
        const hourly = item.aggressiveWeather?.hourly;
        const point = hourly?.find((p) => p.time.startsWith(dayKey + "T" + pad2(hour))) ?? null;
        return {
          item,
          point,
          eval: point
            ? evaluatePoint(point, Number(item.elevation_m ?? item.altitude ?? 0), item.orientation || item.exposure || "")
            : null,
        };
      }),
    [decolli, dayKey, hour],
  );

  const snapRef = useRef(snapshots);
  snapRef.current = snapshots;
  const layerRef = useRef(layer);
  layerRef.current = layer;

  /* --- quote disponibili per lo scroller del vento (mediana dei geopotenziali) --- */
  const altSteps = useMemo<AltStep[]>(() => {
    const perLevel: number[][] = [];
    for (const s of snapshots) {
      const lv = s.point?.levels ?? [];
      lv.forEach((l, i) => {
        (perLevel[i] ??= []).push(l.gh);
      });
    }
    const steps: AltStep[] = [{ label: "Suolo", alt: null }];
    perLevel.forEach((arr) => {
      if (!arr || !arr.length) return;
      arr.sort((a, b) => a - b);
      const med = arr[Math.floor(arr.length / 2)];
      steps.push({ label: (Math.round(med / 50) * 50).toLocaleString("it-IT") + " m", alt: med });
    });
    return steps;
  }, [snapshots]);

  const altStep = useMemo(
    () => altSteps[Math.min(altIndex, altSteps.length - 1)] ?? { label: "Suolo", alt: null as number | null },
    [altSteps, altIndex],
  );
  const altStepRef = useRef(altStep);
  altStepRef.current = altStep;

  /* --- vento alla quota scelta per ogni sito --- */
  const windReads = useMemo(() => {
    const m = new Map<string, { ws: number | null; wd: number | null }>();
    for (const s of snapshots) {
      m.set(s.item.id, windAtAltitude(s.point, altStep.alt, s.point?.wind ?? null, s.point?.dir ?? null));
    }
    return m;
  }, [snapshots, altStep]);

  /* ---------------- VENTO ANIMATO — campo di particelle (firma Meteo-Parapente) ---------------- */
  const windReadsRef = useRef(windReads);
  windReadsRef.current = windReads;
  const windFieldRef = useRef<{ w: number; h: number; pts: { x: number; y: number; ws: number; vx: number; vy: number }[] } | null>(null);
  const particlesRef = useRef<{ x: number; y: number; age: number; life: number }[]>([]);
  const windRafRef = useRef(0);
  const scatterRef = useRef<() => void>(() => {});

  const withData = snapshots.filter((s) => s.eval).length;

  const dayTabs = useMemo(
    () =>
      [0, 1, 2].map((off) => {
        const d = new Date();
        d.setDate(d.getDate() + off);
        const g = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
        const m = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
        return {
          off,
          top: off === 0 ? "Oggi" : off === 1 ? "Domani" : "Dopodomani",
          sub: `${g[d.getDay()]} ${d.getDate()} ${m[d.getMonth()]}`,
        };
      }),
    [],
  );

  /* ------------------------- disegno del calore ------------------------- */
  const drawHeatRef = useRef<() => void>(() => {});

  useEffect(() => {
    drawHeatRef.current = () => {
      const map = mapRef.current;
      const canvas = canvasRef.current;
      if (!map || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const size = map.getSize();
      const pad = 100;
      const topLeft = map.containerPointToLayerPoint([-pad, -pad]);
      L.DomUtil.setPosition(canvas, topLeft);
      const w = size.x + pad * 2;
      const h = size.y + pad * 2;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const active = layerRef.current;
      if (active === "vento") return; // il livello vento usa frecce, non aloni
      const zoom = map.getZoom();
      const rBase = heatRadius(zoom);

      /* --- TERMICHE: campo sul terreno (sistema Meteo-Parapente) con fallback ad aloni --- */
      if (active === "termiche") {
        const geom = geomRef.current;
        if (demReadyRef.current && geom) {
          const cacheKey = dayKeyRef.current + "T" + hourRef.current;
          let res = fieldCacheRef.current.get(cacheKey);
          if (!res) {
            if (fieldCacheRef.current.size > 40) fieldCacheRef.current.clear();
            let rateoMax = 0;
            let radSum = 0;
            let radN = 0;
            let wSum = 0;
            let wN = 0;
            let dSin = 0;
            let dCos = 0;
            const center = map.getCenter();
            for (const s of snapRef.current) {
              if (s.eval) {
                rateoMax = Math.max(rateoMax, s.eval.rateo ?? 0);
                if (s.eval.wind != null) {
                  wSum += s.eval.wind;
                  wN++;
                }
                if (s.eval.dir != null) {
                  const r = (s.eval.dir * Math.PI) / 180;
                  dSin += Math.sin(r);
                  dCos += Math.cos(r);
                }
              }
              const rad = s.point?.rad;
              if (rad != null) {
                radSum += rad;
                radN++;
              }
            }
            const hourState: ThermalHour = {
              dayISO: dayKeyRef.current,
              hour: hourRef.current,
              rad: radN ? radSum / radN : 0,
              rateoMax,
              windKmh: wN ? wSum / wN : 0,
              windDir: wN ? (((Math.atan2(dSin, dCos) * 180) / Math.PI % 360) + 360) % 360 : 0,
              lat: center.lat,
              lon: center.lng,
            };
            const out = computeField(geom, hourState);
            res = { values: out.values, max: out.max, windKmh: hourState.windKmh, windDir: hourState.windDir };
            fieldCacheRef.current.set(cacheKey, res);
          }
          const drift = driftPx(res.windKmh, res.windDir, zoom);
          let field = res.values;
          const alt = altStepRef.current.alt;
          if (alt != null) {
            /* modalità QUOTA: il campo si legge all'altezza scelta — le celle la cui
               montagna supera la quota spariscono (lì la fetta d'aria non esiste) e le
               bolle si indeboliscono salendo, fino a morire alla quota di arrivo */
            let tSum = 0;
            let tN = 0;
            for (const s of snapRef.current) {
              if (s.eval) {
                tSum += thermalTopFor(s.eval);
                tN++;
              }
            }
            const top = tN ? tSum / tN : 3000;
            const scaled = new Float32Array(field.length);
            for (let i = 0; i < field.length; i++) {
              const v = field[i];
              if (v <= 0) continue;
              const E = geom.cells[i]?.elev;
              if (E == null || !Number.isFinite(E)) continue;
              const agl = alt - E;
              if (agl <= 0) continue;
              const t = agl / Math.max(400, top - E);
              if (t >= 1) continue;
              scaled[i] = v * (t < 0.4 ? 1 : Math.max(0, 1 - (t - 0.4) / 0.6));
            }
            field = scaled;
          }
          paintField(ctx, geom, field, drift.dx, drift.dy);
          if (peakRef.current) {
            peakRef.current.textContent =
              res.max > 0.22 ? "picco +" + res.max.toFixed(1).replace(".", ",") + " m/s" : "aria stabile";
          }
          return;
        }
        /* fallback: terreno non (ancora) disponibile → aloni sui decolli */
        ctx.globalCompositeOperation = "lighter";
        for (const s of snapRef.current) {
          const r = thermalAtAltitude(s.eval, altStepRef.current.alt);
          if (r == null || r <= 0.05) continue;
          const st = sampleStops(THERMAL_STOPS, r);
          drawBlob(ctx, map, topLeft, s.item, st.color, st.alpha, rBase * (0.78 + 0.5 * Math.min(1, r / 4.2)));
        }
        ctx.globalCompositeOperation = "source-over";
        if (peakRef.current) peakRef.current.textContent = "";
        return;
      }

      ctx.globalCompositeOperation = "source-over";
      for (const s of snapRef.current) {
        let value: number | null = null;
        let radiusK = 1;
        if (active === "nuvole") {
          const c = s.point?.cloud ?? null;
          if (c == null || c < 5) continue;
          value = c / 100 * 8; // mappa 0-100% sulla scala
          radiusK = 0.9 + (c / 100) * 0.35;
          const { color, alpha } = { color: "226,232,240", alpha: Math.min(0.5, (c / 100) * 0.5) };
          drawBlob(ctx, map, topLeft, s.item, color, alpha, rBase * radiusK);
          continue;
        } else if (active === "pioggia") {
          const r = s.point?.rain ?? null;
          if (r == null || r < 0.05) continue;
          value = r;
          radiusK = 0.85 + 0.3 * Math.min(1, r / 6);
        }
        if (value === null) continue;
        const st = sampleStops(RAIN_STOPS, value);
        drawBlob(ctx, map, topLeft, s.item, st.color, st.alpha, rBase * radiusK);
      }
      ctx.globalCompositeOperation = "source-over";
    };
  });

  function drawBlob(
    ctx: CanvasRenderingContext2D,
    map: L.Map,
    topLeft: L.Point,
    item: CartinaDecollo,
    color: string,
    alpha: number,
    radius: number,
  ) {
    if (alpha <= 0.01 || radius <= 2) return;
    const p = map.latLngToLayerPoint([Number(item.lat), Number(item.lon)]);
    const x = p.x - topLeft.x;
    const y = p.y - topLeft.y;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${color},${alpha.toFixed(3)})`);
    g.addColorStop(0.55, `rgba(${color},${(alpha * 0.42).toFixed(3)})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const scheduleDraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => drawHeatRef.current());
  }, []);

  /* ------------------ motore particelle di vento (livello "Vento") ------------------ */

  const rebuildWindField = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const size = map.getSize();
    const pad = 100;
    const topLeft = map.containerPointToLayerPoint([-pad, -pad]);
    const pts: { x: number; y: number; ws: number; vx: number; vy: number }[] = [];
    for (const s of snapRef.current) {
      const read = windReadsRef.current.get(s.item.id);
      if (!read || read.ws == null || read.wd == null || !Number.isFinite(read.ws) || !Number.isFinite(read.wd)) continue;
      const p = map.latLngToLayerPoint([Number(s.item.lat), Number(s.item.lon)]);
      // direzione "verso cui va" il vento (wd è la direzione DA cui proviene)
      const to = ((read.wd + 180) % 360) * (Math.PI / 180);
      pts.push({
        x: p.x - topLeft.x,
        y: p.y - topLeft.y,
        ws: read.ws,
        vx: Math.sin(to),
        vy: -Math.cos(to),
      });
    }
    windFieldRef.current = { w: size.x + pad * 2, h: size.y + pad * 2, pts };
    /* risemina le particelle sul viewport corrente */
    const target = Math.min(430, Math.max(150, Math.round(((size.x + pad * 2) * (size.y + pad * 2)) / 2700)));
    const arr = particlesRef.current;
    arr.length = 0;
    for (let i = 0; i < target; i++) {
      arr.push({
        x: Math.random() * (size.x + pad * 2),
        y: Math.random() * (size.y + pad * 2),
        age: Math.random() * 70,
        life: 80 + Math.random() * 110,
      });
    }
  }, []);
  scatterRef.current = rebuildWindField;

  const drawVentoFrameRef = useRef<(dt: number) => void>(() => {});
  useEffect(() => {
    drawVentoFrameRef.current = (dt: number) => {
      const map = mapRef.current;
      const canvas = canvasRef.current;
      if (!map || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const size = map.getSize();
      const pad = 100;
      const topLeft = map.containerPointToLayerPoint([-pad, -pad]);
      L.DomUtil.setPosition(canvas, topLeft);
      const w = size.x + pad * 2;
      const h = size.y + pad * 2;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const field = windFieldRef.current;
      if (!field || !field.pts.length) return;

      ctx.lineCap = "round";
      for (const p of particlesRef.current) {
        /* velocità interpolata (IDW) dal campo dei decolli */
        let wSum = 0;
        let vx = 0;
        let vy = 0;
        let ws = 0;
        for (const q of field.pts) {
          const d2 = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y);
          const weight = 1 / (d2 + 2500);
          wSum += weight;
          vx += q.vx * weight;
          vy += q.vy * weight;
          ws += q.ws * weight;
        }
        if (wSum <= 0) continue;
        vx /= wSum;
        vy /= wSum;
        ws /= wSum;

        const speedPx = Math.min(64, 16 + ws * 1.7); // resa visiva: corsa percepibile a ogni intensità
        const nx = p.x + vx * speedPx * dt;
        const ny = p.y + vy * speedPx * dt;
        p.age += dt * 60;
        if (p.age > p.life || nx < 0 || ny < 0 || nx > w || ny > h) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
          p.age = 0;
          continue;
        }
        p.x = nx;
        p.y = ny;

        const fade = Math.min(1, p.age / 12, (p.life - p.age) / 16);
        if (fade <= 0.02) continue;
        const len = Math.min(32, 13 + ws * 0.9);
        const color = ws < 15 ? "125,211,252" : ws < 25 ? "56,189,248" : ws < 35 ? "250,204,21" : "251,146,60";
        ctx.strokeStyle = `rgba(${color},${(0.9 * fade).toFixed(3)})`;
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(p.x - vx * len, p.y - vy * len);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        /* testina: puntino pieno nel verso del moto */
        ctx.fillStyle = `rgba(${color},${(0.98 * fade).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };
  });

  /* ciclo rAF del vento: attivo solo sul livello "Vento" */
  useEffect(() => {
    if (layer !== "vento") return;
    rebuildWindField();
    let last = performance.now();
    const loop = (ts: number) => {
      const dt = Math.min(0.09, (ts - last) / 1000);
      last = ts;
      drawVentoFrameRef.current(dt);
      windRafRef.current = requestAnimationFrame(loop);
    };
    windRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(windRafRef.current);
  }, [layer, rebuildWindField]);

  /* ricostruisce il campo quando cambiano ora/quota/dati mentre il livello vento è attivo */
  useEffect(() => {
    if (layer === "vento") rebuildWindField();
  }, [snapshots, windReads, layer, rebuildWindField]);

  /* ------------------- campo termico: terreno + geometria ------------------- */

  const rebuildFieldGeometry = useCallback(() => {
    const map = mapRef.current;
    if (!map || !demReadyRef.current) return;
    const size = map.getSize();
    const pad = 100;
    const topLeft = map.containerPointToLayerPoint([-pad, -pad]);
    const p1 = map.containerPointToLatLng([0, 0]);
    const p2 = map.containerPointToLatLng([100, 0]);
    const mpp = map.distance(p1, p2) / 100;
    const geom = buildFieldGeometry({
      width: size.x + pad * 2,
      height: size.y + pad * 2,
      metersPerPixel: mpp,
      spacing: 12,
      unproject: (x, y) => {
        const ll = map.layerPointToLatLng(L.point(topLeft.x + x, topLeft.y + y));
        return { lat: ll.lat, lon: ll.lng };
      },
    });
    geomRef.current = geom;
    fieldCacheRef.current.clear();
  }, []);

  const ensureField = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    if (demBusyRef.current) {
      demQueuedRef.current = true;
      return;
    }
    demBusyRef.current = true;
    try {
      const b = map.getBounds().pad(0.3);
      const ok = await ensureDem(b.getNorth(), b.getSouth(), b.getEast(), b.getWest(), map.getZoom());
      demReadyRef.current = ok;
      if (ok) {
        rebuildFieldGeometry();
        scheduleDraw(); // il campo deve apparire SUBITO dopo il caricamento del terreno
      }
      setDemState(ok ? "ready" : "off");
    } catch {
      demReadyRef.current = false;
      setDemState("off");
    } finally {
      demBusyRef.current = false;
      if (demQueuedRef.current) {
        demQueuedRef.current = false;
        void ensureField();
      }
    }
  }, [rebuildFieldGeometry, scheduleDraw]);

  /* al cambio vista: riproietta subito la geometria (se il DEM c'è), il campo vento e ridisegna */
  const onViewChangeRef = useRef<() => void>(() => {});
  useEffect(() => {
    onViewChangeRef.current = () => {
      if (demReadyRef.current) rebuildFieldGeometry();
      if (layerRef.current === "vento") scatterRef.current();
      scheduleDraw();
    };
  }, [rebuildFieldGeometry, scheduleDraw]);

  /* ora iniziale = ora con la convezione media migliore della giornata (si tocca solo se l'utente non ha già mosso il cursore) */
  const hourTouchedRef = useRef(false);
  const autoPickedRef = useRef(false);
  useEffect(() => {
    if (autoPickedRef.current || hourTouchedRef.current) return;
    const acc = new Map<number, { sum: number; n: number }>();
    for (const s of snapshots) {
      const e = s.eval;
      if (!e || (e.rateo ?? 0) <= 0) continue;
      const a = acc.get(e.hour) ?? { sum: 0, n: 0 };
      a.sum += e.rateo ?? 0;
      a.n++;
      acc.set(e.hour, a);
    }
    let bestHour = -1;
    let bestVal = 0;
    acc.forEach((v, h) => {
      const mean = v.sum / v.n;
      if (mean > bestVal) {
        bestVal = mean;
        bestHour = h;
      }
    });
    if (bestHour >= 0) {
      setHour(bestHour);
      autoPickedRef.current = true;
    }
  }, [snapshots]);

  /* ------------------------------ init mappa ------------------------------ */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const markers = markersRef.current;

    const map = L.map(el, {
      zoomControl: false,
      minZoom: 7,
      maxZoom: 15,
      zoomSnap: 0.5,
      attributionControl: true,
    });
    mapRef.current = map;

    const pane = map.createPane("cmap-heat");
    pane.style.zIndex = "350";
    pane.style.pointerEvents = "none";
    const canvas = document.createElement("canvas");
    canvas.className = "cmap-heat-canvas";
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    /* Basi cartografiche gratuite senza API key (CARTO ora marca i tile "API KEY REQUIRED"). */
    const bases: Record<BaseId, { layers: { url: string; attr: string; sub?: string[]; max: number; className?: string }[] }> = {
      scuro: {
        layers: [
          {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            attr: "Tiles &copy; Esri — Esri, DeLorme, NAVTEQ",
            max: 16,
          },
          {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
            attr: "Hillshade &copy; Esri",
            max: 16,
            className: "cmap-hillshade",
          },
        ],
      },
      terreno: {
        layers: [
          {
            url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
            attr: 'Base: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
            max: 14,
            className: "cmap-terreno-tiles",
          },
        ],
      },
      satellite: {
        layers: [
          {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attr: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
            max: 15,
          },
        ],
      },
    };
    baseLayersRef.current = {} as Partial<Record<BaseId, L.TileLayer>>;
    baseOverlayRef.current = {} as Partial<Record<BaseId, L.TileLayer | null>>;
    for (const [id, cfg] of Object.entries(bases)) {
      const [primary, overlay] = cfg.layers;
      baseLayersRef.current[id as BaseId] = L.tileLayer(primary.url, {
        attribution: primary.attr,
        subdomains: primary.sub ?? "abc",
        maxZoom: primary.max,
        className: primary.className,
      });
      baseOverlayRef.current[id as BaseId] = overlay
        ? L.tileLayer(overlay.url, { maxZoom: overlay.max, className: overlay.className })
        : null;
    }

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ imperial: false, position: "bottomright" }).addTo(map);

    const valid = decolli.filter((d) => Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lon)));
    if (valid.length) {
      const bounds = L.latLngBounds(valid.map((d) => [Number(d.lat), Number(d.lon)] as [number, number]));
      map.fitBounds(bounds.pad(0.1), { maxZoom: 10.5, animate: false });
    }

    for (const item of valid) {
      const marker = L.marker([Number(item.lat), Number(item.lon)], {
        icon: L.divIcon({
          className: "cmap-marker-wrap",
          html: MARKER_HTML(item.site_name || item.name),
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        keyboard: false,
        riseOnHover: true,
      });
      marker.on("click", () => setPanelSiteId(item.id));
      marker.addTo(map);
      markers.set(item.id, marker);
    }

    map.on("moveend zoomend resize viewreset", () => onViewChangeRef.current());
    let demTimer = 0;
    const debouncedEnsure = () => {
      window.clearTimeout(demTimer);
      demTimer = window.setTimeout(() => void ensureField(), 450);
    };
    map.on("moveend zoomend", debouncedEnsure);
    const t = window.setTimeout(() => {
      scheduleDraw();
      void ensureField();
    }, 80);

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(demTimer);
      cancelAnimationFrame(rafRef.current);
      map.off();
      map.remove();
      mapRef.current = null;
      markers.clear();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- cambio base cartografica --------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const l of Object.values(baseLayersRef.current)) {
      if (l && map.hasLayer(l)) map.removeLayer(l);
    }
    for (const l of Object.values(baseOverlayRef.current)) {
      if (l && map.hasLayer(l)) map.removeLayer(l);
    }
    baseLayersRef.current[base]?.addTo(map);
    const overlay = baseOverlayRef.current[base];
    if (overlay) overlay.addTo(map);
  }, [base]);

  /* ---------------------------- aggiornamento marker ---------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const isWind = layer === "vento";
    for (const s of snapshots) {
      const marker = markersRef.current.get(s.item.id);
      if (!marker) continue;
      const root = marker.getElement();
      const el = root?.querySelector(".cmap-marker") as HTMLElement | null;
      if (!el) continue;
      const e = s.eval;
      el.classList.remove("is-good", "is-fair", "is-bad", "is-off", "is-selected", "is-hot");
      el.classList.add(e ? e.classe : "is-off");
      if (selectedId === s.item.id) el.classList.add("is-selected");
      el.classList.toggle("is-windlayer", isWind);
      el.classList.toggle("is-thermlayer", layer === "termiche");

      if (isWind) {
        const read = windReads.get(s.item.id);
        const arrow = el.querySelector(".cmap-arrow") as HTMLElement | null;
        const speed = el.querySelector(".cmap-speed") as HTMLElement | null;
        if (arrow && read?.wd != null && Number.isFinite(read.wd)) {
          arrow.style.transform = `rotate(${((read.wd + 180) % 360).toFixed(1)}deg)`;
        }
        if (speed) {
          if (read?.ws != null && Number.isFinite(read.ws)) {
            speed.textContent = String(Math.round(read.ws));
            speed.dataset.w = windSpeedClass(read.ws);
          } else {
            speed.textContent = "–";
          }
        }
      } else if (layer === "termiche") {
        /* sulla modalità termiche il marker mostra l'ascendenza alla QUOTA scelta */
        const speed = el.querySelector(".cmap-speed") as HTMLElement | null;
        const rAlt = thermalAtAltitude(e, altStep.alt);
        if (speed) {
          if (rAlt != null && rAlt > 0.05) {
            speed.textContent = "+" + rAlt.toFixed(1).replace(".", ",");
            speed.dataset.w = rAlt >= 2.4 ? "is-w4" : rAlt >= 1.5 ? "is-w3" : rAlt >= 0.8 ? "is-w2" : "is-w1";
          } else {
            speed.textContent = rAlt != null ? "0" : "–";
            speed.dataset.w = "";
          }
        }
        if (e && (rAlt ?? 0) >= 2) el.classList.add("is-hot");
      }
      el.title = `${s.item.site_name || s.item.name} · ${e ? e.label : "Dati non disponibili"}`;
    }
  }, [snapshots, layer, windReads, selectedId, altStep]);

  /* --------------------------- ridisegno quando cambia ora/livello --------------------------- */
  useEffect(() => {
    scheduleDraw();
  }, [snapshots, layer, scheduleDraw]);

  /* --------------------------------- PLAY --------------------------------- */
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setHour((h) => (h >= HOUR_MAX ? HOUR_MIN : h + 1));
    }, 1100);
    return () => window.clearInterval(id);
  }, [playing]);

  /* ------------------------------- pannello ------------------------------- */
  const panelSite = panelSiteId ? (snapshots.find((s) => s.item.id === panelSiteId) ?? null) : null;

  const panelHours = useMemo<PanelHour[]>(() => {
    if (!panelSiteId) return [];
    const item = decolli.find((d) => d.id === panelSiteId);
    const hourly = item?.aggressiveWeather?.hourly;
    if (!item || !hourly) return [];
    const out: PanelHour[] = [];
    for (let h = HOUR_MIN; h <= HOUR_MAX; h++) {
      const p = hourly.find((x) => x.time.startsWith(dayKey + "T" + pad2(h)));
      if (!p) continue;
      const e = evaluatePoint(p, Number(item.elevation_m ?? item.altitude ?? 0), item.orientation || item.exposure || "");
      out.push({ hour: h, rateo: e.rateo ?? 0, classe: e.classe, wind: e.wind, gusts: e.gusts, point: p });
    }
    return out;
  }, [panelSiteId, decolli, dayKey]);

  /* --------------------------------- render --------------------------------- */
  return (
    <section className="cmap-panel" aria-labelledby="cmap-title" data-testid="cartina-decolli">
      <header className="cmap-head">
        <div className="cmap-head-title">
          <p className="cmap-kicker">CARTINA AEROLOGICA · SISTEMA METEO-PARAPENTE</p>
          <h2 id="cmap-title">Cartina dei decolli</h2>
          <p>
            Il campo termico calcolato sul terreno reale — dove il sole riscalda i pendii nascono le
            bolle, come su Meteo-Parapente. Scegli il livello e l'ora, premi «Riproduci» o tocca un decollo.
          </p>
          <p className="cmap-hint" data-testid="cartina-hint">{LAYER_HINT[layer]}</p>
          {layer === "termiche" && demState === "loading" && (
            <p className="cmap-hint is-warn">Calcolo del terreno reale…</p>
          )}
          {layer === "termiche" && demState === "off" && (
            <p className="cmap-hint is-warn">
              Terreno non disponibile: mostro aloni semplificati sui decolli.
            </p>
          )}
        </div>
        <div className="cmap-head-tools">
          <div className="cmap-layers" role="group" aria-label="Livello meteo della cartina">
            {LAYER_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={"cmap-lbtn" + (layer === id ? " is-active" : "")}
                aria-pressed={layer === id}
                onClick={() => setLayer(id)}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="cmap-bases" role="group" aria-label="Base cartografica">
            {BASE_TABS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={"cmap-bbtn" + (base === b.id ? " is-active" : "")}
                aria-pressed={base === b.id}
                onClick={() => setBase(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="cmap-map">
        <div ref={containerRef} className="cmap-leaflet" />

        <div className="cmap-readout" aria-live="polite">
          <strong>
            {dayTabs[day].sub} · {pad2(hour)}:00
          </strong>
          <span>
            {LAYER_NAME[layer]}
            {(layer === "vento" || layer === "termiche") ? " · " + altStep.label : ""}
          </span>
          {layer === "termiche" && <span className="cmap-peak" ref={peakRef} data-testid="cartina-peak" />}
        </div>

        {(layer === "vento" || layer === "termiche") && altSteps.length > 1 && (
          <div
            className="cmap-alt"
            role="group"
            aria-label={layer === "vento" ? "Quota del vento" : "Quota del campo termico"}
          >
            <span className="cmap-alt-caption">QUOTA</span>
            <div className="cmap-alt-list">
              {altSteps.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  className={"cmap-alt-step" + (i === altIndex ? " is-active" : "")}
                  aria-pressed={i === altIndex}
                  onClick={() => setAltIndex(i)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="cmap-legend" aria-hidden="true">
          {layer === "termiche" && (
            <>
              <span className="cmap-legend-title">
                Ascendenza prevista (m/s){altStep.alt != null ? " · a " + altStep.label : ""}
              </span>
              <span className="cmap-legend-bar cmap-grad-therm" />
              <div className="cmap-legend-l">
                <em>0</em>
                <em>1</em>
                <em>2</em>
                <em>3</em>
                <em>4</em>
                <em>6+</em>
              </div>
            </>
          )}
          {layer === "vento" && (
            <>
              <span className="cmap-legend-title">
                Vento km/h · {altStep.label} · freccia = dove va
              </span>
              <div className="cmap-legend-w">
                <i className="is-w1" />
                <em>15</em>
                <i className="is-w2" />
                <em>25</em>
                <i className="is-w3" />
                <em>35</em>
                <i className="is-w4" />
              </div>
            </>
          )}
          {layer === "nuvole" && (
            <>
              <span className="cmap-legend-title">Copertura nuvolosa</span>
              <span className="cmap-legend-bar cmap-grad-cloud" />
              <div className="cmap-legend-l">
                <em>0%</em>
                <em>50%</em>
                <em>100%</em>
              </div>
            </>
          )}
          {layer === "pioggia" && (
            <>
              <span className="cmap-legend-title">Precipitazioni (mm/h)</span>
              <span className="cmap-legend-bar cmap-grad-rain" />
              <div className="cmap-legend-l">
                <em>0</em>
                <em>1</em>
                <em>3</em>
                <em>8+</em>
              </div>
            </>
          )}
        </div>

        <CartinaPanel
          snapshot={panelSite}
          hours={panelHours}
          hour={hour}
          onClose={() => setPanelSiteId(null)}
          onPickHour={setHour}
          onUse={() => {
            if (panelSite && onSelect) onSelect(panelSite.item);
          }}
        />
      </div>

      <div className="cmap-timeline">
        <div className="cmap-days" role="group" aria-label="Giorno della previsione">
          {dayTabs.map((d) => (
            <button
              key={d.off}
              type="button"
              className={"cmap-day" + (day === d.off ? " is-active" : "")}
              aria-pressed={day === d.off}
              onClick={() => {
                setDay(d.off);
                setPlaying(false);
              }}
            >
              <strong>{d.top}</strong>
              <small>{d.sub}</small>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={"cmap-play" + (playing ? " is-playing" : "")}
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Metti in pausa l’animazione della giornata" : "Riproduci l’animazione della giornata"}
        >
          {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          <span>{playing ? "Pausa" : "Riproduci"}</span>
        </button>
        <div className="cmap-slider">
          <input
            type="range"
            min={HOUR_MIN}
            max={HOUR_MAX}
            step={1}
            value={hour}
            onChange={(e) => {
              hourTouchedRef.current = true;
              setHour(Number(e.target.value));
            }}
            aria-label="Ora della previsione"
            data-testid="cartina-hour-slider"
          />
          <div className="cmap-ticks" aria-hidden="true">
            {[6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => (
              <span key={h} className={h === hour ? "is-on" : ""}>
                {pad2(h)}
              </span>
            ))}
          </div>
        </div>
        <strong className="cmap-nowhour">{pad2(hour)}:00</strong>
        <span className="cmap-loaded">
          {withData}/{decolli.length} siti con dati
        </span>
      </div>
    </section>
  );
}
