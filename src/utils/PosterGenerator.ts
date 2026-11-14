/**
 * Locandina meteo volo libero — generatore SVG (stile «La Meteo dei Conigli»).
 *
 * Replica fedele del template docs/locandine/locandina.html:
 * palette pino/smeraldo, hero fotografico, banda statistiche, profilo vento,
 * grafico termiche, valutazione pilota, foto del decollo, dati operativi.
 *
 * Font e foto vengono incorporati come data-URL (i riferimenti esterni non
 * vengono caricati quando l'SVG è rasterizzato via <img>), così il canvas non
 * viene «sporcato» e la conversione PNG/JPG/PDF resta possibile offline.
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

export interface LocandinaAssets {
  hero: string;
  decollo: string;
  ali: string;
}

export interface LocandinaFonts {
  barlow600: string;
  barlow700: string;
  barlow800: string;
  inter400: string;
  inter600: string;
  inter700: string;
  inter800: string;
  caveat700: string;
}

const C = {
  bg: "#F2F5F3",
  bg2: "#E9EFEB",
  pine: "#193029",
  pine2: "#26473D",
  border: "#D2DED8",
  icon: "#3A735C",
  accent: "#1D8F5F",
  accentBright: "#31CE8B",
  orange: "#D97A2B",
  text: "#1B211E",
  muted: "#5F6B65",
  ok: "#3E7D57",
  warn: "#A8842E",
  mod: "#C0752F",
  bad: "#A34E44",
  windBlue: "#2B6CB0",
  windGreen: "#1D8F5F",
  windYellow: "#D9A82B",
  track: "#DCE5E0",
  best: "#E3F0E8",
};

const PAGE_W = 1080;
const PAD = 48;
const CONTENT_W = PAGE_W - PAD * 2; // 984
const BARLOW = "'Barlow Condensed','Arial Narrow',sans-serif";
const INTER = "'Inter','Helvetica Neue',Arial,sans-serif";
const CAVEAT = "'Caveat',cursive";

/* ------------------------------------------------------------------ */
/* Piccola libreria di icone vettoriali (stroke 24×24)                 */
/* ------------------------------------------------------------------ */
const ICONS: Record<string, string> = {
  thermometer: "M12 3a2.6 2.6 0 0 1 2.6 2.6v7.9a4.6 4.6 0 1 1-5.2 0V5.6A2.6 2.6 0 0 1 12 3Z M12 8v7",
  snow: "M12 3v18 M4.2 7.5l15.6 9 M19.8 7.5l-15.6 9",
  mountain: "M3 19 L9.5 7.5 L13.5 14 L16 10 L21 19 Z",
  gauge: "M5 17a7.5 7.5 0 0 1 14 0 M12 17l3.8-6.4 M12 17h.01",
  cloud: "M7.5 17.5a4 4 0 1 1 .7-7.94A5.3 5.3 0 0 1 18.3 11.4 3.3 3.3 0 0 1 17.6 17.5 Z",
  wind: "M3.5 8.5h8.7a2.4 2.4 0 1 0-2.4-2.4 M3.5 12.5h13.2a2.5 2.5 0 1 1-2.5 2.5 M3.5 16.5h6.6a2 2 0 1 1-2 2",
  sun: "M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M18.4 5.6L17 7 M7 17l-1.4 1.4",
  schedule: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z M12 7.5V12l3.2 2.1",
  verified: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M8.4 12.2l2.4 2.4 4.8-5",
  quote: "M6.5 6.5h4.2v5.2a4.4 4.4 0 0 1-4.4 4.4 Z M13.8 6.5H18v5.2a4.4 4.4 0 0 1-4.4 4.4 Z",
  paragliding: "M3.5 9.2a8.5 6.2 0 0 1 17 0 M3.5 9.2l7.4 5.6 M20.5 9.2l-7.4 5.6 M12 4v10.8 M12 14.8l-2.4 3.4h4.8Z M10.9 20.6a1.3 1.3 0 1 0 2.2 0 1.3 1.3 0 0 0-2.2 0Z",
  dataset: "M4 4h6.4v6.4H4Z M13.6 4H20v6.4h-6.4Z M4 13.6h6.4V20H4Z M13.6 13.6H20V20h-6.4Z",
  twilight: "M3 18.5h18 M6.2 15.2a5.8 5.8 0 0 1 11.6 0 M12 4.5v3.2 M5.9 8.4l1.9 1.9 M18.1 8.4l-1.9 1.9",
  night: "M3 18.5h18 M6.2 15.2a5.8 5.8 0 0 1 11.6 0 M12 4.5l-1.2 2h2.4L12 8.6",
  drop: "M12 3.2s5.8 6.3 5.8 10.6a5.8 5.8 0 0 1-11.6 0C6.2 9.5 12 3.2 12 3.2Z",
  gust: "M3.5 9h8.4a2.3 2.3 0 1 0-2.3-2.3 M3.5 13h12.9a2.4 2.4 0 1 1-2.4 2.4 M14.8 6.2l1.6-2.7 M17.5 8.4l2.6-1.2",
  star: "M12 3.4l2.4 5.2 5.7.6-4.3 3.9 1.2 5.6L12 15.8l-5 2.9 1.2-5.6-4.3-3.9 5.7-.6Z",
  groups: "M8.2 10.2a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8Z M15.8 10.9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M2.8 19c.4-3 2.7-4.9 5.4-4.9s5 1.9 5.4 4.9 M14.4 14.6c2.4-.5 4.9 1.1 5.6 4.4",
  takeoff: "M2.5 17.5l7.6-1.8 5.4-5.4 2.9 1-3.8 6.4-8.4 1.9Z M20.5 5.5l-3 3",
  check: "M4.5 12.6l4.6 4.6L19.5 6.8",
  eye: "M12 5.5c-4.6 0-7.9 3.9-9.2 6.5 1.3 2.6 4.6 6.5 9.2 6.5s7.9-3.9 9.2-6.5c-1.3-2.6-4.6-6.5-9.2-6.5Z M12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z",
};

