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
}

export function computeLocandinaData(input: LocandinaInput): LocandinaData {
  const { siteName, elevation, current, hourly } = input;
  const province = input.province ?? "";
  const dayHours = hourly.filter((h) => h.time instanceof Date && h.time.getHours() >= 9 && h.time.getHours() <= 18);
  const hours = dayHours.length ? dayHours : hourly.slice(0, 12);
  const lapse = 0.0065;

  const dateShort = input.date
    .toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();
  const dateLong = input.date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

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

  /* --- venti alle quote (5 righe, quota decollo → 4000 m) --- */
  const lvSet = new Set<number>([2000, 2500, 3500, 4000].filter((q) => q > elevation));
  lvSet.add(elevation);
  let filler = elevation + 500;
  while (lvSet.size < 5 && filler < 6000) {
    lvSet.add(filler);
    filler += 500;
  }
  const levels = Array.from(lvSet).sort((a, b) => a - b).slice(0, 5);
  const windRows: WindRow[] = levels.map((L) => {
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
    const dir = dd.length ? dirName(dd.slice().sort((a, b) => a - b)[Math.floor(dd.length / 2)]) : "Var";
    return { quota: L, dir, speedMin: lo, speedMax: hi };
  });

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
    ? `${dirName(current.windDir)} ${Math.round(current.windSpeed)} km/h`
    : (() => {
        const h0 = hours[Math.floor(hours.length / 2)];
        return h0 ? `${dirName(h0.windDir)} ${Math.round(h0.windSpeed ?? 0)} km/h` : "—";
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
  };
}

/* ------------------------------------------------------------------ */
/* Asset: font + sfondo fotografico                                   */
/* ------------------------------------------------------------------ */
interface PageAssets {
  data: LocandinaData;
  fonts: LocandinaFonts | null;
  bg: string;
  decollo: string;
  pilota: string;
}

const ASSET_CACHE: { fonts: LocandinaFonts | null; bg: string | null; decollo: string | null; pilota: string | null } = {
  fonts: null, bg: null, decollo: null, pilota: null,
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

export async function loadLocandinaAssets(): Promise<{ fonts: LocandinaFonts | null; bg: string; decollo: string; pilota: string }> {
  if (ASSET_CACHE.fonts && ASSET_CACHE.bg && ASSET_CACHE.decollo && ASSET_CACHE.pilota) {
    return { fonts: ASSET_CACHE.fonts, bg: ASSET_CACHE.bg, decollo: ASSET_CACHE.decollo, pilota: ASSET_CACHE.pilota };
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
  const [bg, decollo, pilota] = await Promise.all([
    imageToJpegDataUrl("/locandine/foto/alpine-bg.jpg", 1080, 0.84),
    imageToJpegDataUrl("/locandine/foto/decollo-parapendio.jpg", 900, 0.82),
    imageToJpegDataUrl("/locandine/foto/parapendio-in-volo.jpg", 560, 0.84),
  ]);
  ASSET_CACHE.bg = bg;
  ASSET_CACHE.decollo = decollo;
  ASSET_CACHE.pilota = pilota;
  return { fonts: ASSET_CACHE.fonts, bg: ASSET_CACHE.bg, decollo: ASSET_CACHE.decollo, pilota: ASSET_CACHE.pilota };
}

/* ------------------------------------------------------------------ */
/* Elementi grafici condivisi                                         */
/* ------------------------------------------------------------------ */
const SHADOW = "url(#dropShadow)";
const TXT_SHADOW = "url(#txtShadow)";

/** Polaroid con la fotografia reale del parapendio (in alto a sinistra). */
function photoBadge(pilota: string): string {
  const pw = 176;
  const ph = 124;
  const px = 42;
  const py = 30;
  return `<g transform="rotate(-4 ${px + pw / 2} ${py + ph / 2})">
    <rect x="${px - 8}" y="${py - 8}" width="${pw + 16}" height="${ph + 16}" rx="8" fill="#FFFFFF" filter="${SHADOW}"/>
    <g clip-path="url(#pilotaClip)"><image href="${pilota}" x="${px}" y="${py}" width="${pw}" height="${ph}" preserveAspectRatio="xMidYMid slice"/></g>
    <text x="${px + pw / 2}" y="${py + ph + 11}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="13" letter-spacing="1" fill="#5A6B7E">PARAPENDIO IN VOLO</text>
  </g>`;
}

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

/** Freccia rossa piena che punta a sinistra (stile riferimento). */
function redArrowLeft(x: number, y: number, w: number, h: number): string {
  const tip = h / 2;
  return `<path transform="translate(${x},${y})" d="M0 ${tip} L${tip * 1.7} 0 L${tip * 1.7} ${h * 0.28} L${w} ${h * 0.28} L${w} ${h * 0.72} L${tip * 1.7} ${h * 0.72} L${tip * 1.7} ${h} Z" fill="#D62828" filter="${TXT_SHADOW}"/>`;
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

/** Pill «Made with AI» in alto a destra. */
function madeWithAI(): string {
  return `<g>
    <rect x="846" y="26" width="206" height="46" rx="23" fill="#FFFFFF" filter="${SHADOW}"/>
    <text x="949" y="56" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="21" fill="#1A1A1A">Made with AI</text>
  </g>`;
}

/** Intestazione comune alle due pagine. */
function header(top1: string, top2: string, dateLine: string, siteTag: string, pilota: string): string {
  const s1 = fitSize(top1, 900, MONT, 66, 44, 900);
  const s2 = fitSize(top2, 900, MONT, 96, 40, 600);
  const out: string[] = [];
  out.push(photoBadge(pilota));
  out.push(`<text x="540" y="${18 + s1}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="${s1}" letter-spacing="2" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(top1)}</text>`);
  out.push(`<text x="540" y="${18 + s1 + 10 + s2}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="${s2}" letter-spacing="1" fill="url(#goldGrad)" filter="${TXT_SHADOW}">${esc(top2)}</text>`);
  out.push(`<text x="540" y="${18 + s1 + 10 + s2 + 46}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="30" letter-spacing="3" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(dateLine)}</text>`);
  if (siteTag) {
    out.push(`<text x="540" y="${18 + s1 + 10 + s2 + 74}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="19" letter-spacing="2" fill="rgba(255,255,255,0.92)" filter="${TXT_SHADOW}">${esc(siteTag)}</text>`);
  }
  out.push(madeWithAI());
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

  /* intestazione */
  const siteTag = d.province ? `${d.province.toUpperCase()} · DECOLLO ${d.elevation} M S.L.M.` : `DECOLLO ${d.elevation} M S.L.M.`;
  out.push(header("REPORT METEO", d.siteName.toUpperCase(), d.dateShort, siteTag, a.pilota));

  /* ---- riga 1: visibilità · zero termico · base cumuli ---- */
  const r1y = 342;
  const p1w = 330;
  out.push(whitePanel(PAD, r1y, p1w, 142));
  out.push(sun(PAD + 40, r1y + 44, 15));
  out.push(`<text x="${PAD + 72}" y="${r1y + 52}" font-family="${MONT}" font-weight="800" font-size="25" fill="${K.navy}">${esc(`Visibilità ${d.visibilita}`)}</text>`);
  out.push(thermometer(PAD + 28, r1y + 78, 46));
  out.push(`<text x="${PAD + 72}" y="${r1y + 112}" font-family="${MONT}" font-weight="800" font-size="25" fill="${K.navy}">${esc(d.tempRange)}</text>`);

  const p2x = PAD + p1w + 20;
  const p2w = 286;
  out.push(whitePanel(p2x, r1y, p2w, 142));
  out.push(thermometer(p2x + p2w / 2 - 11, r1y + 14, 40));
  out.push(`<text x="${p2x + p2w / 2}" y="${r1y + 82}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="23" fill="${K.navy}">Zero Termico</text>`);
  out.push(`<text x="${p2x + p2w / 2}" y="${r1y + 122}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="38" fill="${K.navy}">${esc(d.zeroTermico)}</text>`);

  const p3x = p2x + p2w + 20;
  const p3w = PAGE_W - PAD - p3x;
  out.push(bluePanel(p3x, r1y, p3w, 142));
  out.push(`<text x="${p3x + 22}" y="${r1y + 46}" font-family="${MONT}" font-weight="800" font-size="26" fill="#FFFFFF">Base Cumuli</text>`);
  out.push(`<text x="${p3x + 22}" y="${r1y + 90}" font-family="${MONT}" font-weight="900" font-size="36" fill="#FFFFFF">${esc(d.cumuliBase)}</text>`);
  out.push(`<rect x="${p3x + 12}" y="${r1y + 104}" width="${p3w - 24}" height="28" rx="12" fill="rgba(10,42,86,0.55)"/>`);
  out.push(`<text x="${p3x + p3w / 2}" y="${r1y + 124}" text-anchor="middle" font-family="${MONT}" font-weight="700" font-size="17.5" fill="#FFFFFF">${esc(d.cumuliPomeriggio)}</text>`);

  /* ---- riga 2: termiche (blu) + CAPE / Lifted Index / rischio ---- */
  const r2y = 506;
  const tw = 560;
  out.push(bluePanel(PAD, r2y, tw, 156));
  out.push(`<text x="${PAD + 24}" y="${r2y + 46}" font-family="${MONT}" font-weight="800" font-size="30" fill="${K.gold}">Termiche</text>`);
  out.push(`<text x="${PAD + 24}" y="${r2y + 94}" font-family="${MONT}" font-weight="900" font-size="34" fill="#FFFFFF">${esc(d.termicheWindow)}</text>`);
  out.push(`<text x="${PAD + 24}" y="${r2y + 130}" font-family="${MONT}" font-weight="700" font-size="23" fill="#FFFFFF">${esc(d.termicheQuota)}</text>`);
  out.push(thermalArea(PAD + 306, r2y + 12, tw - 330, 132, d.bestBars));

  const rx = PAD + tw + 24;
  const rw = PAGE_W - PAD - rx;
  out.push(whitePanel(rx, r2y, rw, 92));
  out.push(`<text x="${rx + rw / 2}" y="${r2y + 38}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="26" fill="${K.navy}">CAPE · ${esc(d.cape)}</text>`);
  out.push(`<text x="${rx + rw / 2}" y="${r2y + 74}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="26" fill="${K.navy}">Lifted Index · ${esc(d.liftedIndex)}</text>`);

  const sy = r2y + 106;
  out.push(whitePanel(rx, sy, rw, 50, 0.9));
  out.push(stormCloud(rx + 24, sy + 8, 0.6));
  const rTitle = "Rischio Temporali";
  out.push(`<text x="${rx + 72}" y="${sy + 33}" font-family="${MONT}" font-weight="800" font-size="20" fill="${K.navy}">${esc(rTitle)}</text>`);
  /* i trattini decorativi restano solo se lo spazio lo consente */
  const titleEnd = rx + 72 + textWidth(rTitle, 800, 20, MONT);
  const vFull = `— ${d.rischioTemporali} —`;
  const vShort = d.rischioTemporali;
  const vSize = 26;
  const fullW = textWidth(vFull, 900, vSize, MONT);
  const vText = titleEnd + fullW + 14 <= rx + rw - 20 ? vFull : vShort;
  out.push(`<text x="${rx + rw - 20}" y="${sy + 35}" text-anchor="end" font-family="${MONT}" font-weight="900" font-size="${vSize}" fill="${K.navy}">${esc(vText)}</text>`);

  /* ---- venti (tabella compatta con frecce rosse) ---- */
  const wy = 700;
  out.push(sectionBand(PAD, wy, tw, "Venti"));
  const wh = 52 * d.windRows.length + 16;
  out.push(whitePanel(PAD, wy + 56, tw, wh));
  d.windRows.forEach((w, i) => {
    const ry = wy + 56 + 16 + i * 52;
    if (i > 0) out.push(`<line x1="${PAD + 18}" y1="${ry - 10}" x2="${PAD + tw - 18}" y2="${ry - 10}" stroke="${K.line}" stroke-width="1.4"/>`);
    out.push(`<text x="${PAD + 22}" y="${ry + 20}" font-family="${MONT}" font-weight="800" font-size="23" fill="${K.navy}">${w.quota} m</text>`);
    out.push(`<text x="${PAD + 150}" y="${ry + 20}" font-family="${MONT}" font-weight="800" font-size="21" fill="${K.navy}">${esc(w.dir)}</text>`);
    const speed = w.speedMin === w.speedMax ? `${w.speedMax} km/h` : `${w.speedMin}–${w.speedMax} km/h`;
    out.push(`<text x="${PAD + 236}" y="${ry + 20}" font-family="${MONT}" font-weight="700" font-size="21" fill="${K.ink}">${esc(speed)}</text>`);
    out.push(redArrowLeft(PAD + tw - 84, ry + 2, 58, 18));
  });

  /* ---- finestra di volo ottimale (pannello blu con orologio) ---- */
  const fy = wy;
  const fh = wh + 56;
  out.push(bluePanel(rx, fy, rw, fh));
  const ftitle = "Finestra di Volo Ottimale";
  const fsz = fitSize(ftitle, 800, MONT, 25, 17, rw - 36);
  out.push(`<text x="${rx + rw / 2}" y="${fy + 42}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="${fsz}" fill="${K.gold}">${esc(ftitle)}</text>`);
  out.push(clock(rx + rw / 2, fy + 112, 44, -60, 15));
  out.push(`<rect x="${rx + 28}" y="${fy + 176}" width="${rw - 56}" height="58" rx="12" fill="#FFFFFF" filter="${SHADOW}"/>`);
  out.push(`<text x="${rx + rw / 2}" y="${fy + 216}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="36" fill="${K.red}">${esc(d.finestra)}</text>`);
  out.push(`<text x="${rx + rw / 2}" y="${fy + fh - 56}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="25" fill="#FFFFFF">${esc(d.finestraQuota)}</text>`);
  /* possibilità di cross-country nella finestra di volo */
  const xcLabel = `Cross ${d.cross.verdict} · ${d.cross.km}`;
  const xcSize = fitSize(xcLabel, 800, MONT, 21, 15, rw - 40);
  out.push(`<rect x="${rx + 20}" y="${fy + fh - 42}" width="${rw - 40}" height="34" rx="10" fill="rgba(10,42,86,0.6)"/>`);
  out.push(`<text x="${rx + rw / 2}" y="${fy + fh - 18}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="${xcSize}" fill="${K.gold}">${esc(xcLabel)}</text>`);

  /* ---- turbolenza ---- */
  const ty = wy + fh + 22;
  out.push(sectionBand(PAD, ty, tw, "Turbolenza"));
  const th = 52 * d.turbolenza.length + 16;
  out.push(whitePanel(PAD, ty + 56, tw, th));
  d.turbolenza.forEach((t, i) => {
    const ry = ty + 56 + 16 + i * 52;
    if (i > 0) out.push(`<line x1="${PAD + 18}" y1="${ry - 10}" x2="${PAD + tw - 18}" y2="${ry - 10}" stroke="${K.line}" stroke-width="1.4"/>`);
    out.push(`<text x="${PAD + 22}" y="${ry + 20}" font-family="${MONT}" font-weight="800" font-size="23" fill="${K.navy}">${esc(t.range)}</text>`);
    out.push(`<text x="${PAD + tw - 22}" y="${ry + 20}" text-anchor="end" font-family="${MONT}" font-weight="800" font-size="23" fill="${K.navy}">${esc(t.name)}</text>`);
  });

  /* ---- termiche nelle fasce orarie (colonna destra, sotto la finestra) ---- */
  const fy2 = wy + fh + 22;
  out.push(sectionBand(rx, fy2, rw, "Termiche per fasce orarie"));
  const fRowH = 44;
  const fPanelH = 16 + fRowH * d.fasceTermiche.length;
  out.push(whitePanel(rx, fy2 + 56, rw, fPanelH));
  const fasceColor: Record<FasciaTermica["level"], string> = { good: "#2E7D32", mid: "#B97A12", weak: "#A34E44" };
  d.fasceTermiche.forEach((f, i) => {
    const ry = fy2 + 56 + 16 + i * fRowH;
    if (i > 0) out.push(`<line x1="${rx + 18}" y1="${ry - 8}" x2="${rx + rw - 18}" y2="${ry - 8}" stroke="${K.line}" stroke-width="1.4"/>`);
    out.push(`<circle cx="${rx + 28}" cy="${ry + 14}" r="7" fill="${fasceColor[f.level]}"/>`);
    out.push(`<text x="${rx + 44}" y="${ry + 20}" font-family="${MONT}" font-weight="800" font-size="19" fill="${K.navy}">${esc(f.orario)}</text>`);
    out.push(`<text x="${rx + 44}" y="${ry + 38}" font-family="${INTER}" font-weight="600" font-size="13" fill="${K.muted}">${esc(f.label.toUpperCase())}</text>`);
    out.push(`<text x="${rx + 170}" y="${ry + 20}" font-family="${MONT}" font-weight="800" font-size="19" fill="${fasceColor[f.level]}">${esc(f.lift)}</text>`);
    out.push(`<text x="${rx + 170}" y="${ry + 38}" font-family="${INTER}" font-weight="600" font-size="13" fill="${K.muted}">QUOTA ${esc(f.quota.toUpperCase())}</text>`);
    out.push(`<text x="${rx + rw - 22}" y="${ry + 26}" text-anchor="end" font-family="${MONT}" font-weight="700" font-size="17" fill="${K.ink}">${esc(f.vento)}</text>`);
  });

  /* ---- banda finale: sintesi + affidabilità ---- */
  const footY = PAGE_H - 168;
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="168" fill="${K.blueDark}" filter="${SHADOW}"/>`);
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="4" fill="${K.gold}"/>`);
  const sumSize = fitSize(d.summary, 800, MONT, 40, 26, 1000);
  out.push(`<text x="540" y="${footY + 72}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="${sumSize}" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(d.summary)}</text>`);
  out.push(`<text x="540" y="${footY + 122}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="29" fill="#FFFFFF" filter="${TXT_SHADOW}">Affidabilità <tspan fill="${K.gold}">${esc(d.affidabilita)}</tspan></text>`);
  out.push(`<text x="540" y="${PAGE_H - 14}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="15" letter-spacing="1" fill="rgba(255,255,255,0.75)">la-meteo-dei-conigli.vercel.app</text>`);

  const svg = pageSvg(out.join("\n"));
  return { svg, width: PAGE_W, height: PAGE_H };
}

/* ------------------------------------------------------------------ */
/* PAGINA 2 — Informazioni del volo                                   */
/* ------------------------------------------------------------------ */
export function buildFlightInfoSVG(a: PageAssets): { svg: string; width: number; height: number } {
  const d = a.data;
  const out: string[] = [];

  /* sfondo fotografico con velo più scuro */
  out.push(`<g clip-path="url(#pageClip)">
    <image href="${a.bg}" x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" preserveAspectRatio="xMidYMid slice"/>
    <rect x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" fill="url(#bgVeilDark)"/>
  </g>`);

  const siteTag = d.province ? `${d.province.toUpperCase()} · DECOLLO ${d.elevation} M S.L.M.` : `DECOLLO ${d.elevation} M S.L.M.`;
  out.push(header("INFORMAZIONI", "DEL VOLO", d.dateShort, siteTag, a.pilota));

  /* grande pannello contenuto */
  const py = 290;
  const ph = 1062;
  out.push(whitePanel(PAD, py, PAGE_W - PAD * 2, ph, 0.96));
  const ix = PAD + 28;
  const iw = PAGE_W - PAD * 2 - 56;

  /* foto decollo + primi dati */
  const photoW = 330;
  const photoH = 216;
  out.push(`<g clip-path="url(#fotoClip)"><image href="${a.decollo}" x="${ix}" y="${py + 28}" width="${photoW}" height="${photoH}" preserveAspectRatio="xMidYMid slice"/></g>`);
  out.push(`<rect x="${ix}" y="${py + 28 + photoH - 46}" width="${photoW}" height="46" fill="url(#fotoVeil)"/>`);
  out.push(`<text x="${ix + 14}" y="${py + 28 + photoH - 16}" font-family="${MONT}" font-weight="800" font-size="19" fill="#FFFFFF">Decollo ${esc(d.siteName)}</text>`);

  const gx = ix + photoW + 40;
  const colW = (ix + iw - gx) / 2;
  const gRows: Array<[string, string]> = [
    ["Alba", d.alba],
    ["Tramonto", d.tramonto],
    ["Finestra consigliata", d.finestra],
    ["Quota di lavoro", d.termicheQuota.replace(/^Quota /, "")],
    ["Zero termico", d.zeroTermico],
    ["Base cumuli", d.cumuliBase],
    ["Vento a decollo", d.ventoDecollo],
    ["Raffiche massime", d.raffiche],
  ];
  gRows.forEach(([k, v], i) => {
    const cx = gx + (i % 2) * colW;
    const cy = py + 60 + Math.floor(i / 2) * 64;
    out.push(kv(cx, cy, k, v, 24));
  });

  /* separatore + aerologia e sicurezza */
  let y = py + 300;
  out.push(`<line x1="${ix}" y1="${y}" x2="${ix + iw}" y2="${y}" stroke="${K.line}" stroke-width="2"/>`);
  out.push(`<text x="${ix}" y="${y + 40}" font-family="${MONT}" font-weight="800" font-size="22" letter-spacing="2" fill="${K.blueSolid}">AEROLOGIA E SICUREZZA</text>`);
  const aRows: Array<[string, string]> = [
    ["Temperatura", d.tempRange],
    ["Visibilità", d.visibilita],
    ["QNH", d.qnh],
    ["Umidità", d.umidita],
    ["Indice UV max", d.uv],
    ["CAPE", d.cape],
    ["Lifted Index", d.liftedIndex],
    ["Rischio temporali", d.rischioTemporali],
    ["Turbolenza in quota", `${d.turbolenza[0].name} → ${d.turbolenza[2].name}`],
  ];
  const acolW = iw / 3;
  aRows.forEach(([k, v], i) => {
    const cx = ix + (i % 3) * acolW;
    const cy = y + 84 + Math.floor(i / 3) * 66;
    out.push(kv(cx, cy, k, v, 21));
  });

  /* separatore + cosa troverai in volo */
  y = py + 546;
  out.push(`<line x1="${ix}" y1="${y}" x2="${ix + iw}" y2="${y}" stroke="${K.line}" stroke-width="2"/>`);
  out.push(`<text x="${ix}" y="${y + 40}" font-family="${MONT}" font-weight="800" font-size="22" letter-spacing="2" fill="${K.blueSolid}">COSA TROVERAI IN VOLO</text>`);
  const bcolW = iw / 2;
  d.inVolo.slice(0, 6).forEach((item, i) => {
    const cx = ix + (i % 2) * bcolW;
    const cy = y + 82 + Math.floor(i / 2) * 42;
    out.push(`<circle cx="${cx + 8}" cy="${cy - 7}" r="11" fill="${K.blueSolid}"/>`);
    out.push(`<path d="M ${cx + 2.5} ${cy - 7} l 3.8 4 l 7.5 -8" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    const lines = wrapText(item, 600, 19.5, INTER, bcolW - 44);
    out.push(`<text x="${cx + 30}" y="${cy}" font-family="${INTER}" font-weight="600" font-size="19.5" fill="${K.ink}">${esc(lines[0])}</text>`);
    if (lines[1]) out.push(`<text x="${cx + 30}" y="${cy + 25}" font-family="${INTER}" font-weight="600" font-size="19.5" fill="${K.ink}">${esc(lines[1])}</text>`);
  });

  /* separatore + valutazione della giornata */
  y = py + 758;
  out.push(`<line x1="${ix}" y1="${y}" x2="${ix + iw}" y2="${y}" stroke="${K.line}" stroke-width="2"/>`);
  out.push(`<text x="${ix}" y="${y + 40}" font-family="${MONT}" font-weight="800" font-size="22" letter-spacing="2" fill="${K.blueSolid}">VALUTAZIONE DELLA GIORNATA</text>`);
  const semColor = d.semaforo === "GO" ? "#1D8F5F" : d.semaforo === "ATTENZIONE" ? "#D97A2B" : "#A34E44";
  const semW = textWidth(d.semaforo, 900, 30, MONT) + 48;
  out.push(`<rect x="${ix + iw - semW}" y="${y + 14}" width="${semW}" height="46" rx="23" fill="${semColor}" filter="${SHADOW}"/>`);
  out.push(`<text x="${ix + iw - semW / 2}" y="${y + 45}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="30" fill="#FFFFFF">${esc(d.semaforo)}</text>`);
  const chips: Array<[string, string, string]> = [
    ["Volabile", `${d.probabilities.flyable}%`, K.blueSolid],
    ["Termiche", `${d.probabilities.thermal}%`, "#B97A12"],
    ["Vento favorevole", `${d.probabilities.wind}%`, K.blueSolid],
    ["Temporali", `${d.probabilities.storm}%`, semColor],
    ["Possibilità cross", d.cross.km === "—" ? d.cross.verdict : `${d.cross.km}`, semColor],
  ];
  const chipW = (iw - 80) / 5;
  chips.forEach(([label, value, color], i) => {
    out.push(statChip(ix + i * (chipW + 20), y + 78, chipW, label, value, color));
  });

  /* nota del pilota */
  y = py + 758 + 176;
  out.push(`<line x1="${ix}" y1="${y}" x2="${ix + iw}" y2="${y}" stroke="${K.line}" stroke-width="2"/>`);
  out.push(`<text x="${ix}" y="${y + 36}" font-family="${MONT}" font-weight="800" font-size="20" letter-spacing="2" fill="${K.blueSolid}">NOTA DEL PILOTA</text>`);
  const noteAll = wrapText(d.notaPilota, 400, 18.5, INTER, iw - 20);
  const noteLines = noteAll.slice(0, 3);
  if (noteAll.length > 3 && noteLines[2]) noteLines[2] = noteLines[2].replace(/[.,;:]?\s*$/, "…");
  noteLines.forEach((ln, i) => {
    out.push(`<text x="${ix}" y="${y + 66 + i * 27}" font-family="${INTER}" font-weight="400" font-size="18.5" fill="${K.ink}">${esc(ln)}</text>`);
  });

  /* banda finale */
  const footY = PAGE_H - 168;
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="168" fill="${K.blueDark}" filter="${SHADOW}"/>`);
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="4" fill="${K.gold}"/>`);
  const sumSize = fitSize(d.summary, 800, MONT, 40, 26, 1000);
  out.push(`<text x="540" y="${footY + 72}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="${sumSize}" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(d.summary)}</text>`);
  out.push(`<text x="540" y="${footY + 122}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="29" fill="#FFFFFF" filter="${TXT_SHADOW}">Affidabilità <tspan fill="${K.gold}">${esc(d.affidabilita)}</tspan></text>`);
  out.push(`<text x="540" y="${PAGE_H - 14}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="15" letter-spacing="1" fill="rgba(255,255,255,0.75)">la-meteo-dei-conigli.vercel.app</text>`);

  const svg = pageSvg(out.join("\n"));
  return { svg, width: PAGE_W, height: PAGE_H };
}

/** Involucro SVG comune (font, gradienti, ombre, clip). */
function pageSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}">
  <defs>
    <style>${fontFaceCss(ASSET_CACHE.fonts)}</style>
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
  /** larghezza del raster in px (default 1620 ≈ 196 dpi su A4) */
  outWidth?: number;
}

export async function generateLocandinaImageBlob(input: LocandinaInput, type: "png" | "jpg", opts: LocandinaBlobOptions = {}): Promise<Blob> {
  const { blob } = await generateLocandinaRender(input, type, opts.outWidth ?? 1620);
  return blob;
}

/** Genera la locandina rasterizzata insieme alle sue dimensioni logiche (A4). */
export async function generateLocandinaRender(input: LocandinaInput, type: "png" | "jpg", outWidth = 1620): Promise<{ blob: Blob; width: number; height: number }> {
  return renderPage(await prepare(input), buildLocandinaSVG, type, outWidth);
}

/** Genera entrambe le pagine (locandina + informazioni del volo) per il PDF A4. */
export async function generateLocandinaPages(input: LocandinaInput, outWidth = 1620): Promise<{ locandina: Blob; informazioni: Blob }> {
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
  return { data, fonts: assets.fonts, bg: assets.bg, decollo: assets.decollo, pilota: assets.pilota };
}

async function renderPage(ctx: PageAssets, builder: PageBuilder, type: "png" | "jpg", outWidth: number): Promise<{ blob: Blob; width: number; height: number }> {
  const { svg, width, height } = builder(ctx);
  const quality = type === "jpg" ? 0.88 : undefined;
  const blob = await rasterize(svg, width, height, outWidth, type, quality);
  return { blob, width, height };
}

export function locandinaFilename(siteName: string, date: Date, ext: string): string {
  const slug = siteName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `locandina-${slug}-${day}-${month}-${date.getFullYear()}.${ext}`;
}
