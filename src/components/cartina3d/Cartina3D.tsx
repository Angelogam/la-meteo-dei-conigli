"use client";

/**
 * TERRENO IN 3D — la vista satellite/DEM sotto la cartina dei decolli.
 *
 * Motore: CesiumJS (open source) + terreno DEM gratuito (Mapzen/AWS) + immagini
 * satellite Esri ad alta risoluzione (massimo dettaglio, contrasto potenziato).
 *
 * Cosa mostra:
 * - i DECOLLI con pin cliccabili e un PARAPENDIO in volo che fluttua sopra ognuno
 * - il CAMPO VENTO LIVE su tutta la valle (non solo vicino al decollo): una
 *   griglia fitta di frecce GRANDI in movimento continuo, colorate per aerologia:
 *     verde = portanza (vento contro il versante) · rosso = sottovento
 *     giallo = anabatica (giorno) · ciano = catabatica (notte) · ambra = flusso
 *   Dati: Open-Meteo in bulk su griglia 3×3, aggiornati automaticamente ogni 15 min
 * - i VENTI METEO alla quota scelta (2000 → 4000 m) dal sounding già usato dal
 *   sito: frecce grandi, colore per quota, in movimento continuo
 * - NAVIGAZIONE stile Google Earth: bussola trascinabile a 360°, rotazione,
 *   tilt, zoom, vista dall'alto 2D e ritorno al decollo
 *
 * La libreria (~5 MB compressi) viene scaricata SOLO quando la sezione entra nel
 * viewport: la pagina resta veloce come prima.
 *
 * Nota tile: le etichette CARTO sono state rimosse (ora esigono API key); i
 * toponimi dei decolli sono etichette Cesium nostre. Il percorso verso
 * l'atterraggio è stato rimosso su richiesta: questa vista è il campo vento.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Mountain } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { CartinaDecollo } from "@/components/CartinaMeteo";
import { windAtAltitude } from "@/components/CartinaMeteo";
import type { HourlyPoint } from "@/services/threeSourceWeather";
import { createTerrariumTerrainProvider, sampleTerrainHeights } from "./terrain";
import { buildWindField, computeFlows, fetchLiveWind, FLOW_COLORS, heightAt } from "./winds";
import type { FlowCell, LivePoint, WindField } from "./winds";
import { gliderImage, pinImage } from "./sprites";
import Nav3D from "./Nav3D";
import "./cartina3d.css";

type CesiumNs = typeof import("cesium");
type ViewerNs = import("cesium").Viewer;

const QUOTAS = [2000, 2500, 3000, 3500, 4000] as const;
type Quota3D = (typeof QUOTAS)[number];

/** Colore dei venti in quota: il COLORE dice la quota (come in Alpium). */
const QUOTA_COLORS: Record<Quota3D, string> = {
  2000: "#4cc3ff",
  2500: "#3ddc84",
  3000: "#ffd23f",
  3500: "#ff9f43",
  4000: "#ff5cc8",
};

