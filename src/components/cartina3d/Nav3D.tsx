/**
 * CONTROLLI DI NAVIGAZIONE stile Google Earth per la vista 3D.
 *
 *  - BUSSOLA trascinabile: ruota la vista a 360° attorno al punto al centro
 *    dello schermo (il triangolo indica il Nord)
 *  - rotazione destra/sinistra, TILT su/giù (da verticale a quasi orizzontale)
 *  - zoom avanti/indietro, vista dall'alto 2D ↔ vista 3D, ritorno al decollo
 *
 * Il punto su cui orbitare è il centro dello schermo proiettato sul globo
 * (pickEllipsoid): così l'utente può "parcheggiare" la meta al centro e poi
 * girarci attorno come in Google Earth.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Home, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";

type CesiumNs = typeof import("cesium");
type ViewerNs = import("cesium").Viewer;

export interface OrbitOpts {
  dh?: number; // delta heading (rad)
  dp?: number; // delta pitch (rad)
  heading?: number; // heading assoluto (rad)
  pitch?: number; // pitch assoluto (rad)
  zoom?: number; // fattore sulla distanza camera→focus (<1 avvicina)
}

/** Orbita attorno al centro dello schermo (o al punto più vicino disponibile). */
export function orbitView(Cesium: CesiumNs, viewer: ViewerNs, o: OrbitOpts): void {
  try {
    const camera = viewer.camera;
    const canvas = viewer.canvas;
    const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
    let focus = camera.pickEllipsoid(center, viewer.scene.globe.ellipsoid);
    if (!Cesium.defined(focus) || (focus.x === 0 && focus.y === 0 && focus.z === 0)) {
      const c = camera.positionCartographic;
      focus = Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, 0);
    }
    const dist = Cesium.Cartesian3.distance(camera.positionWC, focus);
    const h = o.heading ?? camera.heading + (o.dh ?? 0);
    let p = o.pitch ?? camera.pitch + (o.dp ?? 0);
    p = Math.min(-0.035, Math.max(-1.5695, p)); // da quasi orizzontale a quasi nadir
    const range = Math.min(95000, Math.max(160, o.zoom ? dist * o.zoom : dist));
    camera.lookAt(focus, new Cesium.HeadingPitchRange(h, p, range));
    /* ripristino la camera libera: senza reset il mouse resterebbe disabilitato */
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  } catch {
    /* orbita non riuscita: non deve mai rompere la scena */
  }
}

interface Nav3DProps {
  Cesium: CesiumNs;
  viewer: ViewerNs;
  onReset: () => void;
}

export default function Nav3D({ Cesium, viewer, onReset }: Nav3DProps) {
  const [heading, setHeading] = useState(0);
  const [flat, setFlat] = useState(false);
  const dragRef = useRef<{ a0: number; h0: number } | null>(null);

  /* la bussola segue l'orientamento reale della camera (anche i gesti mouse) */
  useEffect(() => {
    try {
      viewer.camera.percentageChanged = 0.01;
    } catch {
      /* opzionale */
    }
    const cb = () => {
      try {
        setHeading(viewer.camera.heading);
      } catch {
        /* viewer distrutto */
      }
    };
    viewer.camera.changed.addEventListener(cb);
    const iv = window.setInterval(cb, 300);
    return () => {
      viewer.camera.changed.removeEventListener(cb);
      window.clearInterval(iv);
    };
  }, [viewer]);

  const orb = (o: OrbitOpts) => orbitView(Cesium, viewer, o);

  /* trascinamento circolare della bussola */
  const angleAt = (el: HTMLElement, e: React.PointerEvent): number => {
    const r = el.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { a0: angleAt(e.currentTarget, e), h0: viewer.camera.heading };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const a = angleAt(e.currentTarget, e);
    let dh = a - d.a0;
    if (dh > Math.PI) dh -= Math.PI * 2;
    if (dh < -Math.PI) dh += Math.PI * 2;
    orb({ heading: d.h0 + dh });
  };
  const onUp = () => {
    dragRef.current = null;
  };

  const deg = -(heading * 180) / Math.PI; // il Nord visuale ruota opposto alla camera

  return (
    <div className="c3d-nav" data-testid="c3d-nav">
      <div
        className="c3d-compass"
        title="Trascina per orientarti a 360° · doppio clic = Nord"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onDoubleClick={() => orb({ heading: 0 })}
        data-testid="c3d-compass"
      >
        <div className="c3d-compass-ring" style={{ transform: `rotate(${deg}deg)` }}>
          <span className="c3d-compass-n">N</span>
          <i className="c3d-needle" aria-hidden="true" />
        </div>
      </div>
      <div className="c3d-nav-btns">
        <button type="button" title="Ruota a sinistra" onClick={() => orb({ dh: -Math.PI / 8 })}>
          <RotateCcw size={13} aria-hidden="true" />
        </button>
        <button type="button" title="Ruota a destra" onClick={() => orb({ dh: Math.PI / 8 })}>
          <RotateCw size={13} aria-hidden="true" />
        </button>
        <button type="button" title="Alza lo sguardo verso l'orizzonte" onClick={() => orb({ dp: Math.PI / 14 })}>
          <ChevronUp size={13} aria-hidden="true" />
        </button>
        <button type="button" title="Guarda più dall'alto" onClick={() => orb({ dp: -Math.PI / 14 })}>
          <ChevronDown size={13} aria-hidden="true" />
        </button>
        <button type="button" title="Avvicina" onClick={() => orb({ zoom: 0.55 })}>
          <Plus size={13} aria-hidden="true" />
        </button>
        <button type="button" title="Allontana" onClick={() => orb({ zoom: 1.82 })}>
          <Minus size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={"c3d-nav-2d" + (flat ? " is-on" : "")}
          title={flat ? "Torna alla vista 3D" : "Vista dall'alto (2D)"}
          onClick={() => {
            const nf = !flat;
            setFlat(nf);
            orb({ pitch: nf ? -1.5533 : -0.6109 });
          }}
          data-testid="c3d-2d"
        >
          {flat ? "3D" : "2D"}
        </button>
        <button type="button" title="Torna sul decollo" onClick={onReset} data-testid="c3d-home">
          <Home size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
