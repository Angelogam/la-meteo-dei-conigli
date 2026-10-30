/**
 * SPRITES disegnati su canvas per la vista 3D (nessuna immagine esterna).
 *  - pinImage:       pin da avvicinamento dei decolli
 *  - gliderImage:    PARAPENDIO in volo che fluttua sopra ogni decollo
 *  - dartSprite:     freccia PICCOLA con CODA a cometta delle brezze di pendio
 *  - chevronSprite:  freccia con ASTA e punta stretta dei venti meteo (pettine e quota)
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

/* ================= FRECCE DEL FLUSSO VENTO (resa «freccia vera con la coda») =================
   Tutte le frecce sono disegnate PUNTATE IN SU (verso y=0): il sistema di render
   le orienta con rotation = heading − azimut, quindi a rotazione 0 guardano Nord.
   Richiesta pilota: OGNI freccia ha una CODA sottile che sfuma dietro la punta
   (scia a cometta) e una PUNTA STRETTA e affusolata — niente più foglie né
   chevron larghi senza asta. */

const dartCache = new Map<string, HTMLCanvasElement>();

/** hex → "rgba(r,g,b,a)" (serve per le code che sfumano). */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** FRECCIA A DARDO delle brezze: CODA a cometta (si assottiglia e sfuma dietro)
    + punta stretta affusolata, con spessore ombreggiato e riflesso di luce. */
export function dartSprite(color: string): HTMLCanvasElement {
  const hit = dartCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 56;
  c.height = 72;
  const g = c.getContext("2d")!;
  const cx = 28;

  /* ombra morbida integrata (librata sopra il terreno) */
  g.beginPath();
  g.ellipse(cx, 68.5, 11, 2.4, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(4,10,20,0.45)";
  g.fill();

  /* CODA a cometta LUNGA: parte sottilissima dietro e cresce verso la testa,
     con sfumatura che sparisce alla fine della scia (sensazione di flusso) */
  const tail = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx - 0.9, 64 + dy);
    g.lineTo(cx - 4.6, 18 + dy);
    g.lineTo(cx + 4.6, 18 + dy);
    g.lineTo(cx + 0.9, 64 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 0.9;
    g.strokeStyle = "rgba(6,14,26,0.5)";
    g.stroke();
  };
  const tailGrad = g.createLinearGradient(0, 18, 0, 64);
  tailGrad.addColorStop(0, rgba(shade(color, 1.3), 0.92));
  tailGrad.addColorStop(0.45, rgba(color, 0.5));
  tailGrad.addColorStop(1, rgba(color, 0.05));
  tail(2.6, "rgba(6,14,26,0.7)"); // spessore scuro sotto la coda
  tail(0, tailGrad);

  /* PUNTA STRETTA e affusolata (niente più dardo largo a foglia) */
  const head = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx, 3.2 + dy);
    g.lineTo(cx + 7.6, 22.2 + dy);
    g.quadraticCurveTo(cx, 18.2 + dy, cx - 7.6, 22.2 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 1.2;
    g.strokeStyle = "rgba(6,14,26,0.9)";
    g.stroke();
  };
  head(2.8, "rgba(6,14,26,0.85)"); // spessore scuro sotto la punta
  const grd = g.createLinearGradient(0, 3, 0, 23);
  grd.addColorStop(0, shade(color, 1.6));
  grd.addColorStop(0.5, color);
  grd.addColorStop(1, shade(color, 0.6));
  head(0, grd);

  /* riflesso di luce sul dorso (percezione 3D) */
  g.beginPath();
  g.moveTo(cx - 1.2, 7.5);
  g.quadraticCurveTo(cx - 3.8, 12, cx - 4.6, 17);
  g.lineWidth = 1.3;
  g.strokeStyle = "rgba(255,255,255,0.65)";
  g.stroke();

  dartCache.set(color, c);
  return c;
}

const chevronCache = new Map<string, HTMLCanvasElement>();

/** FRECCIA dei venti meteo (suolo a pettine e in quota): ASTA/CODA slanciata
    che si allarga verso la testa e sfuma dietro + PUNTA STRETTA a chevron,
    doppio strato (base scura + faccia chiara) = effetto lastra 3D. */
export function chevronSprite(color: string): HTMLCanvasElement {
  const hit = chevronCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 84;
  c.height = 112;
  const g = c.getContext("2d")!;
  const cx = 42;

  /* ombra integrata */
  g.beginPath();
  g.ellipse(cx, 107.5, 20, 2.8, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(4,10,20,0.45)";
  g.fill();

  /* CODA/ASTA LUNGA: sottile dietro, si allarga verso la testa, sfuma in coda */
  const shaft = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx - 3.4, 103 + dy);
    g.lineTo(cx - 8.8, 35 + dy);
    g.lineTo(cx + 8.8, 35 + dy);
    g.lineTo(cx + 3.4, 103 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = "rgba(6,14,26,0.6)";
    g.stroke();
  };
  const shaftGrad = g.createLinearGradient(0, 35, 0, 103);
  shaftGrad.addColorStop(0, rgba(color, 0.95));
  shaftGrad.addColorStop(0.6, rgba(color, 0.5));
  shaftGrad.addColorStop(1, rgba(color, 0.12));
  shaft(3, "rgba(6,14,26,0.8)"); // spessore scuro sotto l'asta
  shaft(0, shaftGrad);

  /* riflesso lungo il fianco dell'asta */
  g.beginPath();
  g.moveTo(cx - 4.6, 40);
  g.lineTo(cx - 2.6, 78);
  g.lineWidth = 1.6;
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.stroke();

  /* PUNTA STRETTA a chevron (larghezza dimezzata rispetto al vecchio chevron) */
  const head = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx, 4.2 + dy);
    g.lineTo(cx + 17, 36.8 + dy);
    g.quadraticCurveTo(cx, 24.8 + dy, cx - 17, 36.8 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 1.6;
    g.strokeStyle = "rgba(6,14,26,0.88)";
    g.stroke();
  };
  head(3.2, "rgba(6,14,26,0.85)"); // spessore sotto
  const grd = g.createLinearGradient(0, 4, 0, 37);
  grd.addColorStop(0, shade(color, 1.6));
  grd.addColorStop(0.5, color);
  grd.addColorStop(1, shade(color, 0.7));
  head(0, grd);

  /* banda di luce trasversale (riflesso) */
  g.beginPath();
  g.moveTo(cx - 11, 31);
  g.lineTo(cx + 11, 31);
  g.lineWidth = 2.2;
  g.strokeStyle = "rgba(255,255,255,0.35)";
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