const DIR8 = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
function dir8(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "N/D";
  return DIR8[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function hourOf(p: HourlyPoint | null | undefined): number {
  if (!p?.time) return -1;
  const h = Number(p.time.slice(11, 13));
  return Number.isFinite(h) ? h : -1;
}

/** Camera sul decollo: vista da sud-est abbastanza vicina da leggere il campo. */
function flyToSite(Cesium: CesiumNs, viewer: ViewerNs, d: CartinaDecollo): void {
  viewer.camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(d.lon, d.lat, d.elevation_m ?? 0), 7000),
    {
      duration: 2.2,
      offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(15), Cesium.Math.toRadians(-38), 14000),
    },
  );
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
  const viewerRef = useRef<ViewerNs | null>(null);
  const cesiumRef = useRef<CesiumNs | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const markersRef = useRef<import("cesium").Entity[]>([]);
  const surfRef = useRef<import("cesium").Entity[]>([]);
  const windRef = useRef<import("cesium").Entity[]>([]);
  const fieldCacheRef = useRef<Map<string, WindField>>(new Map());

  const [armed, setArmed] = useState(false); // IntersectionObserver: sezione vicina
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const [tilesLoaded, setTilesLoaded] = useState(false);

  const [siteId, setSiteId] = useState<string>("");
  const [quota, setQuota] = useState<Quota3D | 0>(2500);
  const [surface, setSurface] = useState(true);

  /* campo vento: griglia DEM + dati live Open-Meteo */
  const [field, setField] = useState<WindField | null>(null);
  const [fieldBusy, setFieldBusy] = useState(false);
  const [live, setLive] = useState<LivePoint[] | null>(null);
  const [liveAt, setLiveAt] = useState<string>("");

  /* retry del campionamento DEM: se un'onda di tile è a metà, gli effetti si
     rilanciano da soli (max 5 tentativi) invece di lasciare la scena senza frecce */
  const demRetries = useRef(0);
  const [demEpoch, setDemEpoch] = useState(0);

  const good = useMemo(
    () => decolli.filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon) && (d.lat !== 0 || d.lon !== 0)),
    [decolli],
  );
  /* il viewer NON deve essere ricreato quando l'array decolli cambia identità
     (refresh dati): tengo il riferimento corrente in un ref e inizializzo solo
     quando la sezione entra nel viewport */
  const goodRef = useRef(good);
  goodRef.current = good;
  const activeId = siteId || selectedId || good[0]?.id || "";
  const active = good.find((d) => d.id === activeId) ?? good[0];
  const anabatic = hour >= 9 && hour <= 18;

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
              maximumLevel: 18,
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
        /* log diagnostico: un errore di rendering non deve restare invisibile */
        viewer.scene.renderError.addEventListener((_scene, e) => {
          console.warn("[c3d] renderError:", (e as Error)?.message || String(e));
        });

        /* ---- RESA NITIDA stile Google Earth ----
           - massimo un pixel di errore schermo: forza il caricamento delle tile
             satellitari un livello più fine (la differenza si vede eccome)
           - render alla risoluzione nativa del display (retina incluso)
           - contrasto/saturazione potenziati sul satellite, hillshade leggero
           - nebbia ridotta: le creste lontane restano leggibili */
        const globe = viewer.scene.globe;
        globe.baseColor = Cesium.Color.fromCssColorString("#0a1626");
        globe.enableLighting = false;
        globe.depthTestAgainstTerrain = true;
        globe.showGroundAtmosphere = true;
        globe.maximumScreenSpaceError = 1.4;
        globe.tileCacheSize = 250000000;
        globe.preloadSiblings = true;
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.00008;
        viewer.scene.skyAtmosphere.show = true;
        try {
          viewer.scene.postProcessStages.fxaa.enabled = true;
        } catch {
          /* fxaa facoltativo */
        }
        const dpr = window.devicePixelRatio || 1;
        viewer.useBrowserRecommendedResolution = false; // pixel reali, non CSS
        viewer.resolutionScale = dpr >= 1.5 ? 0.75 : 1;
        const base = viewer.imageryLayers.get(0);
        if (base) {
          base.brightness = 1.12;
          base.contrast = 1.14;
          base.saturation = 1.28;
          base.gamma = 0.96;
        }
        const ssc = viewer.scene.screenSpaceCameraController;
        ssc.minimumZoomDistance = 320;
        ssc.maximumZoomDistance = 95000;
        viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        /* hillshade molto leggero: dà rilievo senza sporcare il satellite */
        const hill = viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
            maximumLevel: 16,
            credit: new Cesium.Credit("Hillshade © Esri"),
          }),
        );
        hill.alpha = 0.16;

        /* progresso terreno */
        const stopLoad = globe.tileLoadProgressEvent.addEventListener((queued: number) => {
          if (queued === 0) {
            setTilesLoaded(true);
            stopLoad();
          }
        });
        window.setTimeout(() => setTilesLoaded(true), 20000); // failsafe

        /* click su pin/parapendio → apre la scheda del decollo (come la cartina 2D) */
        viewer.screenSpaceEventHandler.setInputAction((movement) => {
          const picked = viewer.scene.pick(movement.position);
          if (Cesium.defined(picked)) {
            const id = (picked?.id as { deolloId?: string } | undefined)?.deolloId;
            if (id) {
              setSiteId(id);
              const item = goodRef.current.find((d) => d.id === id);
              if (item) onSelectRef.current?.(item);
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        /* camera: vista iniziale d'insieme, poi l'effetto sotto porta la camera
           sul decollo attivo (campo vento subito leggibile) */
        const pts = goodRef.current.map((d) => Cesium.Cartesian3.fromDegrees(d.lon, d.lat, d.elevation_m ?? 0));
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
      surfRef.current = [];
      windRef.current = [];
      fieldCacheRef.current.clear();
      if (v && !v.isDestroyed()) v.destroy();
    };
  }, [armed]);

  /* ---------- pin dei decolli + PARAPENDIO in volo sopra ognuno ---------- */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !active) return;
    markersRef.current.forEach((e) => viewer.entities.remove(e));
    const glider = gliderImage();

    markersRef.current = good.flatMap((d) => {
      const isActive = d.id === active.id;
      const pin = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(d.lon, d.lat, 0),
        billboard: {
          image: pinImage(Cesium, "#ffd76a", isActive),
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
      (pin as unknown as { deolloId: string }).deolloId = d.id;

      /* parapendio che plana sopra il decollo: bob lento su e giù */
      let lastG: import("cesium").Cartesian3 | null = null;
      const phaseG = (d.lat * 577.7) % (Math.PI * 2);
      const gl = viewer.entities.add({
        position: new Cesium.CallbackProperty(() => {
          const t = performance.now() / 1000;
          const alt = (d.elevation_m ?? 0) + 250 + 22 * Math.sin(t * 0.85 + phaseG);
          const p = Cesium.Cartesian3.fromDegrees(d.lon, d.lat, alt);
          if (Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)) {
            lastG = p;
            return p;
          }
          return lastG ?? Cesium.Cartesian3.ZERO;
        }, false),
        billboard: {
          image: glider,
          scale: 0.66,
          scaleByDistance: new Cesium.NearFarScalar(2500, 0.75, 45000, 0.5),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 52000),
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
        },
      });
      (gl as unknown as { deolloId: string }).deolloId = d.id;
      return [pin, gl];
    });
  }, [status, good, active]);

  /* la camera segue il decollo attivo: a ogni cambio di sito vola sulla sua valle */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !active) return;
    flyToSite(Cesium, viewer, active);
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

  /* ---------- griglia DEM del campo vento (una volta per decollo, in cache) ---------- */
  useEffect(() => {
    if (status !== "ready" || !active) return;
    let cancelled = false;
    const cached = fieldCacheRef.current.get(active.id);
    if (cached) {
      setField(cached);
      setFieldBusy(false);
      return;
    }
    setField(null);
    setFieldBusy(true);
    (async () => {
      try {
        const f = await buildWindField(active.lat, active.lon);
        if (cancelled) return;
        fieldCacheRef.current.set(active.id, f);
        demRetries.current = 0;
        setField(f);
        setFieldBusy(false);
      } catch (e) {
        console.warn("[c3d] griglia DEM vento non pronta:", String(e).slice(0, 120));
        if (demRetries.current < 5) {
          demRetries.current += 1;
          window.setTimeout(() => {
            if (!cancelled) setDemEpoch((n) => n + 1);
          }, 5000);
        } else {
          setFieldBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, active, demEpoch]);

  /* ---------- venti LIVE: Open-Meteo bulk, refresh automatico ogni 15 min ---------- */
  useEffect(() => {
    if (status !== "ready" || !field) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const pts = await fetchLiveWind(field, hour);
        if (cancelled) return;
        setLive(pts);
        setLiveAt(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
      } catch (e) {
        /* senza dati live il campo resta con le sole brezze di versante */
        console.warn("[c3d] venti live non disponibili:", String(e).slice(0, 100));
      }
    };
    pull();
    const iv = window.setInterval(pull, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [status, field, hour]);

  /* classificazione aerologica: matematica pura, rieseguita a ogni ora/dati */
  const flows = useMemo<FlowCell[]>(() => (field ? computeFlows(field, live, hour) : []), [field, live, hour]);

  /* ---------- CAMPO VENTO ANIMATO: frecce grandi che attraversano la valle ---------- */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !field || !flows.length) return;
    clear(surfRef);
    if (!surface) return;

    surfRef.current = flows.map((c, k) => {
      const phase = (k * 137.7) % c.span;
      let last: import("cesium").Cartesian3[] | null = null;
      const posAt = (off: number): import("cesium").Cartesian3 => {
        const la = c.lat + (c.dN * off) / field.mLat;
        const lo = c.lon + (c.dE * off) / field.mLon;
        return Cesium.Cartesian3.fromDegrees(lo, la, heightAt(field, la, lo) + 60);
      };
      return viewer.entities.add({
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            const t = performance.now() / 1000;
            const off = ((t * c.speedVis + phase) % c.span) - c.span / 2;
            const calc = [posAt(off - c.len / 2), posAt(off + c.len / 2)];
            /* mai posizioni NaN a Cesium: senza questo il render si ferma */
            if (calc.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))) {
              last = calc;
              return calc;
            }
            return last ?? [Cesium.Cartesian3.ZERO, Cesium.Cartesian3.ZERO];
          }, false),
          width: c.w,
          material: new Cesium.PolylineArrowMaterialProperty(
            Cesium.Color.fromCssColorString(FLOW_COLORS[c.cls]).withAlpha(0.95),
          ),
        },
      });
    });
  }, [status, field, flows, surface]);

  /* ---------- venti meteo alla quota scelta (2000 → 4000 m), colore = quota ---------- */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !active) return;
    clear(windRef);
    if (quota === 0) return;

    const wind = windAtAltitude(activePoint, quota, activePoint?.wind ?? null, activePoint?.dir ?? null);
    if (wind.ws == null || wind.wd == null) return;
    /* NaN non è null: con sounding parziali il valore può arrivare NaN e
       posizioni NaN fermano il rendering di tutta la scena */
    if (!Number.isFinite(wind.ws) || !Number.isFinite(wind.wd)) return;

    let cancelled = false;
    (async () => {
      const wsK = wind.ws as number;
      const dirTo = ((wind.wd + 180) % 360) * (Math.PI / 180); // dove SPINGE il vento
      const dE = Math.sin(dirTo);
      const dN = Math.cos(dirTo);
      const L = Math.min(1800, Math.max(500, wsK * 55));
      const speed = Math.min(42, Math.max(7, (wsK / 3.6) * 3.2)); // drift esagerato ×3 per la lettura
      const span = Math.max(2200, L * 4);
      const color = Cesium.Color.fromCssColorString(QUOTA_COLORS[quota as Quota3D]);
      const mLat = 111320;
      const mLon = 111320 * Math.cos((active.lat * Math.PI) / 180);

      /* due anelli attorno al decollo; le frecce dove il terreno supera la quota restano nascoste */
      const anchors: { lon: number; lat: number }[] = [];
      for (const r of [2400, 4600]) {
        for (let a = 0; a < 16; a++) {
          const th = (a / 16) * Math.PI * 2;
          const e = Math.sin(th) * r;
          const n = Math.cos(th) * r;
          anchors.push({ lon: active.lon + e / mLon, lat: active.lat + n / mLat });
        }
      }
      const pos = anchors.map((p) => ({ lat: p.lat, lon: p.lon }));
      let hs: number[];
      try {
        hs = await sampleTerrainHeights(pos);
        demRetries.current = 0;
      } catch (e) {
        console.warn("[c3d] campionamento venti non riuscito:", String(e).slice(0, 120));
        if (demRetries.current < 5) {
          demRetries.current += 1;
          window.setTimeout(() => {
            if (!cancelled) setDemEpoch((n) => n + 1);
          }, 5000);
        }
        return;
      }
      if (cancelled || viewerRef.current !== viewer) return;
      const visible = anchors.filter((_, i) => hs[i] + 90 < quota);

      windRef.current = visible.map((p, k) => {
        const phase = (k * 197) % span;
        let last: import("cesium").Cartesian3[] | null = null;
        return viewer.entities.add({
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              const t = performance.now() / 1000;
              const off = ((t * speed + phase) % span) - span / 2;
              const cl = p.lat + (dN * off) / mLat;
              const co = p.lon + (dE * off) / mLon;
              const calc = [
                Cesium.Cartesian3.fromDegrees(co - (dE * L * 0.5) / mLon, cl - (dN * L * 0.5) / mLat, quota),
                Cesium.Cartesian3.fromDegrees(co + (dE * L * 0.5) / mLon, cl + (dN * L * 0.5) / mLat, quota),
              ];
              if (calc.every((c) => Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z))) {
                last = calc;
                return calc;
              }
              return last ?? [Cesium.Cartesian3.ZERO, Cesium.Cartesian3.ZERO];
            }, false),
            width: 11,
            material: new Cesium.PolylineArrowMaterialProperty(color.withAlpha(0.95)),
          },
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [status, active, activePoint, quota, demEpoch]);

  const resetView = () => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (Cesium && viewer && active) flyToSite(Cesium, viewer, active);
  };

  return (
    <section id="vista3d" className="cartina3d" data-testid="cartina-3d" aria-label="Vista 3D del terreno con campo vento live e venti in quota">
      <div className="c3d-toolbar">
        <div className="c3d-title">
          <Mountain size={15} aria-hidden="true" />
          <h3>Terreno in 3D</h3>
          <span className="c3d-sub">ore {String(hour).padStart(2, "0")}:00 · campo vento live Open-Meteo · agg. automatico 15 min</span>
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
                style={quota === q ? { background: QUOTA_COLORS[q], borderColor: QUOTA_COLORS[q], color: "#0a1626" } : undefined}
              >
                {q}
              </button>
            ))}
          </div>
          <label className="c3d-toggle">
            <Switch checked={surface} onCheckedChange={setSurface} aria-label="Campo vento suolo" />
            <span>Venti suolo</span>
          </label>
        </div>
      </div>

      <div className="c3d-stage">
        <div className="c3d-mount" ref={mountRef} />
        <div className="c3d-credits" ref={creditsRef} />

        {/* dati aerologici flottanti */}
        <Hud
          ready={status === "ready"}
          surface={surface}
          anabatic={anabatic}
          fieldBusy={fieldBusy}
          liveAt={liveAt}
          quota={quota}
          wind={quota > 0 ? windAtAltitude(activePoint, quota, activePoint?.wind ?? null, activePoint?.dir ?? null) : null}
        />

        {/* navigazione stile Google Earth */}
        {status === "ready" && viewerRef.current && cesiumRef.current && (
          <Nav3D Cesium={cesiumRef.current} viewer={viewerRef.current} onReset={resetView} />
        )}

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
          <i className="c3d-sw is-lift" aria-hidden="true" /> portanza: il vento spinge contro il versante
        </span>
        <span>
          <i className="c3d-sw is-lee" aria-hidden="true" /> sottovento: affondamento oltre la cresta
        </span>
        <span>
          <i className={"c3d-sw " + (anabatic ? "is-ana" : "is-kata")} aria-hidden="true" />
          {anabatic ? "brezza anabatica (risale i pendii)" : "brezza catabatica (scende i pendii)"}
        </span>
        <span>
          <i className="c3d-sw is-flow" aria-hidden="true" /> flusso di valle
        </span>
        <span>
          <i className="c3d-sw is-quota" aria-hidden="true" /> vento in quota 2000 → 4000 m (colore = quota)
        </span>
      </div>
    </section>
  );
}

/* HUD: letture aerologiche sopra la scena */
function Hud({
  ready,
  surface,
  anabatic,
  fieldBusy,
  liveAt,
  quota,
  wind,
}: {
  ready: boolean;
  surface: boolean;
  anabatic: boolean;
  fieldBusy: boolean;
  liveAt: string;
  quota: Quota3D | 0;
  wind: { ws: number | null; wd: number | null } | null;
}) {
  if (!ready) return null;
  return (
    <div className="c3d-hud" data-testid="c3d-hud">
      <span className="c3d-hud-k" data-testid="c3d-hud-live">
        <i className="c3d-live-dot" aria-hidden="true" />
        {fieldBusy
          ? "campo vento: preparo la griglia del terreno…"
          : liveAt
            ? `venti live suolo · aggiornati alle ${liveAt}`
            : "venti suolo: dati live in arrivo…"}
      </span>
      <span className="c3d-hud-v" data-testid="c3d-hud-surface">
        {surface
          ? anabatic
            ? "verde = portanza · rosso = sottovento · giallo = risale i pendii"
            : "verde = portanza · rosso = sottovento · ciano = scende i pendii"
          : "venti suolo nascosti"}
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
