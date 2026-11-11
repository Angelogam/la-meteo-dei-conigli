/**
 * Locandina meteo volo libero — generatore SVG formato A4.
 *
 * Grafica fedele al riferimento «REPORT METEO» infographic:
 * sfondo fotografico alpino, titolo bianco/oro, pannelli bianchi e blu,
 * tabella venti compatta con frecce rosse, finestra di volo con orologio,
 * turbolenza e banda finale con l'affidabilità.
 *
 * Pagina 1 = locandina · Pagina 2 = informazioni del volo (PDF A4, max 2 pagine).
 * Font e foto sono incorporati come data-URL: il canvas non viene «sporcato»
 * e la conversione PNG/JPG/PDF resta possibile offline.
 */
import type { MeteoCurrent, MeteoHourly } from "@/services/openMeteoService";
import { calcolaTermicheBatch } from "@/utils/termiche";
import { calcCloudBase } from "@/utils/calcCloudBase";
import type { HourData } from "@/types/meteo";

export interface LocandinaInput {
  siteName: string;
  province?: string;
  date: Date;
  elevation: number;
  valleyElevation?: number;
  current: MeteoCurrent | null;
  hourly: MeteoHourly[];
  daily?: {
    tempMax?: number | null;
    temperatureMax?: number | null;
    sunrise?: string | Date | null;
    sunset?: string | Date | null;
    uvIndexMax?: number | null;
  } | null;
  report: string;
  probabilities: { flyable: number; thermal: number; wind: number; rain: number; storm: number };
  /** Sounding verticale per il windgram della pagina retro (opzionale: se manca viene stimato). */
  sounding?: LocandinaSounding | null;
  /** Report approfondito generato dall'analisi meteo (generateReportMeteo) per la pagina retro. */
  analisiReport?: AnalisiReport | null;
  /** Immagine del windgram REALE della pagina (cattura di ProfessionalWindgram, vedi PosterWindgram.tsx).
   *  Se presente il retro la usa così com'è: il grafico è identico a quello del sito. */
  windgramImage?: string | null;
}

/** Le 5 voci del report dell'analisi meteo, già in italiano semplice. */
export interface AnalisiReport {
  quadroTermico: string;
  ventoQuota: string;
  strategia: string;
  giudizioFinale: string;
  segnaliPericolo: string;
}

export interface LocandinaFonts {
  montserrat700: string;
  montserrat800: string;
  montserrat900: string;
  inter400: string;
  inter600: string;
  inter700: string;
}

/** Una fascia oraria con la forza media delle termiche e la quota raggiungibile. */
export interface FasciaTermica {
  label: string;
  orario: string;
  lift: string;
  quota: string;
  vento: string;
  level: "good" | "mid" | "weak";
}

/** Valutazione delle possibilità di cross-country della giornata. */
export interface CrossVerdict {
  verdict: string;
  km: string;
  note: string;
}

/* ------------------------------------------------------------------ */
/* Sounding per il windgram (temperature e venti ai livelli hPa)       */
/* ------------------------------------------------------------------ */
export interface SoundingLevel {
  hpa: number;
  /** quota del livello in m s.l.m. (geopotenziale reale o atmosfera standard) */
  alt: number;
  temp: number | null;
  speed: number | null;
  dir: number | null;
}

export interface SoundingHour {
  /** ora del giorno 0–23 */
  hour: number;
  temp2m: number | null;
  cloud: number | null;
  levels: SoundingLevel[];
}

export interface LocandinaSounding {
  siteAlt: number;
  hours: SoundingHour[];
  /** "modello" = temperature/geopotenziali reali · "stima" = ricostruite dal profilo base */
  source: "modello" | "stima";
}

/* A4 esatto: 1080 × 1527.43 px (210 × 297 mm) */
const PAGE_W = 1080;
const PAGE_H = 1527.43;
const PAD = 48;

const MONT = "'Montserrat','Helvetica Neue',Arial,sans-serif";
const INTER = "'Inter','Helvetica Neue',Arial,sans-serif";

/* Palette del riferimento */
const K = {
  blue: "rgba(28, 88, 165, 0.93)",
  blueSolid: "#1C58A5",
  blueDark: "rgba(11, 48, 99, 0.85)",
  navy: "#123B6D",
  ink: "#1B2A4A",
  red: "#D62828",
  gold: "#FFD34D",
  goldDeep: "#F0B429",
  white: "#FFFFFF",
  line: "rgba(18, 59, 109, 0.16)",
  muted: "#5A6B7E",
};

export function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const avg = (xs: Array<number | null | undefined>) => {
  const v = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
const nmax = (xs: Array<number | null | undefined>) => {
  const v = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? Math.max(...v) : null;
};
const nmin = (xs: Array<number | null | undefined>) => {
  const v = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? Math.min(...v) : null;
};

function dirName(deg: number | null | undefined): string {
  if (deg == null || Number.isNaN(deg)) return "Var";
  return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(((deg % 360) / 45)) % 8];
}

