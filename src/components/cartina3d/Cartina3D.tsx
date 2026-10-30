"use client";

/**
 * TERRENO IN 3D — la vista satellite/DEM sotto la cartina dei decolli.
 *
 * Motore: CesiumJS (open source) + terreno DEM gratuito (Mapzen/AWS) + immagini
 * satellite Esri ad alta risoluzione (massimo dettaglio, contrasto potenziato).
 *
 * Cosa mostra (UN FLUSSO ALLA VOLTA, mai sovrapposti — richiesta pilota):
 * - i DECOLLI con pin cliccabili e un PARAPENDIO in volo che fluttua sopra ognuno
 * - le BREZZE DEL PENDIO (toggle «Brezze del pendio»): flusso CONTINUO di
 *   frecce ONDULATE 3D LARGHE e BLU che riempiono tutti i rilievi come acqua
 *   che risale le rocce — tantissime frecce a CODA LUNGA e molto VELOCI su
 *   una griglia DEM larga ≈17×12 km (anche fuori dalle zone decollo), salgono
 *   i pendii di giorno, scendono di notte, con ROTORI ROSSI di sottovento che
 *   girano su se stessi dietro le creste ed ETICHETTE km/h + direzione
 * - i VENTI METEO IN QUOTA SOLO SU CLIC della quota (1740→4000 m, passi di
 *   250): clicco 2000 → SOLO il vento dominante a 2000 m con velocità e
 *   direzione; clicco 3000 → solo il meteo a 3000. Colore = velocità nella
 *   GAMMA dal GIALLO al VIOLA SCURO (forte = viola scuro)
 * - PREVISIONI a fasce orarie per 5 giorni (6→21 h, cliccabili sopra la scena): la
 *   barra guida giorno e ora su TUTTA la vista 3D (campo, quota, termiche); se il
 *   modello non risponde una STIMA dal sounding mantiene le fasce cliccabili
 * - le TERMICHE come COLONNE D'ARIA luminose fino alla base delle nuvole (LCL
 *   dal sounding): texture a gradiente con costolature elicoidali, nucleo
 *   interno, eliche di risalita, anello pulsante e bolle — stile XCTherm
 *   (thermal.kk7.ch), confermate dai voli reali dove disponibili
 * - NAVIGAZIONE stile Google Earth: bussola trascinabile a 360°, rotazione, tilt,
 *   zoom, vista dall'alto 2D, ritorno al decollo e TASTO SCHERMO INTERO
 * - resa in ALTA DEFINIZIONE: render alla risoluzione fisica del display
 *
 * La libreria (~5 MB compressi) viene scaricata SOLO quando la sezione entra nel
 * viewport: la pagina resta veloce come prima.
 *
 * Nota tile: le etichette CARTO sono state rimosse (ora esigono API key); i
 * toponimi dei decolli sono etichette Cesium nostre. Il percorso verso
 * l'atterraggio è stato rimosso su richiesta: questa vista è il campo vento.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Maximize2, Minimize2, Mountain } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { CartinaDecollo } from "@/components/CartinaMeteo";
import { windAtAltitude } from "@/components/CartinaMeteo";
import type { HourlyPoint } from "@/services/threeSourceWeather";
import { createTerrariumTerrainProvider, sampleTerrainHeights } from "./terrain";
import { buildFallbackForecast, buildWindField, computeFlows, fetchForecast, liveAt, speedColor } from "./winds";
import type { FlowCell, ForecastData, WindField } from "./winds";
import { fetchPilotThermals, XCTHERM_CREDIT } from "./xcflights";
import type { PilotThermal } from "./xcflights";
import { cloudBaseFrom, computeTriggers } from "./thermals";
import type { TriggerCell } from "./thermals";
import { buildWindFlow, type WindFlowHandle } from "./windflow";
import { bubbleImage, chevronSprite, coneSideImage, gliderImage, pinImage, ringImage } from "./sprites";
import Nav3D from "./Nav3D";
import "./cartina3d.css";

type CesiumNs = typeof import("cesium");
type ViewerNs = import("cesium").Viewer;

const QUOTA_STEP = 250;
const QUOTA_MAX = 4000;

/** Livelli di quota dei venti: dal DECOLLO SCELTO fino a 4000 m, passo 250 m. */
function levelsFor(elev: number | null | undefined): number[] {
  const a = Math.max(0, Math.round(Number(elev ?? 1200)));
  const out: number[] = [];
  for (let q = a; q <= QUOTA_MAX; q += QUOTA_STEP) out.push(q);
  return out.length ? out : [Math.min(a, QUOTA_MAX)];
}

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

/** Camera sul decollo: vista BASSA e INCLINATA (stile Google Earth) —
 *  da 14 km con pitch −38° il rilievo si percepiva piatto; qui la valle
 *  si legge subito come un rilievo vero. */
