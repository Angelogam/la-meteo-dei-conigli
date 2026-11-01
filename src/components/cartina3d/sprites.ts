/**
 * SPRITES disegnati su canvas per la vista 3D (nessuna immagine esterna).
 *  - pinImage:       pin da avvicinamento dei decolli
 *  - gliderImage:    PARAPENDIO in volo che fluttua sopra ogni decollo
 *  - dartSprite:     FRECCIA VERA (asta dritta + punta a barbe nette) delle
 *                    brezze di pendio e dei venti meteo in quota
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

/* ================= FRECCIA VERA del flusso vento =================
   Richiesta pilota: «frecce, non falli a forma di freccia». Le vecchie frecce
   ondulate con la testa bulbosa sono FUORI. Qui c'è una freccia da mappa
   vera: ASTA DRITTA affusolata + PUNTA TRIANGOLARE con BARBE nette, legge
   direzione e senso al primo sguardo da qualunque distanza. Disegnata
   PUNTATA IN SU (verso y=0): il render la orienta con rotation = heading −
   azimut, quindi a rotazione 0 punta Nord. */

const dartCache = new Map<string, HTMLCanvasElement>();

/** hex → "rgba(r,g,b,a)" (serve per le code che sfumano). */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** FRECCIA VERA: asta dritta con leggero cono + punta a barbe affilata.
    Doppio strato (spessore scuro sotto + faccia lucida sopra) per il
    risalto 3D sopra il satellite, senza diventare un "verme". */
export function dartSprite(color: string): HTMLCanvasElement {
  const hit = dartCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 124;
  const g = c.getContext("2d")!;
  const cx = 32;

  /* alone soffuso per staccare dal satellite */
  g.shadowColor = rgba(color, 0.55);
  g.shadowBlur = 7;

  /* --- strato di SPESSORE scuro (offset +3 y): percepisce il volume --- */
  const drawArrow = (dy: number, shaftFill: string | CanvasGradient, headFill: string | CanvasGradient): void => {
    /* ASTA DRITTA: da y=114 a y=44, larga 9 in coda e 6.5 alla base della punta */
    g.beginPath();
    g.moveTo(cx - 4.5, 112 + dy);
    g.quadraticCurveTo(cx - 4.8, 76 + dy, cx - 3.2, 46 + dy);
    g.lineTo(cx + 3.2, 46 + dy);
    g.quadraticCurveTo(cx + 4.8, 76 + dy, cx + 4.5, 112 + dy);
    g.closePath();
    g.fillStyle = shaftFill;
    g.fill();

    /* PUNTA A BARBE: triangolo affilato con rientro netto (freccia vera) */
    g.beginPath();
    g.moveTo(cx, 6 + dy); // punta
    g.lineTo(cx + 16.5, 42 + dy); // barba destra
    g.lineTo(cx + 5.2, 36.5 + dy); // rientro destro
    g.lineTo(cx, 44 + dy); // incavo centrale
    g.lineTo(cx - 5.2, 36.5 + dy); // rientro sinistro
    g.lineTo(cx - 16.5, 42 + dy); // barba sinistra
    g.closePath();
    g.fillStyle = headFill;
    g.fill();
  };

  drawArrow(3, "rgba(6,14,26,0.78)", "rgba(6,14,26,0.85)");
  g.shadowBlur = 0;

  /* faccia lucida: gradiente trasversale chiaro→scuro (cilindro) */
  const bodyGrad = g.createLinearGradient(cx - 12, 0, cx + 12, 0);
  bodyGrad.addColorStop(0, shade(color, 1.5));
  bodyGrad.addColorStop(0.45, color);
  bodyGrad.addColorStop(1, shade(color, 0.55));
  const headGrad = g.createLinearGradient(cx - 14, 0, cx + 14, 0);
  headGrad.addColorStop(0, shade(color, 1.7));
  headGrad.addColorStop(0.45, shade(color, 1.12));
  headGrad.addColorStop(1, shade(color, 0.6));
  drawArrow(0, bodyGrad, headGrad);

  /* riflesso bianco lungo il fianco sinistro dell'asta */
  g.beginPath();
  g.moveTo(cx - 2.6, 52);
  g.quadraticCurveTo(cx - 3.4, 80, cx - 3, 106);
  g.lineWidth = 1.7;
  g.lineCap = "round";
  g.strokeStyle = "rgba(255,255,255,0.5)";
  g.stroke();

  dartCache.set(color, c);
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

  /* alone esterno soffuso (leggero: le scie non devono fondersi in blob) */
  g.lineCap = "round";
  g.strokeStyle = rgba(color, 0.16);
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(6, y);
  g.lineTo(58, y);
  g.stroke();

  /* corpo con gradiente: coda trasparente → testa chiara */
  const grd = g.createLinearGradient(0, 0, 64, 0);
  grd.addColorStop(0, rgba(color, 0));
  grd.addColorStop(0.22, rgba(color, 0.5));
  grd.addColorStop(0.65, rgba(shade(color, 1.3), 0.92));
  grd.addColorStop(1, rgba(shade(color, 1.65), 1));
  g.strokeStyle = grd;
  g.lineWidth = 4.2;
  g.beginPath();
  g.moveTo(6, y);
  g.lineTo(58, y);
  g.stroke();

  /* nucleo luminoso centrale (solo verso la testa, dove l'aria è «viva») */
  g.strokeStyle = "rgba(255,255,255,0.5)";
  g.lineWidth = 1.4;
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
