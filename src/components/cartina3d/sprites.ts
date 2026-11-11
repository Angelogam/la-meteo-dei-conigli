/**
 * SPRITES disegnati su canvas per la vista 3D (nessuna immagine esterna).
 *  - pinImage:       pin da avvicinamento dei decolli
 *  - gliderImage:    PARAPENDIO 3/4 in volo sopra ogni decollo: vela ad arco
 *                    con 8 celle gonfie a due toni, punte curve, cimini A/B,
 *                    pilota (casco, selletta, gambe) e ombra a terra
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

/** SEGNA-POSTO dei decolli: pin da mappa classico ma curato — goccia ROSSA
    piena con bordo bianco spesso, contorno scuro sottile, foro chiaro al
    centro, riflesso lucido in alto e ombra morbida a terra (richiesta
    pilota: «falli belli e di colore rosso»). */
export function pinImage(Cesium: CesiumNs, color: string, active: boolean): string {
  void Cesium;
  const key = color + (active ? "-on" : "");
  const hit = pinCache.get(key);
  if (hit) return hit;

  const c = document.createElement("canvas");
  c.width = 56;
  c.height = 74;
  const g = c.getContext("2d")!;
  const cx = 28;
  const cy = 21; // centro della testa
  const r = 15; // raggio testa

  /* ombra portata a terra (morbida, doppia) */
  g.fillStyle = "rgba(0,0,0,0.22)";
  g.beginPath();
  g.ellipse(cx, 70, 13, 4, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath();
  g.ellipse(cx, 70, 7.5, 2.4, 0, 0, Math.PI * 2);
  g.fill();

  /* CORPO del pin: goccia piena (testa circolare + coda affusolata curva) */
  const drop = (): void => {
    g.beginPath();
    g.moveTo(cx, 68);
    g.bezierCurveTo(cx - 8.5, 52, cx - r - 3, 42, cx - r - 3, cy);
    g.arc(cx, cy, r + 3, Math.PI, 0);
    g.bezierCurveTo(cx + r + 3, 42, cx + 8.5, 52, cx, 68);
    g.closePath();
  };

  /* contorno scuro esterno (stacca dal satellite) */
  drop();
  g.lineWidth = 6.4;
  g.strokeStyle = "rgba(10,16,24,0.85)";
  g.stroke();

  /* bordo bianco spesso (stile pin Apple/Google, pulito a ogni zoom) */
  drop();
  g.lineWidth = 4.2;
  g.strokeStyle = "#ffffff";
  g.stroke();

  /* riempimento ROSSO con leggera sfumatura di volume */
  const grd = g.createLinearGradient(cx - r, cy - r, cx + r * 0.6, cy + r);
  grd.addColorStop(0, shade(color, 1.28));
  grd.addColorStop(0.55, color);
  grd.addColorStop(1, shade(color, 0.72));
  drop();
  g.fillStyle = grd;
  g.fill();

  /* foro centrale chiaro con anellino */
  g.beginPath();
  g.arc(cx, cy, 5.6, 0, Math.PI * 2);
  g.fillStyle = "#ffffff";
  g.fill();
  g.beginPath();
  g.arc(cx, cy, 5.6, 0, Math.PI * 2);
  g.lineWidth = 1.4;
  g.strokeStyle = "rgba(10,16,24,0.4)";
  g.stroke();

  /* riflesso lucido in alto a sinistra */
  g.beginPath();
  g.ellipse(cx - 5.5, cy - 6.5, 4.6, 2.6, -0.7, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.fill();

  if (active) {
    /* doppio anello bianco pulsante attorno al decollo attivo */
    g.beginPath();
    g.arc(cx, cy, r + 9.5, 0, Math.PI * 2);
    g.lineWidth = 2.6;
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, r + 13, 0, Math.PI * 2);
    g.lineWidth = 1.4;
    g.strokeStyle = "rgba(255,255,255,0.45)";
    g.stroke();
  }
  const url = c.toDataURL();
  pinCache.set(key, url);
  return url;
}

const gliderCache = new Map<string, string>();

/** mix di due colori hex (k = 0 → a, k = 1 → b). */
function mixHex(a: string, b: string, k: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (u: number, v: number): number =>
    Math.max(0, Math.min(255, Math.round(u + (v - u) * k)));
  const r = ch((na >> 16) & 255, (nb >> 16) & 255);
  const gg = ch((na >> 8) & 255, (nb >> 8) & 255);
  const bb = ch(na & 255, nb & 255);
  return `#${((r << 16) | (gg << 8) | bb).toString(16).padStart(6, "0")}`;
}

/* ---------- GEOMETRIA del parapendio (pixel su canvas logico 256×256) ----------
   Proporzioni reali: pilota ≈ 55 px → velatura = 3.2 × pilota ≈ 172 px di
   apertura, cimini ≈ 0.9 × apertura. Vista di 3/4 da DIETRO-SOTTO: si vede
   l'intradosso delle celle, l'estremità vicina (sx) è più bassa e più larga,
   quella lontana (dx) più alta e rastremata (prospettiva). */
const G_CX = 128; // asse orizzontale del pilota
const G_SPAN = 172; // apertura velatura (≈ 3.2 × altezza pilota)
const G_APEX_Y = 20; // chioma dell'arco al centro
const G_TIP_L_Y = 54; // estremità VICINA (sx), più bassa
const G_TIP_R_Y = 48; // estremità LONTANA (dx), più alta
const G_RISER_A = { x: G_CX - 6, y: 195 }; // gruppetto riser A (bordo d'attacco)
const G_RISER_B = { x: G_CX + 6, y: 195 }; // gruppetto riser B (bordo d'uscita)
/* bordo superiore: parabola per le 3 note (punta sx, chioma, punta dx) */
const G_ARC_A = (G_TIP_L_Y + G_TIP_R_Y - 2 * G_APEX_Y) / (2 * (G_SPAN / 2) ** 2);
const G_ARC_B = (G_TIP_R_Y - G_TIP_L_Y) / (2 * (G_SPAN / 2));
const topY = (x: number): number => {
  const dx = x - G_CX;
  return G_APEX_Y + G_ARC_A * dx * dx + G_ARC_B * dx;
};
/* spessore visibile dell'intradosso: massimo al centro, quasi nullo alle punte */
const G_THICK = (x: number): number =>
  4.5 + 10 * Math.max(0, 1 - ((x - G_CX) / (G_SPAN / 2)) ** 2);
const botY = (x: number): number => topY(x) + G_THICK(x);
/* bordi delle 8 celle (larghezza decrescente verso la punta lontana: 3/4) */
const G_CELLS = [42, 68, 92, 114, 136, 157, 177, 196, 214];
/* punti d'attacco delle cimini (7 costine + le 2 punte) */
const G_ATTACH = [44, 68, 92, 114, 136, 157, 177, 196, 212];

/** PARAPENDIO IN VOLO, dettagliato e visto di 3/4 da dietro-sotto:
    velatura ad arco con 8 celle gonfie (due toni alternati del colore sito
    + celle chiare, gradienti e costine sottili), punte curve, cimini sottili
    che convergono nei gruppetti riser A/B sui moschettoni, pilota con casco,
    selletta e gambe in avanti, ombra morbida a terra. Il disegno è fatto a
    512×512 e ridotto a 256×256: linee da 0.5 px senza aliasing.
    `color` = colore del sito (celle a tono, default il caldo storico);
    `flip` = specchia la direzione di volo. */
export function gliderImage(color = "#ff9f43", flip = false): string {
  const key = `${color}|${flip ? "f" : "n"}`;
  const hit = gliderCache.get(key);
  if (hit) return hit;

  /* canvas 2× (512) poi ridotto: le linee sottili restano nitide */
  const hi = document.createElement("canvas");
  hi.width = 512;
  hi.height = 512;
  const g = hi.getContext("2d")!;
  g.scale(2, 2);
  if (flip) {
    g.translate(256, 0);
    g.scale(-1, 1);
  }

  const tipL = G_CX - G_SPAN / 2;
  const tipR = G_CX + G_SPAN / 2;

  /* percorso della velatura: bordo sup. (parabola) + bordo inf. (spessore) */
  const canopyPath = (): void => {
    g.beginPath();
    g.moveTo(tipL, topY(tipL));
    for (let x = tipL + 6; x < tipR; x += 6) g.lineTo(x, topY(x));
    g.lineTo(tipR, topY(tipR));
    g.lineTo(tipR, botY(tipR));
    for (let x = tipR - 6; x > tipL; x -= 6) g.lineTo(x, botY(x));
    g.lineTo(tipL, botY(tipL));
    g.closePath();
  };

  /* 1 — OMBRA morbida a terra sotto il pilota (doppia ellisse sfumata) */
  const shadow = (rx: number, ry: number, a: number): void => {
    g.save();
    g.translate(G_CX, 237);
    g.scale(1, ry / rx);
    const rg = g.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx);
    rg.addColorStop(0, `rgba(6,12,20,${a})`);
    rg.addColorStop(1, "rgba(6,12,20,0)");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(0, 0, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  shadow(30, 4.6, 0.3);
  shadow(15, 2.3, 0.34);

  /* 2 — CIMINI: 9 linee dai punti d'attacco sulle costine ai 2 gruppetti
        A/B, con leggera pancia (sag) come le linee vere. Sotto un velo scuro
        per il contrasto sul satellite, sopra la linea chiara da 0.5 px. */
  const drawLines = (): void => {
    g.beginPath();
    for (const ax of G_ATTACH) {
      const ay = botY(Math.max(tipL, Math.min(tipR, ax))) + 2.5;
      const r = ax < G_CX ? G_RISER_A : G_RISER_B;
      g.moveTo(ax, ay);
      g.quadraticCurveTo((ax + r.x) / 2, (ay + r.y) / 2 + 7, r.x, r.y);
    }
  };
  drawLines();
  g.lineWidth = 1.7;
  g.strokeStyle = "rgba(6,14,26,0.4)";
  g.stroke();
  drawLines();
  g.lineCap = "round";
  g.lineWidth = 0.7;
  g.strokeStyle = "rgba(243,248,253,0.95)";
  g.stroke();

  /* 3 — FUSTELLE + moschettoni ai gruppetti riser */
  g.lineCap = "round";
  g.lineWidth = 2.1;
  g.strokeStyle = "#33506e";
  g.beginPath();
  g.moveTo(G_RISER_A.x, G_RISER_A.y);
  g.lineTo(G_RISER_A.x, 187.5);
  g.moveTo(G_RISER_B.x, G_RISER_B.y);
  g.lineTo(G_RISER_B.x, 187.5);
  g.stroke();
  for (const kx of [G_RISER_A.x, G_RISER_B.x]) {
    g.beginPath();
    g.arc(kx, 186.2, 1.7, 0, Math.PI * 2);
    g.fillStyle = "#d8e0ea";
    g.fill();
    g.lineWidth = 0.6;
    g.strokeStyle = "rgba(8,14,24,0.7)";
    g.stroke();
  }

  /* 4 — PILOTA visto da dietro: gambe in avanti → selletta → busto → casco */
  g.lineWidth = 4.6;
  g.lineCap = "round";
  g.strokeStyle = "#22364c";
  g.beginPath();
  g.moveTo(124, 210);
  g.quadraticCurveTo(116.5, 217, 120, 224.5);
  g.moveTo(132, 210);
  g.quadraticCurveTo(139.5, 217, 136, 224.5);
  g.stroke();
  g.fillStyle = "#0d1926"; // scarpe
  g.beginPath();
  g.ellipse(119.6, 226.4, 3.1, 1.9, 0.12, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(136.4, 226.4, 3.1, 1.9, -0.12, 0, Math.PI * 2);
  g.fill();

  const rrect = (x: number, y: number, w: number, h: number, r: number): void => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };

  /* busto (la schiena del pilota) */
  const torso = g.createLinearGradient(0, 183, 0, 198);
  torso.addColorStop(0, "#3f5c7d");
  torso.addColorStop(1, "#2a4058");
  rrect(120.5, 183.5, 15, 13.5, 5.5);
  g.fillStyle = torso;
  g.fill();
  g.lineWidth = 0.8;
  g.strokeStyle = "rgba(8,14,24,0.55)";
  g.stroke();

  /* selletta / container di riserva con bordo luce e bretelle */
  const harness = g.createLinearGradient(0, 192, 0, 214);
  harness.addColorStop(0, "#2f4a66");
  harness.addColorStop(1, "#16283c");
  rrect(119, 192.5, 18, 20.5, 6.5);
  g.fillStyle = harness;
  g.fill();
  g.lineWidth = 1;
  g.strokeStyle = "rgba(8,14,24,0.8)";
  g.stroke();
  g.lineWidth = 1.4;
  g.strokeStyle = "rgba(226,238,250,0.28)";
  g.beginPath();
  g.moveTo(121.5, 195);
  g.quadraticCurveTo(128, 192.6, 134.5, 195);
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = "rgba(224,236,248,0.3)";
  g.beginPath();
  g.moveTo(123.5, 187);
  g.lineTo(123.5, 196.5);
  g.moveTo(132.5, 187);
  g.lineTo(132.5, 196.5);
  g.stroke();

  /* casco con gradiente sferico, fascia e riflesso */
  const helmet = g.createRadialGradient(126.2, 178.4, 1.2, 128, 181, 8.8);
  helmet.addColorStop(0, "#ffffff");
  helmet.addColorStop(0.62, "#dfe7ef");
  helmet.addColorStop(1, "#b0bfce");
  g.beginPath();
  g.arc(128, 181, 7.8, 0, Math.PI * 2);
  g.fillStyle = helmet;
  g.fill();
  g.lineWidth = 0.9;
  g.strokeStyle = "rgba(8,14,24,0.8)";
  g.stroke();
  g.beginPath(); // fascia della visiera vista da dietro
  g.arc(128, 181, 6.4, Math.PI * 0.18, Math.PI * 0.82);
  g.lineWidth = 1.3;
  g.strokeStyle = "rgba(30,44,62,0.55)";
  g.stroke();
  g.beginPath(); // riflesso
  g.ellipse(125.2, 178.2, 2.7, 1.6, -0.6, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.7)";
  g.fill();

  /* 5 — VELATURA: archetto con 8 celle gonfie, due toni alternati */
  g.save();
  canopyPath();
  g.clip();
  for (let i = 0; i < 8; i++) {
    const x0 = G_CELLS[i];
    const x1 = G_CELLS[i + 1];
    const xm = (x0 + x1) / 2;
    const grad = g.createLinearGradient(0, topY(xm) - 2, 0, botY(xm));
    if (i % 2 === 0) {
      /* cella a tono sito: luce sopra → ombra sotto (effetto gonfio) */
      grad.addColorStop(0, shade(color, 1.38));
      grad.addColorStop(0.55, color);
      grad.addColorStop(1, shade(color, 0.72));
    } else {
      /* cella chiara: bianco → tinta del sito verso l'intradosso */
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.6, mixHex("#ffffff", color, 0.3));
      grad.addColorStop(1, mixHex("#ffffff", color, 0.55));
    }
    g.fillStyle = grad;
    g.fillRect(x0 - 0.5, 14, x1 - x0 + 1, 76);
    /* rigonfiamento: luce radiale a inizio cella */
    const cy = topY(xm) + 4.5;
    const hg = g.createRadialGradient(xm, cy, 0.5, xm, cy, (x1 - x0) * 0.75);
    hg.addColorStop(0, "rgba(255,255,255,0.3)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hg;
    g.fillRect(x0, 14, x1 - x0, 76);
  }
  /* costine sottili tra le celle, lievemente convergenti (prospettiva) */
  g.strokeStyle = "rgba(10,16,24,0.5)";
  g.lineWidth = 0.8;
  g.beginPath();
  for (let i = 1; i < 8; i++) {
    const x = G_CELLS[i];
    g.moveTo(x, topY(x) + 1.2);
    g.lineTo(x - 2.2, botY(x) - 0.8);
  }
  g.stroke();
  g.restore();

  /* 6 — BORDI: luce sul bordo d'attacco, ombra sul bordo d'uscita,
        contorno netto e punte che si arricciano (estremità curve) */
  g.beginPath();
  g.moveTo(tipL, topY(tipL) + 1.1);
  for (let x = tipL + 6; x < tipR; x += 6) g.lineTo(x, topY(x) + 1.1);
  g.lineTo(tipR, topY(tipR) + 1.1);
  g.strokeStyle = "rgba(255,255,255,0.34)";
  g.lineWidth = 0.9;
  g.stroke();
  g.beginPath();
  g.moveTo(tipL, botY(tipL));
  for (let x = tipL + 6; x < tipR; x += 6) g.lineTo(x, botY(x));
  g.lineTo(tipR, botY(tipR));
  g.strokeStyle = "rgba(6,14,26,0.62)";
  g.lineWidth = 1.1;
  g.stroke();
  canopyPath();
  g.strokeStyle = "rgba(8,14,24,0.9)";
  g.lineWidth = 1.3;
  g.stroke();
  g.lineCap = "round";
  g.strokeStyle = "rgba(10,16,26,0.8)";
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(45, 56.5);
  g.quadraticCurveTo(38.5, 59.5, 39.5, 65.5);
  g.stroke();
  g.beginPath();
  g.moveTo(211, 50.5);
  g.quadraticCurveTo(217.5, 52.5, 216.5, 58.5);
  g.stroke();

  /* riduzione 512 → 256 e cache */
  const out = document.createElement("canvas");
  out.width = 256;
  out.height = 256;
  out.getContext("2d")!.drawImage(hi, 0, 0, 256, 256);
  const url = out.toDataURL();
  gliderCache.set(key, url);
  return url;
}

let bubbleImg: string | null = null;

/** Bolla di aria calda che sale nel cono termico, stile FUMO GRIGIO NEBBIA:
    nucleo bianco-grigio e alone vaporoso (niente più giallo — richiesta pilota). */
export function bubbleImage(): string {
  if (bubbleImg) return bubbleImg;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;

  /* alone esterno soffuso (fumo) */
  const halo = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  halo.addColorStop(0, "rgba(238,243,247,0.9)");
  halo.addColorStop(0.45, "rgba(201,210,218,0.5)");
  halo.addColorStop(1, "rgba(201,210,218,0)");
  g.fillStyle = halo;
  g.beginPath();
  g.arc(32, 32, 30, 0, Math.PI * 2);
  g.fill();

  /* nucleo chiaro */
  const core = g.createRadialGradient(29, 29, 1, 32, 32, 12);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.5, "#eef3f7");
  core.addColorStop(1, "#c9d2da");
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

/** Freccia slanciata a punta piena, con un leggero rilievo per contrastare
    con il satellite senza appesantire la linea di flusso. */
export function dartSprite(color: string): HTMLCanvasElement {
  const hit = dartCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 124;
  const g = c.getContext("2d")!;
  const cx = 32;

  /* alone tenue per staccare dal satellite */
  g.shadowColor = rgba(color, 0.55);
  g.shadowBlur = 4;

  /* --- strato di SPESSORE scuro (offset +3 y): percepisce il volume --- */
  const drawArrow = (dy: number, shaftFill: string | CanvasGradient, headFill: string | CanvasGradient): void => {
    /* Asta rastremata e testa stretta: leggibile ma non dominante. */
    g.beginPath();
    g.moveTo(cx - 3.8, 112 + dy);
    g.quadraticCurveTo(cx - 4.1, 76 + dy, cx - 2.8, 44 + dy);
    g.lineTo(cx + 2.8, 44 + dy);
    g.quadraticCurveTo(cx + 4.1, 76 + dy, cx + 3.8, 112 + dy);
    g.closePath();
    g.fillStyle = shaftFill;
    g.fill();

    /* Punta compatta, raccordata all'asta senza barbe larghe. */
    g.beginPath();
    g.moveTo(cx, 6 + dy); // punta
    g.lineTo(cx + 13, 42 + dy);
    g.lineTo(cx + 3.8, 42 + dy);
    g.lineTo(cx + 3.8, 112 + dy);
    g.lineTo(cx - 3.8, 112 + dy);
    g.lineTo(cx - 3.8, 42 + dy);
    g.lineTo(cx - 13, 42 + dy);
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
  g.moveTo(cx - 3.2, 52);
  g.quadraticCurveTo(cx - 4.2, 80, cx - 3.8, 106);
  g.lineWidth = 1.1;
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

/** Segmento di scia sottile con coda sfumata e nucleo chiaro. Disegnato
    IN ORIZONTALE puntato a Est (+x): il render lo ruota sull'azimut della
    scorsa con rotation = heading − azimut + 90°. I segmenti affiancati
    formano le LINEE DI FLUSSO vive che corrono sul terreno. */
export function streakSprite(color: string): HTMLCanvasElement {
  const hit = streakCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  /* Canvas largo per conservare la continuità con i segmenti vicini. */
  c.width = 64;
  c.height = 20;
  const g = c.getContext("2d")!;
  const y = 10;

  /* alone esterno soffuso (leggero: le scie non devono fondersi in blob) */
  g.lineCap = "round";
  g.strokeStyle = rgba(color, 0.1);
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
  g.lineWidth = 4.5;
  g.beginPath();
  g.moveTo(6, y);
  g.lineTo(58, y);
  g.stroke();

  /* nucleo luminoso centrale (solo verso la testa, dove l'aria è «viva») */
  g.strokeStyle = "rgba(255,255,255,0.5)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(30, y);
  g.lineTo(58, y);
  g.stroke();

  streakCache.set(color, c);
  return c;
}

let coneImg: HTMLCanvasElement | null = null;

/** TEXTURE del cono termico stile FUMO GRIGIO NEBBIA (richiesta pilota:
    «grigio nebbia come il fumo con dissolvenza»): base più densa che DISSOLVE
    verso la cima, ciuffi vaporosi diagonali e ombreggiatura cilindrica
    neutra — niente più giallo. */
export function coneSideImage(): HTMLCanvasElement {
  if (coneImg) return coneImg;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;

  /* gradiente verticale del fumo: denso alla base → evanescente in cima */
  const grd = g.createLinearGradient(0, 256, 0, 0);
  grd.addColorStop(0, "rgba(168,178,188,0.58)");
  grd.addColorStop(0.14, "rgba(182,192,201,0.42)");
  grd.addColorStop(0.4, "rgba(198,207,215,0.26)");
  grd.addColorStop(0.7, "rgba(214,221,228,0.12)");
  grd.addColorStop(1, "rgba(228,234,239,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 256);

  /* ciuffi vaporosi: chiazze morbide chiare e scure che salgono a spirale */
  for (let s = 0; s < 7; s++) {
    const yy = 232 - s * 34 - (s % 2) * 10;
    const xx = 26 + ((s * 37) % 74);
    const rr = 15 + ((s * 13) % 12);
    const puff = g.createRadialGradient(xx, yy, 1, xx, yy, rr);
    const light = s % 2 === 0;
    puff.addColorStop(0, light ? "rgba(238,243,247,0.16)" : "rgba(96,108,120,0.13)");
    puff.addColorStop(1, "rgba(220,226,232,0)");
    g.fillStyle = puff;
    g.beginPath();
    g.arc(xx, yy, rr, 0, Math.PI * 2);
    g.fill();
  }

  /* costolature elicoidali sfumate (la risalita dell'aria, in grigio) */
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
    g.fillStyle = "rgba(238,243,247,0.07)";
    g.fill();
  }
  g.restore();

  /* ombreggiatura orizzontale neutra: centro più chiaro → volume cilindrico */
  const sh = g.createLinearGradient(0, 0, 128, 0);
  sh.addColorStop(0, "rgba(40,48,56,0.3)");
  sh.addColorStop(0.28, "rgba(40,48,56,0)");
  sh.addColorStop(0.5, "rgba(244,248,251,0.12)");
  sh.addColorStop(0.72, "rgba(40,48,56,0)");
  sh.addColorStop(1, "rgba(40,48,56,0.3)");
  g.fillStyle = sh;
  g.fillRect(0, 0, 128, 256);

  coneImg = c;
  return c;
}

let ringImg: HTMLCanvasElement | null = null;

/** ANELLO alla base della termica, GRIGIO NEBBIA (doppio bordo morbido). */
export function ringImage(): HTMLCanvasElement {
  if (ringImg) return ringImg;
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const g = c.getContext("2d")!;
  const halo = g.createRadialGradient(48, 48, 18, 48, 48, 46);
  halo.addColorStop(0, "rgba(201,210,218,0)");
  halo.addColorStop(0.55, "rgba(214,221,228,0.3)");
  halo.addColorStop(0.78, "rgba(201,210,218,0.52)");
  halo.addColorStop(1, "rgba(214,221,228,0)");
  g.fillStyle = halo;
  g.beginPath();
  g.arc(48, 48, 46, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(48, 48, 26, 0, Math.PI * 2);
  g.strokeStyle = "rgba(238,243,247,0.42)";
  g.lineWidth = 2.4;
  g.stroke();
  ringImg = c;
  return ringImg;
}
