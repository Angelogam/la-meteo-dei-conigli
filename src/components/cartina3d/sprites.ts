/**
 * SPRITES disegnati su canvas per la vista 3D (nessuna immagine esterna).
 *  - pinImage:       pin da avvicinamento dei decolli
 *  - gliderImage:    PARAPENDIO in volo che fluttua sopra ogni decollo
 *  - dartSprite:     freccia PICCOLA a dardo delle brezze di pendio (a cascata)
 *  - chevronSprite:  freccia LARGA e corta dei venti meteo (schiera a pettine)
 *  - curlSprite:     ricciolo di sottovento (vortice dietro le creste)
 *  - coneSideImage:  texture del cono termico (gradiente verticale + spirale)
 *  - ringImage:      anello luminoso alla base delle termiche
 */

type CesiumNs = typeof import("cesium");

/* ---------- util colore: schiarisci/scurisci un hex ---------- */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = ch(((n >> 16) & 255) * k);
  const g = ch(((n >> 8) & 255) * k);
  const b = ch((n & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const pinCache = new Map<string, string>();

export function pinImage(Cesium: CesiumNs, color: string, active: boolean): string {
  void Cesium;
  const key = color + (active ? "-on" : "");
  const hit = pinCache.get(key);
  if (hit) return hit;

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
  const url = c.toDataURL();
  pinCache.set(key, url);
  return url;
}

let gliderImg: string | null = null;

/** Parapendio con pilota, visto di 3/4 dal basso: vela a 4 celle + cimini. */
export function gliderImage(): string {
  if (gliderImg) return gliderImg;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 100;
  const g = c.getContext("2d")!;

  /* velatura: crescente con gradiente caldo (giallo → arancio) */
  const grd = g.createLinearGradient(8, 4, 122, 44);
  grd.addColorStop(0, "#ffe08a");
  grd.addColorStop(0.55, "#ffb347");
  grd.addColorStop(1, "#ff9f43");
  g.beginPath();
  g.moveTo(10, 40);
  g.quadraticCurveTo(64, -8, 118, 40); // bordo d'attacco
  g.quadraticCurveTo(114, 54, 64, 48); // estremità destra → centro (uscita)
  g.quadraticCurveTo(14, 54, 10, 40);
  g.closePath();
  g.fillStyle = grd;
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = "rgba(6,14,26,0.88)";
  g.stroke();

  /* separatori delle celle */
  g.strokeStyle = "rgba(6,14,26,0.42)";
  g.lineWidth = 1.4;
  for (const t of [0.22, 0.42, 0.58, 0.78]) {
    const xT = 10 + 108 * t;
    const yT = 40 - 30 * Math.sin(Math.PI * t);
    const xB = 64 + (xT - 64) * 0.5;
    g.beginPath();
    g.moveTo(xT, yT + 3);
    g.quadraticCurveTo(xT, yT + 14, xB, 48);
    g.stroke();
  }

  /* cimini fino al pilota */
  g.strokeStyle = "rgba(226,240,252,0.92)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(12, 42);
  g.lineTo(57, 70);
  g.moveTo(40, 50);
  g.lineTo(58, 71);
  g.moveTo(64, 50);
  g.lineTo(64, 71);
  g.moveTo(88, 50);
  g.lineTo(70, 71);
  g.moveTo(116, 42);
  g.lineTo(71, 70);
  g.stroke();

  /* pilota: casco + corpo in seduta nel selletta */
  g.fillStyle = "#ffd76a";
  g.beginPath();
  g.arc(64, 61, 5.2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#16283c";
  g.beginPath();
  g.ellipse(64, 78, 6.4, 9.5, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(226,240,252,0.55)";
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(58, 74);
  g.lineTo(70, 74);
  g.stroke();

  gliderImg = c.toDataURL();
  return gliderImg;
}

let bubbleImg: string | null = null;

/** Bolla di aria calda che sale dentro il cono termico: nucleo bianco-giallo + alone. */
export function bubbleImage(): string {
  if (bubbleImg) return bubbleImg;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;

  /* alone esterno soffuso */
  const halo = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  halo.addColorStop(0, "rgba(255,246,190,0.95)");
  halo.addColorStop(0.45, "rgba(255,214,10,0.55)");
  halo.addColorStop(1, "rgba(255,214,10,0)");
  g.fillStyle = halo;
  g.beginPath();
  g.arc(32, 32, 30, 0, Math.PI * 2);
  g.fill();

  /* nucleo luminoso */
  const core = g.createRadialGradient(29, 29, 1, 32, 32, 12);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.5, "#fff3b0");
  core.addColorStop(1, "#ffd60a");
  g.fillStyle = core;
  g.beginPath();
  g.arc(32, 32, 12, 0, Math.PI * 2);
  g.fill();

  bubbleImg = c.toDataURL();
  return bubbleImg;
}

/* ================= FRECCE DEL FLUSSO VENTO (nuova resa «a pettine») =================
   Tutte le frecce sono disegnate PUNTATE IN SU (verso y=0): il sistema di render
   le orienta con rotation = heading − azimut, quindi a rotazione 0 guardano Nord. */

const dartCache = new Map<string, HTMLCanvasElement>();

/** FRECCIA A DARDO delle brezze: piccola, slanciata, con spessore ombreggiato
    (livello scuro sotto = volume), riflesso di luce e ombra morbida integrata. */
export function dartSprite(color: string): HTMLCanvasElement {
  const hit = dartCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 44;
  const g = c.getContext("2d")!;
  const cx = 32;

  /* ombra morbida integrata ( LIBRATA sopra il terreno ) */
  g.beginPath();
  g.ellipse(cx, 40.5, 15, 3, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(4,10,20,0.5)";
  g.fill();

  /* STRATO SOTTOSTANTE scuro (spessore): dardo leggermente più basso/largo */
  const slab = (dy: number, fill?: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx, 3 + dy);
    g.quadraticCurveTo(cx + 12, 14 + dy, cx + 15, 32 + dy);
    g.quadraticCurveTo(cx + 6, 26 + dy, cx, 27 + dy);
    g.quadraticCurveTo(cx - 6, 26 + dy, cx - 15, 32 + dy);
    g.quadraticCurveTo(cx - 12, 14 + dy, cx, 3 + dy);
    g.closePath();
    if (fill) g.fillStyle = fill;
    if (fill) g.fill();
  };
  slab(3.2, "rgba(6,14,26,0.85)");

  /* corpo con gradiente verticale (chiaro in alto → colore pieno) */
  const grd = g.createLinearGradient(0, 4, 0, 34);
  grd.addColorStop(0, shade(color, 1.55));
  grd.addColorStop(0.45, color);
  grd.addColorStop(1, shade(color, 0.62));
  slab(0);
  g.fillStyle = grd;
  g.fill();
  g.lineWidth = 1.4;
  g.strokeStyle = "rgba(6,14,26,0.9)";
  g.stroke();

  /* riflesso di luce sul dorso (percezione 3D) */
  g.beginPath();
  g.moveTo(cx, 7);
  g.quadraticCurveTo(cx + 5.5, 14, cx + 7.5, 26);
  g.lineWidth = 2;
  g.strokeStyle = "rgba(255,255,255,0.62)";
  g.stroke();

  dartCache.set(color, c);
  return c;
}

const chevronCache = new Map<string, HTMLCanvasElement>();

/** FRECCIA LARGA dei venti meteo: chevron tozzo e corto (più largo che lungo),
    doppio strato (base scura + faccia chiara) = effetto lastra 3D, da schiera a pettine. */
export function chevronSprite(color: string): HTMLCanvasElement {
  const hit = chevronCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 116;
  c.height = 68;
  const g = c.getContext("2d")!;
  const cx = 58;

  /* ombra integrata */
  g.beginPath();
  g.ellipse(cx, 63, 34, 3.5, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(4,10,20,0.5)";
  g.fill();

  const slab = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx, 5 + dy);
    g.lineTo(cx + 46, 46 + dy);
    g.quadraticCurveTo(cx + 20, 40 + dy, cx, 41 + dy);
    g.quadraticCurveTo(cx - 20, 40 + dy, cx - 46, 46 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = "rgba(6,14,26,0.88)";
    g.stroke();
  };

  slab(5.5, shade(color, 0.5)); // spessore sotto
  const grd = g.createLinearGradient(0, 6, 0, 46);
  grd.addColorStop(0, shade(color, 1.6));
  grd.addColorStop(0.5, color);
  grd.addColorStop(1, shade(color, 0.72));
  slab(0, grd); // faccia superiore

  /* banda di luce trasversale (riflesso) */
  g.beginPath();
  g.moveTo(cx - 33, 38);
  g.lineTo(cx + 33, 38);
  g.lineWidth = 2.6;
  g.strokeStyle = "rgba(255,255,255,0.4)";
  g.stroke();

  chevronCache.set(color, c);
  return c;
}

const curlCache = new Map<string, HTMLCanvasElement>();

/** RICCIOLO di sottovento: piccola spirale con punta di freccia — i vortici
    che si formano dietro le creste quando il flusso le scavalca. */
export function curlSprite(color: string): HTMLCanvasElement {
  const hit = curlCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 56;
  c.height = 56;
  const g = c.getContext("2d")!;
  const cx = 28;
  const cy = 28;

  g.beginPath();
  /* spirale: raggio che cala mentre l'angolo cresce */
  let a0 = Math.PI * 1.15;
  for (let i = 0; i <= 46; i++) {
    const f = i / 46;
    const a = a0 + f * Math.PI * 1.75;
    const r = 19 - f * 10;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.lineWidth = 5.5;
  g.strokeStyle = shade(color, 0.55);
  g.lineCap = "round";
  g.stroke();
  g.lineWidth = 3.4;
  g.strokeStyle = color;
  g.stroke();

  /* punta della spirale */
  const aEnd = a0 + Math.PI * 1.75;
  const rEnd = 9;
  const ex = cx + Math.cos(aEnd) * rEnd;
  const ey = cy + Math.sin(aEnd) * rEnd;
  const ta = aEnd + Math.PI / 2;
  g.beginPath();
  g.moveTo(ex + Math.cos(ta) * 7.5, ey + Math.sin(ta) * 7.5);
  g.lineTo(ex + Math.cos(ta + 2.5) * 6, ey + Math.sin(ta + 2.5) * 6);
  g.lineTo(ex + Math.cos(ta - 2.5) * 6, ey + Math.sin(ta - 2.5) * 6);
  g.closePath();
  g.fillStyle = color;
  g.fill();

  curlCache.set(color, c);
  return c;
}

let coneImg: HTMLCanvasElement | null = null;

/** TEXTURE del cono termico: gradiente verticale (base satura → cima sfumata),
    costolature elicoidali leggere e ombreggiatura orizzontale (volume finto). */
export function coneSideImage(): HTMLCanvasElement {
  if (coneImg) return coneImg;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;

  /* gradiente verticale: brillante alla base, evanescente in cima */
  const grd = g.createLinearGradient(0, 256, 0, 0);
  grd.addColorStop(0, "rgba(255,214,10,0.85)");
  grd.addColorStop(0.12, "rgba(255,214,10,0.6)");
  grd.addColorStop(0.38, "rgba(255,222,77,0.34)");
  grd.addColorStop(0.68, "rgba(255,232,140,0.16)");
  grd.addColorStop(1, "rgba(255,240,180,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 256);

  /* costolature elicoidali: bande diagonali dolci che suggeriscono la risalita */
  g.save();
  g.globalCompositeOperation = "lighter";
  for (let s = 0; s < 4; s++) {
    const x0 = s * 44 - 40;
    g.beginPath();
    g.moveTo(x0, 256);
    g.bezierCurveTo(x0 + 26, 190, x0 - 12, 120, x0 + 34, 40);
    g.lineTo(x0 + 62, 40);
    g.bezierCurveTo(x0 + 16, 120, x0 + 54, 190, x0 + 28, 256);
    g.closePath();
    g.fillStyle = "rgba(255,244,200,0.16)";
    g.fill();
  }
  g.restore();

  /* ombreggiatura orizzontale: centro più luminoso → volume cilindrico */
  const sh = g.createLinearGradient(0, 0, 128, 0);
  sh.addColorStop(0, "rgba(30,18,2,0.34)");
  sh.addColorStop(0.28, "rgba(30,18,2,0)");
  sh.addColorStop(0.5, "rgba(255,250,220,0.14)");
  sh.addColorStop(0.72, "rgba(30,18,2,0)");
  sh.addColorStop(1, "rgba(30,18,2,0.34)");
  g.fillStyle = sh;
  g.fillRect(0, 0, 128, 256);

  coneImg = c;
  return c;
}

let ringImg: HTMLCanvasElement | null = null;

/** ANELLO luminoso alla base della termica (doppio bordo morbido). */
export function ringImage(): HTMLCanvasElement {
  if (ringImg) return ringImg;
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const g = c.getContext("2d")!;
  const halo = g.createRadialGradient(48, 48, 18, 48, 48, 46);
  halo.addColorStop(0, "rgba(255,214,10,0)");
  halo.addColorStop(0.55, "rgba(255,224,90,0.32)");
  halo.addColorStop(0.78, "rgba(255,214,10,0.6)");
  halo.addColorStop(1, "rgba(255,214,10,0)");
  g.fillStyle = halo;
  g.beginPath();
  g.arc(48, 48, 46, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(48, 48, 26, 0, Math.PI * 2);
  g.strokeStyle = "rgba(255,236,150,0.5)";
  g.lineWidth = 2.4;
  g.stroke();
  ringImg = c;
  return ringImg;
}