function icon(name: string, x: number, y: number, size = 24, color = C.icon): string {
  const d = ICONS[name] ?? ICONS.sun;
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></g>`;
}

/* ------------------------------------------------------------------ */
/* Helpers testo / formato                                            */
/* ------------------------------------------------------------------ */
export function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const r1 = (v: number) => Math.round(v * 10) / 10;
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
  if (deg == null || Number.isNaN(deg)) return "Variabile";
  return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(((deg % 360) / 45)) % 8];
}

function fmtClock(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function rangeLabel(min: number | null, max: number | null, unit: string, digits = 0): string {
  if (min == null && max == null) return `— ${unit}`;
  if (min == null) min = max as number;
  if (max == null) max = min;
  const f = (v: number) => v.toFixed(digits);
  return min === max ? `${f(min)} ${unit}` : `${f(min)} – ${f(max)} ${unit}`;
}

/* Misure testo accurate (i font vengono aggiunti a document.fonts) */
let measureCtx: CanvasRenderingContext2D | null = null;
export function textWidth(text: string, weight: number, size: number, family: string): number {
  if (!measureCtx && typeof document !== "undefined") {
    const cnv = document.createElement("canvas");
    measureCtx = cnv.getContext("2d");
  }
  if (!measureCtx) return text.length * size * 0.55;
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

/* ------------------------------------------------------------------ */
/* Modello dati della locandina                                       */
/* ------------------------------------------------------------------ */
export interface WindRow {
  quota: number;
  dir: string;
  speedMin: number;
  speedMax: number;
  variable: boolean;
  color: string;
}

export interface HourRow {
  ora: string;
  vento: string;
  raffiche: number;
  temp: number | null;
  cielo: string;
  pioggia: string;
  best: boolean;
}

export interface LocandinaData {
  siteName: string;
  province: string;
  dateLine: string;
  elevation: number;
  heroTitleLines: string[];
  report: string;
  semaforo: "GO" | "ATTENZIONE" | "NO GO";
  stats: Array<{ lbl: string; val: string; sub: string }>;
  situazione: string[];
  sinotticaBadge: string;
  sinotticaSource: string;
  windRows: WindRow[];
  windNote: string;
  turbolenza: Array<{ range: string; name: string; color: string }>;
  nubi: Array<{ k: string; v: string }>;
  rischio: Array<{ k: string; v: string; ok: boolean }>;
  termicheBars: Array<{ ora: string; rateo: number; best: boolean }>;
  termicheMax: number;
  paramTermiche: Array<{ k: string; v: string; highlight?: boolean }>;
  ratings: Array<{ label: string; score: number; color: string }>;
  inVolo: string[];
  finestra: string;
  finestraNote: string;
  affidabilitaModello: number;
  affidabilitaAnalisi: number;
  miniStats: Array<{ icon: string; lbl: string; val: string; sub: string }>;
  oreRows: HourRow[];
  commento: string;
  scriptNote: string;
}

export function computeLocandinaData(input: LocandinaInput): LocandinaData {
  const { siteName, elevation, current, hourly } = input;
  const province = input.province ?? "";
  const dayHours = hourly.filter((h) => h.time instanceof Date && h.time.getHours() >= 9 && h.time.getHours() <= 18);
  const hours = dayHours.length ? dayHours : hourly.slice(0, 12);
  const lapse = 0.0065;

  /* ---- data ---- */
  const dateLine = input.date
    .toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();

  /* ---- hero title: gestito dal builder SVG (misura reale del font) ---- */
  const heroTitleLines = [siteName.toUpperCase()];

  /* ---- stat band ---- */
  const temps1000 = hours.map((h) => (h.temperature != null ? h.temperature + (elevation - 1000) * lapse : null));
  const t1000min = nmin(temps1000);
  const t1000max = nmax(temps1000);
  const valleyBase = input.valleyElevation ?? Math.max(200, elevation - 900);
  const tempMaxValley = input.daily?.temperatureMax ?? input.daily?.tempMax ?? nmax(hours.map((h) => h.temperature));
  const tempMax1000 = tempMaxValley != null ? tempMaxValley + (valleyBase - 1000) * lapse : null;
  const flMin = nmin(hours.map((h) => h.freezingLevel));
  const flMax = nmax(hours.map((h) => h.freezingLevel));
  const lapses = hours
    .filter((h) => h.temperature != null && h.freezingLevel != null && h.freezingLevel > elevation + 400)
    .map((h) => ((h.temperature as number) / ((h.freezingLevel as number) - elevation)) * 100);
  const lapseMin = nmin(lapses);
  const lapseMax = nmax(lapses);
  const capeMax = nmax(hours.map((h) => h.cape)) ?? 0;
  const capeLabel = capeMax < 30 ? "molto basso" : capeMax < 150 ? "basso" : capeMax < 300 ? "moderato" : "alto";
  const liMin = nmin(hours.map((h) => h.liftedIndex));
  const liLabel = liMin != null && liMin < -2 ? "atmosfera instabile" : "atmosfera stabile";

  const stats = [
    { lbl: "Temperatura", val: rangeLabel(t1000min != null ? Math.round(t1000min) : null, t1000max != null ? Math.round(t1000max) : null, "°C"), sub: "a quota ~1000 m" },
    { lbl: "Massima", val: rangeLabel(tempMax1000 != null ? Math.round(tempMax1000 - 2) : null, tempMax1000 != null ? Math.round(tempMax1000) : null, "°C"), sub: "fondovalle" },
    { lbl: "Zero termico", val: rangeLabel(flMin, flMax, "m"), sub: "quota di volo" },
    { lbl: "Gradiente", val: rangeLabel(lapseMin, lapseMax, "°/100m", 1), sub: "gradiente termico" },
    { lbl: "CAPE", val: `${Math.round(capeMax)} J/kg`, sub: capeLabel },
    { lbl: "Lifted Index", val: liMin != null ? (liMin > 0 ? "+" : "") + r1(liMin).toFixed(1) : "—", sub: liLabel },
  ];

  /* ---- situazione generale (bullets) ---- */
  const pressure = current?.pressure ?? avg(hours.map((h) => h.pressure));
  const cloudAvg = avg(hours.map((h) => h.cloudCover)) ?? 0;
  const rainProb = nmax(hours.map((h) => h.precipitationProbability)) ?? 0;
  const gustMax = nmax(hours.map((h) => h.windGusts)) ?? 0;
  const visMax = nmax(hours.map((h) => h.visibility));
  const stabile = pressure != null && pressure >= 1015;
  const situazione = [
    stabile ? `Alta pressione (${Math.round(pressure)} hPa): circolazione debole e regolare sui versanti.` : `Pressione ${pressure != null ? Math.round(pressure) : "—"} hPa: flusso variabile, possibile instabilità in quota.`,
    cloudAvg < 30 ? "Giornata stabile e asciutta, cielo sereno o poco nuvoloso." : cloudAvg < 65 ? "Nuvolosità media con ampie schiarite, nessun accumulo significativo." : "Cielo molto nuvoloso: nuclei densi possibili già a metà giornata.",
    rainProb < 20 ? "Nessun rischio di pioggia o temporali." : rainProb < 45 ? "Rischio pioggia basso-moderato, con puntata sulle ore pomeridiane." : "Rischio pioggia significativo: valutare finestre brevi.",
    visMax == null || visMax > 20000 ? "Visibilità molto buona, atmosfera secca." : visMax > 8000 ? "Visibilità buona, qualche velo di foschia in valle." : "Visibilità ridotta: brughiera possibile a quote basse.",
    capeMax < 40 ? "Termiche deboli e frammentate: giorno da scuola e voli locali." : capeMax < 200 ? "Termiche moderate: guadagni di quota possibili nelle ore centrali." : "Termiche energiche: attenzione allo sviluppo convettivo pomeridiano.",
  ];

  /* ---- sinottica ---- */
  const sinotticaBadge = stabile ? "ALTA PRESSIONE" : pressure != null && pressure < 1005 ? "BASSA PRESSIONE" : "FLUSSO VARIABILE";
  const sinotticaSource = "Fonte: Open-Meteo (ECMWF · GFS) · analisi locale";

  /* ---- profilo vento alle quote (stimato da 10/80/120/180 m) ---- */
  const windRows: WindRow[] = [];
  const levels = [3500, 3000, 2500, 2000, 1500, 1000];
  for (const L of levels) {
    const speeds: number[] = [];
    for (const h of hours) {
      const ws180 = h.windSpeed180m ?? h.windSpeed120m ?? h.windSpeed80m ?? h.windSpeed;
      const ws80 = h.windSpeed80m ?? h.windSpeed120m ?? ws180;
      let alpha = 0.14;
      if (ws180 != null && ws80 != null && ws80 > 0.5 && ws180 > ws80) alpha = clamp(Math.log(ws180 / ws80) / Math.log(180 / 80), 0.08, 0.4);
      const base = (ws180 ?? h.windSpeed ?? 0) * Math.pow(L / 180, alpha);
      // smorza oltre la quota di attrito pieno
      const smooth = 1 + 0.12 * Math.exp(-Math.pow((L - 300) / 1200, 2)) - 0.12;
      speeds.push(clamp(base * smooth, 0, 120));
    }
    const smin = speeds.length ? Math.min(...speeds) : 0;
    const smax = speeds.length ? Math.max(...speeds) : 0;
    const lo = Math.round(smin / 5) * 5;
    const hi = Math.max(Math.round(smax / 5) * 5, lo + 2);
    const dirs = hours.map((h) => (L >= 1500 ? (h.windDir180m ?? h.windDir120m ?? h.windDir) : L >= 1000 ? (h.windDir120m ?? h.windDir80m ?? h.windDir) : h.windDir));
    const dd = dirs.filter((d): d is number => typeof d === "number");
    const dir = dd.length ? dirName(dd.sort((a, b) => a - b)[Math.floor(dd.length / 2)]) : "Variabile";
    const color = hi >= 25 ? C.windBlue : hi >= 15 ? C.windGreen : hi >= 8 ? C.windYellow : C.muted;
    windRows.push({ quota: L, dir, speedMin: lo, speedMax: hi, variable: hi - lo >= 8, color });
  }
  const windNote = "Freccia = direzione del flusso. Profilo stimato dal vento al suolo e a 80–180 m (Open-Meteo).";

  /* ---- turbolenza / nubi / rischio ---- */
  const turbStrong = clamp(Math.round(gustMax / 6), 1, 4);
  const turbolenza = [
    { range: "Sotto 2000 m", name: turbStrong <= 2 ? "Lieve" : turbStrong === 3 ? "Leggera" : "Moderata", color: turbStrong <= 2 ? C.ok : turbStrong === 3 ? C.warn : C.mod },
    { range: "2000 – 3000 m", name: turbStrong <= 2 ? "Leggera" : "Moderata", color: turbStrong <= 2 ? C.warn : C.mod },
    { range: "Sopra 3000 m", name: turbStrong <= 3 ? "Moderata" : "Forte", color: turbStrong <= 3 ? C.mod : C.bad },
  ];

  const cloudBaseLo = calcCloudBase(elevation, (avg(hours.map((h) => h.temperature)) ?? 12) - 1.5, (avg(hours.map((h) => h.dewPoint)) ?? 4) - 1.5);
  const cloudBaseHi = calcCloudBase(elevation, avg(hours.map((h) => h.temperature)) ?? 12, avg(hours.map((h) => h.dewPoint)) ?? 4);
  const cumuliProb = clamp(Math.round((cloudAvg - 20) / 3 + capeMax / 30), 0, 70);
  const okta = clamp(Math.round(cloudAvg / 12.5), 0, 8);
  const nubi = [
    { k: "Cumuli significativi", v: cumuliProb < 10 ? `Bassa (< 10%)` : cumuliProb < 30 ? `Media (${cumuliProb}%)` : `Alta (${cumuliProb}%)` },
    { k: "Base prevista", v: cloudBaseLo === cloudBaseHi ? `≈ ${cloudBaseLo} m` : `${cloudBaseLo} – ${cloudBaseHi} m` },
    { k: "Copertura del cielo", v: `${Math.max(0, okta - 1)} – ${okta}/8` },
    { k: "Sviluppo verticale", v: capeMax < 40 ? "Assente" : capeMax < 200 ? "Debole" : "Moderato" },
  ];

  const rischio = [
    { k: "Temporali", v: `${input.probabilities.storm}%`, ok: input.probabilities.storm < 25 },
    { k: "Pioggia", v: `${input.probabilities.rain}%`, ok: input.probabilities.rain < 25 },
    { k: "Neve", v: "0%", ok: true },
    { k: "Vento forte", v: gustMax > 40 ? "Medio" : gustMax > 28 ? "Basso" : "Basso", ok: gustMax <= 28 },
  ];

  /* ---- termiche: barre + parametri ---- */
  const hourData: HourData[] = hours.map((h) => h as unknown as HourData);
  const batch = calcolaTermicheBatch(hourData, elevation);
  const termicheBars = batch.map((b) => ({
    ora: `${String(b.ora).padStart(2, "0")}:00`,
    rateo: b.termiche ? clamp(b.termiche.rateo, 0, 3) : clamp(0.12 + (b.ora >= 12 && b.ora <= 15 ? 0.25 : 0), 0, 3),
    best: false,
  }));
  const bestIdx = termicheBars.reduce((bi, b, i) => (b.rateo > (termicheBars[bi]?.rateo ?? 0) ? i : bi), 0);
  if (termicheBars[bestIdx]) termicheBars[bestIdx].best = true;
  const termicheMax = Math.max(1.2, ...termicheBars.map((b) => b.rateo));
  const ratei = termicheBars.map((b) => b.rateo);
  const forzaMedia = avg(ratei) ?? 0;
  const firstActive = termicheBars.find((b) => b.rateo >= Math.max(0.3, forzaMedia * 0.55));
  const bestHours = [termicheBars[bestIdx - 1]?.ora, termicheBars[bestIdx]?.ora, termicheBars[bestIdx + 1]?.ora].filter(Boolean) as string[];
  const tops = batch.map((b) => b.termiche?.top ?? null);
  const topRealistico = nmax(tops);
  const quoteLavoro = topRealistico != null ? Math.round(topRealistico - 250) : null;
  const qualita = forzaMedia >= 1.6 ? "Buone, ampie e organizzate" : forzaMedia >= 0.9 ? "Discrete, sfruttabili a mezzogiorno" : "Deboli, basse, frammentate";

  const paramTermiche = [
    { k: "Inizio attività", v: firstActive ? firstActive.ora.replace(/^0/, "") : "10:30 – 11:00" },
    { k: "Fase migliore", v: `${bestHours[0]} – ${bestHours[bestHours.length - 1]}`.replace(/^ – /, ""), highlight: true },
    { k: "Forza media", v: `${r1(forzaMedia - 0.15)} – ${r1(forzaMedia + 0.25)} m/s` },
    { k: "Top realistico", v: topRealistico != null ? `${Math.round((topRealistico - 150) / 50) * 50} – ${Math.round((topRealistico + 100) / 50) * 50} m` : "—" },
    { k: "Quota di lavoro", v: quoteLavoro != null ? `${quoteLavoro - 100} – ${quoteLavoro + 100} m` : "—" },
    { k: "Base teorica", v: `${cloudBaseLo} – ${cloudBaseHi} m (non raggiungibile)` },
    { k: "Qualità", v: qualita },
  ];

  /* ---- valutazione pilota ---- */
  const flyable = input.probabilities.flyable;
  const ratings = [
    { label: "Decollo", score: clamp(Math.round(flyable / 10), 1, 10), color: flyable >= 70 ? C.ok : flyable >= 45 ? C.warn : C.bad },
    { label: "Sicurezza", score: clamp(Math.round((100 - input.probabilities.storm) / 10), 1, 10), color: input.probabilities.storm < 25 ? C.ok : C.warn },
    { label: "Potenziale termico", score: clamp(Math.round(input.probabilities.thermal / 10), 1, 10), color: input.probabilities.thermal >= 60 ? C.ok : C.warn },
    { label: "Turbolenza", score: clamp(Math.round(gustMax / 5) + 1, 1, 10), color: gustMax > 35 ? C.bad : gustMax > 25 ? C.warn : C.ok },
    { label: "Cross", score: clamp(Math.round(input.probabilities.thermal / 12 + (gustMax > 30 ? 2 : 0)), 1, 10), color: C.bad },
  ];

  /* ---- cosa troverai in volo ---- */
  const inVolo = [
    cloudAvg < 40 ? "Aria generalmente calma" : "Aria movimentata ma gestibile",
    "Brezza debole di valle",
    rainProb < 20 ? "Nessuna convergenza significativa" : "Convergenze locali da osservare",
    capeMax < 60 ? "Nessun segnale temporalesco" : "Sviluppo termico da monitorare",
    (visMax == null || visMax > 20000) ? "Ottima visibilità (> 20 km)" : "Visibilità sufficiente sotto i 10 km",
    forzaMedia < 1 ? "Pochi trigger termici" : "Trigger termici lungo i versanti soleggiati",
    elevation >= 1400 ? "Permanenza difficile sopra il decollo" : "Resa migliore sopra la quota del decollo",
  ];

  /* ---- finestra di volo ---- */
  const best3 = bestHours.length >= 2 ? `${bestHours[0]} – ${bestHours[bestHours.length - 1]}` : "12:00 – 15:00";
  const finestra = best3;
  const finestraNote = "Le condizioni migliori si avranno nelle ore centrali, quando il terreno sarà più caldo.";

  /* ---- affidabilità (stima da completezza dati) ---- */
  const completeness = hours.length
    ? hours.filter((h) => h.temperature != null && h.windSpeed != null).length / hours.length
    : 0.8;
  const affidabilitaModello = clamp(Math.round(72 + completeness * 18), 60, 92);
  const affidabilitaAnalisi = clamp(affidabilitaModello + 3, 0, 95);

  /* ---- dati operativi (mini stats + tabella oraria) ---- */
  const sunrise = fmtClock(input.daily?.sunrise);
  const sunset = fmtClock(input.daily?.sunset);
  const dayMinutes = input.daily?.sunrise && input.daily?.sunset ? Math.round((new Date(input.daily.sunset as string).getTime() - new Date(input.daily.sunrise as string).getTime()) / 60000) : null;
  const dayLen = dayMinutes ? `${Math.floor(dayMinutes / 60)} h ${dayMinutes % 60}′` : "—";
  const qnh = Math.round(pressure ?? 1013);
  const umidita = Math.round(avg(hours.map((h) => h.humidity)) ?? 50);
  const gustHours = hours.filter((h) => (h.windGusts ?? -1) >= (gustMax ?? 0) - 1);
  const gustWindow = gustHours.length ? `${String(gustHours[0].time.getHours()).padStart(2, "0")} – ${String(gustHours[gustHours.length - 1].time.getHours()).padStart(2, "0")}` : "—";
  const uvMax = input.daily?.uvIndexMax ?? nmax(hours.map((h) => h.uvIndex));
  const uvLabel = (uvMax ?? 0) < 3 ? "basso" : (uvMax ?? 0) < 6 ? "moderato · crema" : "alto · protezione";

  const miniStats = [
    { icon: "twilight", lbl: "Alba", val: sunrise, sub: "prima luce: mattina presto" },
    { icon: "night", lbl: "Tramonto", val: sunset, sub: `giornata ${dayLen}` },
    { icon: "gauge", lbl: "QNH", val: `${qnh} hPa`, sub: stabile ? "alta pressione stabile" : "pressione variabile" },
    { icon: "drop", lbl: "Umidità", val: `${umidita}%`, sub: "media ore centrali" },
    { icon: "gust", lbl: "Raffiche max", val: `${Math.round(gustMax)} km/h`, sub: `ore ${gustWindow}, decollo` },
    { icon: "sun", lbl: "UV max", val: uvMax != null ? r1(uvMax).toFixed(0) : "—", sub: uvLabel },
  ];

  const bestWindow = bestHours;
  const oreRows: HourRow[] = hours.map((h) => {
    const hh = h.time.getHours();
    const ws = h.windSpeed ?? null;
    const wd = dirName(h.windDir);
    return {
      ora: `${String(hh).padStart(2, "0")}:00`,
      vento: ws != null ? `${wd} ${Math.round(ws)} km/h` : "—",
      raffiche: Math.round(h.windGusts ?? 0),
      temp: h.temperature != null ? r1(h.temperature) : null,
      cielo: `${Math.round(100 - (h.cloudCover ?? 0))}%`,
      pioggia: `${Math.round(h.precipitationProbability ?? 0)}%`,
      best: bestWindow.includes(`${String(hh).padStart(2, "0")}:00`),
    };
  });

  const scriptNote = `${siteName}…\npiù di un decollo!`;

  return {
    siteName,
    province,
    dateLine,
    elevation,
    heroTitleLines,
    report: input.report,
    semaforo: flyable >= 70 ? "GO" : flyable >= 45 ? "ATTENZIONE" : "NO GO",
    stats,
    situazione,
    sinotticaBadge,
    sinotticaSource,
    windRows,
    windNote,
    turbolenza,
    nubi,
    rischio,
    termicheBars,
    termicheMax,
    paramTermiche,
    ratings,
    inVolo,
    finestra,
    finestraNote,
    affidabilitaModello,
    affidabilitaAnalisi,
    miniStats,
    oreRows,
    commento: input.report,
    scriptNote,
  };
}

/* ------------------------------------------------------------------ */
/* Builder SVG — replica del template locandina.html                  */
/* ------------------------------------------------------------------ */
interface Assets {
  data: LocandinaData;
  fonts: LocandinaFonts | null;
  hero: string;
  decollo: string;
  ali: string;
}

function fontFaceCss(fonts: LocandinaFonts | null): string {
  if (!fonts) return "";
  const face = (fam: string, w: number, b64: string) =>
    `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  return [
    face("Barlow Condensed", 600, fonts.barlow600),
    face("Barlow Condensed", 700, fonts.barlow700),
    face("Barlow Condensed", 800, fonts.barlow800),
    face("Inter", 400, fonts.inter400),
    face("Inter", 600, fonts.inter600),
    face("Inter", 700, fonts.inter700),
    face("Inter", 800, fonts.inter800),
    face("Caveat", 700, fonts.caveat700),
  ].join("\n");
}

