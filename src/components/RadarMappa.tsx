"use client";

/**
 * RadarMappa — carta dei temporali per il decollo: canvas Web Mercator fatto a
 * mano (niente pipeline tile di librerie esterne) con il radar pioggia/neve
 * reale di RainViewer animato sui frame passati, marker pulsante sul decollo,
 * legenda intensità, play/pausa e pan/zoom a drag e bottoni.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import "./radar-mappa.css";

interface RVFrame { time: number; path: string; }
interface RVData { host: string; radar?: { past?: RVFrame[]; nowcast?: RVFrame[] }; }

const LEGENDA = [
  { c: "#6bd68f", t: "lieve" },
  { c: "#4fc3e8", t: "moderata" },
  { c: "#f6d94d", t: "forte" },
  { c: "#f28c3b", t: "molto forte" },
  { c: "#e34a4a", t: "temporale" },
];

const TILE = 256;

const lonToWorld = (lon: number, z: number): number => ((lon + 180) / 360) * TILE * 2 ** z;
const latToWorld = (lat: number, z: number): number => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z;
};

export default function RadarMappa({ lat, lon, nome, quota }: { lat: number; lon: number; nome: string; quota: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const framesRef = useRef<RVFrame[]>([]);
  const nPastRef = useRef(0);
  const idxRef = useRef(0);
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const centerRef = useRef({ x: lonToWorld(lon, 9), y: latToWorld(lat, 9), z: 9 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [stato, setStato] = useState<"load" | "ok" | "err">("load");
  /* una volta accertato che la carta non si può disegnare si resta in "err":
     il componente SI NASCONDE DEL TUTTO (revisione critica 23/11, FAIL#3 —
     regola del proprietario: if (radarBroken) hideRadarCard()) */
  const mappaFermataRef = useRef(false);
  /* diventa true al primo slot di basemap disegnato correttamente */
  const basemapOkRef = useRef(false);
  const [playing, setPlaying] = useState(true);
  const [, setTick] = useState(0);
  const redrawRef = useRef<() => void>(() => {});

  const loadImg = useCallback((src: string, onReady: () => void, fallbackSrc?: string): HTMLImageElement | null => {
    const cache = imgCache.current;
    let im = cache.get(src);
    if (im) return im.complete && im.naturalWidth > 0 ? im : null;
    im = new Image();
    im.referrerPolicy = "no-referrer";
    cache.set(src, im);
    im.onload = () => {
      // sanitizzazione di TUTTE le tile: i provider di basemap a volte rispondono
      // 200 con un'immagine di errore ("Zoom Level Not Supported" di Esri) che
      // coprirebbe la carta — si riconosce dal pannello grigio uniforme con testo
      // bianco e si scarta, riprovando con la tile del provider di riserva
      try {
        const cv = document.createElement("canvas");
        cv.width = im.naturalWidth;
        cv.height = im.naturalHeight;
        const cx = cv.getContext("2d");
        if (cx) {
          cx.drawImage(im, 0, 0);
          const d = cx.getImageData(0, 0, cv.width, cv.height).data;
          let gray = 0, white = 0, light = 0, n = 0, opachi = 0, sumL = 0, sumL2 = 0;
          for (let i = 0; i < d.length; i += 16) {
            n++;
            const r = d[i], g = d[i + 1], b = d[i + 2], a2 = d[i + 3];
            if (a2 <= 45) continue; // trasparente: pixel non significativo
            opachi++;
            const l = 0.299 * r + 0.587 * g + 0.114 * b;
            sumL += l; sumL2 += l * l;
            if (r > 60 && r < 210 && Math.abs(r - g) < 28 && Math.abs(g - b) < 40 && Math.abs(r - b) < 40) gray++;
            if (r > 225 && g > 225 && b > 225) white++;
            /* zona morta della vecchia euristica: i pannelli di errore di Esri
               ("Zoom Level Not Supported") hanno fondo grigio CHIARO (~#e0e0e0)
               che scappava sia alla soglia grigio (<210) sia a quella bianco
               (>225). Fascia 185-245 con croma basso = pannello di errore. */
            if (r > 185 && r < 245 && Math.abs(r - g) < 22 && Math.abs(g - b) < 22 && Math.abs(r - b) < 22) light++;
          }
          const mediaL = opachi ? sumL / opachi : 0;
          const stdL = opachi ? Math.sqrt(Math.max(0, sumL2 / opachi - mediaL * mediaL)) : 0;
          /* tile piatta e chiara = sfondo uniforme con poco testo: le tile vere
             di mappa hanno varianza alta, l'oceano scuro resta fuori perché
             mediaL è basso. Le tile radar (quasi trasparenti) non ci entrano. */
          const piatto = opachi / n > 0.9 && stdL < 14 && mediaL > 150;
          const isClean = !(white / n > 0.02 || light / n > 0.5 || (gray / n > 0.3 && white / n > 0.008) || piatto);
          (im as HTMLImageElement & { clean?: boolean }).clean = isClean;
          if (!isClean) {
            console.log("[radar] tile di errore scartata:", src.slice(0, 80));
            if (fallbackSrc) { loadImg(fallbackSrc, onReady); return; }
          }
        } else (im as HTMLImageElement & { clean?: boolean }).clean = true;
      } catch { (im as HTMLImageElement & { clean?: boolean }).clean = true; }
      onReady();
    };
    im.onerror = () => {
      cache.delete(src);
      if (fallbackSrc) loadImg(fallbackSrc, onReady);
    };
    im.src = src;
    return null;
  }, []);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const box = boxRef.current;
    if (!cv || !box) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = box.clientWidth, h = box.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#12233a";
    ctx.fillRect(0, 0, w, h);
    const { x: cx, y: cy, z } = centerRef.current;
    const left = cx - w / 2, top = cy - h / 2;
    const world = TILE * 2 ** z;
    const x0 = Math.floor(left / TILE), x1 = Math.floor((left + w) / TILE);
    const y0 = Math.floor(top / TILE), y1 = Math.floor((top + h) / TILE);
    let pending = 0;
    /* se TUTTE le tile della basemap sono pannelli di errore (es. zoom non
       supportato dal provider) la carta è inutilizzabile: si nasconde il
       componente — regola: mai un componente rotto visibile al pilota */
    let bmTotale = 0, bmRotte = 0, bmInAttesa = 0;

    // basemap scura (via proxy stessa origine: in ambiente sandbox i proxy di
    // rete possono iniettare pagine di blocco nelle risposte tile esterne —
    // il proxy server-side garantisce tile pulite anche lì)
    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        const wx = ((tx % (2 ** z)) + 2 ** z) % (2 ** z);
        const wy = Math.max(0, Math.min(2 ** z - 1, ty));
        const dx = Math.round(tx * TILE - left), dy = Math.round(ty * TILE - top);
        // Esri primaria (funziona dall'egress del server), Carto di riserva
        // (da browser residenziale: Carto blocca gli IP datacenter con placeholder)
        const urlA = `/api/map-tile?prov=esri&z=${z}&x=${wx}&y=${wy}`;
        const urlB = `/api/map-tile?prov=carto&z=${z}&x=${wx}&y=${wy}`;
        const im = loadImg(urlA, () => { if (pending === 0) redrawRef.current(); }, urlB);
        // se la primaria è una tile di errore si disegna la riserva (già in cache
        // dopo il primo caricamento) invece di lasciare il buco scuro
        let drawn: HTMLImageElement | null = im;
        if (!drawn || (drawn as HTMLImageElement & { clean?: boolean }).clean === false) {
          const fb = imgCache.current.get(urlB);
          if (fb && fb.complete && fb.naturalWidth > 0 && (fb as HTMLImageElement & { clean?: boolean }).clean !== false) drawn = fb;
        }
        const slotOk = !!drawn && (drawn as HTMLImageElement & { clean?: boolean }).clean !== false;
        bmTotale++;
        if (slotOk) {
          ctx.drawImage(drawn as HTMLImageElement, dx, dy, TILE, TILE);
          basemapOkRef.current = true;
        } else {
          pending++;
          const imH = im as HTMLImageElement & { clean?: boolean };
          if (im && im.complete && im.naturalWidth > 0 && imH.clean === false) bmRotte++;
          else bmInAttesa++;
        }
      }
    }
    if (
      bmTotale > 0 && bmRotte === bmTotale && bmInAttesa === 0 &&
      framesRef.current.length > 0 && !mappaFermataRef.current
    ) {
      mappaFermataRef.current = true;
      setStato("err");
    }
    // radar del frame corrente
    const frames = framesRef.current;
    if (frames.length) {
      const f = frames[((idxRef.current % frames.length) + frames.length) % frames.length];
      for (let tx = x0; tx <= x1; tx++) {
        for (let ty = y0; ty <= y1; ty++) {
          const wx = ((tx % (2 ** z)) + 2 ** z) % (2 ** z);
          const wy = Math.max(0, Math.min(2 ** z - 1, ty));
          const dx = Math.round(tx * TILE - left), dy = Math.round(ty * TILE - top);
          const zz = z > 10 ? 10 : z;
          const scale = 2 ** (z - zz);
          const rx = Math.floor(wx / scale), ry = Math.floor(wy / scale);
          const im = loadImg(`/api/map-tile?frame=${f.time}&z=${zz}&x=${rx}&y=${ry}`, () => { if (pending === 0) redrawRef.current(); });
          if (im && (im as HTMLImageElement & { clean?: boolean }).clean !== false) {
            ctx.imageSmoothingEnabled = true;
            ctx.globalAlpha = 0.8;
            const sx = ((wx % scale) / scale) * TILE, sy = ((wy % scale) / scale) * TILE;
            const ss = TILE / scale;
            ctx.drawImage(im, sx, sy, ss, ss, dx, dy, TILE, TILE);
            ctx.globalAlpha = 1;
          } else pending++;
        }
      }
    }
    // marker decollo pulsante
    const px = cx - left, py = cy - top;
    if (px > -20 && py > -20 && px < w + 20 && py < h + 20) {
      const pulse = (Date.now() % 2100) / 2100;
      ctx.beginPath();
      ctx.arc(px, py, 8 + pulse * 16, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251, 191, 36, ${(0.35 * (1 - pulse)).toFixed(3)})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#fff7dd";
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
    }
  }, [loadImg]);

  redrawRef.current = draw;

  // resize observer + loop di animazione (per il pulsare del marker) — limitato a
  // ~20 fps: basta per il pulsare e lascia CPU/batteria liberi al resto della pagina
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ro = new ResizeObserver(() => redrawRef.current());
    if (boxRef.current) ro.observe(boxRef.current);
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = window.requestAnimationFrame(loop);
      if (t - last < 50) return;
      last = t;
      redrawRef.current();
    };
    raf = window.requestAnimationFrame(loop);
    return () => { window.cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // fetch frames RainViewer
  useEffect(() => {
    let alive = true;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<RVData>; })
      .then((d) => {
        if (!alive) return;
        const past = (d.radar?.past ?? []).slice(-11);
        const now = (d.radar?.nowcast ?? []).slice(0, 3);
        if (!past.length) throw new Error("nessun frame");
framesRef.current = [...past, ...now];
        nPastRef.current = past.length;
        idxRef.current = past.length - 1;
        setStato("ok");
        redrawRef.current();
      })
      .catch(() => { if (alive) setStato("err"); });
    return () => { alive = false; };
  }, []);

  /* Rete di sicurezza: se dopo 9 s non è mai arrivata una tile di basemap
     pulita (caricamenti bloccati, provider che risponde solo con pannelli di
     errore) il radar si toglie dalla pagina — mai un componente rotto visibile. */
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!basemapOkRef.current && framesRef.current.length > 0 && !mappaFermataRef.current) {
        mappaFermataRef.current = true;
        setStato("err");
      }
    }, 9000);
    return () => window.clearTimeout(t);
  }, [stato]);

  // animazione frame
  useEffect(() => {
    if (!playing || stato !== "ok") return;
    const t = window.setInterval(() => {
      const n = framesRef.current.length;
      if (n) idxRef.current = (idxRef.current + 1) % n;
      setTick((v) => v + 1);
    }, 700);
    return () => window.clearInterval(t);
  }, [playing, stato]);

  // drag pan
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    const c = centerRef.current;
    const world = TILE * 2 ** c.z;
    c.x = Math.max(0, Math.min(world, c.x - dx));
    c.y = Math.max(TILE, Math.min(world - TILE, c.y - dy));
    redrawRef.current();
  };
  const onPointerUp = () => { dragRef.current = null; };

  const zoomBy = (d: number) => {
    const c = centerRef.current;
    /* cap a 10: è il livello massimo che il radar RainViewer supporta — oltre
       le tile vengono rifiutate e la carta si spezzerebbe */
    const nz = Math.max(6, Math.min(10, c.z + d));
    if (nz === c.z) return;
    c.x = (c.x / (TILE * 2 ** c.z)) * (TILE * 2 ** nz);
    c.y = (c.y / (TILE * 2 ** c.z)) * (TILE * 2 ** nz);
    c.z = nz;
    redrawRef.current();
  };

  const frames = framesRef.current;
  const cur = frames[((idxRef.current % frames.length) + frames.length) % frames.length];
  const isForecast = nPastRef.current > 0 && idxRef.current >= nPastRef.current;
  const minutesLabel = cur ? new Date(cur.time * 1000).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "";

  /* Regola del proprietario (FAIL#3): if (radarBroken) { hideRadarCard(); }
     — se la carta/radar non si può renderizzare il componente esce di scena
     del tutto, senza velo né testo tecnico. */
  if (stato === "err") return null;

  return (
    <div className="radar-box" data-testid="radar-temporali">
      {/* striscia superiore: titolo + legenda intensità come barra gradiente */}
      <div className="radar-top" aria-hidden="true">
        <span className="radar-top-k">Radar pioggia</span>
        <span className="radar-top-bar">{LEGENDA.map((l) => <i key={l.c} style={{ background: l.c }} />)}</span>
        <span className="radar-top-t">{LEGENDA.map((l) => <em key={l.c}>{l.t}</em>)}</span>
      </div>
      <div className="radar-mapwrap">
        <div
          ref={boxRef}
          className="radar-map"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ cursor: dragRef.current ? "grabbing" : "grab", touchAction: "none" }}
        >
          <canvas ref={canvasRef} className="radar-canvas" />
        </div>
        <div className="radar-zoom">
          <button type="button" onClick={() => zoomBy(1)} title="Zoom avanti" aria-label="Zoom avanti">+</button>
          <button type="button" onClick={() => zoomBy(-1)} title="Zoom indietro" aria-label="Zoom indietro">−</button>
        </div>
        {stato === "load" && <div className="radar-veil">Radar in caricamento…</div>}
        {stato === "ok" && (
          <>
            <button
              type="button"
              className={"radar-play" + (playing ? " is-on" : "")}
              onClick={() => setPlaying((p) => !p)}
              title={playing ? "Metti in pausa l'animazione" : "Avvia l'animazione del radar"}
              aria-label={playing ? "Pausa radar" : "Play radar"}
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <div className="radar-when">
              <span className={"radar-when-time" + (isForecast ? " is-fc" : "")}>{isForecast ? "proiezione" : "radar"} {minutesLabel}</span>
              <span className="radar-attr">radar © RainViewer · mappa © CARTO/OpenStreetMap · Esri</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
