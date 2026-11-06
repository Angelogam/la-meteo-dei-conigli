"use client";

import { useEffect, useRef, useState } from "react";
import ProfessionalWindgram from "@/components/ProfessionalWindgram";

/* ==================================================================== */
/*  WINDGRAM DELLA PAGINA, SUL POSTER                                   */
/*  Il poster deve mostrare il grafico ESATTAMENTE come lo mostra il    */
/*  sito (tab Venti). Quindi non lo ridisegniamo: montiamo il VERO      */
/*  componente ProfessionalWindgram in un contenitore nascosto, e      */
/*  quando i dati sono caricati serializziamo il suo <svg> e lo         */
/*  rasterizziamo in un'immagine ad alta risoluzione. Il risultato è    */
/*  un PNG con lo stesso codice di rendering della pagina: stesse       */
/*  barbe, stessi simboli, stessi colori, stesse etichette PIOGGIA.    */
/* ==================================================================== */

/** viewBox del grafico dentro ProfessionalWindgram (1200×1040). */
const VG_W = 1200;
const VG_H = 1040;
/* Sfondo del pannello della pagina: bg-slate-100 di Tailwind.  */
const PANEL_BG = "#F1F5F9";

interface PosterWindgramProps {
  latitude: number;
  longitude: number;
  altitude: number;
  siteName: string;
  /** 0 = oggi · 1 = domani · 2 = dopodomani */
  selectedDay: number;
  /** Riceve il PNG del grafico (data URL) quando è pronto, null se non ancora. */
  onCapture: (dataUrl: string | null) => void;
}

/**
 * Serializza un nodo <svg> in un data URL JPEG ad alta risoluzione.
 * Disegna prima il colore del pannello del sito, così l'immagine è
 * identica a come appare la carta sulla pagina (fondo grigio perla).
 */
async function rasterizeSvgToDataUrl(svg: SVGSVGElement, scale = 2): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(VG_W));
  clone.setAttribute("height", String(VG_H));
  const xml = new XMLSerializer().serializeToString(clone);

  const canvas = document.createElement("canvas");
  canvas.width = VG_W * scale;
  canvas.height = VG_H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d non disponibile");
  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("raster svg windgram fallita"));
      img.src = url;
    });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  return canvas.toDataURL("image/jpeg", 0.94);
}

export default function PosterWindgram({ latitude, longitude, altitude, siteName, selectedDay, onCapture }: PosterWindgramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  /* ref all'ultimo onCapture, così l'effect non si ri-arma quando il
     genitore si ridisegna (e il componente resta montato). */
  const captureRef = useRef(onCapture);
  captureRef.current = onCapture;

  useEffect(() => {
    setReady(false);
    captureRef.current(null);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let settled = 0;
    let cancelled = false;

    /* Il componente pagina carica i dati in async: il suo <svg> appare
       solo a fine caricamento. Sondiamo il DOM e rasterizziamo quando è
       stabile da un momento (nessun cambio di contenuto). */
    const poll = () => {
      if (cancelled) return;
      const host = hostRef.current;
      if (!host) return;
      /* l'host contiene anche le icone lucide (viewBox 24×24):
         cerchiamo ESCLUSIVAMENTE il grafico per il suo viewBox. */
      const svg = host.querySelector(`svg[viewBox="0 0 ${VG_W} ${VG_H}"]`) as SVGSVGElement | null;
      if (svg) {
        settled += 1;
        if (settled >= 2) {
          if (timer) clearInterval(timer);
          timer = null;
          rasterizeSvgToDataUrl(svg)
            .then((dataUrl) => {
              if (cancelled) return;
              setReady(true);
              captureRef.current(dataUrl);
            })
            .catch(() => {
              if (!cancelled) setReady(false);
            });
        }
      } else {
        settled = 0;
      }
    };

    timer = setInterval(poll, 700);
    poll();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [latitude, longitude, selectedDay]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-testid="poster-windgram-host"
      data-ready={ready ? "true" : "false"}
      style={{
        position: "fixed",
        left: "-12000px",
        top: 0,
        width: VG_W,
        zIndex: -1,
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      <ProfessionalWindgram
        latitude={latitude}
        longitude={longitude}
        altitude={altitude}
        siteName={siteName}
        selectedDay={selectedDay}
      />
    </div>
  );
}
