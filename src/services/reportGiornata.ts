"use client";

/**
 * Report giornata di volo — dati deterministici da Open-Meteo per un decollo e un giorno.
 * - profilo verticale vento/temperatura interpolato a step di 250 m dal decollo fino a 4000 m s.l.m.
 *   (livelli di pressione del modello con geopotential_height, interpolazione vettoriale u/v)
 * - per ogni ora: copertura nuvole (totale/bassa/media/alta), base cumuli, rateo termico,
 *   indice di volabilità con la stessa logica delle card
 * - finestra migliore, veleggiata, turbolenza stimata, andamento orario
 */

import { fetchHourly } from "@/lib/openMeteoClient";
import { calcolaIndiceVolabilita, esposizioneToGradi } from "@/utils/indiceVolabilita";

export const PRESSURE_LEVELS = [1000, 975, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500];

const BASE_PARAMS = [
  "temperature_2m", "dew_point_2m", "apparent_temperature", "precipitation",
  "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
  "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
  "cape", "lifted_index", "weather_code", "freezing_level_height",
];

export const REPORT_HOURLY_PARAMS = [
  ...BASE_PARAMS,
  ...PRESSURE_LEVELS.flatMap((h) => [
    `temperature_${h}hPa`, `wind_speed_${h}hPa`, `wind_direction_${h}hPa`, `geopotential_height_${h}hPa`,
  ]),
].join(",");

export interface ReportOra {
  hour: number;
  temp: number | null;
  dew: number | null;
  rain: number | null;
  cloud: number | null;
  cloudLow: number | null;
  cloudMid: number | null;
  cloudHigh: number | null;
  wind: number | null;
  gust: number | null;
  dir: number | null;
  cape: number | null;
  liftedIndex: number | null;
  code: number | null;
  freezing: number | null;
  baseNubi: number | null;
  rateo: number | null;
  indice: number | null;
  indiceLabel: string | null;
  windRel: string | null;
}

export interface ProfileRow {
  z: number;        // quota s.l.m.
  agl: number;      // metri sopra il decollo
  speed: number | null;   // km/h
  dir: number | null;     // gradi (da cui viene)
  card: string;           // cardinale
  temp: number | null;    // °C
  shear: boolean;         // gradiente forte rispetto al livello sotto
}

export interface ReportGiornata {
  dateISO: string;
  hours: ReportOra[];
  /** profilo verticale per quota (key = ora) */
  profili: Map<number, ProfileRow[]>;
  baseRange: [number, number] | null;
  topRange: [number, number] | null;
  rateoMax: number;
  rateoOraMax: number | null;
  tempMin: number | null;
  tempMax: number | null;
  bestWindow: { from: number; to: number; indice: number; quota: number | null } | null;
  veleggiata: { livello: "OTTIME" | "BUONE" | "MEDIATE" | "SCARSE"; motivo: string };
  turbolenza: Array<{ fascia: string; livello: "BASSA" | "MODERATA" | "MARCATA" }>;
  coperturaMedia: number | null;
  pioggiaTotale: number | null;
  temporali: boolean;
}

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];

export function cardinal(deg: number | null): string {
  if (deg == null || !Number.isFinite(deg)) return "—";
  return DIRS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

function nOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function vecMean(dirs: number[], speeds: number[]): { dir: number | null; speed: number | null } {
  let sx = 0, sy = 0, ss = 0, cnt = 0;
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i], s = speeds[i];
    if (d == null || s == null || !Number.isFinite(d) || !Number.isFinite(s)) continue;
    const r = (d * Math.PI) / 180;
    sx += Math.sin(r); sy += Math.cos(r); ss += s; cnt++;
  }
  if (!cnt) return { dir: null, speed: null };
  const dir = (Math.round((Math.atan2(sx, sy) * 180) / Math.PI) + 360) % 360;
  return { dir, speed: ss / cnt };
}

function dataISO(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split("T")[0];
}

export function dateLabel(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
}