function flyToSite(Cesium: CesiumNs, viewer: ViewerNs, d: CartinaDecollo): void {
  viewer.camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(d.lon, d.lat, d.elevation_m ?? 0), 5200),
    {
      duration: 2.2,
      offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(15), Cesium.Math.toRadians(-52), 9800),
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
  const flowRef = useRef<WindFlowHandle | null>(null); // flusso suolo (dardi+pettine)
  const altFlowRef = useRef<WindFlowHandle | null>(null); // chevron in quota
  const thermRef = useRef<import("cesium").Entity[]>([]);
  const secRef = useRef<HTMLElement | null>(null);
  const fieldCacheRef = useRef<Map<string, WindField>>(new Map());

  const [armed, setArmed] = useState(false); // IntersectionObserver: sezione vicina
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [loadPct, setLoadPct] = useState(0); // % di caricamento del terreno

  const [siteId, setSiteId] = useState<string>("");
  /* quota dei venti meteo: 0 = nascosti (solo brezze), n = SOLO il vento a
     quella quota — un livello alla volta, mai sovrapposti (richiesta pilota) */
  const [quota, setQuota] = useState<number | null>(null);
  const [surface, setSurface] = useState(true); // BREZZE DEL PENDIO (flusso continuo)
  const [therm, setTherm] = useState(true); // termiche: dove staccano

  /* campo vento: griglia DEM + previsioni Open-Meteo (oggi + 3 giorni) */
  const [field, setField] = useState<WindField | null>(null);
  const [fieldBusy, setFieldBusy] = useState(false);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [fcAt, setFcAt] = useState<string>("");
  const [fcSim, setFcSim] = useState(false); // true = previsioni di stima (modello offline)
  /* giorno e ora selezionati: lo slider principale guida «oggi», le fasce
     orarie della barra previsioni selezionano giorno e ora per tutto il 3D */
  const [dayIdx, setDayIdx] = useState(0);
  const [selHour, setSelHour] = useState<number>(hour);

  /* schermo intero */
  const [fsOn, setFsOn] = useState(false);
  const [fsFallback, setFsFallback] = useState(false);

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
  const anabatic = selHour >= 9 && selHour <= 18;
  const effDate = forecast?.days[dayIdx]?.date ?? null;
  const dayLabel = forecast?.days[dayIdx]?.label ?? (dayIdx === 0 ? "Oggi" : `+${dayIdx} gg`);
  const levelList = useMemo(() => levelsFor(active?.elevation_m), [active?.elevation_m]);
  const effQuota = quota ?? 0; // default: niente venti in quota, solo brezze

  useEffect(() => {
    if (selectedId) setSiteId(selectedId);
  }, [selectedId]);

  /* cambiando decollo i livelli quota cambiano: riparto dall'automatico */
  useEffect(() => {
    setQuota(null);
  }, [active?.id]);

  /* l'ora del sito (slider principale della pagina) guida il 3D per «oggi» */
  useEffect(() => {
    setSelHour(hour);
  }, [hour]);

  /* punto aerologico del giorno+ora selezionati: il sounding del sito copre
     più giorni, scelgo la cella esatta data+ora con fallback sull'ora */
  const activePoint = useMemo<HourlyPoint | null>(() => {
    const hw = active?.aggressiveWeather?.hourly;
    if (!hw?.length) return null;
    const hh = String(selHour).padStart(2, "0");
    if (effDate) {
      const exact = hw.find((p) => p.time === `${effDate}T${hh}:00`);
      if (exact) return exact;
    }
    return hw.find((p) => hourOf(p) === selHour) ?? hw[0] ?? null;
  }, [active, selHour, effDate]);
  const activePointRef = useRef<HourlyPoint | null>(null);
  activePointRef.current = activePoint;

  /* venti del campo per il giorno+ora richiesti (dalla risposta bulk a 5 giorni) */
  const live = useMemo(() => (forecast ? liveAt(forecast, effDate, selHour) : null), [forecast, effDate, selHour]);
  const flows = useMemo<FlowCell[]>(() => (field ? computeFlows(field, live, selHour) : []), [field, live, selHour]);

  /* stacchi termici stile XCTherm: sole × pendenza × radiazione del sounding
     × INCLINAZIONE del vento: la bolla stacca dove l'aria (vento meteo +
     brezza) SALGE lungo il pendio; sul lato sottovento, dove l'aria scende,
     nessuno stacco */
  /* ---------- termiche confermate dai voli reali (XCTherm/XContest) ---------- */
  const [pilot, setPilot] = useState<PilotThermal[]>([]);
  useEffect(() => {
    if (status !== "ready" || !active) return;
    let cancelled = false;
    setPilot([]);
    fetchPilotThermals(active.lat, active.lon)
      .then((pts) => {
        if (!cancelled) {
          setPilot(pts);
          (window as unknown as Record<string, unknown>).__c3dPilot = pts;
        }
      })
      .catch(() => {
        /* senza dati dei voli la stima fisica resta l'unica fonte: ok */
      });
    return () => {
      cancelled = true;
    };
  }, [status, active]);

  const triggers = useMemo<TriggerCell[]>(
    () => (field ? computeTriggers(field, selHour, activePoint?.rad ?? null, flows, pilot) : []),
    [field, selHour, activePoint, flows, pilot],
  );
  /* punto aerologico dei venti in quota: col sounding reale, oppure dal campo
     (stima offline) — così HUD e frecce in quota dicono sempre la stessa cosa */
  const quotaPoint = useMemo<HourlyPoint | null>(
    () =>
      activePoint ??
      (live
        ? ({ time: "", wind: live[4]?.ws ?? null, dir: live[4]?.wd ?? null } as HourlyPoint)
        : null),
    [activePoint, live],
  );
  /* i coni disegnati: i 16 stacchi più forti (l'HUD deve dire il numero vero) */
  const nCones = useMemo(() => Math.min(16, triggers.length), [triggers.length]);

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
        (window as unknown as Record<string, unknown>).__c3dCesium = Cesium;
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
        globe.maximumScreenSpaceError = 1.25;
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
        viewer.useBrowserRecommendedResolution = false; // pixel reali, non CSS
        /* ALTA DEFINIZIONE: render alla risoluzione fisica del display (retina 2×) */
        viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2);
        /* RILIEVO EVIDENTE: esagerazione verticale moderata — da lontano le
           montagne si LEGGONO come montagne (richiesta: «non si vede il terreno») */
        viewer.scene.verticalExaggeration = 1.35;
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

        /* progresso terreno con PERCENTUALE reale: il badge non sparisce
           col vecchio failsafe a 20 s (l'utente vedeva il terreno piatto
           senza capire che stava ancora caricando) */
        let maxQ = 0;
        const stopLoad = globe.tileLoadProgressEvent.addEventListener((queued: number) => {
          if (queued > maxQ) maxQ = queued;
          setLoadPct(maxQ > 0 ? Math.round(100 * (1 - queued / maxQ)) : 100);
          if (queued === 0) {
            setTilesLoaded(true);
            stopLoad();
          }
        });
        window.setTimeout(() => setTilesLoaded(true), 45000); // failsafe generoso

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
            destination: Cesium.Cartesian3.fromDegrees(7.35, 44.75, Math.max(30000, bs.radius * 2.4)),
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
      flowRef.current?.destroy();
      flowRef.current = null;
      altFlowRef.current?.destroy();
      altFlowRef.current = null;
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
        position: new Cesium.CallbackPositionProperty(() => {
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

  /* ---------- PREVISIONI (oggi + 4 giorni): Open-Meteo bulk, refresh 15 min ----------
     Una sola richiesta alimenta il campo suolo per qualunque giorno/ora e la
     barra delle fasce orarie; su errore transitorio riprova con backoff e nel
     frattempo mostro una STIMA dal sounding, così le fasce restano cliccabili. */
  useEffect(() => {
    if (status !== "ready" || !field) return;
    let cancelled = false;
    let retryT: number | undefined;
    let retries = 0;
    const pull = async () => {
      try {
        const fc = await fetchForecast(field);
        if (cancelled) return;
        setForecast(fc);
        setFcSim(false);
        setFcAt(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
      } catch (e) {
        console.warn("[c3d] previsioni vento non disponibili:", String(e).slice(0, 100));
        if (!cancelled && retries === 0) {
          /* stima immediata dal sounding: fasce orarie sempre operative */
          const ap = activePointRef.current;
          setForecast(buildFallbackForecast(ap?.wind ?? 8, ap?.dir ?? 270));
          setFcSim(true);
          setFcAt(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
        }
        if (cancelled || retries >= 4) return;
        retries += 1;
        retryT = window.setTimeout(() => {
          if (!cancelled) pull();
        }, 30000 * retries);
      }
    };
    pull();
    const iv = window.setInterval(pull, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
      if (retryT) window.clearTimeout(retryT);
    };
  }, [status, field]);

  /* ---------- FLUSSO VENTO SUOLO: SOLO BREZZE DI PENDIO (toggle dedicato) ----------
     windflow.ts costruisce il flusso continuo blu su TUTTI i rilievi
     (anche fuori dalle zone decollo): frecce a coda lunga che corrono come
     acqua che risale le rocce, con RICCIOLI di sottovento dietro le creste.
     Quando è selezionata una QUOTA il suolo si SVUOTA: un flusso alla volta,
     mai sovrapposti. Le etichette km/h + direzione restano su una sotto-griglia
     sparsa. */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !field || !flows.length) return;
    flowRef.current?.destroy();
    flowRef.current = null;
    clear(surfRef);
    /* strumentazione per i test: il flusso è stato rimosso dalla scena */
    (window as unknown as Record<string, unknown>).__c3dWindFlow = { darts: 0, chevrons: 0, eddies: 0, total: 0 };
    if (!surface || effQuota > 0) return;

    flowRef.current = buildWindFlow(Cesium, viewer, field, live, selHour, {
      ws: Number(activePoint?.wind) > 0 ? Number(activePoint?.wind) : 7,
      wd: Number.isFinite(Number(activePoint?.dir)) ? Number(activePoint?.dir) : 270,
    });

    /* ETICHETTE del flusso: intensità km/h + direzione su una sotto-griglia
       sparsa (≈23) così restano leggibili senza coprire le frecce */
    const labs = flows
      .filter((_, k) => k % 24 === 11)
      .map((c) => {
        const hdgTo = (Math.atan2(c.dE, c.dN) * 180) / Math.PI;
        const from = ((hdgTo + 180) % 360 + 360) % 360;
        return viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(c.lon, c.lat, c.h + 60),
          label: {
            text: `${Math.round(c.sp)} km/h · da ${dir8(from)}\n${Math.round(c.h)} m${c.cls === "lee" ? " · sottovento" : ""}`,
            font: "600 11px 'Barlow Condensed','Manrope',sans-serif",
            fillColor: Cesium.Color.fromCssColorString(c.cls === "lee" ? "#ffb3c0" : "#eaf6ff"),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("rgba(8,18,32,0.78)"),
            backgroundPadding: new Cesium.Cartesian2(5, 3),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -8),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      });
    surfRef.current = labs;

    return () => {
      flowRef.current?.destroy();
      flowRef.current = null;
      labs.forEach((e) => viewer.entities.remove(e));
      surfRef.current = [];
    };
  }, [status, field, flows, surface, live, selHour, activePoint, effQuota]);

  /* ---------- VENTO METEO IN QUOTA: SOLO su clic della quota ----------
     Un livello alla volta (richiesta pilota: «se clicco a 2000 ci deve essere
     il vento dominante a 2000 e non altri venti e freccette»). Griglia ordinata
     su tutta la zona, freccia con ASTA e coda lunga orientata al Nord reale,
     COLORE = velocità nella gamma dal GIALLO al VIOLA SCURO, etichette con
     velocità + direzione + quota. Le brezze di pendio restano nascoste finché
     la quota è attiva (nessuna sovrapposizione). Frecce nascoste dove il
     terreno supera la quota. */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !active) return;
    altFlowRef.current?.destroy();
    altFlowRef.current = null;
    clear(windRef);
    if (effQuota === 0) return;
    const lvl = effQuota;

    const mLat = 111320;
    const mLon = 111320 * Math.cos((active.lat * Math.PI) / 180);

    /* ancore: griglia ordinata su tutta la zona (~13×9, passo 1400 m) */
    const anchors: { lon: number; lat: number }[] = [];
    const RNG = 8400; // semiestensione E-O (≈16.8 km di larghezza coperta)
    const dx = 1400;
    const dy = 1500;
    for (let y = -RNG; y <= RNG; y += dy) {
      for (let x = -RNG; x <= RNG; x += dx) {
        anchors.push({ lon: active.lon + x / mLon, lat: active.lat + y / mLat });
      }
    }

    let cancelled = false;
    (async () => {
      let hs: number[];
      try {
        hs = await sampleTerrainHeights(anchors);
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

      /* frecce in quota: BillboardCollection tickata a preRender.
         Il destroy viene registrato SUBITO dopo aver aggiunto la collection:
         se la creazione dei billboard fallisce, la scena resta pulita. */
      const bc = new Cesium.BillboardCollection();
      viewer.scene.primitives.add(bc);
      const moversAlt: {
        lon: number;
        lat: number;
        lvl: number;
        dE: number;
        dN: number;
        azTo: number;
        speed: number;
        span: number;
        phase: number;
        base: number;
        waveK: number;
        bb: import("cesium").Billboard;
      }[] = [];
      const added: import("cesium").Entity[] = [];
      const finite = (p: import("cesium").Cartesian3): boolean =>
        Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
      const tick = (): void => {
        if (viewer.isDestroyed()) return;
        const t = performance.now() / 1000;
        let heading = 0;
        try {
          heading = viewer.camera.heading;
        } catch {
          return;
        }
        for (const m of moversAlt) {
          const prog = ((t * m.speed + m.phase) % m.span) - m.span / 2;
          const la = m.lat + (m.dN * prog) / mLat;
          const lo = m.lon + (m.dE * prog) / mLon;
          const p = Cesium.Cartesian3.fromDegrees(lo, la, m.lvl);
          if (finite(p)) m.bb.position = p;
          m.bb.rotation = heading - m.azTo;
          const wave = 0.5 + 0.5 * Math.sin(t * 1.5 - m.waveK);
          m.bb.scale = m.base * (0.85 + 0.3 * wave);
        }
      };
      let tickAttached = false;
      altFlowRef.current = {
        destroy(): void {
          try {
            if (!viewer.isDestroyed()) {
              if (tickAttached) viewer.scene.preRender.removeEventListener(tick);
              viewer.scene.primitives.remove(bc);
            }
          } catch {
            /* il viewer era già distrutto */
          }
        },
      };

      const wind = windAtAltitude(quotaPoint, lvl, quotaPoint?.wind ?? null, quotaPoint?.dir ?? null);
      if (wind.ws != null && wind.wd != null && Number.isFinite(wind.ws) && Number.isFinite(wind.wd)) {
        const wsK = wind.ws as number;
        const dirTo = ((wind.wd + 180) % 360) * (Math.PI / 180); // dove SPINGE il vento
        const dE = Math.sin(dirTo);
        const dN = Math.cos(dirTo);
        const speed = Math.min(70, Math.max(14, (wsK / 3.6) * 4.2)); // deriva leggibile
        const span = 1700;
        const color = speedColor(wsK); // gamma giallo → viola scuro
        const base = 0.58;
        const visible = anchors.filter((_, i) => hs[i] + 90 < lvl);

        visible.forEach((p, k) => {
          const phase = (k * 197) % span;
          const start = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, lvl);
          const bb = bc.add({
            position: finite(start) ? start : Cesium.Cartesian3.ZERO,
            image: chevronSprite(color),
            scale: base,
            scaleByDistance: new Cesium.NearFarScalar(2000, 1, 42000, 0.5),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 42000),
          });
          if (!finite(start)) return;
          moversAlt.push({
            lon: p.lon,
            lat: p.lat,
            lvl,
            dE,
            dN,
            azTo: dirTo,
            speed,
            span,
            phase,
            base,
            waveK: k * 0.55,
            bb,
          });
        });

        /* ETICHETTE: velocità · direzione · quota — sparse ma ben leggibili */
        const fromQ = ((wind.wd % 360) + 360) % 360;
        const labK = [11, 38, 65, 92];
        visible.forEach((p, k) => {
          if (!labK.includes(k)) return;
          added.push(
            viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, lvl),
              label: {
                text: `${Math.round(wsK)} km/h · da ${dir8(fromQ)} · ${lvl} m`,
                font: "600 11px 'Barlow Condensed','Manrope',sans-serif",
                fillColor: Cesium.Color.fromCssColorString("#eaf6ff"),
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString("rgba(8,18,32,0.78)"),
                backgroundPadding: new Cesium.Cartesian2(5, 3),
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -8),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 30000),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
            }),
          );
        });
      }

      viewer.scene.preRender.addEventListener(tick);
      tickAttached = true;
      windRef.current = added;
    })();

    return () => {
      cancelled = true;
    };
  }, [status, active, activePoint, quotaPoint, effQuota, demEpoch]);

  /* ---------- TERMICHE: COLONNE D'ARIA CHE SALGONO (stile XCTherm) ----------
     Coni RIFATTI (richiesta pilota): colonna con TEXTURE a gradiente (base
     satura → cima evanescente), costolature elicoidali e volume ombreggiato,
     NUCLEO interno più luminoso, DUE ELICHE di aria che ruotano salendo,
     ANELLO pulsante alla base e bolle in risalita. Più eleganti del vecchio
     cilindro piatto giallo. Dal punto di stacco fino alla base delle nuvole
     (LCL dal sounding); l'etichetta dice la forza in m/s. */
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer || !field || !active) return;
    clear(thermRef);
    if (!therm || !triggers.length) return;

    const mLat = 111320;
    const mLon = 111320 * Math.cos((active.lat * Math.PI) / 180);
    const YELLOW = Cesium.Color.fromCssColorString("#ffd60a");
    const coneTex = coneSideImage();
    const bubble = bubbleImage();
    const ring = ringImage();
    const finite = (p: import("cesium").Cartesian3): boolean =>
      Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
    /* tetto fisico della bolla: base delle nuvole (LCL), altrimenti 2400 m */
    const cb = cloudBaseFrom(activePoint?.temp, activePoint?.dew, active.elevation_m);
    /* i coni restano leggibili: solo i 16 stacchi più forti */
    const top16 = [...triggers].sort((a, b) => b.strength - a.strength).slice(0, 16);

    const parts: import("cesium").Entity[] = [];
    top16.forEach((tc, k) => {
      const baseH = tc.h;
      const topH = Math.min(4000, Math.max(baseH + 700, cb != null ? Math.min(cb, baseH + 3400) : baseH + 2400));
      const len = Math.max(600, topH - baseH);
      const rBot = 95 + tc.strength * 9; // base snella
      const rTop = Math.min(470, rBot * 2.05 + tc.strength * 26); // sfiato verso l'alto

      /* CORPO: cilindro rastremato con texture a gradiente elicoidale */
      parts.push(
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(tc.lon, tc.lat, baseH + len / 2),
          cylinder: {
            length: len,
            topRadius: rTop,
            bottomRadius: rBot,
            slices: 36,
            material: new Cesium.ImageMaterialProperty({
              image: coneTex,
              repeat: new Cesium.Cartesian2(3, 1),
              transparent: true,
              color: new Cesium.CallbackProperty(
                () => Cesium.Color.WHITE.withAlpha(0.8 + 0.2 * (0.5 + 0.5 * Math.sin(performance.now() / 900 + k * 1.9))),
                false,
              ),
            }),
          },
        }),
      );

      /* NUCLEO: colonna interna più stretta e luminosa (leggibile dall'alto) */
      parts.push(
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(tc.lon, tc.lat, baseH + len / 2),
          cylinder: {
            length: len * 0.995,
            topRadius: rTop * 0.5,
            bottomRadius: rBot * 0.52,
            slices: 24,
            material: new Cesium.ImageMaterialProperty({
              image: coneTex,
              repeat: new Cesium.Cartesian2(2, 1),
              transparent: true,
              color: new Cesium.CallbackProperty(
                () => YELLOW.withAlpha(0.3 + 0.18 * (0.5 + 0.5 * Math.sin(performance.now() / 750 + k * 1.9 + 1.1))),
                false,
              ),
            }),
          },
        }),
      );

      /* LE BOLLE: tre globi di aria calda che risalgono a spirale nel cono */
      for (let b = 0; b < 3; b++) {
        const ph = k * 13.7 + b * 2.9;
        const riseK = 0.13 + b * 0.035;
        const spin = 0.9 + b * 0.3;
        let lastB: import("cesium").Cartesian3 | null = null;
        parts.push(
          viewer.entities.add({
            position: new Cesium.CallbackPositionProperty(() => {
              const t = performance.now() / 1000;
              const frac = (t * riseK + ph) % 1;
              const r = (rBot + (rTop - rBot) * frac) * 0.85;
              const a = t * spin + ph * 2;
              const alt = baseH + 40 + frac * (len - 120);
              const la = tc.lat + (Math.cos(a) * r) / mLat;
              const lo = tc.lon + (Math.sin(a) * r) / mLon;
              const p = Cesium.Cartesian3.fromDegrees(lo, la, alt);
              if (finite(p)) {
                lastB = p;
                return p;
              }
              return lastB ?? Cesium.Cartesian3.ZERO;
            }, false),
            billboard: {
              image: bubble,
              scale: 0.4 + 0.08 * (b % 2),
              scaleByDistance: new Cesium.NearFarScalar(2500, 0.5, 30000, 0.24),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 26000),
            },
          }),
        );
      }

      /* ELICHE: due linee di aria che ruotano salendo dentro la colonna */
      for (let hx = 0; hx < 2; hx++) {
        const ph = k * 2.3 + hx * Math.PI;
        let lastH: import("cesium").Cartesian3[] | null = null;
        parts.push(
          viewer.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                const t = performance.now() / 1000;
                const pts: import("cesium").Cartesian3[] = [];
                const N = 26;
                for (let i = 0; i <= N; i++) {
                  const f = i / N;
                  const ang = t * 0.9 + ph + f * Math.PI * 3.3; // ~1.6 giri in salita
                  const r = (rBot + (rTop - rBot) * f) * 0.8;
                  const la = tc.lat + (Math.cos(ang) * r) / mLat;
                  const lo = tc.lon + (Math.sin(ang) * r) / mLon;
                  pts.push(Cesium.Cartesian3.fromDegrees(lo, la, baseH + 30 + f * (len - 90)));
                }
                if (pts.every(finite)) {
                  lastH = pts;
                  return pts;
                }
                return lastH ?? [Cesium.Cartesian3.ZERO];
              }, false),
              width: 2.2,
              material: new Cesium.ColorMaterialProperty(
                new Cesium.CallbackProperty(
                  () =>
                    Cesium.Color.fromCssColorString("#ffe9a0").withAlpha(
                      0.3 + 0.18 * (0.5 + 0.5 * Math.sin(performance.now() / 1100 + ph)),
                    ),
                  false,
                ),
              ),
            },
          }),
        );
      }

      /* ANELLO pulsante alla base (billboard: economico, sempre rivolto) */
      let lastR: import("cesium").Cartesian3 | null = null;
      parts.push(
        viewer.entities.add({
          position: new Cesium.CallbackPositionProperty(() => {
            const p = Cesium.Cartesian3.fromDegrees(tc.lon, tc.lat, baseH + 8);
            if (finite(p)) {
              lastR = p;
              return p;
            }
            return lastR ?? Cesium.Cartesian3.ZERO;
          }, false),
          billboard: {
            image: ring,
            scale: new Cesium.CallbackProperty(
              () => 0.85 + 0.5 * (0.5 + 0.5 * Math.sin(performance.now() / 950 + k * 1.7)),
              false,
            ),
            scaleByDistance: new Cesium.NearFarScalar(2500, 1, 30000, 0.4),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 26000),
          },
        }),
      );

      /* alone a terra sul punto di stacco */
      const r = 70 + tc.strength * 16;
      parts.push(
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(tc.lon, tc.lat, 0),
          ellipse: {
            semiMajorAxis: r,
            semiMinorAxis: r,
            material: new Cesium.ColorMaterialProperty(
              new Cesium.CallbackProperty(
                () => YELLOW.withAlpha(0.2 + 0.12 * Math.sin(performance.now() / 700 + k * 1.7)),
                false,
              ),
            ),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            classificationType: Cesium.ClassificationType.TERRAIN,
          },
        }),
      );
    });

    /* forza scritta sulle termiche più forti */
    top16
      .filter((t) => t.strength >= 3.2)
      .slice(0, 8)
      .forEach((tc) => {
        parts.push(
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(tc.lon, tc.lat, tc.h + 540),
            label: {
              text: `↑ ${tc.strength.toFixed(1)} m/s`,
              font: "700 11px 'JetBrains Mono',monospace",
              fillColor: Cesium.Color.fromCssColorString("#ffe9a0"),
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString("rgba(40,26,4,0.78)"),
              backgroundPadding: new Cesium.Cartesian2(5, 3),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 14000),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          }),
        );
      });
    thermRef.current = parts;
    /* handle per i test di verifica: dove stanno i coni disegnati */
    (window as unknown as Record<string, unknown>).__c3dCones = top16.map((t) => ({
      lat: t.lat,
      lon: t.lon,
      h: t.h,
      strength: t.strength,
    }));
  }, [status, field, triggers, therm, activePoint, active]);

  /* ---------- SCHERMO INTERO ---------- */
  useEffect(() => {
    const onFs = () => {
      setFsOn(!!document.fullscreenElement);
      if (document.fullscreenElement) setFsFallback(false); // nativo ha priorità
      window.setTimeout(() => {
        try {
          viewerRef.current?.resize();
        } catch {
          /* opzionale */
        }
      }, 120);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* fallback per browser senza fullscreen sugli elementi (iOS Safari):
     la sezione diventa fissa a tutto schermo via CSS */
  useEffect(() => {
    if (!fsFallback) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFsFallback(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      try {
        viewerRef.current?.resize();
      } catch {
        /* opzionale */
      }
    }, 80);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.clearTimeout(id);
    };
  }, [fsFallback]);

  const toggleFullscreen = () => {
    const el = secRef.current;
    if (!el) return;
    /* fallback CSS attivo: il tasto deve USCIRE, non riprovare il nativo */
    if (fsFallback) {
      setFsFallback(false);
      window.setTimeout(() => {
        try {
          viewerRef.current?.resize();
        } catch {
          /* opzionale */
        }
      }, 80);
      return;
    }
    const doc = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
    const req = (el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen;
    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      if (el.requestFullscreen) {
        /* se il browser rifiuta/blocca (senza gesto utente, iframe senza
           allow-fullscreen, iOS) la promessa resta pendent o rigetta:
           dopo 500 ms senza successo attivo il fallback CSS */
        let settled = false;
        el.requestFullscreen()
          .then(() => {
            settled = true;
            /* alcuni ambienti (headless/WebView) risolvono la promessa senza
               applicare il fullscreen: dopo un attimo di grazie copro col
               fallback CSS, così il tasto funziona ovunque */
            window.setTimeout(() => {
              if (!document.fullscreenElement && !doc.webkitFullscreenElement) setFsFallback(true);
            }, 350);
          })
          .catch(() => {
            if (!settled) setFsFallback(true);
            settled = true;
          });
        window.setTimeout(() => {
          if (!settled && !document.fullscreenElement) {
            settled = true;
            setFsFallback(true);
          }
        }, 500);
      } else if (req) {
        req.call(el);
      } else {
        setFsFallback(true);
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => setFsFallback(false));
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
      setFsFallback(false);
    } else {
      setFsFallback(false);
    }
  };

  const resetView = () => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (Cesium && viewer && active) flyToSite(Cesium, viewer, active);
  };

  return (
    <section
      id="vista3d"
      ref={secRef}
      className={"cartina3d" + (fsFallback ? " is-fs" : "")}
      data-testid="cartina-3d"
      aria-label="Vista 3D del terreno con campo vento live, previsioni a fasce orarie e termiche"
    >
      <div className="c3d-toolbar">
        <div className="c3d-title">
          <Mountain size={15} aria-hidden="true" />
          <h3>Terreno in 3D</h3>
          <span className="c3d-sub">
            {dayLabel} · ore {String(selHour).padStart(2, "0")}:00 · vento live + previsioni Open-Meteo · agg. 15 min
          </span>
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
              className={"c3d-q" + (effQuota === 0 ? " is-on" : "")}
              onClick={() => setQuota(0)}
              data-testid="c3d-q-off"
            >
              off
            </button>
            <div className="c3d-quotas-scroll">
              {levelList.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={"c3d-q" + (effQuota === q ? " is-on" : "")}
                  onClick={() => setQuota(q)}
                  data-testid={`c3d-q-${q}`}
                  title={`Vento meteo a ${q} m: SOLO questo livello, velocità e direzione`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <label className="c3d-toggle">
            <Switch checked={surface} onCheckedChange={setSurface} aria-label="Brezze di pendio" />
            <span>Brezze del pendio</span>
          </label>
          <label className="c3d-toggle">
            <Switch checked={therm} onCheckedChange={setTherm} aria-label="Termiche dove staccano" />
            <span>Termiche</span>
          </label>
          <button
            type="button"
            className={"c3d-fsbtn" + (fsOn || fsFallback ? " is-on" : "")}
            onClick={toggleFullscreen}
            data-testid="c3d-fs"
            title="Vista a schermo intero"
          >
            {fsOn || fsFallback ? <Minimize2 size={13} aria-hidden="true" /> : <Maximize2 size={13} aria-hidden="true" />}
            <span>{fsOn || fsFallback ? "Esci" : "Schermo intero"}</span>
          </button>
          {/* collegamento diretto a Google Earth sulla posizione del decollo */}
          <a
            className="c3d-fsbtn"
            data-testid="c3d-gearth"
            href={`https://earth.google.com/web/@${active.lat.toFixed(5)},${active.lon.toFixed(5)},${Math.round(
              active.elevation_m ?? 0,
            )}a,9000d,30y,0h,62t,0r`}
            target="_blank"
            rel="noopener noreferrer"
            title="Apri questo decollo in Google Earth"
          >
            <Globe size={13} aria-hidden="true" />
            <span>Google Earth</span>
          </a>
        </div>
      </div>

      {/* previsioni del vento per le giornate a venire, a fasce orarie */}
      <Previsioni
        fc={forecast}
        dayIdx={dayIdx}
        selHour={selHour}
        sim={fcSim}
        onPick={(di, h) => {
          setDayIdx(di);
          setSelHour(h);
        }}
      />

      <div className="c3d-stage">
        <div className="c3d-mount" ref={mountRef} />
        <div className="c3d-credits" ref={creditsRef} />

        {/* dati aerologici flottanti */}
        <Hud
          ready={status === "ready"}
          surface={surface}
          anabatic={anabatic}
          fieldBusy={fieldBusy}
          fcAt={fcAt}
          fcSim={fcSim}
          dayLabel={dayLabel}
          selHour={selHour}
          quota={effQuota}
          therm={therm}
          nTriggers={triggers.length}
          nCones={nCones}
          nPilot={pilot.length}
          wind={effQuota > 0 ? windAtAltitude(quotaPoint, effQuota, quotaPoint?.wind ?? null, quotaPoint?.dir ?? null) : null}
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
        {status === "ready" && !tilesLoaded && (
          <div className="c3d-progress" data-testid="c3d-progress">
            terreno 3D in caricamento… {loadPct}%
          </div>
        )}
      </div>

      <div className="c3d-legend">
        <span className="c3d-leg-scale" data-testid="c3d-leg-scale" title="Colore dei venti meteo in quota: da giallo (debole) a viola scuro (fortissimo)">
          <i style={{ background: "#ffe97a" }} />
          <em>&lt;5</em>
          <i style={{ background: "#ffd633" }} />
          <em>5-10</em>
          <i style={{ background: "#ffb021" }} />
          <em>10-15</em>
          <i style={{ background: "#ff8a1f" }} />
          <em>15-20</em>
          <i style={{ background: "#ff5c33" }} />
          <em>20-25</em>
          <i style={{ background: "#ef3a5e" }} />
          <em>25-30</em>
          <i style={{ background: "#c932a6" }} />
          <em>30-40</em>
          <i style={{ background: "#8b2bd9" }} />
          <em>40-50</em>
          <i style={{ background: "#5b1aa8" }} />
          <em>50+ km/h</em>
        </span>
        <span>
          <i className="c3d-dot" style={{ background: "#2f9bf7" }} aria-hidden="true" />
          blu = brezze di pendio · rosso = rotori di sottovento
        </span>
        <span>
          <i className="c3d-dot" style={{ background: "#ffd60a" }} aria-hidden="true" />
          colonna luminosa = termica · forza scritta in m/s
        </span>
        {pilot.length > 0 && (
          <span className="c3d-xccredit" data-testid="c3d-xccredit">
            <i className="c3d-dot" style={{ background: "#ff9f43" }} aria-hidden="true" />
            {XCTHERM_CREDIT}
          </span>
        )}
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
  fcAt,
  fcSim,
  dayLabel,
  selHour,
  quota,
  therm,
  nTriggers,
  nCones,
  nPilot,
  wind,
}: {
  ready: boolean;
  surface: boolean;
  anabatic: boolean;
  fieldBusy: boolean;
  fcAt: string;
  fcSim: boolean;
  dayLabel: string;
  selHour: number;
  quota: number;
  therm: boolean;
  nTriggers: number;
  nCones: number;
  nPilot: number;
  wind: { ws: number | null; wd: number | null } | null;
}) {
  if (!ready) return null;
  return (
    <div className="c3d-hud" data-testid="c3d-hud">
      <span className="c3d-hud-k" data-testid="c3d-hud-live">
        <i className="c3d-live-dot" aria-hidden="true" />
        {fieldBusy
          ? "campo vento: preparo la griglia del terreno…"
          : fcAt
            ? `${dayLabel} · ore ${String(selHour).padStart(2, "0")}:00 · ${fcSim ? "previsioni di stima (modello offline) agg. " : "vento e previsioni agg. "}${fcAt}`
            : "vento e previsioni: dati in arrivo…"}
      </span>
      <span className="c3d-hud-v" data-testid="c3d-hud-surface">
        {quota > 0
          ? "brezze del pendio nascoste: è attivo il vento in quota"
          : surface
            ? anabatic
              ? "frecce blu = brezze di pendio che salgono (anabatica) · rotori rossi = sottovento"
              : "frecce blu = aria che scende i pendii (catabatica) · rotori rossi = sottovento"
            : "brezze del pendio nascoste"}
      </span>
      <span className="c3d-hud-v" data-testid="c3d-hud-wind">
        {quota === 0
          ? "clicca una quota per il vento meteo a quell'altezza (uno alla volta)"
          : wind?.ws != null && wind?.wd != null
            ? `Vento a ${quota} m · ${Math.round(wind.ws)} km/h · da ${dir8(wind.wd)}`
            : `Vento a ${quota} m · dati in arrivo…`}
      </span>
      <span className="c3d-hud-v" data-testid="c3d-hud-therm">
        {therm
          ? nTriggers > 0
            ? `${nTriggers} stacchi termici${nPilot > 0 ? ` (${nPilot} confermati dai voli reali)` : ""} · colonne luminose sulle ${nCones} più forti (forza in m/s)`
            : "termiche: nessuno stacco a quest'ora"
          : "termiche nascoste"}
      </span>
    </div>
  );
}

/* BARRA PREVISIONI: le fasce orarie cliccabili SOPRA la finestra 3D, 5 giorni
   × 6 fasce (6→21 h), chip colorati come la scala Windy; un clic porta
   giorno+ora su TUTTA la scena. Con «stima» quando il modello non risponde. */
function Previsioni({
  fc,
  dayIdx,
  selHour,
  sim,
  onPick,
}: {
  fc: ForecastData | null;
  dayIdx: number;
  selHour: number;
  sim: boolean;
  onPick: (day: number, hour: number) => void;
}) {
  if (!fc || !fc.days.length) return null;
  const day = fc.days[Math.min(dayIdx, fc.days.length - 1)];
  return (
    <div className="c3d-forecast" data-testid="c3d-forecast">
      <span className="c3d-fc-k">
        Vento · previsioni a fasce orarie{sim ? " · stima (modello offline)" : ""}
      </span>
      <div className="c3d-fc-row">
        <div className="c3d-fc-days" role="group" aria-label="Giornata">
          {fc.days.map((d, di) => (
            <button
              key={d.date}
              type="button"
              className={"c3d-day" + (di === dayIdx ? " is-on" : "")}
              onClick={() => onPick(di, selHour)}
              data-testid={`c3d-day-${di}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="c3d-fc-slots">
          {day.slots.map((s) => (
            <button
              key={s.h}
              type="button"
              className={"c3d-slot" + (s.h === selHour ? " is-on" : "")}
              style={{ background: speedColor(s.ws) }}
              onClick={() => onPick(dayIdx, s.h)}
              data-testid={`c3d-slot-${s.h}`}
              title={`${String(s.h).padStart(2, "0")}:00 · ${Math.round(s.ws)} km/h da ${dir8(s.wd)}`}
            >
              <b>{String(s.h).padStart(2, "0")}</b>
              <i style={{ transform: `rotate(${((s.wd + 180) % 360 + 360) % 360}deg)` }} aria-hidden="true">
                ↑
              </i>
              <em>
                {Math.round(s.ws)}
                <small>km/h</small>
              </em>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
