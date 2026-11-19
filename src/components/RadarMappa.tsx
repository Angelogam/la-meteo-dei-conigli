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
  const [playing, setPlaying] = useState(true);
  const [, setTick] = useState(0);
  const redrawRef = useRef<() => void>(() => {});

  const loadImg = useCallback((src: string, onReady: () => void): HTMLImageElement | null => {
    const cache = imgCache.current;
    let im = cache.get(src);
    if (im) return im.complete && im.naturalWidth > 0 ? im : null;
    im = new Image();
    im.referrerPolicy = "no-referrer";
    cache.set(src, im);
    im.onload = () => {
      // sanitizzazione SOLO del radar: le tile che il tilecache ripiega su
      // messaggi di errore ("Zoom Level Not Supported") non vengono disegnate
      if (!src.includes("frame=")) {
        (im as HTMLImageElement & { clean?: boolean }).clean = true;
        onReady();
        return;
      }
      try {
        const cv = document.createElement("canvas");
        cv.width = im.naturalWidth;
        cv.height = im.naturalHeight;
        const cx = cv.getContext("2d");
        if (cx) {
          cx.drawImage(im, 0, 0);
          const d = cx.getImageData(0, 0, cv.width, cv.height).data;
          let gray = 0, white = 0, n = 0;
          for (let i = 0; i < d.length; i += 16) {
            n++;
            const r = d[i], g = d[i + 1], b = d[i + 2], a2 = d[i + 3];
            if (a2 > 45 && r > 60 && r < 210 && Math.abs(r - g) < 28 && Math.abs(g - b) < 40 && Math.abs(r - b) < 40) gray++;
            if (a2 > 45 && r > 225 && g > 225 && b > 225) white++;
          }
          // le tile di errore hanno un grande pannello grigio-uniforme con testo bianco
          const isClean = !(gray / n > 0.3 || (gray / n > 0.18 && white / n > 0.04));
          if (!isClean) console.log("[radar] tile di errore scartata:", src.slice(0, 70));
          (im as HTMLImageElement & { clean?: boolean }).clean = isClean;
        } else (im as HTMLImageElement & { clean?: boolean }).clean = true;
      } catch { (im as HTMLImageElement & { clean?: boolean }).clean = true; }
      onReady();
    };
    im.onerror = () => cache.delete(src);
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

    // basemap scura (via proxy stessa origine: in ambiente sandbox i proxy di
    // rete possono iniettare pagine di blocco nelle risposte tile esterne —
    // il proxy server-side garantisce tile pulite anche lì)
    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        const wx = ((tx % (2 ** z)) + 2 ** z) % (2 ** z);
        const wy = Math.max(0, Math.min(2 ** z - 1, ty));
        const dx = Math.round(tx * TILE - left), dy = Math.round(ty * TILE - top);
        const im = loadImg(`/api/map-tile?z=${z}&x=${wx}&y=${wy}`, () => { if (pending === 0) redrawRef.current(); });
        if (im && (im as HTMLImageElement & { clean?: boolean }).clean !== false) ctx.drawImage(im, dx, dy, TILE, TILE); else pending++;
      }
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

  // resize observer + loop di animazione (per il pulsare del marker)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ro = new ResizeObserver(() => redrawRef.current());
    if (boxRef.current) ro.observe(boxRef.current);
    let raf = 0;
    const loop = () => { redrawRef.current(); raf = window.requestAnimationFrame(loop); };
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
    const nz = Math.max(6, Math.min(11, c.z + d));
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

  return (
    <div className="radar-box" data-testid="radar-temporali">
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
      {stato === "err" && <div className="radar-veil">Radar momentaneamente non disponibile — riprova più tardi</div>}
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
          <div className="radar-legend" aria-hidden="true">
            <span className="radar-legend-k">Radar pioggia</span>
            <span className="radar-legend-bar">{LEGENDA.map((l) => <i key={l.c} style={{ background: l.c }} />)}</span>
            <span className="radar-legend-t">{LEGENDA.map((l) => <em key={l.c}>{l.t}</em>)}</span>
          </div>
          <div className="radar-when">
            <span className={"radar-when-time" + (isForecast ? " is-fc" : "")}>{isForecast ? "proiezione" : "radar"} {minutesLabel}</span>
            <span className="radar-attr">radar © RainViewer · mappa © Esri</span>
          </div>
        </>
      )}
    </div>
  );
}