function fmtClock(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

/* numeri in stile italiano: virgola decimale */
function itNum(v: number, digits = 1): string {
  return v.toFixed(digits).replace(".", ",");
}

/* Misure testo (font registrati in document.fonts) */
let measureCtx: CanvasRenderingContext2D | null = null;
export function textWidth(text: string, weight: number, size: number, family: string): number {
  if (!measureCtx && typeof document !== "undefined") {
    const cnv = document.createElement("canvas");
    measureCtx = cnv.getContext("2d");
  }
  if (!measureCtx) return text.length * size * 0.58;
  measureCtx.font = `${weight} ${size}px ${family}`;
  return measureCtx.measureText(text).width;
}

export function wrapText(text: string, weight: number, size: number, family: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (textWidth(cand, weight, size, family) <= maxWidth || !cur) cur = cand;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Riduce la dimensione del font finché il testo entra nella larghezza data. */
function fitSize(text: string, weight: number, family: string, start: number, min: number, maxWidth: number): number {
  let s = start;
  while (s > min && textWidth(text, weight, s, family) > maxWidth) s -= 2;
  return s;
}

/* ------------------------------------------------------------------ */
/* Modello dati della locandina                                       */
/* ------------------------------------------------------------------ */
export interface WindRow {
  quota: number;
  dir: string;
  /** gradi meteorologici medi (per la freccia direzionale) · null se variabile */
  dirDeg: number | null;
  speedMin: number;
  speedMax: number;
}

export interface TurbRow {
  range: string;
  name: string;
}

export interface KV {
  k: string;
  v: string;
}

export interface LocandinaData {
  siteName: string;
  province: string;
  dateShort: string;
  dateLong: string;
  elevation: number;
  visibilita: string;
  tempRange: string;
  zeroTermico: string;
  cumuliBase: string;
  cumuliPomeriggio: string;
  termicheWindow: string;
  termicheQuota: string;
  cape: string;
  liftedIndex: string;
  rischioTemporali: string;
  windRows: WindRow[];
  /** "modello" = vento reale interpolato dal sounding hPa · "stima" = estrapolazione dalla legge di potenza */
  windSource: "modello" | "stima";
  /** "OGGI" / "DOMANI" / "DOPPODOMANI" (pillola in testa alle pagine) */
  relDay: string | null;
  finestra: string;
  finestraQuota: string;
  turbolenza: TurbRow[];
  summary: string;
  affidabilita: string;
  semaforo: "GO" | "ATTENZIONE" | "NO GO";
  probabilities: { flyable: number; thermal: number; wind: number; rain: number; storm: number };
  /* pagina 2 */
  alba: string;
  tramonto: string;
  qnh: string;
  umidita: string;
  raffiche: string;
  uv: string;
  ventoDecollo: string;
  inVolo: string[];
  notaPilota: string;
  bestBars: Array<{ ora: string; rateo: number }>;
  fasceTermiche: FasciaTermica[];
  cross: CrossVerdict;
  /** Verdetto meteo «se piove o se dà bello» per il template parapendio. */
  tempo: { verdict: "BELLO" | "PIOVE" | "INCERTO"; sub: string; icon: "sun" | "cloud" | "rain" };
  /** L'aria in parole semplici (al posto di CAPE/Lifted Index, che non dicono nulla ai piloti). */
  ariaPlain: string;
  /** Probabilità di pioggia per fascia oraria (grafico retro). */
  rainBars: Array<{ ora: string; p: number }>;
  /** Dati del windgram (pagina retro, stile Alpium). */
  windgram: WindgramData | null;
  /** Report dell'analisi meteo per la pagina retro (se presente). */
  analisiReport: AnalisiReport | null;
  /** Ora di elaborazione della previsione (onestà sul modello: i piloti vogliono sapere quando è stato fatto). */
  modelUpdate: string;
}

/* ------------------------------------------------------------------ */
/* Windgram (stile Alpium) — modello dati                              */
/* ------------------------------------------------------------------ */
export interface WindgramLevel {
  hpa: number;
  alt: number;
}

export interface WindgramArrow {
  /** indice della colonna ora */
  h: number;
  alt: number;
  speed: number;
  dir: number;
}

export interface WindgramData {
  hours: number[];
  siteAlt: number;
  minAlt: number;
  maxAlt: number;
  pLevels: WindgramLevel[];
  /** celle di stabilità: indice ora × riga verticale → colore RGB */
  cells: Array<{ h: number; r: number; color: string }>;
  arrows: WindgramArrow[];
  /** quota dello zero termico per ogni ora (m s.l.m.) */
  zero: Array<number | null>;
  headerTemps: Array<number | null>;
  headerCloud: Array<number | null>;
  sourceLabel: string;
  /** copertura nuvolosa alta/media/bassa per ora (0–100), come sul windgram del sito */
  cloudRows: Array<{ h: number; hi: number; mid: number; low: number }>;
  /** vento suolo e a 80 m per ora (km/h + gradi), righe NUVOLE/VENTO del sito */
  surfaceWind: Array<{ h: number; sfcSpeed: number | null; sfcDir: number | null; s80Speed: number | null; s80Dir: number | null }>;
  /** pioggia per ora (mm) */
  rain: Array<{ h: number; mm: number }>;
  /** quota massima raggiungibile dalle termiche per ora (m s.l.m.) */
  thermalTop: Array<number | null>;
}

/* Interpolazione circolare di una direzione (gradi, percorso più corto). */
function circLerp(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

/**
 * Vento REALE a quota L dal sounding del modello (geopotenziali + venti hPa):
 * interpola tra i livelli che brackettano la quota, per ogni ora del giorno.
 * Restituisce null se il sounding non copre quella quota in nessuna ora.
 */
function windAtAltitudeFromSounding(
  sounding: LocandinaSounding,
  altitude: number,
  hours: MeteoHourly[],
): { speeds: number[]; dirs: number[] } | null {
  const byHour = new Map<number, SoundingHour>();
  for (const sh of sounding.hours) byHour.set(sh.hour, sh);
  const speeds: number[] = [];
  const dirs: number[] = [];
  for (const h of hours) {
    const sh = byHour.get(h.time.getHours());
    if (!sh) continue;
    const pts = sh.levels
      .filter((l) => l.speed != null && l.dir != null)
      .map((l) => ({ alt: l.alt, s: l.speed as number, d: l.dir as number }))
      .sort((a, b) => a.alt - b.alt);
    if (!pts.length) continue;
    if (altitude <= pts[0].alt) {
      speeds.push(pts[0].s);
      dirs.push(pts[0].d);
      continue;
    }
    if (altitude >= pts[pts.length - 1].alt) {
      speeds.push(pts[pts.length - 1].s);
      dirs.push(pts[pts.length - 1].d);
      continue;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i].alt <= altitude && pts[i + 1].alt >= altitude) {
        const t = (altitude - pts[i].alt) / (pts[i + 1].alt - pts[i].alt || 1);
        speeds.push(pts[i].s + t * (pts[i + 1].s - pts[i].s));
        dirs.push(circLerp(pts[i].d, pts[i + 1].d, t));
        break;
      }
    }
  }
  return speeds.length ? { speeds, dirs } : null;
}

export function computeLocandinaData(input: LocandinaInput): LocandinaData {
  const { siteName, elevation, current, hourly } = input;
  const province = input.province ?? "";
  /* solo le ore del GIORNO scelto (la card può passare oggi/domani/dopodomani) */
  const dayKey = (dt: Date) => dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate();
  const selKey = dayKey(input.date);
  const dayRowsAll = hourly.filter((h) => h.time instanceof Date && dayKey(h.time) === selKey);
  const pool = dayRowsAll.length ? dayRowsAll : hourly;
  const dayHours = pool.filter((h) => h.time.getHours() >= 9 && h.time.getHours() <= 18);
  const hours = dayHours.length ? dayHours : pool.slice(0, 12);
  const lapse = 0.0065;

  const dateShort = input.date
    .toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();
  const dateLong = input.date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  /* relazione col giorno corrente → pillola OGGI/DOMANI/DOPPODOMANI */
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const chosen0 = new Date(input.date);
  chosen0.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((chosen0.getTime() - today0.getTime()) / 86400000);
  const relDay: string | null = dayDiff === 0 ? "OGGI" : dayDiff === 1 ? "DOMANI" : dayDiff === 2 ? "DOPPODOMANI" : null;

  /* --- visibilità e temperatura --- */
  const visMax = nmax(hours.map((h) => h.visibility));
  const visibilita = visMax == null ? "Buona" : visMax >= 25000 ? "> 25 km" : `≈ ${Math.round(visMax / 1000)} km`;
  const tMin = nmin(hours.map((h) => h.temperature));
  const tMax = nmax(hours.map((h) => h.temperature));
  const tempRange =
    tMin != null && tMax != null
      ? tMin < 0 && tMax > 0
        ? `${Math.round(tMin)} / +${Math.round(tMax)} °C` // evita l'ambiguità «−2–1 °C»
        : tMax < 0
          ? `${Math.round(tMin)} / ${Math.round(tMax)} °C`
          : `${Math.round(tMin)}–${Math.round(tMax)} °C`
      : "—";

  /* --- zero termico --- */
  const flMin = nmin(hours.map((h) => h.freezingLevel));
  const flMax = nmax(hours.map((h) => h.freezingLevel));
  const zeroTermico =
    flMin != null && flMax != null
      ? flMax - flMin <= 150
        ? `${Math.round((flMin + flMax) / 2)} m`
        : `${Math.round(flMin / 50) * 50}–${Math.round(flMax / 50) * 50} m`
      : "—";

  /* --- base cumuli (+ pomeriggio) --- */
  const cloudBaseLo = calcCloudBase(elevation, (avg(hours.map((h) => h.temperature)) ?? 12) - 1.5, (avg(hours.map((h) => h.dewPoint)) ?? 4) - 1.5);
  const cloudBaseHi = calcCloudBase(elevation, avg(hours.map((h) => h.temperature)) ?? 12, avg(hours.map((h) => h.dewPoint)) ?? 4);
  const afternoon = hours.filter((h) => h.time.getHours() >= 13 && h.time.getHours() <= 17);
  const cloudBasePm = calcCloudBase(
    elevation,
    avg(afternoon.map((h) => h.temperature)) ?? avg(hours.map((h) => h.temperature)) ?? 12,
    avg(afternoon.map((h) => h.dewPoint)) ?? avg(hours.map((h) => h.dewPoint)) ?? 4,
  );
  const cumuliBase = cloudBaseLo === cloudBaseHi ? `${cloudBaseLo} m` : `${cloudBaseLo}–${cloudBaseHi} m`;
  const cumuliPomeriggio = `Pomeriggio ${cloudBasePm} m`;

  /* --- termiche --- */
  const hourData: HourData[] = hours.map((h) => h as unknown as HourData);
  const batch = calcolaTermicheBatch(hourData, elevation);
  const bars = batch.map((b) => ({ ora: b.ora, rateo: b.termiche ? clamp(b.termiche.rateo, 0, 3) : 0.1 }));
  const bestIdx = bars.reduce((bi, b, i) => (b.rateo > (bars[bi]?.rateo ?? 0) ? i : bi), 0);
  const forzaMedia = avg(bars.map((b) => b.rateo)) ?? 0;
  const firstActive = bars.find((b) => b.rateo >= Math.max(0.3, forzaMedia * 0.55));
  const bestHours = [bars[bestIdx - 1]?.ora, bars[bestIdx]?.ora, bars[bestIdx + 1]?.ora].filter(Boolean) as number[];
  const inizio = firstActive ? firstActive.ora : bestHours[0] ?? 11;
  const fine = bestHours[bestHours.length - 1] ?? 15;
  const hh = (n: number) => `${String(n).padStart(2, "0")}:00`;
  const termicheWindow = `${hh(inizio)} – ${hh(fine)}`;
  const tops = batch.map((b) => b.termiche?.top ?? null);
  const topRealistico = nmax(tops);
  const quotaLo = topRealistico != null ? Math.round((topRealistico - 350) / 50) * 50 : null;
  const quotaHi = topRealistico != null ? Math.round((topRealistico + 100) / 50) * 50 : null;
  const termicheQuota = quotaLo != null && quotaHi != null ? `Quota ${quotaLo}–${quotaHi} m` : "Quota —";

  /* --- CAPE / Lifted Index --- */
  const capeVals = hours.map((h) => h.cape).filter((c): c is number => typeof c === "number");
  const capeMin = capeVals.length ? Math.min(...capeVals) : null;
  const capeMax = capeVals.length ? Math.max(...capeVals) : null;
  const r10 = (v: number) => Math.round(v / 10) * 10;
  const cape =
    capeMin == null || capeMax == null
      ? "n.d."
      : r10(capeMin) === r10(capeMax)
        ? `${r10(capeMax)} J/kg`
        : `${r10(capeMin)}–${r10(capeMax)} J/kg`;
  const liMin = nmin(hours.map((h) => h.liftedIndex));
  const liftedIndex = liMin != null ? `${liMin > 0 ? "+" : "−"}${itNum(Math.abs(liMin))} K` : "n.d.";

  /* --- venti alle quote (5 righe, quota decollo → 4000 m) ---
     PRIORITÀ AL DATO REALE: se il sounding del modello (geopotenziali + venti
     ai livelli hPa) è disponibile, il vento a ogni quota è interpolato DAL
     MODELLO, non estrapolato. Senza sounding si ricade sulla stima. */
  const realSounding = input.sounding && input.sounding.source === "modello" && input.sounding.hours.length ? input.sounding : null;
  const lvSet = new Set<number>([2000, 2500, 3500, 4000].filter((q) => q > elevation));
  lvSet.add(elevation);
  let filler = elevation + 500;
  while (lvSet.size < 5 && filler < 6000) {
    lvSet.add(filler);
    filler += 500;
  }
  const levels = Array.from(lvSet).sort((a, b) => a - b).slice(0, 5);
  let anyReal = false;
  const windRows: WindRow[] = levels.map((L) => {
    const real = realSounding ? windAtAltitudeFromSounding(realSounding, L, hours) : null;
    if (real) {
      anyReal = true;
      const smin = Math.min(...real.speeds);
      const smax = Math.max(...real.speeds);
      const lo = Math.round(smin / 5) * 5;
      const hi = Math.max(Math.round(smax / 5) * 5, lo + 2);
      const dd = real.dirs.slice().sort((a, b) => a - b);
      const dirDeg = dd.length ? Math.round(dd[Math.floor(dd.length / 2)]) : null;
      const dir = dirName(dirDeg);
      return { quota: L, dir, dirDeg, speedMin: lo, speedMax: hi };
    }
    const speeds: number[] = [];
    for (const h of hours) {
      const ws180 = h.windSpeed180m ?? h.windSpeed120m ?? h.windSpeed80m ?? h.windSpeed;
      const ws80 = h.windSpeed80m ?? h.windSpeed120m ?? ws180;
      let alpha = 0.14;
      if (ws180 != null && ws80 != null && ws80 > 0.5 && ws180 > ws80) alpha = clamp(Math.log(ws180 / ws80) / Math.log(180 / 80), 0.08, 0.4);
      const base = (ws180 ?? h.windSpeed ?? 0) * Math.pow(L / 180, alpha);
      const smooth = 1 + 0.12 * Math.exp(-Math.pow((L - 300) / 1200, 2)) - 0.12;
      speeds.push(clamp(base * smooth, 0, 120));
    }
    const smin = speeds.length ? Math.min(...speeds) : 0;
    const smax = speeds.length ? Math.max(...speeds) : 0;
    const lo = Math.round(smin / 5) * 5;
    const hi = Math.max(Math.round(smax / 5) * 5, lo + 2);
    const dirs = hours.map((h) => (L >= 1500 ? (h.windDir180m ?? h.windDir120m ?? h.windDir) : L >= 1000 ? (h.windDir120m ?? h.windDir80m ?? h.windDir) : h.windDir));
    const dd = dirs.filter((d): d is number => typeof d === "number");
    const dirDeg = dd.length ? Math.round(dd.slice().sort((a, b) => a - b)[Math.floor(dd.length / 2)]) : null;
    const dir = dd.length ? dirName(dirDeg) : "Var";
    return { quota: L, dir, dirDeg, speedMin: lo, speedMax: hi };
  });
  const windSource: LocandinaData["windSource"] = anyReal ? "modello" : "stima";

  /* --- rischio temporali / pioggia --- */
  const stormP = input.probabilities.storm;
  const rischioTemporali = stormP < 5 ? "< 5%" : `${stormP}%`;
  const rainP = input.probabilities.rain;

  /* --- finestra di volo --- */
  const finestra = `${hh(bestHours[0] ?? 11)} – ${hh(bestHours[bestHours.length - 1] ?? 15)}`;
  const finestraQuota = quotaLo != null && quotaHi != null ? `Quota ${quotaLo}–${quotaHi} m` : `Quota ${elevation}–${elevation + 800} m`;

  /* --- turbolenza (stile riferimento) --- */
  const gustMax = nmax(hours.map((h) => h.windGusts)) ?? 0;
  const turbStrong = clamp(Math.round(gustMax / 6), 1, 4);
  const turbolenza: TurbRow[] = [
    { range: "≤ 2000 m", name: turbStrong <= 2 ? "Leggera" : "Moderata" },
    { range: "2000 – 3000 m", name: turbStrong <= 2 ? "Moderata" : "Marcata" },
    { range: "≥ 3000 m", name: turbStrong <= 3 ? "Marcata" : "Forte" },
  ];

  /* --- affidabilità e sintesi --- */
  const completeness = hours.length
    ? hours.filter((h) => h.temperature != null && h.windSpeed != null).length / hours.length
    : 0.8;
  const affidabilitaModello = clamp(Math.round(72 + completeness * 18), 60, 92);
  const affidabilitaAnalisi = clamp(affidabilitaModello + 5, 0, 95);
  const affidabilita = `${affidabilitaModello}–${affidabilitaAnalisi}%`;

  const flyable = input.probabilities.flyable;
  const semaforo: LocandinaData["semaforo"] = flyable >= 70 ? "GO" : flyable >= 45 ? "ATTENZIONE" : "NO GO";
  const capeMaxVal = capeMax ?? 0;
  const cloudAvg = avg(hours.map((h) => h.cloudCover)) ?? 0;
  let summary: string;
  if (semaforo === "GO") {
    summary = capeMaxVal >= 80 && stormP < 20 && cloudAvg < 65 ? "Volo Locale e Termiche Pulite" : "Buone Condizioni per il Volo Libero";
  } else if (semaforo === "ATTENZIONE") {
    summary = "Condizioni Utilizzabili con Cautela";
  } else {
    summary = "Giornata Sconsigliata per il Volo";
  }

  /* --- dati operativi pagina 2 --- */
  const pressure = current?.pressure ?? avg(hours.map((h) => h.pressure));
  const umidita = Math.round(avg(hours.map((h) => h.humidity)) ?? 50);
  const ventoDecollo = current
    ? `${Math.round(current.windSpeed)} km/h da ${dirName(current.windDir)}`
    : (() => {
        const h0 = hours[Math.floor(hours.length / 2)];
        return h0 ? `${Math.round(h0.windSpeed ?? 0)} km/h da ${dirName(h0.windDir)}` : "—";
      })();
  const uvMax = input.daily?.uvIndexMax ?? nmax(hours.map((h) => h.uvIndex));

  const inVolo = [
    cloudAvg < 40 ? "Aria generalmente calma sui versanti" : "Aria movimentata ma gestibile",
    "Brezza debole di valle nelle ore centrali",
    rainP < 20 ? "Nessuna convergenza significativa prevista" : "Convergenze locali da osservare",
    capeMaxVal < 60 ? "Nessun segnale temporalesco in agenda" : "Sviluppo termico da monitorare dopo le 14",
    (visMax == null || visMax > 20000) ? "Visibilità ottima, oltre i 20 km" : "Visibilità sufficiente, foschia in valle",
    forzaMedia < 1 ? "Termiche deboli: voli locali e scuola" : "Trigger termici lungo i versanti soleggiati",
  ];

  const bestBars = bars.slice(0, 10).map((b) => ({ ora: hh(b.ora), rateo: Math.round(b.rateo * 10) / 10 }));

  /* --- termiche nelle fasce orarie (mattina / mezzogiorno / pomeriggio / sera) --- */
  const fasceDef: Array<[string, number, number]> = [
    ["Mattina", 9, 11],
    ["Mezzogiorno", 11, 14],
    ["Pomeriggio", 14, 17],
    ["Sera", 17, 19],
  ];
  const fasceTermiche: FasciaTermica[] = fasceDef.map(([label, from, to]) => {
    const fb = batch.filter((b) => b.ora >= from && b.ora < to);
    const liftF = avg(fb.map((b) => (b.termiche ? b.termiche.rateo : null)));
    const topF = nmax(fb.map((b) => b.termiche?.top ?? null));
    const vh = hours.filter((h) => h.time.getHours() >= from && h.time.getHours() < to);
    const windF = avg(vh.map((h) => h.windSpeed));
    const quota = topF != null ? `${Math.round(topF / 50) * 50 > 999 ? (Math.round(topF / 50) * 50).toLocaleString("it-IT") : Math.round(topF / 50) * 50} m` : "—";
    return {
      label,
      orario: `${hh(from)}–${hh(to)}`,
      lift: liftF != null ? `${itNum(liftF)} m/s` : "—",
      quota,
      vento: windF != null ? `${Math.round(windF)} km/h` : "—",
      level: liftF == null ? "weak" : liftF >= 1.4 ? "good" : liftF >= 0.8 ? "mid" : "weak",
    };
  });

  /* --- possibilità di cross-country --- */
  const windUpMax = nmax(windRows.filter((r) => r.quota >= 2000).map((r) => r.speedMax)) ?? 0;
  let cross: CrossVerdict;
  if (forzaMedia >= 1.5 && (topRealistico ?? 0) >= 2400 && stormP < 15 && windUpMax <= 35) {
    cross = { verdict: "XC BUONO", km: "30–60 km", note: "Termiche fitte e ben organizzate: cross realistico lungo le creste sottovento." };
  } else if (forzaMedia >= 1.0 && (topRealistico ?? 0) >= 1800 && stormP < 30 && windUpMax <= 45) {
    cross = { verdict: "XC LOCALE", km: "15–35 km", note: "Ascendenze utilizzabili a rotazione: traiettorie corte intorno al decollo." };
  } else if (forzaMedia >= 0.6) {
    cross = { verdict: "XC DIFFICILE", km: "5–15 km", note: "Termiche deboli o caotiche: realistico solo un volo locale allungato." };
  } else {
    cross = { verdict: "NO XC", km: "—", note: "Energia insufficiente per allontanarsi dal decollo." };
  }
  /* la voce cross sostituisce l'ultimo consiglio (informazione più utile) */
  inVolo[inVolo.length - 1] =
    cross.verdict === "XC BUONO"
      ? "Cross consigliato: traiettorie lungo le creste sottovento"
      : cross.verdict === "XC LOCALE"
        ? "Cross di portata locale: traiettorie corte verso le creste vicine"
        : cross.verdict === "XC DIFFICILE"
          ? "Cross difficile: volo locale allungato lungo i versanti"
          : "Volo locale consigliato: energia insufficiente per il cross";

  /* --- verdetto «se piove o se dà bello» --- */
  const rainMaxH = nmax(hours.map((h) => h.precipitationProbability)) ?? 0;
  const precipSum = hours.reduce((s, h) => s + (h.precipitation ?? 0), 0);
  let tempo: LocandinaData["tempo"];
  if (rainMaxH >= 45 || precipSum >= 3) {
    tempo = rainMaxH >= 65 || precipSum >= 6
      ? { verdict: "PIOVE", sub: "Pioggia probabile: finestre brevi, decollo sconsigliato nelle ore di pioggia", icon: "rain" }
      : { verdict: "PIOVE", sub: `Rischio pioggia ${Math.round(rainMaxH)}%: tieni d'occhio le raffiche da cumuli`, icon: "rain" };
  } else if (rainMaxH >= 20 || cloudAvg >= 60) {
    tempo = { verdict: "INCERTO", sub: `Pochi passaggi nuvolosi, pioggia improbabile (${Math.round(rainMaxH)}%)`, icon: "cloud" };
  } else {
    tempo = { verdict: "BELLO", sub: "Cielo sereno, niente pioggia: giornata asciutta", icon: "sun" };
  }

  /* --- l'aria in parole semplici (sostituisce CAPE / Lifted Index sulla locandina) --- */
  const ariaPlain: string =
    capeMaxVal >= 300 || stormP >= 30
      ? "Aria umida ed energica: cumuli grossi, possibili rovesci"
      : capeMaxVal >= 80
        ? "Aria umida: cumuli di buona tornata, nessun temporale previsto"
        : rainP < 20
          ? "Aria secca e stabile: nessuna pioggia in vista"
          : "Aria con qualche passaggio, pioggia lontana dal decollo";

  /* --- probabilità di pioggia per fascia oraria (grafico retro) --- */
  const rainBars: Array<{ ora: string; p: number }> = hours
    .filter((_, i) => i % 2 === 0)
    .map((h) => ({ ora: hh(h.time.getHours()), p: Math.round(h.precipitationProbability ?? 0) }));

  /* --- windgram stile Alpium (solo le ore del giorno scelto) --- */
  const windgram = computeWindgram(input, pool, elevation);

  return {
    siteName,
    province,
    dateShort,
    dateLong,
    elevation,
    visibilita,
    tempRange,
    zeroTermico,
    cumuliBase,
    cumuliPomeriggio,
    termicheWindow,
    termicheQuota,
    cape,
    liftedIndex,
    rischioTemporali,
    windRows,
    windSource,
    relDay,
    finestra,
    finestraQuota,
    turbolenza,
    summary,
    affidabilita,
    semaforo,
    probabilities: input.probabilities,
    alba: fmtClock(input.daily?.sunrise),
    tramonto: fmtClock(input.daily?.sunset),
    qnh: pressure != null ? `${Math.round(pressure)} hPa` : "—",
    umidita: `${umidita}%`,
    raffiche: `${Math.round(gustMax)} km/h`,
    uv: uvMax != null ? itNum(uvMax) : "—",
    ventoDecollo,
    inVolo,
    notaPilota: input.report,
    bestBars,
    fasceTermiche,
    cross,
    tempo,
    ariaPlain,
    rainBars,
    windgram,
    analisiReport: input.analisiReport ?? null,
    modelUpdate: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
  };
}

/* ------------------------------------------------------------------ */
/* Windgram stile Alpium — costruzione dati                            */
/* ------------------------------------------------------------------ */

/* Scala continua delle masse d'aria (ΔT/100 m) come su Alpium:
   viola/blu = stabile · verde = gradiente medio · giallo/rosso = termico. */
const STABILITY_STOPS: { v: number; c: [number, number, number] }[] = [
  { v: -0.3, c: [124, 92, 246] },
  { v: -0.05, c: [93, 124, 247] },
  { v: 0.1, c: [64, 156, 248] },
  { v: 0.25, c: [45, 199, 234] },
  { v: 0.4, c: [45, 209, 187] },
  { v: 0.55, c: [96, 200, 110] },
  { v: 0.7, c: [164, 214, 78] },
  { v: 0.85, c: [240, 200, 60] },
  { v: 1.0, c: [244, 150, 52] },
  { v: 1.2, c: [236, 82, 82] },
];

function stabilityColor(deltaT: number): string {
  const v = Math.max(STABILITY_STOPS[0].v, Math.min(STABILITY_STOPS[STABILITY_STOPS.length - 1].v, deltaT));
  for (let i = 0; i < STABILITY_STOPS.length - 1; i++) {
    const a = STABILITY_STOPS[i];
    const b = STABILITY_STOPS[i + 1];
    if (v >= a.v && v <= b.v) {
      const t = (v - a.v) / (b.v - a.v || 1);
      return `rgb(${a.c.map((ch, k) => Math.round(ch + (b.c[k] - ch) * t)).join(",")})`;
    }
  }
  return "rgb(236,82,82)";
}

/* Colore vento per intensità (km/h), scala Alpium */
function windgramSpeedColor(speed: number): string {
  if (speed <= 4) return "#0284c7";
  if (speed <= 8) return "#0d9488";
  if (speed <= 13) return "#16a34a";
  if (speed <= 18) return "#65a30d";
  if (speed <= 24) return "#eab308";
  if (speed <= 30) return "#f97316";
  if (speed <= 42) return "#dc2626";
  if (speed <= 58) return "#991b1b";
  return "#86198f";
}

/* Quote atmosfera standard (m s.l.m.) per i livelli hPa del windgram */
const HPA_STD_ALT: Record<number, number> = {
  1000: 110, 975: 320, 950: 500, 925: 760, 900: 1000, 850: 1450, 800: 1950,
  750: 2500, 700: 3100, 650: 3700, 600: 4400, 550: 5000, 500: 5800,
};

const WINDGRAM_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const WINDGRAM_ROWS = 26; // fasce verticali del fondo di stabilità

/**
 * Costruisce i dati del windgram: se `input.sounding` c'è usa temperature e
 * geopotenziali reali del modello, altrimenti stima il profilo dal dato orario
 * (gradiente secco ancorato allo zero termico + venti dei livelli hPa).
 */
export function computeWindgram(input: LocandinaInput, hours: MeteoHourly[], elevation: number): WindgramData | null {
  const sounding = input.sounding;
  const byHour = new Map<number, SoundingHour>();
  if (sounding?.hours?.length) {
    for (const sh of sounding.hours) byHour.set(sh.hour, sh);
  }
  const meteoByHour = new Map<number, MeteoHourly>();
  for (const h of hours) meteoByHour.set(h.time.getHours(), h);

  const cols: SoundingHour[] = [];
  const headerTemps: Array<number | null> = [];
  const headerCloud: Array<number | null> = [];
  for (const hr of WINDGRAM_HOURS) {
    const s = byHour.get(hr);
    const m = meteoByHour.get(hr);
    if (!s && !m) {
      cols.push({ hour: hr, temp2m: null, cloud: null, levels: [] });
      headerTemps.push(null);
      headerCloud.push(null);
      continue;
    }
    const levels: SoundingLevel[] = s?.levels?.length
      ? s.levels.map((l) => ({ ...l }))
      : synthesizeLevels(m, elevation);
    const temp2m = s?.temp2m ?? m?.temperature ?? levels.find((l) => l.temp != null)?.temp ?? null;
    const cloud = s?.cloud ?? m?.cloudCover ?? null;
    cols.push({ hour: hr, temp2m, cloud, levels });
    headerTemps.push(temp2m);
    headerCloud.push(cloud);
  }

  /* --- colonna senza dati (es. 08:00 prima dell'alba dati): prendi l'ora disponibile più vicina --- */
  for (let i = 0; i < cols.length; i++) {
    if (cols[i].levels.length) continue;
    let best = -1;
    let bestDist = 99;
    for (let j = 0; j < cols.length; j++) {
      if (cols[j].levels.length && Math.abs(cols[j].hour - cols[i].hour) < bestDist) {
        best = j;
        bestDist = Math.abs(cols[j].hour - cols[i].hour);
      }
    }
    if (best !== -1) {
      const src = cols[best];
      cols[i] = {
        hour: cols[i].hour,
        temp2m: src.temp2m,
        cloud: src.cloud,
        levels: src.levels.map((l) => ({ ...l })),
      };
    }
  }

  /* quote min/max del grafico */
  /* dopo il riempimento, allinea anche le temperature/nuvolosità di testata */
  for (let i = 0; i < cols.length; i++) {
    headerTemps[i] = cols[i].temp2m;
    headerCloud[i] = cols[i].cloud;
  }
  const siteAlt = sounding?.siteAlt ?? elevation;
  const minAlt = Math.max(200, Math.floor(siteAlt / 200) * 200);
  let maxAlt = 4200;
  for (const c of cols) {
    for (const l of c.levels) {
      if (l.alt > maxAlt) maxAlt = l.alt;
    }
  }
  maxAlt = Math.min(6200, Math.max(4200, Math.ceil(maxAlt / 200) * 200));

  /* livelli di pressione da tracciare (con quota reale o standard) */
  const pLevels: WindgramLevel[] = [];
  {
    const seen = new Set<number>();
    for (const c of cols) {
      for (const l of c.levels) {
        if (!seen.has(l.hpa) && l.alt >= minAlt && l.alt <= maxAlt && [925, 850, 800, 750, 700, 650, 600].includes(l.hpa)) {
          seen.add(l.hpa);
          pLevels.push({ hpa: l.hpa, alt: l.alt });
        }
      }
    }
    pLevels.sort((a, b) => b.hpa - a.hpa);
  }

  /* celle di stabilità: ΔT/100 m per colonna ora e fascia verticale */
  const cells: Array<{ h: number; r: number; color: string }> = [];
  for (let h = 0; h < cols.length; h++) {
    const c = cols[h];
    const pts = c.levels
      .filter((l) => l.temp != null)
      .map((l) => ({ alt: l.alt, temp: l.temp as number }))
      .sort((a, b) => a.alt - b.alt);
    for (let r = 0; r < WINDGRAM_ROWS; r++) {
      const altLo = minAlt + ((maxAlt - minAlt) * r) / WINDGRAM_ROWS;
      const altHi = minAlt + ((maxAlt - minAlt) * (r + 1)) / WINDGRAM_ROWS;
      const altMid = (altLo + altHi) / 2;
      let dt: number | null = null;
      if (pts.length >= 2) {
        const tLo = tempAtAlt(pts, Math.max(minAlt, altMid - 150));
        const tHi = tempAtAlt(pts, Math.min(maxAlt, altMid + 150));
        if (tLo != null && tHi != null && altHi > altLo) {
          dt = ((tLo - tHi) / 300) * 100;
        }
      }
      cells.push({ h, r, color: dt != null ? stabilityColor(clamp(dt, -0.35, 1.25)) : "#e8edf4" });
    }
  }

  /* frecce del vento ai livelli di pressione (+ suolo se disponibile) */
  const arrows: WindgramArrow[] = [];
  for (let h = 0; h < cols.length; h++) {
    const c = cols[h];
    const groundSpeed = c.levels.find((l) => l.hpa === 0);
    if (groundSpeed?.speed != null && groundSpeed.dir != null) {
      arrows.push({ h, alt: Math.max(minAlt + 60, siteAlt), speed: groundSpeed.speed, dir: groundSpeed.dir });
    }
    for (const l of c.levels) {
      if (l.speed != null && l.dir != null && l.alt >= minAlt && l.alt <= maxAlt && l.hpa !== 0) {
        arrows.push({ h, alt: l.alt, speed: l.speed, dir: l.dir });
      }
    }
  }

  /* zero termico per colonna */
  const zero: Array<number | null> = cols.map((c) => {
    const pts = c.levels.filter((l) => l.temp != null).map((l) => ({ alt: l.alt, temp: l.temp as number })).sort((a, b) => a.alt - b.alt);
    for (let i = 0; i < pts.length - 1; i++) {
      const up = pts[i].temp <= 0 && pts[i + 1].temp >= 0;
      const down = pts[i].temp >= 0 && pts[i + 1].temp <= 0;
      if ((up || down) && pts[i + 1].temp !== pts[i].temp) {
        const ratio = -pts[i].temp / (pts[i + 1].temp - pts[i].temp);
        return Math.round(pts[i].alt + ratio * (pts[i + 1].alt - pts[i].alt));
      }
    }
    return null;
  });

  const sourceLabel = sounding?.source === "modello"
    ? "Temperature e geopotenziali reali del modello (Open-Meteo hPa)"
    : "Profilo stimato: gradiente ancorato allo zero termico + venti hPa";

  /* --- righe NUVOLE / VENTO suolo+80m, pioggia e quota termiche (come sul sito) --- */
  const cloudRows = cols.map((c, h) => ({
    h,
    hi: meteoByHour.get(c.hour)?.cloudCoverHigh ?? 0,
    mid: meteoByHour.get(c.hour)?.cloudCoverMid ?? 0,
    low: meteoByHour.get(c.hour)?.cloudCoverLow ?? 0,
  }));
  const surfaceWind = cols.map((c, h) => {
    const m = meteoByHour.get(c.hour);
    return {
      h,
      sfcSpeed: m?.windSpeed ?? null,
      sfcDir: m?.windDir ?? null,
      s80Speed: m?.windSpeed80m ?? m?.windSpeed120m ?? null,
      s80Dir: m?.windDir80m ?? m?.windDir120m ?? null,
    };
  });
  const rain = cols.map((c, h) => ({ h, mm: meteoByHour.get(c.hour)?.precipitation ?? 0 }));
  const thermalTop: Array<number | null> = cols.map((c) => {
    const m = meteoByHour.get(c.hour);
    if (!m) return null;
    const b = calcolaTermicheBatch([m as unknown as HourData], elevation)[0];
    return b?.termiche?.top ?? null;
  });

  return {
    hours: WINDGRAM_HOURS,
    siteAlt,
    minAlt,
    maxAlt,
    pLevels,
    cells,
    arrows,
    zero,
    headerTemps,
    headerCloud,
    sourceLabel,
    cloudRows,
    surfaceWind,
    rain,
    thermalTop,
  };
}

/** Temperatura interpolata a quota `alt` da un profilo (alt, temp) ordinato. */
function tempAtAlt(pts: Array<{ alt: number; temp: number }>, alt: number): number | null {
  if (!pts.length) return null;
  if (alt <= pts[0].alt) return pts[0].temp;
  if (alt >= pts[pts.length - 1].alt) return pts[pts.length - 1].temp;
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i].alt <= alt && pts[i + 1].alt >= alt) {
      const t = (alt - pts[i].alt) / (pts[i + 1].alt - pts[i].alt || 1);
      return pts[i].temp + t * (pts[i + 1].temp - pts[i].temp);
    }
  }
  return pts[0].temp;
}

