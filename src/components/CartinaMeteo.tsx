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
  termiche: "Ascendenze termiche",
  vento: "Vento in quota",
  nuvole: "Copertura nuvolosa",
  pioggia: "Precipitazioni",
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
function windAtAltitude(
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
  `<span class="cmap-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 2.5 L18.5 15.5 L12 12.2 L5.5 15.5 Z"/></svg></span>` +
  `<i class="cmap-dot"></i>` +
  `<b class="cmap-speed">–</b>` +
  `</span>` +
  `<span class="cmap-tag">${name}</span>` +
  `</div>`;

/* ============================ COMPONENTE =========================== */

export default function CartinaMeteo({ decolli, selectedId, onSelect }: CartinaMeteoProps) {
  const [layer, setLayer] = useState<LayerId>("termiche");
  const [base, setBase] = useState<BaseId>("scuro");
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(() => Math.min(18, Math.max(9, new Date().getHours())));
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

  /* --- vento alla quota scelta per ogni sito --- */
  const windReads = useMemo(() => {
    const m = new Map<string, { ws: number | null; wd: number | null }>();
    for (const s of snapshots) {
      m.set(s.item.id, windAtAltitude(s.point, altStep.alt, s.point?.wind ?? null, s.point?.dir ?? null));
    }
    return m;
  }, [snapshots, altStep]);

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
      ctx.globalCompositeOperation = active === "termiche" ? "lighter" : "source-over";
      for (const s of snapRef.current) {
        let value: number | null = null;
        let radiusK = 1;
        if (active === "termiche") {
          const r = s.eval?.rateo ?? null;
          if (r == null || r <= 0.05) continue;
          value = r;
          radiusK = 0.78 + 0.5 * Math.min(1, r / 4.2);
        } else if (active === "nuvole") {
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
        const st =
          active === "termiche"
            ? sampleStops(THERMAL_STOPS, value)
            : sampleStops(RAIN_STOPS, value);
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

    map.on("moveend zoomend resize viewreset", scheduleDraw);
    const t = window.setTimeout(scheduleDraw, 80);

    return () => {
      window.clearTimeout(t);
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
      if (e && layer === "termiche" && (e.rateo ?? 0) >= 2) el.classList.add("is-hot");
      el.classList.toggle("is-windlayer", isWind);

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
      }
      el.title = `${s.item.site_name || s.item.name} · ${e ? e.label : "Dati non disponibili"}`;
    }
  }, [snapshots, layer, windReads, selectedId]);

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
      out.push({ hour: h, rateo: e.rateo ?? 0, classe: e.classe, wind: e.wind, gusts: e.gusts });
    }
    return out;
  }, [panelSiteId, decolli, dayKey]);

  /* --------------------------------- render --------------------------------- */
  return (
    <section className="cmap-panel" aria-labelledby="cmap-title" data-testid="cartina-decolli">
      <header className="cmap-head">
        <div className="cmap-head-title">
          <p className="cmap-kicker">CARTINA AEROLOGICA · STILE METEO-PARAPENTE</p>
          <h2 id="cmap-title">Cartina dei decolli</h2>
          <p>
            Termiche, vento in quota, nuvole e pioggia sui nostri 24 decolli. Scegli il livello, l’ora — o premi
            «Riproduci» — e tocca un decollo per il dettaglio.
          </p>
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
            {layer === "vento" ? " · " + altStep.label : ""}
          </span>
        </div>

        {layer === "vento" && altSteps.length > 1 && (
          <div className="cmap-alt" role="group" aria-label="Quota del vento">
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
              <span className="cmap-legend-title">Ascendenza (m/s)</span>
              <span className="cmap-legend-bar cmap-grad-therm" />
              <div className="cmap-legend-l">
                <em>0</em>
                <em>1</em>
                <em>2</em>
                <em>3+</em>
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
            onChange={(e) => setHour(Number(e.target.value))}
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