/* Interpola il profilo verticale del modello su quote a step 250 m dal decollo fino a 4000 m s.l.m. */
function buildProfile(
  quotaDecollo: number,
  at: (key: string, idx: number) => number | null,
  idx: number,
): ProfileRow[] {
  // punti {z, temp, u, v} dai livelli di pressione (geopotential_height) + il punto al suolo
  const pts: Array<{ z: number; temp: number | null; u: number | null; v: number | null; s: number | null; d: number | null }> = [];
  for (const h of PRESSURE_LEVELS) {
    const z = at(`geopotential_height_${h}hPa`, idx);
    if (z == null || z <= quotaDecollo + 60) continue; // sotto il decollo non serve
    const s = at(`wind_speed_${h}hPa`, idx);
    const d = at(`wind_direction_${h}hPa`, idx);
    const t = at(`temperature_${h}hPa`, idx);
    let u: number | null = null, v: number | null = null;
    if (s != null && d != null) {
      const r = (d * Math.PI) / 180;
      u = s * Math.sin(r); v = s * Math.cos(r);
    }
    pts.push({ z, temp: t, u, v, s, d });
  }
  const s10 = at("wind_speed_10m", idx), d10 = at("wind_direction_10m", idx);
  pts.push({ z: quotaDecollo, temp: at("temperature_2m", idx), u: s10 != null && d10 != null ? s10 * Math.sin((d10 * Math.PI) / 180) : null, v: s10 != null && d10 != null ? s10 * Math.cos((d10 * Math.PI) / 180) : null, s: s10, d: d10 });
  pts.sort((a, b) => a.z - b.z);
  if (pts.length < 2) return [];

  const interp = (z: number, key: "temp" | "u" | "v" | "s"): number | null => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (a.z <= z && z <= b.z) {
        const av = a[key], bv = b[key];
        if (av == null || bv == null) return bv ?? av ?? null;
        const f = (z - a.z) / (b.z - a.z || 1);
        return av + (bv - av) * f;
      }
    }
    return null;
  };

  const rows: ProfileRow[] = [];
  // il suolo + step 250 m fino a 4000 m s.l.m.
  const targets: number[] = [quotaDecollo];
  for (let agl = 250; quotaDecollo + agl <= 4000; agl += 250) targets.push(quotaDecollo + agl);
  if (targets[targets.length - 1] < 4000 && quotaDecollo < 4000) targets.push(4000);

  let prevSpeed: number | null = null;
  for (const z of targets) {
    const u = z === quotaDecollo ? (pts[0]?.u ?? null) : interp(z, "u");
    const v = z === quotaDecollo ? (pts[0]?.v ?? null) : interp(z, "v");
    const s = z === quotaDecollo ? (pts[0]?.s ?? null) : (u != null && v != null ? Math.round(Math.hypot(u, v)) : null);
    const d = u != null && v != null ? Math.round(((Math.atan2(u, v) * 180) / Math.PI + 360) % 360) : null;
    const t = z === quotaDecollo ? pts[0]?.temp ?? null : interp(z, "temp");
    const shear = prevSpeed != null && s != null && Math.abs(s - prevSpeed) >= 20;
    rows.push({ z, agl: Math.round(z - quotaDecollo), speed: s, dir: d, card: cardinal(d), temp: t, shear });
    prevSpeed = s;
  }
  return rows;
}