/** Ricostruisce un profilo verosimile quando il sounding del modello non è disponibile. */
function synthesizeLevels(m: MeteoHourly | undefined, elevation: number): SoundingLevel[] {
  const t2m = m?.temperature ?? 12;
  const fl = m?.freezingLevel ?? null;
  const levels: SoundingLevel[] = [];
  levels.push({ hpa: 0, alt: elevation + 2, temp: t2m, speed: m?.windSpeed ?? null, dir: m?.windDir ?? null });
  const std = [925, 850, 800, 750, 700, 650, 600];
  for (const hpa of std) {
    const alt = HPA_STD_ALT[hpa];
    if (alt <= elevation + 50) continue;
    let temp = t2m - (alt - elevation) * 0.0065;
    if (fl != null && fl > elevation + 200) {
      /* ancora il profilo allo zero termico del modello */
      temp = -(alt - fl) * 0.0065;
    }
    const speed =
      hpa >= 900 ? (m?.windSpeed925 ?? null)
        : hpa >= 825 ? (m?.windSpeed850 ?? null)
          : hpa >= 725 ? (m?.windSpeed700 ?? null)
            : hpa >= 625 ? (m?.windSpeed600 ?? null)
              : (m?.windSpeed500 ?? null);
    const dir =
      hpa >= 900 ? (m?.windDir925 ?? null)
        : hpa >= 825 ? (m?.windDir850 ?? null)
          : hpa >= 725 ? (m?.windDir700 ?? null)
            : hpa >= 625 ? (m?.windDir600 ?? null)
              : (m?.windDir500 ?? null);
    levels.push({ hpa, alt, temp: Math.round(temp * 10) / 10, speed, dir });
  }
  return levels;
}

