/**
 * SPRITES disegnati su canvas per la vista 3D (nessuna immagine esterna).
 *  - pinImage:       pin da avvicinamento dei decolli
 *  - gliderImage:    PARAPENDIO in volo che fluttua sopra ogni decollo
 *  - dartSprite:     freccia ONDULATA 3D, LARGA e lucida con coda a cometta
 *                    delle brezze di pendio (come le frecce a onda dello stock)
 *  - chevronSprite:  freccia 3D PIATTA (asta dritta, non sinuosa) dei venti
 *                    meteo in quota, stessa famiglia di stile del dardo
 *  - rotorSprite:    ROTORE di sottovento: freccia curva ad arco che gira
 *                    su se stessa dietro le creste (rosso)
 *  - streakSprite:   SEGMENTO di scia a capsula delle particelle stile Windy
 *                    (i mattoni delle linee di flusso vive)
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

/** FRECCIA ONDULATA 3D delle brezze (modello: le frecce a onda lucide dello
    stock fotografico): corpo LARGO a S con gradiente cilindrico chiaro→scuro,
    CODA a cometta che sfuma dietro e PUNTA LARGA affusolata. Disegnata
    PUNTATA IN SU. */
export function dartSprite(color: string): HTMLCanvasElement {
  const hit = dartCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 76;
  c.height = 100;
  const g = c.getContext("2d")!;
  const cx = 38;

  /* ombra morbida integrata (librata sopra il terreno) */
  g.beginPath();
  g.ellipse(cx, 95, 13, 2.6, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(4,10,20,0.45)";
  g.fill();

  /* CODA a cometta LUNGA: parte sottile dietro e sfuma alla fine della scia */
  const tail = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx - 1.5, 64 + dy);
    g.lineTo(cx - 6.4, 92 + dy);
    g.lineTo(cx + 6.4, 92 + dy);
    g.lineTo(cx + 1.5, 64 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 0.9;
    g.strokeStyle = "rgba(6,14,26,0.45)";
    g.stroke();
  };
  const tailGrad = g.createLinearGradient(0, 60, 0, 93);
  tailGrad.addColorStop(0, rgba(shade(color, 1.35), 0.9));
  tailGrad.addColorStop(0.5, rgba(color, 0.42));
  tailGrad.addColorStop(1, rgba(color, 0.04));
  tail(2.8, "rgba(6,14,26,0.62)"); // spessore scuro sotto la coda
  tail(0, tailGrad);

  /* CORPO ONDULATO: nastro largo a S — l'acqua che scivola sulle rocce */
  const wave = (dy: number, w: number, st: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx - 7, 64 + dy);
    g.bezierCurveTo(cx + 9, 56 + dy, cx - 10, 47 + dy, cx + 3, 39 + dy);
    g.lineWidth = w;
    g.lineCap = "round";
    g.strokeStyle = st;
    g.stroke();
  };
  wave(3, 17, "rgba(6,14,26,0.7)"); // spessore scuro sotto il corpo
  const bodyGrad = g.createLinearGradient(cx - 12, 0, cx + 12, 0);
  bodyGrad.addColorStop(0, shade(color, 1.55));
  bodyGrad.addColorStop(0.45, color);
  bodyGrad.addColorStop(1, shade(color, 0.52));
  wave(0, 15, bodyGrad);
  /* riflesso di luce che segue l'onda (percezione 3D) */
  g.beginPath();
  g.moveTo(cx - 7.5, 61);
  g.bezierCurveTo(cx + 5, 55, cx - 9, 48, cx - 1, 41);
  g.lineWidth = 3.2;
  g.lineCap = "round";
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.stroke();

  /* PUNTA LARGA 3D: base larga e dorso lucido, come le frecce dello stock */
  const head = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx, 4.5 + dy);
    g.quadraticCurveTo(cx + 15.5, 16 + dy, cx + 17, 37 + dy);
    g.quadraticCurveTo(cx, 30 + dy, cx - 17, 37 + dy);
    g.quadraticCurveTo(cx - 15.5, 16 + dy, cx, 4.5 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 1.3;
    g.strokeStyle = "rgba(6,14,26,0.88)";
    g.stroke();
  };
  head(3, "rgba(6,14,26,0.8)"); // spessore scuro sotto la punta
  const grd = g.createLinearGradient(0, 4, 0, 38);
  grd.addColorStop(0, shade(color, 1.7));
  grd.addColorStop(0.5, color);
  grd.addColorStop(1, shade(color, 0.58));
  head(0, grd);
  /* riflesso bianco sul dorso della punta */
  g.beginPath();
  g.moveTo(cx - 2.2, 8);
  g.quadraticCurveTo(cx - 9, 15, cx - 11, 26);
  g.lineWidth = 2.6;
  g.lineCap = "round";
  g.strokeStyle = "rgba(255,255,255,0.6)";
  g.stroke();

  dartCache.set(color, c);
  return c;
}