function sectionHeader(a: Assets, x: number, y: number, iconName: string, title: string, width = CONTENT_W): string {
  const out: string[] = [];
  const label = title.toUpperCase();
  const tw = textWidth(label, 700, 30, BARLOW) + 1.6 * Math.max(0, label.length - 1);
  out.push(icon(iconName, x, y - 19, 24));
  out.push(`<text x="${x + 35}" y="${y}" font-family="${BARLOW}" font-weight="700" font-size="30" letter-spacing="1.6" fill="${C.pine}">${esc(label)}</text>`);
  out.push(`<line x1="${x + 35 + tw + 16}" y1="${y - 10}" x2="${x + width}" y2="${y - 10}" stroke="${C.border}" stroke-width="1.5"/>`);
  return out.join("");
}

function chip(a: Assets, x: number, y: number, iconName: string, label: string): { svg: string; width: number } {
  const tw = textWidth(label, 600, 14.5, INTER);
  const w = tw + 42;
  const h = 29;
  const svg = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14.5" fill="rgba(15,33,27,0.74)" stroke="rgba(255,255,255,0.30)" stroke-width="1"/>`,
    icon(iconName, x + 12, y + 6.5, 16, C.accentBright),
    `<text x="${x + 34}" y="${y + 19.5}" font-family="${INTER}" font-weight="600" font-size="14.5" fill="#FFFFFF">${esc(label)}</text>`,
  ].join("");
  return { svg, width: w };
}