/* ------------------------------------------------------------------ */
/* Asset: font + sfondo fotografico                                   */
/* ------------------------------------------------------------------ */
interface PageAssets {
  data: LocandinaData;
  fonts: LocandinaFonts | null;
  /** foto reale di parapendio su montagne verdi (fronte) */
  bg: string;
  /** foto reale di parapendio in alta quota (retro) */
  valley: string;
  /** windgram REALE della pagina (cattura del componente), se disponibile */
  windgramImage: string | null;
}

const ASSET_CACHE: { fonts: LocandinaFonts | null; bg: string | null; valley: string | null } = {
  fonts: null, bg: null, valley: null,
};

function fontFaceCss(fonts: LocandinaFonts | null): string {
  if (!fonts) return "";
  const face = (fam: string, w: number, b64: string) =>
    `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  return [
    face("Montserrat", 700, fonts.montserrat700),
    face("Montserrat", 800, fonts.montserrat800),
    face("Montserrat", 900, fonts.montserrat900),
    face("Inter", 400, fonts.inter400),
    face("Inter", 600, fonts.inter600),
    face("Inter", 700, fonts.inter700),
  ].join("\n");
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(blob);
  });
}

async function imageToJpegDataUrl(url: string, maxW: number, quality = 0.82): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxW / bmp.width);
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const cnv = document.createElement("canvas");
  cnv.width = w;
  cnv.height = h;
  const ctx = cnv.getContext("2d");
  if (!ctx) return blobToDataUrl(blob);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return cnv.toDataURL("image/jpeg", quality);
}

async function fetchWoff2Base64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch font ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function loadLocandinaAssets(): Promise<{ fonts: LocandinaFonts | null; bg: string; valley: string }> {
  if (ASSET_CACHE.fonts && ASSET_CACHE.bg && ASSET_CACHE.valley) {
    return { fonts: ASSET_CACHE.fonts, bg: ASSET_CACHE.bg, valley: ASSET_CACHE.valley };
  }
  const fontsSpec: Array<[keyof LocandinaFonts, string]> = [
    ["montserrat700", "/fonts/locandina/montserrat-700-subset.woff2"],
    ["montserrat800", "/fonts/locandina/montserrat-800-subset.woff2"],
    ["montserrat900", "/fonts/locandina/montserrat-900-subset.woff2"],
    ["inter400", "/fonts/locandina/inter-400-subset.woff2"],
    ["inter600", "/fonts/locandina/inter-600-subset.woff2"],
    ["inter700", "/fonts/locandina/inter-700-subset.woff2"],
  ];
  try {
    const entries = await Promise.all(fontsSpec.map(async ([k, url]) => [k, await fetchWoff2Base64(url)] as const));
    ASSET_CACHE.fonts = Object.fromEntries(entries) as unknown as LocandinaFonts;
    if (typeof document !== "undefined" && ASSET_CACHE.fonts) {
      const fams: Array<[string, number, string]> = [
        ["Montserrat", 700, ASSET_CACHE.fonts.montserrat700],
        ["Montserrat", 800, ASSET_CACHE.fonts.montserrat800],
        ["Montserrat", 900, ASSET_CACHE.fonts.montserrat900],
        ["Inter", 400, ASSET_CACHE.fonts.inter400],
        ["Inter", 600, ASSET_CACHE.fonts.inter600],
        ["Inter", 700, ASSET_CACHE.fonts.inter700],
      ];
      await Promise.all(
        fams.map(async ([fam, w, b64]) => {
          try {
            const ff = new FontFace(fam, `url(data:font/woff2;base64,${b64})`, { weight: String(w) });
            await ff.load();
            document.fonts.add(ff);
          } catch { /* la misura usa il fallback */ }
        }),
      );
    }
  } catch {
    ASSET_CACHE.fonts = null;
  }
  /* Foto REALI prese online (nessun parapendio disegnato: la foto è protagonista,
     come sui poster dei siti di volo). Fonti: Unsplash, Explore Savoie. */
  const [bg, valley] = await Promise.all([
    imageToJpegDataUrl("/locandine/foto/parapendio-verde.jpg", 2400, 0.86),
    imageToJpegDataUrl("/locandine/foto/parapendio-quota.jpg", 1600, 0.84),
  ]);
  ASSET_CACHE.bg = bg;
  ASSET_CACHE.valley = valley;
  return { fonts: ASSET_CACHE.fonts, bg: ASSET_CACHE.bg, valley: ASSET_CACHE.valley };
}

/* ------------------------------------------------------------------ */
/* Elementi grafici condivisi                                         */
/* ------------------------------------------------------------------ */
const SHADOW = "url(#dropShadow)";
const TXT_SHADOW = "url(#txtShadow)";

/** Termometro con mercurio rosso. */
function thermometer(x: number, y: number, h: number): string {
  const s = h / 44;
  return `<g transform="translate(${x},${y}) scale(${s})">
    <rect x="9" y="2" width="10" height="30" rx="5" fill="#FFFFFF" stroke="#9AA7B5" stroke-width="2"/>
    <rect x="12" y="14" width="4" height="16" rx="2" fill="#E23B3B"/>
    <circle cx="14" cy="35" r="7.5" fill="#E23B3B" stroke="#9AA7B5" stroke-width="2"/>
    <path d="M5 6 h4 M5 12 h4 M5 18 h4" stroke="#9AA7B5" stroke-width="1.8"/>
  </g>`;
}

/** Sole giallo con raggi. */
function sun(x: number, y: number, r: number): string {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = x + Math.cos(a) * (r + 4);
    const y1 = y + Math.sin(a) * (r + 4);
    const x2 = x + Math.cos(a) * (r + 10);
    const y2 = y + Math.sin(a) * (r + 10);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#F5A623" stroke-width="3.4" stroke-linecap="round"/>`;
  }).join("");
  return `<g filter="${TXT_SHADOW}"><circle cx="${x}" cy="${y}" r="${r}" fill="#FFD34D" stroke="#F5A623" stroke-width="3"/>${rays}</g>`;
}

/** Nuvola con fulmine (rischio temporali). */
function stormCloud(x: number, y: number, s: number): string {
  return `<g transform="translate(${x},${y}) scale(${s})" filter="${TXT_SHADOW}">
    <path d="M20 34 a11 11 0 0 1 1.6-21.8 A14 14 0 0 1 48 8.6 A10.4 10.4 0 0 1 57 26 a9 9 0 0 1-4 8 Z"
      fill="#FFFFFF" stroke="#123B6D" stroke-width="3" stroke-linejoin="round"/>
    <path d="M36 30 L27 46 L34 46 L29 60 L44 41 L36 41 L41 30 Z" fill="#FFD34D" stroke="#E8A20C" stroke-width="1.6" stroke-linejoin="round"/>
  </g>`;
}

/** Anemometro stilizzato (vento a terra). */
function gaugeIcon(x: number, y: number, s: number): string {
  const k = s / 44;
  return `<g transform="translate(${x},${y}) scale(${k})">
    <circle cx="22" cy="22" r="17" fill="#FFFFFF" stroke="#9AA7B5" stroke-width="2.4"/>
    <path d="M22 22 L22 9 M22 22 L32 28" stroke="#1C58A5" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="22" cy="22" r="3" fill="#D62828"/>
  </g>`;
}

/** Nuvola semplice (base cumuli), senza fulmini. */
function cloudIcon(x: number, y: number, s: number): string {
  return `<g transform="translate(${x},${y}) scale(${s})" filter="${TXT_SHADOW}">
    <path d="M20 34 a11 11 0 0 1 1.6-21.8 A14 14 0 0 1 48 8.6 A10.4 10.4 0 0 1 57 26 a9 9 0 0 1-4 8 Z"
      fill="#FFFFFF" stroke="#9AA7B5" stroke-width="3" stroke-linejoin="round"/>
  </g>`;
}

/** Occhio (visibilità). */
function eyeIcon(x: number, y: number, s: number): string {
  const k = s / 44;
  return `<g transform="translate(${x},${y}) scale(${k})" filter="${TXT_SHADOW}">
    <path d="M2 22 C10 9, 34 9, 42 22 C34 35, 10 35, 2 22 Z" fill="#FFFFFF" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
    <circle cx="22" cy="22" r="7.5" fill="#123B6D"/>
    <circle cx="24.5" cy="19.5" r="2.4" fill="#FFFFFF"/>
  </g>`;
}

/** Orologio analogico con lancette sulle «ore migliori». */
function clock(cx: number, cy: number, r: number, hourAngle = -60, minAngle = 0): string {
  const hand = (angDeg: number, len: number, w: number) => {
    const a = ((angDeg - 90) * Math.PI) / 180;
    const x2 = cx + Math.cos(a) * len;
    const y2 = cy + Math.sin(a) * len;
    return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#123B6D" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    const x1 = cx + Math.cos(a) * (r - 5);
    const y1 = cy + Math.sin(a) * (r - 5);
    const x2 = cx + Math.cos(a) * (r - 2);
    const y2 = cy + Math.sin(a) * (r - 2);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#123B6D" stroke-width="2"/>`;
  }).join("");
  return `<g filter="${TXT_SHADOW}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="#123B6D" stroke-width="5"/>
    ${ticks}
    ${hand(hourAngle, r * 0.52, 5)}
    ${hand(minAngle, r * 0.74, 4)}
    <circle cx="${cx}" cy="${cy}" r="4.5" fill="#D62828"/>
  </g>`;
}

/**
 * Freccia rossa ORIENTATA secondo la direzione REALE del vento in quota:
 * la punta indica verso dove il flusso va (direzione meteorologica = da dove arriva).
 * rotazione = (dir − 90): la freccia base punta a sinistra (180° schermo),
 * per un vento da O (270°) la punta va a est → flusso verso est. ✔
 */
function windArrow(x: number, y: number, w: number, h: number, dirDeg: number | null): string {
  const tip = h / 2;
  const d = `M0 ${tip} L${tip * 1.7} 0 L${tip * 1.7} ${h * 0.28} L${w} ${h * 0.28} L${w} ${h * 0.72} L${tip * 1.7} ${h * 0.72} L${tip * 1.7} ${h} Z`;
  if (dirDeg == null || Number.isNaN(dirDeg)) {
    return `<path transform="translate(${x},${y})" d="${d}" fill="#D62828" filter="${TXT_SHADOW}"/>`;
  }
  const rot = ((dirDeg - 90) % 360 + 360) % 360;
  return `<g transform="translate(${x + w / 2},${y + h / 2}) rotate(${rot.toFixed(1)})" filter="${TXT_SHADOW}">
    <path transform="translate(${-w / 2},${-h / 2})" d="${d}" fill="#D62828"/>
  </g>`;
}