const chevronCache = new Map<string, HTMLCanvasElement>();

/** FRECCIA dei venti meteo in quota: STESSA FAMIGLIA del dardo delle brezze
    ma PIATTA — asta DRITTA (non sinuosa, richiesta pilota) con coda che sfuma
    e punta larga 3D. Doppio strato (base scura + faccia lucida). */
export function chevronSprite(color: string): HTMLCanvasElement {
  const hit = chevronCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 84;
  c.height = 116;
  const g = c.getContext("2d")!;
  const cx = 42;

  /* ombra integrata */
  g.beginPath();
  g.ellipse(cx, 111, 20, 2.8, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(4,10,20,0.45)";
  g.fill();

  /* CODA/ASTA DRITTA e LUNGA: sottile dietro, si allarga verso la testa, sfuma */
  const shaft = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx - 3.8, 108 + dy);
    g.lineTo(cx - 10, 38 + dy);
    g.lineTo(cx + 10, 38 + dy);
    g.lineTo(cx + 3.8, 108 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = "rgba(6,14,26,0.55)";
    g.stroke();
  };
  const shaftGrad = g.createLinearGradient(0, 38, 0, 108);
  shaftGrad.addColorStop(0, rgba(color, 0.95));
  shaftGrad.addColorStop(0.55, rgba(color, 0.5));
  shaftGrad.addColorStop(1, rgba(color, 0.1));
  shaft(3, "rgba(6,14,26,0.78)"); // spessore scuro sotto l'asta
  shaft(0, shaftGrad);

  /* riflesso lungo il fianco dell'asta */
  g.beginPath();
  g.moveTo(cx - 5.6, 46);
  g.lineTo(cx - 3, 86);
  g.lineWidth = 2;
  g.strokeStyle = "rgba(255,255,255,0.38)";
  g.stroke();

  /* PUNTA LARGA 3D (stessa della freccia ondulata, ma corpo dritto) */
  const head = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(cx, 4 + dy);
    g.quadraticCurveTo(cx + 18, 15 + dy, cx + 19.5, 36 + dy);
    g.quadraticCurveTo(cx, 29 + dy, cx - 19.5, 36 + dy);
    g.quadraticCurveTo(cx - 18, 15 + dy, cx, 4 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 1.4;
    g.strokeStyle = "rgba(6,14,26,0.88)";
    g.stroke();
  };
  head(3, "rgba(6,14,26,0.8)"); // spessore sotto
  const grd = g.createLinearGradient(0, 4, 0, 37);
  grd.addColorStop(0, shade(color, 1.7));
  grd.addColorStop(0.5, color);
  grd.addColorStop(1, shade(color, 0.6));
  head(0, grd);
  /* riflesso bianco sul dorso della punta */
  g.beginPath();
  g.moveTo(cx - 2.6, 8);
  g.quadraticCurveTo(cx - 10, 15, cx - 12.5, 26);
  g.lineWidth = 2.8;
  g.lineCap = "round";
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.stroke();

  chevronCache.set(color, c);
  return c;
}

const rotorCache = new Map<string, HTMLCanvasElement>();

/** ROTORE di sottovento: freccia CURVA ad arco (come le frecce curve dello
    stock) con punta lunga — il vortice che si forma dietro le creste. Il
    render lo fa GIRARE SU SE STESSO (rotazione animata del billboard). */
