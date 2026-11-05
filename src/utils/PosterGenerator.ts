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
  /** Verdetto meteo «se piove o se dà bello» per il template parapendio. */
  tempo: { verdict: "BELLO" | "PIOVE" | "INCERTO"; sub: string; icon: "sun" | "cloud" | "rain" };
  /** Probabilità di pioggia per fascia oraria (grafico retro). */
  rainBars: Array<{ ora: string; p: number }>;
  /** Dati del windgram (pagina retro, stile Alpium). */
  windgram: WindgramData | null;
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

  /* --- probabilità di pioggia per fascia oraria (grafico retro) --- */
  const rainBars: Array<{ ora: string; p: number }> = hours
    .filter((_, i) => i % 2 === 0)
    .map((h) => ({ ora: hh(h.time.getHours()), p: Math.round(h.precipitationProbability ?? 0) }));

  /* --- windgram stile Alpium --- */
  const windgram = computeWindgram(input, hourly, elevation);

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
    tempo,
    rainBars,
    windgram,
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

  /* quote min/max del grafico */
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

/** Anemometro stilizzato (vento a terra). */
function gaugeIcon(x: number, y: number, s: number): string {
  const k = s / 44;
  return `<g transform="translate(${x},${y}) scale(${k})">
    <circle cx="22" cy="22" r="17" fill="#FFFFFF" stroke="#9AA7B5" stroke-width="2.4"/>
    <path d="M22 22 L22 9 M22 22 L32 28" stroke="#1C58A5" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="22" cy="22" r="3" fill="#D62828"/>
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
  const headH = 56;
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

  /* --- testata: temperature e sole per ora --- */
  out.push(`<rect x="${plotX}" y="${Y + titleH}" width="${plotW}" height="${headH}" fill="rgba(30,41,59,0.9)"/>`);
  wg.hours.forEach((hr, i) => {
    const x = colX(i);
    const t = wg.headerTemps[i];
    const cloud = wg.headerCloud[i] ?? 0;
    const tCol = t == null ? "#94a3b8" : t >= 25 ? "#ef4444" : t >= 18 ? "#f97316" : "#e2e8f0";
    out.push(`<text x="${x}" y="${Y + titleH + 20}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="16" fill="${tCol}">${t != null ? t.toFixed(0) + "°" : "—"}</text>`);
    out.push(miniSun(x - 7, Y + titleH + 38, 5.5, 1 - (cloud / 100) * 0.8));
    out.push(`<text x="${x}" y="${Y + titleH + 52}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="10.5" fill="#8ea0b8">${Math.round(100 - cloud)}% sole</text>`);
  });

  /* --- fondo: celle di stabilità --- */
  const colW = plotW / nH;
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

  /* --- frecce del vento (direzione del flusso, colore = intensità) --- */
  for (const ar of wg.arrows) {
    const x = colX(ar.h);
    const y = altToY(ar.alt);
    const rot = (ar.dir + 180) % 360;
    const color = windgramSpeedColor(ar.speed);
    out.push(`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(0)})">
      <line x1="-9" y1="0" x2="5" y2="0" stroke="${color}" stroke-width="1.5"/>
      <polygon points="5,-3.4 10.5,0 5,3.4" fill="${color}"/>
      <line x1="-12.5" y1="0" x2="-9" y2="0" stroke="${color}" stroke-width="1.2"/>
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

  /* intestazione */
  const siteTag = d.province ? `${d.province.toUpperCase()} · DECOLLO ${d.elevation} M S.L.M.` : `DECOLLO ${d.elevation} M S.L.M.`;
  out.push(header("REPORT METEO", d.siteName.toUpperCase(), d.dateShort, siteTag, a.pilota));

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
  const semW = textWidth(d.semaforo, 900, 30, MONT) + 46;
  out.push(`<rect x="${vrx + 24}" y="${vy + 52}" width="${semW}" height="48" rx="24" fill="#FFFFFF" filter="${SHADOW}"/>`);
  out.push(`<text x="${vrx + 24 + semW / 2}" y="${vy + 84}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="30" fill="${K.navy}">${esc(d.semaforo)}</text>`);
  out.push(`<text x="${vrx + 24 + semW + 18}" y="${vy + 72}" font-family="${MONT}" font-weight="800" font-size="21" fill="#FFFFFF">Volabile ${d.probabilities.flyable}%</text>`);
  out.push(`<text x="${vrx + 24 + semW + 18}" y="${vy + 96}" font-family="${MONT}" font-weight="800" font-size="21" fill="#FFFFFF">Temporali ${esc(d.rischioTemporali)}</text>`);
  out.push(`<text x="${vrx + 24}" y="${vy + 128}" font-family="${INTER}" font-weight="600" font-size="15.5" fill="rgba(255,255,255,0.85)">Termiche ${d.probabilities.thermal}% · Vento favorevole ${d.probabilities.wind}%</text>`);

  /* ============ TEMPLATE PARAPENDIO ============ */
  const cx = PAGE_W / 2;
  const wingApex = 520;
  const tipDrop = 128;
  const halfSpan = 418;
  const wingL = cx - halfSpan;
  const wingR = cx + halfSpan;
  const tipY = wingApex + tipDrop;
  const ctrlY = 2 * wingApex - tipY;
  const depth = 60;

  const qPoint = (t: number, drop: number): [number, number] => {
    const x = (1 - t) * (1 - t) * wingL + 2 * (1 - t) * t * cx + t * t * wingR;
    const c = 2 * (wingApex + drop) - (tipY + drop);
    const y = (1 - t) * (1 - t) * (tipY + drop) + 2 * (1 - t) * t * c + t * t * (tipY + drop);
    return [x, y];
  };
  /* velo (canopy) */
  out.push(`<path d="M ${wingL} ${tipY} Q ${cx} ${ctrlY} ${wingR} ${tipY} L ${wingR} ${tipY + depth} Q ${cx} ${ctrlY + depth + 30} ${wingL} ${tipY + depth} Z" fill="url(#wingGrad)" filter="${SHADOW}"/>`);
  /* celle */
  const RIBS = 26;
  const ribPts: Array<[number, number]> = [];
  for (let i = 0; i <= RIBS; i++) {
    const t = i / RIBS;
    const [tx, ty] = qPoint(t, 0);
    const [, by] = qPoint(t, depth);
    ribPts.push([tx, by]);
    if (i > 0 && i < RIBS) {
      out.push(`<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="rgba(255,255,255,0.34)" stroke-width="1.1"/>`);
    }
  }
  /* profilo d'attacco in evidenza */
  out.push(`<path d="M ${wingL} ${tipY} Q ${cx} ${ctrlY} ${wingR} ${tipY}" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.85"/>`);
  /* punte oro */
  {
    const [ltx, lty] = qPoint(0, 0);
    const [, lby] = qPoint(0, depth);
    out.push(`<path d="M ${ltx} ${lty} L ${ltx} ${lby} L ${ltx + 62} ${lby - 2} Q ${ltx + 34} ${(lty + lby) / 2} ${ltx} ${lty} Z" fill="${K.goldDeep}" opacity="0.92"/>`);
    const [rtx, rty] = qPoint(1, 0);
    const [, rby] = qPoint(1, depth);
    out.push(`<path d="M ${rtx} ${rty} L ${rtx} ${rby} L ${rtx - 62} ${rby - 2} Q ${rtx - 34} ${(rty + rby) / 2} ${rtx} ${rty} Z" fill="${K.goldDeep}" opacity="0.92"/>`);
  }
  /* nome del decollo sul velo */
  out.push(`<text x="${cx}" y="${wingApex + 40}" text-anchor="middle" font-family="${MONT}" font-weight="900" font-size="38" letter-spacing="4" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(d.siteName.toUpperCase())}</text>`);

  /* sospensioni: dalle celle ai raggianti */
  const riserY = 884;
  const riserLx = cx - 30;
  const riserRx = cx + 30;
  for (let i = 3; i <= RIBS - 3; i++) {
    const [px, py] = ribPts[i];
    const target = px < cx ? riserLx : riserRx;
    out.push(`<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${target}" y2="${riserY}" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>`);
  }

  /* tre strumenti «appesi» alle sospensioni */
  const podY1 = 742;
  const hangPod = (podX: number, icon: "therm" | "wind" | "term", label: string, value: string) => {
    out.push(`<rect x="${podX}" y="${podY1}" width="236" height="82" rx="16" fill="rgba(255,255,255,0.97)" filter="${SHADOW}"/>`);
    if (icon === "therm") out.push(thermometer(podX + 22, podY1 + 14, 40));
    else if (icon === "wind") out.push(gaugeIcon(podX + 20, podY1 + 18, 40));
    else out.push(sun(podX + 22, podY1 + 20, 17));
    out.push(`<text x="${podX + 74}" y="${podY1 + 32}" font-family="${INTER}" font-weight="700" font-size="12.5" letter-spacing="1.4" fill="${K.muted}">${esc(label.toUpperCase())}</text>`);
    const vsz = fitSize(value, 800, MONT, 27, 17, 236 - 88);
    out.push(`<text x="${podX + 74}" y="${podY1 + 64}" font-family="${MONT}" font-weight="800" font-size="${vsz}" fill="${K.navy}">${esc(value)}</text>`);
  };
  hangPod(cx - 370, "therm", "Temperatura", d.tempRange);
  hangPod(cx - 118, "wind", "Vento a terra", d.ventoDecollo);
  hangPod(cx + 134, "term", "Termiche", d.termicheWindow);
  /* cordini di sospensione dei pod */
  for (const [px, tPar] of [[cx - 252, 0.2], [cx, 0.5], [cx + 252, 0.8]] as const) {
    const [, py] = qPoint(tPar, depth);
    out.push(`<line x1="${px}" y1="${py.toFixed(1)}" x2="${px}" y2="${podY1}" stroke="rgba(255,255,255,0.55)" stroke-width="1.2"/>`);
  }

  /* pilota in volo */
  out.push(`<rect x="${riserLx - 5}" y="${riserY}" width="10" height="14" rx="4" fill="#1B2A4A"/>`);
  out.push(`<rect x="${riserRx - 5}" y="${riserY}" width="10" height="14" rx="4" fill="#1B2A4A"/>`);
  out.push(`<path d="M ${riserLx - 4} ${riserY + 14} L ${cx - 12} ${riserY + 34}" stroke="#1B2A4A" stroke-width="5" stroke-linecap="round"/>`);
  out.push(`<path d="M ${riserRx + 4} ${riserY + 14} L ${cx + 12} ${riserY + 34}" stroke="#1B2A4A" stroke-width="5" stroke-linecap="round"/>`);
  out.push(`<circle cx="${cx}" cy="${riserY + 48}" r="14" fill="#1B2A4A"/>`);
  out.push(`<path d="M ${cx - 13.5} ${riserY + 43} a 13.5 13.5 0 0 1 27 0 Z" fill="${K.goldDeep}"/>`);
  out.push(`<path d="M ${cx - 17} ${riserY + 66} Q ${cx - 20} ${riserY + 96} ${cx - 8} ${riserY + 104} L ${cx + 10} ${riserY + 104} Q ${cx + 19} ${riserY + 94} ${cx + 16} ${riserY + 66} Q ${cx} ${riserY + 58} ${cx - 17} ${riserY + 66} Z" fill="#1B2A4A"/>`);
  out.push(`<path d="M ${cx - 8} ${riserY + 104} L ${cx - 20} ${riserY + 122} L ${cx - 12} ${riserY + 126} L ${cx + 2} ${riserY + 108} Z" fill="#1B2A4A"/>`);
  out.push(`<path d="M ${cx + 10} ${riserY + 104} L ${cx + 22} ${riserY + 120} L ${cx + 30} ${riserY + 114} L ${cx + 16} ${riserY + 100} Z" fill="#1B2A4A"/>`);
  out.push(`<ellipse cx="${cx}" cy="${riserY + 142}" rx="86" ry="11" fill="rgba(10,25,55,0.30)"/>`);

  /* ============ RIGA DATI: zero · cumuli · visibilità ============ */
  const sy2 = 1044;
  const sh2 = 128;
  const cw = (PAGE_W - PAD * 2 - 40) / 3;
  out.push(whitePanel(PAD, sy2, cw, sh2));
  out.push(thermometer(PAD + 24, sy2 + 22, 36));
  out.push(`<text x="${PAD + 72}" y="${sy2 + 38}" font-family="${INTER}" font-weight="700" font-size="13.5" letter-spacing="1.4" fill="${K.muted}">ZERO TERMICO</text>`);
  out.push(`<text x="${PAD + 24}" y="${sy2 + 86}" font-family="${MONT}" font-weight="900" font-size="34" fill="${K.navy}">${esc(d.zeroTermico)}</text>`);
  out.push(`<text x="${PAD + 24}" y="${sy2 + 112}" font-family="${INTER}" font-weight="600" font-size="13.5" fill="${K.muted}">Temperatura ${esc(d.tempRange)}</text>`);

  const s2x = PAD + cw + 20;
  out.push(whitePanel(s2x, sy2, cw, sh2));
  out.push(stormCloud(s2x + 24, sy2 + 18, 0.62));
  out.push(`<text x="${s2x + 72}" y="${sy2 + 38}" font-family="${INTER}" font-weight="700" font-size="13.5" letter-spacing="1.4" fill="${K.muted}">BASE CUMULI</text>`);
  const cbSize = fitSize(d.cumuliBase, 900, MONT, 30, 19, cw - 46);
  out.push(`<text x="${s2x + 24}" y="${sy2 + 84}" font-family="${MONT}" font-weight="900" font-size="${cbSize}" fill="${K.navy}">${esc(d.cumuliBase)}</text>`);
  out.push(`<text x="${s2x + 24}" y="${sy2 + 110}" font-family="${INTER}" font-weight="600" font-size="13.5" fill="${K.muted}">${esc(d.cumuliPomeriggio)}</text>`);

  const s3x = s2x + cw + 20;
  const s3w = PAGE_W - PAD - s3x;
  out.push(bluePanel(s3x, sy2, s3w, sh2));
  out.push(eyeIcon(s3x + 24, sy2 + 24, 38));
  out.push(`<text x="${s3x + 74}" y="${sy2 + 38}" font-family="${INTER}" font-weight="700" font-size="13.5" letter-spacing="1.4" fill="rgba(255,255,255,0.8)">VISIBILITÀ</text>`);
  out.push(`<text x="${s3x + 24}" y="${sy2 + 86}" font-family="${MONT}" font-weight="900" font-size="34" fill="#FFFFFF">${esc(d.visibilita)}</text>`);
  out.push(`<text x="${s3x + 24}" y="${sy2 + 112}" font-family="${INTER}" font-weight="600" font-size="13.5" fill="rgba(255,255,255,0.85)">Raffiche max ${esc(d.raffiche)}</text>`);

  /* ============ FINESTRA DI VOLO (full width) ============ */
  const fy = 1192;
  const fh = 146;
  out.push(bluePanel(PAD, fy, PAGE_W - PAD * 2, fh));
  out.push(clock(PAD + 92, fy + 76, 46, -60, 15));
  out.push(`<text x="${PAD + 178}" y="${fy + 40}" font-family="${MONT}" font-weight="800" font-size="18" letter-spacing="2" fill="${K.gold}">FINESTRA DI VOLO OTTIMALE</text>`);
  out.push(`<text x="${PAD + 178}" y="${fy + 100}" font-family="${MONT}" font-weight="900" font-size="56" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(d.finestra)}</text>`);
  out.push(`<text x="${PAD + 178}" y="${fy + 130}" font-family="${MONT}" font-weight="800" font-size="21" fill="#FFFFFF">${esc(d.finestraQuota)}</text>`);
  const rx2 = PAGE_W - PAD - 350;
  out.push(`<line x1="${rx2 - 26}" y1="${fy + 22}" x2="${rx2 - 26}" y2="${fy + fh - 22}" stroke="rgba(255,255,255,0.35)" stroke-width="1.4"/>`);
  out.push(`<text x="${rx2}" y="${fy + 42}" font-family="${INTER}" font-weight="700" font-size="14.5" fill="rgba(255,255,255,0.85)">CAPE ${esc(d.cape)} · Lifted Index ${esc(d.liftedIndex)}</text>`);
  const xcLabel = `Cross: ${d.cross.verdict}${d.cross.km !== "—" ? ` · ${d.cross.km}` : ""}`;
  const xcW = Math.max(textWidth(xcLabel, 800, 21, MONT) + 30, 250);
  out.push(`<rect x="${rx2}" y="${fy + 58}" width="${xcW}" height="40" rx="12" fill="rgba(255,211,77,0.95)" filter="${SHADOW}"/>`);
  out.push(`<text x="${rx2 + 15}" y="${fy + 85}" font-family="${MONT}" font-weight="800" font-size="21" fill="${K.navy}">${esc(xcLabel)}</text>`);
  const noteLines = wrapText(d.cross.note, 600, 13.5, INTER, 330).slice(0, 2);
  if (wrapText(d.cross.note, 600, 13.5, INTER, 330).length > 2 && noteLines[1]) noteLines[1] = noteLines[1].replace(/[.,;:]?\s*$/, "…");
  noteLines.forEach((ln, i) => {
    out.push(`<text x="${rx2}" y="${fy + 120 + i * 18}" font-family="${INTER}" font-weight="600" font-size="13.5" fill="rgba(255,255,255,0.8)">${esc(ln)}</text>`);
  });

  /* ---- banda finale: sintesi + affidabilità ---- */
  const footY = PAGE_H - 168;
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="168" fill="${K.blueDark}" filter="${SHADOW}"/>`);
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="4" fill="${K.gold}"/>`);
  const sumSize = fitSize(d.summary, 800, MONT, 40, 26, 1000);
  out.push(`<text x="540" y="${footY + 72}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="${sumSize}" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(d.summary)}</text>`);
  out.push(`<text x="540" y="${footY + 122}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="29" fill="#FFFFFF" filter="${TXT_SHADOW}">Affidabilità <tspan fill="${K.gold}">${esc(d.affidabilita)}</tspan></text>`);
  out.push(`<text x="540" y="${PAGE_H - 14}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="15" letter-spacing="1" fill="rgba(255,255,255,0.75)">la-meteo-dei-conigli.vercel.app · Retro: report giornaliero + windgram</text>`);

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
  out.push(header("REPORT", "GIORNALIERO", d.dateShort, siteTag, a.pilota));

  /* ============ REPORT IN TESTO + TERMICHE/TURBOLENZA ============ */
  const py = 300;
  const ph = 372;
  const lw = 560;
  const rxc = PAD + lw + 20;
  const rw = PAGE_W - PAD - rxc;

  /* --- il giorno in parole (report completo in testo) --- */
  out.push(whitePanel(PAD, py, lw, ph, 0.97));
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
  /* se piove? probabilità per fasce (subito dopo il testo) */
  const chipY = Math.min(ry + 12, py + ph - 34);
  out.push(`<text x="${PAD + 26}" y="${chipY + 4}" font-family="${MONT}" font-weight="800" font-size="16" fill="${K.muted}">PIOVE?</text>`);
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
  let rcx = PAD + 26;
  for (const [lbl, p] of rainChips) {
    const col = p < 20 ? "#1D8F5F" : p < 45 ? "#B97A12" : "#D64545";
    const chipW = Math.max(104, textWidth(lbl, 700, 13, INTER) + 60);
    out.push(`<rect x="${rcx}" y="${chipY - 18}" width="${chipW}" height="30" rx="15" fill="#F2F6FB" stroke="${col}" stroke-width="1.4"/>`);
    out.push(`<text x="${rcx + 14}" y="${chipY + 2}" font-family="${INTER}" font-weight="700" font-size="13" fill="${K.ink}">${esc(lbl)}</text>`);
    out.push(`<text x="${rcx + chipW - 14}" y="${chipY + 2}" text-anchor="end" font-family="${MONT}" font-weight="800" font-size="14" fill="${col}">${p}%</text>`);
    rcx += chipW + 12;
  }

  /* --- termiche per fasce orarie + turbolenza --- */
  out.push(whitePanel(rxc, py, rw, ph, 0.97));
  out.push(`<text x="${rxc + 24}" y="${py + 42}" font-family="${MONT}" font-weight="800" font-size="20" letter-spacing="1.6" fill="${K.blueSolid}">TERMICHE PER FASCIA ORARIA</text>`);
  const fasceColor: Record<FasciaTermica["level"], string> = { good: "#2E7D32", mid: "#B97A12", weak: "#A34E44" };
  let fy2 = py + 66;
  d.fasceTermiche.forEach((f, i) => {
    if (i > 0) out.push(`<line x1="${rxc + 22}" y1="${fy2 - 6}" x2="${rxc + rw - 22}" y2="${fy2 - 6}" stroke="${K.line}" stroke-width="1.2"/>`);
    out.push(`<circle cx="${rxc + 30}" cy="${fy2 + 8}" r="6.5" fill="${fasceColor[f.level]}"/>`);
    out.push(`<text x="${rxc + 46}" y="${fy2 + 13}" font-family="${MONT}" font-weight="800" font-size="17.5" fill="${K.navy}">${esc(f.orario)}</text>`);
    out.push(`<text x="${rxc + 46}" y="${fy2 + 30}" font-family="${INTER}" font-weight="600" font-size="11.5" fill="${K.muted}">${esc(f.label.toUpperCase())}</text>`);
    out.push(`<text x="${rxc + 168}" y="${fy2 + 13}" font-family="${MONT}" font-weight="800" font-size="17" fill="${fasceColor[f.level]}">${esc(f.lift)}</text>`);
    out.push(`<text x="${rxc + 168}" y="${fy2 + 30}" font-family="${INTER}" font-weight="600" font-size="11.5" fill="${K.muted}">QUOTA ${esc(f.quota.toUpperCase())}</text>`);
    out.push(`<text x="${rxc + rw - 22}" y="${fy2 + 20}" text-anchor="end" font-family="${MONT}" font-weight="700" font-size="15.5" fill="${K.ink}">${esc(f.vento)}</text>`);
    fy2 += 46;
  });
  out.push(`<line x1="${rxc + 22}" y1="${fy2 - 2}" x2="${rxc + rw - 22}" y2="${fy2 - 2}" stroke="${K.line}" stroke-width="1.6"/>`);
  out.push(`<text x="${rxc + 24}" y="${fy2 + 26}" font-family="${MONT}" font-weight="800" font-size="18" letter-spacing="1.6" fill="${K.blueSolid}">TURBOLENZA</text>`);
  let ty2 = fy2 + 54;
  for (const t of d.turbolenza) {
    out.push(`<text x="${rxc + 28}" y="${ty2}" font-family="${INTER}" font-weight="600" font-size="15.5" fill="${K.muted}">${esc(t.range)}</text>`);
    out.push(`<text x="${rxc + rw - 24}" y="${ty2}" text-anchor="end" font-family="${MONT}" font-weight="800" font-size="16.5" fill="${K.navy}">${esc(t.name)}</text>`);
    ty2 += 30;
  }

  /* ============ WINDGRAM (stile Alpium) ============ */
  out.push(windgramPanel(a, PAD, 694, PAGE_W - PAD * 2, 688));

  /* ---- banda finale ---- */
  const footY = PAGE_H - 168;
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="168" fill="${K.blueDark}" filter="${SHADOW}"/>`);
  out.push(`<rect x="0" y="${footY}" width="${PAGE_W}" height="4" fill="${K.gold}"/>`);
  const sumSize = fitSize(d.summary, 800, MONT, 40, 26, 1000);
  out.push(`<text x="540" y="${footY + 72}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="${sumSize}" fill="#FFFFFF" filter="${TXT_SHADOW}">${esc(d.summary)}</text>`);
  out.push(`<text x="540" y="${footY + 122}" text-anchor="middle" font-family="${MONT}" font-weight="800" font-size="29" fill="#FFFFFF" filter="${TXT_SHADOW}">Affidabilità <tspan fill="${K.gold}">${esc(d.affidabilita)}</tspan></text>`);
  out.push(`<text x="540" y="${PAGE_H - 14}" text-anchor="middle" font-family="${INTER}" font-weight="600" font-size="15" letter-spacing="1" fill="rgba(255,255,255,0.75)">la-meteo-dei-conigli.vercel.app · Windgram: masse d'aria, venti in quota e zero termico</text>`);

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