/** Area delle termiche (verde → giallo) con barre verticali, come nel riferimento. */
function thermalArea(x: number, y: number, w: number, h: number, bars: Array<{ ora: string; rateo: number }>): string {
  const n = Math.max(4, bars.length);
  const slot = w / n;
  const maxR = Math.max(1, ...bars.map((b) => b.rateo));
  let d = `M ${x} ${y + h}`;
  const pts = bars.map((b, i) => ({ px: x + slot * (i + 0.5), py: y + h - (b.rateo / maxR) * (h - 8) }));
  if (pts.length) {
    d += ` L ${pts[0].px.toFixed(1)} ${pts[0].py.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1];
      const c = pts[i];
      d += ` Q ${((p.px + c.px) / 2).toFixed(1)} ${p.py.toFixed(1)} ${c.px.toFixed(1)} ${c.py.toFixed(1)}`;
    }
    d += ` L ${x + w} ${y + h} Z`;
  } else {
    d += ` L ${x + w} ${y + h} Z`;
  }
  const cells = pts.map((p, i) => `<line x1="${p.px.toFixed(1)}" y1="${p.py.toFixed(1)}" x2="${p.px.toFixed(1)}" y2="${y + h}" stroke="rgba(255,255,255,0.35)" stroke-width="1.4"/>`).join("");
  return `<g>
    <path d="${d}" fill="url(#thermoGrad)"/>
    ${cells}
    <circle cx="${x + w - 6}" cy="${y + 12}" r="3.6" fill="#FFFFFF" opacity="0.9"/>
    <path d="M ${x + w - 6} ${y + 18} L ${x + w - 6} ${y + 40}" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
    <path d="M ${x + w - 12} ${y + 24} L ${x + w - 6} ${y + 14} L ${x + w} ${y + 24}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  </g>`;
}

/** Pill «Made with AI» rimossa: il bollettino è elaborato dai dati reali
 *  Open-Meteo e lo dichiara in piede — nessuna etichetta «AI» sul prodotto. */

/** Intestazione comune alle due pagine. `chip` = pillola OGGI/DOMANI (angolo alto-sinistra). */
function header(top1: string, top2: string, dateLine: string, siteTag: string, chip?: string | null): string {
  const s1 = fitSize(top1, 900, MONT, 66, 44, 900);
  const s2 = fitSize(top2, 900, MONT, 96, 40, 600);
  const out: string[] = [];
  if (chip) {
    const cw = textWidth(chip, 900, 20, MONT) + 44;
    out.push(`<g filter="${SHADOW}">
      <rect x="${PAD}" y="22" width="${cw}" height="42" rx="21" fill="url(#goldGrad)"/>
      <text x="${PAD + cw / 2}" y="50" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="20" letter-spacing="2.5" fill="#123B6D">${esc(chip)}</text>
    </g>`);
  }
  out.push(`<text x="540" y="${18 + s1}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="${s1}" letter-spacing="2" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(top1)}</text>`);
  out.push(`<text x="540" y="${18 + s1 + 10 + s2}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="${s2}" letter-spacing="1" fill="url(#goldGrad)" filter="${TXT_SHADOW}">${esc(top2)}</text>`);
  out.push(`<text x="540" y="${18 + s1 + 10 + s2 + 46}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="30" letter-spacing="3" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(dateLine)}</text>`);
  if (siteTag) {
    out.push(`<text x="540" y="${18 + s1 + 10 + s2 + 74}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="19" letter-spacing="2" fill="rgba(255,255,255,0.92)" filter="${TXT_SHADOW}">${esc(siteTag)}</text>`);
  }
  return out.join("");
}

/** Pannello bianco arrotondato con ombra. */
function whitePanel(x: number, y: number, w: number, h: number, opacity = 0.94): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="rgba(255,255,255,${opacity})" filter="${SHADOW}"/>`;
}

function bluePanel(x: number, y: number, w: number, h: number, rx = 18): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${K.blue}" filter="${SHADOW}"/>`;
}

/** Banda titolo sezione (Venti / Turbolenza). */
function sectionBand(x: number, y: number, w: number, title: string): string {
  const size = fitSize(title, 800, MONT, 32, 22, w - 130);
  const tw = textWidth(title, 800, size, MONT);
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="56" rx="14" fill="${K.blue}" filter="${SHADOW}"/>
    <text x="${x + 22}" y="${y + 39}" font-family="${MONT}" font-weight="800" font-size="${size}" fill="#FFFFFF">${esc(title)}</text>
    <line x1="${x + 22 + tw + 18}" y1="${y + 28}" x2="${x + w - 20}" y2="${y + 28}" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
  </g>`;
}

/** Riga chiave → valore per la pagina 2. */
function kv(x: number, y: number, k: string, v: string, vSize = 23): string {
  const lines = wrapText(v, 800, vSize, MONT, 240);
  let out = `<text x="${x}" y="${y}" font-family="${INTER}" font-weight="600" font-size="14" letter-spacing="1.4" fill="${K.muted}">${esc(k.toUpperCase())}</text>`;
  lines.slice(0, 2).forEach((ln, i) => {
    out += `<text x="${x}" y="${y + 27 + i * 27}" font-family="${MONT}" font-weight="800" font-size="${vSize}" fill="${K.navy}">${esc(ln)}</text>`;
  });
  return out;
}

/** Piccola card statistiche (valutazione pagina 2). */
function statChip(x: number, y: number, w: number, label: string, value: string, color: string): string {
  const lSize = fitSize(label.toUpperCase(), 600, INTER, 14, 10, w - 16);
  const vSize = fitSize(value, 900, MONT, value.length > 10 ? 23 : 30, 15, w - 14);
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="86" rx="14" fill="#F2F6FB" stroke="rgba(18,59,109,0.12)"/>
    <text x="${x + w / 2}" y="${y + 30}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="${lSize}" letter-spacing="1" fill="${K.muted}">${esc(label.toUpperCase())}</text>
    <text x="${x + w / 2}" y="${y + 66}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="${vSize}" fill="${color}">${esc(value)}</text>
  </g>`;
}

/* ------------------------------------------------------------------ */
/* Windgram (stile Alpium) — pannello SVG                              */
/* ------------------------------------------------------------------ */

function snowflake(cx: number, cy: number, r: number, color: string): string {
  const arms: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const x2 = cx + Math.cos(a) * r;
    const y2 = cy + Math.sin(a) * r;
    arms.push(`<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`);
  }
  return `<g stroke="${color}" stroke-width="1.6" stroke-linecap="round">${arms.join("")}<circle cx="${cx}" cy="${cy}" r="1.4" fill="${color}" stroke="none"/></g>`;
}

function miniSun(cx: number, cy: number, r: number, opacity: number): string {
  const rays = Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4;
    return `<line x1="${(cx + Math.cos(a) * r * 1.35).toFixed(1)}" y1="${(cy + Math.sin(a) * r * 1.35).toFixed(1)}" x2="${(cx + Math.cos(a) * r * 1.85).toFixed(1)}" y2="${(cy + Math.sin(a) * r * 1.85).toFixed(1)}"/>`;
  }).join("");
  return `<g opacity="${Math.max(0.18, opacity).toFixed(2)}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fbbf24" stroke="none"/><g stroke="#fbbf24" stroke-width="1.4">${rays}</g></g>`;
}

/** Pannello windgram completo (titolo, testata ore, plot stabilità, legenda). */
function windgramPanel(a: PageAssets, X: number, Y: number, W: number, H: number): string {
  const d = a.data;
  const wg = d.windgram;
  const out: string[] = [];
  out.push(`<rect x="${X}" y="${Y}" width="${W}" height="${H}" rx="18" fill="rgba(9,17,38,0.97)" filter="${SHADOW}"/>`);
  out.push(`<rect x="${X}" y="${Y}" width="${W}" height="${H}" rx="18" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.4"/>`);
  /* titolo */
  out.push(`<text x="${X + 24}" y="${Y + 32}" font-family="${MONT}" font-weight="800" font-size="24" fill="#FFFFFF">WINDGRAM · AEROLOGIA DELLA GIORNATA</text>`);
  const badge = "STILE ALPIUM";
  const bw = textWidth(badge, 800, 14, MONT) + 26;
  out.push(`<rect x="${X + W - 24 - bw}" y="${Y + 12}" width="${bw}" height="26" rx="13" fill="${K.gold}"/>`);
  out.push(`<text x="${X + W - 24 - bw / 2}" y="${Y + 30}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="14" fill="#0B2447">${badge}</text>`);
  if (!wg) {
    out.push(`<text x="${X + 24}" y="${Y + 90}" font-family="${INTER}" font-weight="600" font-size="18" fill="rgba(255,255,255,0.75)">Profilo verticale non disponibile per questo decollo.</text>`);
    return out.join("");
  }

  const titleH = 48;
  const headH = 128;
  const bottomH = 30;
  const legendH = 64;
  const mL = 70, mR = 84;
  const plotX = X + mL;
  const plotW = W - mL - mR;
  const plotY = Y + titleH + headH;
  const plotH = H - titleH - headH - bottomH - legendH;
  const nH = wg.hours.length;
  const { minAlt, maxAlt } = wg;
  const altToY = (alt: number) => plotY + plotH - ((clamp(alt, minAlt, maxAlt) - minAlt) / (maxAlt - minAlt)) * plotH;
  const colX = (i: number) => plotX + ((i + 0.5) / nH) * plotW;
  const colW = plotW / nH;

  /* --- testata: temperature, sole, righe NUVOLE (H/M/B) e VENTO (suolo/80m) — come sul sito --- */
  out.push(`<rect x="${plotX}" y="${Y + titleH}" width="${plotW}" height="${headH}" fill="rgba(30,41,59,0.9)"/>`);
  const headTop = Y + titleH;
  const cloudTone = (v: number) => (v >= 65 ? "#9aa6b6" : v >= 35 ? "#b5bdc9" : v >= 12 ? "#d0d7e1" : "#e5eaf1");
  wg.hours.forEach((hr, i) => {
    const x = colX(i);
    const t = wg.headerTemps[i];
    const cloud = wg.headerCloud[i] ?? 0;
    const tCol = t == null ? "#94a3b8" : t >= 25 ? "#ef4444" : t >= 18 ? "#f97316" : "#e2e8f0";
    out.push(`<text x="${x}" y="${headTop + 18}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="16" fill="${tCol}">${t != null ? t.toFixed(0) + "°" : "—"}</text>`);
    out.push(miniSun(x - 7, headTop + 34, 5.5, 1 - (cloud / 100) * 0.8));
    out.push(`<text x="${x}" y="${headTop + 47}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="9.5" fill="#8ea0b8">${Math.round(100 - cloud)}% sole</text>`);
    /* righe nuvole alta/media/bassa */
    const cr = wg.cloudRows[i] ?? { hi: 0, mid: 0, low: 0 };
    const rowW = Math.max(6, colW - 12);
    [cr.hi, cr.mid, cr.low].forEach((v, k) => {
      const cy = headTop + 56 + k * 11;
      out.push(`<rect x="${x - rowW / 2}" y="${cy}" width="${rowW}" height="8" rx="2" fill="${cloudTone(v)}" opacity="${(0.25 + (v / 100) * 0.75).toFixed(2)}"/>`);
      if (v >= 15) out.push(`<text x="${x}" y="${cy + 7}" text-anchor="middle" font-family="${INTER}" font-weight="700" font-size="7.5" fill="#2c3a4e">${v}</text>`);
    });
    /* righe vento suolo / 80 m con valore km/h */
    const sw = wg.surfaceWind[i];
    const windRow = (yOff: number, speed: number | null, dir: number | null) => {
      const y = headTop + 93 + yOff;
      out.push(`<text x="${plotX - 44}" y="${y + 4}" font-family="${INTER}" font-weight="700" font-size="9.5" fill="#8ea0b8">${yOff === 0 ? "SUOLO" : "80 m"}</text>`);
      if (speed == null) return;
      const col2 = speed > 35 ? "#c084fc" : speed > 20 ? "#7dd3fc" : "#e2e8f0";
      out.push(`<text x="${x - 4}" y="${y + 4}" text-anchor="end" font-family="${MONT}" font-weight="800" font-size="12" fill="${col2}">${Math.round(speed)}</text>`);
      if (dir != null) {
        const rot = (dir + 90) % 360;
        out.push(`<g transform="translate(${x + 6},${y}) rotate(${rot.toFixed(0)})"><line x1="-5" y1="0" x2="4" y2="0" stroke="${col2}" stroke-width="1.6"/><polygon points="4,-2.6 8.5,0 4,2.6" fill="${col2}"/></g>`);
      }
    };
    windRow(0, sw?.sfcSpeed ?? null, sw?.sfcDir ?? null);
    windRow(15, sw?.s80Speed ?? null, sw?.s80Dir ?? null);
  });

  /* --- fondo: celle di stabilità --- */
  const rowH = plotH / WINDGRAM_ROWS;
  for (const c of wg.cells) {
    out.push(`<rect x="${(plotX + c.h * colW).toFixed(1)}" y="${(plotY + c.r * rowH).toFixed(1)}" width="${(colW + 0.6).toFixed(1)}" height="${(rowH + 0.6).toFixed(1)}" fill="${c.color}" opacity="0.92"/>`);
  }

  /* --- griglia oraria + etichette --- */
  wg.hours.forEach((hr, i) => {
    const x = colX(i);
    out.push(`<line x1="${x}" y1="${plotY}" x2="${x}" y2="${plotY + plotH}" stroke="rgba(10,18,38,0.5)" stroke-width="0.7"/>`);
    out.push(`<text x="${x}" y="${plotY + plotH + 21}" text-anchor="middle" font-family="${MONT}" font-weight="700" font-size="13.5" fill="#c9d5e8">${String(hr).padStart(2, "0")}:00</text>`);
  });

  /* --- linee di pressione (hPa) + tacche metriche a destra --- */
  for (const lv of wg.pLevels) {
    const y = altToY(lv.alt);
    out.push(`<line x1="${plotX}" y1="${y}" x2="${plotX + plotW}" y2="${y}" stroke="rgba(255,255,255,0.34)" stroke-width="0.8" stroke-dasharray="3 4"/>`);
    out.push(`<text x="${X + 14}" y="${y + 4}" font-family="${MONT}" font-weight="800" font-size="13" fill="#dbe6f5">${lv.hpa}</text>`);
    out.push(`<text x="${plotX + plotW + 8}" y="${y + 4}" font-family="${INTER}" font-weight="600" font-size="11.5" fill="#9fb2cc">${lv.alt} m</text>`);
  }
  for (let a2 = Math.ceil((wg.minAlt + 60) / 500) * 500; a2 <= wg.maxAlt; a2 += 500) {
    const y = altToY(a2);
    /* salta le tacche troppo vicine alle etichette hPa (stessa quota) */
    if (wg.pLevels.some((lv) => Math.abs(altToY(lv.alt) - y) < 13)) continue;
    out.push(`<line x1="${plotX + plotW}" y1="${y}" x2="${plotX + plotW + 5}" y2="${y}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>`);
    out.push(`<text x="${X + W - 14}" y="${y + 4}" text-anchor="end" font-family="${INTER}" font-weight="600" font-size="11" fill="#9fb2cc">${a2}</text>`);
  }
  out.push(`<text x="${plotX - 34}" y="${plotY - 6}" font-family="${INTER}" font-weight="700" font-size="11" fill="#8ea0b8">hPa</text>`);
  out.push(`<text x="${plotX + plotW + 12}" y="${plotY - 6}" font-family="${INTER}" font-weight="700" font-size="11" fill="#8ea0b8">m s.l.m.</text>`);

  /* --- linea del decollo --- */
  const launchY = altToY(wg.siteAlt);
  if (launchY > plotY && launchY < plotY + plotH) {
    out.push(`<line x1="${plotX}" y1="${launchY}" x2="${plotX + plotW}" y2="${launchY}" stroke="#10b981" stroke-width="2" opacity="0.75"/>`);
    out.push(`<path d="M ${plotX + 8} ${launchY - 4} l 5 -8 l 5 8 Z" fill="#10b981"/>`);
    out.push(`<text x="${plotX + 22}" y="${launchY - 6}" font-family="${MONT}" font-weight="800" font-size="12.5" fill="#10b981">decollo ${wg.siteAlt} m</text>`);
  }

  /* --- barbe del vento (come sul windgram del sito: asta + punta, colore = intensità) --- */
  for (const ar of wg.arrows) {
    const x = colX(ar.h);
    const y = altToY(ar.alt);
    const speedKmh = ar.speed;
    const barbColor = speedKmh > 35 ? "#c084fc" : speedKmh > 20 ? "#7dd3fc" : "#d8e2ef";
    const staffLen = Math.min(30, 12 + speedKmh * 0.6);
    const a = ((ar.dir + 90) % 360) * (Math.PI / 180);
    const sx = x + Math.cos(a) * staffLen;
    const sy = y + Math.sin(a) * staffLen;
    const fs = 1.7;
    /* punta di freccia alla fine dell'asta (verso dove soffa il flusso) */
    const ax = Math.cos(a), ay = Math.sin(a);
    const px = -ay, py = ax;
    const tipX = sx, tipY = sy;
    const b1x = sx - ax * 7 + px * 3.4, b1y = sy - ay * 7 + py * 3.4;
    const b2x = sx - ax * 7 - px * 3.4, b2y = sy - ay * 7 - py * 3.4;
    out.push(`<g opacity="0.95">
      <line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${barbColor}" stroke-width="${fs}" stroke-linecap="round"/>
      <polygon points="${tipX.toFixed(1)},${tipY.toFixed(1)} ${b1x.toFixed(1)},${b1y.toFixed(1)} ${b2x.toFixed(1)},${b2y.toFixed(1)}" fill="${barbColor}"/>
    </g>`);
  }

  /* --- pioggia: tratteggio inclinato a fondo colonna + mm (come sul sito) --- */
  for (const r of wg.rain) {
    if (r.mm <= 0.15) continue;
    const x0 = plotX + r.h * colW + 3;
    const x1 = x0 + colW - 6;
    const yBase = plotY + plotH;
    for (let k = 0; k < 4; k++) {
      const off = (k * (colW - 6)) / 4;
      out.push(`<line x1="${(x0 + off).toFixed(1)}" y1="${(yBase - 24).toFixed(1)}" x2="${(x0 + off - 9).toFixed(1)}" y2="${yBase.toFixed(1)}" stroke="#3b82f6" stroke-width="1.3" opacity="0.85"/>`);
    }
    out.push(`<rect x="${x0 - 2}" y="${yBase - 24}" width="${colW - 4}" height="24" fill="rgba(59,130,246,0.10)"/>`);
    if (r.mm >= 0.5) {
      out.push(`<text x="${((x0 + x1) / 2).toFixed(1)}" y="${yBase - 28}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="10.5" fill="#93c5fd">PIOGGIA ${itNum(r.mm)}mm</text>`);
    }
  }

  /* --- quota max delle termiche: curva tratteggiata viola + mini parapendio (come sul sito) --- */
  const topPts = wg.thermalTop
    .map((t, i) => (t != null ? { x: colX(i), y: altToY(t) } : null))
    .filter((p): p is { x: number; y: number } => p != null && p.y > plotY + 6 && p.y < plotY + plotH - 6);
  if (topPts.length >= 2) {
    const path = topPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    out.push(`<path d="${path}" fill="none" stroke="#a855f7" stroke-width="2.2" stroke-dasharray="6 5" opacity="0.9"/>`);
    const apex = topPts.reduce((m, p) => (p.y < m.y ? p : m), topPts[0]);
    out.push(`<g transform="translate(${apex.x.toFixed(1)},${(apex.y - 13).toFixed(1)})">
      <path d="M -10 0 Q 0 -6 10 0 Q 0 3 -10 0 Z" fill="#e9d5ff" stroke="#a855f7" stroke-width="1.2"/>
      <line x1="-6" y1="1.5" x2="-1.5" y2="9" stroke="#e9d5ff" stroke-width="0.9"/>
      <line x1="6" y1="1.5" x2="1.5" y2="9" stroke="#e9d5ff" stroke-width="0.9"/>
      <circle cx="0" cy="10.5" r="1.8" fill="#e9d5ff"/>
    </g>`);
  }

  /* --- zero termico (tratteggio azzurro + fiocco) --- */
  wg.zero.forEach((z, i) => {
    if (z == null) return;
    const x = colX(i);
    const y = altToY(z);
    if (y < plotY || y > plotY + plotH) return;
    out.push(`<line x1="${x - colW / 2 + 4}" y1="${y}" x2="${x + colW / 2 - 4}" y2="${y}" stroke="#7dd3fc" stroke-width="1.6" stroke-dasharray="3 3" opacity="0.95"/>`);
    out.push(snowflake(x, y - 9, 4.2, "#7dd3fc"));
  });

  /* --- bordo plot --- */
  out.push(`<rect x="${plotX}" y="${plotY}" width="${plotW}" height="${plotH}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>`);

  /* --- legenda: scala stabilità + scala vento + fonte --- */
  const legY = Y + H - legendH + 14;
  out.push(`<text x="${X + 24}" y="${legY + 4}" font-family="${INTER}" font-weight="700" font-size="12" fill="#8ea0b8">STABILE ←</text>`);
  const barX = X + 108;
  const barW = 300;
  const barSteps = 24;
  for (let i = 0; i < barSteps; i++) {
    const v = -0.3 + (i / (barSteps - 1)) * 1.55;
    out.push(`<rect x="${barX + (i * barW) / barSteps}" y="${legY - 8}" width="${barW / barSteps + 1}" height="13" fill="${stabilityColor(v)}"/>`);
  }
  out.push(`<rect x="${barX}" y="${legY - 8}" width="${barW}" height="13" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.8"/>`);
  out.push(`<text x="${barX + barW + 10}" y="${legY + 4}" font-family="${INTER}" font-weight="700" font-size="12" fill="#8ea0b8">→ INSTABILE · ΔT/100 m</text>`);
  const windStops: Array<[number, string]> = [[5, "≤5"], [13, "13"], [24, "24"], [42, "42"], [60, "60+"]];
  let wx = barX;
  for (const [v, lb] of windStops) {
    out.push(`<rect x="${wx}" y="${legY + 16}" width="22" height="11" fill="${windgramSpeedColor(v)}"/>`);
    out.push(`<text x="${wx + 26}" y="${legY + 25}" font-family="${INTER}" font-weight="600" font-size="10.5" fill="#8ea0b8">${lb} km/h</text>`);
    wx += 78;
  }
  out.push(`<text x="${X + W - 24}" y="${legY + 25}" text-anchor="end" font-family="${INTER}" font-weight="500" font-size="11" fill="rgba(255,255,255,0.55)">${esc(wg.sourceLabel)}</text>`);
  out.push(`<text x="${X + 24}" y="${legY + 44}" font-family="${INTER}" font-weight="500" font-size="10.5" fill="rgba(255,255,255,0.5)">Nuvole: righe alta · media · bassa (copertura %) · Vento: suolo e 80 m · Curva viola: quota max termiche · Barbe: direzione e forza del vento in quota</text>`);

  return out.join("");
}