export function rotorSprite(color: string): HTMLCanvasElement {
  const hit = rotorCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const g = c.getContext("2d")!;
  const cx = 48;
  const cy = 48;
  const r = 27;
  const a0 = Math.PI * 0.62; // inizio arco (in basso a sinistra)
  const sweep = Math.PI * 1.66; // ≈300° di giro
  const a1 = a0 + sweep;

  /* gradiente lucido dell'arco (luce in alto a sinistra, ombra in basso) */
  const grd = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grd.addColorStop(0, shade(color, 1.6));
  grd.addColorStop(0.5, color);
  grd.addColorStop(1, shade(color, 0.5));

  /* arco scuro sotto (spessore 3D) */
  g.beginPath();
  g.arc(cx, cy + 2.8, r, a0, a1);
  g.lineWidth = 12.5;
  g.lineCap = "round";
  g.strokeStyle = "rgba(6,14,26,0.72)";
  g.stroke();

  /* arco principale */
  g.beginPath();
  g.arc(cx, cy, r, a0, a1);
  g.lineWidth = 10.5;
  g.lineCap = "round";
  g.strokeStyle = grd;
  g.stroke();

  /* riflesso interno */
  g.beginPath();
  g.arc(cx, cy, r - 3.2, a0 + 0.45, a0 + sweep * 0.52);
  g.lineWidth = 3;
  g.strokeStyle = "rgba(255,255,255,0.42)";
  g.stroke();

  /* PUNTA di freccia alla fine dell'arco (indica il senso di rotazione) */
  const ex = cx + Math.cos(a1) * r;
  const ey = cy + Math.sin(a1) * r;
  const ta = a1 + Math.PI / 2; // tangente al punto finale
  const tri = (dy: number, fill: string | CanvasGradient): void => {
    g.beginPath();
    g.moveTo(ex + Math.cos(ta) * 17, ey + Math.sin(ta) * 17 + dy);
    g.lineTo(ex + Math.cos(ta + 2.25) * 13.5, ey + Math.sin(ta + 2.25) * 13.5 + dy);
    g.lineTo(ex + Math.cos(ta - 2.25) * 13.5, ey + Math.sin(ta - 2.25) * 13.5 + dy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 1.1;
    g.strokeStyle = "rgba(6,14,26,0.8)";
    g.stroke();
  };
  tri(2.6, "rgba(6,14,26,0.8)"); // spessore scuro sotto la punta
  tri(0, grd);

  rotorCache.set(color, c);
  return c;
}

const streakCache = new Map<string, HTMLCanvasElement>();

/** SEGMENTO DI SCIA (capsula luminosa) delle particelle stile Windy: corpo
    sottile con nucleo chiaro, coda che sfuma e testa brillante. Disegnato
    IN ORIZONTALE puntato a Est (+x): il render lo ruota sull'azimut della
    scorsa con rotation = heading − azimut + 90°. I segmenti affiancati
    formano le LINEE DI FLUSSO vive che corrono sul terreno. */
export function streakSprite(color: string): HTMLCanvasElement {
  const hit = streakCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 14;
  const g = c.getContext("2d")!;
  const y = 7;

  /* alone esterno soffuso (glo aleggia sopra il terreno) */
  g.lineCap = "round";
  g.strokeStyle = rgba(color, 0.22);
  g.lineWidth = 11;
  g.beginPath();
  g.moveTo(6, y);
  g.lineTo(58, y);
  g.stroke();

  /* corpo con gradiente: coda trasparente → testa chiara */
  const grd = g.createLinearGradient(0, 0, 64, 0);
  grd.addColorStop(0, rgba(color, 0));
  grd.addColorStop(0.22, rgba(color, 0.55));
  grd.addColorStop(0.65, rgba(shade(color, 1.3), 0.95));
  grd.addColorStop(1, rgba(shade(color, 1.65), 1));
  g.strokeStyle = grd;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(6, y);
  g.lineTo(58, y);
  g.stroke();

  /* nucleo luminoso centrale (solo verso la testa, dove l'aria è «viva») */
  g.strokeStyle = "rgba(255,255,255,0.5)";
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(30, y);
  g.lineTo(58, y);
  g.stroke();

  streakCache.set(color, c);
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