function windArrow(cx: number, cy: number, dirDeg: number, size: number, color: string): string {
  // la freccia punta nel verso del flusso (direzione + 180°)
  const rot = (dirDeg + 180) % 360;
  const s = size / 24;
  return `<g transform="translate(${cx},${cy}) rotate(${rot}) scale(${s})" fill="${color}" stroke="none">` +
    `<path d="M12 2 L19 12 L14.5 11 L14.5 21 L9.5 21 L9.5 11 L5 12 Z"/></g>`;
}

function buildHero(a: Assets): { svg: string; height: number } {
  const d = a.data;
  const H = 470;
  const titleWeight = 800;
  let titleSize = 104;
  const maxW = CONTENT_W - 260;
  while (textWidth(d.heroTitleLines[0], titleWeight, titleSize, BARLOW) > maxW && titleSize > 56) titleSize -= 4;
  const titleY = 268;
  const out: string[] = [];
  out.push(`<g clip-path="url(#heroClip)">`);
  out.push(`<image href="${a.hero}" x="0" y="0" width="${PAGE_W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`);
  out.push(`<rect x="0" y="0" width="${PAGE_W}" height="${H}" fill="url(#heroVeilA)"/>`);
  out.push(`<rect x="0" y="0" width="${PAGE_W}" height="${H}" fill="url(#heroVeilB)"/>`);
  out.push(`</g>`);
  // tagline script (ruotata)
  out.push(`<g transform="rotate(-3 920 66)"><text x="920" y="66" text-anchor="middle" font-family="${CAVEAT}" font-weight="700" font-size="37" fill="rgba(255,255,255,0.88)">Stessa passione,</text>` +
    `<text x="920" y="104" text-anchor="middle" font-family="${CAVEAT}" font-weight="700" font-size="37" fill="rgba(255,255,255,0.88)">stesso cielo</text></g>`);
  out.push(`<text x="${PAD}" y="96" font-family="${INTER}" font-weight="700" font-size="16" letter-spacing="5" fill="${C.accentBright}">BOLLETTINO METEO · VOLO LIBERO</text>`);
  out.push(`<text x="${PAD}" y="${titleY}" font-family="${BARLOW}" font-weight="700" font-size="42" letter-spacing="1" fill="#FFFFFF">VOLO LIBERO A</text>`);
  const titleW = textWidth(d.heroTitleLines[0], titleWeight, titleSize, BARLOW) + titleSize * 0.012 * Math.max(0, d.heroTitleLines[0].length - 1);
  out.push(`<text x="${PAD}" y="${titleY + titleSize * 0.86}" font-family="${BARLOW}" font-weight="${titleWeight}" font-size="${titleSize}" letter-spacing="1" fill="#FFFFFF">${esc(d.heroTitleLines[0])}</text>`);
  if (d.province) {
    out.push(`<text x="${PAD + titleW + 18}" y="${titleY + titleSize * 0.86 - 8}" font-family="${BARLOW}" font-weight="700" font-size="38" letter-spacing="2" fill="rgba(255,255,255,0.85)">${esc(`(${d.province.slice(0, 2).toUpperCase()})`)}</text>`);
  }
  out.push(`<text x="${PAD}" y="${titleY + titleSize * 0.86 + 44}" font-family="${INTER}" font-weight="500" font-size="25" fill="rgba(255,255,255,0.94)">${esc(d.dateLine)}</text>`);
  out.push(`<text x="${PAD}" y="${H - 40}" font-family="${INTER}" font-weight="500" font-size="19" fill="rgba(255,255,255,0.78)">Previsioni e dati per piloti di parapendio</text>`);
  // quota chip
  const qLabel = `${d.elevation} m · Decollo ${d.siteName}`;
  const qw = textWidth(qLabel, 700, 18, INTER) + 66;
  out.push(`<rect x="${PAGE_W - PAD - qw}" y="${H - 68}" width="${qw}" height="40" rx="20" fill="rgba(15,33,27,0.35)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"/>`);
  out.push(icon("mountain", PAGE_W - PAD - qw + 14, H - 58, 19, C.accentBright));
  out.push(`<text x="${PAGE_W - PAD - qw + 40}" y="${H - 41}" font-family="${INTER}" font-weight="700" font-size="18" letter-spacing="0.6" fill="#FFFFFF">${esc(qLabel)}</text>`);
  return { svg: out.join(""), height: H };
}

function buildStatBand(a: Assets): { svg: string; height: number } {
  const d = a.data;
  const out: string[] = [];
  const H = 150;
  const colW = CONTENT_W / d.stats.length;
  d.stats.forEach((s, i) => {
    const x = PAD + i * colW;
    if (i > 0) out.push(`<line x1="${x}" y1="14" x2="${x}" y2="${H - 18}" stroke="${C.border}" stroke-width="1"/>`);
    const cx = x + 18;
    out.push(`<text x="${cx}" y="38" font-family="${INTER}" font-weight="700" font-size="13" letter-spacing="1.8" fill="${C.muted}">${esc(s.lbl.toUpperCase())}</text>`);
    out.push(`<text x="${cx}" y="86" font-family="${BARLOW}" font-weight="700" font-size="34" fill="${C.pine}">${esc(s.val)}</text>`);
    out.push(`<text x="${cx}" y="118" font-family="${INTER}" font-weight="500" font-size="14" fill="${C.muted}">${esc(s.sub)}</text>`);
  });
  return { svg: `<line x1="${PAD}" y1="0" x2="${PAGE_W - PAD}" y2="0" stroke="${C.border}" stroke-width="1"/>` + out.join(""), height: H };
}