/* ------------------------------------------------------------------ */
/* PAGINA 1 — Locandina                                               */
/* ------------------------------------------------------------------ */
export function buildLocandinaSVG(a: PageAssets): { svg: string; width: number; height: number } {
  const d = a.data;
  const out: string[] = [];

  /* sfondo fotografico full-bleed */
  out.push(`<g clip-path="url(#pageClip)">
    <image href="${a.bg}" x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" preserveAspectRatio="xMidYMid slice"/>
    <rect x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" fill="url(#bgVeil)"/>
  </g>`);

  /* intestazione (con pillola OGGI/DOMANI se il report riguarda il giorno corrente) */
  const siteTag = d.province ? `${d.province.toUpperCase()} · DECOLLO ${d.elevation} M S.L.M.` : `DECOLLO ${d.elevation} M S.L.M.`;
  out.push(header("REPORT METEO", d.siteName.toUpperCase(), d.dateShort, siteTag, d.relDay));

  /* ============ RIGA VERDETTO: se piove o se dà bello ============ */
  const vy = 306;
  const vh = 146;
  const lw = 560;
  const vrx = PAD + lw + 20;
  const vrw = PAGE_W - PAD - vrx;
  out.push(whitePanel(PAD, vy, lw, vh));
  out.push(`<text x="${PAD + 24}" y="${vy + 36}" font-family="${MONT}" font-weight="800" font-size="17" letter-spacing="2" fill="${K.muted}">IL TEMPO AL DECOLLO</text>`);
  /* icona meteo grande (sole / nuvola / pioggia disegnata) */
  if (d.tempo.icon === "sun") {
    out.push(sun(PAD + 58, vy + 88, 24));
  } else {
    out.push(stormCloud(PAD + 58, vy + 62, d.tempo.icon === "rain" ? 1 : 0.75));
  }
  const vCol = d.tempo.verdict === "BELLO" ? "#1D8F5F" : d.tempo.verdict === "PIOVE" ? "#D64545" : "#B97A12";
  out.push(`<text x="${PAD + 112}" y="${vy + 92}" font-family="${MONT}" font-weight="900" font-size="50" fill="${vCol}">${esc(d.tempo.verdict)}</text>`);
  const tempoLines = wrapText(d.tempo.sub, 600, 16.5, INTER, lw - 136).slice(0, 2);
  tempoLines.forEach((ln, i) => {
    out.push(`<text x="${PAD + 112}" y="${vy + 118 + i * 23}" font-family="${INTER}" font-weight="600" font-size="16.5" fill="${K.ink}">${esc(ln)}</text>`);
  });

  out.push(bluePanel(vrx, vy, vrw, vh));
  out.push(`<text x="${vrx + 24}" y="${vy + 36}" font-family="${MONT}" font-weight="800" font-size="17" letter-spacing="2" fill="${K.gold}">GIORNATA DI VOLO</text>`);
  const semW = Math.min(textWidth(d.semaforo, 900, 30, MONT) + 46, vrw - 48);
  out.push(`<rect x="${vrx + 24}" y="${vy + 52}" width="${semW}" height="48" rx="24" fill="#FFFFFF" filter="${SHADOW}"/>`);
  out.push(`<text x="${vrx + 24 + semW / 2}" y="${vy + 84}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="30" fill="${K.navy}">${esc(d.semaforo)}</text>`);
  /* le due probabilità sotto il badge: fitSize per non uscire mai dal pannello */
  const pAvail = vrw - 48;
  const volSize = fitSize(`Volabile ${d.probabilities.flyable}%`, 800, MONT, 21, 13, pAvail);
  const temSize = fitSize(`Temporali ${d.rischioTemporali}`, 800, MONT, 21, 13, pAvail);
  const pSize = Math.min(volSize, temSize);
  out.push(`<text x="${vrx + 24}" y="${vy + 122}" font-family="${MONT}" font-weight="800" font-size="${pSize}" fill="#FFFFFF">Volabile ${d.probabilities.flyable}%  ·  Temporali ${esc(d.rischioTemporali)}</text>`);
  out.push(`<text x="${vrx + 24}" y="${vy + 140}" font-family="${INTER}" font-weight="600" font-size="14" fill="rgba(255,255,255,0.85)">Termiche ${d.probabilities.thermal}% · Vento favorevole ${d.probabilities.wind}%</text>`);

  /* ============ RIGA 4 STATISTICHE DEL PILOTA ============
     Temperatura · Vento a terra · Zero termico · Base cumuli
     (stile riferimento: icona, etichetta, valore grande, sottotitolo) */
  const statY = 470;
  const statH = 124;
  const statW = (PAGE_W - PAD * 2 - 3 * 16) / 4;
  const statPanel = (x: number, icon: string, label: string, value: string, sub: string, isBlue: boolean) => {
    const p: string[] = [];
    p.push(isBlue ? bluePanel(x, statY, statW, statH) : whitePanel(x, statY, statW, statH));
    const labCol = isBlue ? "rgba(255,255,255,0.82)" : K.muted;
    const valCol = isBlue ? "#FFFFFF" : K.navy;
    const subCol = isBlue ? "rgba(255,255,255,0.72)" : K.muted;
    const vSize = fitSize(value, 900, MONT, value.length > 9 ? 26 : 31, 17, statW - 30);
    p.push(icon);
    p.push(`<text x="${x + 22}" y="${statY + 62}" font-family="${INTER}" font-weight="700" font-size="12" letter-spacing="1.2" fill="${labCol}">${esc(label.toUpperCase())}</text>`);
    p.push(`<text x="${x + 22}" y="${statY + 96}" font-family="${MONT}" font-weight="900" font-size="${vSize}" fill="${valCol}">${esc(value)}</text>`);
    p.push(`<text x="${x + 22}" y="${statY + 114}" font-family="${INTER}" font-weight="600" font-size="11.5" fill="${subCol}">${esc(sub)}</text>`);
    return p.join("");
  };
  const s1x = PAD;
  const s2x = PAD + statW + 16;
  const s3x = s2x + statW + 16;
  const s4x = s3x + statW + 16;
  out.push(statPanel(s1x, thermometer(s1x + 158, statY + 16, 34), "Temperatura", d.tempRange, `Umido ${d.umidita} · UV ${d.uv}`, false));
  out.push(statPanel(s2x, gaugeIcon(s2x + 156, statY + 18, 32), "Vento a terra", d.ventoDecollo, `Raffiche max ${d.raffiche}`, false));
  out.push(statPanel(s3x, snowflake(s3x + 174, statY + 32, 15, "#1C58A5"), "Zero termico", d.zeroTermico, "Iso-zero in quota", false));
  out.push(statPanel(s4x, cloudIcon(s4x + 152, statY + 18, 0.6), "Base cumuli", d.cumuliBase, d.cumuliPomeriggio, true));

  /* ============ RIGA TERMICHE + ARIA ============ */
  const tY = 610;
  const tH = 180;
  const tLw = 560;
  const aX = PAD + tLw + 20;
  const aW = PAGE_W - PAD - aX;
  out.push(whitePanel(PAD, tY, tLw, tH));
  out.push(`<text x="${PAD + 24}" y="${tY + 36}" font-family="${MONT}" font-weight="800" font-size="18" letter-spacing="1.6" fill="${K.blueSolid}">TERMICHE</text>`);
  out.push(`<text x="${PAD + 24}" y="${tY + 78}" font-family="${MONT}" font-weight="900" font-size="42" fill="${K.navy}">${esc(d.termicheWindow)}</text>`);
  out.push(`<text x="${PAD + 24}" y="${tY + 104}" font-family="${MONT}" font-weight="800" font-size="19" fill="${K.muted}">${esc(d.termicheQuota.toUpperCase())}</text>`);
  out.push(thermalArea(PAD + 24, tY + 114, tLw - 48, 50, d.bestBars));
  out.push(`<text x="${PAD + tLw - 24}" y="${tY + 36}" text-anchor="end" font-family="${INTER}" font-weight="600" font-size="12" letter-spacing="1" fill="${K.muted}">FORZA ${d.fasceTermiche[1]?.lift ?? "—"}</text>`);

  out.push(bluePanel(aX, tY, aW, tH));
  out.push(`<text x="${aX + 24}" y="${tY + 34}" font-family="${MONT}" font-weight="800" font-size="17" letter-spacing="1.6" fill="${K.gold}">L'ARIA DI OGGI</text>`);
  const ariaLines = wrapText(d.ariaPlain, 600, 17.5, MONT, aW - 120).slice(0, 2);
  ariaLines.forEach((ln, i) => {
    out.push(`<text x="${aX + 24}" y="${tY + 64 + i * 24}" font-family="${MONT}" font-weight="800" font-size="17.5" fill="#FFFFFF">${esc(ln)}</text>`);
  });
  out.push(`<text x="${aX + 24}" y="${tY + (ariaLines.length > 1 ? 122 : 98)}" font-family="${INTER}" font-weight="600" font-size="13" fill="rgba(255,255,255,0.85)">Visibilità ${esc(d.visibilita)} · Raffiche ${esc(d.raffiche)}</text>`);
  out.push(`<text x="${aX + 24}" y="${tY + (ariaLines.length > 1 ? 144 : 120)}" font-family="${INTER}" font-weight="600" font-size="12.5" fill="rgba(255,255,255,0.72)">CAPE ${esc(d.cape)} · Lifted Index ${esc(d.liftedIndex)}</text>`);
  out.push(stormCloud(aX + aW - 62, tY + 24, 0.62));
  out.push(`<text x="${aX + 24}" y="${tY + tH - 14}" font-family="${MONT}" font-weight="800" font-size="17" fill="${K.gold}">Rischio Temporali ${esc(d.rischioTemporali)}</text>`);

  /* ============ RIGA VENTI IN QUOTA + FINESTRA DI VOLO ============ */
  const vY = 806;
  const vH = 250;
  const vLw = 560;
  const fX = PAD + vLw + 20;
  const fW = PAGE_W - PAD - fX;
  out.push(whitePanel(PAD, vY, vLw, vH));
  out.push(`<text x="${PAD + 24}" y="${vY + 38}" font-family="${MONT}" font-weight="800" font-size="20" letter-spacing="1.6" fill="${K.blueSolid}">VENTI IN QUOTA</text>`);
  const windSrcNote = d.windSource === "modello"
    ? "km/h · dati del modello alle quote (media 9–18)"
    : "km/h · valori stimati dal profilo del modello";
  out.push(`<text x="${PAD + vLw - 24}" y="${vY + 38}" text-anchor="end" font-family="${INTER}" font-weight="600" font-size="12.5" fill="${K.muted}">${esc(windSrcNote)}</text>`);
  d.windRows.forEach((r, i) => {
    const ry = vY + 72 + i * 34;
    if (i > 0) out.push(`<line x1="${PAD + 22}" y1="${ry - 9}" x2="${PAD + vLw - 22}" y2="${ry - 9}" stroke="${K.line}" stroke-width="1"/>`);
    out.push(`<text x="${PAD + 26}" y="${ry + 5}" font-family="${MONT}" font-weight="800" font-size="18" fill="${K.navy}">${r.quota} m</text>`);
    out.push(`<text x="${PAD + 168}" y="${ry + 5}" font-family="${MONT}" font-weight="800" font-size="18" fill="${K.blueSolid}">${esc(r.dir)}</text>`);
    const spSize = fitSize(`${r.speedMin}–${r.speedMax} km/h`, 800, MONT, 19, 14, 160);
    out.push(`<text x="${PAD + 244}" y="${ry + 5}" font-family="${MONT}" font-weight="800" font-size="${spSize}" fill="${K.ink}">${r.speedMin}–${r.speedMax} km/h</text>`);
    /* freccia orientata secondo la direzione reale del flusso in quota */
    out.push(windArrow(PAD + vLw - 74, ry - 8, 46, 18, r.dirDeg));
  });

  out.push(bluePanel(fX, vY, fW, vH));
  out.push(clock(fX + 64, vY + 74, 40, -60, 15));
  out.push(`<text x="${fX + 122}" y="${vY + 36}" font-family="${MONT}" font-weight="800" font-size="16" letter-spacing="1.4" fill="${K.gold}">FINESTRA DI VOLO</text>`);
  /* l'etichetta rispetta il verdetto del giorno: su giornate no/da monitorare
     la finestra resta «la migliore possibile», non «ottimale» (niente messaggi
     contraddittori per il pilota) */
  const windowLabel = d.probabilities.flyable >= 65 ? "OTTIMALE" : "LA MIGLIORE";
  const wlSize = fitSize(windowLabel, 900, MONT, 40, 26, fW - 150);
  out.push(`<text x="${fX + 122}" y="${vY + 76}" font-family="${MONT}" font-weight="900" font-size="${wlSize}" fill="#FFFFFF">${windowLabel}</text>`);
  const fwSize = fitSize(d.finestra, 900, MONT, 44, 30, fW - 60);
  out.push(`<text x="${fX + 24}" y="${vY + 136}" font-family="${MONT}" font-weight="900" font-size="${fwSize}" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(d.finestra)}</text>`);
  out.push(`<text x="${fX + 24}" y="${vY + 162}" font-family="${MONT}" font-weight="800" font-size="19" fill="#FFFFFF">${esc(d.finestraQuota)}</text>`);
  const xcLabel2 = `Cross: ${d.cross.verdict}${d.cross.km !== "—" ? ` · ${d.cross.km}` : ""}`;
  const xcW2 = Math.min(textWidth(xcLabel2, 800, 18, MONT) + 26, fW - 48);
  out.push(`<rect x="${fX + 24}" y="${vY + 178}" width="${xcW2}" height="36" rx="10" fill="rgba(255,211,77,0.95)" filter="${SHADOW}"/>`);
  out.push(`<text x="${fX + 24 + xcW2 / 2}" y="${vY + 202}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="17.5" fill="${K.navy}">${esc(xcLabel2)}</text>`);
  const noteLines2 = wrapText(d.cross.note, 600, 12.5, INTER, fW - 48).slice(0, 2);
  noteLines2.forEach((ln, i) => {
    out.push(`<text x="${fX + 24}" y="${vY + 228 + i * 15}" font-family="${INTER}" font-weight="600" font-size="12" fill="rgba(255,255,255,0.85)">${esc(ln)}</text>`);
  });

  /* ============ TURBOLENZA PER FASCE DI QUOTA ============ */
  const tbY = 1072;
  const tbH = 118;
  out.push(whitePanel(PAD, tbY, PAGE_W - PAD * 2, tbH));
  out.push(`<text x="${PAD + 24}" y="${tbY + 40}" font-family="${MONT}" font-weight="800" font-size="20" letter-spacing="1.6" fill="${K.blueSolid}">TURBOLENZA</text>`);
  d.turbolenza.forEach((t, i) => {
    const colX = PAD + 250 + i * 260;
    out.push(`<text x="${colX}" y="${tbY + 40}" font-family="${INTER}" font-weight="600" font-size="14.5" fill="${K.muted}">${esc(t.range)}</text>`);
    out.push(`<text x="${colX}" y="${tbY + 74}" font-family="${MONT}" font-weight="900" font-size="24" fill="${K.navy}">${esc(t.name)}</text>`);
    if (i < d.turbolenza.length - 1) {
      out.push(`<line x1="${colX + 220}" y1="${tbY + 20}" x2="${colX + 220}" y2="${tbY + 90}" stroke="${K.line}" stroke-width="1.2"/>`);
    }
  });
  out.push(`<text x="${PAGE_W - PAD - 24}" y="${tbY + tbH - 18}" text-anchor="end" font-family="${INTER}" font-weight="600" font-size="12.5" fill="${K.muted}">Stima dalle raffiche massime del modello · ${esc(d.notaPilota ? "previsione Open-Meteo elaborata alle " + d.modelUpdate : "elaborato alle " + d.modelUpdate)}</text>`);

  /* ---- banda finale: sintesi + affidabilità ---- */
  const footY = PAGE_H - 168;
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="168" fill="${K.blueDark}" filter="${SHADOW}"/>`);
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="4" fill="${K.gold}"/>`);
  const sumSize = fitSize(d.summary, 800, MONT, 40, 26, 1000);
  out.push(`<text x="540" y="${footY + 72}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="${sumSize}" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(d.summary)}</text>`);
  out.push(`<text x="540" y="${footY + 122}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="29" fill="#FFFFFF" filter="${TXT_SHADOW}">Affidabilità <tspan fill="${K.gold}">${esc(d.affidabilita)}</tspan></text>`);
  out.push(`<text x="540" y="${PAGE_H - 14}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="15" letter-spacing="1" fill="rgba(255,255,255,0.75)">la-meteo-dei-conigli.vercel.app · Retro: analisi della giornata + windgram del sito</text>`);

  const svg = pageSvg(out.join("\n"));
  return { svg, width: PAGE_W, height: PAGE_H };
}

