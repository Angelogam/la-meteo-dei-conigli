"use client";

/**
 * TERRENO IN 3D — la vista satellite/DEM sotto la cartina dei decolli.
 *
 * Motore: CesiumJS (open source) + terreno DEM gratuito (Mapzen/AWS) + immagini
 * satellite Esri: resa tipo Google Earth, zero API key, zero costi.
 *
 * Cosa mostra:
 * - i DECOLLI con pin cliccabili (clic = apre la scheda del decollo nella cartina)
 * - le BREZZE DI VERSANTE simulate: frecce gialle animate che risalgono i pendii
 *   nelle ore di sole (anabatica) o le scendono di sera/notte (catabatica);
 *   direzione calcolata dal DEM (gradiente del pendio), velocità NON in scala
 * - i VENTI METEO alla quota scelta (2000 → 4000 m) presi dal sounding Open-Meteo
 *   già usato dal sito: frecce colorate per intensità, direzione = dove spingono
 * - il PERCORSO CONSIGLIATO (linea bianca tratteggiata) dal decollo all'atterraggio
 *   di Paesana, con la zona abitata da non sorvolare bassa
 *
 * La libreria (~5 MB compressi) viene scaricata SOLO quando la sezione entra nel
 * viewport: la pagina resta veloce come prima.
 *
 * Nota tile: le etichette CARTO sono state rimosse (ora esigono API key e restituiscono
 * placeholder «API KEY REQUIRED»); i toponimi dei decolli sono etichette Cesium nostre.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Mountain } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { CartinaDecollo } from "@/components/CartinaMeteo";
import { windAtAltitude } from "@/components/CartinaMeteo";
import type { HourlyPoint } from "@/services/threeSourceWeather";
import { createTerrariumTerrainProvider } from "./terrain";
import "./cartina3d.css";

type CesiumNs = typeof import("cesium");

const QUOTAS = [2000, 2500, 3000, 3500, 4000] as const;
type Quota3D = (typeof QUOTAS)[number];

/** Atterraggio di riferimento della Val Po (dal bozzetto utente: arrivo a Paesana). */
const LANDING = { lat: 44.6968, lon: 7.2805, name: "Atterraggio · Paesana" };
/** Centro abitato di Paesana: sorvolo basso da evitare (bozzetto utente). */
const NOFLY = { lat: 44.7003, lon: 7.2885 };