function buildRowA(a: Assets): { svg: string; height: number } {
  const d = a.data;
  const leftW = 545;
  const rightW = CONTENT_W - leftW - 44;
  const rx = PAD + leftW + 44;
  const out: string[] = [];
  out.push(sectionHeader(a, PAD, 24, "sun", "Situazione generale", leftW));
  let y = 66;
  for (const b of d.situazione) {
    out.push(`<circle cx="${PAD + 5}" cy="${y - 7}" r="4.5" fill="${C.accent}"/>`);
    const lines = wrapText(b, 400, 22, INTER, leftW - 30);
    for (const ln of lines) {
      out.push(`<text x="${PAD + 26}" y="${y}" font-family="${INTER}" font-weight="400" font-size="22" fill="${C.text}">${esc(ln)}</text>`);
      y += 31;
    }
    y += 14;
  }
  const leftH = y - 14;
  // sinottica panel (pino)
  const pH = Math.max(leftH, 305);
  out.push(`<rect x="${rx}" y="0" width="${rightW}" height="${pH}" rx="14" fill="${C.pine}"/>`);
  out.push(`<text x="${rx + 20}" y="32" font-family="${INTER}" font-weight="700" font-size="14" letter-spacing="2.6" fill="rgba(255,255,255,0.85)">SINOTTICA · SATELLITE</text>`);
  const badgeW = textWidth(d.sinotticaBadge, 800, 13.5, INTER) + 28;
  out.push(`<rect x="${rx + rightW - 20 - badgeW}" y="12" width="${badgeW}" height="24" rx="12" fill="${C.accentBright}"/>`);
  out.push(`<text x="${rx + rightW - 20 - badgeW / 2}" y="28.5" text-anchor="middle" font-family="${INTER}" font-weight="800" font-size="13.5" letter-spacing="1" fill="#0E241D">${esc(d.sinotticaBadge)}</text>`);
  // isobare + H
  const ccx = rx + rightW / 2;
  const ccy = 175;
  out.push(`<ellipse cx="${ccx}" cy="${ccy}" rx="128" ry="86" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.4" stroke-dasharray="5 6"/>`);
  out.push(`<ellipse cx="${ccx}" cy="${ccy}" rx="88" ry="58" fill="none" stroke="rgba(255,255,255,0.20)" stroke-width="1.2" stroke-dasharray="5 6"/>`);
  out.push(`<circle cx="${ccx}" cy="${ccy}" r="30" fill="${C.accentBright}"/>`);
  out.push(`<text x="${ccx}" y="${ccy + 11}" text-anchor="middle" font-family="${BARLOW}" font-weight="800" font-size="40" fill="#0E241D">H</text>`);
  // piccole frecce di flusso
  for (const [dx, dy, rot] of [[-150, -70, -55], [150, -70, 55], [-150, 70, -125], [150, 70, 125]] as const) {
    out.push(`<g transform="translate(${ccx + dx},${ccy + dy}) rotate(${rot})" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1.6" stroke-linecap="round"><path d="M0 8 L0 -8 M0 -8 l-4.5 5 M0 -8 l4.5 5"/></g>`);
  }
  out.push(`<text x="${rx + 20}" y="${pH - 34}" font-family="${INTER}" font-weight="500" font-size="13" fill="rgba(255,255,255,0.75)">1020 hPa · Umidità bassa · Flusso regolare</text>`);
  out.push(`<text x="${rx + 20}" y="${pH - 14}" font-family="${INTER}" font-weight="500" font-size="13" fill="rgba(255,255,255,0.55)">${esc(d.sinotticaSource)}</text>`);
  return { svg: out.join(""), height: pH };
}

function buildRowB(a: Assets): { svg: string; height: number } {
  const d = a.data;
  const leftW = 545;
  const rightW = CONTENT_W - leftW - 44;
  const rx = PAD + leftW + 44;
  const out: string[] = [];
  // --- profilo vento (sinistra)
  out.push(sectionHeader(a, PAD, 24, "wind", "Profilo vento alle quote", leftW));
  let y = 58;
  for (const w of d.windRows) {
    out.push(`<line x1="${PAD}" y1="${y + 24}" x2="${PAD + leftW}" y2="${y + 24}" stroke="${C.border}" stroke-width="1"/>`);
    out.push(`<text x="${PAD}" y="${y + 20}" font-family="${BARLOW}" font-weight="700" font-size="29" fill="${C.pine}">${w.quota} m</text>`);
    out.push(`<text x="${PAD + 118}" y="${y + 14}" font-family="${INTER}" font-weight="700" font-size="16" letter-spacing="1" fill="${C.icon}">${esc(w.dir)}</text>`);
    out.push(windArrow(PAD + 186, y + 6, dirFromName(w.dir), 30, w.color));
    const sp = w.speedMin === w.speedMax ? `${w.speedMax} km/h` : `${w.speedMin} – ${w.speedMax} km/h`;
    out.push(`<text x="${PAD + leftW}" y="${y + 12}" text-anchor="end" font-family="${INTER}" font-weight="600" font-size="21" fill="${C.text}">${esc(sp)}</text>`);
    if (w.variable) out.push(`<text x="${PAD + leftW}" y="${y + 32}" text-anchor="end" font-family="${INTER}" font-weight="500" font-size="14" fill="${C.muted}">variabile nelle ore</text>`);
    y += 62;
  }
  const windH = y - 6;
  out.push(icon("paragliding", PAD, windH + 8, 17));
  const noteLines = wrapText(d.windNote, 500, 14.5, INTER, leftW - 40);
  let nly = windH + 21;
  for (const nl of noteLines.slice(0, 2)) {
    out.push(`<text x="${PAD + 26}" y="${nly}" font-family="${INTER}" font-weight="500" font-size="14.5" fill="${C.muted}">${esc(nl)}</text>`);
    nly += 21;
  }
  const leftH = Math.max(windH + 34, nly + 4);

  // --- colonna destra
  let ry = 24;
  out.push(sectionHeader(a, rx, ry, "gust", "Turbolenza", rightW));
  ry += 34;
  for (const t of d.turbolenza) {
    out.push(`<circle cx="${rx + 8}" cy="${ry - 7}" r="7.5" fill="${t.color}"/>`);
    out.push(`<text x="${rx + 26}" y="${ry}" font-family="${INTER}" font-weight="600" font-size="18" fill="${C.muted}">${esc(t.range)}</text>`);
    out.push(`<text x="${rx + 176}" y="${ry}" font-family="${INTER}" font-weight="800" font-size="19" fill="${C.pine}">${esc(t.name)}</text>`);
    ry += 38;
  }
  ry += 16;
  out.push(sectionHeader(a, rx, ry, "cloud", "Probabilità di nubi", rightW));
  ry += 30;
  for (const n of d.nubi) {
    out.push(`<text x="${rx}" y="${ry}" font-family="${INTER}" font-weight="500" font-size="17.5" fill="${C.text}">${esc(n.k)}</text>`);
    out.push(`<text x="${rx + rightW}" y="${ry}" text-anchor="end" font-family="${INTER}" font-weight="800" font-size="18" fill="${C.pine}">${esc(n.v)}</text>`);
    out.push(`<line x1="${rx}" y1="${ry + 8}" x2="${rx + rightW}" y2="${ry + 8}" stroke="${C.border}" stroke-width="1"/>`);
    ry += 36;
  }
  ry += 14;
  out.push(sectionHeader(a, rx, ry, "cloud", "Rischio fenomeni", rightW));
  ry += 30;
  for (const r of d.rischio) {
    out.push(`<text x="${rx}" y="${ry}" font-family="${INTER}" font-weight="500" font-size="17.5" fill="${C.text}">${esc(r.k)}</text>`);
    out.push(`<text x="${rx + rightW}" y="${ry}" text-anchor="end" font-family="${INTER}" font-weight="800" font-size="18" fill="${r.ok ? C.ok : C.mod}">${esc(r.v)}</text>`);
    out.push(`<line x1="${rx}" y1="${ry + 8}" x2="${rx + rightW}" y2="${ry + 8}" stroke="${C.border}" stroke-width="1"/>`);
    ry += 36;
  }
  const rightH = ry - 10;
  return { svg: out.join(""), height: Math.max(leftH, rightH) };
}

function dirFromName(name: string): number {
  const map: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SO: 225, O: 270, NO: 315 };
  return map[name] ?? 225;
}