/* ------------------------------------------------------------------ */
/* PAGINA 2 — Informazioni del volo                                   */
/* ------------------------------------------------------------------ */
export function buildFlightInfoSVG(a: PageAssets): { svg: string; width: number; height: number } {
  const d = a.data;
  const out: string[] = [];

  /* sfondo fotografico con velo più scuro (valle verde: fa risaltare i pannelli) */
  out.push(`<g clip-path="url(#pageClip)">
    <image href="${a.valley}" x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" preserveAspectRatio="xMidYMid slice"/>
    <rect x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" fill="url(#bgVeilDark)"/>
  </g>`);

  /* intestazione (anche la pagina 2 mostra la pillola del giorno) */
  const siteTag = d.province ? `${d.province.toUpperCase()} · DECOLLO ${d.elevation} M S.L.M.` : `DECOLLO ${d.elevation} M S.L.M.`;
  out.push(header("REPORT", "GIORNALIERO", d.dateShort, siteTag, d.relDay));

  /* ============ ANALISI DELLA GIORNATA + TERMICHE PER FASCIA ============ */
  const py = 292;
  const ph = 316;
  const lw = 560;
  const rxc = PAD + lw + 20;
  const rw = PAGE_W - PAD - rxc;

  /* --- report dell'analisi meteo (le stesse parole dell'Analisi sul sito) --- */
  out.push(whitePanel(PAD, py, lw, ph, 0.97));
  const rep = d.analisiReport;
  let textEndY = py + 66;
  if (rep) {
    out.push(`<text x="${PAD + 26}" y="${py + 38}" font-family="${MONT}" font-weight="800" font-size="21" letter-spacing="2" fill="${K.blueSolid}">L'ANALISI DELLA GIORNATA</text>`);
    const sec = (label: string, text: string, maxLines: number, labelColor: string, yStart: number): number => {
      let yy = yStart;
      out.push(`<text x="${PAD + 26}" y="${yy}" font-family="${MONT}" font-weight="800" font-size="13" letter-spacing="1.4" fill="${labelColor}">${esc(label)}</text>`);
      yy += 18;
      const lines = wrapText(text, 400, 13.5, INTER, lw - 56).slice(0, maxLines);
      if (wrapText(text, 400, 13.5, INTER, lw - 56).length > maxLines && lines[maxLines - 1]) {
        lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:]?\s*$/, "…");
      }
      for (const ln of lines) {
        out.push(`<text x="${PAD + 26}" y="${yy}" font-family="${INTER}" font-weight="400" font-size="13.5" fill="${K.ink}">${esc(ln)}</text>`);
        yy += 17.5;
      }
      return yy + 4;
    };
    let ay = py + 62;
    ay = sec("TERMICO E STABILITÀ", rep.quadroTermico, 3, "#1C58A5", ay);
    ay = sec("VENTO IN QUOTA", rep.ventoQuota, 2, "#1C58A5", ay);
    ay = sec("STRATEGIA DI VOLO", rep.strategia, 2, "#1C58A5", ay);
    ay = sec("GIUDIZIO FINALE", rep.giudizioFinale, 2, "#1D8F5F", ay);
    textEndY = ay;
  } else {
    out.push(`<text x="${PAD + 26}" y="${py + 42}" font-family="${MONT}" font-weight="800" font-size="22" letter-spacing="2" fill="${K.blueSolid}">IL GIORNO IN PAROLE</text>`);
    const repLines = wrapText(d.notaPilota, 400, 17.5, INTER, lw - 56).slice(0, 10);
    if (wrapText(d.notaPilota, 400, 17.5, INTER, lw - 56).length > 10 && repLines[9]) {
      repLines[9] = repLines[9].replace(/[.,;:]?\s*$/, "…");
    }
    let ry = py + 74;
    for (const ln of repLines) {
      out.push(`<text x="${PAD + 26}" y="${ry}" font-family="${INTER}" font-weight="400" font-size="17.5" fill="${K.ink}">${esc(ln)}</text>`);
      ry += 25;
    }
  }

  /* --- termiche per fasce orarie + probabilità di pioggia per fascia --- */
  out.push(whitePanel(rxc, py, rw, ph, 0.97));
  out.push(`<text x="${rxc + 24}" y="${py + 40}" font-family="${MONT}" font-weight="800" font-size="19" letter-spacing="1.2" fill="${K.blueSolid}">TERMICHE PER FASCIA</text>`);
  const fasceColor: Record<FasciaTermica["level"], string> = { good: "#2E7D32", mid: "#B97A12", weak: "#A34E44" };
  let fy2 = py + 62;
  d.fasceTermiche.forEach((f, i) => {
    if (i > 0) out.push(`<line x1="${rxc + 22}" y1="${fy2 - 4}" x2="${rxc + rw - 22}" y2="${fy2 - 4}" stroke="${K.line}" stroke-width="1"/>`);
    out.push(`<circle cx="${rxc + 30}" cy="${fy2 + 6}" r="6" fill="${fasceColor[f.level]}"/>`);
    out.push(`<text x="${rxc + 46}" y="${fy2 + 11}" font-family="${MONT}" font-weight="800" font-size="16" fill="${K.navy}">${esc(f.orario)}</text>`);
    out.push(`<text x="${rxc + 46}" y="${fy2 + 25}" font-family="${INTER}" font-weight="600" font-size="10" fill="${K.muted}">${esc(f.label.toUpperCase())}</text>`);
    out.push(`<text x="${rxc + 168}" y="${fy2 + 11}" font-family="${MONT}" font-weight="800" font-size="15.5" fill="${fasceColor[f.level]}">${esc(f.lift)}</text>`);
    out.push(`<text x="${rxc + 168}" y="${fy2 + 25}" font-family="${INTER}" font-weight="600" font-size="10" fill="${K.muted}">QUOTA ${esc(f.quota.toUpperCase())}</text>`);
    out.push(`<text x="${rxc + rw - 22}" y="${fy2 + 17}" text-anchor="end" font-family="${MONT}" font-weight="700" font-size="14" fill="${K.ink}">${esc(f.vento)}</text>`);
    fy2 += 40;
  });
  /* probabilità di pioggia per fascia (griglia 2×2 compatta) */
  out.push(`<line x1="${rxc + 22}" y1="${fy2 - 2}" x2="${rxc + rw - 22}" y2="${fy2 - 2}" stroke="${K.line}" stroke-width="1.4"/>`);
  out.push(`<text x="${rxc + 24}" y="${fy2 + 20}" font-family="${MONT}" font-weight="800" font-size="13" fill="${K.muted}">PIOVE?</text>`);
  const fasciaRain = (from: number, to: number): number => {
    const sel = d.rainBars.filter((b) => {
      const hr = parseInt(b.ora.slice(0, 2), 10);
      return hr >= from && hr < to;
    });
    const vals = sel.map((b) => b.p);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  };
  const rainChips: Array<[string, number]> = [
    ["Mattina", fasciaRain(9, 12)],
    ["Mezzogiorno", fasciaRain(11, 14)],
    ["Pomeriggio", fasciaRain(14, 17)],
    ["Sera", fasciaRain(17, 19)],
  ];
  const chipW = (rw - 52) / 2;
  rainChips.forEach(([lbl, p], i) => {
    const col = p < 20 ? "#1D8F5F" : p < 45 ? "#B97A12" : "#D64545";
    const cxp = rxc + 24 + (i % 2) * (chipW + 6);
    const cyp = fy2 + 30 + Math.floor(i / 2) * 31;
    out.push(`<rect x="${cxp.toFixed(1)}" y="${cyp}" width="${chipW.toFixed(1)}" height="26" rx="13" fill="#F2F6FB" stroke="${col}" stroke-width="1.2"/>`);
    out.push(`<text x="${cxp + 11}" y="${cyp + 17}" font-family="${INTER}" font-weight="700" font-size="11" fill="${K.ink}">${esc(lbl)}</text>`);
    out.push(`<text x="${cxp + chipW - 11}" y="${cyp + 17}" text-anchor="end" font-family="${MONT}" font-weight="800" font-size="12" fill="${col}">${p}%</text>`);
  });

  /* ============ WINDGRAM: il grafico della pagina, identico ============
     Se ReportAICard ha catturato il ProfessionalWindgram reale (stesso
     componente della scheda Venti) usiamo quell'immagine: il poster
     mostra ESATTAMENTE il grafico del sito. In assenza (dati non ancora
     pronti) si usa il grafico ricostruito dagli stessi dati. */
  const wgY = 624;
  const wgH = PAGE_H - wgY - 64;
  if (a.windgramImage) {
    out.push(whitePanel(PAD, wgY, PAGE_W - PAD * 2, wgH, 0.97));
    out.push(`<text x="${PAD + 26}" y="${wgY + 38}" font-family="${MONT}" font-weight="900" font-size="22" fill="${K.navy}">${esc(d.siteName)} · <tspan fill="${K.blueSolid}">${esc(d.dateShort.toLowerCase())}</tspan></text>`);
    out.push(`<text x="${PAGE_W - PAD - 26}" y="${wgY + 38}" text-anchor="end" font-family="${INTER}" font-weight="700" font-size="12.5" letter-spacing="1" fill="${K.muted}">UGUALE ALLA SCHEDA VENTI DEL SITO</text>`);
    out.push(`<text x="${PAD + 26}" y="${wgY + 58}" font-family="${INTER}" font-weight="600" font-size="12.5" fill="${K.muted}">Windgram aerologico · Decollo ${Math.round(d.elevation)} m · Profilo previsto Open-Meteo</text>`);
    const availW = PAGE_W - PAD * 2 - 44;
    const availH = wgH - 80;
    const imgW = Math.min(availW, (availH * 1200) / 1040);
    const imgH = (imgW * 1040) / 1200;
    out.push(`<image href="${a.windgramImage}" x="${((PAGE_W - imgW) / 2).toFixed(1)}" y="${(wgY + 70).toFixed(1)}" width="${imgW.toFixed(1)}" height="${imgH.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`);
  } else {
    out.push(windgramPanel(a, PAD, wgY, PAGE_W - PAD * 2, wgH));
  }

  /* ---- banda finale sottile ---- */
  const footY = PAGE_H - 64;
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="64" fill="${K.blueDark}"/>`);
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="4" fill="${K.gold}"/>`);
  out.push(`<text x="540" y="${footY + 30}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="17.5" fill="#FFFFFF">Affidabilità <tspan fill="${K.gold}">${esc(d.affidabilita)}</tspan> · Previsione elaborata alle ${esc(d.modelUpdate)} · la-meteo-dei-conigli.vercel.app</text>`);
  out.push(`<text x="540" y="${footY + 51}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="11.5" letter-spacing="0.6" fill="rgba(255,255,255,0.72)">${a.windgramImage ? "Il grafico del retro è quello della scheda Venti del sito" : "Windgram ricostruito dagli stessi dati della scheda Venti"} · Foto: Unsplash, Explore Savoie</text>`);

  const svg = pageSvg(out.join("\n"));
  return { svg, width: PAGE_W, height: PAGE_H };
}