const DIR8 = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
function dir8(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "N/D";
  return DIR8[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/* stessa scala colori della scena "Il cielo" */
function windColor3d(ws: number): string {
  if (ws < 8) return "#7dd3fc";
  if (ws < 15) return "#9fe870";
  if (ws < 22) return "#facc15";
  if (ws < 32) return "#fb923c";
  return "#f87171";
}

function hourOf(p: HourlyPoint | null | undefined): number {
  if (!p?.time) return -1;
  const h = Number(p.time.slice(11, 13));
  return Number.isFinite(h) ? h : -1;
}

/** Pin da avvicinamento disegnato su canvas (nessuna immagine esterna). */
function makePin(Cesium: CesiumNs, color: string, active: boolean): string {
  const c = document.createElement("canvas");
  c.width = 52;
  c.height = 68;
  const g = c.getContext("2d")!;
  /* ombra portata a terra */
  g.beginPath();
  g.ellipse(26, 64, 9, 3, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fill();
  /* coda del pin */
  g.beginPath();
  g.moveTo(26, 62);
  g.lineTo(16, 27);
  g.lineTo(36, 27);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = "rgba(6,14,26,0.92)";
  g.stroke();
  /* testa */
  g.beginPath();
  g.arc(26, 18, 13.5, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(26, 18, 5, 0, Math.PI * 2);
  g.fillStyle = "rgba(10,22,38,0.92)";
  g.fill();
  if (active) {
    g.beginPath();
    g.arc(26, 18, 18, 0, Math.PI * 2);
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 2.4;
    g.stroke();
  }
  return c.toDataURL();
}

export interface Cartina3DProps {
  decolli: CartinaDecollo[];
  selectedId?: string;
  hour: number;
  onSelect?: (item: CartinaDecollo) => void;
}

export default function Cartina3D({ decolli, selectedId, hour, onSelect }: Cartina3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const creditsRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const cesiumRef = useRef<CesiumNs | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const markersRef = useRef<import("cesium").Entity[]>([]);
  const breezeRef = useRef<import("cesium").Entity[]>([]);
  const windRef = useRef<import("cesium").Entity[]>([]);
  const routeRef = useRef<import("cesium").Entity[]>([]);

  const [armed, setArmed] = useState(false); // IntersectionObserver: sezione vicina
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const [tilesLoaded, setTilesLoaded] = useState(false);

  const [siteId, setSiteId] = useState<string>("");
  const [quota, setQuota] = useState<Quota3D | 0>(2500);
  const [breeze, setBreeze] = useState(true);
  const [route, setRoute] = useState(true);

  const good = useMemo(
    () => decolli.filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon) && (d.lat !== 0 || d.lon !== 0)),
    [decolli],
  );
  const activeId = siteId || selectedId || good[0]?.id || "";
  const active = good.find((d) => d.id === activeId) ?? good[0];

  useEffect(() => {
    if (selectedId) setSiteId(selectedId);
  }, [selectedId]);

  /* carica la scena solo quando la sezione si avvicina al viewport */
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: "340px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ---------- inizializzazione viewer ---------- */
  useEffect(() => {
    if (!armed || viewerRef.current || cesiumRef.current) return;
    let disposed = false;
    setStatus("loading");

    (async () => {
      try {
        if (!document.querySelector('link[data-cesium="1"]')) {
          const l = document.createElement("link");
          l.rel = "stylesheet";
          l.href = "/cesium/Widgets/widgets.css";
          l.dataset.cesium = "1";
          document.head.appendChild(l);
        }
        const Cesium = await import("cesium");
        if (disposed || !mountRef.current) return;
        cesiumRef.current = Cesium;

        const viewer = new Cesium.Viewer(mountRef.current, {
          baseLayer: new Cesium.ImageryLayer(
            new Cesium.UrlTemplateImageryProvider({
              url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              maximumLevel: 17,
              credit: new Cesium.Credit("Immagini © Esri, Maxar, Earthstar Geographics"),
            }),
          ),
          terrainProvider: createTerrariumTerrainProvider(Cesium),
          creditContainer: creditsRef.current ?? undefined,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          shadows: false,
          msaaSamples: 4,
        });
        if (disposed) {
          viewer.destroy();
          return;
        }
        viewerRef.current = viewer;
        /* handle per test/debug (usato dagli script di verifica) */
        (window as unknown as Record<string, unknown>).__c3dViewer = viewer;

        /* scene leggibili e professionali: niente illuminazione solare (resta leggibile di sera),
           atmosfera + nebbia per la profondità, hillshade come overlay leggero per il rilievo */
        const globe = viewer.scene.globe;
        globe.baseColor = Cesium.Color.fromCssColorString("#0a1626");
        globe.enableLighting = false;
        globe.depthTestAgainstTerrain = true;
        globe.showGroundAtmosphere = true;
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.00012;
        viewer.scene.skyAtmosphere.show = true;
        try {
          viewer.scene.postProcessStages.fxaa.enabled = true;
        } catch {
          /* fxaa facoltativo */
        }
        viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.75);
        const ssc = viewer.scene.screenSpaceCameraController;
        ssc.minimumZoomDistance = 260;
        ssc.maximumZoomDistance = 95000;
        viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        /* hillshade per leggibilità del rilievo (le tile satellitari restano sotto) */
        const hill = viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
            maximumLevel: 16,
            credit: new Cesium.Credit("Hillshade © Esri"),
          }),
        );
        hill.alpha = 0.35;

        /* progresso terreno */
        const stopLoad = globe.tileLoadProgressEvent.addEventListener((queued: number) => {
          if (queued === 0) {
            setTilesLoaded(true);
            stopLoad();
          }
        });
        window.setTimeout(() => setTilesLoaded(true), 20000); // failsafe

        /* click sui pin → apre la scheda del decollo (come la cartina 2D) */
        viewer.screenSpaceEventHandler.setInputAction((movement) => {
          const picked = viewer.scene.pick(movement.position);
          if (Cesium.defined(picked)) {
            const id = (picked?.id as { deolloId?: string } | undefined)?.deolloId;
            if (id) {
              setSiteId(id);
              const item = good.find((d) => d.id === id);
              if (item) onSelectRef.current?.(item);
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        /* camera: vista iniziale d'insieme, poi l'effetto sotto porta la camera
           sul decollo attivo (brezze e venti subito leggibili) */
        const pts = good.map((d) => Cesium.Cartesian3.fromDegrees(d.lon, d.lat, d.elevation_m ?? 0));
        if (pts.length) {
          const bs = Cesium.BoundingSphere.fromPoints(pts);
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(7.35, 44.75, Math.max(40000, bs.radius * 3.1)),
          });
        }
        setStatus("ready");
      } catch (e) {
        if (disposed) return;
        setErrMsg(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      const v = viewerRef.current;
      viewerRef.current = null;
      cesiumRef.current = null;
      markersRef.current = [];
      breezeRef.current = [];
      windRef.current = [];
      routeRef.current = [];
      if (v && !v.isDestroyed()) v.destroy();
    };
  }, [armed, good]);

  /* ---------- pin dei decolli ---------- */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !active) return;
    markersRef.current.forEach((e) => viewer.entities.remove(e));
    markersRef.current = good.map((d) => {
      const isActive = d.id === active.id;
      return viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(d.lon, d.lat, 0),
        billboard: {
          image: makePin(Cesium, "#ffd76a", isActive),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scale: isActive ? 1.3 : 1,
          scaleByDistance: new Cesium.NearFarScalar(3000, 1, 70000, 0.5),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: `${d.site_name} · ${Math.round(d.elevation_m ?? 0)} m`,
          font: "600 12px 'Barlow Condensed', 'Manrope', sans-serif",
          fillColor: Cesium.Color.fromCssColorString("#eaf6ff"),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString("rgba(8,18,32,0.78)"),
          backgroundPadding: new Cesium.Cartesian2(6, 3),
          pixelOffset: new Cesium.Cartesian2(0, -44),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 32000),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          scale: 1,
        },
      });
    });
  }, [status, good, active]);

  /* la camera segue il decollo attivo: a ogni cambio di sito vola sulla sua valle
     (2,2 s, vista da sud-est: il versante del decollo in primo piano) */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !active) return;
    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(
        Cesium.Cartesian3.fromDegrees(active.lon, active.lat, active.elevation_m ?? 0),
        11000,
      ),
      {
        duration: 2.2,
        offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(15), Cesium.Math.toRadians(-38), 21000),
      },
    );
  }, [status, active]);

  /* punto aerologico attivo: l'ora selezionata del decollo attivo */
  const activePoint = useMemo<HourlyPoint | null>(() => {
    const hw = active?.aggressiveWeather?.hourly;
    if (!hw?.length) return null;
    return hw.find((p) => hourOf(p) === hour) ?? hw[0] ?? null;
  }, [active, hour]);

  const clear = (arr: { current: import("cesium").Entity[] }) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    arr.current.forEach((e) => viewer.entities.remove(e));
    arr.current = [];
  };

  /* ---------- brezze di versante: frecce animate sui pendii (gialle = anabatica) ---------- */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !active) return;
    clear(breezeRef);
    if (!breeze) return;

    let cancelled = false;
    (async () => {
      const anabatic = hour >= 9 && hour <= 18;
      const STEP = 450; // m — griglia 9×9 = 3,6 km attorno al decollo
      const N = 9;
      const lat0 = active.lat;
      const lon0 = active.lon;
      const mLat = 111320;
      const mLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
      const lats: number[] = [];
      const lons: number[] = [];
      for (let i = 0; i < N; i++) lats.push(lat0 + ((4 - i) * STEP) / mLat);
      for (let j = 0; j < N; j++) lons.push(lon0 + ((j - 4) * STEP) / mLon);
      const pos: import("cesium").Cartesian3[] = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pos.push(Cesium.Cartesian3.fromDegrees(lons[j], lats[i]));
      try {
        await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, pos);
      } catch (e) {
        console.warn("[c3d] campionamento brezze non riuscito:", String(e).slice(0, 120));
        return; // DEM non pronto: le brezze arrivano al prossimo refresh
      }
      if (cancelled || viewerRef.current !== viewer) return;
      const H: number[][] = [];
      for (let i = 0; i < N; i++) {
        H.push([]);
        for (let j = 0; j < N; j++) H[i].push(pos[i * N + j].height);
      }
      /* altezza del pendio interpolata (bilineare): le frecce seguono il versante */
      const hAt = (lat: number, lon: number): number => {
        const fi = 4 - (lat - lat0) * (mLat / STEP);
        const fj = (lon - lon0) * (mLon / STEP) + 4;
        const ci = Math.min(N - 2, Math.max(0, Math.floor(fi - 0.5)));
        const cj = Math.min(N - 2, Math.max(0, Math.floor(fj - 0.5)));
        const ti = Math.min(1, Math.max(0, fi - 0.5 - ci));
        const tj = Math.min(1, Math.max(0, fj - 0.5 - cj));
        return (
          H[ci][cj] * (1 - ti) * (1 - tj) +
          H[ci][cj + 1] * (1 - ti) * tj +
          H[ci + 1][cj] * ti * (1 - tj) +
          H[ci + 1][cj + 1] * ti * tj
        );
      };
      /* pendii con pendenza utile: né fondo valle piatto né pareti impossibili */
      const cands: { lon: number; lat: number; dE: number; dN: number; s: number }[] = [];
      for (let i = 1; i < N - 1; i++) {
        for (let j = 1; j < N - 1; j++) {
          const dzdx = (H[i][j + 1] - H[i][j - 1]) / (2 * STEP);
          const dzdy = (H[i - 1][j] - H[i + 1][j]) / (2 * STEP);
          const s = Math.hypot(dzdx, dzdy);
          if (s < 0.1 || s > 1.05) continue;
          const sign = anabatic ? 1 : -1; // giorno: risale il pendio; sera/notte: lo scende
          cands.push({ lon: lons[j], lat: lats[i], dE: (sign * dzdx) / s, dN: (sign * dzdy) / s, s });
        }
      }
      cands.sort((a, b) => b.s - a.s);
      const arrows = cands.filter((_, idx) => idx % 2 === 0).slice(0, 24);
      const color = Cesium.Color.fromCssColorString(anabatic ? "#ffd76a" : "#8ad6ff");

      breezeRef.current = arrows.map((p, k) => {
        const L = 85 + p.s * 55; // lunghezza freccia ∝ pendenza
        const speed = 6.5 + p.s * 4; // m/s VISIVI — la brezza vera è 2-4 m/s
        const span = 520;
        const phase = (k * 131) % span;
        const at = (off: number) => ({
          lat: p.lat + (p.dN * off) / mLat,
          lon: p.lon + (p.dE * off) / mLon,
        });
        return viewer.entities.add({
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              const t = performance.now() / 1000;
              const off = ((t * speed + phase) % span) - span / 2;
              const tail = at(off - L / 2);
              const head = at(off + L / 2);
              return [
                Cesium.Cartesian3.fromDegrees(tail.lon, tail.lat, hAt(tail.lat, tail.lon) + 22),
                Cesium.Cartesian3.fromDegrees(head.lon, head.lat, hAt(head.lat, head.lon) + 28),
              ];
            }, false),
            width: 6 + Math.round(p.s * 3),
            material: new Cesium.PolylineArrowMaterialProperty(color.withAlpha(0.92)),
          },
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [status, active, hour, breeze]);

  /* ---------- venti meteo alla quota scelta (2000 → 4000 m) ---------- */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !active) return;
    clear(windRef);
    if (quota === 0) return;

    const wind = windAtAltitude(activePoint, quota, activePoint?.wind ?? null, activePoint?.dir ?? null);
    if (wind.ws == null || wind.wd == null) return;

    let cancelled = false;
    (async () => {
      const wsK = wind.ws as number;
      const dirTo = ((wind.wd + 180) % 360) * (Math.PI / 180); // dove SPINGE il vento
      const dE = Math.sin(dirTo);
      const dN = Math.cos(dirTo);
      const L = Math.min(950, Math.max(170, wsK * 55));
      const speed = Math.min(42, Math.max(7, (wsK / 3.6) * 3.2)); // drift esagerato ×3 per la lettura
      const span = Math.max(1100, L * 5);
      const color = Cesium.Color.fromCssColorString(windColor3d(wsK));
      const mLat = 111320;
      const mLon = 111320 * Math.cos((active.lat * Math.PI) / 180);

      /* due anelli attorno al decollo; le frecce dove il terreno supera la quota restano nascoste */
      const anchors: { lon: number; lat: number }[] = [];
      for (const r of [2400, 4400]) {
        for (let a = 0; a < 12; a++) {
          const th = (a / 12) * Math.PI * 2;
          const e = Math.sin(th) * r;
          const n = Math.cos(th) * r;
          anchors.push({ lon: active.lon + e / mLon, lat: active.lat + n / mLat });
        }
      }
      const pos = anchors.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0));
      try {
        await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, pos);
      } catch (e) {
        console.warn("[c3d] campionamento venti non riuscito:", String(e).slice(0, 120));
        return;
      }
      if (cancelled || viewerRef.current !== viewer) return;
      const visible = anchors.filter((_, i) => pos[i].height + 90 < quota);

      windRef.current = visible.map((p, k) => {
        const phase = (k * 197) % span;
        return viewer.entities.add({
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              const t = performance.now() / 1000;
              const off = ((t * speed + phase) % span) - span / 2;
              const cl = p.lat + (dN * off) / mLat;
              const co = p.lon + (dE * off) / mLon;
              return [
                Cesium.Cartesian3.fromDegrees(co - (dE * L * 0.5) / mLon, cl - (dN * L * 0.5) / mLat, quota),
                Cesium.Cartesian3.fromDegrees(co + (dE * L * 0.5) / mLon, cl + (dN * L * 0.5) / mLat, quota),
              ];
            }, false),
            width: 7,
            material: new Cesium.PolylineArrowMaterialProperty(color.withAlpha(0.95)),
          },
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [status, active, activePoint, quota]);

  /* ---------- percorso consigliato decollo → atterraggio + zona abitata ---------- */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !active) return;
    clear(routeRef);
    if (!route) return;

    let cancelled = false;
    (async () => {
      const N = 44;
      const lons: number[] = [];
      const lats: number[] = [];
      const pos: import("cesium").Cartesian3[] = [];
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        const lo = active.lon + (LANDING.lon - active.lon) * t;
        const la = active.lat + (LANDING.lat - active.lat) * t;
        lons.push(lo);
        lats.push(la);
        pos.push(Cesium.Cartesian3.fromDegrees(lo, la, 0));
      }
      try {
        await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, pos);
      } catch (e) {
        console.warn("[c3d] campionamento percorso non riuscito:", String(e).slice(0, 120));
        return;
      }
      if (cancelled || viewerRef.current !== viewer) return;
      const path = pos.map((p, i) => Cesium.Cartesian3.fromDegrees(lons[i], lats[i], p.height + 30));

      routeRef.current = [
        viewer.entities.add({
          polyline: {
            positions: path,
            width: 4,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString("#ffffff").withAlpha(0.85),
              dashLength: 26,
            }),
          },
        }),
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(LANDING.lon, LANDING.lat, 0),
          billboard: {
            image: makePin(Cesium, "#5eead4", false),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            scale: 1.1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: LANDING.name,
            font: "700 12px 'Barlow Condensed', 'Manrope', sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#d9fff5"),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("rgba(8,18,32,0.8)"),
            backgroundPadding: new Cesium.Cartesian2(6, 3),
            pixelOffset: new Cesium.Cartesian2(0, -46),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        }),
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(NOFLY.lon, NOFLY.lat),
          ellipse: {
            semiMajorAxis: 380,
            semiMinorAxis: 380,
            height: 40,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            material: Cesium.Color.fromCssColorString("#ff6b6b").withAlpha(0.14),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#ff8f8f").withAlpha(0.8),
          },
          label: {
            text: "zona abitata · niente sorvolo basso",
            font: "600 11px 'Barlow Condensed', 'Manrope', sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#ffb3b3"),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("rgba(8,18,32,0.8)"),
            backgroundPadding: new Cesium.Cartesian2(5, 3),
            pixelOffset: new Cesium.Cartesian2(0, 26),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 24000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        }),
      ];
    })();

    return () => {
      cancelled = true;
    };
  }, [status, active, route]);

  return (
    <section id="vista3d" className="cartina3d" data-testid="cartina-3d" aria-label="Vista 3D del terreno con brezze di versante e venti in quota">
      <div className="c3d-toolbar">
        <div className="c3d-title">
          <Mountain size={15} aria-hidden="true" />
          <h3>Terreno in 3D</h3>
          <span className="c3d-sub">ore {String(hour).padStart(2, "0")}:00 · valori dell'ora selezionata</span>
        </div>
        <div className="c3d-controls">
          <label className="c3d-site">
            <span>Decollo</span>
            <select value={activeId} onChange={(e) => setSiteId(e.target.value)} data-testid="c3d-site">
              {good.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.site_name} ({Math.round(d.elevation_m ?? 0)} m)
                </option>
              ))}
            </select>
          </label>
          <div className="c3d-quotas" role="group" aria-label="Quota dei venti meteo">
            <span className="c3d-quotas-k">Quota</span>
            <button
              type="button"
              className={"c3d-q" + (quota === 0 ? " is-on" : "")}
              onClick={() => setQuota(0)}
              data-testid="c3d-q-off"
            >
              off
            </button>
            {QUOTAS.map((q) => (
              <button
                key={q}
                type="button"
                className={"c3d-q" + (quota === q ? " is-on" : "")}
                onClick={() => setQuota(q)}
                data-testid={`c3d-q-${q}`}
              >
                {q}
              </button>
            ))}
          </div>
          <label className="c3d-toggle">
            <Switch checked={breeze} onCheckedChange={setBreeze} aria-label="Brezze di versante" />
            <span>Brezze di versante</span>
          </label>
          <label className="c3d-toggle">
            <Switch checked={route} onCheckedChange={setRoute} aria-label="Percorso atterraggio" />
            <span>Percorso atterraggio</span>
          </label>
        </div>
      </div>

      <div className="c3d-stage">
        <div className="c3d-mount" ref={mountRef} />
        <div className="c3d-credits" ref={creditsRef} />

        {/* dati aerologici flottanti */}
        <Hud
          ready={status === "ready"}
          breeze={breeze}
          anabatic={hour >= 9 && hour <= 18}
          quota={quota}
          wind={quota > 0 ? windAtAltitude(activePoint, quota, activePoint?.wind ?? null, activePoint?.dir ?? null) : null}
        />

        {status === "loading" && (
          <div className="c3d-overlay" data-testid="c3d-loading">
            <span className="c3d-spin" aria-hidden="true" />
            <p>
              <strong>Preparo il terreno 3D…</strong>
              <small>scarico DEM e immagini satellite (~6 MB, una sola volta)</small>
            </p>
          </div>
        )}
        {status === "error" && (
          <div className="c3d-overlay is-err">
            <p>
              <strong>La vista 3D non è disponibile su questo dispositivo.</strong>
              <small>{errMsg || "WebGL potrebbe essere disattivato."}</small>
            </p>
          </div>
        )}
        {status === "ready" && !tilesLoaded && <div className="c3d-progress">terreno in caricamento…</div>}
      </div>

      <div className="c3d-legend">
        <span>
          <i className={"c3d-sw is-brezza" + (hour >= 9 && hour <= 18 ? "" : " is-kat")} aria-hidden="true" />
          {hour >= 9 && hour <= 18 ? "brezza anabatica (risale il pendio)" : "brezza catabatica (scende il pendio)"} · simulata, non in scala
        </span>
        <span>
          <i className="c3d-sw is-vento" aria-hidden="true" /> vento meteo alla quota scelta (dal sounding)
        </span>
        <span>
          <i className="c3d-sw is-route" aria-hidden="true" /> percorso consigliato → atterraggio
        </span>
        <span>
          <i className="c3d-sw is-nofly" aria-hidden="true" /> zona abitata: niente sorvolo basso
        </span>
      </div>
    </section>
  );
}

/* HUD: letture aerologiche sopra la scena */
function Hud({
  ready,
  breeze,
  anabatic,
  quota,
  wind,
}: {
  ready: boolean;
  breeze: boolean;
  anabatic: boolean;
  quota: Quota3D | 0;
  wind: { ws: number | null; wd: number | null } | null;
}) {
  if (!ready) return null;
  return (
    <div className="c3d-hud" data-testid="c3d-hud">
      <span className="c3d-hud-k">
        {breeze
          ? anabatic
            ? "Brezza anabatica · risale i versanti"
            : "Brezza catabatica · scende i versanti"
          : "Brezze di versante nascoste"}
      </span>
      <span className="c3d-hud-v" data-testid="c3d-hud-wind">
        {quota === 0
          ? "Venti in quota nascosti"
          : wind?.ws != null && wind?.wd != null
            ? `Vento a ${quota} m · ${Math.round(wind.ws)} km/h · da ${dir8(wind.wd)}`
            : `Vento a ${quota} m · dati in arrivo…`}
      </span>
    </div>
  );
}