function buildRowC(a: Assets): { svg: string; height: number } {
  const d = a.data;
  const leftW = 545;
  const rightW = CONTENT_W - leftW - 44;
  const rx = PAD + leftW + 44;
  const out: string[] = [];
  // --- grafico termiche (sinistra)
  out.push(sectionHeader(a, PAD, 24, "sun", "Evoluzione termiche", leftW));
  out.push(`<text x="${PAD}" y="48" font-family="${INTER}" font-weight="600" font-size="15.5" fill="${C.muted}">Intensità media prevista (m/s)</text>`);
  const chartX = PAD + 8;
  const chartY = 78;
  const chartW = leftW - 40;
  const chartH = 240;
  const yMax = Math.max(2, Math.ceil(d.termicheMax * 2) / 2);
  // griglia + assi
  for (let g = 0; g <= yMax; g += 0.5) {
    const gy = chartY + chartH - (g / yMax) * chartH;
    out.push(`<line x1="${chartX}" y1="${gy}" x2="${chartX + chartW}" y2="${gy}" stroke="${g % 1 === 0 ? C.border : "rgba(210,222,216,0.55)"}" stroke-width="1"/>`);
    out.push(`<text x="${chartX - 8}" y="${gy + 4}" text-anchor="end" font-family="${INTER}" font-weight="500" font-size="12.5" fill="${C.muted}">${g.toFixed(1)}</text>`);
  }
  out.push(`<line x1="${chartX}" y1="${chartY}" x2="${chartX}" y2="${chartY + chartH}" stroke="${C.border}" stroke-width="1.2"/>`);
  const n = d.termicheBars.length;
  const slot = chartW / n;
  const barW = Math.min(44, slot * 0.62);
  d.termicheBars.forEach((b, i) => {
    const bx = chartX + slot * i + (slot - barW) / 2;
    const bh = (b.rateo / yMax) * chartH;
    const by = chartY + chartH - bh;
    if (b.rateo > 0.02) {
      out.push(`<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="5" fill="${b.best ? C.orange : "#E8A33D"}"/>`);
      out.push(`<text x="${bx + barW / 2}" y="${by - 8}" text-anchor="middle" font-family="${INTER}" font-weight="700" font-size="14" fill="${C.text}">${b.rateo.toFixed(1)}</text>`);
    }
    out.push(`<text x="${bx + barW / 2}" y="${chartY + chartH + 22}" text-anchor="middle" font-family="${INTER}" font-weight="500" font-size="12.5" fill="${C.muted}">${b.ora.slice(0, 2)}</text>`);
  });
  // --- parametri termiche (destra)
  let py = 24;
  out.push(sectionHeader(a, rx, py, "dataset", "Parametri termiche", rightW));
  py += 26;
  out.push(`<rect x="${rx}" y="${py}" width="${rightW}" height="34" rx="6" fill="${C.bg2}"/>`);
  out.push(`<text x="${rx + 12}" y="${py + 22}" font-family="${INTER}" font-weight="700" font-size="13" letter-spacing="1.8" fill="${C.muted}">PARAMETRI TERMICHE</text>`);
  py += 34;
  for (const p of d.paramTermiche) {
    out.push(`<text x="${rx}" y="${py + 22}" font-family="${INTER}" font-weight="500" font-size="17.5" fill="${C.text}">${esc(p.k)}</text>`);
    out.push(`<text x="${rx + rightW}" y="${py + 22}" text-anchor="end" font-family="${INTER}" font-weight="800" font-size="17.5" fill="${p.highlight ? C.accent : C.pine}">${esc(p.v)}</text>`);
    out.push(`<line x1="${rx}" y1="${py + 32}" x2="${rx + rightW}" y2="${py + 32}" stroke="${C.border}" stroke-width="1"/>`);
    py += 38;
  }
  const leftH = chartY + chartH + 36;
  return { svg: out.join(""), height: Math.max(leftH, py) };
}