export async function fetchReportGiornata(
  site: { lat: number; lon: number; quota: number; esposizione: string },
  dayOffset: number,
): Promise<ReportGiornata | null> {
  const dateISO = dataISO(dayOffset);
  const raw = await fetchHourly(site.lat, site.lon, REPORT_HOURLY_PARAMS, dateISO, dateISO);
  const h = (raw as { hourly?: Record<string, Array<number | string | null> | undefined> }).hourly;
  const times = (h?.time as string[] | undefined) ?? [];
  if (!times.length) return null;

  const at = (key: string, idx: number): number | null => nOrNull(h?.[key]?.[idx]);
  const hours: ReportOra[] = [];
  const profili = new Map<number, ProfileRow[]>();

  for (let i = 0; i < times.length; i++) {
    const hour = Number(times[i].split("T")[1]?.slice(0, 2));
    if (!Number.isFinite(hour)) continue;
    const temp = at("temperature_2m", i);
    const dew = at("dew_point_2m", i);
    const cloud = at("cloud_cover", i);
    const rain = at("precipitation", i);
    const code = at("weather_code", i);
    const wind = at("wind_speed_10m", i);
    const res = calcolaIndiceVolabilita({
      windSpeed: wind ?? 0,
      windGusts: at("wind_gusts_10m", i) ?? undefined,
      windDir: at("wind_direction_10m", i) ?? esposizioneToGradi(site.esposizione),
      esposizione: site.esposizione,
      temperature: temp ?? 12,
      dewPoint: dew ?? (temp ?? 12) - 2,
      cloudCover: cloud ?? 50,
      precipitation: rain ?? 0,
      weatherCode: code ?? undefined,
      cape: at("cape", i) ?? undefined,
      liftedIndex: at("lifted_index", i) ?? undefined,
      quota: site.quota,
    });
    hours.push({
      hour,
      temp, dew, rain, cloud,
      cloudLow: at("cloud_cover_low", i),
      cloudMid: at("cloud_cover_mid", i),
      cloudHigh: at("cloud_cover_high", i),
      wind,
      gust: at("wind_gusts_10m", i),
      dir: at("wind_direction_10m", i),
      cape: at("cape", i),
      liftedIndex: at("lifted_index", i),
      code,
      freezing: at("freezing_level_height", i),
      baseNubi: Math.round(res.baseNubiM),
      rateo: res.rateoTermicoMs,
      indice: res.indice,
      indiceLabel: res.label,
      windRel: res.windRelativo,
    });
    profili.set(hour, buildProfile(site.quota, at, i));
  }

  const fly = hours.filter((o) => o.hour >= 8 && o.hour <= 19);
  const bases = fly.map((o) => o.baseNubi).filter((v): v is number => v != null && v > site.quota);
  const tops = fly.map((o) => (o.baseNubi != null && o.rateo != null ? o.baseNubi : null)).filter((v): v is number => v != null);
  const rateos = fly.map((o) => o.rateo ?? 0);
  const rateoMax = rateos.length ? Math.max(...rateos) : 0;
  const rateoOraMax = rateoMax > 0 ? fly[rateos.indexOf(rateoMax)]?.hour ?? null : null;
  const temps = fly.map((o) => o.temp).filter((v): v is number => v != null);
  const coperturaMedia = (() => {
    const c = fly.map((o) => o.cloud).filter((v): v is number => v != null);
    return c.length ? Math.round(c.reduce((a, b) => a + b, 0) / c.length) : null;
  })();
  const pioggiaTotale = (() => {
    const p = fly.map((o) => o.rain).filter((v): v is number => v != null);
    return p.length ? Math.round(p.reduce((a, b) => a + b, 0) * 10) / 10 : null;
  })();
  const temporali = fly.some((o) => o.code != null && o.code >= 95);

  // finestra migliore: 2 ore consecutive con indice medio più basso (bonus termiche)
  let bestWindow: ReportGiornata["bestWindow"] = null;
  for (let i = 0; i < fly.length - 1; i++) {
    const a = fly[i], b = fly[i + 1];
    if (a.indice == null || b.indice == null) continue;
    const media = (a.indice + b.indice) / 2;
    if (bestWindow && media >= bestWindow.indice) continue;
    const quota = a.baseNubi != null && b.baseNubi != null ? Math.round(Math.min(a.baseNubi, b.baseNubi)) : null;
    bestWindow = { from: a.hour, to: b.hour + 1, indice: media, quota };
  }

  // veleggiata: vento sostenuto e relativo all'esposizione nelle ore diurne
  const winds = fly.map((o) => o.wind).filter((v): v is number => v != null);
  const windMed = winds.length ? winds.reduce((a, b) => a + b, 0) / winds.length : null;
  const relDominante = (() => {
    const counts = new Map<string, number>();
    fly.forEach((o) => { if (o.windRel) counts.set(o.windRel, (counts.get(o.windRel) ?? 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "sconosciuto";
  })();
  const veleggiata = (() => {
    if (windMed == null) return { livello: "SCARSE" as const, motivo: "dati vento insufficienti" };
    if (windMed >= 35) return { livello: "SCARSE" as const, motivo: `vento medio ${Math.round(windMed)} km/h: troppo forte e turbolento per il veleggiato` };
    if (windMed >= 15 && relDominante === "frontale") return { livello: "OTTIME" as const, motivo: `vento medio ${Math.round(windMed)} km/h quasi sempre in fronte all'esposizione: pendio che alimenta la vela` };
    if (windMed >= 15 && relDominante === "diagonale") return { livello: "BUONE" as const, motivo: `vento medio ${Math.round(windMed)} km/h in diagonale all'esposizione` };
    if (windMed >= 10 && relDominante !== "di_coda") return { livello: "MEDIATE" as const, motivo: `vento medio ${Math.round(windMed)} km/h ${relDominante === "laterale" ? "laterale: occhio al drift" : "a corsa"}` };
    if (relDominante === "di_coda") return { livello: "SCARSE" as const, motivo: `vento ${Math.round(windMed)} km/h prevalentemente di coda sul decollo` };
    return { livello: "SCARSE" as const, motivo: `vento debole (${Math.round(windMed)} km/h): giornata solo termica` };
  })();

  // turbolenza: shear nei primi strati + raffiche al suolo
  const turbFascia = (fromAgl: number, toAgl: number): ReportGiornata["turbolenza"][number]["livello"] => {
    let maxDelta = 0;
    for (const rows of profili.values()) {
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1], b = rows[i];
        if (a.agl < fromAgl || b.agl > toAgl) continue;
        if (a.speed != null && b.speed != null) maxDelta = Math.max(maxDelta, Math.abs(b.speed - a.speed));
      }
    }
    return maxDelta >= 25 ? "MARCATA" : maxDelta >= 12 ? "MODERATA" : "BASSA";
  };
  const gustMax = fly.map((o) => o.gust ?? 0);
  const gustTop = gustMax.length ? Math.max(...gustMax) : 0;
  const turbolenza: ReportGiornata["turbolenza"] = [
    { fascia: "Fino a 1000 m sul decollo", livello: gustTop >= 45 ? "MARCATA" : turbFascia(0, 1000) },
    { fascia: "1000 – 2500 m sul decollo", livello: turbFascia(1000, 2500) },
    { fascia: "Oltre 2500 m sul decollo", livello: turbFascia(2500, 4000) },
  ];

  return {
    dateISO,
    hours,
    profili,
    baseRange: bases.length ? [Math.min(...bases), Math.max(...bases)] : null,
    topRange: tops.length ? [Math.min(...tops), Math.max(...tops)] : null,
    rateoMax,
    rateoOraMax,
    tempMin: temps.length ? Math.min(...temps) : null,
    tempMax: temps.length ? Math.max(...temps) : null,
    bestWindow,
    veleggiata,
    turbolenza,
    coperturaMedia,
    pioggiaTotale,
    temporali,
  };
}

/* Testo esplicativo deterministico delle possibilità della giornata */
export function testoGiornata(r: ReportGiornata, quotaDecollo: number, nome: string): string {
  const parts: string[] = [];
  const orario = (h: number) => `${String(h).padStart(2, "0")}:00`;
  if (r.coperturaMedia != null) {
    const v = r.coperturaMedia <= 20 ? "una giornata prevalentemente serena" : r.coperturaMedia <= 50 ? "una giornata di sole e nuvole passaggere" : r.coperturaMedia <= 80 ? "una giornata molto nuvolosa" : "una giornata con cielo quasi coperto";
    parts.push(`${nome} offre ${v} (copertura media ${r.coperturaMedia}% sulle ore diurne${r.pioggiaTotale ? `, con ${r.pioggiaTotale} mm di pioggia previsti` : ", pioggia assente o trascurabile"}).`);
  }
  if (r.baseRange && r.rateoMax > 0.2) {
    parts.push(`Le termiche permettono di salire fino a una base cumuli tra ${Math.round(r.baseRange[0])} e ${Math.round(r.baseRange[1])} m s.l.m. (del decollo a ${quotaDecollo} m), con ascendenza stimata fino a ${r.rateoMax.toFixed(1).replace(".", ",")} m/s${r.rateoOraMax != null ? ` intorno alle ${orario(r.rateoOraMax)}` : ""}: ${r.rateoMax >= 2 ? "giornata termica valida per allungarsi in cross" : r.rateoMax >= 1 ? "ascendenze modeste, realistiche ortiche e volo locale" : "ascendenze deboli: volo breve sotto il decollo"}.`);
  } else {
    parts.push("Il modello non mostra ascendenze sfruttabili: nubi troppo coperte o aria stabile — giornata comunque buona per una scorribila o per il veleggiato se il vento regge.");
  }
  if (r.veleggiata) parts.push(`Volo veleggiato: condizioni ${r.veleggiata.livello.toLowerCase()} — ${r.veleggiata.motivo}.`);
  if (r.bestWindow) {
    parts.push(`La finestra migliore per volare va dalle ${orario(r.bestWindow.from)} alle ${orario(r.bestWindow.to)}${r.bestWindow.quota ? `, con base cumuli intorno a ${r.bestWindow.quota} m` : ""}; fuori da questa finestra valutate raffiche e cambio di direzione prima di decollare.`);
  }
  const forte = r.profili.size ? [...r.profili.values()].filter((rows) => rows.length).map((rows) => rows.reduce((m, row) => (row.speed != null && row.agl > 250 && (m == null || row.speed > m) ? row.speed : m), null as number | null)).reduce<number | null>((m, v) => (v != null && (m == null || v > m) ? v : m), null) : null;
  if (forte != null && forte >= 40) parts.push(`Attenzione al flusso in quota: fino a ${Math.round(forte)} km/h nei livelli superiori — controllate la manica lungo la giornata e il rischio di vento che scende in valle.`);
  if (r.temporali) parts.push("È previsto almeno un codice temporalesco nella giornata: verifica radar e aggiornamenti prima di entrare in area.");
  return parts.join(" ");
}