/** Involucro SVG comune (font, gradienti, ombre, clip). */
function pageSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}">
  <defs>
    <style>${fontFaceCss(ASSET_CACHE.fonts)}</style>
    <linearGradient id="wingGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2E6FBE"/>
      <stop offset="55%" stop-color="#1C58A5"/>
      <stop offset="100%" stop-color="#0E2E5C"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFE9A6"/>
      <stop offset="45%" stop-color="#F7CE58"/>
      <stop offset="100%" stop-color="#E8A020"/>
    </linearGradient>
    <linearGradient id="thermoGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F7D046"/>
      <stop offset="100%" stop-color="#7FB93C"/>
    </linearGradient>
    <linearGradient id="bgVeil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(10,30,70,0.18)"/>
      <stop offset="22%" stop-color="rgba(10,30,70,0.02)"/>
      <stop offset="100%" stop-color="rgba(10,30,70,0.14)"/>
    </linearGradient>
    <linearGradient id="bgVeilDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(8,24,56,0.45)"/>
      <stop offset="30%" stop-color="rgba(8,24,56,0.30)"/>
      <stop offset="100%" stop-color="rgba(8,24,56,0.42)"/>
    </linearGradient>
    <linearGradient id="fotoVeil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(10,30,70,0)"/>
      <stop offset="100%" stop-color="rgba(10,30,70,0.82)"/>
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="rgba(8,25,60,0.35)"/>
    </filter>
    <filter id="txtShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(8,25,60,0.45)"/>
    </filter>
    <clipPath id="pageClip"><rect x="0" y="0" width="${PAGE_W}" height="${PAGE_H}"/></clipPath>
    <clipPath id="fotoClip"><rect x="${PAD + 28}" y="${290 + 28}" width="330" height="216" rx="16"/></clipPath>
    <clipPath id="pilotaClip"><rect x="42" y="30" width="176" height="124" rx="4"/></clipPath>
  </defs>
  <rect width="${PAGE_W}" height="${PAGE_H}" fill="#0E2A52"/>
  ${body}
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Rasterizzazione + API pubblica                                     */
/* ------------------------------------------------------------------ */
async function rasterize(svg: string, w: number, h: number, outWidth: number, type: "png" | "jpg", quality = 0.9): Promise<Blob> {
  const scale = outWidth / w;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d non disponibile");
  ctx.fillStyle = "#0E2A52";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("raster SVG fallita"));
      img.src = url;
    });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob fallita"))), type === "jpg" ? "image/jpeg" : "image/png", quality);
  });
}

export interface LocandinaBlobOptions {
  /** larghezza del raster in px (default 2480 = 300 dpi esatti su A4, qualità stampa) */
  outWidth?: number;
}

export async function generateLocandinaImageBlob(input: LocandinaInput, type: "png" | "jpg", opts: LocandinaBlobOptions = {}): Promise<Blob> {
  const { blob } = await generateLocandinaRender(input, type, opts.outWidth ?? 2480);
  return blob;
}

/** Genera la locandina rasterizzata insieme alle sue dimensioni logiche (A4). */
export async function generateLocandinaRender(input: LocandinaInput, type: "png" | "jpg", outWidth = 2480): Promise<{ blob: Blob; width: number; height: number }> {
  return renderPage(await prepare(input), buildLocandinaSVG, type, outWidth);
}

/** Genera entrambe le pagine (locandina + informazioni del volo) per il PDF A4.
 *  Default 2480 px di larghezza = 300 DPI sulla pagina A4 (qualità di stampa). */
export async function generateLocandinaPages(input: LocandinaInput, outWidth = 2480): Promise<{ locandina: Blob; informazioni: Blob }> {
  const ctx = await prepare(input);
  const [locandina, informazioni] = await Promise.all([
    renderPage(ctx, buildLocandinaSVG, "jpg", outWidth),
    renderPage(ctx, buildFlightInfoSVG, "jpg", outWidth),
  ]);
  return { locandina: locandina.blob, informazioni: informazioni.blob };
}

type PageBuilder = (a: PageAssets) => { svg: string; width: number; height: number };

async function prepare(input: LocandinaInput): Promise<PageAssets> {
  const assets = await loadLocandinaAssets();
  const data = computeLocandinaData(input);
  return { data, fonts: assets.fonts, bg: assets.bg, valley: assets.valley, windgramImage: input.windgramImage ?? null };
}

async function renderPage(ctx: PageAssets, builder: PageBuilder, type: "png" | "jpg", outWidth: number): Promise<{ blob: Blob; width: number; height: number }> {
  const { svg, width, height } = builder(ctx);
  const quality = type === "jpg" ? 0.93 : undefined;
  const blob = await rasterize(svg, width, height, outWidth, type, quality);
  return { blob, width, height };
}

export function locandinaFilename(siteName: string, date: Date, ext: string): string {
  const slug = siteName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `locandina-${slug}-${day}-${month}-${date.getFullYear()}.${ext}`;
}

/**
 * Formato di scarico UNICO: fronte + retro in una sola immagine (le 2 pagine A4
 * impilate verticalmente con un sottile separatore). Serve per PNG, JPG e WhatsApp:
 * un solo file che mostra entrambe le pagine del report.
 * Safari/WebKit ha un tetto di ~16,7 M pixel per canvas: se serve si riduce
 * appena sotto il limite (prima si prova a piena risoluzione).
 */
export async function combineLocandinaPages(
  top: Blob,
  bottom: Blob,
  type: "image/png" | "image/jpeg" = "image/jpeg",
  quality = 0.93,
): Promise<Blob> {
  const attempt = async (maxArea: number | null): Promise<Blob> => {
    const [a, b] = await Promise.all([createImageBitmap(top), createImageBitmap(bottom)]);
    const gap = Math.round(Math.max(a.width, b.width) * 0.012);
    const fullW = Math.max(a.width, b.width);
    const fullH = a.height + gap + b.height;
    let scale = 1;
    if (maxArea != null && fullW * fullH > maxArea) scale = Math.sqrt(maxArea / (fullW * fullH));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(fullW * scale));
    canvas.height = Math.max(1, Math.round(fullH * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      a.close();
      b.close();
      throw new Error("Canvas 2D non disponibile per combinare le pagine");
    }
    ctx.fillStyle = "#E7EFEA";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const aH = Math.round(a.height * scale);
    ctx.drawImage(a, 0, 0, canvas.width, aH);
    ctx.drawImage(b, 0, aH + Math.round(gap * scale), canvas.width, canvas.height - aH - Math.round(gap * scale));
    a.close();
    b.close();
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((bb) => (bb ? resolve(bb) : reject(new Error("toBlob fallito nella combinazione pagine"))), type, quality),
    );
  };
  try {
    return await attempt(null);
  } catch {
    /* Safari: canvas troppo grande → riprova entro il limite WebKit */
    return await attempt(16_200_000);
  }
}