function buildRowD(a: Assets): { svg: string; height: number } {
  const d = a.data;
  const leftW = 470;
  const rightW = CONTENT_W - leftW - 44;
  const rx = PAD + leftW + 44;
  const out: string[] = [];
  // --- valutazione pilota (sinistra)
  out.push(sectionHeader(a, PAD, 24, "groups", "Valutazione pilota", leftW));
  let y = 56;
  for (const r of d.ratings) {
    const trackW = leftW - 250;
    out.push(`<text x="${PAD}" y="${y}" font-family="${INTER}" font-weight="600" font-size="19" fill="${C.text}">${esc(r.label)}</text>`);
    out.push(`<rect x="${PAD + 205}" y="${y - 14}" width="${trackW}" height="15" rx="7.5" fill="${C.track}"/>`);
    out.push(`<rect x="${PAD + 205}" y="${y - 14}" width="${(trackW * r.score) / 10}" height="15" rx="7.5" fill="${r.color}"/>`);
    out.push(`<text x="${PAD + leftW}" y="${y + 1}" text-anchor="end" font-family="${BARLOW}" font-weight="700" font-size="26" fill="${C.pine}">${r.score}/10</text>`);
    y += 46;
  }
  const leftH = y - 12;
  // --- cosa troverai in volo (destra)
  out.push(sectionHeader(a, rx, 24, "check", "Cosa troverai in volo", rightW));
  let ry = 60;
  for (const item of d.inVolo) {
    out.push(`<circle cx="${rx + 11}" cy="${ry - 7}" r="11" fill="${C.accent}"/>`);
    out.push(`<path d="M ${rx + 5.5} ${ry - 7} l 3.6 3.8 l 7 -7.6" stroke="#FFFFFF" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    const lines = wrapText(item, 500, 20.5, INTER, rightW - 40);
    for (const ln of lines) {
      out.push(`<text x="${rx + 32}" y="${ry}" font-family="${INTER}" font-weight="500" font-size="20.5" fill="${C.text}">${esc(ln)}</text>`);
      ry += 29;
    }
    ry += 9;
  }
  return { svg: out.join(""), height: Math.max(leftH, ry) };
}

function buildFinestraBand(a: Assets): { svg: string; height: number } {
  const d = a.data;
  const H = 208;
  const out: string[] = [];
  out.push(`<rect x="${PAD}" y="0" width="${CONTENT_W}" height="${H}" rx="14" fill="${C.best}"/>`);
  const splitX = PAD + CONTENT_W * 0.56;
  out.push(`<line x1="${splitX}" y1="30" x2="${splitX}" y2="${H - 30}" stroke="rgba(29,143,95,0.28)" stroke-width="1.5"/>`);
  // sinistra: finestra
  out.push(icon("schedule", PAD + 34, 36, 24));
  out.push(`<text x="${PAD + 70}" y="55" font-family="${BARLOW}" font-weight="700" font-size="30" letter-spacing="1.6" fill="${C.pine}">FINESTRA DI VOLO</text>`);
  out.push(`<line x1="${PAD + 70 + textWidth("FINESTRA DI VOLO", 700, 30, BARLOW) + 1.6 * 15 + 16}" y1="46" x2="${splitX - 30}" y2="46" stroke="${C.border}" stroke-width="1.5"/>`);
  out.push(`<text x="${PAD + 34}" y="122" font-family="${BARLOW}" font-weight="800" font-size="64" fill="${C.pine}">${esc(d.finestra)}</text>`);
  const noteLines = wrapText(d.finestraNote, 500, 18.5, INTER, splitX - PAD - 70);
  let ny = 156;
  for (const ln of noteLines) {
    out.push(`<text x="${PAD + 34}" y="${ny}" font-family="${INTER}" font-weight="500" font-size="18.5" fill="${C.muted}">${esc(ln)}</text>`);
    ny += 27;
  }
  // destra: affidabilità
  const ax = splitX + 40;
  out.push(icon("verified", ax, 36, 24));
  out.push(`<text x="${ax + 36}" y="55" font-family="${BARLOW}" font-weight="700" font-size="30" letter-spacing="1.6" fill="${C.pine}">AFFIDABILITÀ PREVISIONE</text>`);
  out.push(`<line x1="${ax + 36 + textWidth("AFFIDABILITÀ PREVISIONE", 700, 30, BARLOW) + 1.6 * 22 + 16}" y1="46" x2="${PAGE_W - PAD - 34}" y2="46" stroke="${C.border}" stroke-width="1.5"/>`);
  out.push(`<text x="${ax}" y="122" font-family="${BARLOW}" font-weight="800" font-size="56" fill="${C.accent}">${d.affidabilitaModello}%</text>`);
  out.push(`<text x="${ax}" y="150" font-family="${INTER}" font-weight="700" font-size="14" letter-spacing="1.4" fill="${C.muted}">AFFIDABILITÀ MODELLO</text>`);
  out.push(`<text x="${ax + 250}" y="122" font-family="${BARLOW}" font-weight="800" font-size="56" fill="${C.accent}">${d.affidabilitaAnalisi}%</text>`);
  out.push(`<text x="${ax + 250}" y="150" font-family="${INTER}" font-weight="700" font-size="14" letter-spacing="1.4" fill="${C.muted}">CREDIBILITÀ ANALISI</text>`);
  return { svg: out.join(""), height: H };
}

function buildFotoBand(a: Assets): { svg: string; height: number } {
  const H = 296;
  const mainW = (CONTENT_W - 20) * 0.603;
  const sideW = CONTENT_W - 20 - mainW;
  const out: string[] = [];
  out.push(sectionHeader(a, PAD, 24, "paragliding", "Il nostro decollo"));
  const photoY = 40;
  out.push(`<g clip-path="url(#fotoMainClip)"><image href="${a.decollo}" x="${PAD}" y="${photoY}" width="${mainW}" height="${H}" preserveAspectRatio="xMidYMid slice"/></g>`);
  out.push(`<rect x="${PAD}" y="${photoY + H - 84}" width="${mainW}" height="84" fill="url(#fotoVeil)"/>`);
  const sx = PAD + mainW + 20;
  out.push(`<g clip-path="url(#fotoSideClip)"><image href="${a.ali}" x="${sx}" y="${photoY}" width="${sideW}" height="${H}" preserveAspectRatio="xMidYMid slice"/></g>`);
  out.push(`<rect x="${sx}" y="${photoY + H - 84}" width="${sideW}" height="84" fill="url(#fotoVeil)"/>`);
  // chips
  let cx = PAD + 16;
  const chipsMain: Array<[string, string]> = [["takeoff", `Decollo ${a.data.siteName} · ${a.data.elevation} m`], ["air", "Manica a vento · prato in pendio"]];
  for (const [ic, lb] of chipsMain) {
    const c = chip(a, cx, photoY + H - 52, ic, lb);
    out.push(c.svg);
    cx += c.width + 10;
  }
  const c2 = chip(a, sx + 16, photoY + H - 52, "groups", "Pendaggio · ali pronte al decollo");
  out.push(c2.svg);
  return { svg: out.join(""), height: photoY + H };
}

function buildDatiBand(a: Assets): { svg: string; height: number } {
  const d = a.data;
  const out: string[] = [];
  out.push(sectionHeader(a, PAD, 24, "dataset", "Dati operativi del giorno"));
  // mini cards
  let y = 44;
  const cardGap = 14;
  const cardW = (CONTENT_W - cardGap * 5) / 6;
  d.miniStats.forEach((m, i) => {
    const x = PAD + i * (cardW + cardGap);
    out.push(`<rect x="${x}" y="${y}" width="${cardW}" height="108" rx="12" fill="#FFFFFF" stroke="${C.border}" stroke-width="1"/>`);
    out.push(icon(m.icon, x + 14, y + 12, 17));
    out.push(`<text x="${x + 37}" y="${y + 25}" font-family="${INTER}" font-weight="700" font-size="12" letter-spacing="1.4" fill="${C.muted}">${esc(m.lbl.toUpperCase())}</text>`);
    out.push(`<text x="${x + 14}" y="${y + 63}" font-family="${BARLOW}" font-weight="700" font-size="30" fill="${C.pine}">${esc(m.val)}</text>`);
    const subLines = wrapText(m.sub, 500, 12.5, INTER, cardW - 24);
    out.push(`<text x="${x + 14}" y="${y + 88}" font-family="${INTER}" font-weight="500" font-size="12.5" fill="${C.muted}">${esc(subLines[0])}</text>`);
    if (subLines[1]) out.push(`<text x="${x + 14}" y="${y + 102}" font-family="${INTER}" font-weight="500" font-size="11.5" fill="${C.muted}">${esc(subLines[1])}</text>`);
  });
  // tabella oraria
  y += 108 + 20;
  const cols = [0.12, 0.2, 0.16, 0.16, 0.2, 0.16];
  const colX: number[] = [];
  let acc = PAD;
  for (const f of cols) {
    colX.push(acc);
    acc += CONTENT_W * f;
  }
  const rowH = 37;
  const tableH = 44 + rowH * d.oreRows.length;
  out.push(`<rect x="${PAD}" y="${y}" width="${CONTENT_W}" height="${tableH}" rx="12" fill="#FFFFFF" stroke="${C.border}" stroke-width="1"/>`);
  // header
  out.push(`<path d="M ${PAD} ${y + 12} a 12 12 0 0 1 12 -12 h ${CONTENT_W - 24} a 12 12 0 0 1 12 12 v 32 h -${CONTENT_W} Z" fill="${C.pine}"/>`);
  const heads = ["Ora", "Vento a terra", "Raffiche", "T (decollo)", "Cielo sereno", "Pioggia"];
  heads.forEach((h, i) => {
    const anchor = i === 0 ? "start" : "middle";
    const tx = i === 0 ? colX[i] + 16 : colX[i] + (CONTENT_W * cols[i]) / 2;
    out.push(`<text x="${tx}" y="${y + 29}" text-anchor="${anchor}" font-family="${INTER}" font-weight="700" font-size="13" letter-spacing="1.4" fill="#FFFFFF">${esc(h.toUpperCase())}</text>`);
  });
  // righe
  d.oreRows.forEach((r, i) => {
    const ry = y + 44 + i * rowH;
    if (r.best) out.push(`<rect x="${PAD + 1}" y="${ry}" width="${CONTENT_W - 2}" height="${rowH}" fill="${C.best}"/>`);
    else if (i % 2 === 1) out.push(`<rect x="${PAD + 1}" y="${ry}" width="${CONTENT_W - 2}" height="${rowH}" fill="#F7FAF8"/>`);
    out.push(`<line x1="${PAD + 1}" y1="${ry}" x2="${PAGE_W - PAD - 1}" y2="${ry}" stroke="${C.border}" stroke-width="0.8"/>`);
    const vals = [r.ora + (r.best ? " ★" : ""), r.vento, `${r.raffiche} km/h`, r.temp != null ? `${r.temp.toFixed(1)} °C` : "—", r.cielo, r.pioggia];
    vals.forEach((v, vi) => {
      const anchor = vi === 0 ? "start" : "middle";
      const tx = vi === 0 ? colX[vi] + 16 : colX[vi] + (CONTENT_W * cols[vi]) / 2;
      const isStar = vi === 0 && r.best;
      out.push(`<text x="${tx}" y="${ry + 24}" text-anchor="${anchor}" font-family="${INTER}" font-weight="${vi === 0 ? 800 : 600}" font-size="16" fill="${vi === 0 ? C.pine : C.text}">${esc(v)}</text>`);
      if (isStar) {
        out.push(`<path transform="translate(${colX[0] + 16 + textWidth(r.ora, 800, 16, INTER) + 6},${ry + 10}) scale(0.5)" fill="${C.accent}" d="${ICONS.star}"/>`);
      }
    });
  });
  const afterTable = y + tableH + 26;
  out.push(icon("star", PAD, afterTable - 12, 16, C.accent));
  out.push(`<text x="${PAD + 24}" y="${afterTable}" font-family="${INTER}" font-weight="500" font-size="14.5" fill="${C.muted}">In verde le ore della finestra consigliata (${esc(d.finestra)}).</text>`);
  return { svg: out.join(""), height: afterTable + 10 };
}

function buildCommento(a: Assets): { svg: string; height: number } {
  const d = a.data;
  const textW = CONTENT_W - 330;
  const out: string[] = [];
  out.push(sectionHeader(a, PAD, 24, "quote", "Commento pilota", textW));
  let y = 62;
  const paras = d.commento.split(/\n+/);
  for (const para of paras) {
    const lines = wrapText(para, 400, 23, INTER, textW);
    for (const ln of lines) {
      out.push(`<text x="${PAD}" y="${y}" font-family="${INTER}" font-weight="400" font-size="23" fill="${C.text}">${esc(ln)}</text>`);
      y += 35;
    }
    y += 8;
  }
  const bodyH = Math.max(y, 150);
  // script note a destra
  const sx = PAGE_W - PAD - 250;
  out.push(`<g transform="rotate(-2.5 ${sx + 100} 70)">`);
  const scriptLines = d.scriptNote.split("\n");
  let sy = 62;
  scriptLines.forEach((sl) => {
    out.push(`<text x="${sx + 100}" y="${sy}" text-anchor="middle" font-family="${CAVEAT}" font-weight="700" font-size="44" fill="${C.accent}">${esc(sl)}</text>`);
    sy += 48;
  });
  out.push(`</g>`);
  out.push(`<rect x="${sx + 22}" y="${sy - 8}" width="156" height="6" rx="4" fill="url(#tricolor)" stroke="${C.border}" stroke-width="1"/>`);
  return { svg: out.join(""), height: Math.max(bodyH, sy + 6) };
}

function buildFooter(a: Assets): { svg: string; height: number } {
  const H = 150;
  const out: string[] = [];
  out.push(`<path d="M0 22 L1080 22 L1080 ${H} L0 ${H} Z" fill="${C.pine}"/>`);
  out.push(`<path d="M0 34 L84 14 L146 26 L238 6 L322 24 L418 12 L512 30 L606 8 L696 22 L798 2 L892 20 L992 10 L1080 26" stroke="#FFFFFF" stroke-width="1.4" fill="none" opacity="0.14"/>`);
  out.push(`<path d="M0 40 L120 28 L210 36 L330 20 L448 34 L560 24 L672 36 L790 16 L910 32 L1020 24 L1080 30" stroke="#FFFFFF" stroke-width="1" fill="none" opacity="0.08"/>`);
  out.push(icon("mountain", PAD, 52, 22, C.accentBright));
  out.push(`<text x="${PAD + 32}" y="70" font-family="${BARLOW}" font-weight="700" font-size="29" letter-spacing="2.6" fill="#FFFFFF">VOLARE CONSAPEVOLI, SEMPRE</text>`);
  out.push(`<text x="${PAD}" y="100" font-family="${INTER}" font-weight="600" font-size="15.5" letter-spacing="3" fill="rgba(255,255,255,0.66)">METEO · MONTAGNA · PASSIONE · SICUREZZA</text>`);
  out.push(`<text x="540" y="62" font-family="${INTER}" font-weight="500" font-size="15" fill="rgba(255,255,255,0.62)">I dati sono una guida.</text>`);
  out.push(`<text x="540" y="84" font-family="${INTER}" font-weight="500" font-size="15" fill="rgba(255,255,255,0.62)">L'esperienza fa la differenza.</text>`);
  out.push(`<text x="${PAGE_W - PAD}" y="62" text-anchor="end" font-family="${INTER}" font-weight="500" font-size="15" fill="rgba(255,255,255,0.62)">Elaborazione <tspan font-weight="800" fill="rgba(255,255,255,0.9)">La Meteo dei Conigli</tspan></text>`);
  out.push(`<text x="${PAGE_W - PAD}" y="84" text-anchor="end" font-family="${INTER}" font-weight="500" font-size="15" fill="rgba(255,255,255,0.62)">la-meteo-dei-conigli.vercel.app</text>`);
  return { svg: out.join(""), height: H };
}

/* ------------------------------------------------------------------ */
/* Assemblaggio finale                                                */
/* ------------------------------------------------------------------ */
export function buildLocandinaSVG(a: Assets): { svg: string; width: number; height: number } {
  const hero = buildHero(a);
  const stats = buildStatBand(a);
  const rowA = buildRowA(a);
  const rowB = buildRowB(a);
  const rowC = buildRowC(a);
  const rowD = buildRowD(a);
  const finestra = buildFinestraBand(a);
  const foto = buildFotoBand(a);
  const dati = buildDatiBand(a);
  const commento = buildCommento(a);
  const footer = buildFooter(a);

  const GAP_SECTION = 40;
  const sections = [
    { b: hero, gap: 0 },
    { b: stats, gap: 0 },
    { b: rowA, gap: 42 },
    { b: rowB, gap: GAP_SECTION },
    { b: rowC, gap: GAP_SECTION },
    { b: rowD, gap: GAP_SECTION },
    { b: finestra, gap: 40 },
    { b: foto, gap: 44 },
    { b: dati, gap: 40 },
    { b: commento, gap: 44 },
  ];
  let y = 0;
  const parts: string[] = [];
  for (const s of sections) {
    y += s.gap;
    parts.push(`<g transform="translate(0,${y})">${s.b.svg}</g>`);
    y += s.b.height;
  }
  const footerY = y + 40;
  const totalH = footerY + footer.height;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${totalH}" viewBox="0 0 ${PAGE_W} ${totalH}">
  <defs>
    <style>${fontFaceCss(a.fonts)}</style>
    <linearGradient id="heroVeilA" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(15,33,27,0.30)"/><stop offset="34%" stop-color="rgba(15,33,27,0.06)"/>
      <stop offset="86%" stop-color="rgba(15,33,27,0.78)"/><stop offset="100%" stop-color="rgba(20,40,33,0.94)"/>
    </linearGradient>
    <linearGradient id="heroVeilB" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(15,33,27,0.93)"/><stop offset="34%" stop-color="rgba(15,33,27,0.66)"/>
      <stop offset="66%" stop-color="rgba(15,33,27,0.18)"/><stop offset="100%" stop-color="rgba(15,33,27,0.42)"/>
    </linearGradient>
    <linearGradient id="fotoVeil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(15,33,27,0)"/><stop offset="100%" stop-color="rgba(15,33,27,0.82)"/>
    </linearGradient>
    <linearGradient id="tricolor" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1D8F5F"/><stop offset="33.3%" stop-color="#1D8F5F"/>
      <stop offset="33.3%" stop-color="#FFFFFF"/><stop offset="66.6%" stop-color="#FFFFFF"/>
      <stop offset="66.6%" stop-color="#C4453B"/><stop offset="100%" stop-color="#C4453B"/>
    </linearGradient>
    <clipPath id="heroClip"><rect x="0" y="0" width="${PAGE_W}" height="${hero.height}"/></clipPath>
    <clipPath id="fotoMainClip"><rect x="${PAD}" y="${buildFotoClipY()}" width="${(CONTENT_W - 20) * 0.603}" height="296" rx="14"/></clipPath>
    <clipPath id="fotoSideClip"><rect x="${PAD + (CONTENT_W - 20) * 0.603 + 20}" y="${buildFotoClipY()}" width="${CONTENT_W - 20 - (CONTENT_W - 20) * 0.603}" height="296" rx="14"/></clipPath>
  </defs>
  <rect width="${PAGE_W}" height="${totalH}" fill="${C.bg}"/>
  ${parts.join("\n  ")}
  <g transform="translate(0,${footerY})">${footer.svg}</g>
</svg>`;
  return { svg, width: PAGE_W, height: totalH };
}

function buildFotoClipY(): number {
  return 40;
}

/* ------------------------------------------------------------------ */
/* Caricamento asset (font + foto) con cache                          */
/* ------------------------------------------------------------------ */
const ASSET_CACHE: { fonts: LocandinaFonts | null; hero: string | null; decollo: string | null; ali: string | null } = {
  fonts: null, hero: null, decollo: null, ali: null,
};

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(blob);
  });
}

/** Ridimensiona un'immagine via canvas per contenere il peso del data-URL. */
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

export async function loadLocandinaAssets(): Promise<{ fonts: LocandinaFonts | null; hero: string; decollo: string; ali: string }> {
  if (ASSET_CACHE.fonts && ASSET_CACHE.hero && ASSET_CACHE.decollo && ASSET_CACHE.ali) {
    return { fonts: ASSET_CACHE.fonts, hero: ASSET_CACHE.hero, decollo: ASSET_CACHE.decollo, ali: ASSET_CACHE.ali };
  }
  const fontsSpec: Array<[keyof LocandinaFonts, string]> = [
    ["barlow600", "/fonts/locandina/barlow-condensed-600-subset.woff2"],
    ["barlow700", "/fonts/locandina/barlow-condensed-700-subset.woff2"],
    ["barlow800", "/fonts/locandina/barlow-condensed-800-subset.woff2"],
    ["inter400", "/fonts/locandina/inter-400-subset.woff2"],
    ["inter600", "/fonts/locandina/inter-600-subset.woff2"],
    ["inter700", "/fonts/locandina/inter-700-subset.woff2"],
    ["inter800", "/fonts/locandina/inter-800-subset.woff2"],
    ["caveat700", "/fonts/locandina/caveat-700-subset.woff2"],
  ];
  try {
    const entries = await Promise.all(fontsSpec.map(async ([k, url]) => [k, await fetchWoff2Base64(url)] as const));
    ASSET_CACHE.fonts = Object.fromEntries(entries) as unknown as LocandinaFonts;
    // registra i font anche nel documento per misure accurate
    if (typeof document !== "undefined" && ASSET_CACHE.fonts) {
      const fams: Array<[string, number, string]> = [
        ["Barlow Condensed", 600, ASSET_CACHE.fonts.barlow600],
        ["Barlow Condensed", 700, ASSET_CACHE.fonts.barlow700],
        ["Barlow Condensed", 800, ASSET_CACHE.fonts.barlow800],
        ["Inter", 400, ASSET_CACHE.fonts.inter400],
        ["Inter", 600, ASSET_CACHE.fonts.inter600],
        ["Inter", 700, ASSET_CACHE.fonts.inter700],
        ["Inter", 800, ASSET_CACHE.fonts.inter800],
        ["Caveat", 700, ASSET_CACHE.fonts.caveat700],
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
    ASSET_CACHE.fonts = null; // i testi useranno i font di sistema
  }
  const [hero, decollo, ali] = await Promise.all([
    imageToJpegDataUrl("/hero-parapendio-alpi.jpg", 1080, 0.8),
    imageToJpegDataUrl("/locandine/foto/decollo-parapendio.jpg", 980, 0.82),
    imageToJpegDataUrl("/locandine/foto/preparazione-ali.jpg", 720, 0.82),
  ]);
  ASSET_CACHE.hero = hero;
  ASSET_CACHE.decollo = decollo;
  ASSET_CACHE.ali = ali;
  return { fonts: ASSET_CACHE.fonts, hero, decollo, ali };
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
  ctx.fillStyle = "#F2F5F3";
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
  /** larghezza del raster in px (default 1620 = 1.5×) */
  outWidth?: number;
}

export async function generateLocandinaImageBlob(input: LocandinaInput, type: "png" | "jpg", opts: LocandinaBlobOptions = {}): Promise<Blob> {
  const { blob } = await generateLocandinaRender(input, type, opts.outWidth ?? 1620);
  return blob;
}

/** Genera la locandina rasterizzata insieme alle sue dimensioni logiche (1080 × H). */
export async function generateLocandinaRender(input: LocandinaInput, type: "png" | "jpg", outWidth = 1620): Promise<{ blob: Blob; width: number; height: number }> {
  const assets = await loadLocandinaAssets();
  const data = computeLocandinaData(input);
  const { svg, width, height } = buildLocandinaSVG({ data, fonts: assets.fonts, hero: assets.hero, decollo: assets.decollo, ali: assets.ali });
  const quality = type === "jpg" ? 0.88 : undefined;
  const blob = await rasterize(svg, width, height, outWidth, type, quality);
  return { blob, width, height };
}

export async function generateLocandinaSvgString(input: LocandinaInput): Promise<{ svg: string; width: number; height: number }> {
  const assets = await loadLocandinaAssets();
  const data = computeLocandinaData(input);
  return buildLocandinaSVG({ data, fonts: assets.fonts, hero: assets.hero, decollo: assets.decollo, ali: assets.ali });
}

export function locandinaFilename(siteName: string, date: Date, ext: string): string {
  const slug = siteName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `locandina-${slug}-${day}-${month}-${date.getFullYear()}.${ext}`;
}



